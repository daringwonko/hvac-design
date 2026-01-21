#!/usr/bin/env python3
"""
Load Calculation Types Module
=============================
Comprehensive dataclasses and enums for the Unified Load Calculation System.

This module provides:
- LoadCategory: Master enum for all load categories across disciplines
- WarningSeverity: Warning levels for threshold violations
- LoadType: Structural load classification
- LoadWarning: Warning dataclass with severity, message, and recommendations
- FloorLoadBreakdown: Per-floor load summary
- SpaceLoadBreakdown: Per-space load details
- CostBreakdown: Cost allocation by system
- LoadOptimizationResult: Results from quantum-inspired optimization
- LoadRecommendation: Suggested improvements
- EnvironmentalContext: Climate and site environmental data
- LoadResult: Complete load calculation output

All types are immutable dataclasses designed for cross-system integration.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum
from datetime import datetime


# =============================================================================
# ENUMS
# =============================================================================

class LoadCategory(Enum):
    """
    Master categories for all load types across disciplines.

    Organized by engineering discipline:
    - Structural: Physical loads affecting building structure
    - HVAC: Thermal loads for heating/cooling systems
    - Electrical: Power consumption loads
    - Plumbing: Water supply and drainage loads
    - Environmental: Site and climate-related loads
    """
    # Structural loads
    STRUCTURAL = "structural"
    DEAD = "dead_load"
    LIVE = "live_load"
    WIND = "wind_load"
    SEISMIC = "seismic_load"
    SNOW = "snow_load"
    IMPACT = "impact_load"

    # HVAC/Thermal loads
    HVAC = "hvac"
    COOLING = "cooling_load"
    HEATING = "heating_load"
    VENTILATION = "ventilation_load"
    SOLAR = "solar_gain"
    INTERNAL = "internal_heat_gain"
    LATENT = "latent_heat"
    THERMAL = "thermal_load"

    # Electrical loads
    ELECTRICAL = "electrical"
    POWER = "electrical_power"
    LIGHTING = "lighting_load"
    EQUIPMENT = "equipment_load"
    MOTOR = "motor_load"
    HVAC_ELECTRICAL = "hvac_electrical"
    RECEPTACLE = "receptacle_load"
    EMERGENCY = "emergency_load"

    # Plumbing loads
    PLUMBING = "plumbing"
    WATER_SUPPLY = "water_supply"
    WATER_PRESSURE = "water_pressure"
    DRAINAGE = "drainage_load"
    PUMP = "pump_load"
    HOT_WATER = "hot_water_demand"

    # Environmental
    ENVIRONMENTAL = "environmental"
    CLIMATE = "climate_load"

    # Composite/Summary loads
    TOTAL_STRUCTURAL = "total_structural"
    TOTAL_MEP = "total_mep"
    TOTAL_OPERATING = "total_operating"


class WarningSeverity(Enum):
    """
    Warning severity levels for threshold violations and compliance issues.

    Each level has specific UI behavior:
    - CRITICAL: Modal popup, blocks proceed - safety hazard or code violation
    - WARNING: Persistent banner - capacity exceeded, requires redesign
    - INFO: Toast notification - informational, best practice suggestion
    """
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class LoadType(Enum):
    """
    Structural load type classification per building codes (IBC/ASCE 7).

    Used for load combinations and factor applications:
    - DEAD: Permanent loads (self-weight, fixed equipment)
    - LIVE: Temporary loads (occupants, furniture)
    - WIND: Lateral wind pressure loads
    - SEISMIC: Earthquake lateral and vertical loads
    - SNOW: Roof snow accumulation loads
    - THERMAL: Temperature-induced expansion/contraction
    """
    DEAD = "dead"
    LIVE = "live"
    WIND = "wind"
    SEISMIC = "seismic"
    SNOW = "snow"
    THERMAL = "thermal"


class ComplianceStatus(Enum):
    """Compliance check result status."""
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    NEEDS_REVIEW = "needs_review"
    NOT_APPLICABLE = "not_applicable"


class OptimizationStrategy(Enum):
    """Load optimization strategies available."""
    MINIMIZE_ENERGY = "minimize_energy"
    MINIMIZE_COST = "minimize_cost"
    BALANCE_LOADS = "balance_loads"
    MAXIMIZE_EFFICIENCY = "maximize_efficiency"
    MINIMIZE_PEAK_DEMAND = "minimize_peak_demand"


# =============================================================================
# DATACLASSES
# =============================================================================

@dataclass(frozen=True)
class LoadWarning:
    """
    Warning triggered by load analysis or threshold violation.

    Attributes:
        severity: Warning level (CRITICAL, WARNING, INFO)
        category: Load category that triggered the warning
        message: Human-readable description of the issue
        affected_component: Component or system affected
        threshold_value: The threshold that was exceeded (if applicable)
        actual_value: The actual calculated value
        recommended_action: Suggested corrective action
        code_reference: Applicable building code reference
        auto_fixable: Whether this can be automatically resolved
    """
    severity: WarningSeverity
    category: LoadCategory
    message: str
    affected_component: str
    threshold_value: Optional[float] = None
    actual_value: Optional[float] = None
    recommended_action: str = ""
    code_reference: str = ""
    auto_fixable: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert warning to dictionary for JSON serialization."""
        return {
            "severity": self.severity.value,
            "category": self.category.value,
            "message": self.message,
            "affected_component": self.affected_component,
            "threshold_value": self.threshold_value,
            "actual_value": self.actual_value,
            "recommended_action": self.recommended_action,
            "code_reference": self.code_reference,
            "auto_fixable": self.auto_fixable
        }


@dataclass(frozen=True)
class FloorLoadBreakdown:
    """
    Load breakdown for a single floor level.

    Aggregates all MEP and structural loads per floor for
    vertical distribution analysis and riser sizing.

    Attributes:
        floor_level: Floor number (0=ground, -1=basement)
        floor_name: Descriptive floor name
        hvac_kw: Total HVAC electrical load in kW
        electrical_kw: Total electrical load in kW
        plumbing_l_min: Peak plumbing demand in L/min
        structural_kn: Total structural load in kN
        cooling_kw: Cooling capacity required in kW
        heating_kw: Heating capacity required in kW
        gross_area_sqm: Gross floor area in m2
        net_area_sqm: Net usable area in m2
    """
    floor_level: int
    floor_name: str
    hvac_kw: float
    electrical_kw: float
    plumbing_l_min: float
    structural_kn: float
    cooling_kw: float = 0.0
    heating_kw: float = 0.0
    gross_area_sqm: float = 0.0
    net_area_sqm: float = 0.0

    @property
    def load_per_sqm(self) -> Dict[str, float]:
        """Calculate load intensities per square meter."""
        if self.gross_area_sqm <= 0:
            return {
                "hvac_w_per_sqm": 0.0,
                "electrical_w_per_sqm": 0.0,
                "structural_kn_per_sqm": 0.0
            }
        return {
            "hvac_w_per_sqm": (self.hvac_kw * 1000) / self.gross_area_sqm,
            "electrical_w_per_sqm": (self.electrical_kw * 1000) / self.gross_area_sqm,
            "structural_kn_per_sqm": self.structural_kn / self.gross_area_sqm
        }

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "floor_level": self.floor_level,
            "floor_name": self.floor_name,
            "hvac_kw": round(self.hvac_kw, 2),
            "electrical_kw": round(self.electrical_kw, 2),
            "plumbing_l_min": round(self.plumbing_l_min, 2),
            "structural_kn": round(self.structural_kn, 2),
            "cooling_kw": round(self.cooling_kw, 2),
            "heating_kw": round(self.heating_kw, 2),
            "gross_area_sqm": round(self.gross_area_sqm, 2),
            "net_area_sqm": round(self.net_area_sqm, 2),
            "load_per_sqm": {k: round(v, 2) for k, v in self.load_per_sqm.items()}
        }


@dataclass(frozen=True)
class SpaceLoadBreakdown:
    """
    Detailed load breakdown for an individual space.

    Provides granular load data for each room/zone for
    equipment sizing and energy modeling.

    Attributes:
        space_id: Unique identifier for the space
        space_name: Descriptive name
        space_type: Type of space (office, residential, etc.)
        floor_level: Floor the space is on
        area_sqm: Space area in m2
        occupancy: Design occupancy count
        hvac_kw: HVAC electrical load
        cooling_kw: Cooling load (sensible + latent)
        heating_kw: Heating load
        lighting_kw: Lighting electrical load
        equipment_kw: Equipment/plug loads
        ventilation_l_s: Required ventilation in L/s
        plumbing_l_min: Plumbing fixture demand
        structural_kn: Structural load contribution
    """
    space_id: str
    space_name: str
    space_type: str
    floor_level: int
    area_sqm: float
    occupancy: int
    hvac_kw: float = 0.0
    cooling_kw: float = 0.0
    heating_kw: float = 0.0
    lighting_kw: float = 0.0
    equipment_kw: float = 0.0
    ventilation_l_s: float = 0.0
    plumbing_l_min: float = 0.0
    structural_kn: float = 0.0

    @property
    def total_electrical_kw(self) -> float:
        """Total electrical load including all components."""
        return self.hvac_kw + self.lighting_kw + self.equipment_kw

    @property
    def electrical_w_per_sqm(self) -> float:
        """Electrical power density in W/m2."""
        if self.area_sqm <= 0:
            return 0.0
        return (self.total_electrical_kw * 1000) / self.area_sqm

    @property
    def cooling_w_per_sqm(self) -> float:
        """Cooling load density in W/m2."""
        if self.area_sqm <= 0:
            return 0.0
        return (self.cooling_kw * 1000) / self.area_sqm

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "space_id": self.space_id,
            "space_name": self.space_name,
            "space_type": self.space_type,
            "floor_level": self.floor_level,
            "area_sqm": round(self.area_sqm, 2),
            "occupancy": self.occupancy,
            "hvac_kw": round(self.hvac_kw, 3),
            "cooling_kw": round(self.cooling_kw, 3),
            "heating_kw": round(self.heating_kw, 3),
            "lighting_kw": round(self.lighting_kw, 3),
            "equipment_kw": round(self.equipment_kw, 3),
            "ventilation_l_s": round(self.ventilation_l_s, 2),
            "plumbing_l_min": round(self.plumbing_l_min, 2),
            "structural_kn": round(self.structural_kn, 2),
            "total_electrical_kw": round(self.total_electrical_kw, 3),
            "electrical_w_per_sqm": round(self.electrical_w_per_sqm, 1),
            "cooling_w_per_sqm": round(self.cooling_w_per_sqm, 1)
        }


@dataclass(frozen=True)
class CostBreakdown:
    """
    Cost allocation breakdown by MEP discipline.

    Provides estimated costs for equipment, installation,
    and operation based on calculated loads.

    Attributes:
        hvac_cost: HVAC system cost (equipment + installation)
        electrical_cost: Electrical system cost
        plumbing_cost: Plumbing system cost
        structural_cost: Structural reinforcement cost (if needed)
        total: Total estimated cost
        currency: Currency code (default USD)
        confidence_level: Estimate confidence (0.0-1.0)
    """
    hvac_cost: float
    electrical_cost: float
    plumbing_cost: float
    structural_cost: float
    total: float
    currency: str = "USD"
    confidence_level: float = 0.8

    @property
    def breakdown_percentages(self) -> Dict[str, float]:
        """Calculate percentage breakdown by discipline."""
        if self.total <= 0:
            return {
                "hvac_percent": 0.0,
                "electrical_percent": 0.0,
                "plumbing_percent": 0.0,
                "structural_percent": 0.0
            }
        return {
            "hvac_percent": (self.hvac_cost / self.total) * 100,
            "electrical_percent": (self.electrical_cost / self.total) * 100,
            "plumbing_percent": (self.plumbing_cost / self.total) * 100,
            "structural_percent": (self.structural_cost / self.total) * 100
        }

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "hvac_cost": round(self.hvac_cost, 2),
            "electrical_cost": round(self.electrical_cost, 2),
            "plumbing_cost": round(self.plumbing_cost, 2),
            "structural_cost": round(self.structural_cost, 2),
            "total": round(self.total, 2),
            "currency": self.currency,
            "confidence_level": round(self.confidence_level, 2),
            "breakdown_percentages": {
                k: round(v, 1) for k, v in self.breakdown_percentages.items()
            }
        }


@dataclass(frozen=True)
class LoadOptimizationResult:
    """
    Result from load optimization algorithms.

    Contains before/after metrics and improvement analysis
    from quantum-inspired or conventional optimization.

    Attributes:
        strategy: Optimization strategy used
        original_imbalance: Load imbalance before optimization (0-1)
        optimized_imbalance: Load imbalance after optimization (0-1)
        improvement_percent: Percentage improvement achieved
        iterations: Number of optimization iterations performed
        converged: Whether optimization converged successfully
        adjustments: Dictionary of load adjustments by component
        energy_savings_kwh: Estimated annual energy savings
        cost_savings: Estimated annual cost savings
    """
    strategy: OptimizationStrategy
    original_imbalance: float
    optimized_imbalance: float
    improvement_percent: float
    iterations: int = 0
    converged: bool = True
    adjustments: Dict[str, float] = field(default_factory=dict)
    energy_savings_kwh: float = 0.0
    cost_savings: float = 0.0

    @property
    def is_significant_improvement(self) -> bool:
        """Check if optimization achieved significant improvement (>5%)."""
        return self.improvement_percent > 5.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "strategy": self.strategy.value,
            "original_imbalance": round(self.original_imbalance, 4),
            "optimized_imbalance": round(self.optimized_imbalance, 4),
            "improvement_percent": round(self.improvement_percent, 2),
            "iterations": self.iterations,
            "converged": self.converged,
            "adjustments": {k: round(v, 4) for k, v in self.adjustments.items()},
            "energy_savings_kwh": round(self.energy_savings_kwh, 1),
            "cost_savings": round(self.cost_savings, 2),
            "is_significant_improvement": self.is_significant_improvement
        }


@dataclass(frozen=True)
class LoadRecommendation:
    """
    Actionable recommendation for load improvement.

    Generated from load analysis to suggest efficiency
    improvements, cost reductions, or compliance fixes.

    Attributes:
        category: Load category this recommendation applies to
        title: Short title for the recommendation
        description: Detailed description and rationale
        potential_savings: Estimated savings (cost or energy)
        savings_unit: Unit for potential_savings
        priority: Priority level (1=highest, 5=lowest)
        implementation_effort: Effort level (low, medium, high)
        payback_years: Estimated payback period in years
    """
    category: LoadCategory
    title: str
    description: str
    potential_savings: float
    savings_unit: str = "USD/year"
    priority: int = 3
    implementation_effort: str = "medium"
    payback_years: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "category": self.category.value,
            "title": self.title,
            "description": self.description,
            "potential_savings": round(self.potential_savings, 2),
            "savings_unit": self.savings_unit,
            "priority": self.priority,
            "implementation_effort": self.implementation_effort,
            "payback_years": round(self.payback_years, 1)
        }


@dataclass(frozen=True)
class EnvironmentalContext:
    """
    Environmental and climate context for load calculations.

    Provides site-specific environmental data required for
    accurate thermal loads, structural loads, and compliance.

    Attributes:
        climate_zone: ASHRAE climate zone (1A-8)
        design_cooling_temp_c: Design outdoor cooling temperature (C)
        design_heating_temp_c: Design outdoor heating temperature (C)
        indoor_temp_cooling_c: Design indoor cooling setpoint (C)
        indoor_temp_heating_c: Design indoor heating setpoint (C)
        wind_zone: Wind exposure zone (A, B, C, D)
        seismic_zone: Seismic design category (A-F)
        ground_snow_load_kpa: Ground snow load in kPa
        elevation_m: Site elevation in meters
        latitude: Site latitude in degrees
        humidity_design_percent: Design relative humidity
    """
    climate_zone: str
    design_cooling_temp_c: float
    design_heating_temp_c: float
    indoor_temp_cooling_c: float = 24.0
    indoor_temp_heating_c: float = 21.0
    wind_zone: str = "B"
    seismic_zone: str = "B"
    ground_snow_load_kpa: float = 0.0
    elevation_m: float = 0.0
    latitude: float = 40.0
    humidity_design_percent: float = 50.0

    @property
    def cooling_delta_t(self) -> float:
        """Temperature difference for cooling calculations."""
        return self.design_cooling_temp_c - self.indoor_temp_cooling_c

    @property
    def heating_delta_t(self) -> float:
        """Temperature difference for heating calculations."""
        return self.indoor_temp_heating_c - self.design_heating_temp_c

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "climate_zone": self.climate_zone,
            "design_cooling_temp_c": self.design_cooling_temp_c,
            "design_heating_temp_c": self.design_heating_temp_c,
            "indoor_temp_cooling_c": self.indoor_temp_cooling_c,
            "indoor_temp_heating_c": self.indoor_temp_heating_c,
            "wind_zone": self.wind_zone,
            "seismic_zone": self.seismic_zone,
            "ground_snow_load_kpa": self.ground_snow_load_kpa,
            "elevation_m": self.elevation_m,
            "latitude": self.latitude,
            "humidity_design_percent": self.humidity_design_percent,
            "cooling_delta_t": round(self.cooling_delta_t, 1),
            "heating_delta_t": round(self.heating_delta_t, 1)
        }


@dataclass
class LoadResult:
    """
    Complete load calculation result for a building.

    This is the main output dataclass containing all calculated
    loads, breakdowns, warnings, recommendations, and costs.

    Attributes:
        building_id: Unique identifier for the building
        calculated_at: Timestamp of calculation
        total_structural_kn: Total structural load in kN
        total_cooling_kw: Total cooling load in kW
        total_heating_kw: Total heating load in kW
        total_electrical_kw: Total connected electrical load in kW
        electrical_demand_kw: Peak electrical demand in kW
        total_plumbing_l_min: Peak plumbing demand in L/min
        floor_breakdowns: Load breakdown per floor
        space_breakdowns: Load breakdown per space
        warnings: List of generated warnings
        recommendations: List of optimization recommendations
        cost_breakdown: Cost allocation by system
        optimization_result: Results from load optimization
        environmental_context: Environmental conditions used
        compliance_status: Overall compliance status
        confidence_score: Overall confidence in calculations (0-1)
    """
    building_id: str
    calculated_at: datetime
    total_structural_kn: float
    total_cooling_kw: float
    total_heating_kw: float
    total_electrical_kw: float
    electrical_demand_kw: float
    total_plumbing_l_min: float
    floor_breakdowns: List[FloorLoadBreakdown] = field(default_factory=list)
    space_breakdowns: List[SpaceLoadBreakdown] = field(default_factory=list)
    warnings: List[LoadWarning] = field(default_factory=list)
    recommendations: List[LoadRecommendation] = field(default_factory=list)
    cost_breakdown: Optional[CostBreakdown] = None
    optimization_result: Optional[LoadOptimizationResult] = None
    environmental_context: Optional[EnvironmentalContext] = None
    compliance_status: ComplianceStatus = ComplianceStatus.NEEDS_REVIEW
    confidence_score: float = 0.85

    @property
    def total_mep_load_kw(self) -> float:
        """Total MEP load (HVAC cooling equivalent + electrical)."""
        return self.total_cooling_kw + self.total_electrical_kw

    @property
    def warning_count_by_severity(self) -> Dict[str, int]:
        """Count warnings by severity level."""
        counts = {sev.value: 0 for sev in WarningSeverity}
        for warning in self.warnings:
            counts[warning.severity.value] += 1
        return counts

    @property
    def has_critical_warnings(self) -> bool:
        """Check if any critical warnings exist."""
        return any(w.severity == WarningSeverity.CRITICAL for w in self.warnings)

    @property
    def is_compliant(self) -> bool:
        """Check if building passes compliance checks."""
        return self.compliance_status == ComplianceStatus.COMPLIANT

    def get_floor_breakdown(self, floor_level: int) -> Optional[FloorLoadBreakdown]:
        """Get load breakdown for a specific floor."""
        for breakdown in self.floor_breakdowns:
            if breakdown.floor_level == floor_level:
                return breakdown
        return None

    def get_space_breakdown(self, space_id: str) -> Optional[SpaceLoadBreakdown]:
        """Get load breakdown for a specific space."""
        for breakdown in self.space_breakdowns:
            if breakdown.space_id == space_id:
                return breakdown
        return None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "building_id": self.building_id,
            "calculated_at": self.calculated_at.isoformat(),
            "summary": {
                "total_structural_kn": round(self.total_structural_kn, 2),
                "total_cooling_kw": round(self.total_cooling_kw, 2),
                "total_heating_kw": round(self.total_heating_kw, 2),
                "total_electrical_kw": round(self.total_electrical_kw, 2),
                "electrical_demand_kw": round(self.electrical_demand_kw, 2),
                "total_plumbing_l_min": round(self.total_plumbing_l_min, 2),
                "total_mep_load_kw": round(self.total_mep_load_kw, 2)
            },
            "floor_breakdowns": [fb.to_dict() for fb in self.floor_breakdowns],
            "space_breakdowns": [sb.to_dict() for sb in self.space_breakdowns],
            "warnings": [w.to_dict() for w in self.warnings],
            "warning_summary": self.warning_count_by_severity,
            "recommendations": [r.to_dict() for r in self.recommendations],
            "cost_breakdown": self.cost_breakdown.to_dict() if self.cost_breakdown else None,
            "optimization_result": self.optimization_result.to_dict() if self.optimization_result else None,
            "environmental_context": self.environmental_context.to_dict() if self.environmental_context else None,
            "compliance_status": self.compliance_status.value,
            "confidence_score": round(self.confidence_score, 2),
            "has_critical_warnings": self.has_critical_warnings,
            "is_compliant": self.is_compliant
        }

    def to_summary_dict(self) -> Dict[str, Any]:
        """Generate condensed summary for UI dashboard."""
        return {
            "building_id": self.building_id,
            "calculated_at": self.calculated_at.isoformat(),
            "loads": {
                "structural_kn": round(self.total_structural_kn, 1),
                "cooling_kw": round(self.total_cooling_kw, 1),
                "heating_kw": round(self.total_heating_kw, 1),
                "electrical_kw": round(self.electrical_demand_kw, 1),
                "plumbing_l_min": round(self.total_plumbing_l_min, 1)
            },
            "warnings": self.warning_count_by_severity,
            "compliance": self.compliance_status.value,
            "confidence": round(self.confidence_score * 100, 0),
            "floor_count": len(self.floor_breakdowns),
            "space_count": len(self.space_breakdowns),
            "total_cost": self.cost_breakdown.total if self.cost_breakdown else 0.0
        }


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def create_default_environmental_context(climate_zone: str = "4A") -> EnvironmentalContext:
    """
    Create default environmental context based on climate zone.

    ASHRAE Climate Zone defaults:
    - Zone 1: Hot-Humid (Miami)
    - Zone 2: Hot-Dry (Phoenix)
    - Zone 3: Warm-Marine (San Francisco)
    - Zone 4: Mixed-Humid (Washington DC)
    - Zone 5: Cool-Humid (Chicago)
    - Zone 6: Cold-Dry (Minneapolis)
    - Zone 7: Very Cold (Duluth)
    - Zone 8: Subarctic (Fairbanks)
    """
    zone_defaults = {
        "1A": (35.0, 10.0, "C", "A", 0.0),
        "2A": (38.0, 5.0, "C", "A", 0.0),
        "2B": (42.0, 2.0, "B", "B", 0.0),
        "3A": (35.0, -2.0, "B", "B", 0.5),
        "3B": (38.0, 0.0, "B", "C", 0.0),
        "3C": (30.0, 5.0, "B", "D", 0.0),
        "4A": (33.0, -8.0, "B", "B", 1.2),
        "4B": (36.0, -5.0, "B", "B", 0.5),
        "4C": (28.0, 0.0, "B", "D", 0.5),
        "5A": (32.0, -15.0, "B", "B", 1.5),
        "5B": (35.0, -12.0, "B", "B", 1.0),
        "6A": (30.0, -20.0, "B", "B", 2.0),
        "6B": (32.0, -18.0, "B", "B", 1.5),
        "7": (28.0, -28.0, "B", "B", 2.5),
        "8": (25.0, -40.0, "B", "A", 3.0),
    }

    defaults = zone_defaults.get(climate_zone, (33.0, -8.0, "B", "B", 1.2))

    return EnvironmentalContext(
        climate_zone=climate_zone,
        design_cooling_temp_c=defaults[0],
        design_heating_temp_c=defaults[1],
        wind_zone=defaults[2],
        seismic_zone=defaults[3],
        ground_snow_load_kpa=defaults[4]
    )


def combine_floor_breakdowns(breakdowns: List[FloorLoadBreakdown]) -> Dict[str, float]:
    """
    Combine multiple floor breakdowns into building totals.

    Returns:
        Dictionary with total values for each load type.
    """
    totals = {
        "hvac_kw": 0.0,
        "electrical_kw": 0.0,
        "plumbing_l_min": 0.0,
        "structural_kn": 0.0,
        "cooling_kw": 0.0,
        "heating_kw": 0.0,
        "gross_area_sqm": 0.0,
        "net_area_sqm": 0.0
    }

    for breakdown in breakdowns:
        totals["hvac_kw"] += breakdown.hvac_kw
        totals["electrical_kw"] += breakdown.electrical_kw
        totals["plumbing_l_min"] += breakdown.plumbing_l_min
        totals["structural_kn"] += breakdown.structural_kn
        totals["cooling_kw"] += breakdown.cooling_kw
        totals["heating_kw"] += breakdown.heating_kw
        totals["gross_area_sqm"] += breakdown.gross_area_sqm
        totals["net_area_sqm"] += breakdown.net_area_sqm

    return totals


# =============================================================================
# TYPE EXPORTS
# =============================================================================

__all__ = [
    # Enums
    "LoadCategory",
    "WarningSeverity",
    "LoadType",
    "ComplianceStatus",
    "OptimizationStrategy",
    # Dataclasses
    "LoadWarning",
    "FloorLoadBreakdown",
    "SpaceLoadBreakdown",
    "CostBreakdown",
    "LoadOptimizationResult",
    "LoadRecommendation",
    "EnvironmentalContext",
    "LoadResult",
    # Utilities
    "create_default_environmental_context",
    "combine_floor_breakdowns",
]
