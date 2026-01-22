"""
Health check endpoints for the API.
API-003: Fixed hardcoded status - now performs actual connectivity checks
"""

import time
import sqlite3
from datetime import datetime
from pathlib import Path
from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__, url_prefix='/api/v1')

# Server start time for uptime calculation
_start_time = time.time()

# Default database path
_db_path = Path(__file__).parent.parent.parent.parent / "mep_projects.db"


def _check_database_status():
    """Actually check database connectivity - API-003 fix"""
    try:
        conn = sqlite3.connect(str(_db_path), timeout=2.0)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
        return "connected", True
    except sqlite3.Error as e:
        return f"error: {str(e)}", False
    except Exception as e:
        return f"unavailable: {str(e)}", False


@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint.

    ---
    tags:
      - System
    responses:
      200:
        description: System is healthy
      503:
        description: System is degraded
    """
    uptime = time.time() - _start_time

    # API-003: Actually check database connectivity
    db_status, db_healthy = _check_database_status()

    # API-004: Check WebSocket status
    try:
        from ..websocket import get_websocket_status
        ws_status = get_websocket_status()
    except ImportError:
        ws_status = {'available': False, 'initialized': False}

    overall_status = "healthy" if db_healthy else "degraded"
    http_status = 200 if db_healthy else 503

    return jsonify({
        "success": db_healthy,
        "data": {
            "status": overall_status,
            "version": "2.0.0",
            "uptime_seconds": round(uptime, 2),
            "database": db_status,
            "database_path": str(_db_path) if _db_path.exists() else "not_found",
            "websocket": ws_status,  # API-004: Include WebSocket status
            "cache": "in_memory",  # Using in-memory caching for now
            "timestamp": datetime.utcnow().isoformat()
        },
        "error": None if db_healthy else {
            "code": "DATABASE_UNAVAILABLE",
            "message": "Database connection failed"
        }
    }), http_status


@health_bp.route('/health/ready', methods=['GET'])
def readiness_check():
    """
    Readiness probe for Kubernetes.
    API-003: Fixed to actually check all required services.

    ---
    tags:
      - System
    responses:
      200:
        description: Service is ready
      503:
        description: Service is not ready
    """
    # Check if core services are available
    services = {}

    # Check calculator
    try:
        from ...core.ceiling_panel_calc import CeilingPanelCalculator
        services["calculator"] = "ready"
    except ImportError:
        services["calculator"] = "unavailable"

    # Check database
    db_status, db_healthy = _check_database_status()
    services["database"] = "ready" if db_healthy else db_status

    # Check MEP engine
    try:
        from ...design.mep_system import MEPSystemEngine
        services["mep_engine"] = "ready"
    except ImportError:
        services["mep_engine"] = "unavailable"

    all_ready = all(s == "ready" for s in services.values())

    if all_ready:
        return jsonify({
            "success": True,
            "data": {
                "status": "ready",
                "services": services
            },
            "error": None
        }), 200
    else:
        return jsonify({
            "success": False,
            "data": {
                "status": "not_ready",
                "services": services
            },
            "error": {
                "code": "NOT_READY",
                "message": "One or more required services not available"
            }
        }), 503


@health_bp.route('/health/live', methods=['GET'])
def liveness_check():
    """
    Liveness probe for Kubernetes.

    ---
    tags:
      - System
    responses:
      200:
        description: Service is alive
    """
    return jsonify({
        "success": True,
        "data": {
            "status": "alive",
            "timestamp": datetime.utcnow().isoformat()
        },
        "error": None
    }), 200


@health_bp.route('/version', methods=['GET'])
def version():
    """
    Get API version information.

    ---
    tags:
      - System
    responses:
      200:
        description: Version information
    """
    return jsonify({
        "success": True,
        "data": {
            "api_version": "v1",
            "app_version": "2.0.0",
            "python_version": "3.8+",
            "build_date": "2026-01-11"
        },
        "error": None
    }), 200
