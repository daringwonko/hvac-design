# SPRINT 005 - MASTER EXECUTION PLAN
## Codename: LET'S GO!
## Status: EXECUTION PHASE - IN PROGRESS

---

## USER PRIORITY DIRECTIVE

| Priority | Directive |
|----------|-----------|
| **#1** | Session Experience First |
| **#2** | ALL 93 Tickets - No Cuts |
| **#3** | WebSocket Priority (Offline-First) |
| **#4** | MM Precision for Structural Elements |
| **#5** | Comprehensive Canadian Code Support |
| **#6** | Order: Foundation → Session → Code → Backend |

---

## EXECUTION WAVES

### WAVE 1: CRITICAL BUG FIXES + FOUNDATION
**Priority: IMMEDIATE | Status: STARTING**

| Order | Ticket | Title | Complexity | Rationale |
|-------|--------|-------|------------|-----------|
| 1.01 | MOUSE-003 | Background Rect Intercepts Mousedown | SIMPLE | Unblocks ALL room selection |
| 1.02 | MOUSE-002 | Throttle Function Duplicated | SIMPLE | Code hygiene, reduces bugs |
| 1.03 | MOUSE-001 | Resize Handle Occlusion | SIMPLE | Core resize functionality |
| 1.04 | MOUSE-009 | Resize Handle Area Too Small | SIMPLE | Usability critical |
| 1.05 | STATE-001 | Router Components Bypass Zustand | MODERATE | Unblocks all state work |
| 1.06 | WORKFLOW-001 | Session Context Across Navigation | MODERATE | Foundation for session |
| 1.07 | WORKFLOW-002 | Floor Plan Store Shared | SIMPLE | Data flows to modules |
| 1.08 | API-003 | Health Check Fix | SIMPLE | Quick win (30 min) |
| 1.09 | API-004 | WebSocket Integration | MODERATE | **USER PRIORITY: Offline-first** |
| 1.10 | MOUSE-004 | Box Selection Visual Events | MODERATE | Selection UX polish |
| 1.11 | MOUSE-005 | Room3D Multi-Select | SIMPLE | 3D selection parity |
| 1.12 | MOUSE-006 | 2D/3D Selection Sync | MODERATE | View consistency |
| 1.13 | MOUSE-007 | Coordinates.js Usage | MODERATE | Utility consolidation |
| 1.14 | MOUSE-008 | Throttled Move/Drag Sync | MODERATE | Interaction polish |
| 1.15 | MOUSE-010 | Room Label Pointer Docs | TRIVIAL | Documentation |

**Wave 1 Total: 15 tickets | Est: 5-6 days**

---

### WAVE 2: SESSION EXPERIENCE
**Priority: USER #1 | Status: PENDING**

| Order | Ticket | Title | Complexity | Rationale |
|-------|--------|-------|------------|-----------|
| 2.01 | UX-001 | Session State Architecture | COMPLEX | **Foundation for ALL session work** |
| 2.02 | UX-002 | Cross-Module Data Flow Pipeline | COMPLEX | Module connectivity |
| 2.03 | UX-003 | Session State Manager + Completion | MODERATE | Progress tracking |
| 2.04 | UX-006 | Connect Projects to Session | COMPLEX | Project → Session bridge |
| 2.05 | UX-007 | Enhanced DXF Importer | COMPLEX | **MM precision - USER PRIORITY** |
| 2.06 | UX-018 | Room Type Inference from DXF | MODERATE | Smart detection |
| 2.07 | UX-008 | Auto-Populate HVAC w/ Canadian Code | COMPLEX | Session → HVAC flow |
| 2.08 | UX-009 | Auto-Infer Electrical from Rooms | COMPLEX | Session → Electrical flow |
| 2.09 | UX-010 | Auto-Populate Plumbing | MODERATE | Session → Plumbing flow |
| 2.10 | UX-004 | Breadcrumb Navigation + Progress | MODERATE | UX navigation |
| 2.11 | UX-005 | Module Completion Indicators | SIMPLE | Visual progress |
| 2.12 | UX-011 | Session Context in ImportDialog | MODERATE | Import flow |
| 2.13 | UX-015 | Connect Routers to Session Store | COMPLEX | Router wiring |
| 2.14 | UX-016 | Building Code Config Interface | MODERATE | Code selection UI |
| 2.15 | UX-012 | Session Summary Dashboard | MODERATE | Overview panel |
| 2.16 | UX-013 | Module Edit/Skip Workflow | MODERATE | Navigation UX |
| 2.17 | UX-014 | Session Validation Pre-Nav | SIMPLE | Data integrity |
| 2.18 | UX-019 | Module Exit + Auto-Save | MODERATE | Save strategy |
| 2.19 | UX-017 | Session Persistence to Backend | COMPLEX | Backend save |
| 2.20 | UX-020 | Guided Onboarding | SIMPLE | First-run UX |

**Wave 2 Total: 20 tickets | Est: 10-12 days**

---

### WAVE 3: CANADIAN CODE + MODULE CONNECTIVITY
**Priority: PROFESSIONAL COMPLIANCE | Status: PENDING**

#### 3A: Canadian Electrical Code (CEC)

| Order | Ticket | Title | Complexity | Rationale |
|-------|--------|-------|------------|-----------|
| 3.01 | CEC-014 | Jurisdiction Detection/Switching | COMPLEX | **Unlocks all CEC** |
| 3.02 | CEC-001 | CEC Framework Infrastructure | COMPLEX | Code rule engine |
| 3.03 | CEC-011 | Room Type Classification System | SIMPLE | Room → Code mapping |
| 3.04 | CEC-003 | AFCI Validation (Bedrooms) | MODERATE | User requirement |
| 3.05 | CEC-002 | Receptacle Spacing (12ft/wall) | COMPLEX | **MM precision - USER PRIORITY** |
| 3.06 | CEC-006 | Receptacle Height (16") | SIMPLE | User requirement |
| 3.07 | CEC-004 | Circuit Amperage by Room | MODERATE | 15A/20A rules |
| 3.08 | CEC-007 | Kitchen Circuit Requirements | MODERATE | 20A kitchen |
| 3.09 | CEC-008 | Stove/Range 220-240V | SIMPLE | High-power circuits |
| 3.10 | CEC-005 | GFCI Validation Enhancement | SIMPLE | 3ft from water |
| 3.11 | CEC-012 | Wire Gauge Selection | MODERATE | Ampacity tables |
| 3.12 | CEC-013 | Panel Load + Diversity | MODERATE | Load calculations |
| 3.13 | CEC-009 | NBC Structural References | MODERATE | Building code ties |
| 3.14 | CEC-010 | NECB Energy Compliance | MODERATE | Energy code |

#### 3B: Module Workflow Connectivity

| Order | Ticket | Title | Complexity | Rationale |
|-------|--------|-------|------------|-----------|
| 3.15 | WORKFLOW-003 | HVACRouter Room Data | SIMPLE | Floor plan → HVAC |
| 3.16 | WORKFLOW-004 | ElectricalRouter Room Data | SIMPLE | Floor plan → Elec |
| 3.17 | WORKFLOW-005 | PlumbingRouter Store Usage | SIMPLE | Floor plan → Plumb |
| 3.18 | WORKFLOW-006 | Data Propagation from Store | MODERATE | Store subscriptions |
| 3.19 | WORKFLOW-007 | Modules Don't Start Fresh | SIMPLE | State preservation |
| 3.20 | WORKFLOW-008 | Session Concept Tying Modules | MODERATE | Module orchestration |
| 3.21 | WORKFLOW-009 | Building Code Context | COMPLEX | Code availability |
| 3.22 | WORKFLOW-010 | Layout Navigation State | SIMPLE | Nav persistence |
| 3.23 | WORKFLOW-011 | Data Sync Between Modules | MODERATE | Cross-module sync |
| 3.24 | WORKFLOW-012 | Module State Persistence | SIMPLE | Save/restore |
| 3.25 | WORKFLOW-013 | Dashboard Session Init | MODERATE | Entry point |
| 3.26 | WORKFLOW-014 | Room Type → Code Requirements | MODERATE | Type-aware code |
| 3.27 | WORKFLOW-015 | Auto-Design Session Aware | SIMPLE | Session context |

**Wave 3 Total: 27 tickets | Est: 12-15 days**

---

### WAVE 4: STATE MANAGEMENT COMPLETION
**Priority: DATA INTEGRITY | Status: PENDING**

| Order | Ticket | Title | Complexity | Rationale |
|-------|--------|-------|------------|-----------|
| 4.01 | STATE-003 | Backend Persistence | COMPLEX | Data durability |
| 4.02 | STATE-002 | Selection Store Undo/Redo | SIMPLE | Edit recovery |
| 4.03 | STATE-004 | Cross-Module Propagation | MODERATE | Data flow |
| 4.04 | STATE-005 | 2D/3D Selection Sync | MODERATE | View consistency |
| 4.05 | STATE-006 | Tool State Sync | SIMPLE | Tool consistency |
| 4.06 | STATE-007 | Drawing State Undoable | SIMPLE | Draw recovery |
| 4.07 | STATE-008 | System Specs Storage | SIMPLE | Spec persistence |
| 4.08 | STATE-009 | Calculations Persisted | SIMPLE | Calc storage |
| 4.09 | STATE-010 | Store Init from URL/Project | MODERATE | Deep linking |
| 4.10 | STATE-011 | Store Subscriptions in Effects | SIMPLE | React patterns |
| 4.11 | STATE-012 | Validation Before Updates | MODERATE | Data integrity |
| 4.12 | STATE-013 | Export Uses Store Data | SIMPLE | Export accuracy |
| 4.13 | STATE-014 | Undo/Redo UI Controls | SIMPLE | UI buttons |
| 4.14 | STATE-015 | State Debugging Tools | SIMPLE | Dev tools |

**Wave 4 Total: 14 tickets | Est: 5-6 days**

---

### WAVE 5: BACKEND + POLISH
**Priority: PRODUCTION READY | Status: PENDING**

| Order | Ticket | Title | Complexity | Rationale |
|-------|--------|-------|------------|-----------|
| 5.01 | API-005 | Pydantic Schemas for MEP | MODERATE | Type safety |
| 5.02 | API-001 | MEP Routes Persistence | COMPLEX | Data durability |
| 5.03 | API-002 | Canadian Code Backend Validation | COMPLEX | Server-side code |
| 5.04 | API-006 | Database Error Handling | MODERATE | Resilience |
| 5.05 | API-007 | Floor Plan Project Context | MODERATE | Project binding |
| 5.06 | API-008 | Cross-System MEP Validation | COMPLEX | System integration |
| 5.07 | API-009 | Constraint Validation Formalized | MODERATE | Rule engine |
| 5.08 | API-010 | Cost Calculations Real Factors | MODERATE | Accuracy |
| 5.09 | API-011 | Equipment Placement Dynamic | COMPLEX | Smart placement |
| 5.10 | API-012 | Load Calculations Enhanced | COMPLEX | **Physics accuracy** |
| 5.11 | API-013 | Validation Response Format | MODERATE | API consistency |
| 5.12 | API-014 | Canadian Code Constants | SIMPLE | Code values |
| 5.13 | API-015 | Equipment Library DB | SIMPLE | Equipment data |
| 5.14 | API-016 | Request/Response Logging | SIMPLE | Observability |
| 5.15 | API-017 | Error Response Format | SIMPLE | API consistency |
| 5.16 | API-018 | MEP API Documentation | SIMPLE | Docs |
| 5.17 | API-019 | Endpoint Rate Limiting | SIMPLE | Protection |

**Wave 5 Total: 17 tickets | Est: 10-12 days**

---

## COMPLETE TICKET SUMMARY

| Wave | Focus | Tickets | Est. Days |
|------|-------|---------|-----------|
| **1** | Critical Bugs + Foundation | 15 | 5-6 |
| **2** | Session Experience | 20 | 10-12 |
| **3** | Canadian Code + Connectivity | 27 | 12-15 |
| **4** | State Management | 14 | 5-6 |
| **5** | Backend + Polish | 17 | 10-12 |
| **TOTAL** | **ALL TICKETS** | **93** | **42-51 days** |

---

## PRECISION REQUIREMENTS (USER DIRECTIVE)

### Structural Elements - MM Precision

| Element | Precision | Implementation |
|---------|-----------|----------------|
| **Walls** | ±1mm | Physics engine coordinate system |
| **Doors** | ±1mm | Frame detection from DXF |
| **Windows** | ±1mm | Aperture geometry extraction |
| **Receptacles** | ±1mm placement, exact spacing | CEC 12ft/wall validation |
| **Heights** | Exact (16" receptacle) | CEC height validation |

### Physics Resources to Leverage
- Load calculation formulas (ASHRAE)
- Heat loss/gain (Canadian climate zones)
- Electrical load (CEC Table 8B)
- Plumbing fixture units (NPC)

---

## EXECUTION CHECKLIST

- [x] Research Phase Complete (93 tickets catalogued)
- [x] User Feedback Received
- [x] Priorities Confirmed
- [x] Execution Plan Created
- [ ] **WAVE 1 IN PROGRESS**
- [ ] Wave 2 Pending
- [ ] Wave 3 Pending
- [ ] Wave 4 Pending
- [ ] Wave 5 Pending

---

## LET'S GO!

**Starting Wave 1: Critical Bug Fixes + Foundation**

*Sprint 005 Execution Phase - Initiated*
