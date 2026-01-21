"""
Import Routes for HVAC Design Studio.

Handles file import endpoints for various CAD formats.
"""

from flask import Blueprint, request, jsonify
import logging
from werkzeug.utils import secure_filename
import os
import tempfile

logger = logging.getLogger(__name__)

imports_bp = Blueprint('imports', __name__, url_prefix='/api/v1/imports')

# Allowed file extensions
ALLOWED_EXTENSIONS = {'dxf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@imports_bp.route('/dxf', methods=['POST'])
def import_dxf():
    """
    Import a DXF file and extract floor plan geometry.

    Request:
        - multipart/form-data with 'file' field containing DXF file
        - Optional 'units' query param: AutoCAD unit code (0-10)

    Response:
        {
            "success": true,
            "data": {
                "id": "imported_abc123",
                "name": "floor_plan",
                "rooms": [...],
                "overall_dimensions": {...},
                "import_stats": {...}
            },
            "error": null
        }
    """
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "NO_FILE",
                "message": "No file provided in request"
            }
        }), 400

    file = request.files['file']

    # Check if file has a name
    if file.filename == '':
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "NO_FILENAME",
                "message": "No file selected"
            }
        }), 400

    # Check file extension
    if not allowed_file(file.filename):
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "INVALID_FILE_TYPE",
                "message": f"File type not supported. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            }
        }), 400

    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > MAX_FILE_SIZE:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "FILE_TOO_LARGE",
                "message": f"File size exceeds maximum allowed ({MAX_FILE_SIZE // (1024*1024)}MB)"
            }
        }), 400

    # Get optional unit override
    unit_override = request.args.get('units', type=int)

    try:
        # Import the DXF parser
        from ...core.dxf_importer import import_dxf_bytes

        # Read file content
        content = file.read()
        filename = secure_filename(file.filename)

        # Parse DXF
        result = import_dxf_bytes(content, filename, unit_override)

        logger.info(f"Successfully imported DXF: {filename}, {result['import_stats']['rooms_detected']} rooms detected")

        return jsonify({
            "success": True,
            "data": result,
            "error": None
        }), 200

    except ValueError as e:
        logger.warning(f"DXF import validation error: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "INVALID_DXF",
                "message": str(e)
            }
        }), 400

    except Exception as e:
        logger.error(f"DXF import error: {e}")
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "IMPORT_ERROR",
                "message": "Failed to import DXF file"
            }
        }), 500


@imports_bp.route('/formats', methods=['GET'])
def list_formats():
    """
    List supported import formats.

    Response:
        {
            "success": true,
            "data": {
                "formats": [
                    {
                        "extension": "dxf",
                        "name": "AutoCAD DXF",
                        "description": "Drawing Exchange Format",
                        "max_size_mb": 10
                    }
                ]
            }
        }
    """
    return jsonify({
        "success": True,
        "data": {
            "formats": [
                {
                    "extension": "dxf",
                    "name": "AutoCAD DXF",
                    "description": "Drawing Exchange Format - exports from AutoCAD, SketchUp, Revit, etc.",
                    "max_size_mb": MAX_FILE_SIZE // (1024 * 1024),
                    "notes": "Export your floor plan as DXF from your CAD software. Closed polylines will be detected as rooms."
                }
            ]
        },
        "error": None
    }), 200


@imports_bp.route('/preview', methods=['POST'])
def preview_import():
    """
    Preview a DXF import without fully processing.
    Returns basic stats and detected geometry count.
    """
    if 'file' not in request.files:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "NO_FILE",
                "message": "No file provided"
            }
        }), 400

    file = request.files['file']

    if not allowed_file(file.filename):
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "INVALID_FILE_TYPE",
                "message": "Only DXF files are supported"
            }
        }), 400

    try:
        from ...core.dxf_importer import DXFImporter
        import ezdxf

        content = file.read()
        doc = ezdxf.read(content.decode('utf-8', errors='ignore'))
        msp = doc.modelspace()

        # Count entities
        polylines = len(list(msp.query('POLYLINE')))
        lwpolylines = len(list(msp.query('LWPOLYLINE')))
        texts = len(list(msp.query('TEXT'))) + len(list(msp.query('MTEXT')))

        return jsonify({
            "success": True,
            "data": {
                "filename": file.filename,
                "entities": {
                    "polylines": polylines,
                    "lwpolylines": lwpolylines,
                    "texts": texts,
                    "total_shapes": polylines + lwpolylines
                },
                "estimated_rooms": polylines + lwpolylines,
                "preview_note": "Closed polylines will be converted to rooms"
            },
            "error": None
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "data": None,
            "error": {
                "code": "PREVIEW_ERROR",
                "message": f"Failed to preview file: {str(e)}"
            }
        }), 400
