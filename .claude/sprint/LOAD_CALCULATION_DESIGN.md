# LoadCalculation Module Design Specification

**Version:** 1.0
**Author:** Claude Agent Architecture Team
**Date:** 2026-01-21
**Status:** DESIGN PROPOSAL - AWAITING LEADERSHIP APPROVAL

---

## Executive Summary

This document proposes a **Unified Load Calculation Module** that integrates all 16 computational engines in the MEP Design Studio codebase into a single, physics-aware, cross-disciplinary load analysis system.

The module will:
- Calculate structural, thermal, electrical, plumbing, and environmental loads
- Model **load propagation** across systems (how one load affects others)
- Trigger **real-time warnings** when loads exceed thresholds
- Use **quantum-inspired optimization** for multi-objective balancing
- Provide **unprecedented visibility** into the complete load picture

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED LOAD CALCULATION MODULE                         │
│                         (LoadCalculationEngine)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      LOAD ORCHESTRATION LAYER                        │   │
│  │  • Dependency resolution    • Cascade propagation                    │   │
│  │  • Bidirectional iteration  • Conflict detection                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│       ┌────────────────────────────┼────────────────────────────┐          │
│       │                            │                            │          │
│       ▼                            ▼                            ▼          │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐     │
│  │ STRUCTURAL  │◄──────────►│   THERMAL   │◄──────────►│ ELECTRICAL  │     │
│  │   LOADS     │            │    LOADS    │            │    LOADS    │     │
│  │             │            │             │            │             │     │
│  │ • Dead      │            │ • Cooling   │            │ • Equipment │     │
│  │ • Live      │            │ • Heating   │            │ • Lighting  │     │
│  │ • Wind      │            │ • Latent    │            │ • HVAC      │     │
│  │ • Seismic   │            │ • Solar     │            │ • Outlets   │     │
│  │ • Snow      │            │ • Internal  │            │ • Motors    │     │
│  └─────────────┘            └─────────────┘            └─────────────┘     │
│       │                            │                            │          │
│       │                            ▼                            │          │
│       │                     ┌─────────────┐                     │          │
│       │                     │  PLUMBING   │                     │          │
│       │                     │   LOADS     │                     │          │
│       │                     │             │                     │          │
│       │                     │ • Flow rate │                     │          │
│       │                     │ • Pressure  │                     │          │
│       │                     │ • Pump      │                     │          │
│       │                     └─────────────┘                     │          │
│       │                            │                            │          │
│       └────────────────────────────┼────────────────────────────┘          │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      WARNING & ANALYSIS LAYER                        │   │
│  │  • Threshold monitoring     • Cross-system impact analysis           │   │
│  │  • Code compliance check    • UI notification dispatch               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │         MAIN UI PAGE          │
                    │  • Load dashboard             │
                    │  • Warning notifications      │
                    │  • Cross-system impact view   │
                    └───────────────────────────────┘
```

---

## Core Components

### 1. LoadCalculationEngine (Main Class)

```python
@dataclass
class LoadResult:
    """Individual load calculation result"""
    load_id: str
    category: LoadCategory
    subcategory: str
    magnitude: float
    unit: str
    source_system: str
    source_location: Tuple[float, float, float]  # (x, y, z) or (floor, room, element)
    affects: List[str]  # IDs of other loads this impacts
    affected_by: List[str]  # IDs of loads that impact this
    confidence: float  # 0.0-1.0 based on input data quality
    warnings: List[LoadWarning]


@dataclass
class LoadWarning:
    """Warning triggered by load analysis"""
    warning_id: str
    severity: WarningSeverity  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    category: str
    message: str
    affected_systems: List[str]
    threshold_exceeded: Optional[float]
    recommended_action: str
    auto_fixable: bool


class LoadCategory(Enum):
    """Master categories for all load types"""
    # Structural
    DEAD = "dead_load"
    LIVE = "live_load"
    WIND = "wind_load"
    SEISMIC = "seismic_load"
    SNOW = "snow_load"
    IMPACT = "impact_load"

    # Thermal
    COOLING = "cooling_load"
    HEATING = "heating_load"
    SOLAR = "solar_gain"
    INTERNAL = "internal_heat_gain"
    LATENT = "latent_heat"

    # Electrical
    POWER = "electrical_power"
    LIGHTING = "lighting_load"
    EQUIPMENT = "equipment_load"
    MOTOR = "motor_load"
    HVAC_ELECTRICAL = "hvac_electrical"

    # Plumbing
    WATER_SUPPLY = "water_supply"
    WATER_PRESSURE = "water_pressure"
    DRAINAGE = "drainage_load"
    PUMP = "pump_load"

    # Composite
    TOTAL_STRUCTURAL = "total_structural"
    TOTAL_MEP = "total_mep"
    TOTAL_OPERATING = "total_operating"


class LoadCalculationEngine:
    """
    Unified load calculation coordinating all building systems.

    This is the SINGLE ENTRY POINT for all load calculations across:
    - Structural (StructuralEngine)
    - HVAC (MEPSystemEngine)
    - Electrical (MEPSystemEngine)
    - Plumbing (MEPSystemEngine)
    - Multi-story coordination (MultiStoryDesigner)
    - Site constraints (SitePlanner)
    - Quantum optimization (QuantumInspiredOptimizer)
    - Energy analysis (EnergyOptimizationEngine)
    """

    def __init__(self):
        # Core engines
        self.structural = StructuralEngine()
        self.mep = MEPSystemEngine()
        self.multi_story = MultiStoryDesigner()
        self.site_planner = SitePlanner()
        self.quantum_optimizer = QuantumInspiredOptimizer()
        self.energy_optimizer = EnergyOptimizationEngine()
        self.ceiling_calc = CeilingPanelCalculator()

        # Load registry
        self._loads: Dict[str, LoadResult] = {}
        self._dependency_graph: Dict[str, Set[str]] = {}
        self._warnings: List[LoadWarning] = []

        # Thresholds for warnings
        self._thresholds = self._load_default_thresholds()

        # Callback for UI notifications
        self._warning_callbacks: List[Callable[[LoadWarning], None]] = []

    # =========================================================================
    # PRIMARY API
    # =========================================================================

    def calculate_all_loads(
        self,
        building: BuildingSpecification,
        site: Optional[SiteCharacteristics] = None,
        optimize: bool = True
    ) -> LoadSchedule:
        """
        Calculate ALL loads for a building with cross-system coordination.

        This is the main entry point that orchestrates all subsystems.

        Args:
            building: Complete building specification with floors, rooms, equipment
            site: Optional site characteristics for environmental loads
            optimize: Whether to run quantum optimization on results

        Returns:
            LoadSchedule with complete load analysis across all disciplines
        """
        # Phase 1: Site & Environmental Analysis
        env_loads = self._calculate_environmental_loads(building, site)

        # Phase 2: Structural Load Takeoff
        structural_loads = self._calculate_structural_loads(building)

        # Phase 3: Thermal Analysis
        thermal_loads = self._calculate_thermal_loads(building)

        # Phase 4: Electrical Load Analysis
        electrical_loads = self._calculate_electrical_loads(building)

        # Phase 5: Plumbing Load Analysis
        plumbing_loads = self._calculate_plumbing_loads(building)

        # Phase 6: Cross-System Impact Propagation
        self._propagate_load_impacts()

        # Phase 7: Quantum Optimization (if enabled)
        if optimize:
            self._optimize_load_distribution()

        # Phase 8: Threshold & Compliance Check
        self._check_thresholds_and_compliance(building)

        # Phase 9: Generate Complete Schedule
        return LoadSchedule(
            building_id=building.id,
            calculated_at=datetime.now(),
            structural=structural_loads,
            thermal=thermal_loads,
            electrical=electrical_loads,
            plumbing=plumbing_loads,
            environmental=env_loads,
            warnings=self._warnings,
            dependency_graph=self._dependency_graph,
            total_summary=self._generate_summary()
        )

    def get_load_impact_chain(self, load_id: str) -> ImpactChain:
        """
        Trace the full impact chain of a single load.

        Shows how one load cascades through the entire building system.
        """
        visited = set()
        chain = []

        def trace(lid: str, depth: int = 0):
            if lid in visited:
                return
            visited.add(lid)

            load = self._loads.get(lid)
            if load:
                chain.append(ImpactNode(
                    load_id=lid,
                    depth=depth,
                    magnitude=load.magnitude,
                    category=load.category,
                    affects=[
                        self._loads[a].category for a in load.affects if a in self._loads
                    ]
                ))
                for affected_id in load.affects:
                    trace(affected_id, depth + 1)

        trace(load_id)
        return ImpactChain(root_load_id=load_id, nodes=chain)

    def register_warning_callback(self, callback: Callable[[LoadWarning], None]):
        """Register callback for real-time warning notifications to UI."""
        self._warning_callbacks.append(callback)

    # =========================================================================
    # STRUCTURAL LOADS
    # =========================================================================

    def _calculate_structural_loads(self, building: BuildingSpecification) -> List[LoadResult]:
        """Calculate all structural loads with inter-system awareness."""
        loads = []

        for floor in building.floors:
            # Dead loads (self-weight)
            dead_load = self._calculate_dead_load(floor)
            loads.append(dead_load)

            # Live loads (occupancy-based)
            live_load = self._calculate_live_load(floor)
            loads.append(live_load)

            # Equipment loads (from MEP)
            equipment_load = self._calculate_equipment_dead_load(floor)
            loads.append(equipment_load)

            # Mark dependencies
            self._add_dependency(equipment_load.load_id, dead_load.load_id)

        # Environmental loads (if site data available)
        if building.site:
            loads.extend(self._calculate_environmental_structural_loads(building))

        return loads

    def _calculate_dead_load(self, floor: Floor) -> LoadResult:
        """
        Calculate dead load for a floor.

        Dead load = self-weight of structure + permanent fixtures

        Components:
        - Concrete slab: 24 kN/m³ × thickness
        - Steel framing: varies by member size
        - Ceiling systems: 0.2-0.5 kN/m²
        - MEP in ceiling: 0.1-0.3 kN/m²
        - Flooring: 0.5-1.5 kN/m²
        """
        # Material densities (kN/m³)
        CONCRETE_DENSITY = 24.0
        STEEL_DENSITY = 78.5

        # Typical allowances (kN/m²)
        CEILING_ALLOWANCE = 0.3  # Ceiling panels, grid, insulation
        MEP_ALLOWANCE = 0.2      # Ducts, pipes, conduit in ceiling
        FLOORING_ALLOWANCE = 0.8  # Carpet, tile, or hardwood

        slab_thickness_m = floor.slab_thickness_mm / 1000
        slab_load = CONCRETE_DENSITY * slab_thickness_m  # kN/m²

        total_dead_load = (
            slab_load +
            CEILING_ALLOWANCE +
            MEP_ALLOWANCE +
            FLOORING_ALLOWANCE
        )

        # Total for floor area
        floor_dead_load_kn = total_dead_load * floor.gross_area_sqm

        load_id = f"DEAD-{floor.level:02d}"
        result = LoadResult(
            load_id=load_id,
            category=LoadCategory.DEAD,
            subcategory="floor_slab",
            magnitude=floor_dead_load_kn,
            unit="kN",
            source_system="structural",
            source_location=(floor.level, 0, 0),
            affects=[],  # Dead load affects column sizing
            affected_by=[],
            confidence=0.95,
            warnings=[]
        )

        self._loads[load_id] = result
        return result

    def _calculate_live_load(self, floor: Floor) -> LoadResult:
        """
        Calculate live load based on occupancy and space types.

        Live loads per IBC/ASCE 7:
        - Residential: 1.9 kN/m² (40 psf)
        - Office: 2.4 kN/m² (50 psf)
        - Retail: 4.8 kN/m² (100 psf)
        - Assembly: 4.8-7.2 kN/m² (100-150 psf)
        - Storage: 6.0-12.0 kN/m² (125-250 psf)
        - Corridors: 4.8 kN/m² (100 psf)
        """
        LIVE_LOADS = {
            SpaceType.RESIDENTIAL: 1.9,
            SpaceType.OFFICE: 2.4,
            SpaceType.RETAIL: 4.8,
            SpaceType.ASSEMBLY: 4.8,
            SpaceType.STORAGE: 6.0,
            SpaceType.CORRIDOR: 4.8,
            SpaceType.MECHANICAL: 7.2,
            SpaceType.PARKING: 2.4,
        }

        total_live_load = 0.0
        for space in floor.spaces:
            space_load = LIVE_LOADS.get(space.space_type, 2.4)
            total_live_load += space_load * space.area_sqm

        load_id = f"LIVE-{floor.level:02d}"
        result = LoadResult(
            load_id=load_id,
            category=LoadCategory.LIVE,
            subcategory="occupancy",
            magnitude=total_live_load,
            unit="kN",
            source_system="structural",
            source_location=(floor.level, 0, 0),
            affects=[],
            affected_by=["occupancy_schedule"],
            confidence=0.85,  # Live loads have inherent uncertainty
            warnings=[]
        )

        self._loads[load_id] = result
        return result

    # =========================================================================
    # THERMAL LOADS
    # =========================================================================

    def _calculate_thermal_loads(self, building: BuildingSpecification) -> List[LoadResult]:
        """
        Calculate thermal loads for HVAC sizing.

        Uses heat balance method:
        Q_total = Q_envelope + Q_internal + Q_infiltration + Q_ventilation

        Where:
        - Q_envelope = U × A × ΔT (walls, roof, windows, floor)
        - Q_internal = people + lights + equipment
        - Q_infiltration = air leakage
        - Q_ventilation = fresh air requirements
        """
        loads = []

        for floor in building.floors:
            for space in floor.spaces:
                # Envelope loads
                envelope_load = self._calculate_envelope_load(space, building.climate)
                loads.append(envelope_load)

                # Internal gains
                internal_load = self._calculate_internal_gains(space)
                loads.append(internal_load)

                # Ventilation load
                vent_load = self._calculate_ventilation_load(space)
                loads.append(vent_load)

                # Total cooling/heating for space
                total_thermal = self._aggregate_thermal_loads(
                    space, [envelope_load, internal_load, vent_load]
                )
                loads.append(total_thermal)

                # Cross-system: thermal loads affect electrical (HVAC power)
                self._add_dependency(total_thermal.load_id, f"ELEC-HVAC-{space.id}")

        return loads

    def _calculate_internal_gains(self, space: Space) -> LoadResult:
        """
        Calculate internal heat gains.

        People: 75W sensible + 55W latent per person (office)
        Lighting: Per lighting power density (W/m²)
        Equipment: Per equipment power density (W/m²)
        """
        # Heat gain rates
        PERSON_SENSIBLE = 75  # W
        PERSON_LATENT = 55    # W

        LIGHTING_DENSITY = {
            SpaceType.OFFICE: 10,      # W/m²
            SpaceType.RETAIL: 15,
            SpaceType.RESIDENTIAL: 5,
            SpaceType.ASSEMBLY: 12,
        }

        EQUIPMENT_DENSITY = {
            SpaceType.OFFICE: 15,      # W/m²
            SpaceType.RETAIL: 5,
            SpaceType.RESIDENTIAL: 3,
            SpaceType.ASSEMBLY: 2,
        }

        # Calculate gains
        people_sensible = space.occupancy * PERSON_SENSIBLE
        people_latent = space.occupancy * PERSON_LATENT

        lighting = space.area_sqm * LIGHTING_DENSITY.get(space.space_type, 10)
        equipment = space.area_sqm * EQUIPMENT_DENSITY.get(space.space_type, 10)

        total_internal_w = people_sensible + people_latent + lighting + equipment
        total_internal_kw = total_internal_w / 1000

        load_id = f"INTERNAL-{space.id}"
        result = LoadResult(
            load_id=load_id,
            category=LoadCategory.INTERNAL,
            subcategory="heat_gains",
            magnitude=total_internal_kw,
            unit="kW",
            source_system="thermal",
            source_location=(space.floor_level, space.id, 0),
            affects=[f"COOLING-{space.id}"],
            affected_by=["occupancy_schedule", "lighting_schedule"],
            confidence=0.90,
            warnings=[]
        )

        # Cross-system impact: internal gains are also electrical loads
        electrical_load_id = f"ELEC-INTERNAL-{space.id}"
        self._add_cross_system_link(load_id, electrical_load_id, impact_factor=1.0)

        self._loads[load_id] = result
        return result

    # =========================================================================
    # ELECTRICAL LOADS
    # =========================================================================

    def _calculate_electrical_loads(self, building: BuildingSpecification) -> List[LoadResult]:
        """
        Calculate electrical loads with diversity and demand factors.

        Total Connected Load ≠ Actual Demand
        Demand = Connected Load × Demand Factor × Diversity Factor
        """
        loads = []

        for floor in building.floors:
            for space in floor.spaces:
                # Lighting load
                lighting = self._calculate_lighting_load(space)
                loads.append(lighting)

                # Receptacle/equipment load
                equipment = self._calculate_receptacle_load(space)
                loads.append(equipment)

                # HVAC electrical load (from thermal calculations)
                hvac_elec = self._calculate_hvac_electrical_load(space)
                loads.append(hvac_elec)

        # Motor loads (elevators, pumps)
        motor_loads = self._calculate_motor_loads(building)
        loads.extend(motor_loads)

        # Emergency/standby loads
        emergency = self._calculate_emergency_loads(building)
        loads.append(emergency)

        # Total building electrical
        total_elec = self._aggregate_electrical_loads(building, loads)
        loads.append(total_elec)

        # Check panel capacity
        self._check_electrical_capacity(total_elec, building)

        return loads

    def _calculate_hvac_electrical_load(self, space: Space) -> LoadResult:
        """
        Calculate electrical load required to run HVAC for this space.

        HVAC Electrical = Thermal Load / COP (or EER)

        COP (Coefficient of Performance):
        - Split system: 3.5
        - VRF: 4.2
        - Chilled water: 5.0 (including chiller efficiency)
        """
        # Get thermal load for this space
        thermal_load_id = f"COOLING-{space.id}"
        thermal_load = self._loads.get(thermal_load_id)

        if thermal_load:
            cop = 3.5  # Default for split system
            hvac_electrical_kw = thermal_load.magnitude / cop
        else:
            # Estimate if thermal not yet calculated
            hvac_electrical_kw = space.area_sqm * 0.05  # ~50W/m²

        load_id = f"ELEC-HVAC-{space.id}"
        result = LoadResult(
            load_id=load_id,
            category=LoadCategory.HVAC_ELECTRICAL,
            subcategory="cooling_power",
            magnitude=hvac_electrical_kw,
            unit="kW",
            source_system="electrical",
            source_location=(space.floor_level, space.id, 0),
            affects=["TOTAL-ELEC"],
            affected_by=[thermal_load_id] if thermal_load else [],
            confidence=0.85,
            warnings=[]
        )

        self._loads[load_id] = result
        return result

    # =========================================================================
    # PLUMBING LOADS
    # =========================================================================

    def _calculate_plumbing_loads(self, building: BuildingSpecification) -> List[LoadResult]:
        """
        Calculate plumbing loads: water supply and drainage.

        Water Supply Fixture Units (WSFU) method:
        - Each fixture type has a unit value
        - Total units determine pipe sizing and pump requirements

        Drainage Fixture Units (DFU) method:
        - Similar approach for waste/vent sizing
        """
        loads = []

        # Water supply demand
        supply_demand = self._calculate_water_supply_demand(building)
        loads.append(supply_demand)

        # Hot water demand
        hot_water = self._calculate_hot_water_demand(building)
        loads.append(hot_water)

        # Drainage load
        drainage = self._calculate_drainage_load(building)
        loads.append(drainage)

        # Pump requirements
        pump_load = self._calculate_pump_requirements(building, supply_demand)
        loads.append(pump_load)

        # Cross-system: pump electrical load
        pump_elec_id = f"ELEC-PUMP-{building.id}"
        self._add_cross_system_link(pump_load.load_id, pump_elec_id, impact_factor=1.0)

        return loads

    # =========================================================================
    # CROSS-SYSTEM IMPACT PROPAGATION
    # =========================================================================

    def _propagate_load_impacts(self):
        """
        Propagate load changes through the dependency graph.

        This is where the magic happens - we model how a change in one
        system ripples through all connected systems.

        Example cascade:
        1. Increased occupancy → higher live load
        2. Higher live load → larger beam sizes → more dead load
        3. More occupancy → more internal heat gains
        4. More cooling needed → larger HVAC equipment
        5. Larger HVAC → more electrical load → larger panel
        6. Larger HVAC equipment → more dead load on structure
        7. More plumbing fixtures → more water demand
        8. More pump power → more electrical
        """
        # Build reverse dependency map
        reverse_deps: Dict[str, Set[str]] = {}
        for load_id, deps in self._dependency_graph.items():
            for dep in deps:
                if dep not in reverse_deps:
                    reverse_deps[dep] = set()
                reverse_deps[dep].add(load_id)

        # Topological sort for processing order
        processing_order = self._topological_sort()

        # Propagate impacts
        for load_id in processing_order:
            load = self._loads.get(load_id)
            if not load:
                continue

            # Calculate impact on dependent loads
            for affected_id in load.affects:
                affected = self._loads.get(affected_id)
                if affected:
                    impact = self._calculate_impact(load, affected)
                    if impact > 0:
                        # Update affected load magnitude
                        affected.magnitude += impact
                        affected.affected_by.append(load_id)

                        # Check if this triggers a warning
                        self._check_load_threshold(affected)

    def _calculate_impact(self, source: LoadResult, target: LoadResult) -> float:
        """
        Calculate how source load impacts target load.

        Impact factors based on engineering relationships:
        - Thermal → Electrical (HVAC): 1/COP ratio
        - Occupancy → Thermal: ~130W per person
        - Equipment weight → Structural: 1:1
        - etc.
        """
        IMPACT_FACTORS = {
            (LoadCategory.INTERNAL, LoadCategory.COOLING): 1.0,  # Direct
            (LoadCategory.COOLING, LoadCategory.HVAC_ELECTRICAL): 0.29,  # 1/3.5 COP
            (LoadCategory.EQUIPMENT, LoadCategory.DEAD): 0.001,  # kW → kN
            (LoadCategory.LIVE, LoadCategory.DEAD): 0.05,  # Furniture adds to dead
            (LoadCategory.PUMP, LoadCategory.POWER): 1.0,  # Direct electrical
        }

        key = (source.category, target.category)
        factor = IMPACT_FACTORS.get(key, 0.0)

        return source.magnitude * factor

    # =========================================================================
    # WARNING SYSTEM
    # =========================================================================

    def _check_thresholds_and_compliance(self, building: BuildingSpecification):
        """
        Check all loads against thresholds and code requirements.

        Generates warnings that can be surfaced to the UI.
        """
        for load_id, load in self._loads.items():
            # Check magnitude thresholds
            threshold = self._thresholds.get(load.category)
            if threshold and load.magnitude > threshold.max_value:
                warning = LoadWarning(
                    warning_id=f"WARN-{load_id}-EXCEED",
                    severity=WarningSeverity.HIGH,
                    category="threshold_exceeded",
                    message=f"{load.category.value} exceeds maximum: {load.magnitude:.2f} > {threshold.max_value:.2f} {load.unit}",
                    affected_systems=[load.source_system],
                    threshold_exceeded=threshold.max_value,
                    recommended_action=threshold.mitigation_action,
                    auto_fixable=False
                )
                self._emit_warning(warning)

            # Check code compliance
            compliance_issues = self._check_code_compliance(load, building)
            for issue in compliance_issues:
                self._emit_warning(issue)

        # Cross-system compliance checks
        self._check_structural_capacity(building)
        self._check_electrical_capacity_total(building)
        self._check_hvac_capacity(building)

    def _emit_warning(self, warning: LoadWarning):
        """Emit warning to all registered callbacks (including UI)."""
        self._warnings.append(warning)

        for callback in self._warning_callbacks:
            try:
                callback(warning)
            except Exception as e:
                logging.error(f"Warning callback failed: {e}")

    # =========================================================================
    # QUANTUM OPTIMIZATION
    # =========================================================================

    def _optimize_load_distribution(self):
        """
        Use quantum-inspired optimization to balance loads.

        Multi-objective optimization:
        1. Minimize total energy consumption
        2. Minimize peak demand
        3. Maximize equipment utilization
        4. Minimize cost
        5. Maintain code compliance
        """
        def objective_function(params):
            """
            Multi-objective fitness function.

            params: Array of adjustment factors for each load
            """
            total_energy = 0
            peak_demand = 0
            utilization_score = 0
            compliance_violations = 0

            for i, (load_id, load) in enumerate(self._loads.items()):
                adjusted_magnitude = load.magnitude * params[i]
                total_energy += adjusted_magnitude
                peak_demand = max(peak_demand, adjusted_magnitude)

                # Check utilization (want to be at 70-90% of capacity)
                capacity = self._get_system_capacity(load.source_system)
                if capacity > 0:
                    util = adjusted_magnitude / capacity
                    if 0.7 <= util <= 0.9:
                        utilization_score += 1
                    elif util > 1.0:
                        compliance_violations += 10  # Heavy penalty

            # Combined objective (minimize)
            return (
                total_energy * 0.3 +
                peak_demand * 0.3 +
                (len(self._loads) - utilization_score) * 0.2 +
                compliance_violations * 0.2
            )

        # Define bounds (adjustment factors 0.8 to 1.2)
        bounds = [(0.8, 1.2) for _ in self._loads]

        # Run quantum-inspired optimization
        result = self.quantum_optimizer.optimize(
            objective_func=objective_function,
            bounds=bounds,
            max_iterations=100,
            minimize=True
        )

        # Apply optimal adjustments
        if result.success:
            for i, (load_id, load) in enumerate(self._loads.items()):
                load.magnitude *= result.best_solution[i]
                load.confidence *= 0.95  # Slight reduction due to optimization

    # =========================================================================
    # OUTPUT & REPORTING
    # =========================================================================

    def generate_load_schedule_report(self) -> Dict:
        """Generate comprehensive load schedule for export."""
        return {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "total_loads_calculated": len(self._loads),
                "total_warnings": len(self._warnings),
                "optimization_applied": True
            },
            "summary": self._generate_summary(),
            "structural_loads": self._get_loads_by_system("structural"),
            "thermal_loads": self._get_loads_by_system("thermal"),
            "electrical_loads": self._get_loads_by_system("electrical"),
            "plumbing_loads": self._get_loads_by_system("plumbing"),
            "cross_system_impacts": self._get_impact_matrix(),
            "warnings": [w.__dict__ for w in self._warnings],
            "dependency_graph": {k: list(v) for k, v in self._dependency_graph.items()}
        }

    def get_ui_dashboard_data(self) -> Dict:
        """Get data formatted for main UI dashboard display."""
        return {
            "total_structural_kn": self._get_total_by_category([
                LoadCategory.DEAD, LoadCategory.LIVE, LoadCategory.WIND,
                LoadCategory.SEISMIC, LoadCategory.SNOW
            ]),
            "total_cooling_kw": self._get_total_by_category([LoadCategory.COOLING]),
            "total_heating_kw": self._get_total_by_category([LoadCategory.HEATING]),
            "total_electrical_kw": self._get_total_by_category([
                LoadCategory.POWER, LoadCategory.LIGHTING, LoadCategory.EQUIPMENT,
                LoadCategory.MOTOR, LoadCategory.HVAC_ELECTRICAL
            ]),
            "total_water_lpm": self._get_total_by_category([LoadCategory.WATER_SUPPLY]),
            "warnings": {
                "critical": len([w for w in self._warnings if w.severity == WarningSeverity.CRITICAL]),
                "high": len([w for w in self._warnings if w.severity == WarningSeverity.HIGH]),
                "medium": len([w for w in self._warnings if w.severity == WarningSeverity.MEDIUM]),
                "low": len([w for w in self._warnings if w.severity == WarningSeverity.LOW])
            },
            "top_warnings": [w.__dict__ for w in self._warnings[:5]]
        }
```

---

## Load Interaction Matrix

The following matrix shows how loads in one system affect loads in other systems:

| Source Load | → Structural | → Thermal | → Electrical | → Plumbing |
|-------------|--------------|-----------|--------------|------------|
| **Structural** | Self-weight compounds | Equipment mass → thermal mass | - | Pipe weight |
| **Thermal** | HVAC equipment weight | Envelope losses compound | HVAC power draw | Hot water demand |
| **Electrical** | Equipment weight | Transformer heat | Self-compounds | Pump power |
| **Plumbing** | Pipe/fixture weight | Water heater load | Pump electrical | Self-compounds |
| **Occupancy** | Live load | Internal gains | Receptacle use | Fixture demand |

---

## Warning Severity Levels

| Level | Trigger | UI Behavior |
|-------|---------|-------------|
| **CRITICAL** | Code violation, safety hazard | 🔴 Modal popup, blocks proceed |
| **HIGH** | Capacity exceeded, requires redesign | 🟠 Persistent banner |
| **MEDIUM** | Suboptimal, efficiency issue | 🟡 Toast notification |
| **LOW** | Informational, best practice | 🔵 Log entry |
| **INFO** | Tracking, no action needed | ⚪ Dashboard only |

---

## Integration Points with Existing Systems

| System | Integration Method |
|--------|-------------------|
| StructuralEngine | Direct method calls for beam/column/foundation loads |
| MEPSystemEngine | Wraps HVAC/electrical/plumbing design methods |
| MultiStoryDesigner | Receives occupancy/area data, provides floor loads |
| SitePlanner | Receives environmental constraints (wind, seismic zones) |
| QuantumInspiredOptimizer | Used for multi-objective load balancing |
| EnergyOptimizationEngine | Provides operational load patterns |
| CeilingPanelCalculator | Receives MEP clearance requirements |
| SystemOrchestrator | Registers as component for workflow integration |

---

## File Structure

```
engine/design/
├── load_calculation.py        # Main LoadCalculationEngine class
├── load_types.py              # LoadCategory, LoadResult, LoadWarning dataclasses
├── load_propagation.py        # Cross-system impact propagation logic
├── load_thresholds.py         # Default thresholds and code compliance rules
├── load_optimization.py       # Quantum optimization integration
└── load_reporting.py          # Report generation and UI data formatting
```

---

## API Endpoints (Proposed)

```python
# New routes for load calculation
@load_bp.route('/calculate-all', methods=['POST'])
def calculate_all_loads():
    """Calculate complete load schedule for building."""

@load_bp.route('/impact-chain/<load_id>', methods=['GET'])
def get_load_impact_chain(load_id):
    """Trace impact chain for a specific load."""

@load_bp.route('/warnings', methods=['GET'])
def get_load_warnings():
    """Get current warnings for UI display."""

@load_bp.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    """Get summarized data for main UI dashboard."""

@load_bp.route('/optimize', methods=['POST'])
def optimize_loads():
    """Run quantum optimization on current loads."""
```

---

## Implementation Priority

| Phase | Components | Effort |
|-------|------------|--------|
| **1** | Core LoadCalculationEngine, basic structural/thermal | 2 days |
| **2** | Electrical/plumbing loads, cross-system propagation | 2 days |
| **3** | Warning system, threshold checking | 1 day |
| **4** | Quantum optimization integration | 1 day |
| **5** | UI integration, API endpoints | 2 days |
| **6** | Testing, documentation | 2 days |

**Total Estimated Effort:** 10 days

---

## Success Criteria

1. ✅ All 16 existing calculators integrated
2. ✅ Cross-system load propagation working
3. ✅ Warnings surface to UI in real-time
4. ✅ Quantum optimization improves load distribution
5. ✅ Complete load schedule exportable
6. ✅ Zero technical debt introduced
7. ✅ All code properly typed and documented
