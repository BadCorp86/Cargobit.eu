"""
CargoBit ML Inference Service
=============================

Dedicated FastAPI service for ML model scoring with:
- Model versioning (stable, canary)
- Canary routing with configurable traffic split
- Inference logging for monitoring & A/B testing

Python spec implementation:
- POST /score endpoint with optional modelVersion
- 90% stable, 10% canary routing (configurable)
- Logging: modelVersion, score, jobId, transporterId, label
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import joblib
import json
import random
from pathlib import Path
from datetime import datetime
import logging
import numpy as np
import asyncio
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# CONFIGURATION
# ============================================

MODEL_DIR = Path("models")
REGISTRY_PATH = Path("model_registry.json")

# Default feature order (11 features from CargoBit matching-ml)
DEFAULT_FEATURE_ORDER = [
    "job_weight_kg",
    "capacity_ratio",
    "dist_km",
    "route_match",
    "exp_match",
    "lang_match",
    "rating",
    "past_jobs",
    "cancel_rate",
    "same_region",
    "hour_of_day"
]

# ============================================
# REQUEST / RESPONSE MODELS
# ============================================

class ScoreRequest(BaseModel):
    """Request model for scoring"""
    modelVersion: Optional[str] = Field(
        default=None,
        description="Specific model version or None for canary routing"
    )
    features: Dict[str, float] = Field(
        ...,
        description="Feature vector for prediction"
    )
    # Context for logging
    jobId: Optional[str] = Field(default=None, description="Job ID for logging")
    transporterId: Optional[str] = Field(default=None, description="Transporter ID for logging")


class ScoreResponse(BaseModel):
    """Response model with ML score"""
    scoreMl: float = Field(..., description="ML prediction score (0-1)")
    modelVersion: str = Field(..., description="Actual model version used")
    routing: str = Field(..., description="Routing decision: 'stable', 'canary', or 'explicit'")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    stableVersion: str
    canaryVersion: Optional[str]
    canaryTraffic: float
    loadedModels: List[str]


class RegistryResponse(BaseModel):
    """Full registry info"""
    stable: str
    canary: Optional[str]
    canaryTraffic: float
    models: List[str]


class UpdateRegistryRequest(BaseModel):
    """Update registry configuration"""
    stable: Optional[str] = None
    canary: Optional[str] = None
    canaryTraffic: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class InferenceLog(BaseModel):
    """Inference log entry"""
    ts: str
    modelVersion: str
    score: float
    jobId: Optional[str]
    transporterId: Optional[str]
    label: Optional[str] = None  # For future use


# ============================================
# MODEL CACHE & REGISTRY
# ============================================

_models_cache: Dict[str, Any] = {}
_registry: Dict[str, Any] = {}
_inference_logs: List[InferenceLog] = []  # In-memory log buffer


def load_registry() -> None:
    """Load model registry from JSON file"""
    global _registry
    try:
        with REGISTRY_PATH.open() as f:
            _registry = json.load(f)
        logger.info(
            f"Loaded registry: stable={_registry.get('stable')}, "
            f"canary={_registry.get('canary')}, "
            f"canaryTraffic={_registry.get('canaryTraffic', 0)}"
        )
    except FileNotFoundError:
        # Create default registry
        _registry = {
            "stable": "v2026-04-19",
            "canary": "v2026-04-19",
            "canaryTraffic": 0.0,
            "models": ["v2026-04-19"]
        }
        REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
        REGISTRY_PATH.write_text(json.dumps(_registry, indent=2))
        logger.info("Created default registry")
    except json.JSONDecodeError as e:
        logger.error(f"Invalid registry JSON: {e}")
        raise


def save_registry() -> None:
    """Save registry to JSON file"""
    REGISTRY_PATH.write_text(json.dumps(_registry, indent=2))
    logger.info(f"Saved registry: {_registry}")


def choose_version() -> str:
    """
    Canary routing: randomly select stable or canary based on traffic split.
    
    Returns:
        Model version string
    """
    canary_traffic = _registry.get("canaryTraffic", 0.0)
    
    # Random routing
    if random.random() < canary_traffic:
        canary = _registry.get("canary")
        if canary and canary in _registry.get("models", []):
            return canary
    
    return _registry["stable"]


def resolve_model_version(requested: Optional[str]) -> tuple[str, str]:
    """
    Resolve model version with routing decision.
    
    Args:
        requested: Specific version or None for routing
        
    Returns:
        Tuple of (version, routing_decision)
        routing_decision is 'stable', 'canary', or 'explicit'
    """
    if requested is None:
        # Use canary routing
        version = choose_version()
        routing = "canary" if version == _registry.get("canary") else "stable"
        return version, routing
    
    # Explicit version requested
    if requested in _registry.get("models", []):
        return requested, "explicit"
    
    raise ValueError(f"Unknown model version: {requested}")


def load_model(version: str) -> Any:
    """Load model from disk, cache for reuse"""
    if version in _models_cache:
        return _models_cache[version]
    
    path = MODEL_DIR / f"{version}.pkl"
    if not path.exists():
        raise FileNotFoundError(f"Model file not found: {path}")
    
    model = joblib.load(path)
    _models_cache[version] = model
    logger.info(f"Loaded model {version} into cache")
    return model


def log_inference(version: str, score: float, features: Dict[str, float]) -> None:
    """
    Log inference for monitoring and A/B testing.
    
    Args:
        version: Model version used
        score: Prediction score
        features: Input features (contains jobId, transporterId)
    """
    log_entry = InferenceLog(
        ts=datetime.utcnow().isoformat() + "Z",
        modelVersion=version,
        score=score,
        jobId=features.get("job_id"),
        transporterId=features.get("transporter_id"),
        label=None  # Will be filled later from feature store
    )
    
    _inference_logs.append(log_entry)
    
    # Also log to stdout (can be picked up by log aggregator)
    logger.info(json.dumps({
        "event": "inference",
        "ts": log_entry.ts,
        "modelVersion": log_entry.modelVersion,
        "score": log_entry.score,
        "jobId": log_entry.jobId,
        "transporterId": log_entry.transporterId
    }))


# ============================================
# LIFESPAN CONTEXT MANAGER
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    load_registry()
    
    # Preload both stable and canary models
    for version_type in ["stable", "canary"]:
        version = _registry.get(version_type)
        if version:
            try:
                load_model(version)
                logger.info(f"Preloaded {version_type} model: {version}")
            except FileNotFoundError:
                logger.warning(f"Could not preload {version_type} model: {version}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ML Inference Service")


app = FastAPI(
    title="CargoBit ML Inference Service",
    description="ML model scoring with canary routing for transport matching",
    version="2.0.0",
    lifespan=lifespan
)

# ============================================
# API ENDPOINTS
# ============================================

@app.post("/score", response_model=ScoreResponse)
async def score(req: ScoreRequest):
    """
    Score a feature vector using the specified model version.
    
    If modelVersion is None, canary routing is applied:
    - 90% traffic → stable (configurable)
    - 10% traffic → canary (configurable)
    
    Returns the score and the actual model version used.
    """
    try:
        version, routing = resolve_model_version(req.modelVersion)
        model = load_model(version)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    
    # Build feature vector in correct order
    try:
        # Try to get feature names from model
        feature_order = getattr(model, 'feature_names_in_', DEFAULT_FEATURE_ORDER)
        x = np.array([[req.features.get(name, 0.0) for name in feature_order]])
    except Exception as e:
        logger.warning(f"Feature ordering fallback: {e}")
        # Fallback: use default order
        x = np.array([[req.features.get(name, 0.0) for name in DEFAULT_FEATURE_ORDER]])
    
    # Predict probability
    try:
        if hasattr(model, 'predict_proba'):
            proba = model.predict_proba(x)[0][1]  # Class 1 = "good match"
        elif hasattr(model, 'predict'):
            # For models without probability (e.g., regression)
            proba = float(model.predict(x)[0])
            # Normalize to 0-1 range
            proba = max(0.0, min(1.0, proba))
        else:
            raise HTTPException(status_code=500, detail="Model has no predict method")
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")
    
    # Log inference
    log_inference(version, float(proba), req.features)
    
    return ScoreResponse(
        scoreMl=float(proba),
        modelVersion=version,
        routing=routing
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check with loaded model info"""
    return HealthResponse(
        status="healthy",
        stableVersion=_registry.get("stable", "unknown"),
        canaryVersion=_registry.get("canary"),
        canaryTraffic=_registry.get("canaryTraffic", 0.0),
        loadedModels=list(_models_cache.keys())
    )


@app.get("/registry", response_model=RegistryResponse)
async def get_registry():
    """Get current registry configuration"""
    return RegistryResponse(
        stable=_registry.get("stable", "unknown"),
        canary=_registry.get("canary"),
        canaryTraffic=_registry.get("canaryTraffic", 0.0),
        models=_registry.get("models", [])
    )


@app.patch("/registry")
async def update_registry(req: UpdateRegistryRequest):
    """
    Update registry configuration.
    
    Use this for canary rollouts:
    1. Set canary to new version
    2. Gradually increase canaryTraffic
    3. When satisfied, set stable = canary and canaryTraffic = 0
    """
    if req.stable is not None:
        if req.stable not in _registry.get("models", []):
            raise HTTPException(status_code=400, detail=f"Unknown model: {req.stable}")
        _registry["stable"] = req.stable
    
    if req.canary is not None:
        if req.canary not in _registry.get("models", []):
            raise HTTPException(status_code=400, detail=f"Unknown model: {req.canary}")
        _registry["canary"] = req.canary
    
    if req.canaryTraffic is not None:
        _registry["canaryTraffic"] = req.canaryTraffic
    
    save_registry()
    
    return {"status": "updated", "registry": _registry}


@app.get("/models")
async def list_models():
    """List available model versions"""
    return {
        "stable": _registry.get("stable"),
        "canary": _registry.get("canary"),
        "canaryTraffic": _registry.get("canaryTraffic", 0.0),
        "available": _registry.get("models", []),
        "loaded": list(_models_cache.keys())
    }


@app.post("/models/{version}/load")
async def load_model_endpoint(version: str):
    """Explicitly load a model version into cache"""
    try:
        model = load_model(version)
        return {"status": "loaded", "version": version}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Model not found: {version}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/models/{version}/unload")
async def unload_model(version: str):
    """Unload a model from cache"""
    if version in _models_cache:
        del _models_cache[version]
        return {"status": "unloaded", "version": version}
    raise HTTPException(status_code=404, detail=f"Model not in cache: {version}")


@app.get("/logs")
async def get_logs(limit: int = 100):
    """Get recent inference logs (for debugging)"""
    return {
        "count": len(_inference_logs),
        "logs": _inference_logs[-limit:]
    }


@app.delete("/logs")
async def clear_logs():
    """Clear inference logs"""
    global _inference_logs
    count = len(_inference_logs)
    _inference_logs = []
    return {"status": "cleared", "count": count}


# ============================================
# METRICS ENDPOINT (for Prometheus)
# ============================================

@app.get("/metrics")
async def metrics():
    """Prometheus-style metrics"""
    lines = []
    
    # Model cache metrics
    lines.append(f"# HELP ml_models_loaded Number of models loaded in cache")
    lines.append(f"# TYPE ml_models_loaded gauge")
    lines.append(f'ml_models_loaded{{}} {len(_models_cache)}')
    
    # Inference count per version
    lines.append(f"# HELP ml_inferences_total Total inferences per model version")
    lines.append(f"# TYPE ml_inferences_total counter")
    
    version_counts: Dict[str, int] = {}
    for log in _inference_logs:
        version_counts[log.modelVersion] = version_counts.get(log.modelVersion, 0) + 1
    
    for version, count in version_counts.items():
        lines.append(f'ml_inferences_total{{version="{version}"}} {count}')
    
    # Canary traffic config
    lines.append(f"# HELP ml_canary_traffic Configured canary traffic percentage")
    lines.append(f"# TYPE ml_canary_traffic gauge")
    lines.append(f'ml_canary_traffic{{}} {_registry.get("canaryTraffic", 0.0)}')
    
    return "\n".join(lines)


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
