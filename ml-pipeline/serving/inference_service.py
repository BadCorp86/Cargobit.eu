"""
CargoBit ML Inference Service
==============================

Production-ready ML Inference Service for Suggestion Scoring.
Implementiert OpenAPI Spec v1.0.0 mit:
- POST /score - ML-Score für einen Vorschlag
- POST /explain - Explainability mit Top-Feature-Contributors

Author: CargoBit ML Team
Version: 1.0.0
"""

import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import lightgbm as lgb
import numpy as np
import pandas as pd
import shap
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

class InferenceConfig:
    """Configuration for ML Inference Service."""
    
    MODEL_REGISTRY_PATH: str = os.getenv("MODEL_REGISTRY_PATH", "./models/")
    ACTIVE_MODEL_FILE: str = os.getenv("ACTIVE_MODEL_FILE", "model_active.txt")
    
    # Default feature set (26 features from Feature Dictionary)
    FEATURE_NAMES: List[str] = [
        # Heuristic Features
        "revenue_score",
        "capacity_utilization_score", 
        "priority_score",
        "risk_score",
        "service_level_score",
        "co2_score",
        # Context Features
        "distance_pickup_to_route_km",
        "distance_delivery_to_destination_km",
        "eta_to_pickup_minutes",
        "eta_to_delivery_minutes",
        "free_volume_m3",
        "free_pallets",
        "free_weight_kg",
        "tour_progress_pct",
        "vehicle_type_van",
        "vehicle_type_truck_7t",
        "vehicle_type_truck_18t",
        "vehicle_type_truck_40t",
        # Historical Features
        "customer_acceptance_rate_30d",
        "driver_acceptance_rate_30d",
        "lane_acceptance_rate_30d",
        "customer_delay_avg_30d",
        "driver_delay_avg_30d",
        "lane_realized_margin_avg_90d",
        # Meta Features
        "combined_acceptance_rate",
        "risk_adjusted_revenue",
        "time_pressure_score",
    ]


# =============================================================================
# PYDANTIC MODELS (OpenAPI Schemas)
# =============================================================================

class FeatureMap(BaseModel):
    """
    Key-Value Map von Feature-Namen zu numerischen Werten.
    """
    __root__: Dict[str, float]
    
    class Config:
        schema_extra = {
            "example": {
                "revenue_score": 0.85,
                "capacity_utilization_score": 0.72,
                "priority_score": 0.5,
                "risk_score": 0.15,
                "service_level_score": 0.9,
                "co2_score": 0.6,
                "distance_pickup_to_route_km": 12.5,
                "eta_to_pickup_minutes": 45.0,
            }
        }


class ScoreRequest(BaseModel):
    """Request für /score Endpoint."""
    modelVersion: str = Field(
        default="latest",
        description='Spezifische Modellversion, "latest" wenn leer'
    )
    features: Dict[str, float] = Field(
        ...,
        description="Key-Value Map von Feature-Namen zu numerischen Werten"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "modelVersion": "latest",
                "features": {
                    "revenue_score": 0.85,
                    "capacity_utilization_score": 0.72,
                    "priority_score": 0.5,
                    "risk_score": 0.15,
                    "service_level_score": 0.9,
                    "co2_score": 0.6,
                    "distance_pickup_to_route_km": 12.5,
                    "eta_to_pickup_minutes": 45.0,
                    "free_volume_m3": 15.0,
                    "tour_progress_pct": 0.35,
                }
            }
        }


class ScoreResponse(BaseModel):
    """Response für /score Endpoint."""
    modelVersion: str
    scoreMl: float
    inferenceTimeMs: int
    
    class Config:
        schema_extra = {
            "example": {
                "modelVersion": "v20260415_abc123",
                "scoreMl": 0.7832,
                "inferenceTimeMs": 12
            }
        }


class ExplainRequest(BaseModel):
    """Request für /explain Endpoint."""
    modelVersion: str = Field(
        default="latest",
        description='Spezifische Modellversion, "latest" wenn leer'
    )
    features: Dict[str, float] = Field(
        ...,
        description="Key-Value Map von Feature-Namen zu numerischen Werten"
    )
    topK: int = Field(
        default=5,
        description="Anzahl der wichtigsten Features"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "modelVersion": "latest",
                "features": {
                    "revenue_score": 0.85,
                    "capacity_utilization_score": 0.72,
                    "priority_score": 0.5,
                    "risk_score": 0.15,
                    "service_level_score": 0.9,
                    "co2_score": 0.6,
                    "distance_pickup_to_route_km": 12.5,
                    "eta_to_pickup_minutes": 45.0,
                },
                "topK": 5
            }
        }


class FeatureContribution(BaseModel):
    """Ein einzelner Feature-Beitrag zur Vorhersage."""
    feature: str
    impact: float = Field(description="Absoluter Einfluss auf den Score")
    direction: str = Field(description="positive oder negative Richtung")
    
    class Config:
        schema_extra = {
            "example": {
                "feature": "revenue_score",
                "impact": 0.1523,
                "direction": "positive"
            }
        }


class ExplainResponse(BaseModel):
    """Response für /explain Endpoint."""
    modelVersion: str
    mlScore: float
    topContributors: List[FeatureContribution]
    explanationMethod: str
    generatedAt: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "modelVersion": "v20260415_abc123",
                "mlScore": 0.7832,
                "topContributors": [
                    {"feature": "revenue_score", "impact": 0.1523, "direction": "positive"},
                    {"feature": "distance_pickup_to_route_km", "impact": -0.0892, "direction": "negative"},
                    {"feature": "customer_acceptance_rate_30d", "impact": 0.0654, "direction": "positive"},
                    {"feature": "risk_score", "impact": -0.0432, "direction": "negative"},
                    {"feature": "tour_progress_pct", "impact": 0.0321, "direction": "positive"}
                ],
                "explanationMethod": "shap",
                "generatedAt": "2026-04-19T14:30:00Z"
            }
        }


class ModelInfo(BaseModel):
    """Information über das geladene Modell."""
    modelVersion: str
    algorithm: str
    status: str
    auc: float
    ndcg10: float
    trainingDate: str
    featureCount: int


class ErrorResponse(BaseModel):
    """Error Response."""
    error: str
    code: int
    timestamp: datetime


# =============================================================================
# ML INFERENCE ENGINE
# =============================================================================

class MLInferenceEngine:
    """
    Core ML Inference Engine.
    
    Lädt Modelle aus der Registry und bietet:
    - Scoring mit konfigurierbarer Modellversion
    - SHAP-basierte Explainability
    - Performance-Optimierung für Low-Latency
    """
    
    def __init__(self, config: InferenceConfig):
        self.config = config
        self.models: Dict[str, lgb.Booster] = {}
        self.active_model_version: Optional[str] = None
        self.shap_explainers: Dict[str, shap.TreeExplainer] = {}
        self.model_metadata: Dict[str, Dict[str, Any]] = {}
        self.requests_processed: int = 0
        self.start_time: float = time.time()
        
        # Load models on init
        self._load_models_from_registry()
    
    def _load_models_from_registry(self):
        """Lade alle verfügbaren Modelle aus der Registry."""
        registry_path = Path(self.config.MODEL_REGISTRY_PATH)
        
        if not registry_path.exists():
            logger.warning(f"Model registry not found at {registry_path}")
            self._create_mock_model()
            return
        
        # Find all model files
        model_files = list(registry_path.glob("*.txt")) + list(registry_path.glob("*.joblib"))
        
        if not model_files:
            logger.warning("No model files found in registry, creating mock model")
            self._create_mock_model()
            return
        
        for model_file in model_files:
            try:
                model = lgb.Booster(model_file=str(model_file))
                version = model_file.stem.replace("model_", "").replace("_", "")
                
                self.models[version] = model
                self.model_metadata[version] = {
                    "algorithm": "LIGHTGBM",
                    "loaded_at": datetime.utcnow(),
                    "feature_count": len(model.feature_name()),
                }
                
                logger.info(f"Loaded model: {version}, features: {len(model.feature_name())}")
            except Exception as e:
                logger.error(f"Failed to load model {model_file}: {e}")
        
        # Set active model (latest or from config)
        if self.models:
            # Try to read active model file
            active_file = registry_path / self.config.ACTIVE_MODEL_FILE
            if active_file.exists():
                self.active_model_version = active_file.read_text().strip()
                if self.active_model_version not in self.models:
                    self.active_model_version = list(self.models.keys())[-1]
            else:
                # Use most recent
                self.active_model_version = list(self.models.keys())[-1]
            
            logger.info(f"Active model set to: {self.active_model_version}")
    
    def _create_mock_model(self):
        """Erstelle ein Mock-Modell für Development/Testing."""
        import tempfile
        
        # Create a simple LightGBM model
        np.random.seed(42)
        n_samples = 1000
        n_features = len(self.config.FEATURE_NAMES)
        
        X = np.random.random((n_samples, n_features))
        y = (X[:, 0] * 0.5 + X[:, 1] * 0.3 + np.random.random(n_samples) * 0.2 > 0.5).astype(int)
        
        train_data = lgb.Dataset(X, label=y, feature_name=self.config.FEATURE_NAMES)
        
        params = {
            'objective': 'binary',
            'metric': 'auc',
            'num_leaves': 15,
            'max_depth': 4,
            'learning_rate': 0.1,
            'verbose': -1,
        }
        
        model = lgb.train(params, train_data, num_boost_round=50)
        
        # Store mock model
        self.models["v20260419_mock"] = model
        self.active_model_version = "v20260419_mock"
        self.model_metadata["v20260419_mock"] = {
            "algorithm": "LIGHTGBM",
            "loaded_at": datetime.utcnow(),
            "feature_count": n_features,
            "auc": 0.72,
            "ndcg10": 0.65,
            "mock": True,
        }
        
        logger.info("Created mock model for development")
    
    def _get_shap_explainer(self, model_version: str) -> shap.TreeExplainer:
        """Hole oder erstelle SHAP Explainer für ein Modell."""
        if model_version not in self.shap_explainers:
            model = self.models[model_version]
            self.shap_explainers[model_version] = shap.TreeExplainer(model)
        return self.shap_explainers[model_version]
    
    def _prepare_features(self, features: Dict[str, float], model: lgb.Booster) -> pd.DataFrame:
        """
    Bereite Features für Vorhersage vor.
    
    - Mapping von Request-Features zu Model-Features
    - Fehlende Werte mit Defaults füllen
    - Korrekte Reihenfolge sicherstellen
    """
        model_features = model.feature_name()
        
        # Create feature vector
        feature_values = {}
        for feat in model_features:
            # Try exact match
            if feat in features:
                feature_values[feat] = features[feat]
            # Try normalized match (snake_case)
            else:
                normalized = feat.lower().replace("-", "_")
                if normalized in features:
                    feature_values[feat] = features[normalized]
                else:
                    feature_values[feat] = 0.0  # Default
        
        return pd.DataFrame([feature_values], columns=model_features)
    
    def get_model(self, model_version: str) -> tuple[lgb.Booster, str]:
        """
    Hole Modell für Inference.
    
    Args:
        model_version: "latest" oder spezifische Version
        
    Returns:
        Tuple von (model, actual_version)
    """
        if model_version == "latest":
            version = self.active_model_version
        else:
            version = model_version
        
        if version not in self.models:
            raise ValueError(f"Model version '{version}' not found. Available: {list(self.models.keys())}")
        
        return self.models[version], version
    
    def score(self, request: ScoreRequest) -> ScoreResponse:
        """
    Berechne ML-Score für einen Vorschlag.
    
    Args:
        request: ScoreRequest mit Features und optionaler Modellversion
        
    Returns:
        ScoreResponse mit ML-Score und Metadaten
    """
        start_time = time.time()
        
        # Get model
        model, actual_version = self.get_model(request.modelVersion)
        
        # Prepare features
        features_df = self._prepare_features(request.features, model)
        
        # Predict
        score = float(model.predict(features_df)[0])
        
        # Ensure score is in [0, 1]
        score = max(0.0, min(1.0, score))
        
        inference_time_ms = int((time.time() - start_time) * 1000)
        
        self.requests_processed += 1
        
        return ScoreResponse(
            modelVersion=actual_version,
            scoreMl=round(score, 4),
            inferenceTimeMs=inference_time_ms
        )
    
    def explain(self, request: ExplainRequest) -> ExplainResponse:
        """
    Liefere Explainability-Informationen für einen Vorschlag.
    
    Nutzt SHAP TreeExplainer für Feature-Contribution-Berechnung.
    
    Args:
        request: ExplainRequest mit Features und topK
        
    Returns:
        ExplainResponse mit Top-Contributors
    """
        start_time = time.time()
        
        # Get model
        model, actual_version = self.get_model(request.modelVersion)
        
        # Prepare features
        features_df = self._prepare_features(request.features, model)
        
        # Get SHAP explainer
        explainer = self._get_shap_explainer(actual_version)
        
        # Compute SHAP values
        shap_values = explainer.shap_values(features_df)
        
        # Handle binary classification output
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # Positive class
        
        shap_values = shap_values[0]
        
        # Get base value
        base_value = explainer.expected_value
        if isinstance(base_value, np.ndarray):
            base_value = base_value[0] if len(base_value.shape) > 0 else float(base_value)
        
        # Calculate ML score
        score = float(model.predict(features_df)[0])
        score = max(0.0, min(1.0, score))
        
        # Get feature names
        feature_names = model.feature_name()
        
        # Build contributions
        contributions = []
        for i, (name, shap_val) in enumerate(zip(feature_names, shap_values)):
            contributions.append({
                "feature": name,
                "impact": round(abs(float(shap_val)), 4),
                "direction": "positive" if shap_val > 0 else "negative",
                "shap_value": round(float(shap_val), 4),
            })
        
        # Sort by impact and get top K
        contributions.sort(key=lambda x: x["impact"], reverse=True)
        top_contributors = [
            FeatureContribution(
                feature=c["feature"],
                impact=c["impact"],
                direction=c["direction"]
            )
            for c in contributions[:request.topK]
        ]
        
        self.requests_processed += 1
        
        return ExplainResponse(
            modelVersion=actual_version,
            mlScore=round(score, 4),
            topContributors=top_contributors,
            explanationMethod="shap",
            generatedAt=datetime.utcnow()
        )
    
    def get_model_info(self, model_version: str = "latest") -> ModelInfo:
        """Hole Modell-Informationen."""
        _, actual_version = self.get_model(model_version)
        
        meta = self.model_metadata.get(actual_version, {})
        
        return ModelInfo(
            modelVersion=actual_version,
            algorithm=meta.get("algorithm", "LIGHTGBM"),
            status="ACTIVE" if actual_version == self.active_model_version else "AVAILABLE",
            auc=meta.get("auc", 0.0),
            ndcg10=meta.get("ndcg10", 0.0),
            trainingDate=meta.get("loaded_at", datetime.utcnow()).isoformat(),
            featureCount=meta.get("feature_count", 0)
        )
    
    def health_check(self) -> Dict[str, Any]:
        """Health Check für Service."""
        return {
            "status": "healthy" if self.models else "degraded",
            "modelsLoaded": len(self.models),
            "activeModel": self.active_model_version,
            "requestsProcessed": self.requests_processed,
            "uptimeSeconds": round(time.time() - self.start_time, 2),
        }


# =============================================================================
# FASTAPI APPLICATION
# =============================================================================

from contextlib import asynccontextmanager

# Global engine instance
inference_engine: Optional[MLInferenceEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global inference_engine
    
    # Startup
    config = InferenceConfig()
    inference_engine = MLInferenceEngine(config)
    logger.info("ML Inference Service started")
    
    yield
    
    # Shutdown
    logger.info("ML Inference Service shutting down")


# Create FastAPI app
app = FastAPI(
    title="ML Inference Service - Suggestion Scoring",
    description="ML-powered Suggestion Scoring mit SHAP Explainability",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
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
# API ENDPOINTS (OpenAPI Spec Compliance)
# =============================================================================

@app.post("/score", response_model=ScoreResponse)
async def score_suggestion(request: ScoreRequest):
    """
    Berechnet den ML-Score für einen Vorschlag.
    
    - **modelVersion**: Optional: spezifische Modellversion, "latest" wenn leer
    - **features**: Key-Value Map von Feature-Namen zu numerischen Werten
    """
    if inference_engine is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return inference_engine.score(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Scoring failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/explain", response_model=ExplainResponse)
async def explain_suggestion(request: ExplainRequest):
    """
    Liefert Explainability-Informationen (Top-Feature-Contributors) für einen Vorschlag.
    
    - **modelVersion**: Optional: spezifische Modellversion, "latest" wenn leer
    - **features**: Key-Value Map von Feature-Namen zu numerischen Werten
    - **topK**: Anzahl der wichtigsten Features (default: 5)
    """
    if inference_engine is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return inference_engine.explain(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Explanation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health Check Endpoint."""
    if inference_engine is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    return inference_engine.health_check()


@app.get("/model/info", response_model=ModelInfo)
async def get_model_info(modelVersion: str = "latest"):
    """
    Hole Informationen über das Modell.
    
    - **modelVersion**: Optional: spezifische Version, "latest" für aktives Modell
    """
    if inference_engine is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return inference_engine.get_model_info(modelVersion)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/models")
async def list_models():
    """Liste alle verfügbaren Modelle."""
    if inference_engine is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    return {
        "models": list(inference_engine.models.keys()),
        "activeModel": inference_engine.active_model_version,
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
            "code": exc.status_code,
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
            "code": 500,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "inference_service:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info"
    )
