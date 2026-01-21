#!/usr/bin/env python3
"""
Project Database - SQLite Persistence Layer
============================================
Handles persistent storage for floor plans, projects, and MEP designs.

Follows patterns from iot/iot_sensor_network.py for consistency.
"""

import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import asdict


class ProjectDatabase:
    """SQLite database for project and floor plan storage"""

    def __init__(self, db_path: str = "mep_projects.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize database tables"""
        with sqlite3.connect(self.db_path) as conn:
            # Projects table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    metadata TEXT
                )
            ''')

            # Floor plans table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS floor_plans (
                    id TEXT PRIMARY KEY,
                    project_id TEXT,
                    name TEXT NOT NULL,
                    version TEXT DEFAULT '1.0.0',
                    width_mm REAL NOT NULL,
                    depth_mm REAL NOT NULL,
                    height_mm REAL DEFAULT 2743,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (project_id) REFERENCES projects(id)
                )
            ''')

            # Rooms table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS rooms (
                    id TEXT PRIMARY KEY,
                    floor_plan_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    room_type TEXT NOT NULL,
                    x_mm REAL NOT NULL,
                    y_mm REAL NOT NULL,
                    width_mm REAL NOT NULL,
                    depth_mm REAL NOT NULL,
                    height_mm REAL DEFAULT 2743,
                    data TEXT,
                    FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id)
                )
            ''')

            # HVAC designs table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS hvac_designs (
                    id TEXT PRIMARY KEY,
                    floor_plan_id TEXT NOT NULL,
                    system_type TEXT NOT NULL,
                    cooling_capacity_kw REAL,
                    heating_capacity_kw REAL,
                    duct_width_mm REAL,
                    duct_height_mm REAL,
                    airflow_ls REAL,
                    efficiency REAL,
                    cost REAL,
                    equipment TEXT,
                    duct_routes TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id)
                )
            ''')

            # Electrical designs table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS electrical_designs (
                    id TEXT PRIMARY KEY,
                    floor_plan_id TEXT NOT NULL,
                    phase TEXT NOT NULL,
                    total_load_kw REAL,
                    main_breaker_a REAL,
                    wire_gauge TEXT,
                    circuits TEXT,
                    panel_location TEXT,
                    outlet_positions TEXT,
                    switch_positions TEXT,
                    cost REAL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id)
                )
            ''')

            # Plumbing designs table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS plumbing_designs (
                    id TEXT PRIMARY KEY,
                    floor_plan_id TEXT NOT NULL,
                    fixtures TEXT,
                    pipe_sizes TEXT,
                    flow_rate_lpm REAL,
                    pump_power_kw REAL,
                    wet_walls TEXT,
                    supply_routes TEXT,
                    drain_routes TEXT,
                    cost REAL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id)
                )
            ''')

            # Equipment library table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS equipment (
                    id TEXT PRIMARY KEY,
                    category TEXT NOT NULL,
                    name TEXT NOT NULL,
                    manufacturer TEXT,
                    model TEXT,
                    specs TEXT,
                    cost REAL,
                    dimensions TEXT,
                    created_at TEXT NOT NULL
                )
            ''')

            # Create indexes for performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_floor_plans_project ON floor_plans(project_id)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_rooms_floor_plan ON rooms(floor_plan_id)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_hvac_floor_plan ON hvac_designs(floor_plan_id)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_electrical_floor_plan ON electrical_designs(floor_plan_id)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_plumbing_floor_plan ON plumbing_designs(floor_plan_id)')

    # =========================================================================
    # PROJECT OPERATIONS
    # =========================================================================

    def create_project(self, name: str, description: str = "") -> str:
        """Create a new project"""
        project_id = f"proj_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO projects (id, name, description, created_at, updated_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (project_id, name, description, now, now, "{}"))

        return project_id

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get project by ID"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                'SELECT * FROM projects WHERE id = ?', (project_id,)
            ).fetchone()

            if row:
                return dict(row)
        return None

    def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                'SELECT * FROM projects ORDER BY updated_at DESC'
            ).fetchall()
            return [dict(row) for row in rows]

    def update_project(self, project_id: str, updates: Dict[str, Any]) -> bool:
        """Update project"""
        updates['updated_at'] = datetime.utcnow().isoformat()
        set_clause = ', '.join(f'{k} = ?' for k in updates.keys())

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                f'UPDATE projects SET {set_clause} WHERE id = ?',
                list(updates.values()) + [project_id]
            )
            return cursor.rowcount > 0

    def delete_project(self, project_id: str) -> bool:
        """Delete project and all associated data"""
        with sqlite3.connect(self.db_path) as conn:
            # Get floor plans for this project
            floor_plans = conn.execute(
                'SELECT id FROM floor_plans WHERE project_id = ?', (project_id,)
            ).fetchall()

            # Delete associated data for each floor plan
            for (fp_id,) in floor_plans:
                conn.execute('DELETE FROM rooms WHERE floor_plan_id = ?', (fp_id,))
                conn.execute('DELETE FROM hvac_designs WHERE floor_plan_id = ?', (fp_id,))
                conn.execute('DELETE FROM electrical_designs WHERE floor_plan_id = ?', (fp_id,))
                conn.execute('DELETE FROM plumbing_designs WHERE floor_plan_id = ?', (fp_id,))

            # Delete floor plans
            conn.execute('DELETE FROM floor_plans WHERE project_id = ?', (project_id,))

            # Delete project
            cursor = conn.execute('DELETE FROM projects WHERE id = ?', (project_id,))
            return cursor.rowcount > 0

    # =========================================================================
    # FLOOR PLAN OPERATIONS
    # =========================================================================

    def save_floor_plan(self, floor_plan: Dict[str, Any], project_id: Optional[str] = None) -> str:
        """Save or update a floor plan"""
        floor_plan_id = floor_plan.get('id', f"fp_{uuid.uuid4().hex[:12]}")
        now = datetime.utcnow().isoformat()

        dims = floor_plan.get('overall_dimensions', {})

        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT OR REPLACE INTO floor_plans
                (id, project_id, name, version, width_mm, depth_mm, height_mm, data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                floor_plan_id,
                project_id,
                floor_plan.get('name', 'Untitled'),
                floor_plan.get('version', '1.0.0'),
                dims.get('width', 10000),
                dims.get('depth', 8000),
                dims.get('height', 2743),
                json.dumps(floor_plan),
                floor_plan.get('created_at', now),
                now
            ))

            # Save rooms
            for room in floor_plan.get('rooms', []):
                self._save_room(conn, floor_plan_id, room)

        return floor_plan_id

    def _save_room(self, conn, floor_plan_id: str, room: Dict[str, Any]):
        """Save a room (internal method)"""
        pos = room.get('position', {})
        dims = room.get('dimensions', {})

        conn.execute('''
            INSERT OR REPLACE INTO rooms
            (id, floor_plan_id, name, room_type, x_mm, y_mm, width_mm, depth_mm, height_mm, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            room.get('id', f"room_{uuid.uuid4().hex[:8]}"),
            floor_plan_id,
            room.get('name', 'Room'),
            room.get('room_type', 'other'),
            pos.get('x', 0),
            pos.get('y', 0),
            dims.get('width', 3000),
            dims.get('depth', 3000),
            dims.get('height', 2743),
            json.dumps(room)
        ))

    def get_floor_plan(self, floor_plan_id: str) -> Optional[Dict[str, Any]]:
        """Get floor plan by ID"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                'SELECT data FROM floor_plans WHERE id = ?', (floor_plan_id,)
            ).fetchone()

            if row:
                return json.loads(row['data'])
        return None

    def list_floor_plans(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List floor plans, optionally filtered by project"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            if project_id:
                rows = conn.execute(
                    'SELECT id, name, width_mm, depth_mm, updated_at FROM floor_plans WHERE project_id = ? ORDER BY updated_at DESC',
                    (project_id,)
                ).fetchall()
            else:
                rows = conn.execute(
                    'SELECT id, name, width_mm, depth_mm, updated_at FROM floor_plans ORDER BY updated_at DESC'
                ).fetchall()

            return [dict(row) for row in rows]

    def delete_floor_plan(self, floor_plan_id: str) -> bool:
        """Delete floor plan and associated data"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM rooms WHERE floor_plan_id = ?', (floor_plan_id,))
            conn.execute('DELETE FROM hvac_designs WHERE floor_plan_id = ?', (floor_plan_id,))
            conn.execute('DELETE FROM electrical_designs WHERE floor_plan_id = ?', (floor_plan_id,))
            conn.execute('DELETE FROM plumbing_designs WHERE floor_plan_id = ?', (floor_plan_id,))
            cursor = conn.execute('DELETE FROM floor_plans WHERE id = ?', (floor_plan_id,))
            return cursor.rowcount > 0

    # =========================================================================
    # MEP DESIGN OPERATIONS
    # =========================================================================

    def save_hvac_design(self, floor_plan_id: str, design: Dict[str, Any]) -> str:
        """Save HVAC design"""
        design_id = design.get('id', f"hvac_{uuid.uuid4().hex[:12]}")
        now = datetime.utcnow().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT OR REPLACE INTO hvac_designs
                (id, floor_plan_id, system_type, cooling_capacity_kw, heating_capacity_kw,
                 duct_width_mm, duct_height_mm, airflow_ls, efficiency, cost,
                 equipment, duct_routes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                design_id,
                floor_plan_id,
                design.get('system_type', 'vrf'),
                design.get('cooling_capacity', 0),
                design.get('heating_capacity', 0),
                design.get('duct_width', 0),
                design.get('duct_height', 0),
                design.get('airflow', 0),
                design.get('efficiency', 0),
                design.get('cost', 0),
                json.dumps(design.get('equipment', [])),
                json.dumps(design.get('duct_routes', [])),
                now
            ))

        return design_id

    def save_electrical_design(self, floor_plan_id: str, design: Dict[str, Any]) -> str:
        """Save electrical design"""
        design_id = design.get('id', f"elec_{uuid.uuid4().hex[:12]}")
        now = datetime.utcnow().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT OR REPLACE INTO electrical_designs
                (id, floor_plan_id, phase, total_load_kw, main_breaker_a, wire_gauge,
                 circuits, panel_location, outlet_positions, switch_positions, cost, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                design_id,
                floor_plan_id,
                design.get('phase', 'single_phase'),
                design.get('total_load', 0),
                design.get('main_breaker', 0),
                design.get('wire_gauge', '12 AWG'),
                json.dumps(design.get('circuits', [])),
                json.dumps(design.get('panel_location', {})),
                json.dumps(design.get('outlets', [])),
                json.dumps(design.get('switches', [])),
                design.get('cost', 0),
                now
            ))

        return design_id

    def save_plumbing_design(self, floor_plan_id: str, design: Dict[str, Any]) -> str:
        """Save plumbing design"""
        design_id = design.get('id', f"plumb_{uuid.uuid4().hex[:12]}")
        now = datetime.utcnow().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT OR REPLACE INTO plumbing_designs
                (id, floor_plan_id, fixtures, pipe_sizes, flow_rate_lpm, pump_power_kw,
                 wet_walls, supply_routes, drain_routes, cost, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                design_id,
                floor_plan_id,
                json.dumps(design.get('fixtures', {})),
                json.dumps(design.get('pipe_sizes', {})),
                design.get('flow_rate', 0),
                design.get('pump_power', 0),
                json.dumps(design.get('wet_walls', [])),
                json.dumps(design.get('supply_routes', [])),
                json.dumps(design.get('drain_routes', [])),
                design.get('cost', 0),
                now
            ))

        return design_id

    def get_mep_designs(self, floor_plan_id: str) -> Dict[str, Any]:
        """Get all MEP designs for a floor plan"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            hvac = conn.execute(
                'SELECT * FROM hvac_designs WHERE floor_plan_id = ? ORDER BY created_at DESC LIMIT 1',
                (floor_plan_id,)
            ).fetchone()

            electrical = conn.execute(
                'SELECT * FROM electrical_designs WHERE floor_plan_id = ? ORDER BY created_at DESC LIMIT 1',
                (floor_plan_id,)
            ).fetchone()

            plumbing = conn.execute(
                'SELECT * FROM plumbing_designs WHERE floor_plan_id = ? ORDER BY created_at DESC LIMIT 1',
                (floor_plan_id,)
            ).fetchone()

            return {
                'hvac': dict(hvac) if hvac else None,
                'electrical': dict(electrical) if electrical else None,
                'plumbing': dict(plumbing) if plumbing else None
            }

    # =========================================================================
    # EQUIPMENT LIBRARY
    # =========================================================================

    def add_equipment(self, category: str, name: str, specs: Dict[str, Any],
                      manufacturer: str = "", model: str = "", cost: float = 0) -> str:
        """Add equipment to library"""
        equip_id = f"equip_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO equipment
                (id, category, name, manufacturer, model, specs, cost, dimensions, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                equip_id,
                category,
                name,
                manufacturer,
                model,
                json.dumps(specs),
                cost,
                json.dumps(specs.get('dimensions', {})),
                now
            ))

        return equip_id

    def get_equipment_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get equipment by category"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                'SELECT * FROM equipment WHERE category = ? ORDER BY name',
                (category,)
            ).fetchall()
            return [dict(row) for row in rows]

    def search_equipment(self, query: str) -> List[Dict[str, Any]]:
        """Search equipment by name or manufacturer"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                'SELECT * FROM equipment WHERE name LIKE ? OR manufacturer LIKE ? ORDER BY name',
                (f'%{query}%', f'%{query}%')
            ).fetchall()
            return [dict(row) for row in rows]


# =============================================================================
# DEMONSTRATION
# =============================================================================

def demonstrate_database():
    """Demonstrate database operations"""
    print("=" * 80)
    print("PROJECT DATABASE DEMONSTRATION")
    print("=" * 80)

    db = ProjectDatabase(":memory:")  # In-memory for demo

    # Create project
    print("\n1. CREATE PROJECT")
    project_id = db.create_project("Goldilocks Home", "3-bedroom modular home")
    print(f"Created project: {project_id}")

    # Create floor plan
    print("\n2. CREATE FLOOR PLAN")
    floor_plan = {
        'name': 'Goldilocks 3B-3B',
        'overall_dimensions': {'width': 17850, 'depth': 7496},
        'rooms': [
            {'id': 'room_1', 'name': 'Living Room', 'room_type': 'living',
             'position': {'x': 0, 'y': 1355}, 'dimensions': {'width': 4614, 'depth': 3000}},
            {'id': 'room_2', 'name': 'Kitchen', 'room_type': 'kitchen',
             'position': {'x': 4614, 'y': 1355}, 'dimensions': {'width': 5630, 'depth': 2980}},
        ]
    }
    fp_id = db.save_floor_plan(floor_plan, project_id)
    print(f"Saved floor plan: {fp_id}")

    # Save HVAC design
    print("\n3. SAVE HVAC DESIGN")
    hvac_id = db.save_hvac_design(fp_id, {
        'system_type': 'vrf',
        'cooling_capacity': 12.5,
        'heating_capacity': 8.75,
        'efficiency': 4.2,
        'cost': 15000
    })
    print(f"Saved HVAC design: {hvac_id}")

    # List projects
    print("\n4. LIST PROJECTS")
    projects = db.list_projects()
    for p in projects:
        print(f"  - {p['name']} ({p['id']})")

    # Get MEP designs
    print("\n5. GET MEP DESIGNS")
    mep = db.get_mep_designs(fp_id)
    print(f"  HVAC: {mep['hvac'] is not None}")
    print(f"  Electrical: {mep['electrical'] is not None}")
    print(f"  Plumbing: {mep['plumbing'] is not None}")

    print("\n" + "=" * 80)
    print("DATABASE DEMONSTRATION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    demonstrate_database()
