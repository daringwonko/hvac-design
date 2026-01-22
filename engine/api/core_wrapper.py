"""
Core Module Wrapper for API Routes

Provides lazy-loaded access to core modules like ProjectDatabase
to avoid circular imports and ensure proper initialization.
"""

import os
import sys
from typing import Optional

# Ensure core module is in path
_core_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'core')
if _core_path not in sys.path:
    sys.path.insert(0, _core_path)

# Lazy-loaded database instance
_db_instance = None

def get_project_database():
    """Get or create the ProjectDatabase singleton instance"""
    global _db_instance

    if _db_instance is None:
        from project_database import ProjectDatabase

        # Use a persistent database file in the engine directory
        db_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'mep_projects.db'
        )
        _db_instance = ProjectDatabase(db_path)

    return _db_instance
