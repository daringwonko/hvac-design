# Option C: Architectural Refactor - Complete Task List

**Strategy:** Change execution context to fix root cause, eliminate all workarounds
**Estimated Time:** 3-4 hours
**Risk Level:** HIGH (many files change, but eliminates tech debt)
**Tech Debt Impact:** ELIMINATES architectural debt

---

## Phase 1: Foundation Fixes (BLOCKING)
*Must complete before any other work*

### TASK-001: Fix core/__init__.py Function Name
| Field | Value |
|-------|-------|
| **Priority** | P0 - BLOCKING |
| **File** | `/engine/core/__init__.py` |
| **Line** | 27 |
| **Change** | `setup_logging` → `configure_logging` |
| **Dependencies** | None |
| **Verification** | `python -c "from engine.core import configure_logging"` |

**Code Change:**
```python
# Before
from .logging_config import setup_logging

# After
from .logging_config import configure_logging
```

---

## Phase 2: Execution Context Change (ROOT CAUSE)
*Changes how the app is launched*

### TASK-002: Modify start.sh Execution Context
| Field | Value |
|-------|-------|
| **Priority** | P0 - ROOT CAUSE |
| **File** | `/start.sh` |
| **Lines** | 21-22 |
| **Change** | Run from project root, not engine/ |
| **Dependencies** | TASK-001 |
| **Verification** | `./start.sh` starts without import errors |

**Code Change:**
```bash
# Before (lines 21-22)
cd engine
python -m api.app &

# After
cd "$SCRIPT_DIR"
python -m engine.api.app &
```

**Additional Changes Required:**
- Line 42: Update frontend path from `cd frontend` to `cd engine/frontend`

---

## Phase 3: Package Structure Fixes
*Make engine a proper Python package*

### TASK-003: Fix engine/__init__.py Imports
| Field | Value |
|-------|-------|
| **Priority** | P1 - CRITICAL |
| **File** | `/engine/__init__.py` |
| **Line** | 24 |
| **Change** | Absolute → Relative imports |
| **Dependencies** | TASK-002 |
| **Verification** | `python -c "import engine"` |

**Code Change:**
```python
# Before
from core import (
    CeilingPanelCalculator,
    CeilingDimensions,
    PanelSpacing,
    Material,
    PanelLayout,
    MATERIALS,
)

# After
from .core import (
    CeilingPanelCalculator,
    CeilingDimensions,
    PanelSpacing,
    Material,
    PanelLayout,
    MATERIALS,
)
```

### TASK-004: Fix engine/__init__.py Design Import
| Field | Value |
|-------|-------|
| **Priority** | P1 - CRITICAL |
| **File** | `/engine/__init__.py` |
| **Line** | 33 (approx) |
| **Change** | Absolute → Relative imports |
| **Dependencies** | TASK-003 |

**Code Change:**
```python
# Before
from design.mep_systems import (...)

# After
from .design.mep_systems import (...)
```

---

## Phase 4: Route File Refactoring
*Convert all routes to proper relative imports, remove sys.path hacks*

### TASK-005: Refactor projects.py Imports
| Field | Value |
|-------|-------|
| **Priority** | P1 - BLOCKING FIX |
| **File** | `/engine/api/routes/projects.py` |
| **Lines** | 13-14 |
| **Change** | Keep relative import (now works with new context) |
| **Dependencies** | TASK-002 |
| **Verification** | `python -c "from engine.api.routes.projects import projects_bp"` |

**Code Change:**
```python
# Current (broken with old context, works with new)
from ...core.project_database import ProjectDatabase

# Verify this works - if not, use:
from engine.core.project_database import ProjectDatabase
```

### TASK-006: Refactor hvac.py Imports
| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **File** | `/engine/api/routes/hvac.py` |
| **Lines** | 12-16 |
| **Change** | Remove sys.path hack, use relative import, add try/except |
| **Dependencies** | TASK-002 |

**Code Change:**
```python
# Before
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from design.mep_systems import MEPSystemEngine, Room, HVACType, HVACDesign

# After
try:
    from ...design.mep_systems import MEPSystemEngine, Room, HVACType, HVACDesign
    MEP_AVAILABLE = True
except ImportError as e:
    import logging
    logging.warning(f"MEP systems not available: {e}")
    MEP_AVAILABLE = False
    MEPSystemEngine = None
    Room = None
    HVACType = None
    HVACDesign = None
```

### TASK-007: Refactor electrical.py Imports
| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **File** | `/engine/api/routes/electrical.py` |
| **Lines** | 11-15 |
| **Change** | Same pattern as TASK-006 |
| **Dependencies** | TASK-002 |

### TASK-008: Refactor plumbing.py Imports
| Field | Value |
|-------|-------|
| **Priority** | P1 |
| **File** | `/engine/api/routes/plumbing.py` |
| **Lines** | 11-15 |
| **Change** | Same pattern as TASK-006 |
| **Dependencies** | TASK-002 |

### TASK-009: Refactor calculations.py Imports
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **File** | `/engine/api/routes/calculations.py` |
| **Lines** | 20-28 |
| **Change** | Remove sys.path hack, use relative import (keep try/except) |
| **Dependencies** | TASK-002 |

**Code Change:**
```python
# Before
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
try:
    from core.ceiling_panel_calc import (...)
    CALC_AVAILABLE = True
except ImportError:
    ...

# After
try:
    from ...core.ceiling_panel_calc import (...)
    CALC_AVAILABLE = True
except ImportError as e:
    import logging
    logging.warning(f"Ceiling panel calculator not available: {e}")
    CALC_AVAILABLE = False
    ...
```

### TASK-010: Refactor materials.py Imports
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **File** | `/engine/api/routes/materials.py` |
| **Lines** | 12-20 |
| **Change** | Remove sys.path hack, use relative import |
| **Dependencies** | TASK-002 |

### TASK-011: Refactor exports.py Imports
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **File** | `/engine/api/routes/exports.py` |
| **Lines** | 16-24 |
| **Change** | Remove sys.path hack, use relative import |
| **Dependencies** | TASK-002 |

### TASK-012: Refactor floor_plan.py Imports
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **File** | `/engine/api/routes/floor_plan.py` |
| **Change** | Verify imports work with new context, add protection if needed |
| **Dependencies** | TASK-002 |

### TASK-013: Refactor health.py Imports
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **File** | `/engine/api/routes/health.py` |
| **Line** | 59 |
| **Change** | Update unprotected import to use relative path |
| **Dependencies** | TASK-002 |

---

## Phase 5: Enum Alignment

### TASK-014: Add Missing HVAC Enum Values
| Field | Value |
|-------|-------|
| **Priority** | P1 - CRITICAL |
| **File** | `/engine/design/mep_systems.py` |
| **Lines** | 21-27 |
| **Change** | Add MINI_SPLIT, DUCTED, RADIANT to HVACType enum |
| **Dependencies** | None |

**Code Change:**
```python
# Before
class HVACType(Enum):
    SPLIT_SYSTEM = "split_system"
    VRF = "vrf"
    CHILLED_WATER = "chilled_water"
    PACKAGE_UNIT = "package_unit"

# After
class HVACType(Enum):
    SPLIT_SYSTEM = "split_system"
    MINI_SPLIT = "mini_split"
    VRF = "vrf"
    CHILLED_WATER = "chilled_water"
    PACKAGE_UNIT = "package_unit"
    DUCTED = "ducted"
    RADIANT = "radiant"
```

---

## Phase 6: Cleanup & Standardization

### TASK-015: Move json Imports to Module Level
| Field | Value |
|-------|-------|
| **Priority** | P3 - LOW |
| **File** | `/engine/api/routes/projects.py` |
| **Change** | Add `import json` at top, remove inline imports |
| **Dependencies** | TASK-005 |

### TASK-016: Add Import Failure Logging
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **Files** | All route files with try/except |
| **Change** | Add `logging.warning()` in except blocks |
| **Dependencies** | All route refactors |

### TASK-017: Verify requirements.txt
| Field | Value |
|-------|-------|
| **Priority** | P2 |
| **File** | `/requirements.txt` |
| **Change** | Ensure flask, flask-cors, PyJWT, pydantic listed |
| **Dependencies** | None |

---

## Phase 7: Validation

### TASK-018: Run Full Import Verification
| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Command** | `cd /home/user/hvac-design && python -c "from engine.api.app import create_app; app = create_app(); print('SUCCESS')"` |
| **Dependencies** | All previous tasks |

### TASK-019: Run Integration Tests
| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Command** | `./test_integration.sh` |
| **Dependencies** | TASK-018 |

### TASK-020: Manual Startup Test
| Field | Value |
|-------|-------|
| **Priority** | P0 |
| **Command** | `./start.sh` then verify health endpoint |
| **Dependencies** | TASK-019 |

---

## Task Summary

| Phase | Tasks | Priority | Parallel? |
|-------|-------|----------|-----------|
| Phase 1: Foundation | TASK-001 | P0 | No |
| Phase 2: Execution Context | TASK-002 | P0 | No |
| Phase 3: Package Structure | TASK-003, TASK-004 | P1 | Yes |
| Phase 4: Route Refactoring | TASK-005 to TASK-013 | P1-P2 | Yes (different files) |
| Phase 5: Enum Alignment | TASK-014 | P1 | Yes |
| Phase 6: Cleanup | TASK-015 to TASK-017 | P2-P3 | Yes |
| Phase 7: Validation | TASK-018 to TASK-020 | P0 | No (sequential) |

**Total Tasks:** 20
**Parallelizable:** 15 (across phases 3-6)
**Sequential Gates:** 5 (Phase 1, 2, 7)
