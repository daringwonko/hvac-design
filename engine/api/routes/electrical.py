"""
Electrical API Routes for MEP Design Studio.

Provides endpoints for electrical system design using MEPSystemEngine.
"""

import logging
from flask import Blueprint, jsonify, request

# Import MEP engine
try:
    from ...design.mep_systems import MEPSystemEngine, Room, ElectricalPhase, ElectricalDesign
    MEP_AVAILABLE = True
except ImportError as e:
    import logging
    logging.warning(f"MEP systems not available: {e}")
    MEP_AVAILABLE = False
    MEPSystemEngine = None
    Room = None
    ElectricalPhase = None
    ElectricalDesign = None

logger = logging.getLogger(__name__)

electrical_bp = Blueprint('electrical', __name__, url_prefix='/api/electrical')


def room_from_dict(room_data: dict) -> Room:
    """Convert room dictionary to Room dataclass."""
    width = room_data.get('width', 0) / 1000  # Convert mm to m
    height = room_data.get('height', 0) / 1000  # Convert mm to m
    area = room_data.get('area', width * height)

    ceiling_height = room_data.get('ceiling_height', 2.7)
    volume = area * ceiling_height

    return Room(
        name=room_data.get('name', 'Unknown Room'),
        area=area,
        volume=volume,
        occupancy=room_data.get('occupancy', 2),
        has_window=room_data.get('has_window', True)
    )


def electrical_design_to_dict(design: ElectricalDesign) -> dict:
    """Convert ElectricalDesign to JSON-serializable dict."""
    return {
        'phase': design.phase.value,
        'total_load': round(design.total_load, 2),
        'main_breaker': round(design.main_breaker, 2),
        'circuits': [{'name': c[0], 'amps': round(c[1], 2)} for c in design.circuits],
        'wire_gauge': design.wire_gauge,
        'cost': round(design.cost, 2)
    }


@electrical_bp.route('/auto-design', methods=['POST'])
def auto_design():
    """
    Automatically design electrical system using MEPSystemEngine.

    Request body:
        {
            "rooms": [{"name": str, "width": mm, "height": mm, ...}],
            "buildingType": "residential" | "office" | "commercial",
            "phase": "single_phase" | "three_phase"
        }

    Returns:
        JSON with equipment array, wires array, and full design data
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
        building_type = data.get('buildingType', 'residential')
        phase_str = data.get('phase', 'single_phase').upper()

        # Convert phase string to enum
        try:
            phase = ElectricalPhase[phase_str]
        except KeyError:
            phase = ElectricalPhase.SINGLE_PHASE

        # Convert rooms to Room objects
        rooms = [room_from_dict(r) for r in rooms_data]

        # If no rooms provided, create a default test room
        if not rooms:
            rooms = [Room(name="Default Room", area=20.0, volume=54.0, occupancy=2, has_window=True)]

        # Run MEP engine
        logger.info(f"Running MEPSystemEngine.design_electrical() with {len(rooms)} rooms, type={building_type}")
        engine = MEPSystemEngine()
        design = engine.design_electrical(rooms, building_type=building_type, phase=phase)
        logger.info(f"Electrical design complete: load={design.total_load}kW, breaker={design.main_breaker}A")

        # Generate equipment placement based on design
        equipment = generate_electrical_equipment(rooms_data, design)

        # Generate wire segments
        wires = generate_wire_segments(rooms_data, design)

        return jsonify({
            "success": True,
            "data": {
                "equipment": equipment,
                "wires": wires,
                "design": electrical_design_to_dict(design)
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Electrical auto-design error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "data": None,
            "error": {"code": "DESIGN_ERROR", "message": str(e)}
        }), 500


def generate_electrical_equipment(rooms_data: list, design: ElectricalDesign) -> list:
    """Generate equipment placement based on electrical design."""
    equipment = []

    # Add main panel
    equipment.append({
        "id": "elec-panel-1",
        "type": "panel",
        "x": 50,
        "y": 50,
        "label": f"Main Panel ({round(design.main_breaker)}A)",
        "breaker_size": design.main_breaker
    })

    # Add outlets for each room
    for idx, room in enumerate(rooms_data):
        x = room.get('x', 100 + idx * 200) / 10 + 50
        y = room.get('y', 100) / 10 + 50

        # Standard duplex outlet
        equipment.append({
            "id": f"elec-outlet-{idx + 1}",
            "type": "outlet_duplex",
            "x": x,
            "y": y,
            "label": f"Outlet - {room.get('name', f'Room {idx + 1}')}",
            "room": room.get('name')
        })

        # Light fixture
        equipment.append({
            "id": f"elec-light-{idx + 1}",
            "type": "light_ceiling",
            "x": x + 30,
            "y": y + 30,
            "label": f"Light - {room.get('name', f'Room {idx + 1}')}",
            "room": room.get('name')
        })

        # Switch
        equipment.append({
            "id": f"elec-switch-{idx + 1}",
            "type": "switch_single",
            "x": x - 10,
            "y": y + 50,
            "label": f"Switch - {room.get('name', f'Room {idx + 1}')}",
            "room": room.get('name')
        })

    # Add smoke detector
    equipment.append({
        "id": "elec-smoke-1",
        "type": "smoke_detector",
        "x": 100,
        "y": 100,
        "label": "Smoke Detector"
    })

    return equipment


def generate_wire_segments(rooms_data: list, design: ElectricalDesign) -> list:
    """Generate wire segments connecting equipment."""
    wires = []

    panel_x, panel_y = 50, 50

    for idx, room in enumerate(rooms_data):
        room_x = room.get('x', 100 + idx * 200) / 10 + 50
        room_y = room.get('y', 100) / 10 + 50

        # Home run from panel to room
        circuit_idx = idx % len(design.circuits) if design.circuits else 0
        circuit_amps = design.circuits[circuit_idx][1] if design.circuits else 15

        wires.append({
            "id": f"wire-{idx + 1}",
            "startX": panel_x,
            "startY": panel_y,
            "endX": room_x,
            "endY": room_y,
            "circuitType": "15A" if circuit_amps <= 15 else "20A",
            "gauge": design.wire_gauge
        })

    return wires


@electrical_bp.route('/calculate-load', methods=['POST'])
def calculate_load():
    """
    Calculate electrical load for equipment.

    Request body:
        {"equipment": [...]}

    Returns:
        Total amps and per-circuit breakdown
    """
    try:
        data = request.get_json()
        equipment = data.get('equipment', [])

        # Standard load values
        load_values = {
            'outlet_duplex': 180,  # watts
            'outlet_gfci': 180,
            'outlet_240v': 5000,
            'light_ceiling': 100,
            'light_recessed': 75,
            'switch_single': 0,
            'switch_3way': 0,
            'switch_dimmer': 10,
            'smoke_detector': 5,
            'panel': 0,
            'subpanel': 0
        }

        total_watts = 0
        per_circuit = {}

        for eq in equipment:
            eq_type = eq.get('type', 'outlet_duplex')
            watts = load_values.get(eq_type, 100)
            total_watts += watts

            circuit = eq.get('circuit', 'general')
            if circuit not in per_circuit:
                per_circuit[circuit] = {'watts': 0, 'count': 0}
            per_circuit[circuit]['watts'] += watts
            per_circuit[circuit]['count'] += 1

        # Calculate amps (assuming 120V for most circuits)
        total_amps = total_watts / 120

        circuits_list = [
            {'name': name, 'watts': data['watts'], 'amps': round(data['watts'] / 120, 2), 'count': data['count']}
            for name, data in per_circuit.items()
        ]

        return jsonify({
            "success": True,
            "data": {
                "totalLoad": {
                    "watts": total_watts,
                    "amps": round(total_amps, 2)
                },
                "perCircuit": circuits_list
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Electrical load calculation error: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {"code": "CALCULATION_ERROR", "message": str(e)}
        }), 500


@electrical_bp.route('/validate', methods=['POST'])
def validate():
    """
    Validate electrical design against code requirements.

    Request body:
        {"equipment": [...], "wires": [...]}

    Returns:
        Validation result with any issues found
    """
    try:
        data = request.get_json()
        equipment = data.get('equipment', [])
        wires = data.get('wires', [])

        issues = []

        # Check for main panel
        panels = [e for e in equipment if e.get('type') == 'panel']
        if not panels:
            issues.append("Missing main electrical panel")

        # Check for GFCI in wet areas
        outlets = [e for e in equipment if 'outlet' in e.get('type', '')]
        for outlet in outlets:
            room = outlet.get('room', '').lower()
            if any(wet in room for wet in ['bath', 'kitchen', 'laundry']):
                if outlet.get('type') != 'outlet_gfci':
                    issues.append(f"GFCI required for outlet in {outlet.get('room', 'wet area')}")

        # Check for smoke detectors
        smoke_detectors = [e for e in equipment if e.get('type') == 'smoke_detector']
        if not smoke_detectors:
            issues.append("Missing smoke detector - required by code")

        # Check circuit loading
        circuit_loads = {}
        for eq in equipment:
            circuit = eq.get('circuit', 'general')
            load = {'outlet_duplex': 180, 'outlet_240v': 5000, 'light_ceiling': 100}.get(eq.get('type'), 100)
            circuit_loads[circuit] = circuit_loads.get(circuit, 0) + load

        for circuit, load in circuit_loads.items():
            if load > 1440:  # 80% of 15A circuit
                issues.append(f"Circuit '{circuit}' may be overloaded ({load}W > 1440W recommended)")

        return jsonify({
            "success": True,
            "data": {
                "valid": len(issues) == 0,
                "issues": issues,
                "equipment_count": len(equipment),
                "wire_count": len(wires)
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Electrical validation error: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {"code": "VALIDATION_ERROR", "message": str(e)}
        }), 500
