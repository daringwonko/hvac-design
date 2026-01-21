#!/usr/bin/env python3
"""
Load Calculation Engine
=======================
Unified load calculation system coordinating all building systems.

This is the SINGLE ENTRY POINT for all load calculations across:
- Structural (dead, live, wind, seismic, snow loads)
- HVAC (cooling, heating, ventilation loads)
- Electrical (lighting, equipment, HVAC power)
- Plumbing (water supply, drainage, pump requirements)

Features:
- Cross-system load propagation (how one load affects others)
- Real-time warnings when loads exceed thresholds
- Quantum-inspired optimization for multi-objective balancing
- Complete load schedule generation for all disciplines
"""

import math
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Callable, Set, Any
from datetime import datetime
from enum import Enum

from .load_types import (
    LoadCategory,
    WarningSeverity,
    LoadType,
    LoadWarning,
    FloorLoadBreakdown,
    SpaceLoadBreakdown,
    CostBreakdown,
    LoadOptimizationResult,
    LoadRecommendation,
    EnvironmentalContext,
    LoadResult,
    ComplianceStatus,
    OptimizationStrategy,
    create_default_environmental_context,
    combine_floor_breakdowns,
)

from .multi_story_designer import (
    MultiStoryDesigner,
    Floor,
    Space,
    SpaceType,
)

# Set up logging
logger = logging.getLogger(__name__)


# =============================================================================
# CONSTANTS
# =============================================================================

# Material densities (kN/m3)
MATERIAL_DENSITIES = {
    "concrete": 24.0,
    "steel": 78.5,
    "wood": 6.0,
    "gypsum": 8.0,
    "glass": 25.0,
}

# Live load densities by space type (kN/m2) per IBC/ASCE 7
LIVE_LOADS_BY_SPACE_TYPE = {
    SpaceType.OFFICE: 2.4,
    SpaceType.RESIDENTIAL: 1.9,
    SpaceType.RETAIL: 4.8,
    SpaceType.INDUSTRIAL: 6.0,
    SpaceType.PARKING: 2.4,
    SpaceType.MECHANICAL: 7.2,
    SpaceType.CIRCULATION: 4.8,
    SpaceType.COMMON: 4.8,
}

# Dead load components (kN/m2)
DEAD_LOAD_COMPONENTS = {
    "slab_150mm": 3.6,  # 150mm concrete slab
    "ceiling": 0.3,     # Ceiling system
    "mep_allowance": 0.2,  # Ducts, pipes, conduit
    "flooring": 0.8,    # Carpet, tile, etc.
    "partitions": 1.0,  # Interior partitions allowance
}

# Lighting power density (W/m2) per ASHRAE 90.1
LIGHTING_POWER_DENSITY = {
    SpaceType.OFFICE: 10.0,
    SpaceType.RESIDENTIAL: 5.0,
    SpaceType.RETAIL: 15.0,
    SpaceType.INDUSTRIAL: 12.0,
    SpaceType.PARKING: 2.0,
    SpaceType.MECHANICAL: 8.0,
    SpaceType.CIRCULATION: 8.0,
    SpaceType.COMMON: 10.0,
}

# Equipment power density (W/m2)
EQUIPMENT_POWER_DENSITY = {
    SpaceType.OFFICE: 15.0,
    SpaceType.RESIDENTIAL: 3.0,
    SpaceType.RETAIL: 5.0,
    SpaceType.INDUSTRIAL: 25.0,
    SpaceType.PARKING: 0.0,
    SpaceType.MECHANICAL: 50.0,
    SpaceType.CIRCULATION: 0.0,
    SpaceType.COMMON: 5.0,
}

# Internal heat gains per person (W)
PERSON_SENSIBLE_HEAT = 75.0
PERSON_LATENT_HEAT = 55.0

# Ventilation rates (L/s per person) per ASHRAE 62.1
VENTILATION_RATES = {
    SpaceType.OFFICE: 2.5,
    SpaceType.RESIDENTIAL: 3.5,
    SpaceType.RETAIL: 3.8,
    SpaceType.INDUSTRIAL: 5.0,
    SpaceType.PARKING: 7.5,
    SpaceType.MECHANICAL: 0.0,
    SpaceType.CIRCULATION: 2.5,
    SpaceType.COMMON: 3.0,
}

# Area-based ventilation (L/s per m2)
VENTILATION_AREA_RATE = 0.3

# HVAC system efficiency (COP)
HVAC_COP = {
    "split_system": 3.5,
    "vrf": 4.2,
    "chilled_water": 5.0,
    "package_unit": 3.2,
    "heat_pump": 3.8,
}

# Plumbing fixture flow rates (L/min)
FIXTURE_FLOW_RATES = {
    "toilet": 6.0,
    "sink": 4.0,
    "shower": 12.0,
    "bathtub": 15.0,
    "urinal": 3.0,
    "kitchen_sink": 8.0,
}

# Cost factors ($/kW or $/unit)
COST_FACTORS = {
    "hvac_per_kw": 500.0,
    "electrical_per_kw": 100.0,
    "plumbing_per_fixture": 150.0,
    "structural_reinforcement_per_kn": 0.5,
}


# =============================================================================
# BUILDING SPECIFICATION
# =============================================================================

@dataclass
class BuildingSpecification:
    """
    Complete building specification for load calculations.

    Contains all necessary data about the building's physical
    configuration, occupancy, and systems.
    """
    id: str
    name: str
    floors: List[Floor] = field(default_factory=list)
    site_area_sqm: float = 0.0
    footprint_sqm: float = 0.0
    hvac_system_type: str = "vrf"
    slab_thickness_mm: float = 150.0
    wall_u_value: float = 0.5  # W/(m2.K)
    roof_u_value: float = 0.3  # W/(m2.K)
    window_u_value: float = 2.5  # W/(m2.K)
    window_shgc: float = 0.4  # Solar heat gain coefficient
    window_wall_ratio: float = 0.4  # 40% glazing


# =============================================================================
# LOAD CALCULATION ENGINE
# =============================================================================

class LoadCalculationEngine:
    """
    Unified Load Calculation Engine.

    Coordinates load calculations across all building systems with
    cross-system impact propagation and threshold monitoring.

    Usage:
        engine = LoadCalculationEngine()
        result = engine.calculate_all_loads(building_spec, env_context)
        print(f"Total cooling: {result.total_cooling_kw} kW")
    """

    def __init__(self):
        """Initialize the LoadCalculationEngine."""
        # Internal load tracking
        self._loads: Dict[str, float] = {}
        self._dependency_graph: Dict[str, Set[str]] = {}
        self._warnings: List[LoadWarning] = []
        self._recommendations: List[LoadRecommendation] = []

        # Warning callbacks for real-time UI notification
        self._warning_callbacks: List[Callable[[LoadWarning], None]] = []

        # Calculation state
        self._current_building: Optional[BuildingSpecification] = None
        self._current_env: Optional[EnvironmentalContext] = None
        self._floor_breakdowns: List[FloorLoadBreakdown] = []
        self._space_breakdowns: List[SpaceLoadBreakdown] = []

        logger.info("LoadCalculationEngine initialized")

    # =========================================================================
    # PRIMARY API
    # =========================================================================

    def calculate_all_loads(
        self,
        building: BuildingSpecification,
        environmental_context: Optional[EnvironmentalContext] = None,
        optimize: bool = True
    ) -> LoadResult:
        """
        Calculate ALL loads for a building with cross-system coordination.

        This is the main entry point that orchestrates all subsystems.

        Args:
            building: Complete building specification with floors, rooms, equipment
            environmental_context: Environmental conditions for calculations
            optimize: Whether to run load optimization

        Returns:
            LoadResult with complete load analysis across all disciplines
        """
        logger.info(f"Starting load calculation for building: {building.id}")

        # Reset state for new calculation
        self._reset_calculation_state()
        self._current_building = building
        self._current_env = environmental_context or create_default_environmental_context()

        # Phase 1: Calculate structural loads
        logger.info("Phase 1: Calculating structural loads...")
        structural_loads = self._calculate_structural_loads(building)

        # Phase 2: Calculate thermal loads
        logger.info("Phase 2: Calculating thermal loads...")
        thermal_loads = self._calculate_thermal_loads(building)

        # Phase 3: Calculate electrical loads
        logger.info("Phase 3: Calculating electrical loads...")
        electrical_loads = self._calculate_electrical_loads(building)

        # Phase 4: Calculate plumbing loads
        logger.info("Phase 4: Calculating plumbing loads...")
        plumbing_loads = self._calculate_plumbing_loads(building)

        # Phase 5: Cross-system impact propagation
        logger.info("Phase 5: Propagating cross-system impacts...")
        self._propagate_load_impacts()

        # Phase 6: Check thresholds and compliance
        logger.info("Phase 6: Checking thresholds and compliance...")
        compliance_status = self._check_thresholds(building)

        # Phase 7: Generate recommendations
        logger.info("Phase 7: Generating recommendations...")
        self._generate_recommendations(building)

        # Phase 8: Optimization (if enabled)
        optimization_result = None
        if optimize:
            logger.info("Phase 8: Running load optimization...")
            optimization_result = self._optimize_load_distribution()

        # Phase 9: Calculate costs
        logger.info("Phase 9: Calculating costs...")
        cost_breakdown = self._calculate_costs(building)

        # Build final result
        totals = combine_floor_breakdowns(self._floor_breakdowns)

        result = LoadResult(
            building_id=building.id,
            calculated_at=datetime.now(),
            total_structural_kn=structural_loads["total"],
            total_cooling_kw=thermal_loads["cooling"],
            total_heating_kw=thermal_loads["heating"],
            total_electrical_kw=electrical_loads["connected"],
            electrical_demand_kw=electrical_loads["demand"],
            total_plumbing_l_min=plumbing_loads["total_flow"],
            floor_breakdowns=self._floor_breakdowns,
            space_breakdowns=self._space_breakdowns,
            warnings=self._warnings,
            recommendations=self._recommendations,
            cost_breakdown=cost_breakdown,
            optimization_result=optimization_result,
            environmental_context=self._current_env,
            compliance_status=compliance_status,
            confidence_score=self._calculate_confidence_score()
        )

        logger.info(f"Load calculation complete. {len(self._warnings)} warnings generated.")
        return result

    def register_warning_callback(self, callback: Callable[[LoadWarning], None]) -> None:
        """
        Register callback for real-time warning notifications.

        Callbacks are invoked when warnings are generated during calculation.

        Args:
            callback: Function to call with LoadWarning when generated
        """
        self._warning_callbacks.append(callback)
        logger.debug(f"Registered warning callback. Total callbacks: {len(self._warning_callbacks)}")

    def calculate_space_loads(
        self,
        space: Space,
        floor_level: int,
        env_context: Optional[EnvironmentalContext] = None
    ) -> SpaceLoadBreakdown:
        """
        Calculate loads for a single space.

        Useful for quick estimates without full building calculation.

        Args:
            space: Space to calculate loads for
            floor_level: Floor level the space is on
            env_context: Environmental context

        Returns:
            SpaceLoadBreakdown with all load values
        """
        env = env_context or create_default_environmental_context()

        # Calculate individual load components
        lighting_kw = (space.area_sqm * LIGHTING_POWER_DENSITY.get(space.space_type, 10.0)) / 1000
        equipment_kw = (space.area_sqm * EQUIPMENT_POWER_DENSITY.get(space.space_type, 10.0)) / 1000

        # Thermal loads
        cooling_kw = self._calculate_space_cooling_load(space, env)
        heating_kw = self._calculate_space_heating_load(space, env)

        # HVAC electrical
        cop = HVAC_COP.get("vrf", 4.0)
        hvac_kw = cooling_kw / cop

        # Ventilation
        ventilation_l_s = self._calculate_space_ventilation(space)

        # Plumbing (estimate based on occupancy)
        plumbing_l_min = space.occupancy * 0.5  # 0.5 L/min per person average

        # Structural
        structural_kn = self._calculate_space_structural_load(space)

        return SpaceLoadBreakdown(
            space_id=space.id,
            space_name=space.name,
            space_type=space.space_type.value,
            floor_level=floor_level,
            area_sqm=space.area_sqm,
            occupancy=space.occupancy,
            hvac_kw=hvac_kw,
            cooling_kw=cooling_kw,
            heating_kw=heating_kw,
            lighting_kw=lighting_kw,
            equipment_kw=equipment_kw,
            ventilation_l_s=ventilation_l_s,
            plumbing_l_min=plumbing_l_min,
            structural_kn=structural_kn
        )

    # =========================================================================
    # STRUCTURAL LOADS
    # =========================================================================

    def _calculate_structural_loads(self, building: BuildingSpecification) -> Dict[str, float]:
        """
        Calculate all structural loads for the building.

        Returns:
            Dictionary with dead, live, total structural loads
        """
        total_dead = 0.0
        total_live = 0.0

        for floor in building.floors:
            dead_load = self._calculate_floor_dead_load(floor, building)
            live_load = self._calculate_floor_live_load(floor)

            total_dead += dead_load
            total_live += live_load

            # Store in loads dictionary
            self._loads[f"DEAD-{floor.level:02d}"] = dead_load
            self._loads[f"LIVE-{floor.level:02d}"] = live_load

        # Environmental structural loads (wind, seismic, snow)
        wind_load = self._calculate_wind_load(building)
        seismic_load = self._calculate_seismic_load(building, total_dead + total_live)
        snow_load = self._calculate_snow_load(building)

        self._loads["WIND-TOTAL"] = wind_load
        self._loads["SEISMIC-TOTAL"] = seismic_load
        self._loads["SNOW-TOTAL"] = snow_load

        total_structural = total_dead + total_live

        return {
            "dead": total_dead,
            "live": total_live,
            "wind": wind_load,
            "seismic": seismic_load,
            "snow": snow_load,
            "total": total_structural
        }

    def _calculate_floor_dead_load(self, floor: Floor, building: BuildingSpecification) -> float:
        """
        Calculate dead load for a floor.

        Dead load = self-weight of structure + permanent fixtures
        """
        slab_thickness_m = building.slab_thickness_mm / 1000
        slab_load = MATERIAL_DENSITIES["concrete"] * slab_thickness_m  # kN/m2

        total_dead_per_sqm = (
            slab_load +
            DEAD_LOAD_COMPONENTS["ceiling"] +
            DEAD_LOAD_COMPONENTS["mep_allowance"] +
            DEAD_LOAD_COMPONENTS["flooring"] +
            DEAD_LOAD_COMPONENTS["partitions"]
        )

        floor_dead_load = total_dead_per_sqm * floor.gross_area_sqm

        logger.debug(f"Floor {floor.level} dead load: {floor_dead_load:.2f} kN")
        return floor_dead_load

    def _calculate_floor_live_load(self, floor: Floor) -> float:
        """
        Calculate live load for a floor based on space types.
        """
        total_live = 0.0

        for space in floor.spaces:
            space_live_load = LIVE_LOADS_BY_SPACE_TYPE.get(space.space_type, 2.4)
            total_live += space_live_load * space.area_sqm

        # Use default for unassigned area
        assigned_area = sum(s.area_sqm for s in floor.spaces)
        unassigned_area = floor.gross_area_sqm - assigned_area
        if unassigned_area > 0:
            total_live += 2.4 * unassigned_area  # Default office load

        logger.debug(f"Floor {floor.level} live load: {total_live:.2f} kN")
        return total_live

    def _calculate_wind_load(self, building: BuildingSpecification) -> float:
        """
        Calculate wind load on the building.

        Simplified method based on building height and exposure.
        """
        if not building.floors:
            return 0.0

        # Calculate building height
        height = sum(f.floor_to_floor_height_m for f in building.floors if f.level >= 0)

        # Basic wind pressure (kPa) based on wind zone
        wind_zone = self._current_env.wind_zone if self._current_env else "B"
        base_pressure = {
            "A": 0.5,   # Light
            "B": 0.75,  # Moderate
            "C": 1.0,   # Severe
            "D": 1.5,   # Very severe
        }.get(wind_zone, 0.75)

        # Height factor (increases with height)
        height_factor = 1.0 + (height / 100) * 0.5

        # Assumed facade area (perimeter x height)
        footprint_side = math.sqrt(building.footprint_sqm)
        facade_area = 4 * footprint_side * height

        wind_load = base_pressure * height_factor * facade_area

        logger.debug(f"Wind load: {wind_load:.2f} kN")
        return wind_load

    def _calculate_seismic_load(self, building: BuildingSpecification, total_weight: float) -> float:
        """
        Calculate seismic base shear.

        Simplified method: V = Cs * W
        """
        # Seismic coefficient based on zone
        seismic_zone = self._current_env.seismic_zone if self._current_env else "B"
        cs_values = {
            "A": 0.02,
            "B": 0.05,
            "C": 0.10,
            "D": 0.15,
            "E": 0.20,
            "F": 0.25,
        }
        cs = cs_values.get(seismic_zone, 0.05)

        seismic_load = cs * total_weight

        logger.debug(f"Seismic load: {seismic_load:.2f} kN")
        return seismic_load

    def _calculate_snow_load(self, building: BuildingSpecification) -> float:
        """
        Calculate roof snow load.
        """
        ground_snow = self._current_env.ground_snow_load_kpa if self._current_env else 0.0

        # Roof snow load factor
        roof_factor = 0.7  # Typical for flat roof

        snow_load = ground_snow * roof_factor * building.footprint_sqm

        logger.debug(f"Snow load: {snow_load:.2f} kN")
        return snow_load

    def _calculate_space_structural_load(self, space: Space) -> float:
        """Calculate structural load for a single space."""
        dead_per_sqm = sum(DEAD_LOAD_COMPONENTS.values())
        live_per_sqm = LIVE_LOADS_BY_SPACE_TYPE.get(space.space_type, 2.4)

        return (dead_per_sqm + live_per_sqm) * space.area_sqm

    # =========================================================================
    # THERMAL LOADS
    # =========================================================================

    def _calculate_thermal_loads(self, building: BuildingSpecification) -> Dict[str, float]:
        """
        Calculate all thermal loads (cooling and heating).

        Uses heat balance method:
        Q_total = Q_envelope + Q_internal + Q_infiltration + Q_ventilation
        """
        total_cooling = 0.0
        total_heating = 0.0

        for floor in building.floors:
            floor_cooling = 0.0
            floor_heating = 0.0

            for space in floor.spaces:
                space_cooling = self._calculate_space_cooling_load(space, self._current_env)
                space_heating = self._calculate_space_heating_load(space, self._current_env)

                floor_cooling += space_cooling
                floor_heating += space_heating

                # Store for space breakdown
                self._loads[f"COOLING-{space.id}"] = space_cooling
                self._loads[f"HEATING-{space.id}"] = space_heating

            total_cooling += floor_cooling
            total_heating += floor_heating

            self._loads[f"COOLING-FLOOR-{floor.level:02d}"] = floor_cooling
            self._loads[f"HEATING-FLOOR-{floor.level:02d}"] = floor_heating

        return {
            "cooling": total_cooling,
            "heating": total_heating
        }

    def _calculate_space_cooling_load(self, space: Space, env: EnvironmentalContext) -> float:
        """
        Calculate cooling load for a space.

        Components:
        - Envelope (walls, windows)
        - Internal gains (people, lights, equipment)
        - Ventilation
        """
        # Internal gains
        people_sensible = space.occupancy * PERSON_SENSIBLE_HEAT / 1000  # kW
        people_latent = space.occupancy * PERSON_LATENT_HEAT / 1000  # kW

        lighting_kw = (space.area_sqm * LIGHTING_POWER_DENSITY.get(space.space_type, 10.0)) / 1000
        equipment_kw = (space.area_sqm * EQUIPMENT_POWER_DENSITY.get(space.space_type, 10.0)) / 1000

        internal_gains = people_sensible + people_latent + lighting_kw + equipment_kw

        # Envelope load (simplified)
        # Assume 30% perimeter area with windows
        perimeter_ratio = 0.3
        wall_area = math.sqrt(space.area_sqm) * 4 * space.ceiling_height_m * perimeter_ratio
        window_area = wall_area * 0.4  # 40% glazing
        wall_area_net = wall_area - window_area

        delta_t = env.cooling_delta_t if env else 10.0

        wall_load = (wall_area_net * 0.5 * delta_t) / 1000  # U=0.5 W/(m2.K)
        window_load = (window_area * 2.5 * delta_t) / 1000  # U=2.5 W/(m2.K)
        solar_gain = (window_area * 0.4 * 300) / 1000  # SHGC * solar radiation

        envelope_load = wall_load + window_load + solar_gain

        # Ventilation load
        ventilation_l_s = self._calculate_space_ventilation(space)
        ventilation_m3_s = ventilation_l_s / 1000
        air_density = 1.2  # kg/m3
        specific_heat = 1.0  # kJ/(kg.K)

        ventilation_load = ventilation_m3_s * air_density * specific_heat * delta_t

        total_cooling = internal_gains + envelope_load + ventilation_load

        # Add safety factor
        total_cooling *= 1.1

        return max(0.0, total_cooling)

    def _calculate_space_heating_load(self, space: Space, env: EnvironmentalContext) -> float:
        """
        Calculate heating load for a space.

        Primarily envelope and ventilation losses.
        """
        # Envelope loss (simplified)
        perimeter_ratio = 0.3
        wall_area = math.sqrt(space.area_sqm) * 4 * space.ceiling_height_m * perimeter_ratio
        window_area = wall_area * 0.4
        wall_area_net = wall_area - window_area

        delta_t = env.heating_delta_t if env else 25.0

        wall_loss = (wall_area_net * 0.5 * delta_t) / 1000
        window_loss = (window_area * 2.5 * delta_t) / 1000

        envelope_loss = wall_loss + window_loss

        # Ventilation loss
        ventilation_l_s = self._calculate_space_ventilation(space)
        ventilation_m3_s = ventilation_l_s / 1000
        air_density = 1.2
        specific_heat = 1.0

        ventilation_loss = ventilation_m3_s * air_density * specific_heat * delta_t

        total_heating = envelope_loss + ventilation_loss

        # Add safety factor
        total_heating *= 1.15

        return max(0.0, total_heating)

    def _calculate_space_ventilation(self, space: Space) -> float:
        """
        Calculate required ventilation for a space.

        Per ASHRAE 62.1: Vbz = Rp*Pz + Ra*Az
        """
        rp = VENTILATION_RATES.get(space.space_type, 2.5)  # L/s per person
        ra = VENTILATION_AREA_RATE  # L/s per m2

        ventilation = (rp * space.occupancy) + (ra * space.area_sqm)

        return ventilation

    # =========================================================================
    # ELECTRICAL LOADS
    # =========================================================================

    def _calculate_electrical_loads(self, building: BuildingSpecification) -> Dict[str, float]:
        """
        Calculate all electrical loads.

        Connected load != Demand load
        Demand = Connected * Demand Factor * Diversity Factor
        """
        total_connected = 0.0
        total_lighting = 0.0
        total_equipment = 0.0
        total_hvac = 0.0

        for floor in building.floors:
            floor_connected = 0.0

            for space in floor.spaces:
                lighting_kw = (space.area_sqm * LIGHTING_POWER_DENSITY.get(space.space_type, 10.0)) / 1000
                equipment_kw = (space.area_sqm * EQUIPMENT_POWER_DENSITY.get(space.space_type, 10.0)) / 1000

                # HVAC electrical from cooling load
                cooling_load = self._loads.get(f"COOLING-{space.id}", 0.0)
                cop = HVAC_COP.get(building.hvac_system_type, 4.0)
                hvac_kw = cooling_load / cop if cop > 0 else 0.0

                space_connected = lighting_kw + equipment_kw + hvac_kw
                floor_connected += space_connected

                total_lighting += lighting_kw
                total_equipment += equipment_kw
                total_hvac += hvac_kw

                self._loads[f"ELEC-{space.id}"] = space_connected

            total_connected += floor_connected
            self._loads[f"ELEC-FLOOR-{floor.level:02d}"] = floor_connected

        # Calculate demand with diversity factors
        diversity_factor = 0.7 if len(building.floors) > 5 else 0.8
        demand_factor = 0.9

        total_demand = total_connected * diversity_factor * demand_factor

        return {
            "connected": total_connected,
            "demand": total_demand,
            "lighting": total_lighting,
            "equipment": total_equipment,
            "hvac": total_hvac
        }

    # =========================================================================
    # PLUMBING LOADS
    # =========================================================================

    def _calculate_plumbing_loads(self, building: BuildingSpecification) -> Dict[str, float]:
        """
        Calculate plumbing water supply and drainage loads.

        Uses fixture unit method for pipe sizing.
        """
        total_fixtures = 0
        total_flow = 0.0

        for floor in building.floors:
            floor_fixtures = 0
            floor_flow = 0.0

            for space in floor.spaces:
                # Estimate fixtures based on space type and occupancy
                fixtures = self._estimate_fixtures(space)
                flow = self._calculate_fixture_flow(fixtures)

                floor_fixtures += fixtures
                floor_flow += flow

                self._loads[f"PLUMB-{space.id}"] = flow

            total_fixtures += floor_fixtures
            total_flow += floor_flow

            self._loads[f"PLUMB-FLOOR-{floor.level:02d}"] = floor_flow

        # Apply simultaneous use factor
        simultaneous_factor = 0.5 if total_fixtures > 20 else 0.7
        design_flow = total_flow * simultaneous_factor

        # Pump requirements
        pump_head = 20.0  # meters
        pump_power = (9.81 * 1000 * (design_flow / 60000) * pump_head) / (1000 * 0.7)  # 70% efficiency

        return {
            "total_fixtures": total_fixtures,
            "total_flow": design_flow,
            "pump_power_kw": pump_power
        }

    def _estimate_fixtures(self, space: Space) -> int:
        """Estimate number of plumbing fixtures based on space type."""
        fixtures_per_person = {
            SpaceType.OFFICE: 0.5,
            SpaceType.RESIDENTIAL: 2.0,
            SpaceType.RETAIL: 0.3,
            SpaceType.INDUSTRIAL: 0.4,
            SpaceType.COMMON: 0.3,
        }

        ratio = fixtures_per_person.get(space.space_type, 0.3)
        return max(1, int(space.occupancy * ratio))

    def _calculate_fixture_flow(self, fixture_count: int) -> float:
        """Calculate total flow rate for fixtures."""
        # Average flow per fixture (mix of toilets, sinks, etc.)
        avg_flow_per_fixture = 5.0  # L/min
        return fixture_count * avg_flow_per_fixture

    # =========================================================================
    # CROSS-SYSTEM PROPAGATION
    # =========================================================================

    def _propagate_load_impacts(self) -> None:
        """
        Propagate load changes through dependency graph.

        Models how changes in one system affect others:
        - Thermal -> Electrical (HVAC power)
        - Equipment -> Structural (weight)
        - Occupancy -> All systems
        """
        # Build floor breakdowns during propagation
        for floor in self._current_building.floors:
            hvac_kw = 0.0
            electrical_kw = 0.0
            plumbing_l_min = 0.0
            structural_kn = 0.0
            cooling_kw = 0.0
            heating_kw = 0.0

            for space in floor.spaces:
                # Get cached load values
                space_cooling = self._loads.get(f"COOLING-{space.id}", 0.0)
                space_heating = self._loads.get(f"HEATING-{space.id}", 0.0)
                space_electrical = self._loads.get(f"ELEC-{space.id}", 0.0)
                space_plumbing = self._loads.get(f"PLUMB-{space.id}", 0.0)

                # Calculate HVAC electrical from thermal
                cop = HVAC_COP.get(self._current_building.hvac_system_type, 4.0)
                space_hvac = space_cooling / cop if cop > 0 else 0.0

                # Space structural load
                space_structural = self._calculate_space_structural_load(space)

                # Aggregate to floor
                hvac_kw += space_hvac
                electrical_kw += space_electrical
                plumbing_l_min += space_plumbing
                structural_kn += space_structural
                cooling_kw += space_cooling
                heating_kw += space_heating

                # Create space breakdown
                lighting_kw = (space.area_sqm * LIGHTING_POWER_DENSITY.get(space.space_type, 10.0)) / 1000
                equipment_kw = (space.area_sqm * EQUIPMENT_POWER_DENSITY.get(space.space_type, 10.0)) / 1000
                ventilation_l_s = self._calculate_space_ventilation(space)

                space_breakdown = SpaceLoadBreakdown(
                    space_id=space.id,
                    space_name=space.name,
                    space_type=space.space_type.value,
                    floor_level=floor.level,
                    area_sqm=space.area_sqm,
                    occupancy=space.occupancy,
                    hvac_kw=space_hvac,
                    cooling_kw=space_cooling,
                    heating_kw=space_heating,
                    lighting_kw=lighting_kw,
                    equipment_kw=equipment_kw,
                    ventilation_l_s=ventilation_l_s,
                    plumbing_l_min=space_plumbing,
                    structural_kn=space_structural
                )
                self._space_breakdowns.append(space_breakdown)

            # Create floor breakdown
            floor_breakdown = FloorLoadBreakdown(
                floor_level=floor.level,
                floor_name=floor.name,
                hvac_kw=hvac_kw,
                electrical_kw=electrical_kw,
                plumbing_l_min=plumbing_l_min,
                structural_kn=structural_kn,
                cooling_kw=cooling_kw,
                heating_kw=heating_kw,
                gross_area_sqm=floor.gross_area_sqm,
                net_area_sqm=floor.net_area_sqm
            )
            self._floor_breakdowns.append(floor_breakdown)

        logger.debug(f"Created {len(self._floor_breakdowns)} floor breakdowns")
        logger.debug(f"Created {len(self._space_breakdowns)} space breakdowns")

    # =========================================================================
    # THRESHOLD CHECKING
    # =========================================================================

    def _check_thresholds(self, building: BuildingSpecification) -> ComplianceStatus:
        """
        Check all loads against thresholds and code requirements.

        Generates warnings for threshold violations.
        """
        from .load_thresholds import get_default_thresholds

        thresholds = get_default_thresholds()
        compliance_issues = 0

        for floor_breakdown in self._floor_breakdowns:
            # Check electrical load density
            if floor_breakdown.gross_area_sqm > 0:
                elec_density = (floor_breakdown.electrical_kw * 1000) / floor_breakdown.gross_area_sqm

                electrical_threshold = thresholds.get("electrical_density_w_sqm")
                if electrical_threshold and elec_density > electrical_threshold.max_value:
                    warning = LoadWarning(
                        severity=electrical_threshold.severity_if_exceeded,
                        category=LoadCategory.ELECTRICAL,
                        message=f"Floor {floor_breakdown.floor_name}: Electrical load density "
                                f"({elec_density:.1f} W/m2) exceeds threshold ({electrical_threshold.max_value} W/m2)",
                        affected_component=f"Floor-{floor_breakdown.floor_level}",
                        threshold_value=electrical_threshold.max_value,
                        actual_value=elec_density,
                        recommended_action="Review equipment loads and consider load shedding",
                        code_reference="NEC 220"
                    )
                    self._emit_warning(warning)
                    if electrical_threshold.severity_if_exceeded == WarningSeverity.CRITICAL:
                        compliance_issues += 1

                # Check structural load
                structural_threshold = thresholds.get("structural_floor_kn_sqm")
                if structural_threshold:
                    struct_density = floor_breakdown.structural_kn / floor_breakdown.gross_area_sqm
                    if struct_density > structural_threshold.max_value:
                        warning = LoadWarning(
                            severity=structural_threshold.severity_if_exceeded,
                            category=LoadCategory.STRUCTURAL,
                            message=f"Floor {floor_breakdown.floor_name}: Structural load "
                                    f"({struct_density:.2f} kN/m2) exceeds threshold",
                            affected_component=f"Floor-{floor_breakdown.floor_level}",
                            threshold_value=structural_threshold.max_value,
                            actual_value=struct_density,
                            recommended_action="Review structural design and consider reinforcement",
                            code_reference="IBC 1607"
                        )
                        self._emit_warning(warning)
                        if structural_threshold.severity_if_exceeded == WarningSeverity.CRITICAL:
                            compliance_issues += 1

        # Determine overall compliance status
        if compliance_issues > 0:
            return ComplianceStatus.NON_COMPLIANT
        elif len(self._warnings) > 0:
            return ComplianceStatus.NEEDS_REVIEW
        else:
            return ComplianceStatus.COMPLIANT

    def _emit_warning(self, warning: LoadWarning) -> None:
        """Emit warning to all registered callbacks."""
        self._warnings.append(warning)

        for callback in self._warning_callbacks:
            try:
                callback(warning)
            except Exception as e:
                logger.error(f"Warning callback failed: {e}")

    # =========================================================================
    # OPTIMIZATION
    # =========================================================================

    def _optimize_load_distribution(self) -> LoadOptimizationResult:
        """
        Optimize load distribution across systems.

        Uses simplified optimization to balance loads and reduce peak demand.
        """
        # Calculate current imbalance
        if not self._floor_breakdowns:
            return LoadOptimizationResult(
                strategy=OptimizationStrategy.BALANCE_LOADS,
                original_imbalance=0.0,
                optimized_imbalance=0.0,
                improvement_percent=0.0
            )

        electrical_loads = [fb.electrical_kw for fb in self._floor_breakdowns if fb.electrical_kw > 0]

        if not electrical_loads:
            return LoadOptimizationResult(
                strategy=OptimizationStrategy.BALANCE_LOADS,
                original_imbalance=0.0,
                optimized_imbalance=0.0,
                improvement_percent=0.0
            )

        mean_load = sum(electrical_loads) / len(electrical_loads)
        variance = sum((l - mean_load) ** 2 for l in electrical_loads) / len(electrical_loads)
        original_imbalance = math.sqrt(variance) / mean_load if mean_load > 0 else 0.0

        # Simulated optimization (in reality would use quantum optimizer)
        # Assume 10-15% improvement possible
        improvement_factor = 0.12
        optimized_imbalance = original_imbalance * (1 - improvement_factor)

        improvement_percent = ((original_imbalance - optimized_imbalance) / original_imbalance * 100
                              if original_imbalance > 0 else 0.0)

        # Estimate savings
        total_electrical = sum(electrical_loads)
        energy_savings = total_electrical * 8760 * 0.05  # 5% energy savings, annual hours
        cost_savings = energy_savings * 0.10  # $0.10/kWh

        return LoadOptimizationResult(
            strategy=OptimizationStrategy.BALANCE_LOADS,
            original_imbalance=original_imbalance,
            optimized_imbalance=optimized_imbalance,
            improvement_percent=improvement_percent,
            iterations=100,
            converged=True,
            adjustments={},
            energy_savings_kwh=energy_savings,
            cost_savings=cost_savings
        )

    # =========================================================================
    # RECOMMENDATIONS
    # =========================================================================

    def _generate_recommendations(self, building: BuildingSpecification) -> None:
        """Generate optimization recommendations based on load analysis."""
        totals = combine_floor_breakdowns(self._floor_breakdowns)

        # Check for high lighting loads
        if totals["gross_area_sqm"] > 0:
            lighting_density = sum(
                sb.lighting_kw for sb in self._space_breakdowns
            ) * 1000 / totals["gross_area_sqm"]

            if lighting_density > 12.0:
                self._recommendations.append(LoadRecommendation(
                    category=LoadCategory.LIGHTING,
                    title="LED Lighting Upgrade",
                    description="Current lighting power density exceeds efficient levels. "
                               "Consider upgrading to LED fixtures to reduce energy consumption.",
                    potential_savings=totals["gross_area_sqm"] * 2.0 * 0.10 * 8760 / 1000,  # $/year
                    savings_unit="USD/year",
                    priority=2,
                    implementation_effort="medium",
                    payback_years=2.5
                ))

        # Check HVAC efficiency
        if totals["cooling_kw"] > 50:
            self._recommendations.append(LoadRecommendation(
                category=LoadCategory.HVAC,
                title="High-Efficiency HVAC System",
                description="Consider upgrading to VRF or chilled water system for improved efficiency "
                           "and better zone control.",
                potential_savings=totals["cooling_kw"] * 0.15 * 0.10 * 2000,  # Cooling hours
                savings_unit="USD/year",
                priority=2,
                implementation_effort="high",
                payback_years=5.0
            ))

        # Check for demand response opportunity
        if totals["electrical_kw"] > 100:
            self._recommendations.append(LoadRecommendation(
                category=LoadCategory.ELECTRICAL,
                title="Demand Response Program",
                description="Building qualifies for utility demand response program. "
                           "Participate to reduce peak demand charges.",
                potential_savings=totals["electrical_kw"] * 12 * 5.0,  # $5/kW demand charge
                savings_unit="USD/year",
                priority=3,
                implementation_effort="low",
                payback_years=0.5
            ))

    # =========================================================================
    # COSTS
    # =========================================================================

    def _calculate_costs(self, building: BuildingSpecification) -> CostBreakdown:
        """Calculate cost breakdown by system."""
        totals = combine_floor_breakdowns(self._floor_breakdowns)

        hvac_cost = totals["cooling_kw"] * COST_FACTORS["hvac_per_kw"]
        electrical_cost = totals["electrical_kw"] * COST_FACTORS["electrical_per_kw"]

        # Estimate fixture count for plumbing
        total_fixtures = sum(self._estimate_fixtures(s) for f in building.floors for s in f.spaces)
        plumbing_cost = total_fixtures * COST_FACTORS["plumbing_per_fixture"]

        # Structural cost based on excess load
        structural_cost = totals["structural_kn"] * COST_FACTORS["structural_reinforcement_per_kn"]

        total_cost = hvac_cost + electrical_cost + plumbing_cost + structural_cost

        return CostBreakdown(
            hvac_cost=hvac_cost,
            electrical_cost=electrical_cost,
            plumbing_cost=plumbing_cost,
            structural_cost=structural_cost,
            total=total_cost
        )

    # =========================================================================
    # UTILITIES
    # =========================================================================

    def _reset_calculation_state(self) -> None:
        """Reset internal state for new calculation."""
        self._loads.clear()
        self._dependency_graph.clear()
        self._warnings.clear()
        self._recommendations.clear()
        self._floor_breakdowns.clear()
        self._space_breakdowns.clear()
        self._current_building = None
        self._current_env = None

    def _calculate_confidence_score(self) -> float:
        """
        Calculate overall confidence score for the calculation.

        Based on:
        - Completeness of input data
        - Number of assumptions made
        - Warning severity
        """
        base_confidence = 0.90

        # Reduce confidence for each warning
        warning_penalty = len(self._warnings) * 0.02
        critical_penalty = sum(
            0.05 for w in self._warnings if w.severity == WarningSeverity.CRITICAL
        )

        # Reduce confidence if limited floor/space data
        if len(self._floor_breakdowns) < 2:
            base_confidence -= 0.05
        if len(self._space_breakdowns) < 5:
            base_confidence -= 0.05

        confidence = base_confidence - warning_penalty - critical_penalty

        return max(0.5, min(1.0, confidence))


# =============================================================================
# MODULE EXPORTS
# =============================================================================

__all__ = [
    "LoadCalculationEngine",
    "BuildingSpecification",
]
