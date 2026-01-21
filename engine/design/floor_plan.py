#!/usr/bin/env python3
"""
Floor Plan Design Engine
========================
Core data structures and operations for floor plan editing.

Integrates with:
- MEPSystemEngine for HVAC/Electrical/Plumbing design
- StructuralEngine for load calculations
- SystemOrchestrator for workflow management
- CollaborationEngine for real-time sync
"""

import json
import uuid
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any, Tuple
from enum import Enum
from datetime import datetime


class RoomType(Enum):
    """Room type classifications for MEP calculations"""
    LIVING = "living"
    BEDROOM = "bedroom"
    KITCHEN = "kitchen"
    BATHROOM = "bathroom"
    ENTRY = "entry"
    CORRIDOR = "corridor"
    UTILITY = "utility"
    MECHANICAL = "mechanical"
    OFFICE = "office"
    DINING = "dining"
    GARAGE = "garage"
    STORAGE = "storage"
    OTHER = "other"


class WallType(Enum):
    """Wall classifications"""
    EXTERIOR = "exterior"
    INTERIOR = "interior"
    LOAD_BEARING = "load_bearing"
    PARTITION = "partition"
    WET_WALL = "wet_wall"  # Contains plumbing


class FixtureType(Enum):
    """Fixture types for bathrooms/kitchens"""
    TOILET = "toilet"
    SINK = "sink"
    VANITY = "vanity"
    SHOWER = "shower"
    BATHTUB = "bathtub"
    WASHER = "washer"
    DRYER = "dryer"
    RANGE = "range"
    REFRIGERATOR = "refrigerator"
    DISHWASHER = "dishwasher"
    WATER_HEATER = "water_heater"
    HVAC_UNIT = "hvac_unit"
    ELECTRICAL_PANEL = "electrical_panel"
    OTHER = "other"


@dataclass
class Point:
    """2D point in millimeters"""
    x: float
    y: float

    def to_dict(self) -> Dict[str, float]:
        return {"x": self.x, "y": self.y}

    @classmethod
    def from_dict(cls, data: Dict) -> 'Point':
        return cls(x=data["x"], y=data["y"])


@dataclass
class Dimensions:
    """Room or fixture dimensions in millimeters"""
    width: float
    depth: float
    height: float = 2743.0  # Default 9ft ceiling

    @property
    def area_sqm(self) -> float:
        return (self.width * self.depth) / 1_000_000

    @property
    def volume_cum(self) -> float:
        return (self.width * self.depth * self.height) / 1_000_000_000

    def to_dict(self) -> Dict[str, float]:
        return {"width": self.width, "depth": self.depth, "height": self.height}

    @classmethod
    def from_dict(cls, data: Dict) -> 'Dimensions':
        return cls(
            width=data["width"],
            depth=data["depth"],
            height=data.get("height", 2743.0)
        )


@dataclass
class Fixture:
    """Fixture within a room (toilet, sink, appliance, etc.)"""
    id: str
    fixture_type: FixtureType
    position: Point
    dimensions: Dimensions
    rotation: float = 0.0  # Degrees
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "fixture_type": self.fixture_type.value,
            "position": self.position.to_dict(),
            "dimensions": self.dimensions.to_dict(),
            "rotation": self.rotation,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Fixture':
        return cls(
            id=data["id"],
            fixture_type=FixtureType(data["fixture_type"]),
            position=Point.from_dict(data["position"]),
            dimensions=Dimensions.from_dict(data["dimensions"]),
            rotation=data.get("rotation", 0.0),
            metadata=data.get("metadata", {})
        )


@dataclass
class Door:
    """Door within a wall"""
    id: str
    position: Point  # Position along the wall
    width: float = 914.0  # 36" standard
    height: float = 2032.0  # 80" standard
    swing_direction: str = "in"  # in, out, left, right, bi-fold, sliding
    is_exterior: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "position": self.position.to_dict(),
            "width": self.width,
            "height": self.height,
            "swing_direction": self.swing_direction,
            "is_exterior": self.is_exterior
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Door':
        return cls(
            id=data["id"],
            position=Point.from_dict(data["position"]),
            width=data.get("width", 914.0),
            height=data.get("height", 2032.0),
            swing_direction=data.get("swing_direction", "in"),
            is_exterior=data.get("is_exterior", False)
        )


@dataclass
class Window:
    """Window within a wall"""
    id: str
    position: Point
    width: float = 914.0
    height: float = 1219.0  # 48" standard
    sill_height: float = 914.0  # 36" from floor

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "position": self.position.to_dict(),
            "width": self.width,
            "height": self.height,
            "sill_height": self.sill_height
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Window':
        return cls(
            id=data["id"],
            position=Point.from_dict(data["position"]),
            width=data.get("width", 914.0),
            height=data.get("height", 1219.0),
            sill_height=data.get("sill_height", 914.0)
        )


@dataclass
class Wall:
    """Wall segment"""
    id: str
    start: Point
    end: Point
    wall_type: WallType = WallType.INTERIOR
    thickness: float = 114.0  # 4.5" standard stud wall
    doors: List[Door] = field(default_factory=list)
    windows: List[Window] = field(default_factory=list)

    @property
    def length(self) -> float:
        dx = self.end.x - self.start.x
        dy = self.end.y - self.start.y
        return (dx**2 + dy**2) ** 0.5

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "start": self.start.to_dict(),
            "end": self.end.to_dict(),
            "wall_type": self.wall_type.value,
            "thickness": self.thickness,
            "doors": [d.to_dict() for d in self.doors],
            "windows": [w.to_dict() for w in self.windows]
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Wall':
        return cls(
            id=data["id"],
            start=Point.from_dict(data["start"]),
            end=Point.from_dict(data["end"]),
            wall_type=WallType(data.get("wall_type", "interior")),
            thickness=data.get("thickness", 114.0),
            doors=[Door.from_dict(d) for d in data.get("doors", [])],
            windows=[Window.from_dict(w) for w in data.get("windows", [])]
        )


@dataclass
class HVACZone:
    """HVAC zone assignment for a room"""
    zone_id: str
    heating_type: str = "radiant_floor"
    cooling_type: str = "mini_split"
    mini_split_btu: Optional[int] = None
    supply_cfm: float = 0.0
    exhaust_cfm: float = 0.0
    thermostat_model: str = "Mysa Smart"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "zone_id": self.zone_id,
            "heating_type": self.heating_type,
            "cooling_type": self.cooling_type,
            "mini_split_btu": self.mini_split_btu,
            "supply_cfm": self.supply_cfm,
            "exhaust_cfm": self.exhaust_cfm,
            "thermostat_model": self.thermostat_model
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'HVACZone':
        return cls(
            zone_id=data["zone_id"],
            heating_type=data.get("heating_type", "radiant_floor"),
            cooling_type=data.get("cooling_type", "mini_split"),
            mini_split_btu=data.get("mini_split_btu"),
            supply_cfm=data.get("supply_cfm", 0.0),
            exhaust_cfm=data.get("exhaust_cfm", 0.0),
            thermostat_model=data.get("thermostat_model", "Mysa Smart")
        )


@dataclass
class Room:
    """Room within a floor plan"""
    id: str
    name: str
    room_type: RoomType
    position: Point  # Top-left corner
    dimensions: Dimensions
    walls: List[str] = field(default_factory=list)  # Wall IDs
    fixtures: List[Fixture] = field(default_factory=list)
    hvac_zone: Optional[HVACZone] = None
    occupancy: int = 0  # For load calculations
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def area_sqm(self) -> float:
        return self.dimensions.area_sqm

    @property
    def bounds(self) -> Tuple[Point, Point]:
        """Returns (top_left, bottom_right) points"""
        return (
            self.position,
            Point(
                self.position.x + self.dimensions.width,
                self.position.y + self.dimensions.depth
            )
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "room_type": self.room_type.value,
            "position": self.position.to_dict(),
            "dimensions": self.dimensions.to_dict(),
            "walls": self.walls,
            "fixtures": [f.to_dict() for f in self.fixtures],
            "hvac_zone": self.hvac_zone.to_dict() if self.hvac_zone else None,
            "occupancy": self.occupancy,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'Room':
        return cls(
            id=data["id"],
            name=data["name"],
            room_type=RoomType(data["room_type"]),
            position=Point.from_dict(data["position"]),
            dimensions=Dimensions.from_dict(data["dimensions"]),
            walls=data.get("walls", []),
            fixtures=[Fixture.from_dict(f) for f in data.get("fixtures", [])],
            hvac_zone=HVACZone.from_dict(data["hvac_zone"]) if data.get("hvac_zone") else None,
            occupancy=data.get("occupancy", 0),
            metadata=data.get("metadata", {})
        )


@dataclass
class FloorPlan:
    """Complete floor plan representation"""
    id: str
    name: str
    version: str = "1.0.0"
    overall_dimensions: Dimensions = field(default_factory=lambda: Dimensions(17850, 7496))
    rooms: List[Room] = field(default_factory=list)
    walls: List[Wall] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def total_area_sqm(self) -> float:
        return sum(room.area_sqm for room in self.rooms)

    @property
    def room_count(self) -> int:
        return len(self.rooms)

    def get_room(self, room_id: str) -> Optional[Room]:
        for room in self.rooms:
            if room.id == room_id:
                return room
        return None

    def get_rooms_by_type(self, room_type: RoomType) -> List[Room]:
        return [r for r in self.rooms if r.room_type == room_type]

    def add_room(self, room: Room) -> None:
        self.rooms.append(room)
        self.updated_at = datetime.utcnow().isoformat()

    def remove_room(self, room_id: str) -> bool:
        original_count = len(self.rooms)
        self.rooms = [r for r in self.rooms if r.id != room_id]
        if len(self.rooms) < original_count:
            self.updated_at = datetime.utcnow().isoformat()
            return True
        return False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "version": self.version,
            "overall_dimensions": self.overall_dimensions.to_dict(),
            "rooms": [r.to_dict() for r in self.rooms],
            "walls": [w.to_dict() for w in self.walls],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "metadata": self.metadata
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: Dict) -> 'FloorPlan':
        return cls(
            id=data["id"],
            name=data["name"],
            version=data.get("version", "1.0.0"),
            overall_dimensions=Dimensions.from_dict(data["overall_dimensions"]),
            rooms=[Room.from_dict(r) for r in data.get("rooms", [])],
            walls=[Wall.from_dict(w) for w in data.get("walls", [])],
            created_at=data.get("created_at", datetime.utcnow().isoformat()),
            updated_at=data.get("updated_at", datetime.utcnow().isoformat()),
            metadata=data.get("metadata", {})
        )

    @classmethod
    def from_json(cls, json_str: str) -> 'FloorPlan':
        return cls.from_dict(json.loads(json_str))


class FloorPlanEngine:
    """
    Floor Plan Design Engine

    Provides operations for creating, editing, and analyzing floor plans.
    Integrates with MEP, structural, and collaboration systems.
    """

    def __init__(self):
        self.floor_plans: Dict[str, FloorPlan] = {}

    def create_floor_plan(self, name: str, width_mm: float, depth_mm: float) -> FloorPlan:
        """Create a new empty floor plan"""
        floor_plan = FloorPlan(
            id=f"fp_{uuid.uuid4().hex[:12]}",
            name=name,
            overall_dimensions=Dimensions(width=width_mm, depth=depth_mm)
        )
        self.floor_plans[floor_plan.id] = floor_plan
        return floor_plan

    def add_room(
        self,
        floor_plan_id: str,
        name: str,
        room_type: RoomType,
        x: float,
        y: float,
        width: float,
        depth: float
    ) -> Optional[Room]:
        """Add a room to a floor plan"""
        floor_plan = self.floor_plans.get(floor_plan_id)
        if not floor_plan:
            return None

        room = Room(
            id=f"room_{uuid.uuid4().hex[:8]}",
            name=name,
            room_type=room_type,
            position=Point(x, y),
            dimensions=Dimensions(width=width, depth=depth)
        )
        floor_plan.add_room(room)
        return room

    def move_room(
        self,
        floor_plan_id: str,
        room_id: str,
        new_x: float,
        new_y: float
    ) -> bool:
        """Move a room to a new position"""
        floor_plan = self.floor_plans.get(floor_plan_id)
        if not floor_plan:
            return False

        room = floor_plan.get_room(room_id)
        if not room:
            return False

        room.position = Point(new_x, new_y)
        floor_plan.updated_at = datetime.utcnow().isoformat()
        return True

    def resize_room(
        self,
        floor_plan_id: str,
        room_id: str,
        new_width: float,
        new_depth: float
    ) -> bool:
        """Resize a room"""
        floor_plan = self.floor_plans.get(floor_plan_id)
        if not floor_plan:
            return False

        room = floor_plan.get_room(room_id)
        if not room:
            return False

        room.dimensions.width = new_width
        room.dimensions.depth = new_depth
        floor_plan.updated_at = datetime.utcnow().isoformat()
        return True

    def add_fixture(
        self,
        floor_plan_id: str,
        room_id: str,
        fixture_type: FixtureType,
        x: float,
        y: float,
        width: float,
        depth: float
    ) -> Optional[Fixture]:
        """Add a fixture to a room"""
        floor_plan = self.floor_plans.get(floor_plan_id)
        if not floor_plan:
            return None

        room = floor_plan.get_room(room_id)
        if not room:
            return None

        fixture = Fixture(
            id=f"fix_{uuid.uuid4().hex[:8]}",
            fixture_type=fixture_type,
            position=Point(x, y),
            dimensions=Dimensions(width=width, depth=depth, height=900)
        )
        room.fixtures.append(fixture)
        floor_plan.updated_at = datetime.utcnow().isoformat()
        return fixture

    def assign_hvac_zone(
        self,
        floor_plan_id: str,
        room_id: str,
        zone_id: str,
        heating_type: str = "radiant_floor",
        mini_split_btu: Optional[int] = None
    ) -> bool:
        """Assign HVAC zone to a room"""
        floor_plan = self.floor_plans.get(floor_plan_id)
        if not floor_plan:
            return False

        room = floor_plan.get_room(room_id)
        if not room:
            return False

        room.hvac_zone = HVACZone(
            zone_id=zone_id,
            heating_type=heating_type,
            mini_split_btu=mini_split_btu
        )
        floor_plan.updated_at = datetime.utcnow().isoformat()
        return True

    def get_floor_plan(self, floor_plan_id: str) -> Optional[FloorPlan]:
        """Get a floor plan by ID"""
        return self.floor_plans.get(floor_plan_id)

    def list_floor_plans(self) -> List[Dict[str, Any]]:
        """List all floor plans (summary)"""
        return [
            {
                "id": fp.id,
                "name": fp.name,
                "room_count": fp.room_count,
                "total_area_sqm": fp.total_area_sqm,
                "updated_at": fp.updated_at
            }
            for fp in self.floor_plans.values()
        ]

    def export_to_json(self, floor_plan_id: str) -> Optional[str]:
        """Export floor plan to JSON"""
        floor_plan = self.floor_plans.get(floor_plan_id)
        if not floor_plan:
            return None
        return floor_plan.to_json()

    def import_from_json(self, json_str: str) -> FloorPlan:
        """Import floor plan from JSON"""
        floor_plan = FloorPlan.from_json(json_str)
        self.floor_plans[floor_plan.id] = floor_plan
        return floor_plan

    def calculate_total_area(self, floor_plan_id: str) -> float:
        """Calculate total floor area"""
        floor_plan = self.floor_plans.get(floor_plan_id)
        if not floor_plan:
            return 0.0
        return floor_plan.total_area_sqm

    def get_rooms_for_mep(self, floor_plan_id: str) -> List[Dict[str, Any]]:
        """Get room data formatted for MEP system calculations"""
        floor_plan = self.floor_plans.get(floor_plan_id)
        if not floor_plan:
            return []

        return [
            {
                "name": room.name,
                "area": room.area_sqm,
                "volume": room.dimensions.volume_cum,
                "occupancy": room.occupancy,
                "has_window": any(
                    len(self.floor_plans[floor_plan_id].walls) > 0
                    for w in room.walls
                ),
                "room_type": room.room_type.value,
                "hvac_zone": room.hvac_zone.to_dict() if room.hvac_zone else None
            }
            for room in floor_plan.rooms
        ]


# =============================================================================
# DEMONSTRATION
# =============================================================================

def demonstrate_floor_plan_engine():
    """Demonstrate floor plan engine capabilities"""
    print("=" * 80)
    print("FLOOR PLAN DESIGN ENGINE DEMONSTRATION")
    print("=" * 80)

    engine = FloorPlanEngine()

    # Create floor plan
    print("\n1. CREATE FLOOR PLAN")
    print("-" * 50)
    floor_plan = engine.create_floor_plan(
        name="Goldilocks 3B-3B",
        width_mm=17850,
        depth_mm=7496
    )
    print(f"Created: {floor_plan.name} ({floor_plan.id})")
    print(f"Dimensions: {floor_plan.overall_dimensions.width}mm x {floor_plan.overall_dimensions.depth}mm")

    # Add rooms
    print("\n2. ADD ROOMS")
    print("-" * 50)

    rooms_data = [
        ("Living Room", RoomType.LIVING, 0, 1355, 4614, 3000),
        ("Kitchen", RoomType.KITCHEN, 4614, 1355, 5630, 2980),
        ("Master Bedroom", RoomType.BEDROOM, 15050, 0, 2800, 5941),
        ("Bedroom #2", RoomType.BEDROOM, 0, 4728, 5790, 2768),
        ("Bedroom #3", RoomType.BEDROOM, 11380, 4070, 2890, 3426),
        ("Mechanical Room", RoomType.MECHANICAL, 5790, 5920, 2900, 1576),
    ]

    for name, rtype, x, y, w, d in rooms_data:
        room = engine.add_room(floor_plan.id, name, rtype, x, y, w, d)
        print(f"  Added: {room.name} ({room.area_sqm:.2f} m²)")

    # Assign HVAC zones
    print("\n3. ASSIGN HVAC ZONES")
    print("-" * 50)

    for room in floor_plan.rooms:
        if room.room_type == RoomType.BEDROOM:
            btu = 9000 if "Master" in room.name else 6000
            engine.assign_hvac_zone(floor_plan.id, room.id, f"zone_{room.name.lower().replace(' ', '_')}", "radiant_plus_mini_split", btu)
            print(f"  {room.name}: radiant + {btu} BTU mini-split")
        elif room.room_type == RoomType.LIVING:
            engine.assign_hvac_zone(floor_plan.id, room.id, "zone_living", "radiant_plus_mini_split", 12000)
            print(f"  {room.name}: radiant + 12000 BTU mini-split")
        else:
            engine.assign_hvac_zone(floor_plan.id, room.id, f"zone_{room.name.lower().replace(' ', '_')}", "radiant_floor")
            print(f"  {room.name}: radiant floor only")

    # Summary
    print("\n4. FLOOR PLAN SUMMARY")
    print("-" * 50)
    print(f"Total rooms: {floor_plan.room_count}")
    print(f"Total area: {floor_plan.total_area_sqm:.2f} m²")

    # Export
    print("\n5. EXPORT TO JSON")
    print("-" * 50)
    json_export = engine.export_to_json(floor_plan.id)
    print(f"Exported {len(json_export)} characters of JSON")

    print("\n" + "=" * 80)
    print("FLOOR PLAN ENGINE DEMONSTRATION COMPLETE")
    print("=" * 80)

    return floor_plan


if __name__ == "__main__":
    demonstrate_floor_plan_engine()
