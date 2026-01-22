"""
DXF File Importer for HVAC Design Studio.

UX-007: Enhanced with mm precision for professional architectural drawings.

Extracts room geometries from DXF files for import into floor plan editor.
Supports AutoCAD DXF format with closed polylines and text labels.

Features:
- mm precision using Decimal arithmetic
- Wall, door, and window extraction
- Layer-aware parsing (WALLS, DOORS, WINDOWS, etc.)
- Canadian building code dimension validation
- Block reference detection for fixtures
"""

import ezdxf
from ezdxf.math import BoundingBox, Vec2
from typing import List, Dict, Any, Optional, Tuple, Set
import logging
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4
import math

logger = logging.getLogger(__name__)

# Precision constant for mm accuracy (0.1mm tolerance)
MM_PRECISION = Decimal('0.1')
COORDINATE_PRECISION = 1  # Decimal places for coordinates


def round_to_mm(value: float) -> float:
    """Round a value to mm precision (0.1mm)."""
    d = Decimal(str(value)).quantize(MM_PRECISION, rounding=ROUND_HALF_UP)
    return float(d)


def round_coordinate(value: float) -> float:
    """Round coordinate to specified decimal places."""
    return round(value, COORDINATE_PRECISION)


@dataclass
class ExtractedWall:
    """Represents a wall segment extracted from DXF file with mm precision."""
    id: str
    start_x: float  # mm
    start_y: float  # mm
    end_x: float  # mm
    end_y: float  # mm
    thickness: float  # mm (default 152.4mm = 6")
    height: float  # mm (default 2743mm = 9')
    layer: str  # Original DXF layer

    @property
    def length(self) -> float:
        """Calculate wall length in mm."""
        dx = self.end_x - self.start_x
        dy = self.end_y - self.start_y
        return round_to_mm(math.sqrt(dx * dx + dy * dy))

    @property
    def angle(self) -> float:
        """Calculate wall angle in degrees."""
        dx = self.end_x - self.start_x
        dy = self.end_y - self.start_y
        return math.degrees(math.atan2(dy, dx))

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'start': {'x': round_coordinate(self.start_x), 'y': round_coordinate(self.start_y)},
            'end': {'x': round_coordinate(self.end_x), 'y': round_coordinate(self.end_y)},
            'thickness': round_to_mm(self.thickness),
            'height': round_to_mm(self.height),
            'length': self.length,
            'angle': round(self.angle, 2),
            'layer': self.layer
        }


@dataclass
class ExtractedDoor:
    """Represents a door extracted from DXF file with mm precision."""
    id: str
    position_x: float  # mm - center position
    position_y: float  # mm
    width: float  # mm (standard: 813mm = 32", 914mm = 36")
    height: float  # mm (standard: 2032mm = 80", 2134mm = 84")
    wall_id: Optional[str]  # Associated wall if detected
    swing_direction: str  # 'left', 'right', 'double', 'sliding'
    door_type: str  # 'interior', 'exterior', 'pocket', 'bifold'

    # Canadian code standards for reference
    # Minimum egress door: 813mm (32") wide
    # Standard exterior: 914mm (36") wide
    # ADA/accessibility: 914mm (36") minimum clear opening

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'position': {'x': round_coordinate(self.position_x), 'y': round_coordinate(self.position_y)},
            'width': round_to_mm(self.width),
            'height': round_to_mm(self.height),
            'wall_id': self.wall_id,
            'swing_direction': self.swing_direction,
            'door_type': self.door_type,
            'code_compliant': self.width >= 813  # Canadian minimum
        }


@dataclass
class ExtractedWindow:
    """Represents a window extracted from DXF file with mm precision."""
    id: str
    position_x: float  # mm - center position
    position_y: float  # mm
    width: float  # mm
    height: float  # mm
    sill_height: float  # mm from floor (standard: 914mm = 36")
    wall_id: Optional[str]  # Associated wall
    window_type: str  # 'single', 'double', 'casement', 'fixed', 'sliding'

    # Canadian code: Bedroom egress windows need min 0.35m² opening, 380mm clear width

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'position': {'x': round_coordinate(self.position_x), 'y': round_coordinate(self.position_y)},
            'width': round_to_mm(self.width),
            'height': round_to_mm(self.height),
            'sill_height': round_to_mm(self.sill_height),
            'wall_id': self.wall_id,
            'window_type': self.window_type,
            'opening_area_m2': round((self.width * self.height) / 1000000, 3)  # Convert mm² to m²
        }


@dataclass
class ExtractedRoom:
    """Represents a room extracted from DXF file with mm precision."""
    id: str
    name: str
    room_type: str
    position: Dict[str, float]  # x, y in mm
    dimensions: Dict[str, float]  # width, depth, height in mm
    vertices: List[Tuple[float, float]]  # Original vertices in mm
    walls: List[str] = field(default_factory=list)  # Wall IDs forming this room
    doors: List[str] = field(default_factory=list)  # Door IDs in this room
    windows: List[str] = field(default_factory=list)  # Window IDs in this room
    confidence: float = 0.8  # 0-1 confidence in room detection
    area_m2: float = 0.0  # Floor area in square meters


class DXFImporter:
    """
    DXF file importer for extracting room geometries with mm precision.

    UX-007: Enhanced for professional architectural drawings.

    Handles:
    - POLYLINE entities (closed polylines become rooms)
    - LWPOLYLINE entities (lightweight polylines)
    - LINE entities (wall segments)
    - INSERT entities (door/window blocks)
    - TEXT/MTEXT entities (room labels)
    - Layer-specific parsing (WALLS, DOORS, WINDOWS, etc.)
    """

    # AutoCAD units to mm conversion factors (Decimal for precision)
    UNIT_CONVERSIONS = {
        0: Decimal('1.0'),        # Unitless (assume mm)
        1: Decimal('25.4'),       # Inches to mm
        2: Decimal('304.8'),      # Feet to mm
        3: Decimal('1609344'),    # Miles to mm
        4: Decimal('1.0'),        # Millimeters
        5: Decimal('10.0'),       # Centimeters to mm
        6: Decimal('1000.0'),     # Meters to mm
        7: Decimal('1000000.0'),  # Kilometers to mm
        8: Decimal('0.0000254'),  # Microinches to mm
        9: Decimal('0.001'),      # Mils to mm
        10: Decimal('914.4'),     # Yards to mm
    }

    # Layer name patterns for identification
    WALL_LAYERS = {'wall', 'walls', 'a-wall', 'a-walls', 'arch-wall', 'structure'}
    DOOR_LAYERS = {'door', 'doors', 'a-door', 'a-doors', 'arch-door', 'openings'}
    WINDOW_LAYERS = {'window', 'windows', 'a-glaz', 'a-window', 'arch-window', 'glazing'}
    ROOM_LAYERS = {'room', 'rooms', 'a-room', 'space', 'spaces', 'area', 'areas'}

    # Door block name patterns
    DOOR_BLOCK_PATTERNS = {'door', 'dr', 'swing', 'entry', 'exit', 'passage'}
    WINDOW_BLOCK_PATTERNS = {'window', 'win', 'glazing', 'glass', 'wn'}

    # Keywords for room type detection
    ROOM_TYPE_KEYWORDS = {
        'living': ['living', 'lounge', 'family', 'great'],
        'bedroom': ['bedroom', 'bed', 'master', 'guest', 'kids'],
        'master_bedroom': ['master', 'primary', 'main bedroom'],
        'kitchen': ['kitchen', 'kitchenette'],
        'bathroom': ['bathroom', 'bath', 'toilet', 'wc', 'lavatory', 'ensuite'],
        'entry': ['entry', 'foyer', 'vestibule', 'mudroom'],
        'corridor': ['corridor', 'hallway', 'hall', 'passage'],
        'utility': ['utility', 'laundry', 'mud'],
        'mechanical': ['mechanical', 'mech', 'hvac', 'furnace', 'boiler'],
        'office': ['office', 'study', 'den', 'library', 'home office'],
        'dining': ['dining', 'breakfast', 'nook'],
        'garage': ['garage', 'carport'],
        'storage': ['storage', 'closet', 'pantry', 'wardrobe', 'wic'],  # WIC = walk-in closet
    }

    # Canadian standard dimensions (mm) for validation
    CANADIAN_STANDARDS = {
        'min_door_width': 813,      # 32" - minimum egress
        'standard_door_width': 914,  # 36" - standard exterior
        'door_height': 2032,         # 80" - standard door height
        'wall_thickness_2x4': 89,    # 2x4 stud
        'wall_thickness_2x6': 140,   # 2x6 stud
        'wall_thickness_full': 152,  # 2x4 + drywall both sides
        'standard_ceiling': 2438,    # 8' ceiling
        'tall_ceiling': 2743,        # 9' ceiling
        'window_sill': 914,          # 36" from floor
        'min_bedroom_area_m2': 7.0,  # NBC minimum bedroom
        'min_egress_window_m2': 0.35,  # Bedroom egress window opening
    }

    def __init__(self, unit_override: Optional[int] = None,
                 default_wall_thickness: float = 152.4,
                 default_ceiling_height: float = 2743.0):
        """
        Initialize DXF importer with mm precision.

        Args:
            unit_override: Force specific unit conversion (AutoCAD unit code)
            default_wall_thickness: Default wall thickness in mm (152.4 = 6")
            default_ceiling_height: Default ceiling height in mm (2743 = 9')
        """
        self.unit_override = unit_override
        self.unit_factor = Decimal('1.0')
        self.default_wall_thickness = default_wall_thickness
        self.default_ceiling_height = default_ceiling_height

        # Extracted entities
        self.rooms: List[ExtractedRoom] = []
        self.walls: List[ExtractedWall] = []
        self.doors: List[ExtractedDoor] = []
        self.windows: List[ExtractedWindow] = []
        self.labels: List[Dict[str, Any]] = []

        # Layer tracking
        self.detected_layers: Set[str] = set()
        self.layer_entity_counts: Dict[str, int] = {}

    def import_file(self, filepath: str) -> Dict[str, Any]:
        """
        Import a DXF file and extract room geometries with mm precision.

        Args:
            filepath: Path to DXF file

        Returns:
            Floor plan data structure with extracted rooms, walls, doors, windows
        """
        try:
            doc = ezdxf.readfile(filepath)
        except Exception as e:
            logger.error(f"Failed to read DXF file: {e}")
            raise ValueError(f"Invalid DXF file: {e}")

        return self._process_document(doc, filepath.split('/')[-1].replace('.dxf', ''))

    def _process_document(self, doc, name: str) -> Dict[str, Any]:
        """Process DXF document and extract all entities."""
        # Determine unit conversion factor
        self._detect_units(doc)

        # Scan layers first
        self._scan_layers(doc)

        # Extract entities from modelspace
        msp = doc.modelspace()

        # Extract structural elements (order matters)
        self._extract_walls_from_lines(msp)
        self._extract_polylines(msp)
        self._extract_lwpolylines(msp)
        self._extract_blocks(msp, doc)  # Doors and windows from blocks
        self._extract_labels(msp)

        # Post-processing
        self._match_labels_to_rooms()
        self._associate_doors_windows_to_walls()
        self._calculate_room_areas()

        # Calculate bounding box for overall dimensions
        bbox = self._calculate_overall_bounds()

        return {
            'id': f'imported_{uuid4().hex[:8]}',
            'name': name,
            'source': 'dxf_import',
            'precision': 'mm',
            'overall_dimensions': {
                'width': round_coordinate(bbox['width']),
                'depth': round_coordinate(bbox['depth'])
            },
            'rooms': [self._room_to_dict(r) for r in self.rooms],
            'walls': [w.to_dict() for w in self.walls],
            'doors': [d.to_dict() for d in self.doors],
            'windows': [w.to_dict() for w in self.windows],
            'import_stats': {
                'rooms_detected': len(self.rooms),
                'walls_detected': len(self.walls),
                'doors_detected': len(self.doors),
                'windows_detected': len(self.windows),
                'labels_found': len(self.labels),
                'unit_factor': float(self.unit_factor),
                'layers_detected': list(self.detected_layers),
                'layer_counts': self.layer_entity_counts
            },
            'canadian_code_validation': self._validate_canadian_codes()
        }

    def import_bytes(self, content: bytes, filename: str = 'import.dxf') -> Dict[str, Any]:
        """
        Import DXF from bytes content with mm precision.

        Args:
            content: DXF file content as bytes
            filename: Original filename for naming

        Returns:
            Floor plan data structure with mm precision
        """
        try:
            doc = ezdxf.read(content.decode('utf-8', errors='ignore'))
        except Exception as e:
            logger.error(f"Failed to parse DXF content: {e}")
            raise ValueError(f"Invalid DXF content: {e}")

        return self._process_document(doc, filename.replace('.dxf', ''))

    def _scan_layers(self, doc) -> None:
        """Scan and categorize layers in the DXF document."""
        try:
            for layer in doc.layers:
                layer_name = layer.dxf.name.lower()
                self.detected_layers.add(layer.dxf.name)
                self.layer_entity_counts[layer.dxf.name] = 0
        except Exception as e:
            logger.warning(f"Could not scan layers: {e}")

    def _convert_coordinate(self, value: float) -> float:
        """Convert a coordinate value to mm with precision."""
        result = float(Decimal(str(value)) * self.unit_factor)
        return round_to_mm(result)

    def _extract_walls_from_lines(self, msp) -> None:
        """Extract wall segments from LINE entities on wall layers."""
        for entity in msp.query('LINE'):
            layer_name = entity.dxf.layer.lower()

            # Check if this line is on a wall layer
            is_wall_layer = any(wl in layer_name for wl in self.WALL_LAYERS)

            if is_wall_layer or 'wall' in layer_name:
                wall = ExtractedWall(
                    id=f'wall_{uuid4().hex[:8]}',
                    start_x=self._convert_coordinate(entity.dxf.start.x),
                    start_y=self._convert_coordinate(entity.dxf.start.y),
                    end_x=self._convert_coordinate(entity.dxf.end.x),
                    end_y=self._convert_coordinate(entity.dxf.end.y),
                    thickness=self.default_wall_thickness,
                    height=self.default_ceiling_height,
                    layer=entity.dxf.layer
                )
                self.walls.append(wall)

                # Update layer count
                if entity.dxf.layer in self.layer_entity_counts:
                    self.layer_entity_counts[entity.dxf.layer] += 1

    def _extract_blocks(self, msp, doc) -> None:
        """Extract doors and windows from block references (INSERT entities)."""
        for entity in msp.query('INSERT'):
            block_name = entity.dxf.name.lower()
            layer_name = entity.dxf.layer.lower()

            # Get insertion point and scale
            insert_x = self._convert_coordinate(entity.dxf.insert.x)
            insert_y = self._convert_coordinate(entity.dxf.insert.y)
            x_scale = entity.dxf.xscale if hasattr(entity.dxf, 'xscale') else 1.0
            y_scale = entity.dxf.yscale if hasattr(entity.dxf, 'yscale') else 1.0

            # Check if this is a door block
            is_door = (any(dp in block_name for dp in self.DOOR_BLOCK_PATTERNS) or
                      any(dl in layer_name for dl in self.DOOR_LAYERS))

            # Check if this is a window block
            is_window = (any(wp in block_name for wp in self.WINDOW_BLOCK_PATTERNS) or
                        any(wl in layer_name for wl in self.WINDOW_LAYERS))

            if is_door:
                # Try to get door dimensions from block
                width, height = self._get_block_dimensions(doc, entity.dxf.name, x_scale, y_scale)
                if width == 0:
                    width = self.CANADIAN_STANDARDS['standard_door_width']
                if height == 0:
                    height = self.CANADIAN_STANDARDS['door_height']

                door = ExtractedDoor(
                    id=f'door_{uuid4().hex[:8]}',
                    position_x=insert_x,
                    position_y=insert_y,
                    width=round_to_mm(width),
                    height=round_to_mm(height),
                    wall_id=None,  # Will be associated later
                    swing_direction=self._detect_door_swing(block_name),
                    door_type=self._detect_door_type(block_name, layer_name)
                )
                self.doors.append(door)

            elif is_window:
                width, height = self._get_block_dimensions(doc, entity.dxf.name, x_scale, y_scale)
                if width == 0:
                    width = 914  # Default 36" window
                if height == 0:
                    height = 1219  # Default 48" window

                window = ExtractedWindow(
                    id=f'window_{uuid4().hex[:8]}',
                    position_x=insert_x,
                    position_y=insert_y,
                    width=round_to_mm(width),
                    height=round_to_mm(height),
                    sill_height=self.CANADIAN_STANDARDS['window_sill'],
                    wall_id=None,
                    window_type=self._detect_window_type(block_name)
                )
                self.windows.append(window)

    def _get_block_dimensions(self, doc, block_name: str,
                             x_scale: float = 1.0, y_scale: float = 1.0) -> Tuple[float, float]:
        """Get dimensions of a block definition."""
        try:
            block = doc.blocks.get(block_name)
            if block is None:
                return 0, 0

            # Calculate bounding box of block entities
            min_x, min_y = float('inf'), float('inf')
            max_x, max_y = float('-inf'), float('-inf')

            for entity in block:
                if hasattr(entity, 'dxf'):
                    # Handle different entity types
                    if hasattr(entity.dxf, 'start') and hasattr(entity.dxf, 'end'):
                        for pt in [entity.dxf.start, entity.dxf.end]:
                            min_x = min(min_x, pt.x)
                            max_x = max(max_x, pt.x)
                            min_y = min(min_y, pt.y)
                            max_y = max(max_y, pt.y)
                    elif hasattr(entity.dxf, 'insert'):
                        min_x = min(min_x, entity.dxf.insert.x)
                        max_x = max(max_x, entity.dxf.insert.x)
                        min_y = min(min_y, entity.dxf.insert.y)
                        max_y = max(max_y, entity.dxf.insert.y)

            if min_x == float('inf'):
                return 0, 0

            width = self._convert_coordinate((max_x - min_x) * x_scale)
            height = self._convert_coordinate((max_y - min_y) * y_scale)
            return width, height

        except Exception as e:
            logger.debug(f"Could not get block dimensions for {block_name}: {e}")
            return 0, 0

    def _detect_door_swing(self, block_name: str) -> str:
        """Detect door swing direction from block name."""
        name_lower = block_name.lower()
        if 'left' in name_lower or 'lh' in name_lower:
            return 'left'
        elif 'right' in name_lower or 'rh' in name_lower:
            return 'right'
        elif 'double' in name_lower or 'dbl' in name_lower:
            return 'double'
        elif 'slide' in name_lower or 'sliding' in name_lower:
            return 'sliding'
        return 'right'  # Default

    def _detect_door_type(self, block_name: str, layer_name: str) -> str:
        """Detect door type from block/layer name."""
        combined = (block_name + ' ' + layer_name).lower()
        if 'ext' in combined or 'entry' in combined or 'front' in combined:
            return 'exterior'
        elif 'pocket' in combined:
            return 'pocket'
        elif 'bifold' in combined or 'bi-fold' in combined:
            return 'bifold'
        elif 'slide' in combined or 'sliding' in combined:
            return 'sliding'
        return 'interior'

    def _detect_window_type(self, block_name: str) -> str:
        """Detect window type from block name."""
        name_lower = block_name.lower()
        if 'casement' in name_lower:
            return 'casement'
        elif 'double' in name_lower or 'dh' in name_lower:
            return 'double_hung'
        elif 'fixed' in name_lower:
            return 'fixed'
        elif 'slide' in name_lower or 'sliding' in name_lower:
            return 'sliding'
        return 'single'

    def _associate_doors_windows_to_walls(self) -> None:
        """Associate doors and windows with their nearest walls."""
        tolerance = 200  # 200mm tolerance for wall association

        for door in self.doors:
            nearest_wall = self._find_nearest_wall(door.position_x, door.position_y, tolerance)
            if nearest_wall:
                door.wall_id = nearest_wall.id

        for window in self.windows:
            nearest_wall = self._find_nearest_wall(window.position_x, window.position_y, tolerance)
            if nearest_wall:
                window.wall_id = nearest_wall.id

    def _find_nearest_wall(self, x: float, y: float, tolerance: float) -> Optional[ExtractedWall]:
        """Find the nearest wall to a point."""
        nearest = None
        min_dist = tolerance

        for wall in self.walls:
            dist = self._point_to_line_distance(x, y, wall)
            if dist < min_dist:
                min_dist = dist
                nearest = wall

        return nearest

    def _point_to_line_distance(self, px: float, py: float, wall: ExtractedWall) -> float:
        """Calculate perpendicular distance from point to wall line segment."""
        x1, y1 = wall.start_x, wall.start_y
        x2, y2 = wall.end_x, wall.end_y

        # Line segment vector
        dx = x2 - x1
        dy = y2 - y1

        if dx == 0 and dy == 0:
            return math.sqrt((px - x1) ** 2 + (py - y1) ** 2)

        # Parameter t for closest point on line
        t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))

        # Closest point on segment
        closest_x = x1 + t * dx
        closest_y = y1 + t * dy

        return math.sqrt((px - closest_x) ** 2 + (py - closest_y) ** 2)

    def _calculate_room_areas(self) -> None:
        """Calculate floor area for each room using Shoelace formula."""
        for room in self.rooms:
            if len(room.vertices) >= 3:
                area = self._shoelace_area(room.vertices)
                room.area_m2 = round(area / 1000000, 2)  # Convert mm² to m²

    def _shoelace_area(self, vertices: List[Tuple[float, float]]) -> float:
        """Calculate polygon area using Shoelace formula."""
        n = len(vertices)
        if n < 3:
            return 0.0

        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += vertices[i][0] * vertices[j][1]
            area -= vertices[j][0] * vertices[i][1]

        return abs(area) / 2.0

    def _validate_canadian_codes(self) -> Dict[str, Any]:
        """Validate extracted elements against Canadian building codes."""
        validation = {
            'compliant': True,
            'warnings': [],
            'doors': {'compliant': 0, 'non_compliant': 0},
            'windows': {'egress_compliant': 0, 'non_compliant': 0},
            'rooms': {'meet_minimum_area': 0, 'below_minimum': 0}
        }

        # Check doors
        for door in self.doors:
            if door.width >= self.CANADIAN_STANDARDS['min_door_width']:
                validation['doors']['compliant'] += 1
            else:
                validation['doors']['non_compliant'] += 1
                validation['warnings'].append(
                    f"Door {door.id} width ({door.width}mm) is below minimum "
                    f"({self.CANADIAN_STANDARDS['min_door_width']}mm)"
                )
                validation['compliant'] = False

        # Check bedroom windows for egress
        for room in self.rooms:
            if 'bedroom' in room.room_type:
                # Check if room has egress-compliant window
                room_windows = [w for w in self.windows
                               if self._is_point_in_room(w.position_x, w.position_y, room)]
                has_egress = any(
                    (w.width * w.height / 1000000) >= self.CANADIAN_STANDARDS['min_egress_window_m2']
                    for w in room_windows
                )
                if has_egress:
                    validation['windows']['egress_compliant'] += 1
                else:
                    validation['windows']['non_compliant'] += 1
                    validation['warnings'].append(
                        f"Bedroom '{room.name}' may lack egress-compliant window "
                        f"(min {self.CANADIAN_STANDARDS['min_egress_window_m2']}m² opening required)"
                    )

        # Check room areas
        for room in self.rooms:
            if 'bedroom' in room.room_type:
                if room.area_m2 >= self.CANADIAN_STANDARDS['min_bedroom_area_m2']:
                    validation['rooms']['meet_minimum_area'] += 1
                else:
                    validation['rooms']['below_minimum'] += 1
                    validation['warnings'].append(
                        f"Bedroom '{room.name}' area ({room.area_m2}m²) is below minimum "
                        f"({self.CANADIAN_STANDARDS['min_bedroom_area_m2']}m²)"
                    )
                    validation['compliant'] = False

        return validation

    def _is_point_in_room(self, x: float, y: float, room: ExtractedRoom) -> bool:
        """Check if a point is inside a room's bounding box."""
        return (room.position['x'] <= x <= room.position['x'] + room.dimensions['width'] and
                room.position['y'] <= y <= room.position['y'] + room.dimensions['depth'])

    def _detect_units(self, doc) -> None:
        """Detect and set unit conversion factor with Decimal precision."""
        if self.unit_override is not None:
            self.unit_factor = self.UNIT_CONVERSIONS.get(self.unit_override, Decimal('1.0'))
        else:
            # Try to get units from DXF header
            try:
                insunits = doc.header.get('$INSUNITS', 0)
                self.unit_factor = self.UNIT_CONVERSIONS.get(insunits, Decimal('1.0'))
            except Exception:
                self.unit_factor = Decimal('1.0')

        logger.info(f"Using unit conversion factor: {self.unit_factor} (mm precision enabled)")

    def _extract_polylines(self, msp) -> None:
        """Extract POLYLINE entities with mm precision."""
        for entity in msp.query('POLYLINE'):
            layer_name = entity.dxf.layer.lower()

            if entity.is_closed:
                vertices = [(self._convert_coordinate(v.dxf.location.x),
                            self._convert_coordinate(v.dxf.location.y))
                           for v in entity.vertices]

                # Check if this is a room layer or wall layer
                is_room_layer = any(rl in layer_name for rl in self.ROOM_LAYERS)
                is_wall_layer = any(wl in layer_name for wl in self.WALL_LAYERS)

                if is_room_layer or not is_wall_layer:
                    self._create_room_from_vertices(vertices, entity.dxf.layer)
                if is_wall_layer:
                    self._create_walls_from_polygon(vertices, entity.dxf.layer)

    def _extract_lwpolylines(self, msp) -> None:
        """Extract LWPOLYLINE entities (more common in modern DXF) with mm precision."""
        for entity in msp.query('LWPOLYLINE'):
            layer_name = entity.dxf.layer.lower()

            if entity.closed:
                vertices = [(self._convert_coordinate(p[0]),
                            self._convert_coordinate(p[1]))
                           for p in entity.get_points()]

                # Check layer type
                is_room_layer = any(rl in layer_name for rl in self.ROOM_LAYERS)
                is_wall_layer = any(wl in layer_name for wl in self.WALL_LAYERS)

                if is_room_layer or not is_wall_layer:
                    self._create_room_from_vertices(vertices, entity.dxf.layer)
                if is_wall_layer:
                    self._create_walls_from_polygon(vertices, entity.dxf.layer)

    def _create_walls_from_polygon(self, vertices: List[Tuple[float, float]], layer: str) -> None:
        """Create wall segments from polygon vertices."""
        if len(vertices) < 2:
            return

        for i in range(len(vertices)):
            next_i = (i + 1) % len(vertices)
            wall = ExtractedWall(
                id=f'wall_{uuid4().hex[:8]}',
                start_x=vertices[i][0],
                start_y=vertices[i][1],
                end_x=vertices[next_i][0],
                end_y=vertices[next_i][1],
                thickness=self.default_wall_thickness,
                height=self.default_ceiling_height,
                layer=layer
            )
            self.walls.append(wall)

    def _extract_labels(self, msp) -> None:
        """Extract TEXT and MTEXT entities for room labels with mm precision."""
        for entity in msp.query('TEXT'):
            self.labels.append({
                'text': entity.dxf.text,
                'x': self._convert_coordinate(entity.dxf.insert.x),
                'y': self._convert_coordinate(entity.dxf.insert.y)
            })

        for entity in msp.query('MTEXT'):
            self.labels.append({
                'text': entity.text,
                'x': self._convert_coordinate(entity.dxf.insert.x),
                'y': self._convert_coordinate(entity.dxf.insert.y)
            })

    def _create_room_from_vertices(self, vertices: List[Tuple[float, float]],
                                    layer: str = '0') -> None:
        """Create a room from polygon vertices with mm precision."""
        if len(vertices) < 3:
            return

        # Calculate bounding box with mm precision
        xs = [v[0] for v in vertices]
        ys = [v[1] for v in vertices]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)

        width = round_to_mm(max_x - min_x)
        depth = round_to_mm(max_y - min_y)

        # Skip if too small (likely not a room) - 500mm = 0.5m minimum
        if width < 500 or depth < 500:
            return

        # Determine confidence based on shape regularity
        is_rectangular = len(vertices) == 4
        confidence = 0.9 if is_rectangular else 0.6

        # Calculate area
        area_mm2 = self._shoelace_area(vertices)
        area_m2 = round(area_mm2 / 1000000, 2)

        room = ExtractedRoom(
            id=f'room_{uuid4().hex[:8]}',
            name=f'Room {len(self.rooms) + 1}',
            room_type='other',
            position={'x': round_coordinate(min_x), 'y': round_coordinate(min_y)},
            dimensions={
                'width': width,
                'depth': depth,
                'height': round_to_mm(self.default_ceiling_height)
            },
            vertices=[(round_coordinate(v[0]), round_coordinate(v[1])) for v in vertices],
            confidence=confidence,
            area_m2=area_m2
        )
        self.rooms.append(room)

    def _match_labels_to_rooms(self) -> None:
        """Match text labels to rooms they fall within."""
        for label in self.labels:
            for room in self.rooms:
                # Check if label is inside room bounding box
                if (room.position['x'] <= label['x'] <= room.position['x'] + room.dimensions['width'] and
                    room.position['y'] <= label['y'] <= room.position['y'] + room.dimensions['depth']):
                    # Update room name and detect type
                    room.name = label['text'].strip()
                    room.room_type = self._detect_room_type(label['text'])
                    break

    def _detect_room_type(self, text: str) -> str:
        """Detect room type from label text."""
        text_lower = text.lower()
        for room_type, keywords in self.ROOM_TYPE_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return room_type
        return 'other'

    def _calculate_overall_bounds(self) -> Dict[str, float]:
        """Calculate overall floor plan bounding box with mm precision."""
        all_x = []
        all_y = []

        # Include room positions
        for r in self.rooms:
            all_x.extend([r.position['x'], r.position['x'] + r.dimensions['width']])
            all_y.extend([r.position['y'], r.position['y'] + r.dimensions['depth']])

        # Include wall positions
        for w in self.walls:
            all_x.extend([w.start_x, w.end_x])
            all_y.extend([w.start_y, w.end_y])

        if not all_x or not all_y:
            return {'width': 10000, 'depth': 10000}

        min_x, max_x = min(all_x), max(all_x)
        min_y, max_y = min(all_y), max(all_y)

        # Add padding (1m = 1000mm)
        padding = 1000

        return {
            'width': round_to_mm((max_x - min_x) + 2 * padding),
            'depth': round_to_mm((max_y - min_y) + 2 * padding)
        }

    def _room_to_dict(self, room: ExtractedRoom) -> Dict[str, Any]:
        """Convert ExtractedRoom to dictionary for API response with mm precision."""
        # Find walls that form this room's boundary
        room_wall_ids = []
        for wall in self.walls:
            # Check if wall endpoints are on room boundary
            if self._is_wall_on_room_boundary(wall, room):
                room_wall_ids.append(wall.id)

        # Find doors in this room
        room_door_ids = [d.id for d in self.doors
                        if self._is_point_in_room(d.position_x, d.position_y, room)]

        # Find windows in this room
        room_window_ids = [w.id for w in self.windows
                         if self._is_point_in_room(w.position_x, w.position_y, room)]

        return {
            'id': room.id,
            'name': room.name,
            'room_type': room.room_type,
            'position': {
                'x': round_coordinate(room.position['x']),
                'y': round_coordinate(room.position['y'])
            },
            'dimensions': {
                'width': round_to_mm(room.dimensions['width']),
                'depth': round_to_mm(room.dimensions['depth']),
                'height': round_to_mm(room.dimensions['height'])
            },
            'area_m2': room.area_m2,
            'walls': room_wall_ids,
            'doors': room_door_ids,
            'windows': room_window_ids,
            'fixtures': [],
            'hvac_zone': None,
            'occupancy': self._estimate_occupancy(room),
            'metadata': {
                'source': 'dxf_import',
                'precision': 'mm',
                'confidence': room.confidence,
                'original_vertices': room.vertices
            }
        }

    def _is_wall_on_room_boundary(self, wall: ExtractedWall, room: ExtractedRoom) -> bool:
        """Check if a wall is on the boundary of a room."""
        tolerance = 100  # 100mm tolerance

        # Check if wall midpoint is near room edge
        mid_x = (wall.start_x + wall.end_x) / 2
        mid_y = (wall.start_y + wall.end_y) / 2

        x_on_edge = (abs(mid_x - room.position['x']) < tolerance or
                    abs(mid_x - (room.position['x'] + room.dimensions['width'])) < tolerance)
        y_on_edge = (abs(mid_y - room.position['y']) < tolerance or
                    abs(mid_y - (room.position['y'] + room.dimensions['depth'])) < tolerance)

        in_x_range = room.position['x'] - tolerance <= mid_x <= room.position['x'] + room.dimensions['width'] + tolerance
        in_y_range = room.position['y'] - tolerance <= mid_y <= room.position['y'] + room.dimensions['depth'] + tolerance

        return (x_on_edge and in_y_range) or (y_on_edge and in_x_range)

    def _estimate_occupancy(self, room: ExtractedRoom) -> int:
        """Estimate room occupancy based on type and area (Canadian code)."""
        # NBC occupancy load factors (m² per person)
        occupancy_factors = {
            'living': 9.3,  # Residential living areas
            'bedroom': 9.3,
            'master_bedroom': 9.3,
            'kitchen': 9.3,
            'dining': 1.4,  # Assembly with tables
            'office': 9.3,  # Business areas
            'bathroom': 0,  # No occupancy count
            'corridor': 0,
            'storage': 0,
            'mechanical': 0,
            'other': 9.3,
        }

        factor = occupancy_factors.get(room.room_type, 9.3)
        if factor == 0:
            return 0

        return max(1, int(room.area_m2 / factor))


def import_dxf(filepath: str, unit_override: Optional[int] = None,
               wall_thickness: float = 152.4,
               ceiling_height: float = 2743.0) -> Dict[str, Any]:
    """
    Convenience function to import a DXF file with mm precision.

    Args:
        filepath: Path to DXF file
        unit_override: Force specific unit conversion (AutoCAD unit code)
        wall_thickness: Default wall thickness in mm (default 152.4mm = 6")
        ceiling_height: Default ceiling height in mm (default 2743mm = 9')

    Returns:
        Floor plan data structure with mm precision including:
        - rooms: Extracted room geometries
        - walls: Individual wall segments
        - doors: Detected doors with Canadian code compliance
        - windows: Detected windows with egress validation
        - canadian_code_validation: NBC/NPC compliance check results
    """
    importer = DXFImporter(unit_override, wall_thickness, ceiling_height)
    return importer.import_file(filepath)


def import_dxf_bytes(content: bytes, filename: str = 'import.dxf',
                     unit_override: Optional[int] = None,
                     wall_thickness: float = 152.4,
                     ceiling_height: float = 2743.0) -> Dict[str, Any]:
    """
    Convenience function to import DXF from bytes with mm precision.

    Args:
        content: DXF file content as bytes
        filename: Original filename
        unit_override: Force specific unit conversion
        wall_thickness: Default wall thickness in mm
        ceiling_height: Default ceiling height in mm

    Returns:
        Floor plan data structure with mm precision
    """
    importer = DXFImporter(unit_override, wall_thickness, ceiling_height)
    return importer.import_bytes(content, filename)


# Canadian Building Code Reference Constants
CANADIAN_DOOR_STANDARDS = {
    'min_egress_width_mm': 813,      # 32" - minimum egress door
    'standard_exterior_mm': 914,      # 36" - standard exterior door
    'standard_interior_mm': 813,      # 32" - standard interior door
    'ada_minimum_clear_mm': 914,      # 36" - accessibility minimum
    'standard_height_mm': 2032,       # 80" - standard door height
    'tall_door_height_mm': 2134,      # 84" - tall door height
}

CANADIAN_WINDOW_STANDARDS = {
    'min_egress_opening_m2': 0.35,    # Minimum bedroom egress opening
    'min_egress_width_mm': 380,       # Minimum clear width for egress
    'min_egress_height_mm': 380,      # Minimum clear height for egress
    'standard_sill_height_mm': 914,   # 36" from floor
}

CANADIAN_ROOM_STANDARDS = {
    'min_bedroom_area_m2': 7.0,       # NBC minimum bedroom area
    'min_living_area_m2': 13.0,       # Recommended minimum living area
    'min_ceiling_height_mm': 2134,    # 7' minimum ceiling height
    'standard_ceiling_mm': 2438,      # 8' standard ceiling
}
