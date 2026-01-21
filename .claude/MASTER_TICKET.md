# MEP Design Studio - Master Integration Ticket v2

## ORCHESTRATION MANIFEST
**Created:** 2026-01-21
**Updated:** 2026-01-21
**Status:** ACTIVE
**Priority:** CRITICAL

---

## TICKET REGISTRY (PRIORITY ORDER)

### TICKET-000: Unified Application Startup
**Priority:** P1 - HIGHEST (NEW)
**Type:** Infrastructure / Developer Experience
**Depends On:** None

**Goal:** Single command starts entire MEP Design Studio (backend + frontend)

**File to Create:** `/home/user/hvac-design/start.sh`

**Implementation:**
```bash
#!/bin/bash
# MEP Design Studio - Unified Startup
# Usage: ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  MEP Design Studio - Starting..."
echo "=========================================="

# Kill any existing processes on our ports
echo "[1/4] Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start backend
echo "[2/4] Starting Flask backend on :5000..."
cd engine
python api/app.py &
BACKEND_PID=$!
echo "       Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "[3/4] Waiting for backend health check..."
for i in {1..30}; do
    if curl -s http://localhost:5000/api/v1/health > /dev/null 2>&1; then
        echo "       Backend ready!"
        break
    fi
    sleep 1
done

# Start frontend
echo "[4/4] Starting Vite frontend on :3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "       Frontend PID: $FRONTEND_PID"

echo ""
echo "=========================================="
echo "  MEP Design Studio Running!"
echo "=========================================="
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo "  Health:   http://localhost:5000/api/v1/health"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "=========================================="

# Trap Ctrl+C to kill both processes
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for either to exit
wait
```

**Success Criteria:**
- [ ] `./start.sh` launches both services
- [ ] Backend health check passes before frontend starts
- [ ] Ctrl+C cleanly stops both services
- [ ] No manual intervention required

**Checkpoint Required:** YES

---

### TICKET-001: Implement Floor Plan API
**Priority:** P2 - BLOCKER
**Type:** Backend Implementation
**Depends On:** TICKET-000

**File to Create:** `/home/user/hvac-design/engine/api/routes/floor_plan.py`

**Required Endpoints:**
| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/floor-plan` | - | Full floor plan JSON |
| POST | `/api/floor-plan` | FloorPlan JSON | `{id, created_at}` |
| PUT | `/api/floor-plan/{id}` | FloorPlan JSON | `{id, updated_at}` |
| GET | `/api/floor-plan/{id}` | - | Full FloorPlan JSON |

**Integration Points:**
- Load default from: `data/goldilocks_3b3b_floorplan.json`
- Register in `app.py` at blueprint registration section
- Wire to `FloorPlanEngine` from `engine/design/floor_plan.py`

**Success Criteria:**
- [ ] `curl http://localhost:5000/api/floor-plan` returns Goldilocks floor plan
- [ ] POST creates new floor plan with ID
- [ ] PlumbingRouter/HVACRouter/ElectricalRouter load rooms on mount

**NO STUBS ALLOWED**

---

### TICKET-002: Implement HVAC API + Frontend Integration
**Priority:** P3 - HIGH
**Type:** Full-Stack Integration
**Depends On:** TICKET-000, TICKET-001

**Files to Create/Modify:**
- CREATE: `/home/user/hvac-design/engine/api/routes/hvac.py`
- MODIFY: `/home/user/hvac-design/engine/frontend/src/components/HVACRouter/HVACRouter.jsx`
- MODIFY: `/home/user/hvac-design/engine/api/app.py` (register blueprint)

**Required API Endpoints:**
| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/hvac/auto-design` | `{rooms, systemType}` | `{equipment: [], ducts: [], design}` |
| POST | `/api/hvac/calculate-load` | `{rooms}` | `{totalBTU, perRoom: []}` |
| POST | `/api/hvac/validate` | `{equipment, ducts}` | `{valid, issues}` |

**Backend Must Call:**
```python
from engine.design.mep_systems import MEPSystemEngine, HVACType
engine = MEPSystemEngine()
design = engine.design_hvac(room_objects, hvac_type)  # Line ~280 in mep_systems.py
```

**Frontend Must Call:**
```javascript
// In handleAutoDesign function
const response = await fetch('/api/hvac/auto-design', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rooms: floorPlanRooms, systemType: activeSystem })
})
```

**Success Criteria:**
- [ ] Backend `/api/hvac/auto-design` returns equipment array
- [ ] Frontend Auto-Design button populates equipment on canvas
- [ ] `MEPSystemEngine.design_hvac()` is actually invoked (add logging)
- [ ] Load calculation returns BTU per room

**NO STUBS ALLOWED**

---

### TICKET-003: Implement Electrical API + Frontend Integration
**Priority:** P4 - HIGH
**Type:** Full-Stack Integration
**Depends On:** TICKET-000, TICKET-001

**Files to Create/Modify:**
- CREATE: `/home/user/hvac-design/engine/api/routes/electrical.py`
- MODIFY: `/home/user/hvac-design/engine/frontend/src/components/ElectricalRouter/ElectricalRouter.jsx`
- MODIFY: `/home/user/hvac-design/engine/api/app.py` (register blueprint)

**Required API Endpoints:**
| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/electrical/auto-design` | `{rooms}` | `{equipment: [], wires: [], design}` |
| POST | `/api/electrical/calculate-load` | `{equipment}` | `{totalAmps, perCircuit: []}` |
| POST | `/api/electrical/validate` | `{equipment, wires}` | `{valid, issues}` |

**Backend Must Call:**
```python
from engine.design.mep_systems import MEPSystemEngine
engine = MEPSystemEngine()
design = engine.design_electrical(room_objects)  # Line ~330 in mep_systems.py
```

**Success Criteria:**
- [ ] Backend `/api/electrical/auto-design` returns equipment array
- [ ] Frontend Auto-Design button populates equipment on canvas
- [ ] `MEPSystemEngine.design_electrical()` is actually invoked

**NO STUBS ALLOWED**

---

### TICKET-004: Implement Plumbing API + Frontend Integration
**Priority:** P5 - HIGH
**Type:** Full-Stack Integration
**Depends On:** TICKET-000, TICKET-001

**Files to Create/Modify:**
- CREATE: `/home/user/hvac-design/engine/api/routes/plumbing.py`
- MODIFY: `/home/user/hvac-design/engine/frontend/src/components/PlumbingRouter/PlumbingRouter.jsx`
- MODIFY: `/home/user/hvac-design/engine/api/app.py` (register blueprint)

**Required API Endpoints:**
| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/plumbing/auto-route` | `{fixtures, rooms}` | `{pipes: [], message}` |
| POST | `/api/plumbing/validate` | `{fixtures, pipes}` | `{valid, issues}` |
| POST | `/api/plumbing/design` | `{rooms}` | Full plumbing design |

**Backend Must Call:**
```python
from engine.design.mep_systems import MEPSystemEngine
engine = MEPSystemEngine()
design = engine.design_plumbing(room_objects)  # Line ~380 in mep_systems.py
```

**Success Criteria:**
- [ ] Backend `/api/plumbing/auto-route` returns pipe segments
- [ ] Frontend Auto-Route button populates pipes on canvas
- [ ] Validate button checks vent requirements
- [ ] `MEPSystemEngine.design_plumbing()` is actually invoked

**NO STUBS ALLOWED**

---

### TICKET-005: Wire SQLite Persistence
**Priority:** P6 - MEDIUM
**Type:** Backend Integration
**Depends On:** TICKET-000, TICKET-001, TICKET-002, TICKET-003, TICKET-004

**Existing File:** `/home/user/hvac-design/engine/core/project_database.py`

**Files to Modify:**
- `/home/user/hvac-design/engine/api/app.py` - Initialize DB on startup
- `/home/user/hvac-design/engine/api/routes/projects.py` - Replace in-memory dict
- `/home/user/hvac-design/engine/api/routes/floor_plan.py` - Persist floor plans

**Integration:**
```python
# In app.py create_app()
from engine.core.project_database import ProjectDatabase
db = ProjectDatabase('data/mep_studio.db')
app.config['DATABASE'] = db
```

**Success Criteria:**
- [ ] Projects persist after server restart
- [ ] Floor plans saved to SQLite
- [ ] MEP designs linked to projects

**NO STUBS ALLOWED**

---

### TICKET-006: Integration Testing & Validation
**Priority:** P7 - FINAL
**Type:** Quality Assurance
**Depends On:** ALL ABOVE

**Test Script to Create:** `/home/user/hvac-design/test_integration.sh`

**Test Scenarios:**
1. `./start.sh` launches successfully
2. Health endpoint returns healthy
3. Floor plan loads in all routers
4. HVAC Auto-Design generates equipment
5. Electrical Auto-Design generates equipment
6. Plumbing Auto-Route generates pipes
7. All validations pass
8. Server restart preserves data

**Success Criteria:**
- [ ] All 8 tests pass
- [ ] Zero console errors
- [ ] Zero API 500 errors
- [ ] Total diff report generated

---

## ORCHESTRATION AGENT PROTOCOL

### Ralph Wiggum Loop Pattern

The orchestration agent runs in a continuous loop:

```
┌─────────────────────────────────────────────────────┐
│  ORCHESTRATOR LOOP                                  │
├─────────────────────────────────────────────────────┤
│  1. Read MASTER_TICKET.md                           │
│  2. Find next PENDING ticket                        │
│  3. Deploy specialized agent for ticket             │
│  4. Wait for agent checkpoint                       │
│  5. Verify work (no stubs, actually functional)     │
│  6. If PASS: Mark COMPLETE, goto 2                  │
│  7. If FAIL: Log gaps, retry or escalate            │
│  8. When all COMPLETE: Generate TOTAL_DIFF          │
│  9. Output: <promise>INTEGRATION_COMPLETE</promise> │
└─────────────────────────────────────────────────────┘
```

### Completion Promise
```
<promise>INTEGRATION_COMPLETE</promise>
```

### Gap Detection Rules

An agent's work is REJECTED if:
1. Created file contains `# TODO` or `# STUB` or `pass` without implementation
2. Required endpoint returns 404 or 500
3. Frontend button doesn't trigger API call (check Network tab)
4. MEPSystemEngine method not actually invoked (check logs)
5. Success criteria checkboxes not verifiable

### Checkpoint Verification Commands

```bash
# TICKET-000 verification
./start.sh && curl -s http://localhost:5000/api/v1/health | jq .status

# TICKET-001 verification
curl -s http://localhost:5000/api/floor-plan | jq '.rooms | length'

# TICKET-002 verification
curl -s -X POST http://localhost:5000/api/hvac/auto-design \
  -H "Content-Type: application/json" \
  -d '{"rooms":[{"name":"test","width":5000,"height":4000}],"systemType":"mini_split"}' | jq '.equipment | length'

# TICKET-003 verification
curl -s -X POST http://localhost:5000/api/electrical/auto-design \
  -H "Content-Type: application/json" \
  -d '{"rooms":[{"name":"test","width":5000,"height":4000}]}' | jq '.equipment | length'

# TICKET-004 verification
curl -s -X POST http://localhost:5000/api/plumbing/auto-route \
  -H "Content-Type: application/json" \
  -d '{"fixtures":[],"rooms":[]}' | jq '.pipes'
```

---

## STATUS TRACKER

| Ticket | Priority | Status | Agent | Checkpoint |
|--------|----------|--------|-------|------------|
| TICKET-000 | P1 | PENDING | - | - |
| TICKET-001 | P2 | PENDING | - | - |
| TICKET-002 | P3 | PENDING | - | - |
| TICKET-003 | P4 | PENDING | - | - |
| TICKET-004 | P5 | PENDING | - | - |
| TICKET-005 | P6 | PENDING | - | - |
| TICKET-006 | P7 | PENDING | - | - |

---

## EXECUTION PHASES

```
PHASE 1: Infrastructure
└── TICKET-000: Unified Startup Script ← START HERE

PHASE 2: Core API (Sequential - each depends on floor plan)
├── TICKET-001: Floor Plan API
├── TICKET-002: HVAC Full-Stack
├── TICKET-003: Electrical Full-Stack
└── TICKET-004: Plumbing Full-Stack

PHASE 3: Persistence
└── TICKET-005: SQLite Wiring

PHASE 4: Validation
└── TICKET-006: Integration Testing
```

---

*Version 2 - With unified startup and Ralph Wiggum orchestration pattern*
