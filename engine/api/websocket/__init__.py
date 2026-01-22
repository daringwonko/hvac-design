"""
WebSocket module for real-time updates.
API-004: Enhanced with Flask-SocketIO integration for offline-first architecture.
"""

from .handlers import WebSocketHandler, CalculationProgressTracker
from .events import EventType, Event, emit_event
from .rooms import RoomManager, StandardRooms

# API-004: Export SocketIO integration helpers
try:
    from .socketio_integration import (
        init_socketio,
        broadcast_calculation_started,
        broadcast_calculation_progress,
        broadcast_calculation_completed,
        broadcast_calculation_failed,
        broadcast_to_project,
        get_websocket_status,
    )
    SOCKETIO_AVAILABLE = True
except ImportError:
    SOCKETIO_AVAILABLE = False
    init_socketio = None
    broadcast_calculation_started = lambda *args, **kwargs: None
    broadcast_calculation_progress = lambda *args, **kwargs: None
    broadcast_calculation_completed = lambda *args, **kwargs: None
    broadcast_calculation_failed = lambda *args, **kwargs: None
    broadcast_to_project = lambda *args, **kwargs: None
    get_websocket_status = lambda: {'available': False}

__all__ = [
    'WebSocketHandler',
    'CalculationProgressTracker',
    'EventType',
    'Event',
    'emit_event',
    'RoomManager',
    'StandardRooms',
    'SOCKETIO_AVAILABLE',
    'init_socketio',
    'broadcast_calculation_started',
    'broadcast_calculation_progress',
    'broadcast_calculation_completed',
    'broadcast_calculation_failed',
    'broadcast_to_project',
    'get_websocket_status',
]
