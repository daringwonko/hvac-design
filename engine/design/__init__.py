"""
Design module for Ceiling Panel Calculator.

Contains building design engines including:
- Structural engineering calculations
- MEP (Mechanical, Electrical, Plumbing) systems
- Multi-story building design
- Site planning and zoning
- Unified load calculation system
"""

from .structural_engine import (
    StructuralEngine,
    BeamDesign,
    ColumnDesign,
    FoundationDesign,
)

from .mep_systems import (
    MEPSystemEngine,
    HVACDesign,
    ElectricalDesign,
    PlumbingDesign,
)

from .multi_story_designer import (
    MultiStoryDesigner,
    Floor,
    Space,
    SpaceType,
    VerticalTransportType,
)

from .site_planner import (
    SitePlanner,
    SiteCharacteristics,
    ZoningType,
    ZoningRegulation,
    SiteAnalysisResult,
)

# Load Calculation Module (Sprint 002)
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
)

from .load_calculation import (
    LoadCalculationEngine,
    BuildingSpecification,
)

from .load_thresholds import (
    LoadThreshold,
    ComplianceRule,
    ThresholdChecker,
    get_default_thresholds,
    get_thresholds_by_category,
)

__all__ = [
    # Structural
    'StructuralEngine',
    'BeamDesign',
    'ColumnDesign',
    'FoundationDesign',
    # MEP
    'MEPSystemEngine',
    'HVACDesign',
    'ElectricalDesign',
    'PlumbingDesign',
    # Multi-story
    'MultiStoryDesigner',
    'Floor',
    'Space',
    'SpaceType',
    'VerticalTransportType',
    # Site planning
    'SitePlanner',
    'SiteCharacteristics',
    'ZoningType',
    'ZoningRegulation',
    'SiteAnalysisResult',
    # Load Calculation Types
    'LoadCategory',
    'WarningSeverity',
    'LoadType',
    'LoadWarning',
    'FloorLoadBreakdown',
    'SpaceLoadBreakdown',
    'CostBreakdown',
    'LoadOptimizationResult',
    'LoadRecommendation',
    'EnvironmentalContext',
    'LoadResult',
    'ComplianceStatus',
    'OptimizationStrategy',
    # Load Calculation Engine
    'LoadCalculationEngine',
    'BuildingSpecification',
    # Load Thresholds
    'LoadThreshold',
    'ComplianceRule',
    'ThresholdChecker',
    'get_default_thresholds',
    'get_thresholds_by_category',
]
