"""
Project management endpoints for the API.
"""

import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, g

from ..middleware.auth import require_auth
from ..middleware.rate_limit import rate_limit

# Import SQLite database
try:
    from ...core.project_database import ProjectDatabase
    DB_AVAILABLE = True
except ImportError as e:
    import logging
    logging.warning(f"ProjectDatabase not available: {e}")
    DB_AVAILABLE = False
    ProjectDatabase = None

projects_bp = Blueprint('projects', __name__, url_prefix='/api/v1')

# Initialize SQLite database
_db_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'mep_projects.db')
os.makedirs(os.path.dirname(_db_path), exist_ok=True)
_db = ProjectDatabase(_db_path)


@projects_bp.route('/projects', methods=['POST'])
@rate_limit()
def create_project():
    """
    Create a new project.

    ---
    tags:
      - Projects
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProjectRequest'
    responses:
      201:
        description: Project created successfully
      400:
        description: Invalid request data
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request body is required"
                }
            }), 400

        # Validate required fields
        if 'name' not in data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "MISSING_FIELD",
                    "message": "name field is required",
                    "field": "name"
                }
            }), 400

        if 'dimensions' not in data:
            return jsonify({
                "success": False,
                "data": None,
                "error": {
                    "code": "MISSING_FIELD",
                    "message": "dimensions field is required",
                    "field": "dimensions"
                }
            }), 400

        # Create project
        project_id = f"proj_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow()

        # Get owner from auth context or use anonymous
        owner_id = getattr(g, 'current_user', None)
        if owner_id:
            owner_id = owner_id.id
        else:
            owner_id = "anonymous"

        # Use SQLite database
        project_id = _db.create_project(
            name=data['name'],
            description=data.get('description', '')
        )

        # Update with additional fields via metadata
        import json
        metadata = json.dumps({
            'dimensions': data['dimensions'],
            'spacing': data.get('spacing', {'perimeter_gap_mm': 200, 'panel_gap_mm': 50}),
            'material_id': data.get('material_id'),
            'calculation_id': None,
            'tags': data.get('tags', []),
            'owner_id': owner_id
        })
        _db.update_project(project_id, {'metadata': metadata})

        project = _db.get_project(project_id)
        # Expand metadata for response
        if project and project.get('metadata'):
            try:
                meta = json.loads(project['metadata'])
                project.update(meta)
            except:
                pass

        return jsonify({
            "success": True,
            "data": project,
            "error": None
        }), 201

    except Exception as e:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }), 500


@projects_bp.route('/projects', methods=['GET'])
@rate_limit()
def list_projects():
    """
    List all projects.

    ---
    tags:
      - Projects
    parameters:
      - name: page
        in: query
        schema:
          type: integer
          default: 1
      - name: per_page
        in: query
        schema:
          type: integer
          default: 20
      - name: search
        in: query
        schema:
          type: string
    responses:
      200:
        description: List of projects
    """
    import json
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')

    # Get projects from SQLite database
    all_projects = _db.list_projects()

    # Expand metadata for each project
    projects = []
    for p in all_projects:
        if p.get('metadata'):
            try:
                meta = json.loads(p['metadata'])
                p.update(meta)
            except:
                pass
        projects.append(p)

    if search:
        search_lower = search.lower()
        projects = [
            p for p in projects
            if search_lower in p['name'].lower() or
               (p.get('description') and search_lower in p['description'].lower())
        ]

    # Already sorted by updated_at DESC from database

    # Paginate
    total = len(projects)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = projects[start:end]

    return jsonify({
        "success": True,
        "data": paginated,
        "error": None,
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page
        }
    }), 200


@projects_bp.route('/projects/<project_id>', methods=['GET'])
@rate_limit()
def get_project(project_id: str):
    """
    Get a specific project.

    ---
    tags:
      - Projects
    parameters:
      - name: project_id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Project found
      404:
        description: Project not found
    """
    import json
    project = _db.get_project(project_id)

    if project is None:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "NOT_FOUND",
                "message": f"Project {project_id} not found"
            }
        }), 404

    # Expand metadata for response
    if project.get('metadata'):
        try:
            meta = json.loads(project['metadata'])
            project.update(meta)
        except:
            pass

    return jsonify({
        "success": True,
        "data": project,
        "error": None
    }), 200


@projects_bp.route('/projects/<project_id>', methods=['PUT'])
@rate_limit()
def update_project(project_id: str):
    """
    Update a project.

    ---
    tags:
      - Projects
    parameters:
      - name: project_id
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProjectRequest'
    responses:
      200:
        description: Project updated
      404:
        description: Project not found
    """
    import json
    project = _db.get_project(project_id)

    if project is None:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "NOT_FOUND",
                "message": f"Project {project_id} not found"
            }
        }), 404

    data = request.get_json()
    if not data:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "INVALID_REQUEST",
                "message": "Request body is required"
            }
        }), 400

    # Parse existing metadata
    existing_meta = {}
    if project.get('metadata'):
        try:
            existing_meta = json.loads(project['metadata'])
        except:
            pass

    # Build updates
    updates = {}
    if 'name' in data:
        updates['name'] = data['name']
    if 'description' in data:
        updates['description'] = data['description']

    # Update metadata fields
    if 'dimensions' in data:
        existing_meta['dimensions'] = data['dimensions']
    if 'spacing' in data:
        existing_meta['spacing'] = data['spacing']
    if 'material_id' in data:
        existing_meta['material_id'] = data['material_id']
    if 'tags' in data:
        existing_meta['tags'] = data['tags']

    updates['metadata'] = json.dumps(existing_meta)

    _db.update_project(project_id, updates)

    # Fetch updated project
    project = _db.get_project(project_id)
    if project.get('metadata'):
        try:
            meta = json.loads(project['metadata'])
            project.update(meta)
        except:
            pass

    return jsonify({
        "success": True,
        "data": project,
        "error": None
    }), 200


@projects_bp.route('/projects/<project_id>', methods=['DELETE'])
@rate_limit()
def delete_project(project_id: str):
    """
    Delete a project.

    ---
    tags:
      - Projects
    parameters:
      - name: project_id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Project deleted
      404:
        description: Project not found
    """
    project = _db.get_project(project_id)
    if project is None:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "NOT_FOUND",
                "message": f"Project {project_id} not found"
            }
        }), 404

    _db.delete_project(project_id)

    return jsonify({
        "success": True,
        "data": {"deleted": True, "id": project_id},
        "error": None
    }), 200


@projects_bp.route('/projects/<project_id>/calculate', methods=['POST'])
@rate_limit()
def calculate_project(project_id: str):
    """
    Run calculation for a project.

    ---
    tags:
      - Projects
    parameters:
      - name: project_id
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Calculation completed
      404:
        description: Project not found
    """
    import json
    project = _db.get_project(project_id)

    if project is None:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "NOT_FOUND",
                "message": f"Project {project_id} not found"
            }
        }), 404

    # Parse metadata to get dimensions
    meta = {}
    if project.get('metadata'):
        try:
            meta = json.loads(project['metadata'])
        except:
            pass

    # Import and run calculation
    try:
        from .calculations import perform_calculation

        result = perform_calculation({
            'dimensions': meta.get('dimensions', {}),
            'spacing': meta.get('spacing', {}),
            'material_id': meta.get('material_id')
        })

        # Store calculation ID in metadata
        calc_id = f"calc_{uuid.uuid4().hex[:12]}"
        meta['calculation_id'] = calc_id
        _db.update_project(project_id, {'metadata': json.dumps(meta)})

        return jsonify({
            "success": True,
            "data": {
                "project_id": project_id,
                "calculation_id": calc_id,
                "result": result
            },
            "error": None
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "CALCULATION_ERROR",
                "message": str(e)
            }
        }), 500
