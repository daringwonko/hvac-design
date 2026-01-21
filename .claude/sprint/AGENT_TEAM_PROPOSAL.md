# Agent Team Composition for Option C Sprint

**Sprint:** SPRINT-001-IMPORT-ARCHITECTURE (Option C Execution)
**Total Tasks:** 20
**Estimated Duration:** 3-4 hours
**Parallelization Opportunity:** 75% of tasks

---

## Team Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MAIN CONTEXT (Claude)                           │
│  • Strategic oversight                                                  │
│  • Approves fix strategies                                              │
│  • Reviews escalations                                                  │
│  • Final commit approval                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (1 Agent)                               │
│  • Coordinates all phases                                               │
│  • Tracks task dependencies                                             │
│  • Compiles status reports                                              │
│  • Manages escalation queue                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                DEPLOYMENT STRATEGIST (1 Agent)                          │
│  • File lock management                                                 │
│  • Parallel batch calculation                                           │
│  • Retry logic (2x before escalate)                                     │
│  • Collision prevention                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                    │                           │
         ┌──────────┴──────────┐     ┌──────────┴──────────┐
         ▼                     ▼     ▼                     ▼
    ┌─────────┐          ┌─────────┐ ┌─────────┐     ┌─────────┐
    │ FIXERS  │          │ FIXERS  │ │VALIDATOR│     │VALIDATOR│
    │ (Pool)  │          │ (Pool)  │ │ (Pool)  │     │ (Pool)  │
    └─────────┘          └─────────┘ └─────────┘     └─────────┘
```

---

## Agent Inventory

### Tier 1: Coordination Layer

| Role | Count | Responsibility |
|------|-------|----------------|
| **Orchestrator** | 1 | Phase sequencing, dependency tracking, status compilation |
| **Deployment Strategist** | 1 | File locks, parallel batching, retry management |

**Subtotal:** 2 agents

---

### Tier 2: Execution Layer - Fixers

| Fixer ID | Assigned Tasks | Files | Can Parallelize With |
|----------|----------------|-------|----------------------|
| **FIXER-001** | TASK-001 | core/__init__.py | None (P0 blocker) |
| **FIXER-002** | TASK-002 | start.sh | FIXER-001 complete first |
| **FIXER-003** | TASK-003, TASK-004 | engine/__init__.py | FIXER-004 through FIXER-011 |
| **FIXER-004** | TASK-005 | projects.py | FIXER-003, 005-011 |
| **FIXER-005** | TASK-006 | hvac.py | FIXER-003, 004, 006-011 |
| **FIXER-006** | TASK-007 | electrical.py | FIXER-003, 004, 005, 007-011 |
| **FIXER-007** | TASK-008 | plumbing.py | FIXER-003, 004-006, 008-011 |
| **FIXER-008** | TASK-009 | calculations.py | FIXER-003-007, 009-011 |
| **FIXER-009** | TASK-010, TASK-011 | materials.py, exports.py | FIXER-003-008, 010-011 |
| **FIXER-010** | TASK-012, TASK-013 | floor_plan.py, health.py | FIXER-003-009, 011 |
| **FIXER-011** | TASK-014 | mep_systems.py | FIXER-003-010 |
| **FIXER-012** | TASK-015, TASK-016, TASK-017 | Cleanup tasks | After all P1 complete |

**Subtotal:** 12 Fixer agents

---

### Tier 3: Validation Layer

| Validator ID | Assigned Tasks | Validates |
|--------------|----------------|-----------|
| **VALIDATOR-001** | TASK-018 | Full import chain |
| **VALIDATOR-002** | TASK-019 | Integration tests |
| **VALIDATOR-003** | TASK-020 | Manual startup verification |

**Subtotal:** 3 Validator agents

---

## Total Agent Count

| Tier | Agents | Purpose |
|------|--------|---------|
| Coordination | 2 | Orchestrator + Deployment Strategist |
| Execution (Fixers) | 12 | Apply code changes |
| Validation | 3 | Verify fixes work |
| **TOTAL** | **17** | |

---

## Execution Timeline

### Wave 1: Foundation (Sequential)
```
Time 0 ──────────────────────────────────────────────────────────────▶

FIXER-001: TASK-001 (core/__init__.py)
           └──▶ FIXER-002: TASK-002 (start.sh)
```
**Duration:** ~15 minutes
**Agents Active:** 2 (sequential)

### Wave 2: Package & Routes (Parallel)
```
Time 15min ──────────────────────────────────────────────────────────▶

FIXER-003: engine/__init__.py ─────┐
FIXER-004: projects.py ────────────┤
FIXER-005: hvac.py ────────────────┤
FIXER-006: electrical.py ──────────┼──▶ All complete
FIXER-007: plumbing.py ────────────┤
FIXER-008: calculations.py ────────┤
FIXER-009: materials.py, exports.py┤
FIXER-010: floor_plan.py, health.py┤
FIXER-011: mep_systems.py ─────────┘
```
**Duration:** ~45 minutes
**Agents Active:** 9 (parallel)

### Wave 3: Cleanup (Parallel)
```
Time 60min ──────────────────────────────────────────────────────────▶

FIXER-012: TASK-015, 016, 017 (cleanup)
```
**Duration:** ~15 minutes
**Agents Active:** 1

### Wave 4: Validation (Sequential)
```
Time 75min ──────────────────────────────────────────────────────────▶

VALIDATOR-001: Import verification
               └──▶ VALIDATOR-002: Integration tests
                    └──▶ VALIDATOR-003: Startup test
```
**Duration:** ~30 minutes
**Agents Active:** 3 (sequential, each depends on previous)

---

## Parallel Batch Plan

| Batch | Agents | Files | Duration |
|-------|--------|-------|----------|
| Batch 1 | FIXER-001 | core/__init__.py | 5 min |
| Batch 2 | FIXER-002 | start.sh | 10 min |
| Batch 3 | FIXER-003 to FIXER-011 | 9 files | 45 min (parallel) |
| Batch 4 | FIXER-012 | 3 files (cleanup) | 15 min |
| Batch 5 | VALIDATOR-001 | Imports | 10 min |
| Batch 6 | VALIDATOR-002 | Tests | 10 min |
| Batch 7 | VALIDATOR-003 | Startup | 10 min |

**Total Estimated:** ~105 minutes (1 hour 45 min)

---

## Risk Mitigation

### Collision Prevention
- Deployment Strategist maintains file locks
- No two Fixers touch same file simultaneously
- Wave 2 agents all touch DIFFERENT files

### Failure Handling
1. Fixer fails → Deployment Strategist retries (up to 2x)
2. Still fails → Escalate to Orchestrator
3. Orchestrator batches escalations for leadership review

### Rollback Strategy
- Each Fixer records pre-change state
- Git branch created before sprint starts
- Any Validator failure → full rollback available via `git checkout`

---

## Success Criteria

| Criterion | Verification |
|-----------|--------------|
| All imports resolve | `python -c "from engine.api.app import create_app"` |
| No sys.path hacks remain | `grep -r "sys.path.insert" engine/api/routes/` returns empty |
| All routes protected | Every route has try/except for external imports |
| Enum values aligned | hvac.py type_mapping matches HVACType enum |
| App starts cleanly | `./start.sh` shows "Backend ready!" |
| Integration tests pass | `./test_integration.sh` returns exit code 0 |

---

## Agent Deployment Recommendation

**Recommended Approach:** Deploy in waves, not all at once

1. **Deploy Wave 1** (2 Fixers) → Wait for completion
2. **Deploy Wave 2** (9 Fixers in parallel) → Wait for completion
3. **Deploy Wave 3** (1 Fixer) → Wait for completion
4. **Deploy Wave 4** (3 Validators sequentially)

This approach:
- ✅ Respects dependency chain
- ✅ Maximizes parallelism where safe
- ✅ Provides checkpoint after each wave
- ✅ Allows leadership review between waves if desired
