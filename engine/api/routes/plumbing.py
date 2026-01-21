"""
Plumbing API Routes for MEP Design Studio.

Provides endpoints for plumbing system design using MEPSystemEngine.
"""

import logging
from flask import Blueprint, jsonify, request

# Import MEP engine
try:
    from ...design.mep_systems import MEPSystemEngine, Room, PlumbingDesign
    MEP_AVAILABLE = True
except ImportError as e:
    import logging
    logging.warning(f"MEP systems not available: {e}")
    MEP_AVAILABLE = False
    MEPSystemEngine = None
    Room = None
    PlumbingDesign = None

logger = logging.getLogger(__name__)

plumbing_bp = Blueprint('plumbing', __name__, url_prefix='/api/plumbing')


def room_from_dict(room_data: dict) -> Room:
    """Convert room dictionary to Room dataclass."""
    width = room_data.get('width', 0) / 1000
    height = room_data.get('height', 0) / 1000
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


def plumbing_design_to_dict(design: PlumbingDesign) -> dict:
    """Convert PlumbingDesign to JSON-serializable dict."""
    return {
        'fixture_count': design.fixture_count,
        'pipe_sizes': design.pipe_sizes,
        'flow_rate': round(design.flow_rate, 2),
        'pump_power': round(design.pump_power, 2),
        'cost': round(design.cost, 2)
    }


@plumbing_bp.route('/auto-route', methods=['POST'])
def auto_route():
    """
    Auto-route plumbing using MEPSystemEngine.

    Request body:
        {
            "fixtures": [{"type": str, "x": num, "y": num, ...}],
            "rooms": [{"name": str, "width": mm, "height": mm, ...}]
        }

    Returns:
        JSON with pipes array and design data
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {"code": "INVALID_REQUEST", "message": "Request body required"}
            }), 400

        fixtures_data = data.get('fixtures', [])
        rooms_data = data.get('rooms', [])

        # Convert rooms to Room objects
        rooms = [room_from_dict(r) for r in rooms_data]

        # If no rooms, create default
        if not rooms:
            rooms = [Room(name="Default Room", area=20.0, volume=54.0, occupancy=2, has_window=True)]

        # Count fixtures by type
        fixture_counts = {}
        for fixture in fixtures_data:
            fixture_type = fixture.get('type', 'sink')
            # Map frontend types to engine types
            type_mapping = {
                'sink': 'sink',
                'toilet': 'toilet',
                'shower': 'shower',
                'bathtub': 'bathtub',
                'dishwasher': 'sink',  # Similar flow
                'washing_machine': 'sink',
                'water_heater': 'sink',
                'hose_bib': 'sink',
                'floor_drain': 'sink',
            }
            engine_type = type_mapping.get(fixture_type, 'sink')
            fixture_counts[engine_type] = fixture_counts.get(engine_type, 0) + 1

        # Default fixtures if none provided
        if not fixture_counts:
            fixture_counts = {'sink': 2, 'toilet': 1, 'shower': 1}

        # Run MEP engine
        logger.info(f"Running MEPSystemEngine.design_plumbing() with {len(rooms)} rooms, {len(fixtures_data)} fixtures")
        engine = MEPSystemEngine()
        design = engine.design_plumbing(rooms, fixture_counts)
        logger.info(f"Plumbing design complete: flow={design.flow_rate} L/min, cost=${design.cost}")

        # Generate pipe segments based on fixtures
        pipes = generate_pipe_segments(fixtures_data, design)

        return jsonify({
            "success": True,
            "data": {
                "pipes": pipes,
                "message": f"Generated {len(pipes)} pipe segments for {len(fixtures_data)} fixtures",
                "design": plumbing_design_to_dict(design)
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Plumbing auto-route error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "data": None,
            "error": {"code": "DESIGN_ERROR", "message": str(e)}
        }), 500


def generate_pipe_segments(fixtures_data: list, design: PlumbingDesign) -> list:
    """Generate pipe segments connecting fixtures."""
    pipes = []

    # Water heater location (assume near center)
    heater_x, heater_y = 100, 100

    for idx, fixture in enumerate(fixtures_data):
        fixture_type = fixture.get('type', 'sink')
        x = fixture.get('x', 100 + idx * 100)
        y = fixture.get('y', 100 + idx * 50)

        # Determine what connections this fixture needs
        needs_cold = fixture_type in ['sink', 'toilet', 'shower', 'bathtub', 'dishwasher', 'washing_machine', 'hose_bib']
        needs_hot = fixture_type in ['sink', 'shower', 'bathtub', 'dishwasher', 'washing_machine']
        needs_drain = fixture_type in ['sink', 'toilet', 'shower', 'bathtub', 'dishwasher', 'washing_machine', 'floor_drain']

        if needs_cold:
            pipes.append({
                "id": f"pipe-cold-{idx}",
                "startX": x - 20,
                "startY": y,
                "endX": x - 100,
                "endY": y,
                "pipeType": "cold_water",
                "size": design.pipe_sizes.get('cold', 20)
            })

        if needs_hot:
            pipes.append({
                "id": f"pipe-hot-{idx}",
                "startX": x + 20,
                "startY": y,
                "endX": heater_x,
                "endY": heater_y,
                "pipeType": "hot_water",
                "size": design.pipe_sizes.get('hot', 15)
            })

        if needs_drain:
            pipes.append({
                "id": f"pipe-drain-{idx}",
                "startX": x,
                "startY": y + 20,
                "endX": x,
                "endY": y + 100,
                "pipeType": "drain",
                "size": design.pipe_sizes.get('drain', 25)
            })

        # Add vent for fixtures that need it
        if fixture_type in ['toilet', 'sink', 'shower', 'bathtub']:
            pipes.append({
                "id": f"pipe-vent-{idx}",
                "startX": x + 10,
                "startY": y + 20,
                "endX": x + 10,
                "endY": y - 50,
                "pipeType": "vent",
                "size": 1.5  # inches
            })

    return pipes


@plumbing_bp.route('/validate', methods=['POST'])
def validate():
    """
    Validate plumbing design against code requirements.

    Request body:
        {"fixtures": [...], "pipes": [...]}

    Returns:
        Validation result with any issues found
    """
    try:
        data = request.get_json()
        fixtures = data.get('fixtures', [])
        pipes = data.get('pipes', [])

        issues = []

        # Check vent requirements for each fixture
        for fixture in fixtures:
            fixture_type = fixture.get('type', '')
            x = fixture.get('x', 0)
            y = fixture.get('y', 0)

            # Fixtures that require vents
            if fixture_type in ['toilet', 'sink', 'shower', 'bathtub']:
                has_vent = any(
                    p.get('pipeType') == 'vent' and
                    abs(p.get('startX', 0) - x) < 100 and
                    abs(p.get('startY', 0) - y) < 100
                    for p in pipes
                )
                if not has_vent:
                    issues.append(f"{fixture_type} at ({x}, {y}) requires a vent connection within 100mm")

        # Check for water heater
        has_water_heater = any(f.get('type') == 'water_heater' for f in fixtures)
        has_hot_water_pipes = any(p.get('pipeType') == 'hot_water' for p in pipes)
        if has_hot_water_pipes and not has_water_heater:
            issues.append("Hot water pipes present but no water heater found")

        # Check toilet trap distance
        toilets = [f for f in fixtures if f.get('type') == 'toilet']
        for toilet in toilets:
            # Check if there's a drain pipe nearby
            has_drain = any(
                p.get('pipeType') == 'drain' and
                abs(p.get('startX', 0) - toilet.get('x', 0)) < 50
                for p in pipes
            )
            if not has_drain:
                issues.append(f"Toilet at ({toilet.get('x')}, {toilet.get('y')}) needs drain connection")

        # Check minimum pipe sizes
        for pipe in pipes:
            pipe_type = pipe.get('pipeType', '')
            size = pipe.get('size', 0)

            min_sizes = {
                'cold_water': 15,  # mm
                'hot_water': 15,
                'drain': 20,
                'vent': 1.25  # inches
            }

            min_size = min_sizes.get(pipe_type, 15)
            if size < min_size:
                issues.append(f"Pipe {pipe.get('id', 'unknown')} size {size} below minimum {min_size} for {pipe_type}")

        return jsonify({
            "success": True,
            "data": {
                "valid": len(issues) == 0,
                "issues": issues,
                "fixture_count": len(fixtures),
                "pipe_count": len(pipes)
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Plumbing validation error: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {"code": "VALIDATION_ERROR", "message": str(e)}
        }), 500


@plumbing_bp.route('/design', methods=['POST'])
def design():
    """
    Full plumbing design using MEPSystemEngine.

    Request body:
        {"rooms": [...], "fixtures": {...}}

    Returns:
        Complete plumbing design
    """
    try:
        data = request.get_json()
        rooms_data = data.get('rooms', [])
        fixture_counts = data.get('fixtures', {'sink': 2, 'toilet': 1, 'shower': 1})

        rooms = [room_from_dict(r) for r in rooms_data]

        if not rooms:
            rooms = [Room(name="Default", area=20.0, volume=54.0, occupancy=2, has_window=True)]

        engine = MEPSystemEngine()
        design = engine.design_plumbing(rooms, fixture_counts)

        return jsonify({
            "success": True,
            "data": {
                "design": plumbing_design_to_dict(design)
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Plumbing design error: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {"code": "DESIGN_ERROR", "message": str(e)}
        }), 500
