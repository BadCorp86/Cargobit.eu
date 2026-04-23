"""
CargoBit Config Service - FastAPI REST API
==========================================

REST-API für Config-Management mit:
- CRUD-Operationen für Config
- Validierung
- Versioning
- Health-Checks
"""

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .core import ConfigService, ConfigServiceError, ConfigValidationError
from .models import (
    ScoringConfig,
    ScoringWeights,
    FeatureFlags,
    MLHybridConfig,
    ConfigValidationResponse,
    ConfigVersion,
    ConfigDiff,
    ConfigUpdateRequest,
)


# =============================================================================
# GLOBAL SERVICE INSTANCE
# =============================================================================

config_service: Optional[ConfigService] = None


def get_config_service() -> ConfigService:
    """Dependency Injection für Config-Service."""
    if config_service is None:
        raise HTTPException(status_code=503, detail="Config service not initialized")
    return config_service


# =============================================================================
# LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    global config_service
    
    # Startup
    config_service = ConfigService(
        config_path=os.environ.get("CONFIG_PATH", "./config/scoring-config.yaml"),
        versioning_enabled=True,
        audit_enabled=True
    )
    
    # Start file watcher in background
    watcher_task = asyncio.create_task(watch_config_file())
    
    yield
    
    # Shutdown
    watcher_task.cancel()
    try:
        await watcher_task
    except asyncio.CancelledError:
        pass


async def watch_config_file():
    """Background task for file watching."""
    import os
    while True:
        try:
            config_service.reload()
        except Exception as e:
            print(f"Config reload error: {e}")
        await asyncio.sleep(5)  # Check every 5 seconds


# =============================================================================
# FASTAPI APP
# =============================================================================

import os

app = FastAPI(
    title="CargoBit Config Service",
    description="Zentraler Service für Scoring-Konfiguration mit Schema-Validierung und Versioning",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class WeightsUpdateRequest(BaseModel):
    """Request für Gewichtungs-Update."""
    weights: ScoringWeights
    updatedBy: str = Field(..., min_length=2, max_length=100)
    changeReason: str = Field(..., min_length=10, max_length=500)


class FeaturesUpdateRequest(BaseModel):
    """Request für Feature-Flags Update."""
    features: FeatureFlags
    updatedBy: str = Field(..., min_length=2, max_length=100)
    changeReason: str = Field(..., min_length=10, max_length=500)


class MLHybridUpdateRequest(BaseModel):
    """Request für ML-Hybrid Config Update."""
    mlHybrid: MLHybridConfig
    updatedBy: str = Field(..., min_length=2, max_length=100)
    changeReason: str = Field(..., min_length=10, max_length=500)


class ScoreCalculationRequest(BaseModel):
    """Request für Score-Berechnung."""
    scores: Dict[str, float]
    tenantId: Optional[str] = None
    profileId: Optional[str] = None


class ScoreCalculationResponse(BaseModel):
    """Response für Score-Berechnung."""
    totalScore: float
    weights: Dict[str, float]
    breakdown: Dict[str, float]


class RollbackRequest(BaseModel):
    """Request für Rollback."""
    version: str
    reason: str = Field(..., min_length=10, max_length=500)


# =============================================================================
# HEALTH ENDPOINTS
# =============================================================================

@app.get("/health", tags=["Health"])
async def health_check(
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """
    Health-Check für Kubernetes/Docker.
    
    Returns HTTP 200 wenn Service healthy, HTTP 503 wenn degraded.
    """
    health = service.health_check()
    if health["status"] == "unhealthy":
        raise HTTPException(status_code=503, detail=health)
    return health


@app.get("/ready", tags=["Health"])
async def readiness_check(
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, str]:
    """Readiness-Check für Kubernetes."""
    return {"status": "ready"}


@app.get("/status", tags=["Health"])
async def get_status(
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """Detaillierter Status des Config-Service."""
    return service.get_status()


# =============================================================================
# CONFIG ENDPOINTS
# =============================================================================

@app.get("/api/v1/config", response_model=Dict[str, Any], tags=["Config"])
async def get_config(
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """
    Gibt die aktuelle Konfiguration zurück.
    
    Enthält:
    - Version
    - Metadata
    - Spec (weights, components, features, etc.)
    """
    return service.get_raw_config()


@app.get("/api/v1/config/weights", tags=["Config"])
async def get_weights(
    tenant_id: Optional[str] = None,
    profile_id: Optional[str] = None,
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """
    Gibt die aktiven Scoring-Gewichte zurück.
    
    Query Parameters:
    - tenant_id: Für Tenant-Override
    - profile_id: Für explizite Profilauswahl
    """
    weights = service.get_active_weights(tenant_id, profile_id)
    return {
        "weights": weights.model_dump(),
        "tenantId": tenant_id,
        "profileId": profile_id
    }


@app.put("/api/v1/config/weights", tags=["Config"])
async def update_weights(
    request: WeightsUpdateRequest,
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """
    Aktualisiert die Scoring-Gewichte.
    
    Benötigt:
    - weights: Neue Gewichte (Summe muss 1.0 sein)
    - updatedBy: User der die Änderung durchführt
    - changeReason: Begründung für die Änderung
    """
    try:
        updated_config = service.update_weights(
            weights=request.weights,
            updated_by=request.updatedBy,
            change_reason=request.changeReason
        )
        return {
            "success": True,
            "version": updated_config.version,
            "message": "Weights updated successfully"
        }
    except ConfigValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConfigServiceError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/config/features", tags=["Config"])
async def get_features(
    service: ConfigService = Depends(get_config_service)
) -> FeatureFlags:
    """Gibt die aktuellen Feature-Flags zurück."""
    return service.get_feature_flags()


@app.put("/api/v1/config/features", tags=["Config"])
async def update_features(
    request: FeaturesUpdateRequest,
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """Aktualisiert die Feature-Flags."""
    try:
        updated_config = service.update_feature_flags(
            features=request.features,
            updated_by=request.updatedBy,
            change_reason=request.changeReason
        )
        return {
            "success": True,
            "version": updated_config.version,
            "message": "Feature flags updated successfully"
        }
    except ConfigServiceError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/config/ml-hybrid", tags=["Config"])
async def get_ml_hybrid_config(
    service: ConfigService = Depends(get_config_service)
) -> MLHybridConfig:
    """Gibt die ML-Hybrid-Konfiguration zurück."""
    return service.get_ml_hybrid_config()


@app.put("/api/v1/config/ml-hybrid", tags=["Config"])
async def update_ml_hybrid_config(
    request: MLHybridUpdateRequest,
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """Aktualisiert die ML-Hybrid-Konfiguration."""
    config_dict = service.get_raw_config()
    
    config_dict['spec']['mlHybrid'] = request.mlHybrid.model_dump()
    config_dict['metadata']['lastUpdatedBy'] = request.updatedBy
    config_dict['metadata']['lastUpdatedAt'] = datetime.utcnow().isoformat()
    config_dict['metadata']['changeReason'] = request.changeReason
    
    # Save
    import yaml
    with open(service.config_path, 'w', encoding='utf-8') as f:
        yaml.dump(config_dict, f, sort_keys=False, allow_unicode=True)
    
    service.reload()
    
    return {
        "success": True,
        "version": config_dict['version'],
        "message": "ML-Hybrid config updated successfully"
    }


@app.get("/api/v1/config/matching", tags=["Config"])
async def get_matching_config(
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """Gibt die Matching-Konfiguration zurück."""
    return service.get_matching_config().model_dump()


# =============================================================================
# VALIDATION ENDPOINTS
# =============================================================================

@app.post("/api/v1/config/validate", response_model=ConfigValidationResponse, tags=["Validation"])
async def validate_config(
    config_dict: Optional[Dict[str, Any]] = None,
    service: ConfigService = Depends(get_config_service)
) -> ConfigValidationResponse:
    """
    Validiert eine Konfiguration.
    
    Wenn kein Body übergeben wird, wird die aktuelle Config validiert.
    """
    return service.validate_config(config_dict)


# =============================================================================
# SCORING ENDPOINTS
# =============================================================================

@app.post("/api/v1/scoring/calculate", response_model=ScoreCalculationResponse, tags=["Scoring"])
async def calculate_score(
    request: ScoreCalculationRequest,
    service: ConfigService = Depends(get_config_service)
) -> ScoreCalculationResponse:
    """
    Berechnet einen gewichteten Gesamt-Score.
    
    Input: Teil-Scores für revenue, capacityUtilization, priority, risk, serviceLevel, co2
    Output: Gesamt-Score mit Breakdown
    """
    weights = service.get_active_weights(request.tenantId, request.profileId)
    
    total_score = service.calculate_score(
        scores=request.scores,
        tenant_id=request.tenantId,
        profile_id=request.profileId
    )
    
    # Breakdown berechnen
    breakdown = {
        key: round(weights.model_dump()[key] * request.scores.get(key, 0.0), 4)
        for key in ['revenue', 'capacityUtilization', 'priority', 'risk', 'serviceLevel', 'co2']
    }
    
    return ScoreCalculationResponse(
        totalScore=total_score,
        weights=weights.model_dump(),
        breakdown=breakdown
    )


# =============================================================================
# VERSIONING ENDPOINTS
# =============================================================================

@app.get("/api/v1/config/versions", tags=["Versioning"])
async def get_versions(
    limit: int = 20,
    service: ConfigService = Depends(get_config_service)
) -> List[Dict[str, Any]]:
    """
    Gibt die Versionshistorie zurück.
    """
    versions = service.get_version_history(limit)
    return [v.model_dump() for v in versions]


@app.post("/api/v1/config/rollback", tags=["Versioning"])
async def rollback_config(
    request: RollbackRequest,
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """
    Führt ein Rollback auf eine frühere Version durch.
    """
    try:
        success = service.rollback(request.version)
        return {
            "success": success,
            "rolledBackTo": request.version,
            "reason": request.reason
        }
    except ConfigServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/v1/config/diff/{version1}/{version2}", tags=["Versioning"])
async def get_config_diff(
    version1: str,
    version2: str,
    service: ConfigService = Depends(get_config_service)
) -> List[Dict[str, Any]]:
    """
    Vergleicht zwei Config-Versionen.
    """
    try:
        diffs = service.get_diff(version1, version2)
        return [d.model_dump() for d in diffs]
    except ConfigServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# PROFILES ENDPOINTS
# =============================================================================

@app.get("/api/v1/config/profiles", tags=["Profiles"])
async def get_profiles(
    service: ConfigService = Depends(get_config_service)
) -> List[Dict[str, Any]]:
    """Gibt alle verfügbaren Scoring-Profile zurück."""
    config = service.get_config()
    return [
        {
            "id": p.id,
            "name": p.name,
            "isDefault": p.isDefault,
            "weights": p.weights.model_dump()
        }
        for p in config.spec.profiles
    ]


@app.get("/api/v1/config/profiles/{profile_id}", tags=["Profiles"])
async def get_profile(
    profile_id: str,
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """Gibt ein spezifisches Profil zurück."""
    config = service.get_config()
    
    for profile in config.spec.profiles:
        if profile.id == profile_id:
            return {
                "id": profile.id,
                "name": profile.name,
                "isDefault": profile.isDefault,
                "weights": profile.weights.model_dump()
            }
    
    raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")


# =============================================================================
# TENANT ENDPOINTS
# =============================================================================

@app.get("/api/v1/config/tenants", tags=["Tenants"])
async def get_tenant_overrides(
    service: ConfigService = Depends(get_config_service)
) -> List[Dict[str, Any]]:
    """Gibt alle Tenant-Overrides zurück."""
    config = service.get_config()
    return [o.model_dump() for o in config.spec.tenantOverrides]


@app.get("/api/v1/config/tenants/{tenant_id}", tags=["Tenants"])
async def get_tenant_config(
    tenant_id: str,
    service: ConfigService = Depends(get_config_service)
) -> Dict[str, Any]:
    """Gibt die Konfiguration für einen spezifischen Tenant zurück."""
    config = service.get_config()
    weights = service.get_active_weights(tenant_id)
    
    # Finde Override-Info
    override_info = None
    for o in config.spec.tenantOverrides:
        if o.tenantId == tenant_id:
            override_info = o.model_dump()
            break
    
    return {
        "tenantId": tenant_id,
        "weights": weights.model_dump(),
        "override": override_info
    }


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
