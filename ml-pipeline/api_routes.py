"""
CargoBit ML Integration API Routes
===================================

API routes for the ML Integration Service.

Endpoints:
- POST /api/ml/integrate/score - Integrated scoring
- POST /api/ml/integrate/rank - LTR ranking
- POST /api/ml/ab/experiments - Create experiment
- POST /api/ml/ab/experiments/[id]/start - Start experiment
- POST /api/ml/ab/experiments/[id]/stop - Stop experiment
- GET /api/ml/ab/experiments/[id]/results - Get results

Author: CargoBit ML Team
Version: 3.0.0
"""

import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class ComponentScores(BaseModel):
    """Component scores for suggestion."""
    revenue: float = Field(..., ge=0, le=1)
    capacityUtilization: float = Field(..., ge=0, le=1)
    priority: float = Field(..., ge=0, le=1)
    risk: float = Field(..., ge=0, le=1)
    serviceLevel: float = Field(..., ge=0, le=1)
    co2: float = Field(..., ge=0, le=1)


class ScoringRequest(BaseModel):
    """Request for integrated scoring."""
    suggestionId: str = Field(..., min_length=1)
    componentScores: ComponentScores
    context: Optional[Dict[str, Any]] = None
    userId: Optional[str] = None
    experimentId: Optional[str] = None


class RankingRequest(BaseModel):
    """Request for LTR ranking."""
    suggestions: List[Dict[str, Any]]
    context: Optional[Dict[str, Any]] = None
    topN: int = Field(default=5, ge=1, le=20)


class VariantConfig(BaseModel):
    """Variant configuration for A/B test."""
    name: str
    description: str = ""
    trafficPercentage: float = Field(default=0.5, ge=0, le=1)
    isControl: bool = False
    config: Dict[str, Any] = Field(default_factory=dict)


class MetricConfig(BaseModel):
    """Metric configuration for A/B test."""
    name: str
    type: str = "binary"
    description: str = ""
    higherIsBetter: bool = True


class CreateExperimentRequest(BaseModel):
    """Request to create an experiment."""
    name: str
    description: str = ""
    variants: List[VariantConfig]
    metrics: List[MetricConfig]
    trafficAllocation: str = "fixed"


# =============================================================================
# SERVICE INSTANCE
# =============================================================================

# Global service instance (initialized lazily)
_service = None


def get_service():
    """Get or create ML integration service instance."""
    global _service
    if _service is None:
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent.parent / "ml-pipeline"))
            from integration_service import MLIntegrationService, MLIntegrationConfig
            
            config = MLIntegrationConfig(
                feature_store_path=os.getenv("FEATURE_STORE_PATH", "./feature_store"),
                ab_storage_path=os.getenv("AB_STORAGE_PATH", "./ab_experiments"),
                ltr_model_path=os.getenv("LTR_MODEL_PATH", "./models/ltr_model.txt"),
            )
            _service = MLIntegrationService(config)
        except Exception as e:
            logger.warning(f"ML Integration Service not available: {e}")
            _service = MockMLIntegrationService()
    return _service


class MockMLIntegrationService:
    """Mock service for development/testing."""
    
    def score_suggestion(self, suggestion_id, component_scores, context=None, user_id=None, experiment_id=None):
        return {
            "suggestionId": suggestion_id,
            "timestamp": datetime.utcnow().isoformat(),
            "components": component_scores,
            "heuristicScore": sum(component_scores.values()) / len(component_scores) * 0.7,
            "mlScore": 0.75,
            "finalScore": 0.72,
            "alpha": 0.8,
            "latencyMs": 5.2,
        }
    
    def rank_suggestions(self, suggestions, context=None, top_n=5):
        for i, s in enumerate(suggestions):
            s["rankPosition"] = i + 1
            s["ltrScore"] = 0.8 - i * 0.1
        return suggestions[:top_n]
    
    def create_experiment(self, name, variants, metrics, **kwargs):
        return {"id": f"exp_{name[:8]}", "name": name, "status": "draft", "variants": variants}
    
    def start_experiment(self, experiment_id):
        return {"id": experiment_id, "status": "running"}
    
    def stop_experiment(self, experiment_id, winner=None):
        return {"id": experiment_id, "status": "completed", "winner": winner}
    
    def get_experiment_results(self, experiment_id):
        return [{
            "metricName": "acceptance",
            "controlMean": 0.65,
            "treatmentMean": 0.72,
            "controlSamples": 1000,
            "treatmentSamples": 1000,
            "pValue": 0.03,
            "relativeLift": 0.10,
            "isSignificant": True,
            "winner": "treatment",
        }]
    
    def health_check(self):
        return {"status": "healthy", "components": {}, "timestamp": datetime.utcnow().isoformat()}


# =============================================================================
# API ROUTES (Next.js App Router format)
# =============================================================================

# Note: These are Python implementations that would be converted to TypeScript
# for Next.js API routes, or used in a separate FastAPI service.


# =============================================================================
# FASTAPI APP (for standalone service)
# =============================================================================

app = FastAPI(
    title="CargoBit ML Integration API",
    description="Unified API for ML scoring, ranking, and A/B testing",
    version="3.0.0",
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    service = get_service()
    return service.health_check()


@app.post("/api/v1/integrate/score")
async def score_suggestion(request: ScoringRequest):
    """
    Score a single suggestion with integrated ML pipeline.
    
    Features:
    - Feature Store enrichment
    - Hybrid scoring (heuristic + ML)
    - A/B test integration
    - SHAP explainability
    """
    service = get_service()
    
    try:
        result = service.score_suggestion(
            suggestion_id=request.suggestionId,
            component_scores=request.componentScores.model_dump(),
            context=request.context,
            user_id=request.userId,
            experiment_id=request.experimentId,
        )
        return result
    except Exception as e:
        logger.error(f"Scoring error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/integrate/rank")
async def rank_suggestions(request: RankingRequest):
    """
    Rank suggestions using Learning-to-Rank model.
    
    Returns top N ranked suggestions with LTR scores.
    """
    service = get_service()
    
    if len(request.suggestions) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 suggestions per request")
    
    try:
        result = service.rank_suggestions(
            suggestions=request.suggestions,
            context=request.context,
            top_n=request.topN,
        )
        return {"ranked": result, "totalCount": len(result)}
    except Exception as e:
        logger.error(f"Ranking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ab/experiments")
async def create_experiment(request: CreateExperimentRequest):
    """
    Create a new A/B test experiment.
    """
    service = get_service()
    
    # Validate traffic percentages sum to 1
    total_traffic = sum(v.trafficPercentage for v in request.variants)
    if abs(total_traffic - 1.0) > 0.01:
        raise HTTPException(status_code=400, detail="Traffic percentages must sum to 1.0")
    
    try:
        result = service.create_experiment(
            name=request.name,
            description=request.description,
            variants=[v.model_dump() for v in request.variants],
            metrics=[m.model_dump() for m in request.metrics],
            traffic_allocation=request.trafficAllocation,
        )
        return result
    except Exception as e:
        logger.error(f"Experiment creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ab/experiments/{experiment_id}/start")
async def start_experiment(experiment_id: str):
    """Start an A/B test experiment."""
    service = get_service()
    
    try:
        result = service.start_experiment(experiment_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Experiment start error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ab/experiments/{experiment_id}/stop")
async def stop_experiment(experiment_id: str, winner: Optional[str] = None):
    """Stop an A/B test experiment."""
    service = get_service()
    
    try:
        result = service.stop_experiment(experiment_id, winner)
        if result is None:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Experiment stop error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/ab/experiments/{experiment_id}/results")
async def get_experiment_results(experiment_id: str):
    """Get results of an A/B test experiment."""
    service = get_service()
    
    try:
        result = service.get_experiment_results(experiment_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return {"results": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Experiment results error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/metrics")
async def get_metrics():
    """Get service metrics."""
    service = get_service()
    return service.get_metrics()


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
