"""
HVAC API Routes for MEP Design Studio.

Provides endpoints for HVAC system design using MEPSystemEngine.
"""

import logging
from flask import Blueprint, jsonify, request
from dataclasses import asdict

# Import MEP engine
try:
    from ...design.mep_systems import MEPSystemEngine, Room, HVACType, HVACDesign
    MEP_AVAILABLE = True
except ImportError as e:
    import logging
    logging.warning(f"MEP systems not available: {e}")
    MEP_AVAILABLE = False
    MEPSystemEngine = None
    Room = None
    HVACType = None
    HVACDesign = None

logger = logging.getLogger(__name__)

hvac_bp = Blueprint('hvac', __name__, url_prefix='/api/hvac')


def room_from_dict(room_data: dict) -> Room:
    """Convert room dictionary to Room dataclass."""
    # Calculate area from dimensions if provided
    width = room_data.get('width', 0) / 1000  # Convert mm to m
    height = room_data.get('height', 0) / 1000  # Convert mm to m
    area = room_data.get('area', width * height)  # Use provided area or calculate

    # Estimate volume (assume 2.7m ceiling)
    ceiling_height = room_data.get('ceiling_height', 2.7)
    volume = area * ceiling_height

    return Room(
        name=room_data.get('name', 'Unknown Room'),
        area=area,
        volume=volume,
        occupancy=room_data.get('occupancy', 2),
        has_window=room_data.get('has_window', True)
    )


def hvac_design_to_dict(design: HVACDesign) -> dict:
    """Convert HVACDesign to JSON-serializable dict."""
    return {
        'system_type': design.system_type.value,
        'cooling_capacity': round(design.cooling_capacity, 2),
        'heating_capacity': round(design.heating_capacity, 2),
        'duct_size': {
            'width': design.duct_size[0],
            'height': design.duct_size[1]
        },
        'airflow': round(design.airflow, 2),
        'energy_efficiency': round(design.energy_efficiency, 2),
        'cost': round(design.cost, 2)
    }


@hvac_bp.route('/auto-design', methods=['POST'])
def auto_design():
    """
    Automatically design HVAC system using MEPSystemEngine.

    Request body:
        {
            "rooms": [{"name": str, "width": mm, "height": mm, ...}],
            "systemType": "vrf" | "split_system" | "ducted" | "radiant" | "mini_split"
        }

    Returns:
        JSON with equipment array, ducts array, and full design data
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {"code": "INVALID_REQUEST", "message": "Request body required"}
            }), 400

        rooms_data = data.get('rooms', [])
        system_type_str = data.get('systemType', 'mini_split').upper()

        # Convert system type string to enum
        try:
            hvac_type = HVACType[system_type_str]
        except KeyError:
            # Try mapping common frontend names
            type_mapping = {
                'MINI_SPLIT': HVACType.MINI_SPLIT,
                'VRF': HVACType.VRF,
                'SPLIT_SYSTEM': HVACType.SPLIT_SYSTEM,
                'DUCTED': HVACType.DUCTED,
                'RADIANT': HVACType.RADIANT,
            }
            hvac_type = type_mapping.get(system_type_str, HVACType.MINI_SPLIT)

        # Convert rooms to Room objects
        rooms = [room_from_dict(r) for r in rooms_data]

        # If no rooms provided, create a default test room
        if not rooms:
            rooms = [Room(name="Default Room", area=20.0, volume=54.0, occupancy=2, has_window=True)]

        # Run MEP engine
        logger.info(f"Running MEPSystemEngine.design_hvac() with {len(rooms)} rooms, type={hvac_type.value}")
        engine = MEPSystemEngine()
        design = engine.design_hvac(rooms, system_type=hvac_type)
        logger.info(f"HVAC design complete: cooling={design.cooling_capacity}kW, cost=${design.cost}")

        # Generate equipment placement based on design
        equipment = generate_hvac_equipment(rooms_data, design, hvac_type)

        # Generate duct segments
        ducts = generate_duct_segments(rooms_data, design)

        return jsonify({
            "success": True,
            "data": {
                "equipment": equipment,
                "ducts": ducts,
                "design": hvac_design_to_dict(design)
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"HVAC auto-design error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "data": None,
            "error": {"code": "DESIGN_ERROR", "message": str(e)}
        }), 500


def generate_hvac_equipment(rooms_data: list, design: HVACDesign, hvac_type: HVACType) -> list:
    """Generate equipment placement based on HVAC design."""
    equipment = []

    # Add outdoor unit
    equipment.append({
        "id": f"hvac-outdoor-1",
        "type": "mini_split_outdoor",
        "x": 50,
        "y": 50,
        "label": f"Outdoor Unit ({round(design.cooling_capacity, 1)}kW)",
        "capacity": design.cooling_capacity
    })

    # Add indoor units for each room
    for idx, room in enumerate(rooms_data):
        x = room.get('x', 100 + idx * 200) / 10 + 50  # Scale and offset
        y = room.get('y', 100) / 10 + 50

        equipment.append({
            "id": f"hvac-indoor-{idx + 1}",
            "type": "mini_split_indoor",
            "x": x,
            "y": y,
            "label": f"Indoor Unit - {room.get('name', f'Room {idx + 1}')}",
            "room": room.get('name')
        })

    # Add HRV/ERV unit
    equipment.append({
        "id": "hvac-hrv-1",
        "type": "hrv",
        "x": 150,
        "y": 150,
        "label": f"HRV ({round(design.airflow, 0)} L/s)",
        "airflow": design.airflow
    })

    # Add supply diffusers for each room
    for idx, room in enumerate(rooms_data):
        x = room.get('x', 100 + idx * 200) / 10 + 80
        y = room.get('y', 100) / 10 + 80

        equipment.append({
            "id": f"hvac-supply-{idx + 1}",
            "type": "supply_diffuser",
            "x": x,
            "y": y,
            "label": f"Supply - {room.get('name', f'Room {idx + 1}')}"
        })

    return equipment


def generate_duct_segments(rooms_data: list, design: HVACDesign) -> list:
    """Generate duct segments connecting equipment."""
    ducts = []

    # Main trunk duct from HRV
    hrv_x, hrv_y = 150, 150

    for idx, room in enumerate(rooms_data):
        room_x = room.get('x', 100 + idx * 200) / 10 + 80
        room_y = room.get('y', 100) / 10 + 80

        # Connect HRV to supply diffuser
        ducts.append({
            "id": f"duct-supply-{idx + 1}",
            "startX": hrv_x,
            "startY": hrv_y,
            "endX": room_x,
            "endY": room_y,
            "type": "supply",
            "size": {
                "width": design.duct_size[0],
                "height": design.duct_size[1]
            }
        })

    return ducts


@hvac_bp.route('/calculate-load', methods=['POST'])
def calculate_load():
    """
    Calculate HVAC load for rooms.

    Request body:
        {"rooms": [{"name": str, "width": mm, "height": mm, ...}]}

    Returns:
        Total BTU load and per-room breakdown
    """
    try:
        data = request.get_json()
        rooms_data = data.get('rooms', [])

        total_load_kw = 0.0
        per_room = []

        for room in rooms_data:
            width = room.get('width', 0) / 1000
            height = room.get('height', 0) / 1000
            area = width * height

            # Simplified load calculation (W/m²)
            area_load = area * 150  # W/m²
            occupancy_load = room.get('occupancy', 2) * 100  # W/person
            window_load = 500 if room.get('has_window', True) else 0

            room_load_w = area_load + occupancy_load + window_load
            room_load_kw = room_load_w / 1000
            room_load_btu = room_load_kw * 3412  # Convert kW to BTU/hr

            total_load_kw += room_load_kw

            per_room.append({
                "name": room.get('name', 'Unknown'),
                "area_sqm": round(area, 2),
                "load_kw": round(room_load_kw, 2),
                "load_btu": round(room_load_btu, 0)
            })

        total_btu = total_load_kw * 3412

        return jsonify({
            "success": True,
            "data": {
                "totalLoad": {
                    "kw": round(total_load_kw, 2),
                    "btu": round(total_btu, 0)
                },
                "perRoom": per_room
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"HVAC load calculation error: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {"code": "CALCULATION_ERROR", "message": str(e)}
        }), 500


@hvac_bp.route('/validate', methods=['POST'])
def validate():
    """
    Validate HVAC design against requirements.

    Request body:
        {"equipment": [...], "ducts": [...]}

    Returns:
        Validation result with any issues found
    """
    try:
        data = request.get_json()
        equipment = data.get('equipment', [])
        ducts = data.get('ducts', [])

        issues = []

        # Check for outdoor unit
        outdoor_units = [e for e in equipment if e.get('type') == 'mini_split_outdoor']
        if not outdoor_units:
            issues.append("Missing outdoor unit - system requires at least one outdoor unit")

        # Check for indoor units
        indoor_units = [e for e in equipment if e.get('type') == 'mini_split_indoor']
        if not indoor_units:
            issues.append("No indoor units placed - add indoor units to conditioned spaces")

        # Check for HRV/ERV
        hrv_units = [e for e in equipment if e.get('type') in ['hrv', 'erv']]
        if not hrv_units:
            issues.append("No HRV/ERV unit - ventilation required for indoor air quality")

        # Check supply/return balance
        supply_diffusers = [e for e in equipment if e.get('type') == 'supply_diffuser']
        return_grilles = [e for e in equipment if e.get('type') == 'return_grille']

        if supply_diffusers and not return_grilles:
            issues.append("Missing return air grilles - add return grilles for proper air circulation")

        # Check duct connections
        if ducts:
            for duct in ducts:
                if duct.get('startX') == duct.get('endX') and duct.get('startY') == duct.get('endY'):
                    issues.append(f"Duct {duct.get('id', 'unknown')} has zero length")

        return jsonify({
            "success": True,
            "data": {
                "valid": len(issues) == 0,
                "issues": issues,
                "equipment_count": len(equipment),
                "duct_count": len(ducts)
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"HVAC validation error: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {"code": "VALIDATION_ERROR", "message": str(e)}
        }), 500
