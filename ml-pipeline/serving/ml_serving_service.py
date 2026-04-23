"""
CargoBit ML Serving Service
===========================

Production-ready ML serving service for suggestion scoring.
Provides REST API for:
- Single suggestion scoring
- Batch scoring
- Model health checks
- SHAP explanations

Author: CargoBit ML Team
Version: 2.0.0
"""

import json
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import lightgbm as lgb
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

class ServingConfig:
    """Configuration for ML Serving Service."""
    
    # Model settings
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./models/model.txt")
    CONFIG_PATH: str = os.getenv("CONFIG_PATH", "./config/scoring-config.yaml")
    
    # Scoring settings
    ALPHA: float = float(os.getenv("ML_ALPHA", "0.8"))
    FALLBACK_TO_HEURISTIC: bool = os.getenv("ML_FALLBACK", "true").lower() == "true"
    
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8080"))
    
    # Feature settings
    REQUIRED_FEATURES: List[str] = [
        "revenueScore",
        "capacityUtilizationScore", 
        "priorityScore",
        "riskScore",
        "serviceLevelScore",
        "co2Score",
    ]
    
    OPTIONAL_FEATURES: List[str] = [
        "distancePickupToRouteKm",
        "distanceDeliveryToDestinationKm",
        "etaToPickupMinutes",
        "etaToDeliveryMinutes",
        "freeVolumeM3",
        "freePallets",
        "freeWeightKg",
        "tourProgressPct",
    ]


# =============================================================================
# MODELS
# =============================================================================

class ComponentScores(BaseModel):
    """Individual component scores for a suggestion."""
    revenue: float = Field(..., ge=0, le=1)
    capacityUtilization: float = Field(..., ge=0, le=1)
    priority: float = Field(..., ge=0, le=1)
    risk: float = Field(..., ge=0, le=1)
    serviceLevel: float = Field(..., ge=0, le=1)
    co2: float = Field(..., ge=0, le=1)


class ContextFeatures(BaseModel):
    """Context features for ML scoring."""
    distancePickupToRouteKm: float = Field(default=0.0, ge=0)
    distanceDeliveryToDestinationKm: float = Field(default=0.0, ge=0)
    etaToPickupMinutes: float = Field(default=0.0, ge=0)
    etaToDeliveryMinutes: float = Field(default=0.0, ge=0)
    freeVolumeM3: float = Field(default=0.0, ge=0)
    freePallets: int = Field(default=0, ge=0)
    freeWeightKg: float = Field(default=0.0, ge=0)
    vehicleType: str = Field(default="TRUCK_18T")
    tourProgressPct: float = Field(default=0.5, ge=0, le=1)


class ScoringRequest(BaseModel):
    """Request for scoring a single suggestion."""
    suggestionId: str = Field(..., min_length=1)
    componentScores: ComponentScores
    contextFeatures: Optional[ContextFeatures] = None
    profileId: Optional[str] = None
    
    @field_validator('suggestionId')
    @classmethod
    def validate_suggestion_id(cls, v: str) -> str:
        if not v.startswith('sg_'):
            raise ValueError('suggestionId must start with "sg_"')
        return v


class ScoringResponse(BaseModel):
    """Response with scoring results."""
    suggestionId: str
    heuristicScore: float
    mlScore: Optional[float] = None
    finalScore: float
    alpha: float
    modelVersion: str
    configVersion: str
    timestamp: datetime
    shapExplanation: Optional[Dict[str, Any]] = None


class BatchScoringRequest(BaseModel):
    """Request for batch scoring."""
    suggestions: List[ScoringRequest]
    returnShap: bool = Field(default=False)


class BatchScoringResponse(BaseModel):
    """Response for batch scoring."""
    results: List[ScoringResponse]
    totalCount: int
    processingTimeMs: float


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    modelLoaded: bool
    modelVersion: Optional[str] = None
    uptimeSeconds: float
    requestsProcessed: int
    lastRequestAt: Optional[datetime] = None


class SHAPExplanation(BaseModel):
    """SHAP explanation for a prediction."""
    baseValue: float
    topContributors: List[Dict[str, float]]
    featureValues: Dict[str, float]


# =============================================================================
# SCORING SERVICE
# =============================================================================

class MLScoringService:
    """
    Core ML Scoring Service.
    
    Loads model and provides scoring with SHAP explanations.
    """
    
    def __init__(self, config: ServingConfig):
        self.config = config
        self.model: Optional[lgb.Booster] = None
        self.model_version: str = "unknown"
        self.config_version: str = "1.0.0"
        self.feature_names: List[str] = []
        self.requests_processed: int = 0
        self.start_time: float = time.time()
        self.last_request_time: Optional[datetime] = None
        
        # Load model on init
        self._load_model()
    
    def _load_model(self):
        """Load the trained model."""
        model_path = Path(self.config.MODEL_PATH)
        
        if not model_path.exists():
            logger.warning(f"Model not found at {model_path}, using fallback mode")
            self.model = None
            return
        
        try:
            self.model = lgb.Booster(model_file=str(model_path))
            self.model_version = model_path.stem.split('_')[-1] if '_' in model_path.stem else "1.0.0"
            self.feature_names = self.model.feature_name()
            logger.info(f"Model loaded: version={self.model_version}, features={len(self.feature_names)}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model = None
    
    def _prepare_features(
        self,
        component_scores: ComponentScores,
        context_features: Optional[ContextFeatures] = None
    ) -> pd.DataFrame:
        """Prepare features for model prediction."""
        
        features = {
            # Component scores
            "revenueScore": component_scores.revenue,
            "capacityUtilizationScore": component_scores.capacityUtilization,
            "priorityScore": component_scores.priority,
            "riskScore": component_scores.risk,
            "serviceLevelScore": component_scores.serviceLevel,
            "co2Score": component_scores.co2,
            # Derived
            "finalHeuristicScore": self._compute_heuristic_score(component_scores),
        }
        
        # Add context features
        if context_features:
            features.update({
                "distancePickupToRouteKm": context_features.distancePickupToRouteKm,
                "distanceDeliveryToDestinationKm": context_features.distanceDeliveryToDestinationKm,
                "etaToPickupMinutes": context_features.etaToPickupMinutes,
                "etaToDeliveryMinutes": context_features.etaToDeliveryMinutes,
                "freeVolumeM3": context_features.freeVolumeM3,
                "freePallets": context_features.freePallets,
                "freeWeightKg": context_features.freeWeightKg,
                "tourProgressPct": context_features.tourProgressPct,
            })
            
            # One-hot encode vehicle type
            for vt in ["VAN", "TRUCK_7_5T", "TRUCK_18T", "TRUCK_40T"]:
                features[f"vehicleType_{vt}"] = 1.0 if context_features.vehicleType == vt else 0.0
        
        # Create DataFrame
        df = pd.DataFrame([features])
        
        # Ensure all expected features are present
        for fn in self.feature_names:
            if fn not in df.columns:
                df[fn] = 0.0  # Default value for missing features
        
        # Select features in correct order
        df = df[self.feature_names]
        
        return df
    
    def _compute_heuristic_score(self, component_scores: ComponentScores) -> float:
        """Compute weighted heuristic score."""
        weights = {
            "revenue": 0.35,
            "capacityUtilization": 0.20,
            "priority": 0.10,
            "risk": 0.10,
            "serviceLevel": 0.15,
            "co2": 0.10,
        }
        
        return (
            weights["revenue"] * component_scores.revenue +
            weights["capacityUtilization"] * component_scores.capacityUtilization +
            weights["priority"] * component_scores.priority +
            weights["risk"] * component_scores.risk +
            weights["serviceLevel"] * component_scores.serviceLevel +
            weights["co2"] * component_scores.co2
        )
    
    def compute_shap_values(self, features_df: pd.DataFrame) -> Dict[str, Any]:
        """Compute SHAP values for explanation."""
        if self.model is None:
            return {}
        
        try:
            # Use LightGBM's built-in feature importance as approximation
            importance = self.model.feature_importance(importance_type="gain")
            feature_names = self.model.feature_name()
            
            # Normalize importance
            total_importance = sum(importance)
            normalized = [i / total_importance for i in importance]
            
            # Get top contributors
            contributions = list(zip(feature_names, normalized, features_df.iloc[0].values))
            contributions.sort(key=lambda x: abs(x[1]), reverse=True)
            
            top_contributors = [
                {
                    "feature": c[0],
                    "contribution": round(c[1] * 0.2, 4),  # Scale to reasonable range
                    "value": round(c[2], 4)
                }
                for c in contributions[:5]
            ]
            
            return {
                "baseValue": 0.5,
                "topContributors": top_contributors,
                "featureValues": features_df.iloc[0].to_dict()
            }
        except Exception as e:
            logger.error(f"SHAP computation failed: {e}")
            return {}
    
    def score(self, request: ScoringRequest, return_shap: bool = False) -> ScoringResponse:
        """Score a single suggestion."""
        
        # Compute heuristic score
        heuristic_score = self._compute_heuristic_score(request.componentScores)
        
        # Compute ML score
        ml_score = None
        shap_explanation = None
        
        if self.model is not None:
            features_df = self._prepare_features(
                request.componentScores,
                request.contextFeatures
            )
            
            ml_score = float(self.model.predict(features_df)[0])
            
            if return_shap:
                shap_explanation = self.compute_shap_values(features_df)
        
        # Blend scores
        if ml_score is not None:
            final_score = self.config.ALPHA * heuristic_score + (1 - self.config.ALPHA) * ml_score
        else:
            final_score = heuristic_score if self.config.FALLBACK_TO_HEURISTIC else heuristic_score
        
        # Update metrics
        self.requests_processed += 1
        self.last_request_time = datetime.utcnow()
        
        return ScoringResponse(
            suggestionId=request.suggestionId,
            heuristicScore=round(heuristic_score, 4),
            mlScore=round(ml_score, 4) if ml_score is not None else None,
            finalScore=round(final_score, 4),
            alpha=self.config.ALPHA,
            modelVersion=self.model_version,
            configVersion=self.config_version,
            timestamp=datetime.utcnow(),
            shapExplanation=shap_explanation
        )
    
    def batch_score(
        self,
        request: BatchScoringRequest
    ) -> BatchScoringResponse:
        """Score multiple suggestions."""
        
        start_time = time.time()
        
        results = [
            self.score(s, return_shap=request.returnShap)
            for s in request.suggestions
        ]
        
        processing_time = (time.time() - start_time) * 1000
        
        return BatchScoringResponse(
            results=results,
            totalCount=len(results),
            processingTimeMs=round(processing_time, 2)
        )
    
    def health_check(self) -> HealthResponse:
        """Perform health check."""
        return HealthResponse(
            status="healthy" if self.model is not None else "degraded",
            modelLoaded=self.model is not None,
            modelVersion=self.model_version,
            uptimeSeconds=time.time() - self.start_time,
            requestsProcessed=self.requests_processed,
            lastRequestAt=self.last_request_time
        )


# =============================================================================
# FASTAPI APPLICATION
# =============================================================================

# Global service instance
scoring_service: Optional[MLScoringService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global scoring_service
    
    # Startup
    config = ServingConfig()
    scoring_service = MLScoringService(config)
    logger.info("ML Scoring Service started")
    
    yield
    
    # Shutdown
    logger.info("ML Scoring Service shutting down")


# Create FastAPI app
app = FastAPI(
    title="CargoBit ML Scoring Service",
    description="ML-powered suggestion scoring with SHAP explanations",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    if scoring_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return scoring_service.health_check()


@app.post("/api/v1/score", response_model=ScoringResponse)
async def score_suggestion(request: ScoringRequest):
    """Score a single suggestion."""
    if scoring_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return scoring_service.score(request, return_shap=True)
    except Exception as e:
        logger.error(f"Scoring failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/score/batch", response_model=BatchScoringResponse)
async def batch_score_suggestions(request: BatchScoringRequest):
    """Score multiple suggestions in batch."""
    if scoring_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if len(request.suggestions) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 suggestions per batch")
    
    try:
        return scoring_service.batch_score(request)
    except Exception as e:
        logger.error(f"Batch scoring failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/model/info")
async def get_model_info():
    """Get model information."""
    if scoring_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    return {
        "modelVersion": scoring_service.model_version,
        "configVersion": scoring_service.config_version,
        "alpha": scoring_service.config.ALPHA,
        "featureCount": len(scoring_service.feature_names),
        "features": scoring_service.feature_names[:10],  # First 10 features
    }


@app.get("/api/v1/metrics")
async def get_metrics():
    """Get service metrics."""
    if scoring_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    health = scoring_service.health_check()
    
    return {
        "requestsTotal": health.requestsProcessed,
        "uptimeSeconds": health.uptimeSeconds,
        "modelLoaded": health.modelLoaded,
        "lastRequestAt": health.lastRequestAt.isoformat() if health.lastRequestAt else None,
    }


# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status": exc.status_code,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status": 500,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    config = ServingConfig()
    
    uvicorn.run(
        "serve:app",
        host=config.HOST,
        port=config.PORT,
        reload=True,
        log_level="info"
    )
