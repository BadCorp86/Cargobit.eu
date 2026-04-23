"""
CargoBit Scoring Config Service - Pydantic Models
===================================================

Schema-Validierung für scoring-config.yaml mit Pydantic v2.
Alle Modelle sind audit-fähig und versionierbar.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# =============================================================================
# ENUMS
# =============================================================================

class PriorityLevel(str, Enum):
    PREMIUM = "PREMIUM"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"


class RiskLevel(str, Enum):
    VERY_LOW = "VERY_LOW"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"


class ServiceLevelType(str, Enum):
    SLA_CRITICAL = "SLA_CRITICAL"
    SLA_HIGH = "SLA_HIGH"
    STANDARD = "STANDARD"


class SLATier(str, Enum):
    PLATINUM = "PLATINUM"
    GOLD = "GOLD"
    SILVER = "SILVER"
    BRONZE = "BRONZE"


class CapacityMethod(str, Enum):
    VOLUME = "volume"
    PALLETS = "pallets"
    HYBRID = "hybrid"


class NormalizationType(str, Enum):
    NONE = "none"
    MINMAX = "minmax"
    ZSCORE = "zscore"


# =============================================================================
# WEIGHT VALIDATION MODEL
# =============================================================================

class ScoringWeights(BaseModel):
    """Scoring-Gewichte mit Constraint-Validierung (Summe = 1.0)."""
    revenue: float = Field(ge=0.0, le=1.0, description="Wirtschaftlichkeit")
    capacityUtilization: float = Field(ge=0.0, le=1.0, description="Kapazitätsauslastung")
    priority: float = Field(ge=0.0, le=1.0, description="Business-Priorität")
    risk: float = Field(ge=0.0, le=1.0, description="Risiko")
    serviceLevel: float = Field(ge=0.0, le=1.0, description="Service-Level")
    co2: float = Field(ge=0.0, le=1.0, description="CO₂-Effizienz")

    @model_validator(mode='after')
    def validate_sum_equals_one(self) -> 'ScoringWeights':
        """Validiert, dass die Summe aller Gewichte genau 1.0 ergibt."""
        total = (
            self.revenue +
            self.capacityUtilization +
            self.priority +
            self.risk +
            self.serviceLevel +
            self.co2
        )
        # Toleranz von 0.001 für Floating-Point-Ungenauigkeiten
        if abs(total - 1.0) > 0.001:
            raise ValueError(
                f"Sum of weights must equal 1.0, got {total:.4f}. "
                f"Adjust weights to satisfy constraint."
            )
        return self

    class Config:
        json_schema_extra = {
            "example": {
                "revenue": 0.35,
                "capacityUtilization": 0.20,
                "priority": 0.10,
                "risk": 0.10,
                "serviceLevel": 0.15,
                "co2": 0.10
            }
        }


# =============================================================================
# COMPONENT CONFIGURATION MODELS
# =============================================================================

class Bounds(BaseModel):
    """Min/Max-Bounds für Normalisierung."""
    min: float = 0.0
    max: float = 1.0


class RevenueComponent(BaseModel):
    """Revenue-Score Komponente."""
    minDetourKm: int = Field(default=0, ge=0)
    maxDetourKm: int = Field(default=20, ge=0)
    formula: str = "price / (detourKm + 1)"
    normalization: NormalizationType = NormalizationType.MINMAX
    bounds: Bounds = Bounds(min=0.0, max=100.0)
    description: str = "Revenue normalisiert auf Detour-Aufwand"


class CapacityComponent(BaseModel):
    """Capacity-Utilization Komponente."""
    method: CapacityMethod = CapacityMethod.VOLUME
    minVolume: float = Field(default=0.0, ge=0.0)
    maxVolume: float = Field(default=100.0, ge=0.0)
    formula: str = "orderVolumeM3 / capacityFreeM3"
    bounds: Bounds = Bounds(min=0.0, max=1.0)
    description: str = "Auslastung der verfügbaren Kapazität"


class PriorityComponent(BaseModel):
    """Priority-Score Komponente."""
    mapping: Dict[PriorityLevel, float] = {
        PriorityLevel.PREMIUM: 1.0,
        PriorityLevel.HIGH: 0.8,
        PriorityLevel.NORMAL: 0.5,
        PriorityLevel.LOW: 0.2
    }
    default: PriorityLevel = PriorityLevel.NORMAL
    source: str = "customer_master_data"
    description: str = "Kundenpriorität aus CRM/Master-Data"


class RiskComponent(BaseModel):
    """Risk-Score Komponente."""
    mapping: Dict[RiskLevel, float] = {
        RiskLevel.VERY_LOW: 1.0,
        RiskLevel.LOW: 0.8,
        RiskLevel.MEDIUM: 0.5,
        RiskLevel.HIGH: 0.2,
        RiskLevel.VERY_HIGH: 0.0
    }
    default: RiskLevel = RiskLevel.MEDIUM
    factors: List[str] = ["payment_history", "cancellation_rate", "credit_rating"]
    factorWeights: Dict[str, float] = {
        "payment_history": 0.4,
        "cancellation_rate": 0.3,
        "credit_rating": 0.3
    }
    description: str = "Risikobewertung basierend auf Kundenhistorie"

    @model_validator(mode='after')
    def validate_factor_weights(self) -> 'RiskComponent':
        """Validiert, dass factorWeights Summe = 1.0."""
        if self.factorWeights:
            total = sum(self.factorWeights.values())
            if abs(total - 1.0) > 0.001:
                raise ValueError(f"factorWeights must sum to 1.0, got {total:.4f}")
        return self


class ServiceLevelComponent(BaseModel):
    """Service-Level Komponente."""
    mapping: Dict[ServiceLevelType, float] = {
        ServiceLevelType.SLA_CRITICAL: 1.0,
        ServiceLevelType.SLA_HIGH: 0.7,
        ServiceLevelType.STANDARD: 0.3
    }
    default: ServiceLevelType = ServiceLevelType.STANDARD
    slaTiers: Dict[SLATier, float] = {
        SLATier.PLATINUM: 1.0,
        SLATier.GOLD: 0.85,
        SLATier.SILVER: 0.6,
        SLATier.BRONZE: 0.4
    }
    description: str = "SLA-Kritikalität und Kundensegment"


class CO2Component(BaseModel):
    """CO₂-Score Komponente."""
    formula: str = "1 - (detourKm / maxDetourKm)"
    maxDetourKm: int = Field(default=20, ge=0)
    bonusForBackload: float = Field(default=0.2, ge=0.0, le=1.0)
    penaltyForEmptyReturn: float = Field(default=0.1, ge=0.0, le=1.0)
    description: str = "CO₂-Effizienz durch Leerkilometer-Reduktion"


class ScoringComponents(BaseModel):
    """Alle Scoring-Komponenten."""
    revenue: RevenueComponent = RevenueComponent()
    capacityUtilization: CapacityComponent = CapacityComponent()
    priority: PriorityComponent = PriorityComponent()
    risk: RiskComponent = RiskComponent()
    serviceLevel: ServiceLevelComponent = ServiceLevelComponent()
    co2: CO2Component = CO2Component()


# =============================================================================
# CONSTRAINTS
# =============================================================================

class ScoringConstraints(BaseModel):
    """Validierungs-Constraints für Config-Service."""
    sumEquals: float = 1.0
    minValue: float = 0.0
    maxValue: float = 1.0
    precision: int = Field(default=2, ge=0, le=6)


# =============================================================================
# MATCHING CONFIG
# =============================================================================

class MatchingConfig(BaseModel):
    """Globale Matching-Regeln."""
    maxPickupDetourKm: int = Field(default=15, ge=0)
    maxDeliveryDetourKm: int = Field(default=20, ge=0)
    minScoreThreshold: float = Field(default=0.5, ge=0.0, le=1.0)
    maxSuggestionsPerTour: int = Field(default=5, ge=1, le=20)
    timeWindowToleranceMinutes: int = Field(default=30, ge=0)
    minVolumeFreeM3: float = Field(default=0.5, ge=0.0)
    minWeightFreeKg: float = Field(default=100, ge=0.0)


# =============================================================================
# FEATURE FLAGS
# =============================================================================

class FeatureFlags(BaseModel):
    """Feature Flags für schrittweise Rollout-Strategie."""
    enableVisionModel: bool = False
    enableLearningToRank: bool = False
    enableDriverPreferenceScore: bool = False
    enableRiskModelV2: bool = False
    enableCO2Optimization: bool = False
    enableHybridScoring: bool = True


class MLHybridConfig(BaseModel):
    """ML-Hybrid Scoring Konfiguration."""
    enabled: bool = True
    alpha: float = Field(default=0.8, ge=0.0, le=1.0)
    fallbackToHeuristic: bool = True
    canaryPercentage: int = Field(default=0, ge=0, le=100)


# =============================================================================
# PROFILES
# =============================================================================

class ScoringProfile(BaseModel):
    """Alternative Scoring-Profile."""
    id: str
    name: str
    isDefault: bool = False
    weights: ScoringWeights

    @field_validator('id')
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        """Validiert ID-Format (lowercase, underscores)."""
        if not v.replace('_', '').isalnum():
            raise ValueError("ID must contain only alphanumeric characters and underscores")
        return v.lower()


# =============================================================================
# TENANT OVERRIDES
# =============================================================================

class TenantOverride(BaseModel):
    """Mandanten-spezifische Profilauswahl."""
    tenantId: str
    region: str
    profileId: str
    reason: str
    effectiveFrom: Optional[str] = None


# =============================================================================
# AUDIT CONFIG
# =============================================================================

class AuditConfig(BaseModel):
    """Audit & Compliance Einstellungen."""
    logAllScoringDecisions: bool = True
    retentionDays: int = Field(default=90, ge=30, le=365)
    includeExplainability: bool = True


# =============================================================================
# MAIN CONFIG MODEL
# =============================================================================

class ScoringSpec(BaseModel):
    """Haupt-Spec der Scoring-Konfiguration."""
    scoring: Dict[str, Any]  # weights, constraints, components
    matching: MatchingConfig
    features: FeatureFlags
    mlHybrid: MLHybridConfig
    profiles: List[ScoringProfile]
    tenantOverrides: List[TenantOverride]
    audit: AuditConfig


class ConfigMetadata(BaseModel):
    """Metadata der Konfiguration."""
    name: str
    description: str
    owner: str
    lastUpdatedBy: str
    lastUpdatedAt: str
    changeReason: Optional[str] = None
    tags: List[str] = []


class ScoringConfig(BaseModel):
    """Vollständige Scoring-Konfiguration mit Validierung."""
    version: str
    kind: str = "scoring-config"
    metadata: ConfigMetadata
    spec: ScoringSpec

    @field_validator('version')
    @classmethod
    def validate_version_format(cls, v: str) -> str:
        """Validiert Semantic Versioning Format."""
        parts = v.split('.')
        if len(parts) != 3:
            raise ValueError(f"Version must be in format X.Y.Z, got {v}")
        for part in parts:
            if not part.isdigit():
                raise ValueError(f"Version parts must be numeric, got {v}")
        return v

    def get_active_weights(self, tenant_id: Optional[str] = None) -> ScoringWeights:
        """
        Ermittelt die aktiven Gewichte basierend auf Tenant-Override oder Default-Profil.
        
        Args:
            tenant_id: Optional Tenant-ID für Override-Lookup
            
        Returns:
            Aktive ScoringWeights
        """
        # 1. Prüfe Tenant-Override
        if tenant_id:
            for override in self.spec.tenantOverrides:
                if override.tenantId == tenant_id:
                    # Finde Profil
                    for profile in self.spec.profiles:
                        if profile.id == override.profileId:
                            return profile.weights
        
        # 2. Fallback auf Default-Profil
        for profile in self.spec.profiles:
            if profile.isDefault:
                return profile.weights
        
        # 3. Fallback auf Spec-Weights (sollte nicht passieren bei korrekter Config)
        weights_dict = self.spec.scoring.get('weights', {})
        return ScoringWeights(**weights_dict)


# =============================================================================
# API REQUEST/RESPONSE MODELS
# =============================================================================

class ConfigUpdateRequest(BaseModel):
    """Request für Config-Update."""
    weights: Optional[ScoringWeights] = None
    features: Optional[FeatureFlags] = None
    mlHybrid: Optional[MLHybridConfig] = None
    changeReason: str = Field(..., min_length=10, description="Begründung für Änderung")
    updatedBy: str


class ConfigValidationResponse(BaseModel):
    """Response für Config-Validierung."""
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    weightsSum: float


class ConfigVersion(BaseModel):
    """Config-Version für History."""
    version: str
    createdAt: datetime
    createdBy: str
    changeReason: str
    checksum: str


class ConfigDiff(BaseModel):
    """Diff zwischen zwei Config-Versionen."""
    field: str
    oldValue: Any
    newValue: Any
    impact: str  # "high" | "medium" | "low"


# =============================================================================
# EXPORT
# =============================================================================

__all__ = [
    # Enums
    'PriorityLevel', 'RiskLevel', 'ServiceLevelType', 'SLATier',
    'CapacityMethod', 'NormalizationType',
    # Models
    'ScoringWeights', 'Bounds', 'RevenueComponent', 'CapacityComponent',
    'PriorityComponent', 'RiskComponent', 'ServiceLevelComponent', 'CO2Component',
    'ScoringComponents', 'ScoringConstraints', 'MatchingConfig', 'FeatureFlags',
    'MLHybridConfig', 'ScoringProfile', 'TenantOverride', 'AuditConfig',
    'ScoringSpec', 'ConfigMetadata', 'ScoringConfig',
    # API Models
    'ConfigUpdateRequest', 'ConfigValidationResponse', 'ConfigVersion', 'ConfigDiff'
]
