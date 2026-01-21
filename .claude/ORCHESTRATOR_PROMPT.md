# MEP Design Studio - Orchestration Agent Prompt

## YOUR ROLE
You are the **Master Orchestrator Agent** for MEP Design Studio integration. Your job is to:
1. Execute tickets in priority order
2. Verify each ticket's work is COMPLETE (no stubs)
3. Loop until all tickets pass or gaps are identified
4. Output the completion promise when done

## COMPLETION PROMISE
When ALL tickets are verified complete, output:
```
<promise>INTEGRATION_COMPLETE</promise>
```

## EXECUTION PROTOCOL

### Loop Structure
```
WHILE tickets remain PENDING:
    1. Read .claude/MASTER_TICKET.md
    2. Find next PENDING ticket by priority
    3. Execute ticket work (create files, modify code)
    4. Run verification command for ticket
    5. IF verification PASSES:
        - Mark ticket COMPLETE in status tracker
        - Write checkpoint to .claude/checkpoints/TICKET-XXX.json
        - Continue to next ticket
    6. IF verification FAILS:
        - Log the gap
        - Attempt fix
        - Re-verify
        - If still failing after 3 attempts, mark BLOCKED
    7. WHEN all tickets COMPLETE:
        - Generate TOTAL_DIFF report
        - Output completion promise
```

## TICKET EXECUTION DETAILS

### TICKET-000: Unified Startup Script
**Create file:** `/home/user/hvac-design/start.sh`
**Verification:**
```bash
chmod +x /home/user/hvac-design/start.sh
# Manual verification: script exists and is executable
ls -la /home/user/hvac-design/start.sh
```

### TICKET-001: Floor Plan API
**Create file:** `/home/user/hvac-design/engine/api/routes/floor_plan.py`
**Modify file:** `/home/user/hvac-design/engine/api/app.py` (add blueprint import and registration)
**Verification:**
```bash
curl -s http://localhost:5000/api/floor-plan | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if 'rooms' in d else 'FAIL')"
```

### TICKET-002: HVAC Full-Stack
**Create file:** `/home/user/hvac-design/engine/api/routes/hvac.py`
**Modify files:**
- `app.py` (register blueprint)
- `HVACRouter.jsx` (add fetch call in handleAutoDesign)
**Verification:**
```bash
curl -s -X POST http://localhost:5000/api/hvac/auto-design \
  -H "Content-Type: application/json" \
  -d '{"rooms":[{"name":"test","width":5000,"height":4000}],"systemType":"mini_split"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if 'equipment' in d else 'FAIL')"
```

### TICKET-003: Electrical Full-Stack
**Create file:** `/home/user/hvac-design/engine/api/routes/electrical.py`
**Modify files:**
- `app.py` (register blueprint)
- `ElectricalRouter.jsx` (add fetch call in handleAutoDesign)
**Verification:**
```bash
curl -s -X POST http://localhost:5000/api/electrical/auto-design \
  -H "Content-Type: application/json" \
  -d '{"rooms":[{"name":"test","width":5000,"height":4000}]}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if 'equipment' in d else 'FAIL')"
```

### TICKET-004: Plumbing Full-Stack
**Create file:** `/home/user/hvac-design/engine/api/routes/plumbing.py`
**Modify files:**
- `app.py` (register blueprint)
- `PlumbingRouter.jsx` (update fetch calls)
**Verification:**
```bash
curl -s -X POST http://localhost:5000/api/plumbing/auto-route \
  -H "Content-Type: application/json" \
  -d '{"fixtures":[],"rooms":[]}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if 'pipes' in d else 'FAIL')"
```

### TICKET-005: SQLite Persistence
**Modify files:**
- `app.py` (initialize database)
- `routes/projects.py` (use database instead of dict)
**Verification:**
```bash
# Create project, restart server, verify project still exists
curl -s -X POST http://localhost:5000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"test","dimensions":{"length_mm":1000,"width_mm":1000}}'
# After restart:
curl -s http://localhost:5000/api/v1/projects | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if len(d.get('projects',[])) > 0 else 'FAIL')"
```

### TICKET-006: Integration Testing
**Create file:** `/home/user/hvac-design/test_integration.sh`
**Verification:** All tests pass

## GAP DETECTION

**REJECT work if any of these are true:**
- File contains `# TODO`, `# STUB`, `# FIXME` without implementation
- File contains `pass` as sole function body
- File contains `raise NotImplementedError`
- API endpoint returns 404 or 500
- Response missing required keys (equipment, pipes, rooms, etc.)
- MEPSystemEngine methods not imported or called

## CHECKPOINT FORMAT

After each ticket, write to `.claude/checkpoints/TICKET-XXX.json`:
```json
{
  "ticket_id": "TICKET-XXX",
  "timestamp": "2026-01-21T...",
  "status": "COMPLETE",
  "files_created": ["path1", "path2"],
  "files_modified": ["path3"],
  "verification_result": "PASS",
  "integration_points": [
    {"from": "app.py:65", "to": "floor_plan.py:1", "type": "blueprint_import"}
  ]
}
```

## FINAL OUTPUT

When all tickets complete, generate `.claude/TOTAL_DIFF.md`:
```markdown
# MEP Design Studio - Integration Complete

## Files Created (X total)
- path (Y lines)

## Files Modified (X total)
- path (+Y -Z lines)

## API Endpoints Added (X total)
- METHOD /path - description

## Verification Commands
[list all curl commands that pass]

## Status
<promise>INTEGRATION_COMPLETE</promise>
```

---

## BEGIN EXECUTION

Start with TICKET-000. Execute each ticket fully before moving to the next.
Do NOT output the completion promise until ALL tickets are verified.
