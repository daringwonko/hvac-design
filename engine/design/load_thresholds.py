#!/usr/bin/env python3
"""
Load Thresholds Module
======================
Defines threshold values and compliance rules for load calculations.

Contains:
- LoadThreshold: Dataclass for threshold definitions
- ComplianceRule: Dataclass for code compliance checks
- ThresholdChecker: Class to check loads against thresholds
- Default thresholds for IBC, NEC, ASHRAE, and other codes

Building Code References:
- IBC (International Building Code) - Structural loads
- NEC (National Electrical Code) - Electrical loads
- ASHRAE 90.1 - Energy efficiency
- ASHRAE 62.1 - Ventilation
- IPC (International Plumbing Code) - Plumbing loads
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable, Any
from enum import Enum

from .load_types import (
    LoadCategory,
    WarningSeverity,
    LoadType,
    LoadWarning,
    LoadResult,
    FloorLoadBreakdown,
    SpaceLoadBreakdown,
)


# =============================================================================
# DATACLASSES
# =============================================================================

@dataclass(frozen=True)
class LoadThreshold:
    """
    Threshold definition for a specific load type.

    Defines acceptable range and severity of exceeding limits.

    Attributes:
        load_type: Type of load this threshold applies to
        min_value: Minimum acceptable value (or None if no minimum)
        max_value: Maximum acceptable value (or None if no maximum)
        unit: Unit of measurement
        severity_if_exceeded: Warning severity if threshold exceeded
        code_reference: Building code reference for this threshold
        description: Human-readable description
        mitigation_action: Recommended action if exceeded
    """
    load_type: str
    min_value: Optional[float]
    max_value: Optional[float]
    unit: str
    severity_if_exceeded: WarningSeverity
    code_reference: str = ""
    description: str = ""
    mitigation_action: str = ""

    def check(self, value: float) -> Optional[str]:
        """
        Check if a value violates this threshold.

        Args:
            value: Value to check

        Returns:
            Violation message if threshold exceeded, None otherwise
        """
        if self.min_value is not None and value < self.min_value:
            return f"{self.load_type} ({value:.2f} {self.unit}) below minimum ({self.min_value} {self.unit})"

        if self.max_value is not None and value > self.max_value:
            return f"{self.load_type} ({value:.2f} {self.unit}) exceeds maximum ({self.max_value} {self.unit})"

        return None

    def is_within_limits(self, value: float) -> bool:
        """Check if value is within acceptable limits."""
        if self.min_value is not None and value < self.min_value:
            return False
        if self.max_value is not None and value > self.max_value:
            return False
        return True

    def get_utilization(self, value: float) -> float:
        """
        Calculate utilization percentage of threshold.

        Returns percentage of max_value used (0-100+).
        """
        if self.max_value is None or self.max_value == 0:
            return 0.0
        return (value / self.max_value) * 100

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "load_type": self.load_type,
            "min_value": self.min_value,
            "max_value": self.max_value,
            "unit": self.unit,
            "severity_if_exceeded": self.severity_if_exceeded.value,
            "code_reference": self.code_reference,
            "description": self.description,
            "mitigation_action": self.mitigation_action
        }


@dataclass
class ComplianceRule:
    """
    Code compliance rule with checking function.

    Defines a specific compliance requirement that can be
    programmatically verified against load calculation results.

    Attributes:
        rule_id: Unique identifier for the rule
        description: Human-readable description of the requirement
        code_reference: Building code section reference
        applicable_load_types: List of load types this rule applies to
        check_function: Function that takes LoadResult and returns violations
        severity: Severity level if rule is violated
        category: Load category this rule relates to
    """
    rule_id: str
    description: str
    code_reference: str
    applicable_load_types: List[str]
    check_function: Callable[[LoadResult], List[str]]
    severity: WarningSeverity = WarningSeverity.WARNING
    category: LoadCategory = LoadCategory.STRUCTURAL

    def check(self, load_result: LoadResult) -> List[LoadWarning]:
        """
        Check compliance rule against load result.

        Args:
            load_result: Complete load calculation result

        Returns:
            List of LoadWarning objects for violations
        """
        violations = self.check_function(load_result)
        warnings = []

        for violation in violations:
            warning = LoadWarning(
                severity=self.severity,
                category=self.category,
                message=f"[{self.rule_id}] {violation}",
                affected_component=self.code_reference,
                recommended_action=f"Review {self.code_reference} requirements",
                code_reference=self.code_reference
            )
            warnings.append(warning)

        return warnings


# =============================================================================
# DEFAULT THRESHOLDS
# =============================================================================

# Structural thresholds (per IBC/ASCE 7)
STRUCTURAL_THRESHOLDS = {
    "structural_floor_kn_sqm": LoadThreshold(
        load_type="Floor Structural Load",
        min_value=None,
        max_value=12.0,  # kN/m2 for typical office
        unit="kN/m2",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="IBC 1607",
        description="Maximum floor load including dead and live loads",
        mitigation_action="Review structural design, consider reinforcement"
    ),
    "structural_roof_kn_sqm": LoadThreshold(
        load_type="Roof Structural Load",
        min_value=None,
        max_value=8.0,  # kN/m2
        unit="kN/m2",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="IBC 1607.13",
        description="Maximum roof load including dead, live, and environmental",
        mitigation_action="Review roof structure and drainage"
    ),
    "live_load_residential_kn_sqm": LoadThreshold(
        load_type="Residential Live Load",
        min_value=1.9,  # Minimum required
        max_value=4.8,
        unit="kN/m2",
        severity_if_exceeded=WarningSeverity.INFO,
        code_reference="IBC Table 1607.1",
        description="Design live load for residential occupancy",
        mitigation_action="Verify occupancy classification"
    ),
    "live_load_office_kn_sqm": LoadThreshold(
        load_type="Office Live Load",
        min_value=2.4,  # Minimum required
        max_value=6.0,
        unit="kN/m2",
        severity_if_exceeded=WarningSeverity.INFO,
        code_reference="IBC Table 1607.1",
        description="Design live load for office occupancy",
        mitigation_action="Verify furniture and equipment loads"
    ),
    "live_load_assembly_kn_sqm": LoadThreshold(
        load_type="Assembly Live Load",
        min_value=4.8,  # Minimum required
        max_value=12.0,
        unit="kN/m2",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="IBC Table 1607.1",
        description="Design live load for assembly occupancy",
        mitigation_action="Review crowd loading scenarios"
    ),
    "wind_pressure_kpa": LoadThreshold(
        load_type="Design Wind Pressure",
        min_value=None,
        max_value=3.0,  # kPa
        unit="kPa",
        severity_if_exceeded=WarningSeverity.CRITICAL,
        code_reference="ASCE 7-22 Chapter 26",
        description="Maximum design wind pressure on facade",
        mitigation_action="Review facade design and connections"
    ),
    "seismic_coefficient": LoadThreshold(
        load_type="Seismic Design Coefficient",
        min_value=0.01,
        max_value=0.30,
        unit="g",
        severity_if_exceeded=WarningSeverity.CRITICAL,
        code_reference="ASCE 7-22 Chapter 12",
        description="Seismic response coefficient Cs",
        mitigation_action="Review seismic design category and detailing"
    ),
}

# Electrical thresholds (per NEC)
ELECTRICAL_THRESHOLDS = {
    "electrical_density_w_sqm": LoadThreshold(
        load_type="Electrical Load Density",
        min_value=None,
        max_value=150.0,  # W/m2
        unit="W/m2",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="NEC 220",
        description="Connected electrical load per unit area",
        mitigation_action="Review equipment schedules and consider load management"
    ),
    "lighting_density_w_sqm": LoadThreshold(
        load_type="Lighting Power Density",
        min_value=None,
        max_value=12.0,  # W/m2 per ASHRAE 90.1
        unit="W/m2",
        severity_if_exceeded=WarningSeverity.INFO,
        code_reference="ASHRAE 90.1-2019",
        description="Lighting power density for energy compliance",
        mitigation_action="Consider LED lighting upgrade"
    ),
    "receptacle_density_w_sqm": LoadThreshold(
        load_type="Receptacle Load Density",
        min_value=None,
        max_value=25.0,  # W/m2
        unit="W/m2",
        severity_if_exceeded=WarningSeverity.INFO,
        code_reference="NEC 220.14",
        description="Receptacle/equipment load per unit area",
        mitigation_action="Review equipment schedules"
    ),
    "demand_factor": LoadThreshold(
        load_type="Demand Factor",
        min_value=0.5,
        max_value=1.0,
        unit="ratio",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="NEC 220.42",
        description="Ratio of maximum demand to connected load",
        mitigation_action="Apply appropriate demand factors per NEC"
    ),
    "voltage_drop_percent": LoadThreshold(
        load_type="Voltage Drop",
        min_value=None,
        max_value=3.0,  # 3% for branch circuits
        unit="%",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="NEC 210.19(A) Informational Note 4",
        description="Maximum voltage drop in branch circuits",
        mitigation_action="Increase conductor size or reduce circuit length"
    ),
    "panel_load_percent": LoadThreshold(
        load_type="Panel Utilization",
        min_value=None,
        max_value=80.0,  # 80% of panel capacity
        unit="%",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="NEC 408.30",
        description="Panel load as percentage of capacity",
        mitigation_action="Consider additional panels or load balancing"
    ),
}

# HVAC thresholds (per ASHRAE)
HVAC_THRESHOLDS = {
    "cooling_density_w_sqm": LoadThreshold(
        load_type="Cooling Load Density",
        min_value=None,
        max_value=200.0,  # W/m2
        unit="W/m2",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="ASHRAE Handbook",
        description="Space cooling load per unit area",
        mitigation_action="Review envelope design and internal loads"
    ),
    "heating_density_w_sqm": LoadThreshold(
        load_type="Heating Load Density",
        min_value=None,
        max_value=150.0,  # W/m2
        unit="W/m2",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="ASHRAE Handbook",
        description="Space heating load per unit area",
        mitigation_action="Review envelope insulation"
    ),
    "ventilation_l_s_person": LoadThreshold(
        load_type="Outdoor Air per Person",
        min_value=2.5,  # Minimum per ASHRAE 62.1
        max_value=15.0,
        unit="L/s/person",
        severity_if_exceeded=WarningSeverity.CRITICAL,
        code_reference="ASHRAE 62.1-2022",
        description="Outdoor air ventilation rate per occupant",
        mitigation_action="Verify ventilation system design meets minimum requirements"
    ),
    "supply_air_temp_c": LoadThreshold(
        load_type="Supply Air Temperature",
        min_value=12.0,
        max_value=18.0,
        unit="C",
        severity_if_exceeded=WarningSeverity.INFO,
        code_reference="ASHRAE Handbook",
        description="Cooling supply air temperature",
        mitigation_action="Review system design and comfort requirements"
    ),
    "cop_cooling": LoadThreshold(
        load_type="Cooling COP",
        min_value=3.0,  # Minimum efficiency
        max_value=None,
        unit="ratio",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="ASHRAE 90.1-2019",
        description="Coefficient of performance for cooling",
        mitigation_action="Consider higher efficiency equipment"
    ),
    "duct_velocity_m_s": LoadThreshold(
        load_type="Duct Air Velocity",
        min_value=3.0,
        max_value=12.0,  # m/s max for low noise
        unit="m/s",
        severity_if_exceeded=WarningSeverity.INFO,
        code_reference="ASHRAE Handbook",
        description="Air velocity in ductwork",
        mitigation_action="Resize ducts for appropriate velocity"
    ),
}

# Plumbing thresholds (per IPC)
PLUMBING_THRESHOLDS = {
    "water_supply_pressure_kpa": LoadThreshold(
        load_type="Water Supply Pressure",
        min_value=140.0,  # 20 psi minimum
        max_value=550.0,  # 80 psi maximum
        unit="kPa",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="IPC 604",
        description="Water supply pressure at fixtures",
        mitigation_action="Install pressure regulator or booster pump"
    ),
    "hot_water_temp_c": LoadThreshold(
        load_type="Hot Water Temperature",
        min_value=49.0,  # 120F minimum for sanitation
        max_value=60.0,  # 140F maximum for safety
        unit="C",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="IPC 501.2",
        description="Hot water delivery temperature",
        mitigation_action="Adjust water heater setpoint"
    ),
    "drainage_slope_percent": LoadThreshold(
        load_type="Drainage Slope",
        min_value=1.0,  # 1% minimum slope
        max_value=None,
        unit="%",
        severity_if_exceeded=WarningSeverity.CRITICAL,
        code_reference="IPC 704.1",
        description="Minimum drainage pipe slope",
        mitigation_action="Verify drainage layout meets minimum slope"
    ),
    "fixture_unit_per_branch": LoadThreshold(
        load_type="Fixture Units per Branch",
        min_value=None,
        max_value=6.0,  # For 2" pipe
        unit="FU",
        severity_if_exceeded=WarningSeverity.WARNING,
        code_reference="IPC Table 709.1",
        description="Maximum fixture units on branch drain",
        mitigation_action="Increase branch pipe size or add branches"
    ),
}


# =============================================================================
# THRESHOLD CHECKER CLASS
# =============================================================================

class ThresholdChecker:
    """
    Checks load calculation results against defined thresholds.

    Provides comprehensive validation of all load types against
    building code requirements and best practice limits.

    Usage:
        checker = ThresholdChecker()
        warnings = checker.check_all(load_result)
        for warning in warnings:
            print(f"{warning.severity}: {warning.message}")
    """

    def __init__(self, custom_thresholds: Optional[Dict[str, LoadThreshold]] = None):
        """
        Initialize ThresholdChecker with default and custom thresholds.

        Args:
            custom_thresholds: Optional dictionary of custom thresholds to override defaults
        """
        # Combine all default thresholds
        self._thresholds: Dict[str, LoadThreshold] = {}
        self._thresholds.update(STRUCTURAL_THRESHOLDS)
        self._thresholds.update(ELECTRICAL_THRESHOLDS)
        self._thresholds.update(HVAC_THRESHOLDS)
        self._thresholds.update(PLUMBING_THRESHOLDS)

        # Apply custom thresholds
        if custom_thresholds:
            self._thresholds.update(custom_thresholds)

        # Compliance rules
        self._compliance_rules: List[ComplianceRule] = []
        self._initialize_compliance_rules()

    def check_all(self, load_result: LoadResult) -> List[LoadWarning]:
        """
        Check all thresholds and compliance rules against load result.

        Args:
            load_result: Complete load calculation result

        Returns:
            List of LoadWarning objects for all violations
        """
        warnings: List[LoadWarning] = []

        # Check floor-level thresholds
        warnings.extend(self._check_floor_thresholds(load_result))

        # Check space-level thresholds
        warnings.extend(self._check_space_thresholds(load_result))

        # Check building-level thresholds
        warnings.extend(self._check_building_thresholds(load_result))

        # Check compliance rules
        warnings.extend(self._check_compliance_rules(load_result))

        return warnings

    def check_threshold(
        self,
        threshold_key: str,
        value: float,
        component_name: str = ""
    ) -> Optional[LoadWarning]:
        """
        Check a single threshold against a value.

        Args:
            threshold_key: Key identifying the threshold
            value: Value to check
            component_name: Name of component being checked

        Returns:
            LoadWarning if threshold exceeded, None otherwise
        """
        threshold = self._thresholds.get(threshold_key)
        if not threshold:
            return None

        violation = threshold.check(value)
        if violation:
            return LoadWarning(
                severity=threshold.severity_if_exceeded,
                category=self._get_category_for_threshold(threshold_key),
                message=violation,
                affected_component=component_name or threshold_key,
                threshold_value=threshold.max_value,
                actual_value=value,
                recommended_action=threshold.mitigation_action,
                code_reference=threshold.code_reference
            )

        return None

    def get_threshold(self, threshold_key: str) -> Optional[LoadThreshold]:
        """Get a threshold by key."""
        return self._thresholds.get(threshold_key)

    def add_threshold(self, key: str, threshold: LoadThreshold) -> None:
        """Add or update a threshold."""
        self._thresholds[key] = threshold

    def add_compliance_rule(self, rule: ComplianceRule) -> None:
        """Add a compliance rule."""
        self._compliance_rules.append(rule)

    def get_utilization_report(self, load_result: LoadResult) -> Dict[str, Dict[str, Any]]:
        """
        Generate utilization report showing how close each metric is to threshold.

        Args:
            load_result: Complete load calculation result

        Returns:
            Dictionary with utilization percentages for each threshold
        """
        report = {}

        for floor in load_result.floor_breakdowns:
            if floor.gross_area_sqm <= 0:
                continue

            floor_key = f"floor_{floor.floor_level}"
            report[floor_key] = {}

            # Electrical density
            elec_density = (floor.electrical_kw * 1000) / floor.gross_area_sqm
            elec_threshold = self._thresholds.get("electrical_density_w_sqm")
            if elec_threshold:
                report[floor_key]["electrical_density"] = {
                    "value": round(elec_density, 1),
                    "unit": elec_threshold.unit,
                    "utilization_percent": round(elec_threshold.get_utilization(elec_density), 1),
                    "status": "ok" if elec_threshold.is_within_limits(elec_density) else "exceeded"
                }

            # Cooling density
            cool_density = (floor.cooling_kw * 1000) / floor.gross_area_sqm
            cool_threshold = self._thresholds.get("cooling_density_w_sqm")
            if cool_threshold:
                report[floor_key]["cooling_density"] = {
                    "value": round(cool_density, 1),
                    "unit": cool_threshold.unit,
                    "utilization_percent": round(cool_threshold.get_utilization(cool_density), 1),
                    "status": "ok" if cool_threshold.is_within_limits(cool_density) else "exceeded"
                }

            # Structural density
            struct_density = floor.structural_kn / floor.gross_area_sqm
            struct_threshold = self._thresholds.get("structural_floor_kn_sqm")
            if struct_threshold:
                report[floor_key]["structural_density"] = {
                    "value": round(struct_density, 2),
                    "unit": struct_threshold.unit,
                    "utilization_percent": round(struct_threshold.get_utilization(struct_density), 1),
                    "status": "ok" if struct_threshold.is_within_limits(struct_density) else "exceeded"
                }

        return report

    def _check_floor_thresholds(self, load_result: LoadResult) -> List[LoadWarning]:
        """Check thresholds at floor level."""
        warnings = []

        for floor in load_result.floor_breakdowns:
            if floor.gross_area_sqm <= 0:
                continue

            # Electrical density
            elec_density = (floor.electrical_kw * 1000) / floor.gross_area_sqm
            warning = self.check_threshold(
                "electrical_density_w_sqm",
                elec_density,
                f"Floor {floor.floor_name}"
            )
            if warning:
                warnings.append(warning)

            # Cooling density
            cool_density = (floor.cooling_kw * 1000) / floor.gross_area_sqm
            warning = self.check_threshold(
                "cooling_density_w_sqm",
                cool_density,
                f"Floor {floor.floor_name}"
            )
            if warning:
                warnings.append(warning)

            # Heating density
            heat_density = (floor.heating_kw * 1000) / floor.gross_area_sqm
            warning = self.check_threshold(
                "heating_density_w_sqm",
                heat_density,
                f"Floor {floor.floor_name}"
            )
            if warning:
                warnings.append(warning)

            # Structural load
            struct_density = floor.structural_kn / floor.gross_area_sqm
            warning = self.check_threshold(
                "structural_floor_kn_sqm",
                struct_density,
                f"Floor {floor.floor_name}"
            )
            if warning:
                warnings.append(warning)

        return warnings

    def _check_space_thresholds(self, load_result: LoadResult) -> List[LoadWarning]:
        """Check thresholds at space level."""
        warnings = []

        for space in load_result.space_breakdowns:
            if space.area_sqm <= 0:
                continue

            # Lighting density
            lighting_density = (space.lighting_kw * 1000) / space.area_sqm
            warning = self.check_threshold(
                "lighting_density_w_sqm",
                lighting_density,
                f"Space {space.space_name}"
            )
            if warning:
                warnings.append(warning)

            # Ventilation per person
            if space.occupancy > 0:
                vent_per_person = space.ventilation_l_s / space.occupancy
                warning = self.check_threshold(
                    "ventilation_l_s_person",
                    vent_per_person,
                    f"Space {space.space_name}"
                )
                if warning:
                    warnings.append(warning)

        return warnings

    def _check_building_thresholds(self, load_result: LoadResult) -> List[LoadWarning]:
        """Check thresholds at building level."""
        warnings = []

        # Check overall electrical demand
        total_area = sum(f.gross_area_sqm for f in load_result.floor_breakdowns)
        if total_area > 0:
            overall_elec_density = (load_result.electrical_demand_kw * 1000) / total_area
            if overall_elec_density > 120:  # High building-level density
                warnings.append(LoadWarning(
                    severity=WarningSeverity.INFO,
                    category=LoadCategory.ELECTRICAL,
                    message=f"Building electrical demand density ({overall_elec_density:.1f} W/m2) "
                           f"is above typical levels",
                    affected_component="Building",
                    threshold_value=120.0,
                    actual_value=overall_elec_density,
                    recommended_action="Consider demand management strategies"
                ))

        return warnings

    def _check_compliance_rules(self, load_result: LoadResult) -> List[LoadWarning]:
        """Check all compliance rules."""
        warnings = []

        for rule in self._compliance_rules:
            rule_warnings = rule.check(load_result)
            warnings.extend(rule_warnings)

        return warnings

    def _initialize_compliance_rules(self) -> None:
        """Initialize default compliance rules."""
        # Minimum ventilation rule
        self._compliance_rules.append(ComplianceRule(
            rule_id="ASHRAE-62.1-MIN-OA",
            description="Minimum outdoor air ventilation rate",
            code_reference="ASHRAE 62.1-2022 Table 6.2.2.1",
            applicable_load_types=["ventilation"],
            check_function=self._check_minimum_ventilation,
            severity=WarningSeverity.CRITICAL,
            category=LoadCategory.HVAC
        ))

        # Emergency egress lighting
        self._compliance_rules.append(ComplianceRule(
            rule_id="IBC-1008-EGRESS",
            description="Emergency egress lighting requirements",
            code_reference="IBC 1008",
            applicable_load_types=["lighting", "emergency"],
            check_function=self._check_egress_lighting,
            severity=WarningSeverity.WARNING,
            category=LoadCategory.ELECTRICAL
        ))

    def _check_minimum_ventilation(self, load_result: LoadResult) -> List[str]:
        """Check minimum ventilation compliance."""
        violations = []

        for space in load_result.space_breakdowns:
            if space.occupancy <= 0:
                continue

            vent_per_person = space.ventilation_l_s / space.occupancy
            if vent_per_person < 2.5:
                violations.append(
                    f"Space {space.space_name} ventilation ({vent_per_person:.1f} L/s/person) "
                    f"below minimum 2.5 L/s/person"
                )

        return violations

    def _check_egress_lighting(self, load_result: LoadResult) -> List[str]:
        """Check egress lighting requirements."""
        violations = []

        # Check that all floors have some lighting
        for floor in load_result.floor_breakdowns:
            floor_lighting = sum(
                s.lighting_kw for s in load_result.space_breakdowns
                if s.floor_level == floor.floor_level
            )
            if floor_lighting <= 0 and floor.gross_area_sqm > 50:
                violations.append(
                    f"Floor {floor.floor_name} has no lighting load calculated"
                )

        return violations

    def _get_category_for_threshold(self, threshold_key: str) -> LoadCategory:
        """Determine load category based on threshold key."""
        if threshold_key in STRUCTURAL_THRESHOLDS:
            return LoadCategory.STRUCTURAL
        elif threshold_key in ELECTRICAL_THRESHOLDS:
            return LoadCategory.ELECTRICAL
        elif threshold_key in HVAC_THRESHOLDS:
            return LoadCategory.HVAC
        elif threshold_key in PLUMBING_THRESHOLDS:
            return LoadCategory.PLUMBING
        else:
            return LoadCategory.STRUCTURAL


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_default_thresholds() -> Dict[str, LoadThreshold]:
    """
    Get all default thresholds as a dictionary.

    Returns:
        Dictionary mapping threshold keys to LoadThreshold objects
    """
    thresholds = {}
    thresholds.update(STRUCTURAL_THRESHOLDS)
    thresholds.update(ELECTRICAL_THRESHOLDS)
    thresholds.update(HVAC_THRESHOLDS)
    thresholds.update(PLUMBING_THRESHOLDS)
    return thresholds


def get_thresholds_by_category(category: str) -> Dict[str, LoadThreshold]:
    """
    Get thresholds for a specific category.

    Args:
        category: One of 'structural', 'electrical', 'hvac', 'plumbing'

    Returns:
        Dictionary of thresholds for that category
    """
    category_map = {
        "structural": STRUCTURAL_THRESHOLDS,
        "electrical": ELECTRICAL_THRESHOLDS,
        "hvac": HVAC_THRESHOLDS,
        "plumbing": PLUMBING_THRESHOLDS
    }
    return category_map.get(category.lower(), {})


def create_custom_threshold(
    load_type: str,
    max_value: float,
    unit: str,
    severity: WarningSeverity = WarningSeverity.WARNING,
    min_value: Optional[float] = None,
    code_reference: str = "",
    description: str = "",
    mitigation_action: str = ""
) -> LoadThreshold:
    """
    Factory function to create custom thresholds.

    Args:
        load_type: Name of the load type
        max_value: Maximum acceptable value
        unit: Unit of measurement
        severity: Warning severity if exceeded
        min_value: Optional minimum value
        code_reference: Code section reference
        description: Human-readable description
        mitigation_action: Recommended action

    Returns:
        LoadThreshold object
    """
    return LoadThreshold(
        load_type=load_type,
        min_value=min_value,
        max_value=max_value,
        unit=unit,
        severity_if_exceeded=severity,
        code_reference=code_reference,
        description=description,
        mitigation_action=mitigation_action
    )


# =============================================================================
# MODULE EXPORTS
# =============================================================================

__all__ = [
    # Dataclasses
    "LoadThreshold",
    "ComplianceRule",
    # Classes
    "ThresholdChecker",
    # Threshold dictionaries
    "STRUCTURAL_THRESHOLDS",
    "ELECTRICAL_THRESHOLDS",
    "HVAC_THRESHOLDS",
    "PLUMBING_THRESHOLDS",
    # Functions
    "get_default_thresholds",
    "get_thresholds_by_category",
    "create_custom_threshold",
]
