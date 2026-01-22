"""
Floor Plan API Routes for MEP Design Studio.

Provides endpoints for loading, saving, and managing floor plans
used by HVAC, Electrical, and Plumbing routers.

Uses SQLite persistence via ProjectDatabase.
"""

import os
import json
import uuid
import logging
from datetime import datetime
from flask import Blueprint, jsonify, request
from ..core_wrapper import get_project_database

logger = logging.getLogger(__name__)

floor_plan_bp = Blueprint('floor_plan', __name__, url_prefix='/api')

# Get database instance (lazy initialization)
def get_db():
    """Get the project database instance"""
    return get_project_database()

# Path to default floor plan data
DEFAULT_FLOOR_PLAN_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    'data', 'goldilocks_3b3b_floorplan.json'
)


def load_default_floor_plan():
    """Load the default Goldilocks 3B-3B floor plan from JSON file."""
    try:
        if os.path.exists(DEFAULT_FLOOR_PLAN_PATH):
            with open(DEFAULT_FLOOR_PLAN_PATH, 'r') as f:
                data = json.load(f)
                logger.info(f"Loaded default floor plan from {DEFAULT_FLOOR_PLAN_PATH}")
                return data
        else:
            logger.warning(f"Default floor plan not found at {DEFAULT_FLOOR_PLAN_PATH}")
            return None
    except Exception as e:
        logger.error(f"Error loading default floor plan: {e}")
        return None


@floor_plan_bp.route('/floor-plan', methods=['GET'])
def get_floor_plan():
    """
    Get the current floor plan.

    Returns the default Goldilocks 3B-3B floor plan if no custom plan is set.

    Returns:
        JSON response with floor plan data including rooms, walls, fixtures
    """
    try:
        # Check if there's a custom floor plan set
        active_plan_id = request.args.get('id')

        if active_plan_id:
            db = get_db()
            plan = db.get_floor_plan(active_plan_id)
            if plan:
                return jsonify({
                    "success": True,
                    "data": plan,
                    "error": None
                }), 200

        # Load default floor plan
        default_plan = load_default_floor_plan()

        if default_plan:
            return jsonify({
                "success": True,
                "data": default_plan,
                "error": None
            }), 200

        # Return empty floor plan structure if nothing found
        return jsonify({
            "success": True,
            "data": {
                "name": "New Floor Plan",
                "dimensions": {"width": 17850, "height": 7496},
                "rooms": [],
                "walls": [],
                "fixtures": [],
                "doors": [],
                "windows": []
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Error getting floor plan: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "FLOOR_PLAN_ERROR",
                "message": str(e)
            }
        }), 500


@floor_plan_bp.route('/floor-plan', methods=['POST'])
def create_floor_plan():
    """
    Create a new floor plan.

    Request body should contain the floor plan data with rooms, walls, fixtures, etc.

    Returns:
        JSON response with the created floor plan ID and timestamp
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request body must contain floor plan data"
                }
            }), 400

        # Add metadata
        now = datetime.utcnow().isoformat()
        floor_plan = {
            "created_at": now,
            "updated_at": now,
            **data
        }

        # Save to database (returns the ID)
        db = get_db()
        plan_id = db.save_floor_plan(floor_plan)
        floor_plan["id"] = plan_id

        logger.info(f"Created floor plan {plan_id}")

        return jsonify({
            "success": True,
            "data": {
                "id": plan_id,
                "created_at": floor_plan["created_at"]
            },
            "error": None
        }), 201

    except Exception as e:
        logger.error(f"Error creating floor plan: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "CREATE_ERROR",
                "message": str(e)
            }
        }), 500


@floor_plan_bp.route('/floor-plan/<plan_id>', methods=['GET'])
def get_floor_plan_by_id(plan_id):
    """
    Get a specific floor plan by ID.

    Args:
        plan_id: The unique identifier of the floor plan

    Returns:
        JSON response with the full floor plan data
    """
    try:
        db = get_db()
        plan = db.get_floor_plan(plan_id)

        if not plan:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Floor plan {plan_id} not found"
                }
            }), 404

        return jsonify({
            "success": True,
            "data": plan,
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Error getting floor plan {plan_id}: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "RETRIEVAL_ERROR",
                "message": str(e)
            }
        }), 500


@floor_plan_bp.route('/floor-plan/<plan_id>', methods=['PUT'])
def update_floor_plan(plan_id):
    """
    Update an existing floor plan.

    Args:
        plan_id: The unique identifier of the floor plan to update

    Returns:
        JSON response with the updated floor plan ID and timestamp
    """
    try:
        db = get_db()
        existing_plan = db.get_floor_plan(plan_id)

        if not existing_plan:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Floor plan {plan_id} not found"
                }
            }), 404

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request body must contain floor plan data"
                }
            }), 400

        # Update the floor plan
        now = datetime.utcnow().isoformat()
        updated_plan = {
            **existing_plan,
            **data,
            "id": plan_id,  # Preserve original ID
            "created_at": existing_plan.get("created_at", now),  # Preserve creation time
            "updated_at": now
        }

        # Save to database
        db.save_floor_plan(updated_plan)

        logger.info(f"Updated floor plan {plan_id}")

        return jsonify({
            "success": True,
            "data": {
                "id": plan_id,
                "updated_at": updated_plan["updated_at"]
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Error updating floor plan {plan_id}: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "UPDATE_ERROR",
                "message": str(e)
            }
        }), 500


@floor_plan_bp.route('/floor-plan/<plan_id>', methods=['DELETE'])
def delete_floor_plan(plan_id):
    """
    Delete a floor plan.

    Args:
        plan_id: The unique identifier of the floor plan to delete

    Returns:
        JSON response confirming deletion
    """
    try:
        db = get_db()
        deleted = db.delete_floor_plan(plan_id)

        if not deleted:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Floor plan {plan_id} not found"
                }
            }), 404

        logger.info(f"Deleted floor plan {plan_id}")

        return jsonify({
            "success": True,
            "data": {"deleted": plan_id},
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Error deleting floor plan {plan_id}: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "DELETE_ERROR",
                "message": str(e)
            }
        }), 500


@floor_plan_bp.route('/floor-plans', methods=['GET'])
def list_floor_plans():
    """
    List all saved floor plans.

    Returns:
        JSON response with list of floor plan summaries
    """
    try:
        db = get_db()
        plans = db.list_floor_plans()

        return jsonify({
            "success": True,
            "data": {
                "floor_plans": plans,
                "total": len(plans)
            },
            "error": None
        }), 200

    except Exception as e:
        logger.error(f"Error listing floor plans: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "LIST_ERROR",
                "message": str(e)
            }
        }), 500
