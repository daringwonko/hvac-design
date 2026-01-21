"""
Load Calculation API Routes for HVAC Design Studio.

Provides REST API endpoints for the LoadCalculation module:
- POST /api/load/calculate-all - Calculate all loads for a building
- GET /api/load/dashboard - Get dashboard summary data
- GET /api/load/warnings - Get all active warnings
- GET /api/load/thresholds - Get all threshold definitions
- POST /api/load/calculate-space - Calculate loads for a single space
- GET /api/load/compliance - Get compliance status
- POST /api/load/optimize - Run load optimization
"""

import logging
from flask import Blueprint, jsonify, request
from typing import Dict, Any, Optional

# Import Load Calculation Engine with graceful degradation
try:
    from ...design.load_calculation import (
        LoadCalculationEngine,
        BuildingSpecification,
    )
    from ...design.load_types import (
        LoadCategory,
        WarningSeverity,
        OptimizationStrategy,
        EnvironmentalContext,
        create_default_environmental_context,
    )
    from ...design.load_thresholds import (
        get_default_thresholds,
        get_thresholds_by_category,
        ThresholdChecker,
    )
    from ...design.multi_story_designer import (
        Floor,
        Space,
        SpaceType,
    )
    LOAD_MODULE_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Load calculation module not available: {e}")
    LOAD_MODULE_AVAILABLE = False
    LoadCalculationEngine = None
    BuildingSpecification = None
    Floor = None
    Space = None
    SpaceType = None

logger = logging.getLogger(__name__)

load_bp = Blueprint('load', __name__, url_prefix='/api/load')

# Module-level engine instance for state persistence (dashboard, warnings)
_engine_instance: Optional['LoadCalculationEngine'] = None
_last_result: Optional[Dict[str, Any]] = None


def _get_engine() -> 'LoadCalculationEngine':
    """Get or create the LoadCalculationEngine instance."""
    global _engine_instance
    if _engine_instance is None and LOAD_MODULE_AVAILABLE:
        _engine_instance = LoadCalculationEngine()
    return _engine_instance


def _building_spec_from_dict(data: Dict[str, Any]) -> 'BuildingSpecification':
    """
    Convert a dictionary to BuildingSpecification.

    Expected format:
    {
        "id": "building-1",
        "name": "Office Building",
        "floors": [
            {
                "level": 0,
                "name": "Ground Floor",
                "floor_to_floor_height_m": 4.0,
                "gross_area_sqm": 500.0,
                "net_area_sqm": 450.0,
                "spaces": [
                    {
                        "id": "space-1",
                        "name": "Main Office",
                        "space_type": "office",
                        "area_sqm": 200.0,
                        "occupancy": 20,
                        "ceiling_height_m": 3.0
                    }
                ]
            }
        ],
        "hvac_system_type": "vrf",
        "site_area_sqm": 1000.0,
        "footprint_sqm": 500.0
    }
    """
    floors = []

    for floor_data in data.get('floors', []):
        spaces = []
        for space_data in floor_data.get('spaces', []):
            # Map space_type string to SpaceType enum
            space_type_str = space_data.get('space_type', 'office').upper()
            try:
                space_type = SpaceType[space_type_str]
            except KeyError:
                space_type = SpaceType.OFFICE

            space = Space(
                id=space_data.get('id', f"space-{len(spaces)+1}"),
                name=space_data.get('name', f"Space {len(spaces)+1}"),
                space_type=space_type,
                area_sqm=float(space_data.get('area_sqm', 100.0)),
                occupancy=int(space_data.get('occupancy', 10)),
                ceiling_height_m=float(space_data.get('ceiling_height_m', 3.0)),
                requires_hvac=space_data.get('requires_hvac', True),
                requires_sprinkler=space_data.get('requires_sprinkler', True),
            )
            spaces.append(space)

        floor = Floor(
            level=int(floor_data.get('level', len(floors))),
            name=floor_data.get('name', f"Floor {floor_data.get('level', len(floors))}"),
            floor_to_floor_height_m=float(floor_data.get('floor_to_floor_height_m', 4.0)),
            gross_area_sqm=float(floor_data.get('gross_area_sqm', 500.0)),
            net_area_sqm=float(floor_data.get('net_area_sqm', 450.0)),
            spaces=spaces,
        )
        floors.append(floor)

    return BuildingSpecification(
        id=data.get('id', 'building-1'),
        name=data.get('name', 'Unnamed Building'),
        floors=floors,
        site_area_sqm=float(data.get('site_area_sqm', 0.0)),
        footprint_sqm=float(data.get('footprint_sqm', 0.0)),
        hvac_system_type=data.get('hvac_system_type', 'vrf'),
        slab_thickness_mm=float(data.get('slab_thickness_mm', 150.0)),
        wall_u_value=float(data.get('wall_u_value', 0.5)),
        roof_u_value=float(data.get('roof_u_value', 0.3)),
        window_u_value=float(data.get('window_u_value', 2.5)),
        window_shgc=float(data.get('window_shgc', 0.4)),
        window_wall_ratio=float(data.get('window_wall_ratio', 0.4)),
    )


def _environmental_context_from_dict(data: Dict[str, Any]) -> 'EnvironmentalContext':
    """Convert dictionary to EnvironmentalContext."""
    if not data:
        return create_default_environmental_context()

    return EnvironmentalContext(
        climate_zone=data.get('climate_zone', '4A'),
        design_cooling_temp_c=float(data.get('design_cooling_temp_c', 33.0)),
        design_heating_temp_c=float(data.get('design_heating_temp_c', -8.0)),
        indoor_temp_cooling_c=float(data.get('indoor_temp_cooling_c', 24.0)),
        indoor_temp_heating_c=float(data.get('indoor_temp_heating_c', 21.0)),
        wind_zone=data.get('wind_zone', 'B'),
        seismic_zone=data.get('seismic_zone', 'B'),
        ground_snow_load_kpa=float(data.get('ground_snow_load_kpa', 0.0)),
        elevation_m=float(data.get('elevation_m', 0.0)),
        latitude=float(data.get('latitude', 40.0)),
        humidity_design_percent=float(data.get('humidity_design_percent', 50.0)),
    )


def _space_from_dict(data: Dict[str, Any]) -> 'Space':
    """Convert dictionary to Space."""
    space_type_str = data.get('space_type', 'office').upper()
    try:
        space_type = SpaceType[space_type_str]
    except KeyError:
        space_type = SpaceType.OFFICE

    return Space(
        id=data.get('id', 'space-1'),
        name=data.get('name', 'Unnamed Space'),
        space_type=space_type,
        area_sqm=float(data.get('area_sqm', 100.0)),
        occupancy=int(data.get('occupancy', 10)),
        ceiling_height_m=float(data.get('ceiling_height_m', 3.0)),
        requires_hvac=data.get('requires_hvac', True),
        requires_sprinkler=data.get('requires_sprinkler', True),
    )


# =============================================================================
# API ENDPOINTS
# =============================================================================

@load_bp.route('/calculate-all', methods=['POST'])
def calculate_all_loads():
    """
    Calculate all loads for a building specification.

    Request body:
        {
            "building_spec": {...},
            "environmental_context": {...}
        }

    Returns:
        LoadResult as JSON with complete load analysis
    """
    if not LOAD_MODULE_AVAILABLE:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "MODULE_UNAVAILABLE",
                "message": "Load calculation module is not available"
            }
        }), 503

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request body required"
                }
            }), 400

        building_spec_data = data.get('building_spec')
        if not building_spec_data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "MISSING_BUILDING_SPEC",
                    "message": "building_spec is required in request body"
                }
            }), 400

        # Parse inputs
        building_spec = _building_spec_from_dict(building_spec_data)
        env_context = _environmental_context_from_dict(
            data.get('environmental_context', {})
        )

        # Calculate loads
        engine = _get_engine()
        result = engine.calculate_all_loads(building_spec, env_context)

        # Store result for dashboard/warnings endpoints
        global _last_result
        _last_result = result.to_dict()

        logger.info(
            f"Load calculation complete for {building_spec.id}: "
            f"cooling={result.total_cooling_kw:.1f}kW, "
            f"electrical={result.total_electrical_kw:.1f}kW, "
            f"warnings={len(result.warnings)}"
        )

        return jsonify({
            "success": True,
            "data": result.to_dict(),
            "error": None
        }), 200

    except ValueError as e:
        logger.warning(f"Validation error in calculate-all: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }
        }), 400

    except Exception as e:
        logger.error(f"Load calculation error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "CALCULATION_ERROR",
                "message": str(e)
            }
        }), 500


@load_bp.route('/dashboard', methods=['GET'])
def get_dashboard():
    """
    Get dashboard summary data from the most recent calculation.

    Returns:
        Summary metrics, active warnings count, and recommendations
    """
    if not LOAD_MODULE_AVAILABLE:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "MODULE_UNAVAILABLE",
                "message": "Load calculation module is not available"
            }
        }), 503

    try:
        global _last_result

        if _last_result is None:
            return jsonify({
                "success": True,
                "data": {
                    "has_data": False,
                    "message": "No calculations performed yet. Run /calculate-all first."
                },
                "error": None
            }), 200

        # Extract summary data from last result
        summary = _last_result.get('summary', {})
        warnings = _last_result.get('warnings', [])
        recommendations = _last_result.get('recommendations', [])

        dashboard_data = {
            "has_data": True,
            "building_id": _last_result.get('building_id'),
            "calculated_at": _last_result.get('calculated_at'),
            "summary_metrics": {
                "total_cooling_kw": summary.get('total_cooling_kw', 0),
                "total_heating_kw": summary.get('total_heating_kw', 0),
                "total_electrical_kw": summary.get('total_electrical_kw', 0),
                "electrical_demand_kw": summary.get('electrical_demand_kw', 0),
                "total_structural_kn": summary.get('total_structural_kn', 0),
                "total_plumbing_l_min": summary.get('total_plumbing_l_min', 0),
            },
            "warning_summary": _last_result.get('warning_summary', {}),
            "active_warnings_count": len(warnings),
            "critical_warnings_count": sum(
                1 for w in warnings if w.get('severity') == 'critical'
            ),
            "compliance_status": _last_result.get('compliance_status', 'unknown'),
            "confidence_score": _last_result.get('confidence_score', 0),
            "recommendations_count": len(recommendations),
            "top_recommendations": recommendations[:3] if recommendations else [],
            "floor_count": len(_last_result.get('floor_breakdowns', [])),
            "space_count": len(_last_result.get('space_breakdowns', [])),
            "cost_total": (
                _last_result.get('cost_breakdown', {}).get('total', 0)
                if _last_result.get('cost_breakdown') else 0
            )
        }

        return jsonify({
            "success": True,
            "data": dashboard_data,
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Dashboard error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "DASHBOARD_ERROR",
                "message": str(e)
            }
        }), 500


@load_bp.route('/warnings', methods=['GET'])
def get_warnings():
    """
    Get all active warnings from the most recent calculation.

    Query Parameters:
        severity: Filter by severity (critical, warning, info)
        category: Filter by category (structural, hvac, electrical, plumbing)

    Returns:
        List of LoadWarning objects
    """
    if not LOAD_MODULE_AVAILABLE:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "MODULE_UNAVAILABLE",
                "message": "Load calculation module is not available"
            }
        }), 503

    try:
        global _last_result

        if _last_result is None:
            return jsonify({
                "success": True,
                "data": {
                    "warnings": [],
                    "total_count": 0,
                    "message": "No calculations performed yet"
                },
                "error": None
            }), 200

        warnings = _last_result.get('warnings', [])

        # Apply filters
        severity_filter = request.args.get('severity')
        category_filter = request.args.get('category')

        if severity_filter:
            warnings = [
                w for w in warnings
                if w.get('severity', '').lower() == severity_filter.lower()
            ]

        if category_filter:
            warnings = [
                w for w in warnings
                if w.get('category', '').lower() == category_filter.lower()
            ]

        return jsonify({
            "success": True,
            "data": {
                "warnings": warnings,
                "total_count": len(warnings),
                "filters_applied": {
                    "severity": severity_filter,
                    "category": category_filter
                }
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Warnings retrieval error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "WARNINGS_ERROR",
                "message": str(e)
            }
        }), 500


@load_bp.route('/thresholds', methods=['GET'])
def get_thresholds():
    """
    Get all threshold definitions grouped by category.

    Query Parameters:
        category: Filter by category (structural, electrical, hvac, plumbing)

    Returns:
        List of LoadThreshold objects grouped by category
    """
    if not LOAD_MODULE_AVAILABLE:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "MODULE_UNAVAILABLE",
                "message": "Load calculation module is not available"
            }
        }), 503

    try:
        category_filter = request.args.get('category')

        if category_filter:
            # Get thresholds for specific category
            thresholds = get_thresholds_by_category(category_filter)
            thresholds_data = {
                category_filter: {
                    key: threshold.to_dict()
                    for key, threshold in thresholds.items()
                }
            }
        else:
            # Get all thresholds grouped by category
            thresholds_data = {
                "structural": {
                    key: threshold.to_dict()
                    for key, threshold in get_thresholds_by_category("structural").items()
                },
                "electrical": {
                    key: threshold.to_dict()
                    for key, threshold in get_thresholds_by_category("electrical").items()
                },
                "hvac": {
                    key: threshold.to_dict()
                    for key, threshold in get_thresholds_by_category("hvac").items()
                },
                "plumbing": {
                    key: threshold.to_dict()
                    for key, threshold in get_thresholds_by_category("plumbing").items()
                }
            }

        return jsonify({
            "success": True,
            "data": {
                "thresholds": thresholds_data,
                "category_filter": category_filter
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Thresholds retrieval error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "THRESHOLDS_ERROR",
                "message": str(e)
            }
        }), 500


@load_bp.route('/calculate-space', methods=['POST'])
def calculate_space_loads():
    """
    Calculate loads for a single space.

    Request body:
        {
            "space": {
                "id": "space-1",
                "name": "Conference Room",
                "space_type": "office",
                "area_sqm": 50.0,
                "occupancy": 15,
                "ceiling_height_m": 3.0
            },
            "floor_level": 1,
            "environmental_context": {...}
        }

    Returns:
        SpaceLoadBreakdown as JSON
    """
    if not LOAD_MODULE_AVAILABLE:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "MODULE_UNAVAILABLE",
                "message": "Load calculation module is not available"
            }
        }), 503

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request body required"
                }
            }), 400

        space_data = data.get('space')
        if not space_data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "MISSING_SPACE",
                    "message": "space object is required in request body"
                }
            }), 400

        # Parse inputs
        space = _space_from_dict(space_data)
        floor_level = int(data.get('floor_level', 0))
        env_context = _environmental_context_from_dict(
            data.get('environmental_context', {})
        )

        # Calculate space loads
        engine = _get_engine()
        result = engine.calculate_space_loads(space, floor_level, env_context)

        logger.info(
            f"Space load calculation complete for {space.name}: "
            f"cooling={result.cooling_kw:.2f}kW, "
            f"electrical={result.total_electrical_kw:.2f}kW"
        )

        return jsonify({
            "success": True,
            "data": result.to_dict(),
            "error": None
        }), 200

    except ValueError as e:
        logger.warning(f"Validation error in calculate-space: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }
        }), 400

    except Exception as e:
        logger.error(f"Space calculation error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "CALCULATION_ERROR",
                "message": str(e)
            }
        }), 500


@load_bp.route('/compliance', methods=['GET'])
def get_compliance():
    """
    Get compliance status from the most recent calculation.

    Returns:
        Compliance status, violations, and code references
    """
    if not LOAD_MODULE_AVAILABLE:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "MODULE_UNAVAILABLE",
                "message": "Load calculation module is not available"
            }
        }), 503

    try:
        global _last_result

        if _last_result is None:
            return jsonify({
                "success": True,
                "data": {
                    "status": "unknown",
                    "message": "No calculations performed yet. Run /calculate-all first.",
                    "violations": [],
                    "code_references": []
                },
                "error": None
            }), 200

        # Extract compliance data
        compliance_status = _last_result.get('compliance_status', 'unknown')
        warnings = _last_result.get('warnings', [])

        # Get critical and warning level violations
        violations = [
            {
                "severity": w.get('severity'),
                "category": w.get('category'),
                "message": w.get('message'),
                "component": w.get('affected_component'),
                "code_reference": w.get('code_reference'),
                "recommended_action": w.get('recommended_action')
            }
            for w in warnings
            if w.get('severity') in ['critical', 'warning']
        ]

        # Extract unique code references
        code_references = list(set(
            w.get('code_reference', '')
            for w in warnings
            if w.get('code_reference')
        ))

        compliance_data = {
            "status": compliance_status,
            "is_compliant": compliance_status == 'compliant',
            "violations": violations,
            "violation_count": len(violations),
            "code_references": sorted(code_references),
            "critical_count": sum(
                1 for v in violations if v.get('severity') == 'critical'
            ),
            "warning_count": sum(
                1 for v in violations if v.get('severity') == 'warning'
            ),
            "building_id": _last_result.get('building_id'),
            "calculated_at": _last_result.get('calculated_at')
        }

        return jsonify({
            "success": True,
            "data": compliance_data,
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Compliance retrieval error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "COMPLIANCE_ERROR",
                "message": str(e)
            }
        }), 500


@load_bp.route('/optimize', methods=['POST'])
def run_optimization():
    """
    Run load optimization with specified strategy.

    Request body:
        {
            "strategy": "MINIMIZE_ENERGY" | "MINIMIZE_COST" | "BALANCE_LOADS" |
                       "MAXIMIZE_EFFICIENCY" | "MINIMIZE_PEAK_DEMAND",
            "building_spec": {...},
            "environmental_context": {...}
        }

    If building_spec is not provided, uses the last calculated building.

    Returns:
        LoadOptimizationResult as JSON
    """
    if not LOAD_MODULE_AVAILABLE:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "MODULE_UNAVAILABLE",
                "message": "Load calculation module is not available"
            }
        }), 503

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request body required"
                }
            }), 400

        # Parse strategy
        strategy_str = data.get('strategy', 'BALANCE_LOADS').upper()
        valid_strategies = [s.name for s in OptimizationStrategy]

        if strategy_str not in valid_strategies:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "INVALID_STRATEGY",
                    "message": f"Invalid strategy '{strategy_str}'. "
                              f"Valid options: {', '.join(valid_strategies)}"
                }
            }), 400

        # Check if we have building spec or should use last calculation
        building_spec_data = data.get('building_spec')

        global _last_result

        if building_spec_data:
            # New building spec provided
            building_spec = _building_spec_from_dict(building_spec_data)
            env_context = _environmental_context_from_dict(
                data.get('environmental_context', {})
            )

            # Run full calculation with optimization
            engine = _get_engine()
            result = engine.calculate_all_loads(
                building_spec,
                env_context,
                optimize=True
            )

            # Store result
            _last_result = result.to_dict()

            optimization_result = result.optimization_result
        else:
            # Use last result if available
            if _last_result is None:
                return jsonify({
                    "success": False,
                    "data": None,
                    "error": {
                        "code": "NO_PREVIOUS_CALCULATION",
                        "message": "No previous calculation found. "
                                  "Provide building_spec or run /calculate-all first."
                    }
                }), 400

            # Return cached optimization result if available
            optimization_data = _last_result.get('optimization_result')

            if optimization_data:
                return jsonify({
                    "success": True,
                    "data": {
                        "optimization_result": optimization_data,
                        "strategy_requested": strategy_str,
                        "note": "Using cached optimization result from last calculation"
                    },
                    "error": None
                }), 200
            else:
                return jsonify({
                    "success": False,
                    "data": None,
                    "error": {
                        "code": "NO_OPTIMIZATION_RESULT",
                        "message": "No optimization result available. "
                                  "Provide building_spec to run new optimization."
                    }
                }), 400

        if optimization_result:
            optimization_data = optimization_result.to_dict()
        else:
            optimization_data = {
                "strategy": strategy_str,
                "message": "Optimization completed but no result generated",
                "original_imbalance": 0.0,
                "optimized_imbalance": 0.0,
                "improvement_percent": 0.0
            }

        logger.info(
            f"Optimization complete with strategy {strategy_str}: "
            f"improvement={optimization_data.get('improvement_percent', 0):.1f}%"
        )

        return jsonify({
            "success": True,
            "data": {
                "optimization_result": optimization_data,
                "strategy_used": strategy_str,
                "building_id": _last_result.get('building_id') if _last_result else None
            },
            "error": None
        }), 200

    except ValueError as e:
        logger.warning(f"Validation error in optimize: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }
        }), 400

    except Exception as e:
        logger.error(f"Optimization error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "OPTIMIZATION_ERROR",
                "message": str(e)
            }
        }), 500


# =============================================================================
# HEALTH CHECK ENDPOINT
# =============================================================================

@load_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for the load calculation API.

    Returns:
        Status of the load calculation module
    """
    return jsonify({
        "success": True,
        "data": {
            "module_available": LOAD_MODULE_AVAILABLE,
            "has_cached_result": _last_result is not None,
            "endpoints": [
                "POST /api/load/calculate-all",
                "GET /api/load/dashboard",
                "GET /api/load/warnings",
                "GET /api/load/thresholds",
                "POST /api/load/calculate-space",
                "GET /api/load/compliance",
                "POST /api/load/optimize",
                "GET /api/load/health"
            ]
        },
        "error": None
    }), 200
