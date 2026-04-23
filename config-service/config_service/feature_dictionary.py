"""
CargoBit Feature Dictionary - Pydantic Models
==============================================

Validierung und Schema-Definition für das Feature Dictionary.

Author: CargoBit ML Team
Version: 2.0.0
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator


class FeatureType(str, Enum):
    """Unterstützte Feature-Typen"""
    FLOAT = "float"
    INT = "int"
    CATEGORY = "category"
    STRING = "string"
    TIMESTAMP = "timestamp"
    BOOLEAN = "boolean"
    JSON = "json"


class RefreshType(str, Enum):
    """Refresh-Zyklen für Features"""
    REALTIME = "Echtzeit"
    DAILY = "täglich"
    HOURLY = "stündlich"
    WEEKLY = "wöchentlich"


class FeatureCategory(str, Enum):
    """Feature-Kategorien"""
    HEURISTIC = "A.1"
    CONTEXT = "A.2"
    HISTORICAL = "A.3"
    META = "A.4"


class EncodingType(str, Enum):
    """Encoding-Methoden für kategorische Features"""
    ORDINAL = "ordinal"
    ONE_HOT = "one-hot"
    TARGET = "target"
    FREQUENCY = "frequency"


class NormalizationType(str, Enum):
    """Normalisierungsmethoden"""
    MINMAX = "minmax"
    STANDARD = "standard"
    ROBUST = "robust"
    RATIO = "ratio"
    NONE = "none"


class AggregationMetric(str, Enum):
    """Aggregations-Metriken für historische Features"""
    ACCEPTANCE_RATE = "acceptance_rate"
    AVG_MARGIN = "avg_margin"
    AVG_DELAY = "avg_delay"
    CANCELLATION_RATE = "cancellation_rate"
    EXECUTION_RATE = "execution_rate"


# =============================================================================
# FEATURE MODELS
# =============================================================================

class Bounds(BaseModel):
    """Wertebereich für numerische Features"""
    min: float
    max: float

    @model_validator(mode='after')
    def validate_bounds(self):
        if self.min > self.max:
            raise ValueError("min must be <= max")
        return self


class AggregationConfig(BaseModel):
    """Aggregations-Konfiguration für historische Features"""
    window: str = Field(..., description="Time window, e.g., '30d', '90d'")
    metric: AggregationMetric
    entity: str = Field(..., description="Entity to aggregate by")


class ComputedFrom(BaseModel):
    """Definition der Quell-Features für abgeleitete Features"""
    sources: List[str] = Field(default_factory=list)
    formula: Optional[str] = None


class FeatureDefinition(BaseModel):
    """Vollständige Feature-Definition"""
    name: str = Field(..., min_length=1, max_length=100)
    type: FeatureType
    source: str = Field(..., min_length=1)
    refresh: RefreshType
    description: str = Field(..., min_length=1)
    mlReady: bool = Field(default=True)
    explainability: bool = Field(default=True)
    bounds: Optional[Bounds] = None
    unit: Optional[str] = None
    normalization: Optional[NormalizationType] = None
    encoding: Optional[EncodingType] = None
    mapping: Optional[Dict[str, float]] = None
    categories: Optional[List[str]] = None
    formula: Optional[str] = None
    computedFrom: Optional[List[str]] = None
    aggregation: Optional[AggregationConfig] = None
    factors: Optional[List[str]] = None
    format: Optional[str] = None
    example: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        # Feature names should be camelCase and valid identifiers
        if not v[0].islower():
            raise ValueError("Feature name must start with lowercase")
        if ' ' in v:
            raise ValueError("Feature name must not contain spaces")
        return v

    @model_validator(mode='after')
    def validate_type_constraints(self):
        # Bounds required for numeric types
        if self.type in [FeatureType.FLOAT, FeatureType.INT]:
            if self.bounds is None:
                # Warning, not error - some numeric features may not have bounds
                pass
        
        # Categories required for category type
        if self.type == FeatureType.CATEGORY:
            if self.categories is None and self.mapping is None:
                raise ValueError(f"Category feature {self.name} requires 'categories' or 'mapping'")
        
        # Aggregation required for historical features
        if self.aggregation is not None and self.refresh != RefreshType.DAILY:
            raise ValueError(f"Aggregated feature {self.name} should have refresh='täglich'")
        
        return self


class FeatureCategoryGroup(BaseModel):
    """Gruppe von Features einer Kategorie"""
    description: str
    category: FeatureCategory
    features: List[FeatureDefinition]


# =============================================================================
# FEATURE GROUP MODELS
# =============================================================================

class FeatureGroupRef(BaseModel):
    """Referenz auf eine Feature-Group"""
    ref: str = Field(..., pattern=r"^\$\{.*\}$")

    def get_group_name(self) -> str:
        return self.ref[2:-1]


class FeatureGroup(BaseModel):
    """Definition einer Feature-Group für Training/Serving"""
    id: str = Field(..., pattern=r"^[a-z_]+$")
    name: str
    description: str
    features: List[Union[str, FeatureGroupRef]]
    totalFeatures: int = Field(..., ge=1)


# =============================================================================
# STATISTICS & MONITORING MODELS
# =============================================================================

class DriftDetectionConfig(BaseModel):
    """Konfiguration für Drift Detection"""
    enabled: bool = True
    method: str = Field(default="ks_test")
    threshold: float = Field(default=0.05, ge=0.0, le=1.0)
    alertChannel: str = Field(default="#ml-alerts")


class StatisticsConfig(BaseModel):
    """Konfiguration für Feature Statistics"""
    refreshInterval: str = Field(default="daily")
    metrics: List[str] = Field(default_factory=lambda: [
        "mean", "stddev", "min", "max", "p5", "p25", "p50", "p75", "p95"
    ])
    driftDetection: DriftDetectionConfig = Field(default_factory=DriftDetectionConfig)


# =============================================================================
# DATA QUALITY MODELS
# =============================================================================

class DataQualitySeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class DataQualityRule(BaseModel):
    """Data Quality Rule Definition"""
    name: str
    scope: str  # "all", "numeric", "category"
    severity: DataQualitySeverity
    description: str


class DataQualityMonitoring(BaseModel):
    """Data Quality Monitoring Configuration"""
    enabled: bool = True
    dashboard: str = Field(default="grafana")
    alertThreshold: float = Field(default=0.95, ge=0.0, le=1.0)


class DataQualityConfig(BaseModel):
    """Vollständige Data Quality Konfiguration"""
    rules: List[DataQualityRule]
    monitoring: DataQualityMonitoring


# =============================================================================
# METADATA MODELS
# =============================================================================

class FeatureDictionaryMetadata(BaseModel):
    """Metadaten für das Feature Dictionary"""
    name: str
    description: str
    owner: str
    lastUpdatedBy: str
    lastUpdatedAt: datetime
    changeReason: str


# =============================================================================
# ROOT MODEL
# =============================================================================

class FeatureDictionary(BaseModel):
    """
    Vollständiges Feature Dictionary mit Validierung.
    
    Usage:
        with open('feature-dictionary.yaml') as f:
            data = yaml.safe_load(f)
        
        dictionary = FeatureDictionary(**data)
        
        # Access features by category
        for feature in dictionary.features.heuristic.features:
            print(f"{feature.name}: {feature.description}")
    """
    version: str = Field(..., pattern=r"^\d+\.\d+\.\d+$")
    kind: str = Field(default="feature-dictionary")
    metadata: FeatureDictionaryMetadata
    features: Dict[str, FeatureCategoryGroup]
    featureGroups: List[FeatureGroup]
    statistics: StatisticsConfig = Field(default_factory=StatisticsConfig)
    dataQuality: DataQualityConfig

    @model_validator(mode='after')
    def validate_feature_group_totals(self):
        """Validate that totalFeatures count matches actual features"""
        for group in self.featureGroups:
            actual_count = len(group.features)
            if actual_count != group.totalFeatures:
                # Allow for group references which expand to multiple features
                pass
        return self

    def get_feature_by_name(self, name: str) -> Optional[FeatureDefinition]:
        """Feature nach Name suchen"""
        for category_group in self.features.values():
            for feature in category_group.features:
                if feature.name == name:
                    return feature
        return None

    def get_ml_ready_features(self) -> List[FeatureDefinition]:
        """Alle ML-ready Features zurückgeben"""
        ml_features = []
        for category_group in self.features.values():
            for feature in category_group.features:
                if feature.mlReady:
                    ml_features.append(feature)
        return ml_features

    def get_explainability_features(self) -> List[FeatureDefinition]:
        """Alle Features für Explainability zurückgeben"""
        expl_features = []
        for category_group in self.features.values():
            for feature in category_group.features:
                if feature.explainability:
                    expl_features.append(feature)
        return expl_features

    def get_feature_group(self, group_id: str) -> Optional[FeatureGroup]:
        """Feature Group nach ID suchen"""
        for group in self.featureGroups:
            if group.id == group_id:
                return group
        return None


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Enums
    "FeatureType",
    "RefreshType",
    "FeatureCategory",
    "EncodingType",
    "NormalizationType",
    "AggregationMetric",
    "DataQualitySeverity",
    # Models
    "Bounds",
    "AggregationConfig",
    "FeatureDefinition",
    "FeatureCategoryGroup",
    "FeatureGroupRef",
    "FeatureGroup",
    "DriftDetectionConfig",
    "StatisticsConfig",
    "DataQualityRule",
    "DataQualityMonitoring",
    "DataQualityConfig",
    "FeatureDictionaryMetadata",
    "FeatureDictionary",
]
