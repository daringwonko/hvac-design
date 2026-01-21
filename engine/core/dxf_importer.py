"""
DXF File Importer for HVAC Design Studio.

Extracts room geometries from DXF files for import into floor plan editor.
Supports AutoCAD DXF format with closed polylines and text labels.
"""

import ezdxf
from ezdxf.math import BoundingBox
from typing import List, Dict, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class ExtractedRoom:
    """Represents a room extracted from DXF file."""
    id: str
    name: str
    room_type: str
    position: Dict[str, float]  # x, y in mm
    dimensions: Dict[str, float]  # width, depth, height in mm
    vertices: List[Tuple[float, float]]  # Original vertices
    confidence: float  # 0-1 confidence in room detection


class DXFImporter:
    """
    DXF file importer for extracting room geometries.

    Handles:
    - POLYLINE entities (closed polylines become rooms)
    - LWPOLYLINE entities (lightweight polylines)
    - LINE entities (connected lines forming closed shapes)
    - TEXT/MTEXT entities (room labels)
    """

    # AutoCAD units to mm conversion factors
    UNIT_CONVERSIONS = {
        0: 1.0,       # Unitless (assume mm)
        1: 25.4,      # Inches to mm
        2: 304.8,     # Feet to mm
        3: 1609344,   # Miles to mm
        4: 1.0,       # Millimeters
        5: 10.0,      # Centimeters to mm
        6: 1000.0,    # Meters to mm
        7: 1000000.0, # Kilometers to mm
        8: 0.0000254, # Microinches to mm
        9: 0.001,     # Mils to mm
        10: 914.4,    # Yards to mm
    }

    # Keywords for room type detection
    ROOM_TYPE_KEYWORDS = {
        'living': ['living', 'lounge', 'family', 'great'],
        'bedroom': ['bedroom', 'bed', 'master', 'guest'],
        'kitchen': ['kitchen', 'kitchenette'],
        'bathroom': ['bathroom', 'bath', 'toilet', 'wc', 'lavatory'],
        'entry': ['entry', 'foyer', 'vestibule', 'mudroom'],
        'corridor': ['corridor', 'hallway', 'hall', 'passage'],
        'utility': ['utility', 'laundry', 'mud'],
        'mechanical': ['mechanical', 'mech', 'hvac', 'furnace'],
        'office': ['office', 'study', 'den', 'library'],
        'dining': ['dining', 'breakfast'],
        'garage': ['garage', 'carport'],
        'storage': ['storage', 'closet', 'pantry', 'wardrobe'],
    }

    def __init__(self, unit_override: Optional[int] = None):
        """
        Initialize DXF importer.

        Args:
            unit_override: Force specific unit conversion (AutoCAD unit code)
        """
        self.unit_override = unit_override
        self.unit_factor = 1.0
        self.rooms: List[ExtractedRoom] = []
        self.labels: List[Dict[str, Any]] = []

    def import_file(self, filepath: str) -> Dict[str, Any]:
        """
        Import a DXF file and extract room geometries.

        Args:
            filepath: Path to DXF file

        Returns:
            Floor plan data structure with extracted rooms
        """
        try:
            doc = ezdxf.readfile(filepath)
        except Exception as e:
            logger.error(f"Failed to read DXF file: {e}")
            raise ValueError(f"Invalid DXF file: {e}")

        # Determine unit conversion factor
        self._detect_units(doc)

        # Extract entities
        msp = doc.modelspace()
        self._extract_polylines(msp)
        self._extract_lwpolylines(msp)
        self._extract_labels(msp)

        # Match labels to rooms
        self._match_labels_to_rooms()

        # Calculate bounding box for overall dimensions
        bbox = self._calculate_overall_bounds()

        return {
            'id': f'imported_{uuid4().hex[:8]}',
            'name': filepath.split('/')[-1].replace('.dxf', ''),
            'source': 'dxf_import',
            'overall_dimensions': {
                'width': bbox['width'],
                'depth': bbox['depth']
            },
            'rooms': [self._room_to_dict(r) for r in self.rooms],
            'import_stats': {
                'rooms_detected': len(self.rooms),
                'labels_found': len(self.labels),
                'unit_factor': self.unit_factor
            }
        }

    def import_bytes(self, content: bytes, filename: str = 'import.dxf') -> Dict[str, Any]:
        """
        Import DXF from bytes content.

        Args:
            content: DXF file content as bytes
            filename: Original filename for naming

        Returns:
            Floor plan data structure
        """
        try:
            doc = ezdxf.read(content.decode('utf-8', errors='ignore'))
        except Exception as e:
            logger.error(f"Failed to parse DXF content: {e}")
            raise ValueError(f"Invalid DXF content: {e}")

        self._detect_units(doc)
        msp = doc.modelspace()
        self._extract_polylines(msp)
        self._extract_lwpolylines(msp)
        self._extract_labels(msp)
        self._match_labels_to_rooms()
        bbox = self._calculate_overall_bounds()

        return {
            'id': f'imported_{uuid4().hex[:8]}',
            'name': filename.replace('.dxf', ''),
            'source': 'dxf_import',
            'overall_dimensions': {
                'width': bbox['width'],
                'depth': bbox['depth']
            },
            'rooms': [self._room_to_dict(r) for r in self.rooms],
            'import_stats': {
                'rooms_detected': len(self.rooms),
                'labels_found': len(self.labels),
                'unit_factor': self.unit_factor
            }
        }

    def _detect_units(self, doc) -> None:
        """Detect and set unit conversion factor."""
        if self.unit_override is not None:
            self.unit_factor = self.UNIT_CONVERSIONS.get(self.unit_override, 1.0)
        else:
            # Try to get units from DXF header
            try:
                insunits = doc.header.get('$INSUNITS', 0)
                self.unit_factor = self.UNIT_CONVERSIONS.get(insunits, 1.0)
            except Exception:
                self.unit_factor = 1.0

        logger.info(f"Using unit conversion factor: {self.unit_factor}")

    def _extract_polylines(self, msp) -> None:
        """Extract POLYLINE entities."""
        for entity in msp.query('POLYLINE'):
            if entity.is_closed:
                vertices = [(v.dxf.location.x * self.unit_factor,
                            v.dxf.location.y * self.unit_factor)
                           for v in entity.vertices]
                self._create_room_from_vertices(vertices)

    def _extract_lwpolylines(self, msp) -> None:
        """Extract LWPOLYLINE entities (more common in modern DXF)."""
        for entity in msp.query('LWPOLYLINE'):
            if entity.closed:
                vertices = [(p[0] * self.unit_factor, p[1] * self.unit_factor)
                           for p in entity.get_points()]
                self._create_room_from_vertices(vertices)

    def _extract_labels(self, msp) -> None:
        """Extract TEXT and MTEXT entities for room labels."""
        for entity in msp.query('TEXT'):
            self.labels.append({
                'text': entity.dxf.text,
                'x': entity.dxf.insert.x * self.unit_factor,
                'y': entity.dxf.insert.y * self.unit_factor
            })

        for entity in msp.query('MTEXT'):
            self.labels.append({
                'text': entity.text,
                'x': entity.dxf.insert.x * self.unit_factor,
                'y': entity.dxf.insert.y * self.unit_factor
            })

    def _create_room_from_vertices(self, vertices: List[Tuple[float, float]]) -> None:
        """Create a room from polygon vertices."""
        if len(vertices) < 3:
            return

        # Calculate bounding box
        xs = [v[0] for v in vertices]
        ys = [v[1] for v in vertices]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)

        width = max_x - min_x
        depth = max_y - min_y

        # Skip if too small (likely not a room)
        if width < 500 or depth < 500:  # Less than 0.5m
            return

        # Determine confidence based on shape regularity
        is_rectangular = len(vertices) == 4
        confidence = 0.9 if is_rectangular else 0.6

        room = ExtractedRoom(
            id=f'room_{uuid4().hex[:8]}',
            name=f'Room {len(self.rooms) + 1}',
            room_type='other',
            position={'x': min_x, 'y': min_y},
            dimensions={'width': width, 'depth': depth, 'height': 2743},
            vertices=vertices,
            confidence=confidence
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
        """Calculate overall floor plan bounding box."""
        if not self.rooms:
            return {'width': 10000, 'depth': 10000}

        min_x = min(r.position['x'] for r in self.rooms)
        max_x = max(r.position['x'] + r.dimensions['width'] for r in self.rooms)
        min_y = min(r.position['y'] for r in self.rooms)
        max_y = max(r.position['y'] + r.dimensions['depth'] for r in self.rooms)

        # Add padding
        padding = 1000  # 1m padding

        return {
            'width': (max_x - min_x) + 2 * padding,
            'depth': (max_y - min_y) + 2 * padding
        }

    def _room_to_dict(self, room: ExtractedRoom) -> Dict[str, Any]:
        """Convert ExtractedRoom to dictionary for API response."""
        return {
            'id': room.id,
            'name': room.name,
            'room_type': room.room_type,
            'position': room.position,
            'dimensions': room.dimensions,
            'walls': [],
            'fixtures': [],
            'hvac_zone': None,
            'occupancy': 0,
            'metadata': {
                'source': 'dxf_import',
                'confidence': room.confidence,
                'original_vertices': room.vertices
            }
        }


def import_dxf(filepath: str, unit_override: Optional[int] = None) -> Dict[str, Any]:
    """
    Convenience function to import a DXF file.

    Args:
        filepath: Path to DXF file
        unit_override: Force specific unit conversion

    Returns:
        Floor plan data structure
    """
    importer = DXFImporter(unit_override)
    return importer.import_file(filepath)


def import_dxf_bytes(content: bytes, filename: str = 'import.dxf',
                     unit_override: Optional[int] = None) -> Dict[str, Any]:
    """
    Convenience function to import DXF from bytes.

    Args:
        content: DXF file content as bytes
        filename: Original filename
        unit_override: Force specific unit conversion

    Returns:
        Floor plan data structure
    """
    importer = DXFImporter(unit_override)
    return importer.import_bytes(content, filename)
