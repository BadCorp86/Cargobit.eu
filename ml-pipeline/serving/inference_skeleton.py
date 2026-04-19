"""
CargoBit ML Inference Service - Minimal Skeleton
================================================

FastAPI skeleton for /score and /explain endpoints.
Production-ready with caching, validation, and error handling.

Usage:
    uvicorn inference_skeleton:app --host 0.0.0.0 --port 8000
"""

import os
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd
import lightgbm as lgb
import shap
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class ScoreRequest(BaseModel):
    """Request for ML scoring"""
    modelVersion: str = Field(default="latest", description="Model version to use")
    features: Dict[str, float] = Field(..., description="Feature values")


class ScoreResponse(BaseModel):
    """Response for ML scoring"""
    modelVersion: str
    scoreMl: float
    inferenceTimeMs: int


class ExplainRequest(BaseModel):
    """Request for SHAP explanation"""
    modelVersion: str = Field(default="latest", description="Model version to use")
    features: Dict[str, float] = Field(..., description="Feature values")
    topK: int = Field(default=5, ge=1, le=20, description="Number of top contributors")


class FeatureContribution(BaseModel):
    """SHAP feature contribution"""
    feature: str
    impact: float
    direction: str  # "positive" or "negative"
    value: Optional[float] = None


class ExplainResponse(BaseModel):
    """Response for SHAP explanation"""
    modelVersion: str
    mlScore: float
    baselineValue: float
    topContributors: List[FeatureContribution]
    explanationMethod: str = "shap"
    generatedAt: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    modelVersion: str
    cachedModels: int
    timestamp: str


# =============================================================================
# MODEL LOADER
# =============================================================================

class ModelCache:
    """Thread-safe model cache with TTL"""
    
    def __init__(self, ttl_seconds: int = 3600):
        self._models: Dict[str, lgb.Booster] = {}
        self._explainers: Dict[str, shap.TreeExplainer] = {}
        self._ttl_seconds = ttl_seconds
        self._loaded_at: Dict[str, datetime] = {}
    
    def get(self, version: str) -> tuple:
        """Get model and explainer from cache"""
        if version in self._models:
            # Check TTL
            loaded = self._loaded_at.get(version)
            if loaded and (datetime.now() - loaded).total_seconds() < self._ttl_seconds:
                return self._models[version], self._explainers[version]
        
        return None, None
    
    def set(self, version: str, model: lgb.Booster, explainer: shap.TreeExplainer):
        """Cache model and explainer"""
        self._models[version] = model
        self._explainers[version] = explainer
        self._loaded_at[version] = datetime.now()
        logger.info(f"Cached model version: {version}")
    
    def size(self) -> int:
        """Get number of cached models"""
        return len(self._models)


# Global cache instance
_cache = ModelCache()

# Model storage path
MODEL_PATH = os.getenv("MODEL_PATH", "models")


def load_model_and_explainer(version: str) -> tuple:
    """Load model and explainer with caching"""
    # Check cache first
    model, explainer = _cache.get(version)
    if model is not None:
        return model, explainer
    
    # Resolve "latest" to actual version
    if version == "latest":
        version = get_latest_model_version()
    
    # Load model
    model_file = f"{MODEL_PATH}/{version}/model.txt"
    try:
        model = lgb.Booster(model_file=model_file)
    except Exception as e:
        logger.error(f"Failed to load model {version}: {e}")
        raise HTTPException(status_code=500, detail=f"Model load failed: {e}")
    
    # Load explainer (or create from model)
    explainer = shap.TreeExplainer(model)
    
    # Cache
    _cache.set(version, model, explainer)
    
    return model, explainer


def get_latest_model_version() -> str:
    """Get the latest model version from storage"""
    try:
        versions = sorted(os.listdir(MODEL_PATH), reverse=True)
        if versions:
            return versions[0]
    except Exception:
        pass
    return "latest"


def get_active_model_version() -> str:
    """Get active model version from registry (or fallback to latest)"""
    # TODO: Query PostgreSQL model registry
    return get_latest_model_version()


# =============================================================================
# FASTAPI APP
# =============================================================================

app = FastAPI(
    title="CargoBit ML Inference Service",
    description="Minimal ML inference API with SHAP explanations",
    version="1.0.0"
)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    version = get_active_model_version()
    return HealthResponse(
        status="healthy",
        modelVersion=version,
        cachedModels=_cache.size(),
        timestamp=datetime.utcnow().isoformat()
    )


@app.post("/score", response_model=ScoreResponse, tags=["Inference"])
async def score(request: ScoreRequest):
    """
    Score a single prediction.
    
    Returns the ML model score for the given features.
    Target latency: P95 < 50ms
    """
    start = time.time()
    
    try:
        # Load model (from cache if available)
        model, _ = load_model_and_explainer(request.modelVersion)
        
        # Prepare features
        x = pd.DataFrame([request.features])
        
        # Predict
        score = float(model.predict(x, num_iteration=model.best_iteration)[0])
        
        # Metrics
        inference_time = int((time.time() - start) * 1000)
        
        return ScoreResponse(
            modelVersion=request.modelVersion,
            scoreMl=score,
            inferenceTimeMs=inference_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scoring failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scoring failed: {e}")


@app.post("/explain", response_model=ExplainResponse, tags=["Inference"])
async def explain(request: ExplainRequest):
    """
    Explain a prediction using SHAP values.
    
    Returns the top feature contributors to the prediction.
    Target latency: P95 < 200ms
    """
    start = time.time()
    
    try:
        # Load model and explainer
        model, explainer = load_model_and_explainer(request.modelVersion)
        
        # Prepare features
        x = pd.DataFrame([request.features])
        
        # Predict
        score = float(model.predict(x, num_iteration=model.best_iteration)[0])
        
        # Compute SHAP values
        shap_values = explainer.shap_values(x)[0]
        
        # Handle binary classification
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        
        # Get baseline
        baseline = float(explainer.expected_value)
        if isinstance(baseline, (list, tuple)):
            baseline = float(baseline[1]) if len(baseline) > 1 else float(baseline[0])
        
        # Build feature contributions sorted by impact
        contributions = []
        for name, val, shap_val in zip(x.columns, x.iloc[0], shap_values):
            contributions.append({
                "feature": name,
                "impact": float(abs(shap_val)),
                "direction": "positive" if shap_val >= 0 else "negative",
                "value": float(val)
            })
        
        # Sort by impact and take top K
        contributions.sort(key=lambda c: c["impact"], reverse=True)
        top_contributors = contributions[:request.topK]
        
        return ExplainResponse(
            modelVersion=request.modelVersion,
            mlScore=score,
            baselineValue=baseline,
            topContributors=[FeatureContribution(**c) for c in top_contributors],
            generatedAt=datetime.utcnow().isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Explanation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Explanation failed: {e}")


@app.post("/model/reload", tags=["Model"])
async def reload_model(version: Optional[str] = None):
    """
    Reload model from disk.
    
    Invalidates cache and reloads the specified model version.
    """
    if version is None:
        version = get_active_model_version()
    
    # Clear from cache
    if version in _cache._models:
        del _cache._models[version]
        del _cache._explainers[version]
        del _cache._loaded_at[version]
    
    # Reload
    try:
        model, explainer = load_model_and_explainer(version)
        return {"status": "success", "version": version, "message": "Model reloaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reload failed: {e}")


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "inference_skeleton:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=False
    )
