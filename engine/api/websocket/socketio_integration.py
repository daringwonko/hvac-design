"""
Flask-SocketIO integration for real-time WebSocket communication.
API-004: Integrates WebSocket handlers with Flask-SocketIO for offline-first support.

Usage:
    from api.websocket.socketio_integration import init_socketio, socketio

    # In create_app():
    socketio = init_socketio(app)

    # Run with:
    socketio.run(app, host='0.0.0.0', port=5000)
"""

import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any

try:
    from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
    SOCKETIO_AVAILABLE = True
except ImportError:
    SOCKETIO_AVAILABLE = False
    SocketIO = None

from .handlers import WebSocketHandler, CalculationProgressTracker
from .events import Event, EventType
from .rooms import RoomManager, StandardRooms

logger = logging.getLogger(__name__)

# Global instances
socketio: Optional[SocketIO] = None
ws_handler: Optional[WebSocketHandler] = None
progress_tracker: Optional[CalculationProgressTracker] = None


def init_socketio(app, **kwargs) -> Optional[SocketIO]:
    """
    Initialize Flask-SocketIO with the Flask app.

    API-004: WebSocket integration for offline-first architecture.

    Args:
        app: Flask application instance
        **kwargs: Additional SocketIO configuration

    Returns:
        SocketIO instance or None if flask-socketio not installed
    """
    global socketio, ws_handler, progress_tracker

    if not SOCKETIO_AVAILABLE:
        logger.warning(
            "flask-socketio not installed. WebSocket support disabled. "
            "Install with: pip install flask-socketio"
        )
        return None

    # Default SocketIO configuration for offline-first
    default_config = {
        'cors_allowed_origins': '*',
        'async_mode': 'threading',  # Works without eventlet/gevent
        'ping_timeout': 60,
        'ping_interval': 25,
        'logger': True,
        'engineio_logger': False,
    }
    default_config.update(kwargs)

    socketio = SocketIO(app, **default_config)
    ws_handler = WebSocketHandler()
    progress_tracker = CalculationProgressTracker(ws_handler)

    # Register SocketIO event handlers
    _register_handlers(socketio)

    logger.info("WebSocket (Flask-SocketIO) initialized - offline-first ready")
    return socketio


def _register_handlers(sio: SocketIO):
    """Register all SocketIO event handlers."""

    @sio.on('connect')
    def handle_connect():
        """Handle client connection."""
        from flask import request
        connection_id = f"ws_{request.sid[:12]}"
        logger.info(f"WebSocket connected: {connection_id}")

        # Send welcome message
        emit('connected', {
            'connection_id': connection_id,
            'timestamp': datetime.utcnow().isoformat(),
            'message': 'Connected to MEP Design WebSocket'
        })

    @sio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        from flask import request
        logger.info(f"WebSocket disconnected: {request.sid}")

    @sio.on('ping')
    def handle_ping(data):
        """Handle ping/pong for connection health."""
        emit('pong', {
            'timestamp': datetime.utcnow().isoformat(),
            'echo': data.get('timestamp') if data else None
        })

    @sio.on('subscribe')
    def handle_subscribe(data):
        """Subscribe to a room for real-time updates."""
        room_name = data.get('room')
        if room_name:
            join_room(room_name)
            emit('subscribed', {
                'room': room_name,
                'success': True,
                'timestamp': datetime.utcnow().isoformat()
            })
            logger.debug(f"Client subscribed to room: {room_name}")
        else:
            emit('error', {'message': 'Room name required'})

    @sio.on('unsubscribe')
    def handle_unsubscribe(data):
        """Unsubscribe from a room."""
        room_name = data.get('room')
        if room_name:
            leave_room(room_name)
            emit('unsubscribed', {'room': room_name})

    @sio.on('subscribe_project')
    def handle_subscribe_project(data):
        """Subscribe to project updates."""
        project_id = data.get('project_id')
        if project_id:
            room_name = StandardRooms.project(project_id)
            join_room(room_name)
            emit('subscribed', {
                'room': room_name,
                'project_id': project_id,
                'success': True
            })

    @sio.on('subscribe_calculation')
    def handle_subscribe_calculation(data):
        """Subscribe to calculation progress updates."""
        calculation_id = data.get('calculation_id')
        if calculation_id:
            room_name = StandardRooms.calculation(calculation_id)
            join_room(room_name)
            emit('subscribed', {
                'room': room_name,
                'calculation_id': calculation_id,
                'success': True
            })

    @sio.on('floor_plan_update')
    def handle_floor_plan_update(data):
        """Handle floor plan updates for real-time sync."""
        project_id = data.get('project_id')
        update_type = data.get('type')  # 'room_added', 'room_moved', 'room_deleted', etc.
        update_data = data.get('data', {})

        if project_id:
            room_name = StandardRooms.project(project_id)
            # Broadcast to all clients subscribed to this project
            emit('floor_plan_changed', {
                'project_id': project_id,
                'type': update_type,
                'data': update_data,
                'timestamp': datetime.utcnow().isoformat()
            }, room=room_name, include_self=False)

    @sio.on('hvac_update')
    def handle_hvac_update(data):
        """Handle HVAC design updates."""
        project_id = data.get('project_id')
        if project_id:
            room_name = StandardRooms.project(project_id)
            emit('hvac_changed', {
                'project_id': project_id,
                'data': data.get('data', {}),
                'timestamp': datetime.utcnow().isoformat()
            }, room=room_name, include_self=False)

    @sio.on('electrical_update')
    def handle_electrical_update(data):
        """Handle electrical design updates."""
        project_id = data.get('project_id')
        if project_id:
            room_name = StandardRooms.project(project_id)
            emit('electrical_changed', {
                'project_id': project_id,
                'data': data.get('data', {}),
                'timestamp': datetime.utcnow().isoformat()
            }, room=room_name, include_self=False)

    @sio.on('plumbing_update')
    def handle_plumbing_update(data):
        """Handle plumbing design updates."""
        project_id = data.get('project_id')
        if project_id:
            room_name = StandardRooms.project(project_id)
            emit('plumbing_changed', {
                'project_id': project_id,
                'data': data.get('data', {}),
                'timestamp': datetime.utcnow().isoformat()
            }, room=room_name, include_self=False)

    @sio.on('sync_request')
    def handle_sync_request(data):
        """Handle offline sync request - client came back online."""
        last_sync = data.get('last_sync')
        project_id = data.get('project_id')

        emit('sync_ack', {
            'status': 'received',
            'project_id': project_id,
            'timestamp': datetime.utcnow().isoformat()
        })

        # Note: Actual sync logic would query database for changes since last_sync
        # This is a placeholder for the sync protocol
        logger.info(f"Sync request for project {project_id} since {last_sync}")


# Helper functions for broadcasting from backend code

def broadcast_calculation_started(calculation_id: str, project_id: str = None):
    """Broadcast that a calculation has started."""
    if socketio:
        data = {
            'calculation_id': calculation_id,
            'project_id': project_id,
            'status': 'started',
            'timestamp': datetime.utcnow().isoformat()
        }
        if project_id:
            socketio.emit('calculation_started', data, room=StandardRooms.project(project_id))
        socketio.emit('calculation_started', data, room=StandardRooms.calculation(calculation_id))


def broadcast_calculation_progress(calculation_id: str, progress: int, message: str = None):
    """Broadcast calculation progress update."""
    if socketio:
        socketio.emit('calculation_progress', {
            'calculation_id': calculation_id,
            'progress': progress,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }, room=StandardRooms.calculation(calculation_id))


def broadcast_calculation_completed(calculation_id: str, result: Dict[str, Any], project_id: str = None):
    """Broadcast that a calculation completed."""
    if socketio:
        data = {
            'calculation_id': calculation_id,
            'project_id': project_id,
            'status': 'completed',
            'result': result,
            'timestamp': datetime.utcnow().isoformat()
        }
        if project_id:
            socketio.emit('calculation_completed', data, room=StandardRooms.project(project_id))
        socketio.emit('calculation_completed', data, room=StandardRooms.calculation(calculation_id))


def broadcast_calculation_failed(calculation_id: str, error: str, project_id: str = None):
    """Broadcast that a calculation failed."""
    if socketio:
        data = {
            'calculation_id': calculation_id,
            'project_id': project_id,
            'status': 'failed',
            'error': error,
            'timestamp': datetime.utcnow().isoformat()
        }
        if project_id:
            socketio.emit('calculation_failed', data, room=StandardRooms.project(project_id))
        socketio.emit('calculation_failed', data, room=StandardRooms.calculation(calculation_id))


def broadcast_to_project(project_id: str, event: str, data: Dict[str, Any]):
    """Broadcast an event to all clients subscribed to a project."""
    if socketio:
        socketio.emit(event, {
            **data,
            'project_id': project_id,
            'timestamp': datetime.utcnow().isoformat()
        }, room=StandardRooms.project(project_id))


def get_websocket_status() -> Dict[str, Any]:
    """Get WebSocket server status for health checks."""
    return {
        'available': SOCKETIO_AVAILABLE,
        'initialized': socketio is not None,
        'async_mode': socketio.async_mode if socketio else None,
    }
