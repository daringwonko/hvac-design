# SPRINT 005 - COMPREHENSIVE TICKET MANIFEST
## Codename: TOTAL_SYSTEM_DEEP_DIVE
## Research Phase Complete - Awaiting Approval

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| **Total Scouts Deployed** | 56 |
| **Total Synthesizers** | 6 |
| **Total Tickets Generated** | 93 |
| **Critical Tickets** | 25 |
| **High Priority Tickets** | 32 |
| **Medium Priority Tickets** | 29 |
| **Low Priority Tickets** | 7 |

---

## TICKET BREAKDOWN BY CATEGORY

### SYNTH-1: Mouse/Interaction Bugs (10 tickets)

| ID | Title | Priority | Complexity |
|----|-------|----------|------------|
| MOUSE-001 | Resize Handle Occlusion by Room Stroke | HIGH | SIMPLE |
| MOUSE-002 | Throttle Function Duplicated Instead of Imported | CRITICAL | SIMPLE |
| MOUSE-003 | Background Rect Intercepts Mousedown Breaking Box Selection | CRITICAL | SIMPLE |
| MOUSE-004 | Box Selection Visual Not Blocking Events During Selection | MEDIUM | MODERATE |
| MOUSE-005 | Room3D Click Only Supports Single Select | HIGH | SIMPLE |
| MOUSE-006 | Selection State Desync Between 2D and 3D Views | HIGH | MODERATE |
| MOUSE-007 | Coordinates.js Utility Module Completely Unused | MEDIUM | MODERATE |
| MOUSE-008 | Throttled Mouse Move and Drag/Resize Sync Issues | MEDIUM | MODERATE |
| MOUSE-009 | Resize Handle Interaction Area Too Small | MEDIUM | SIMPLE |
| MOUSE-010 | Room Label Pointer Events Documentation | LOW | TRIVIAL |

**Subtotal: 2 CRITICAL, 3 HIGH, 4 MEDIUM, 1 LOW**

---

### SYNTH-2: State Management Gaps (15 tickets)

| ID | Title | Priority | Complexity |
|----|-------|----------|------------|
| STATE-001 | Router Components Bypass Zustand Stores | CRITICAL | MODERATE |
| STATE-002 | Missing Undo/Redo in Selection Store | HIGH | SIMPLE |
| STATE-003 | Data Not Persisted to Backend | CRITICAL | COMPLEX |
| STATE-004 | No Cross-Module Data Propagation | HIGH | MODERATE |
| STATE-005 | Selection State Desync Between 2D/3D Views | HIGH | MODERATE |
| STATE-006 | Tool State Not Synchronized | MEDIUM | SIMPLE |
| STATE-007 | Drawing State Not Undoable | MEDIUM | SIMPLE |
| STATE-008 | No System Specifications Stored | MEDIUM | SIMPLE |
| STATE-009 | Calculations State Not Persisted | MEDIUM | SIMPLE |
| STATE-010 | No Store Initialization from URL/Project ID | MEDIUM | MODERATE |
| STATE-011 | Missing Store Subscriptions in Effects | MEDIUM | SIMPLE |
| STATE-012 | No Validation Before Store Updates | MEDIUM | MODERATE |
| STATE-013 | Export Functionality Doesn't Use Store Data | LOW | SIMPLE |
| STATE-014 | No Undo/Redo UI Controls | LOW | SIMPLE |
| STATE-015 | Missing State Debugging Tools | LOW | SIMPLE |

**Subtotal: 2 CRITICAL, 3 HIGH, 7 MEDIUM, 3 LOW**

---

### SYNTH-3: API/Backend Integration (19 tickets)

| ID | Title | Priority | Complexity |
|----|-------|----------|------------|
| API-001 | MEP Routes Stateless - No Persistence | CRITICAL | COMPLEX |
| API-002 | Canadian Electrical Code Compliance Missing | CRITICAL | COMPLEX |
| API-003 | Health Check Status Hardcoded | CRITICAL | SIMPLE |
| API-004 | WebSocket Handlers Not Integrated | CRITICAL | MODERATE |
| API-005 | No Pydantic Schemas for MEP Entities | CRITICAL | MODERATE |
| API-006 | Database Error Handling Absent | HIGH | MODERATE |
| API-007 | Floor Plan Has No Project Context | HIGH | MODERATE |
| API-008 | Zero Cross-System MEP Validation | HIGH | COMPLEX |
| API-009 | Constraint Validation Ad-Hoc | HIGH | MODERATE |
| API-010 | Cost Calculations Missing Real Factors | HIGH | MODERATE |
| API-011 | Equipment Placement Hardcoded | HIGH | COMPLEX |
| API-012 | Load Calculations Oversimplified | HIGH | COMPLEX |
| API-013 | Validation Responses Inconsistent | HIGH | MODERATE |
| API-014 | Missing Canadian Code Compliance Constants | MEDIUM | SIMPLE |
| API-015 | Equipment Library Database Not Used | MEDIUM | SIMPLE |
| API-016 | No Request/Response Logging | MEDIUM | SIMPLE |
| API-017 | Error Response Format Inconsistent | MEDIUM | SIMPLE |
| API-018 | MEP API Documentation Missing | MEDIUM | SIMPLE |
| API-019 | No Endpoint Rate Limiting | MEDIUM | SIMPLE |

**Subtotal: 5 CRITICAL, 8 HIGH, 6 MEDIUM**

---

### SYNTH-4: Module Workflow Connectivity (15 tickets)

| ID | Title | Priority | Complexity |
|----|-------|----------|------------|
| WORKFLOW-001 | Session Context Not Maintained Across Navigation | CRITICAL | MODERATE |
| WORKFLOW-002 | Floor Plan Store Not Shared Across Modules | CRITICAL | SIMPLE |
| WORKFLOW-003 | HVACRouter Receives No Room Data | CRITICAL | SIMPLE |
| WORKFLOW-004 | ElectricalRouter Receives No Room Data | CRITICAL | SIMPLE |
| WORKFLOW-005 | PlumbingRouter Uses Fetch Instead of Store | CRITICAL | SIMPLE |
| WORKFLOW-006 | No Data Propagation from floorPlanStore | HIGH | MODERATE |
| WORKFLOW-007 | Modules Start from Scratch | HIGH | SIMPLE |
| WORKFLOW-008 | No Session Concept Tying Modules | HIGH | MODERATE |
| WORKFLOW-009 | No Building Code Context Available | HIGH | COMPLEX |
| WORKFLOW-010 | Layout Doesn't Preserve Navigation State | MEDIUM | SIMPLE |
| WORKFLOW-011 | No Data Sync Between Module Changes | MEDIUM | MODERATE |
| WORKFLOW-012 | No Module State Persistence | MEDIUM | SIMPLE |
| WORKFLOW-013 | Dashboard Has No Session Initialization | HIGH | MODERATE |
| WORKFLOW-014 | Room Type Info Doesn't Flow to Code Requirements | HIGH | MODERATE |
| WORKFLOW-015 | Auto-Design Features Don't Account for Session | MEDIUM | SIMPLE |

**Subtotal: 5 CRITICAL, 6 HIGH, 4 MEDIUM**

---

### SYNTH-5: Building Code Compliance (14 tickets)

| ID | Title | Priority | Complexity |
|----|-------|----------|------------|
| CEC-001 | Missing Canadian Electrical Code Framework | CRITICAL | COMPLEX |
| CEC-002 | No Receptacle Spacing Validation | CRITICAL | COMPLEX |
| CEC-003 | No Arc-Fault Circuit Breaker (AFCI) Validation | CRITICAL | MODERATE |
| CEC-004 | No Circuit Amperage Validation by Room Type | CRITICAL | MODERATE |
| CEC-005 | Weak GFCI Validation - String Matching | HIGH | SIMPLE |
| CEC-006 | No Receptacle Height Validation | HIGH | SIMPLE |
| CEC-007 | No Kitchen Circuit Special Requirements | HIGH | MODERATE |
| CEC-008 | No Stove/Range Circuit Validation | HIGH | SIMPLE |
| CEC-009 | No NBC Structural Load References | HIGH | MODERATE |
| CEC-010 | No NECB Energy Compliance | HIGH | MODERATE |
| CEC-011 | Missing Room Type Classification System | MEDIUM | SIMPLE |
| CEC-012 | Incomplete Wire Gauge Selection | MEDIUM | MODERATE |
| CEC-013 | No Panel Load Calculation/Diversity Factor | MEDIUM | MODERATE |
| CEC-014 | No Code Jurisdiction Detection/Switching | MEDIUM | COMPLEX |

**Subtotal: 4 CRITICAL, 6 HIGH, 4 MEDIUM**

---

### SYNTH-6: Session Experience Design (20 tickets)

| ID | Title | Priority | Complexity |
|----|-------|----------|------------|
| UX-001 | Design Session State Architecture | CRITICAL | COMPLEX |
| UX-002 | Create Cross-Module Data Flow Pipeline | CRITICAL | COMPLEX |
| UX-003 | Session State Manager with Completion Tracking | CRITICAL | MODERATE |
| UX-004 | Breadcrumb Navigation with Progress Indicator | HIGH | MODERATE |
| UX-005 | Module Completion Status Indicators | HIGH | SIMPLE |
| UX-006 | Connect Projects/ProjectDetail to Session | CRITICAL | COMPLEX |
| UX-007 | Enhance DXF Importer with Geometry Extraction | CRITICAL | COMPLEX |
| UX-008 | Auto-Populate HVAC with Canadian Code | CRITICAL | COMPLEX |
| UX-009 | Auto-Infer Electrical from Room Types | CRITICAL | COMPLEX |
| UX-010 | Auto-Populate Plumbing from Room Types | HIGH | MODERATE |
| UX-011 | Preserve Session Context in ImportDialog | HIGH | MODERATE |
| UX-012 | Create Session Summary Dashboard | MEDIUM | MODERATE |
| UX-013 | Implement Module Edit/Skip Workflow | MEDIUM | MODERATE |
| UX-014 | Add Session Validation Pre-Navigation | MEDIUM | SIMPLE |
| UX-015 | Connect Routers to Session Store | HIGH | COMPLEX |
| UX-016 | Create Building Code Configuration Interface | HIGH | MODERATE |
| UX-017 | Implement Session Persistence to Backend | MEDIUM | COMPLEX |
| UX-018 | Add Room Type Inference from DXF | HIGH | MODERATE |
| UX-019 | Create Module Exit Strategy with Auto-Save | MEDIUM | MODERATE |
| UX-020 | Add Guided Onboarding for New Session | LOW | SIMPLE |

**Subtotal: 7 CRITICAL, 7 HIGH, 5 MEDIUM, 1 LOW**

---

## CRITICAL PATH ANALYSIS

### Phase 0: Foundation (Must Complete First)

These tickets UNBLOCK all other work:

1. **UX-001** - Session State Architecture
2. **WORKFLOW-001** - Session Context Across Navigation
3. **STATE-001** - Connect Router Components to Zustand Stores
4. **API-003** - Fix Health Check (Quick Win)

### Phase 1: Core Plumbing (Week 1-2)

| Order | Ticket | Reason |
|-------|--------|--------|
| 1 | MOUSE-003 | Unblocks box selection (users can't select rooms!) |
| 2 | MOUSE-002 | Consolidate throttle utility |
| 3 | MOUSE-001 | Fix resize handle occlusion |
| 4 | STATE-001 | Connect routers to stores |
| 5 | STATE-003 | Enable persistence |
| 6 | WORKFLOW-002 | Share floor plan store |
| 7 | WORKFLOW-003/004/005 | Connect MEP routers to floor plan |

### Phase 2: Canadian Code Compliance (Week 2-3)

| Order | Ticket | Reason |
|-------|--------|--------|
| 8 | CEC-014 | Jurisdiction detection (unblocks all CEC) |
| 9 | CEC-001 | CEC framework infrastructure |
| 10 | CEC-011 | Room type classification |
| 11 | CEC-003 | AFCI for bedrooms (user requirement) |
| 12 | CEC-002 | Receptacle spacing (user requirement) |
| 13 | CEC-004 | Circuit amperage by room |
| 14 | CEC-006 | Receptacle height (user requirement: 16") |

### Phase 3: Session Experience (Week 3-4)

| Order | Ticket | Reason |
|-------|--------|--------|
| 15 | UX-002 | Cross-module data flow |
| 16 | UX-003 | Session state manager |
| 17 | UX-006 | Projects/ProjectDetail session |
| 18 | UX-008 | HVAC code auto-population |
| 19 | UX-009 | Electrical auto-population |
| 20 | UX-007 | Enhanced DXF importer |

### Phase 4: API/Backend (Week 4-5)

| Order | Ticket | Reason |
|-------|--------|--------|
| 21 | API-005 | Pydantic schemas for MEP |
| 22 | API-001 | MEP persistence integration |
| 23 | API-004 | WebSocket integration |
| 24 | API-002 | Canadian code backend validation |

### Phase 5: Polish & Quality (Week 5-6)

Remaining HIGH and MEDIUM tickets prioritized by impact.

---

## USER REQUIREMENT COVERAGE

### Original Bug Report: "Only some surfaces allow resizing"

| Ticket | How It Addresses Bug |
|--------|---------------------|
| MOUSE-001 | Room stroke occludes resize handles |
| MOUSE-003 | Background rect intercepts mousedown |
| MOUSE-009 | Resize handles too small |

### Original Bug Report: "Workflow disconnected between modules"

| Ticket | How It Addresses Bug |
|--------|---------------------|
| WORKFLOW-001 | Session context lost on navigation |
| WORKFLOW-002-005 | Stores not shared between modules |
| STATE-001 | Routers bypass Zustand stores |
| UX-001-003 | Session architecture missing |

### User Story: Canadian Electrical Code Compliance

| Requirement | Ticket(s) |
|-------------|-----------|
| "One plug every wall or every 12 feet" | CEC-002 |
| "Plugs 16 inches off ground" | CEC-006 |
| "Standard circuits: 15A" | CEC-004 |
| "Kitchen circuits: 20A" | CEC-004, CEC-007 |
| "Stove circuits: 220-240VAC" | CEC-008 |
| "GFCI within 3 feet of water" | CEC-005 |
| "Arc-fault breakers on bedroom circuits" | CEC-003 |

### User Story: "Floor plan auto-populates subsequent modules"

| Requirement | Ticket(s) |
|-------------|-----------|
| Floor plan → HVAC context | WORKFLOW-003, UX-008 |
| Floor plan → Electrical context | WORKFLOW-004, UX-009 |
| Floor plan → Plumbing context | WORKFLOW-005, UX-010 |
| Building code auto-population | UX-008, UX-009, UX-016 |
| Session persistence | STATE-003, UX-017 |

---

## ESTIMATED EFFORT SUMMARY

| Category | Tickets | Est. Days |
|----------|---------|-----------|
| Mouse/Interaction | 10 | 3-4 days |
| State Management | 15 | 5-6 days |
| API/Backend | 19 | 8-10 days |
| Workflow | 15 | 5-6 days |
| Building Code (CEC) | 14 | 10-12 days |
| Session Experience (UX) | 20 | 10-12 days |
| **TOTAL** | **93** | **41-50 days** |

Assuming parallel work streams and 1-2 developers:
- **Aggressive Timeline**: 6-8 weeks
- **Conservative Timeline**: 10-12 weeks
- **Recommended**: 8 weeks with sprint-based delivery

---

## QUESTIONS FOR FEEDBACK

1. **Priority Confirmation**: Should Canadian Code Compliance (CEC tickets) take precedence over Session Experience (UX tickets), or should we pursue them in parallel?

2. **Scope for MVP**: Would you prefer a focused MVP addressing ONLY:
   - Critical mouse bugs (MOUSE-001, 002, 003)
   - Core state management (STATE-001, 003)
   - Basic workflow connectivity (WORKFLOW-002-005)
   - Essential CEC compliance (CEC-003, 004, 006 for user requirements)

   This would reduce scope to ~15-20 tickets for a 2-week sprint.

3. **WebSocket Integration**: API-004 enables real-time updates. Should this be prioritized, or is HTTP polling acceptable for initial release?

4. **DXF Enhancement Scope**: UX-007 proposes wall/door/window detection. Is basic room detection sufficient, or is geometry extraction critical for your workflow?

5. **Code Region Support**: CEC-014 enables jurisdiction switching (Canada vs US). Should we support multiple Canadian provinces (BC, ON, QC variants), or is a single "Canadian" profile sufficient initially?

---

## RECOMMENDED EXECUTION PLAN

### Sprint 005-A (Week 1-2): Critical Bug Fixes + Foundation
- MOUSE-001, 002, 003, 009
- STATE-001
- WORKFLOW-001, 002
- API-003

**Deliverable**: Resize/selection bugs fixed, stores connected

### Sprint 005-B (Week 3-4): Canadian Code + Module Connectivity
- CEC-003, 004, 006 (user requirements)
- CEC-011, 014 (foundation)
- WORKFLOW-003, 004, 005

**Deliverable**: Rooms flow to all modules, CEC basics enforced

### Sprint 005-C (Week 5-6): Session Experience
- UX-001, 002, 003
- UX-008, 009
- STATE-003

**Deliverable**: Session architecture, auto-population working

### Sprint 005-D (Week 7-8): Backend + Polish
- API-001, 004, 005
- CEC-001, 002, 005
- Remaining HIGH tickets

**Deliverable**: Full persistence, code compliance, production-ready

---

**RESEARCH PHASE COMPLETE**
**STATUS**: Awaiting user feedback before execution phase

---

*Generated by Sprint 005 Orchestrator*
*56 Scouts deployed | 6 Synthesizers completed | 93 Tickets catalogued*
