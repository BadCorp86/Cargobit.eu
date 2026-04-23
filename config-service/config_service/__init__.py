"""
CargoBit Config Service
=======================

Zentraler Service für Scoring-Konfiguration mit:
- Schema-Validierung via Pydantic
- Git-basiertes Versioning
- Hot-Reload via File-Watcher
- Audit-Logging
- REST-API via FastAPI
"""

from .models import (
    # Enums
    PriorityLevel,
    RiskLevel,
    ServiceLevelType,
    SLATier,
    CapacityMethod,
    NormalizationType,
    # Models
    ScoringWeights,
    Bounds,
    RevenueComponent,
    CapacityComponent,
    PriorityComponent,
    RiskComponent,
    ServiceLevelComponent,
    CO2Component,
    ScoringComponents,
    ScoringConstraints,
    MatchingConfig,
    FeatureFlags,
    MLHybridConfig,
    ScoringProfile,
    TenantOverride,
    AuditConfig,
    ScoringSpec,
    ConfigMetadata,
    ScoringConfig,
    # API Models
    ConfigUpdateRequest,
    ConfigValidationResponse,
    ConfigVersion,
    ConfigDiff,
)

from .core import (
    ConfigService,
    ConfigServiceError,
    ConfigValidationError,
    ConfigVersionError,
)

from .api import app

__version__ = "1.0.0"

__all__ = [
    # Enums
    "PriorityLevel",
    "RiskLevel",
    "ServiceLevelType",
    "SLATier",
    "CapacityMethod",
    "NormalizationType",
    # Models
    "ScoringWeights",
    "Bounds",
    "RevenueComponent",
    "CapacityComponent",
    "PriorityComponent",
    "RiskComponent",
    "ServiceLevelComponent",
    "CO2Component",
    "ScoringComponents",
    "ScoringConstraints",
    "MatchingConfig",
    "FeatureFlags",
    "MLHybridConfig",
    "ScoringProfile",
    "TenantOverride",
    "AuditConfig",
    "ScoringSpec",
    "ConfigMetadata",
    "ScoringConfig",
    # API Models
    "ConfigUpdateRequest",
    "ConfigValidationResponse",
    "ConfigVersion",
    "ConfigDiff",
    # Core
    "ConfigService",
    "ConfigServiceError",
    "ConfigValidationError",
    "ConfigVersionError",
    # FastAPI App
    "app",
]
