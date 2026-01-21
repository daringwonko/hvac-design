# MEP Design Studio - Issue Registry

**Generated:** 2026-01-21
**Source:** Scout Phase (SPRINT-001-IMPORT-ARCHITECTURE)
**Status:** AWAITING FIX EXECUTION

---

## Issue Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 BLOCKING | 2 | Prevents app startup |
| 🟠 CRITICAL | 4 | Runtime failures |
| 🟡 MEDIUM | 3 | Maintenance burden |
| 🟢 LOW | 2 | Minor improvements |

---

## 🔴 BLOCKING ISSUES

### BLOCK-001: projects.py Relative Import Beyond Top-Level Package

| Field | Value |
|-------|-------|
| **File** | `/engine/api/routes/projects.py` |
| **Line** | 14 |
| **Error** | `ImportError: attempted relative import beyond top-level package` |

**Current Code:**
```python
from ...core.project_database import ProjectDatabase
```

**Root Cause:**
When running `python -m api.app` from `/engine`, Python establishes `api` as the top-level package. The three-dot relative import (`...`) attempts to traverse:
- `.` → `projects.py` (current module)
- `..` → `routes/` (parent package)
- `...` → `api/` (grandparent = top-level)
- Beyond `api` → **FORBIDDEN**

Python cannot import from outside the top-level package using relative imports.

**Fix Strategy (Option C):**
Change `start.sh` to run from project root as `python -m engine.api.app`, making `engine` the top-level package. Then relative imports work correctly.

---

### BLOCK-002: core/__init__.py Imports Non-Existent Function

| Field | Value |
|-------|-------|
| **File** | `/engine/core/__init__.py` |
| **Line** | 27 |
| **Error** | `ImportError: cannot import name 'setup_logging' from 'core.logging_config'` |

**Current Code:**
```python
from .logging_config import setup_logging
```

**Root Cause:**
The function in `logging_config.py` is named `configure_logging`, not `setup_logging`.

**Fix:**
```python
from .logging_config import configure_logging
```

---

## 🟠 CRITICAL ISSUES

### CRIT-001: Unprotected Imports in Route Files

| Field | Value |
|-------|-------|
| **Files** | `hvac.py:16`, `electrical.py:15`, `plumbing.py:15` |
| **Impact** | If `design.mep_systems` fails to import, entire Flask app crashes |

**Current Code (hvac.py example):**
```python
from design.mep_systems import MEPSystemEngine, Room, HVACType, HVACDesign
```

**Problem:** No try/except protection. Compare to `calculations.py` which does it correctly:
```python
try:
    from core.ceiling_panel_calc import CeilingPanelCalculator, ...
    CALC_AVAILABLE = True
except ImportError:
    CALC_AVAILABLE = False
    CeilingPanelCalculator = None
```

**Fix:** Add try/except wrapper with graceful degradation flag.

---

### CRIT-002: HVAC Enum Value Mismatch

| Field | Value |
|-------|-------|
| **File** | `/engine/api/routes/hvac.py` |
| **Lines** | 92-98 |
| **Impact** | Runtime errors for certain system types |

**Code References Non-Existent Enum Values:**
```python
type_mapping = {
    'MINI_SPLIT': HVACType.MINI_SPLIT,      # ❌ DOESN'T EXIST
    'DUCTED': HVACType.DUCTED,              # ❌ DOESN'T EXIST
    'RADIANT': HVACType.RADIANT,            # ❌ DOESN'T EXIST
    'VRF': HVACType.VRF,                    # ✅ exists
    'SPLIT_SYSTEM': HVACType.SPLIT_SYSTEM,  # ✅ exists
}
```

**Actual HVACType Enum (mep_systems.py:21-27):**
```python
class HVACType(Enum):
    SPLIT_SYSTEM = "split_system"
    VRF = "vrf"
    CHILLED_WATER = "chilled_water"
    PACKAGE_UNIT = "package_unit"
```

**Fix Options:**
1. Add missing enum values to `mep_systems.py`
2. Update `hvac.py` mapping to use existing values

---

### CRIT-003: engine/__init__.py Uses Absolute Import

| Field | Value |
|-------|-------|
| **File** | `/engine/__init__.py` |
| **Line** | 24 |
| **Impact** | Forces all route files to use sys.path workarounds |

**Current Code:**
```python
from core import (
    CeilingPanelCalculator,
    ...
)
```

**Should Be:**
```python
from .core import (
    CeilingPanelCalculator,
    ...
)
```

**Root Cause:** Using `from core` instead of `from .core` assumes `core` is directly on `sys.path`, which only works when running from inside `/engine`.

---

### CRIT-004: start.sh Runs From Wrong Directory

| Field | Value |
|-------|-------|
| **File** | `/start.sh` |
| **Lines** | 21-22 |
| **Impact** | Root cause of all import architecture issues |

**Current Code:**
```bash
cd engine
python -m api.app
```

**Problem:** Running from `/engine` makes `api` the top-level package, not `engine`.

**Fix (Option C):**
```bash
cd "$SCRIPT_DIR"  # Stay in project root
python -m engine.api.app
```

---

## 🟡 MEDIUM ISSUES

### MED-001: Inconsistent Import Patterns

| Pattern | Files Using |
|---------|-------------|
| sys.path manipulation | calculations.py, hvac.py, electrical.py, plumbing.py, materials.py, exports.py |
| Relative import | projects.py |
| Protected (try/except) | calculations.py, materials.py, exports.py, health.py |
| Unprotected | hvac.py, electrical.py, plumbing.py, projects.py |

**Impact:** Cognitive overhead for developers, inconsistent failure modes.

---

### MED-002: Missing Dependencies Not Documented

Flask, flask-cors, PyJWT are required but may not be in requirements.txt.

---

### MED-003: No Logging of Import Failures

When imports fail in try/except blocks, no log entry is created, making production debugging difficult.

---

## 🟢 LOW ISSUES

### LOW-001: Late Imports of json Module

**File:** `projects.py` lines 98, 163, 232, 287, 418

`import json` appears inside functions instead of at module level.

### LOW-002: Goldilocks Floorplan File Location

**File:** `floor_plan.py`

File path for `goldilocks_3b3b_floorplan.json` unverified but gracefully handled.

---

## Dependency Graph

```
BLOCK-002 (core/__init__.py)
    │
    ▼
CRIT-004 (start.sh) ──────────────────┐
    │                                 │
    ▼                                 ▼
CRIT-003 (engine/__init__.py)    BLOCK-001 (projects.py)
    │                                 │
    ▼                                 ▼
CRIT-001 (hvac/electrical/plumbing)  All route imports
    │
    ▼
CRIT-002 (enum mismatch)
```

**Fix Order:**
1. BLOCK-002 first (core module must load)
2. CRIT-004 (change execution context)
3. CRIT-003 (engine/__init__.py relative imports)
4. BLOCK-001 (projects.py - may self-resolve after #2-3)
5. CRIT-001 (add try/except protection)
6. CRIT-002 (enum alignment)
7. MED-* and LOW-* (cleanup)
