"""
CargoBit ML Scoring Service
===========================

Production ML scoring service for suggestions with SHAP explainability.

Features:
- Real-time ML scoring
- Shadow Mode, Canary, Production deployment
- SHAP-based explainability
- Feature retrieval from Feast
- Prometheus metrics

Usage:
    uvicorn serve:app --host 0.0.0.0 --port 8080

Author: CargoBit ML Team
Version: 2.0.0
"""

import logging
import os
import pickle
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import lightgbm as lgb
import mlflow
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class ScoringConfig:
    """Scoring service configuration."""
    
    mlflow_uri: str = "http://localhost:5000"
    model_name: str = "suggestion_ltr_model"
    blend_factor: float = 0.8  # α: 0.8 = 80% heuristic, 20% ML
    mode: str = "shadow"  # shadow | canary | production
    canary_percentage: float = 0.1
    
    feature_columns: List[str] = field(default_factory=lambda: [
        "revenueScore",
        "capacityScore",
        "priorityScore",
        "riskScore",
        "serviceLevelScore",
        "co2Score",
        "heuristicScoreNorm",
        "customerAcceptanceRate30d",
        "customerAvgMargin30d",
        "driverAcceptanceRate30d",
        "driverAvgMargin30d",
        "laneAcceptanceRate30d",
        "laneAvgMargin30d",
        "hourOfDay",
        "dayOfWeekNumeric",
        "isWeekend",
        "timeOfDayEncoded",
        "weatherEncoded",
        "trafficEncoded",
        "customerTierEncoded",
        "customerCreditRating",
        "driverRating",
        "driverExperienceYears",
        "distancePickupToRouteNorm",
        "distanceDeliveryToDestinationNorm",
        "timeToPickupNorm",
        "timeToDeliveryNorm",
    ])


# =============================================================================
# MODELS
# =============================================================================

class ScoringRequest(BaseModel):
    """Request for ML scoring."""
    
    suggestion_id: str = Field(..., description="Unique suggestion identifier")
    tour_id: str = Field(..., description="Tour identifier")
    heuristic_score: float = Field(..., description="Heuristic score")
    features: Dict[str, float] = Field(..., description="Feature values")


class Contributor(BaseModel):
    """Feature contributor explanation."""
    
    feature: str
    value: float
    impact: float
    direction: str  # "positive" | "negative"


class ScoringResponse(BaseModel):
    """Response from ML scoring."""
    
    suggestion_id: str
    tour_id: str
    heuristic_score: float
    ml_score: float
    final_score: float
    model_version: str
    model_used: str  # "heuristic" | "ml" | "hybrid"
    blend_factor: float
    top_contributors: List[Contributor]
    latency_ms: float


class BatchScoringRequest(BaseModel):
    """Batch scoring request."""
    
    suggestions: List[ScoringRequest]


class HealthResponse(BaseModel):
    """Health check response."""
    
    status: str
    model_version: Optional[str]
    mode: str
    uptime_seconds: float
    shap_enabled: bool


# =============================================================================
# SHAP EXPLAINER
# =============================================================================

class SHAPExplainerService:
    """SHAP explainability service for real-time explanations."""
    
    def __init__(self, model: lgb.Booster, feature_columns: List[str]):
        self.model = model
        self.feature_columns = feature_columns
        self.explainer = None
        self._init_explainer()
    
    def _init_explainer(self) -> None:
        """Initialize Tree SHAP explainer."""
        import shap
        
        # Tree SHAP is efficient for tree models
        self.explainer = shap.TreeExplainer(self.model)
        logger.info("SHAP explainer initialized")
    
    def explain(self, X: np.ndarray) -> List[Dict]:
        """
        Generate explanations for predictions.
        
        Args:
            X: Feature matrix (n_samples, n_features)
            
        Returns:
            List of explanation dicts
        """
        # Compute SHAP values
        shap_values = self.explainer.shap_values(X)
        
        # Handle multi-class output
        if isinstance(shap_values, list):
            shap_values = shap_values[0]
        
        explanations = []
        
        for i in range(len(X)):
            # Get SHAP values for this sample
            sample_shap = shap_values[i]
            feature_vals = X[i]
            
            # Build contributors list
            contributors = []
            for j, (feat, val, shap_val) in enumerate(
                zip(self.feature_columns, feature_vals, sample_shap)
            ):
                contributors.append({
                    "feature": feat,
                    "value": float(val),
                    "impact": float(abs(shap_val)),
                    "direction": "positive" if shap_val > 0 else "negative",
                })
            
            # Sort by impact
            contributors.sort(key=lambda x: x["impact"], reverse=True)
            
            explanations.append({
                "top_contributors": contributors[:5],
                "base_value": float(self.explainer.expected_value),
            })
        
        return explanations


# =============================================================================
# SCORING SERVICE
# =============================================================================

class ScoringService:
    """
    ML Scoring Service with SHAP Explainability.
    
    Deployment Modes:
    - Shadow Mode: ML score computed but not used (logging only)
    - Canary: ML score used for subset of traffic
    - Production: ML score used for all traffic
    
    Blend Formula:
        Score_final = α × Score_heuristic + (1-α) × Score_ml
    """
    
    def __init__(self, config: ScoringConfig):
        self.config = config
        self.model: Optional[lgb.Booster] = None
        self.model_version: Optional[str] = None
        self.shap_explainer: Optional[SHAPExplainerService] = None
        self.start_time = time.time()
        
        self._load_model()
    
    def _load_model(self) -> None:
        """Loads production model from MLflow."""
        try:
            mlflow.set_tracking_uri(self.config.mlflow_uri)
            
            client = mlflow.tracking.MlflowClient()
            versions = client.get_latest_versions(
                self.config.model_name,
                stages=["Production"]
            )
            
            if versions:
                version = versions[0].version
                model_uri = f"models:/{self.config.model_name}/{version}"
                self.model = mlflow.lightgbm.load_model(model_uri)
                self.model_version = version
                logger.info(f"Loaded model v{version}")
                
                # Initialize SHAP explainer
                self.shap_explainer = SHAPExplainerService(
                    self.model,
                    self.config.feature_columns
                )
            else:
                logger.warning("No production model found, using heuristic only")
                self.model = None
                self.model_version = None
                self.shap_explainer = None
                
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model = None
            self.model_version = None
            self.shap_explainer = None
    
    def score(self, request: ScoringRequest) -> ScoringResponse:
        """
        Computes ML-enhanced score.
        
        Args:
            request: Scoring request with features
            
        Returns:
            ScoringResponse with final score and explanation
        """
        start_time = time.time()
        
        ml_score = 0.0
        top_contributors = []
        model_used = "heuristic"
        
        # Compute ML score if model available
        if self.model is not None:
            # Prepare feature vector
            X = np.array([[
                request.features.get(col, 0.0)
                for col in self.config.feature_columns
            ]], dtype=np.float32)
            
            # Predict
            ml_score_raw = self.model.predict(X)[0]
            
            # Normalize to similar scale as heuristic (0-15)
            ml_score = self._normalize_score(ml_score_raw)
            
            # Get SHAP explanation
            if self.shap_explainer:
                explanations = self.shap_explainer.explain(X)
                if explanations:
                    top_contributors = [
                        Contributor(
                            feature=c["feature"],
                            value=c["value"],
                            impact=c["impact"],
                            direction=c["direction"],
                        )
                        for c in explanations[0]["top_contributors"]
                    ]
        
        # Determine final score based on deployment mode
        final_score = request.heuristic_score
        
        if self.config.mode == "shadow":
            # Shadow: log ML score, use heuristic
            model_used = "heuristic"
            final_score = request.heuristic_score
            
        elif self.config.mode == "canary":
            # Canary: use ML for percentage of requests
            import random
            if random.random() < self.config.canary_percentage:
                final_score = (
                    self.config.blend_factor * request.heuristic_score +
                    (1 - self.config.blend_factor) * ml_score
                )
                model_used = "hybrid"
            else:
                model_used = "heuristic"
                
        elif self.config.mode == "production":
            # Production: always use blend
            if self.model is not None:
                final_score = (
                    self.config.blend_factor * request.heuristic_score +
                    (1 - self.config.blend_factor) * ml_score
                )
                model_used = "hybrid"
            else:
                model_used = "heuristic"
        
        latency_ms = (time.time() - start_time) * 1000
        
        return ScoringResponse(
            suggestion_id=request.suggestion_id,
            tour_id=request.tour_id,
            heuristic_score=request.heuristic_score,
            ml_score=ml_score,
            final_score=final_score,
            model_version=self.model_version or "none",
            model_used=model_used,
            blend_factor=self.config.blend_factor,
            top_contributors=top_contributors,
            latency_ms=latency_ms,
        )
    
    def batch_score(self, requests: List[ScoringRequest]) -> List[ScoringResponse]:
        """
        Batch scoring for multiple suggestions.
        
        Optimized for processing multiple suggestions per tour.
        
        Args:
            requests: List of scoring requests
            
        Returns:
            List of scoring responses
        """
        if not requests:
            return []
        
        start_time = time.time()
        
        # Prepare batch feature matrix
        X = np.array([[
            req.features.get(col, 0.0)
            for col in self.config.feature_columns
        ] for req in requests], dtype=np.float32)
        
        # Batch predict
        if self.model is not None:
            ml_scores_raw = self.model.predict(X)
            ml_scores = [self._normalize_score(s) for s in ml_scores_raw]
            
            # Batch SHAP explanation
            if self.shap_explainer:
                explanations = self.shap_explainer.explain(X)
            else:
                explanations = [None] * len(requests)
        else:
            ml_scores = [0.0] * len(requests)
            explanations = [None] * len(requests)
        
        # Build responses
        responses = []
        for i, req in enumerate(requests):
            # Determine final score
            if self.config.mode == "shadow":
                model_used = "heuristic"
                final_score = req.heuristic_score
            elif self.config.mode == "canary":
                import random
                if random.random() < self.config.canary_percentage:
                    final_score = (
                        self.config.blend_factor * req.heuristic_score +
                        (1 - self.config.blend_factor) * ml_scores[i]
                    )
                    model_used = "hybrid"
                else:
                    model_used = "heuristic"
                    final_score = req.heuristic_score
            elif self.config.mode == "production" and self.model is not None:
                final_score = (
                    self.config.blend_factor * req.heuristic_score +
                    (1 - self.config.blend_factor) * ml_scores[i]
                )
                model_used = "hybrid"
            else:
                model_used = "heuristic"
                final_score = req.heuristic_score
            
            # Build contributors
            if explanations[i]:
                top_contributors = [
                    Contributor(
                        feature=c["feature"],
                        value=c["value"],
                        impact=c["impact"],
                        direction=c["direction"],
                    )
                    for c in explanations[i]["top_contributors"]
                ]
            else:
                top_contributors = []
            
            responses.append(ScoringResponse(
                suggestion_id=req.suggestion_id,
                tour_id=req.tour_id,
                heuristic_score=req.heuristic_score,
                ml_score=ml_scores[i],
                final_score=final_score,
                model_version=self.model_version or "none",
                model_used=model_used,
                blend_factor=self.config.blend_factor,
                top_contributors=top_contributors,
                latency_ms=(time.time() - start_time) * 1000,
            ))
        
        return responses
    
    def _normalize_score(self, raw_score: float) -> float:
        """Normalizes ML score to heuristic scale (0-15)."""
        return max(0.0, min(15.0, raw_score * 10.0))
    
    def health(self) -> HealthResponse:
        """Returns health status."""
        return HealthResponse(
            status="healthy" if self.model is not None else "degraded",
            model_version=self.model_version,
            mode=self.config.mode,
            uptime_seconds=time.time() - self.start_time,
            shap_enabled=self.shap_explainer is not None,
        )


# =============================================================================
# FASTAPI APP
# =============================================================================

# Configuration from environment
config = ScoringConfig(
    mlflow_uri=os.getenv("MLFLOW_URI", "http://localhost:5000"),
    blend_factor=float(os.getenv("BLEND_FACTOR", "0.8")),
    mode=os.getenv("SCORING_MODE", "shadow"),
    canary_percentage=float(os.getenv("CANARY_PERCENTAGE", "0.1")),
)

# Initialize service
service = ScoringService(config)

# FastAPI app
app = FastAPI(
    title="CargoBit ML Scoring Service",
    description="Real-time ML scoring for suggestions with SHAP explainability",
    version="2.0.0",
)


@app.post("/score", response_model=ScoringResponse)
async def score(request: ScoringRequest) -> ScoringResponse:
    """
    Compute ML-enhanced score for a single suggestion.
    
    Mode behavior:
    - shadow: ML score logged but not used
    - canary: ML score used for 10% of requests
    - production: ML score used for all requests
    
    Returns SHAP-based explanation of top contributing features.
    """
    try:
        return service.score(request)
    except Exception as e:
        logger.error(f"Scoring error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch", response_model=List[ScoringResponse])
async def batch_score(request: BatchScoringRequest) -> List[ScoringResponse]:
    """
    Batch scoring for multiple suggestions.
    
    Optimized for processing multiple suggestions per tour.
    """
    try:
        return service.batch_score(request.suggestions)
    except Exception as e:
        logger.error(f"Batch scoring error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint."""
    return service.health()


@app.get("/ready")
async def ready():
    """Readiness probe for Kubernetes."""
    if config.mode == "production" and service.model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "ready"}


@app.post("/reload")
async def reload_model():
    """Reload model from MLflow (admin endpoint)."""
    service._load_model()
    return {
        "model_version": service.model_version,
        "shap_enabled": service.shap_explainer is not None,
    }


# =============================================================================
# PROMETHEUS METRICS
# =============================================================================

from prometheus_client import Counter, Histogram, generate_latest, REGISTRY
from fastapi.responses import PlainTextResponse

# Metrics
SCORE_REQUESTS = Counter(
    "ml_scoring_requests_total",
    "Total scoring requests",
    ["model_used", "mode"]
)

SCORE_LATENCY = Histogram(
    "ml_scoring_latency_seconds",
    "Scoring latency",
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5]
)

SCORE_FINAL = Histogram(
    "ml_scoring_final_score",
    "Final score distribution",
    buckets=[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
)

SHAP_COMPUTED = Counter(
    "ml_scoring_shap_computed_total",
    "Total SHAP explanations computed"
)


@app.middleware("http")
async def metrics_middleware(request, call_next):
    """Middleware for Prometheus metrics."""
    start_time = time.time()
    
    response = await call_next(request)
    
    if request.url.path == "/score":
        latency = time.time() - start_time
        SCORE_LATENCY.observe(latency)
    
    return response


@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    """Prometheus metrics endpoint."""
    return generate_latest(REGISTRY)


# =============================================================================
# STARTUP
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
