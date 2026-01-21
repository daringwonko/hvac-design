# MEP Design Studio - Master Integration Ticket

## ORCHESTRATION MANIFEST
**Created:** 2026-01-21
**Status:** ACTIVE
**Priority:** CRITICAL

---

## CURRENT STATE ANALYSIS

### What's Working
| Component | Status | Evidence |
|-----------|--------|----------|
| Frontend (Vite) | RUNNING | localhost:3000 active |
| HVACRouter UI | COMPLETE | Local state functional |
| ElectricalRouter UI | COMPLETE | Local state functional |
| PlumbingRouter UI | COMPLETE | Local state functional |
| FloorPlanEditor UI | COMPLETE | Local state functional |
| Navigation/Routing | COMPLETE | All routes wired in App.jsx |

### What's NOT Working
| Component | Status | Root Cause |
|-----------|--------|------------|
| Backend API | NOT RUNNING | `python engine/api/app.py` never started |
| Floor Plan API | MISSING | `/api/floor-plan` endpoint doesn't exist |
| Plumbing Auto-Route | MISSING | `/api/plumbing/auto-route` endpoint doesn't exist |
| Plumbing Validate | MISSING | `/api/plumbing/validate` endpoint doesn't exist |
| HVAC Backend Integration | NOT WIRED | No API calls in HVACRouter.jsx |
| Electrical Backend Integration | NOT WIRED | No API calls in ElectricalRouter.jsx |
| SQLite Persistence | NOT WIRED | project_database.py exists but unused |
| MEPSystemEngine Integration | NOT WIRED | design_hvac/electrical/plumbing() not called |

---

## TICKET REGISTRY

### TICKET-001: Start Backend API Server
**Priority:** P0 - BLOCKER
**Type:** Infrastructure
**Assigned:** immediate

**Requirements:**
```bash
cd /home/user/hvac-design/engine
python api/app.py
# Expected: Server running on http://localhost:5000
```

**Success Criteria:**
- [ ] `curl http://localhost:5000/api/v1/health` returns `{"status": "healthy"}`
- [ ] Frontend proxy errors disappear
- [ ] Dashboard shows API connection status

**Checkpoint Report Required:**
```json
{
  "ticket": "TICKET-001",
  "status": "COMPLETE|FAILED",
  "evidence": {
    "health_response": "<paste curl output>",
    "frontend_errors": "<count of remaining proxy errors>"
  }
}
```

---

### TICKET-002: Implement Floor Plan API
**Priority:** P0 - BLOCKER
**Type:** Backend Implementation
**Depends On:** TICKET-001

**File to Create:** `/home/user/hvac-design/engine/api/routes/floor_plan.py`

**Required Endpoints:**
| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/floor-plan` | - | `{rooms: [], walls: [], fixtures: []}` |
| POST | `/api/floor-plan` | FloorPlan JSON | `{id, created_at}` |
| PUT | `/api/floor-plan/{id}` | FloorPlan JSON | `{id, updated_at}` |
| GET | `/api/floor-plan/{id}` | - | Full FloorPlan JSON |

**Integration Points:**
- Import: `from engine.design.floor_plan import FloorPlanEngine`
- Load default: `/home/user/hvac-design/data/goldilocks_3b3b_floorplan.json`
- Register blueprint in `app.py` lines 55-65

**Code Snippet (MUST IMPLEMENT):**
```python
from flask import Blueprint, jsonify, request
from engine.design.floor_plan import FloorPlanEngine
import json

floor_plan_bp = Blueprint('floor_plan', __name__, url_prefix='/api')

# Load default floor plan
DEFAULT_FLOOR_PLAN_PATH = 'data/goldilocks_3b3b_floorplan.json'

@floor_plan_bp.route('/floor-plan', methods=['GET'])
def get_floor_plan():
    """Load floor plan data for MEP routing"""
    try:
        with open(DEFAULT_FLOOR_PLAN_PATH) as f:
            data = json.load(f)
        return jsonify(data), 200
    except FileNotFoundError:
        return jsonify({'rooms': [], 'walls': [], 'fixtures': []}), 200
```

**Success Criteria:**
- [ ] `curl http://localhost:5000/api/floor-plan` returns floor plan JSON
- [ ] PlumbingRouter loads floor plan rooms on mount
- [ ] FloorPlanEditor can save/load plans

**NO STUBS ALLOWED** - Full implementation required.

---

### TICKET-003: Implement Plumbing API Routes
**Priority:** P1 - HIGH
**Type:** Backend Implementation
**Depends On:** TICKET-001, TICKET-002

**File to Create:** `/home/user/hvac-design/engine/api/routes/plumbing.py`

**Required Endpoints:**
| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/plumbing/auto-route` | `{fixtures, rooms}` | `{pipes: [], message}` |
| POST | `/api/plumbing/validate` | `{fixtures, pipes}` | `{valid: bool, issues: []}` |
| POST | `/api/plumbing/design` | `{rooms}` | Full MEP design |

**Integration Points:**
- Import: `from engine.design.mep_systems import MEPSystemEngine`
- Call: `MEPSystemEngine().design_plumbing(rooms)` at `engine/design/mep_systems.py:380`
- Validation logic using PlumbingCode rules

**Code Snippet (MUST IMPLEMENT):**
```python
from flask import Blueprint, jsonify, request
from engine.design.mep_systems import MEPSystemEngine

plumbing_bp = Blueprint('plumbing', __name__, url_prefix='/api/plumbing')

@plumbing_bp.route('/auto-route', methods=['POST'])
def auto_route():
    """Auto-route plumbing using MEPSystemEngine"""
    data = request.get_json()
    fixtures = data.get('fixtures', [])
    rooms = data.get('rooms', [])

    engine = MEPSystemEngine()
    # Convert rooms to engine format
    room_objects = [Room(name=r.get('name', ''), area=r.get('width', 0) * r.get('height', 0) / 1000000) for r in rooms]

    design = engine.design_plumbing(room_objects)

    # Convert design to frontend pipe format
    pipes = []
    for fixture in fixtures:
        # Generate pipes based on fixture type and location
        # ... implementation details

    return jsonify({
        'pipes': pipes,
        'message': f'Generated {len(pipes)} pipe segments',
        'design': design.__dict__ if design else None
    }), 200

@plumbing_bp.route('/validate', methods=['POST'])
def validate():
    """Validate plumbing design against code requirements"""
    data = request.get_json()
    fixtures = data.get('fixtures', [])
    pipes = data.get('pipes', [])

    issues = []

    # Validation rules
    for fixture in fixtures:
        fixture_type = fixture.get('type')
        # Check vent requirements
        if fixture_type in ['toilet', 'sink', 'shower']:
            has_vent = any(p.get('pipeType') == 'vent' for p in pipes
                         if abs(p.get('startX', 0) - fixture.get('x', 0)) < 100)
            if not has_vent:
                issues.append(f"{fixture_type} at ({fixture.get('x')}, {fixture.get('y')}) requires vent connection")

    return jsonify({
        'valid': len(issues) == 0,
        'issues': issues
    }), 200
```

**Success Criteria:**
- [ ] `curl -X POST http://localhost:5000/api/plumbing/auto-route -H "Content-Type: application/json" -d '{"fixtures":[],"rooms":[]}'` returns pipes
- [ ] PlumbingRouter "Auto-Route" button generates pipes
- [ ] PlumbingRouter "Validate" button returns validation results
- [ ] MEPSystemEngine.design_plumbing() is actually called

**NO STUBS ALLOWED** - Full implementation required.

---

### TICKET-004: Wire HVAC Router to Backend
**Priority:** P1 - HIGH
**Type:** Frontend-Backend Integration
**Depends On:** TICKET-001

**Files to Modify:**
- `/home/user/hvac-design/engine/frontend/src/components/HVACRouter/HVACRouter.jsx`
- `/home/user/hvac-design/engine/api/routes/hvac.py` (CREATE)

**Required API Endpoints:**
| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/hvac/auto-design` | `{rooms, systemType}` | `{equipment: [], ducts: []}` |
| POST | `/api/hvac/calculate-load` | `{rooms}` | `{totalLoad, perRoom: []}` |
| POST | `/api/hvac/validate` | `{equipment, ducts}` | `{valid, issues}` |

**Frontend Integration Points (HVACRouter.jsx):**

Line 510 - Replace handleAutoDesign:
```javascript
const handleAutoDesign = async () => {
  try {
    const response = await fetch('/api/hvac/auto-design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rooms: floorPlanRooms,
        systemType: activeSystem
      }),
    })
    const data = await response.json()
    if (data.equipment) setEquipment(prev => [...prev, ...data.equipment])
    if (data.ducts) setDucts(prev => [...prev, ...data.ducts])
  } catch (err) {
    console.error('Auto-design failed:', err)
  }
}
```

**Backend Integration (hvac.py):**
```python
from flask import Blueprint, jsonify, request
from engine.design.mep_systems import MEPSystemEngine, Room, HVACType

hvac_bp = Blueprint('hvac', __name__, url_prefix='/api/hvac')

@hvac_bp.route('/auto-design', methods=['POST'])
def auto_design():
    data = request.get_json()
    rooms = data.get('rooms', [])
    system_type = data.get('systemType', 'mini_split')

    engine = MEPSystemEngine()
    room_objects = [Room(name=r.get('name'), area=r.get('width', 0) * r.get('height', 0) / 1000000) for r in rooms]

    hvac_type = HVACType[system_type.upper()] if system_type.upper() in HVACType.__members__ else HVACType.MINI_SPLIT
    design = engine.design_hvac(room_objects, hvac_type)

    # Convert to frontend format
    equipment = []
    ducts = []
    # ... conversion logic

    return jsonify({'equipment': equipment, 'ducts': ducts, 'design': design.__dict__}), 200
```

**Success Criteria:**
- [ ] HVACRouter "Auto-Design" button calls backend
- [ ] MEPSystemEngine.design_hvac() is executed
- [ ] Equipment and ducts populated from backend response

**NO STUBS ALLOWED** - Full implementation required.

---

### TICKET-005: Wire Electrical Router to Backend
**Priority:** P1 - HIGH
**Type:** Frontend-Backend Integration
**Depends On:** TICKET-001

**Files to Modify:**
- `/home/user/hvac-design/engine/frontend/src/components/ElectricalRouter/ElectricalRouter.jsx`
- `/home/user/hvac-design/engine/api/routes/electrical.py` (CREATE)

**Required API Endpoints:**
| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/electrical/auto-design` | `{rooms}` | `{equipment: [], wires: []}` |
| POST | `/api/electrical/calculate-load` | `{equipment}` | `{totalAmps, perCircuit: []}` |
| POST | `/api/electrical/validate` | `{equipment, wires}` | `{valid, issues}` |

**Integration:** Same pattern as TICKET-004 but using `MEPSystemEngine.design_electrical()`

**Success Criteria:**
- [ ] ElectricalRouter "Auto-Design" button calls backend
- [ ] MEPSystemEngine.design_electrical() is executed
- [ ] Equipment and wires populated from backend response

**NO STUBS ALLOWED** - Full implementation required.

---

### TICKET-006: Wire SQLite Persistence
**Priority:** P2 - MEDIUM
**Type:** Backend Integration
**Depends On:** TICKET-001, TICKET-002, TICKET-003, TICKET-004, TICKET-005

**Existing File:** `/home/user/hvac-design/engine/core/project_database.py`

**Required Wiring:**
1. Initialize database on app startup (app.py)
2. Replace in-memory stores with SQLite calls
3. Add project save/load for MEP designs

**Integration Points:**
- `app.py` line ~230: Initialize ProjectDatabase
- `routes/projects.py`: Replace `_projects_store` dict with database
- `routes/floor_plan.py`: Save/load floor plans from database
- New methods needed in project_database.py for MEP designs

**Success Criteria:**
- [ ] Projects persist across server restarts
- [ ] Floor plans saved to SQLite
- [ ] MEP designs (HVAC/Electrical/Plumbing) saved per project

**NO STUBS ALLOWED** - Full implementation required.

---

### TICKET-007: Integration Testing & Validation
**Priority:** P2 - MEDIUM
**Type:** Quality Assurance
**Depends On:** ALL ABOVE

**Test Scenarios:**
1. Start backend, verify health endpoint
2. Load floor plan in FloorPlanEditor, save it
3. Navigate to HVAC, click Auto-Design, verify equipment appears
4. Navigate to Electrical, click Auto-Design, verify wires appear
5. Navigate to Plumbing, click Auto-Route, verify pipes appear
6. Validate each design
7. Export designs
8. Restart server, verify data persists

**Success Criteria:**
- [ ] All 8 scenarios pass
- [ ] No console errors
- [ ] No API 500 errors

---

## AGENT ORCHESTRATION STRATEGY

### Master Orchestrator Agent
**Role:** Coordinate all integration work, track ticket progress, compile diff reports

**Capabilities:**
- Read/write ticket status in MASTER_TICKET.md
- Spawn specialized agents for each ticket
- Collect checkpoint reports
- Generate final integration diff

### Specialized Agents

| Agent Type | Tickets | Tools |
|------------|---------|-------|
| Backend-API | TICKET-001, 002, 003, 004, 005 | Bash, Write, Edit, Grep |
| Frontend-Integration | TICKET-004, 005 | Read, Edit, Write |
| Database-Integration | TICKET-006 | Read, Edit, Write, Bash |
| QA-Validation | TICKET-007 | Bash, Read, WebFetch |

### Checkpoint Protocol

Each agent MUST submit a checkpoint report in this format:

```json
{
  "ticket_id": "TICKET-XXX",
  "agent_id": "<agent_id>",
  "timestamp": "<ISO8601>",
  "status": "IN_PROGRESS|COMPLETE|BLOCKED",
  "work_completed": [
    {
      "file": "<absolute_path>",
      "action": "CREATE|MODIFY|DELETE",
      "lines_changed": "<range or count>",
      "description": "<what was done>"
    }
  ],
  "integration_points_verified": [
    {
      "from": "<source file:line>",
      "to": "<target file:line>",
      "verified": true|false
    }
  ],
  "tests_run": [
    {"test": "<description>", "result": "PASS|FAIL"}
  ],
  "blockers": ["<description if any>"],
  "next_steps": ["<what remains>"]
}
```

### Final Diff Report Format

After all tickets complete, generate:

```
## TOTAL DIFF REPORT
Generated: <timestamp>

### Files Created
- <path> (<lines> lines)

### Files Modified
- <path> (+<added> -<removed> lines)

### Integration Points Wired
- <frontend_file:line> → <backend_endpoint>
- <backend_route:line> → <engine_method>

### API Endpoints Added
- METHOD /path - <description>

### Database Tables Used
- <table> - <purpose>

### Test Results
- <count> passed, <count> failed

### Verification Commands
```bash
# Run these to verify integration:
curl http://localhost:5000/api/v1/health
curl http://localhost:5000/api/floor-plan
# ... etc
```
```

---

## EXECUTION ORDER

```
Phase 1: Infrastructure (BLOCKING)
├── TICKET-001: Start Backend ← MUST COMPLETE FIRST

Phase 2: Core APIs (Parallel)
├── TICKET-002: Floor Plan API
├── TICKET-003: Plumbing API
├── TICKET-004: HVAC API + Frontend
└── TICKET-005: Electrical API + Frontend

Phase 3: Persistence
└── TICKET-006: SQLite Wiring

Phase 4: Validation
└── TICKET-007: Integration Testing
```

---

## CONTEXT SHIELDING STRATEGY

To protect the main conversation context:

1. **Agent Isolation:** Each agent works on ONE ticket only
2. **Minimal Returns:** Agents return only checkpoint JSON, not full code
3. **File-Based Communication:** Detailed work stored in files, not context
4. **Checkpoint Files:** Each ticket gets `/home/user/hvac-design/.claude/checkpoints/TICKET-XXX.json`
5. **Summary Aggregation:** Master only reads summaries, not full content

---

## STATUS TRACKER

| Ticket | Status | Assignee | Checkpoint |
|--------|--------|----------|------------|
| TICKET-001 | PENDING | - | - |
| TICKET-002 | PENDING | - | - |
| TICKET-003 | PENDING | - | - |
| TICKET-004 | PENDING | - | - |
| TICKET-005 | PENDING | - | - |
| TICKET-006 | PENDING | - | - |
| TICKET-007 | PENDING | - | - |

---

*This ticket is the single source of truth for MEP Design Studio integration.*
