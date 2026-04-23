"""
CargoBit ML Integration Service
================================

Unified service that integrates all ML components:
- Feature Store (Feast)
- Learning-to-Rank (LTR)
- SHAP Explainability
- A/B Testing Framework

Provides a single entry point for ML-powered suggestion scoring.

Author: CargoBit ML Team
Version: 3.0.0
"""

import logging
import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class MLIntegrationConfig:
    """Configuration for ML Integration Service."""
    
    # Feature Store
    feature_store_enabled: bool = True
    feature_store_path: str = "./feature_store"
    
    # Hybrid Scoring
    alpha: float = 0.8  # Weight for heuristic
    fallback_to_heuristic: bool = True
    
    # A/B Testing
    ab_testing_enabled: bool = True
    ab_storage_path: str = "./ab_experiments"
    
    # LTR
    ltr_enabled: bool = True
    ltr_model_path: str = "./models/ltr_model.txt"
    
    # SHAP
    shap_enabled: bool = True
    
    # Caching
    cache_enabled: bool = True
    cache_ttl_seconds: int = 300


# =============================================================================
# INTEGRATION SERVICE
# =============================================================================

class MLIntegrationService:
    """
    Unified ML Integration Service.
    
    Combines all ML components into a single service:
    - Feature Store for real-time feature retrieval
    - Hybrid Scoring (Heuristic + ML)
    - Learning-to-Rank for suggestion ranking
    - SHAP for explainability
    - A/B Testing for experiments
    """
    
    def __init__(self, config: Optional[MLIntegrationConfig] = None):
        self.config = config or MLIntegrationConfig()
        
        # Initialize components
        self._feature_store = None
        self._ab_framework = None
        self._ltr_model = None
        self._scorer = None
        
        # Metrics
        self._metrics = {
            "requests_total": 0,
            "feature_store_hits": 0,
            "feature_store_misses": 0,
            "ab_tests_total": 0,
            "ltr_rankings_total": 0,
            "latency_sum_ms": 0.0,
            "errors_total": 0,
        }
        
        # Cache
        self._cache: Dict[str, Tuple[Any, float]] = {}
        
        # Initialize components
        self._initialize_components()
    
    def _initialize_components(self):
        """Initialize all ML components."""
        
        # Feature Store
        if self.config.feature_store_enabled:
            try:
                from feature_store.feature_store_client import FeatureStoreClient, FeatureStoreConfig
                fs_config = FeatureStoreConfig(repo_path=self.config.feature_store_path)
                self._feature_store = FeatureStoreClient(fs_config)
                logger.info("Feature Store initialized")
            except Exception as e:
                logger.warning(f"Feature Store not available: {e}")
        
        # A/B Testing
        if self.config.ab_testing_enabled:
            try:
                from ab_testing.ab_testing_framework import ABTestingFramework
                self._ab_framework = ABTestingFramework(storage_path=self.config.ab_storage_path)
                logger.info("A/B Testing Framework initialized")
            except Exception as e:
                logger.warning(f"A/B Testing not available: {e}")
        
        # LTR Model
        if self.config.ltr_enabled:
            try:
                from ltr.learning_to_rank import LTRModel, LTRConfig
                ltr_config = LTRConfig(model_path=self.config.ltr_model_path)
                self._ltr_model = LTRModel(ltr_config)
                if os.path.exists(self.config.ltr_model_path):
                    self._ltr_model.load()
                logger.info("LTR Model initialized")
            except Exception as e:
                logger.warning(f"LTR Model not available: {e}")
    
    # =========================================================================
    # SCORING
    # =========================================================================
    
    def score_suggestion(
        self,
        suggestion_id: str,
        component_scores: Dict[str, float],
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        experiment_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Score a single suggestion with all ML components.
        
        Args:
            suggestion_id: Unique suggestion identifier
            component_scores: Heuristic component scores
            context: Additional context (customer_id, driver_id, tour_id, etc.)
            user_id: User ID for A/B testing
            experiment_id: A/B test experiment ID
        
        Returns:
            Dictionary with scores, explanations, and metadata
        """
        start_time = time.time()
        self._metrics["requests_total"] += 1
        
        result = {
            "suggestionId": suggestion_id,
            "timestamp": datetime.utcnow().isoformat(),
            "components": component_scores,
        }
        
        try:
            # 1. Get A/B test variant
            variant = None
            if experiment_id and user_id and self._ab_framework:
                variant = self._ab_framework.get_variant(experiment_id, user_id)
                result["abTest"] = {
                    "experimentId": experiment_id,
                    "variant": variant,
                }
                self._metrics["ab_tests_total"] += 1
            
            # 2. Enrich with Feature Store features
            enriched_features = {}
            if self._feature_store and context:
                enriched_features = self._get_enriched_features(context)
                result["enrichedFeatures"] = enriched_features
                self._metrics["feature_store_hits"] += 1
            else:
                self._metrics["feature_store_misses"] += 1
            
            # 3. Compute heuristic score
            heuristic_score = self._compute_heuristic_score(component_scores)
            result["heuristicScore"] = round(heuristic_score, 4)
            
            # 4. Compute ML score (if available)
            ml_score = None
            if enriched_features and self._scorer:
                ml_score = self._compute_ml_score(enriched_features)
                if ml_score is not None:
                    result["mlScore"] = round(ml_score, 4)
            
            # 5. Apply A/B test variant config
            alpha = self.config.alpha
            if variant and self._ab_framework:
                # Get variant-specific config
                experiment = self._ab_framework.experiments.get(experiment_id)
                if experiment:
                    variant_config = next(
                        (v.config for v in experiment.config.variants if v.name == variant),
                        {}
                    )
                    alpha = variant_config.get("alpha", alpha)
            
            result["alpha"] = alpha
            
            # 6. Compute final hybrid score
            if ml_score is not None:
                final_score = alpha * heuristic_score + (1 - alpha) * ml_score
            else:
                final_score = heuristic_score
            
            result["finalScore"] = round(final_score, 4)
            
            # 7. Generate SHAP explanation
            if self.config.shap_enabled:
                shap_explanation = self._generate_shap_explanation(
                    component_scores, enriched_features, heuristic_score, ml_score, final_score
                )
                result["shapExplanation"] = shap_explanation
            
            # 8. Track A/B test event
            if experiment_id and user_id and self._ab_framework:
                self._ab_framework.track_event(
                    experiment_id, user_id, "score_computed",
                    value=final_score, variant=variant
                )
            
        except Exception as e:
            self._metrics["errors_total"] += 1
            logger.error(f"Scoring error: {e}")
            result["error"] = str(e)
            
            # Fallback to heuristic
            if self.config.fallback_to_heuristic:
                result["finalScore"] = round(
                    self._compute_heuristic_score(component_scores), 4
                )
                result["fallback"] = True
        
        # Update latency metrics
        latency_ms = (time.time() - start_time) * 1000
        self._metrics["latency_sum_ms"] += latency_ms
        result["latencyMs"] = round(latency_ms, 2)
        
        return result
    
    def _get_enriched_features(self, context: Dict[str, Any]) -> Dict[str, float]:
        """Get enriched features from Feature Store."""
        if not self._feature_store:
            return {}
        
        features = {}
        
        try:
            # Get customer features
            if "customer_id" in context:
                customer_features = self._feature_store.get_online_features(
                    entity_rows=[{"customer_id": context["customer_id"]}],
                    feature_service="customer_features"
                )
                if len(customer_features) > 0:
                    for col in customer_features.columns:
                        if col != "customer_id":
                            features[f"customer_{col}"] = customer_features.iloc[0][col]
            
            # Get driver features
            if "driver_id" in context:
                driver_features = self._feature_store.get_online_features(
                    entity_rows=[{"driver_id": context["driver_id"]}],
                    feature_service="driver_features"
                )
                if len(driver_features) > 0:
                    for col in driver_features.columns:
                        if col != "driver_id":
                            features[f"driver_{col}"] = driver_features.iloc[0][col]
        
        except Exception as e:
            logger.warning(f"Feature Store error: {e}")
        
        return features
    
    def _compute_heuristic_score(self, component_scores: Dict[str, float]) -> float:
        """Compute weighted heuristic score."""
        weights = {
            "revenue": 0.35,
            "capacityUtilization": 0.20,
            "priority": 0.10,
            "risk": 0.10,
            "serviceLevel": 0.15,
            "co2": 0.10,
        }
        
        score = 0.0
        for component, weight in weights.items():
            score += weight * component_scores.get(component, 0.5)
        
        return score
    
    def _compute_ml_score(self, features: Dict[str, float]) -> Optional[float]:
        """Compute ML score using trained model."""
        # This would use the actual trained model
        # For now, return None to use heuristic fallback
        return None
    
    def _generate_shap_explanation(
        self,
        component_scores: Dict[str, float],
        enriched_features: Dict[str, float],
        heuristic_score: float,
        ml_score: Optional[float],
        final_score: float,
    ) -> Dict[str, Any]:
        """Generate SHAP explanation for the prediction."""
        
        # Build feature contributions
        features = []
        
        # Component contributions
        component_weights = {
            "revenue": (0.35, "revenueScore"),
            "capacityUtilization": (0.20, "capacityUtilizationScore"),
            "priority": (0.10, "priorityScore"),
            "risk": (0.10, "riskScore"),
            "serviceLevel": (0.15, "serviceLevelScore"),
            "co2": (0.10, "co2Score"),
        }
        
        for component, (weight, feature_name) in component_weights.items():
            value = component_scores.get(component, 0.5)
            # SHAP value approximation: contribution relative to base value
            shap_value = weight * (value - 0.5)  # 0.5 is the neutral/base value
            features.append({
                "name": feature_name,
                "value": value,
                "shapValue": round(shap_value, 4),
            })
        
        # Add enriched features if available
        for feature_name, value in enriched_features.items():
            if isinstance(value, (int, float)):
                # Approximate SHAP contribution
                shap_value = 0.02 * (value - 0.5) if value <= 1 else 0.01 * (value / 100)
                features.append({
                    "name": feature_name,
                    "value": value,
                    "shapValue": round(shap_value, 4),
                })
        
        # Sort by absolute SHAP value
        features.sort(key=lambda x: abs(x["shapValue"]), reverse=True)
        
        return {
            "baseValue": 0.5,
            "outputValue": final_score,
            "features": features[:10],  # Top 10 features
            "modelVersion": "3.0.0",
        }
    
    # =========================================================================
    # RANKING (LTR)
    # =========================================================================
    
    def rank_suggestions(
        self,
        suggestions: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
        top_n: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Rank suggestions using LTR model.
        
        Args:
            suggestions: List of suggestions with features
            context: Optional context features
            top_n: Number of top suggestions to return
        
        Returns:
            List of ranked suggestions with LTR scores
        """
        self._metrics["ltr_rankings_total"] += 1
        
        if self._ltr_model and self._ltr_model.model:
            return self._ltr_model.rank(suggestions, context, top_n)
        
        # Fallback: sort by heuristic score
        for suggestion in suggestions:
            if "finalScore" not in suggestion:
                suggestion["finalScore"] = self._compute_heuristic_score(
                    suggestion.get("componentScores", {})
                )
        
        ranked = sorted(suggestions, key=lambda x: x.get("finalScore", 0), reverse=True)
        
        for i, suggestion in enumerate(ranked[:top_n]):
            suggestion["rankPosition"] = i + 1
            suggestion["ltrScore"] = suggestion.get("finalScore", 0)
        
        return ranked[:top_n]
    
    # =========================================================================
    # A/B TESTING
    # =========================================================================
    
    def create_experiment(
        self,
        name: str,
        variants: List[Dict[str, Any]],
        metrics: List[Dict[str, Any]],
        **kwargs,
    ) -> Optional[Dict[str, Any]]:
        """Create a new A/B test experiment."""
        if not self._ab_framework:
            return None
        
        experiment = self._ab_framework.create_experiment(
            name=name,
            variants=variants,
            metrics=metrics,
            **kwargs,
        )
        
        return {
            "id": experiment.id,
            "name": experiment.name,
            "status": experiment.status.value,
            "variants": [{"name": v.name, "traffic_percentage": v.traffic_percentage} for v in experiment.config.variants],
        }
    
    def start_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Start an A/B test experiment."""
        if not self._ab_framework:
            return None
        
        experiment = self._ab_framework.start_experiment(experiment_id)
        return {"id": experiment.id, "status": experiment.status.value}
    
    def stop_experiment(self, experiment_id: str, winner: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Stop an A/B test experiment."""
        if not self._ab_framework:
            return None
        
        experiment = self._ab_framework.stop_experiment(experiment_id, winner)
        return {"id": experiment.id, "status": experiment.status.value, "winner": experiment.winner}
    
    def get_experiment_results(self, experiment_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get results of an A/B test experiment."""
        if not self._ab_framework:
            return None
        
        results = self._ab_framework.analyze_experiment(experiment_id)
        
        return [
            {
                "metricName": r.metric_name,
                "controlMean": r.control_mean,
                "treatmentMean": r.treatment_mean,
                "controlSamples": r.control_samples,
                "treatmentSamples": r.treatment_samples,
                "pValue": r.p_value,
                "relativeLift": r.relative_lift,
                "isSignificant": r.is_significant,
                "winner": r.winner,
            }
            for r in results
        ]
    
    # =========================================================================
    # METRICS
    # =========================================================================
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get service metrics."""
        metrics = self._metrics.copy()
        
        if metrics["requests_total"] > 0:
            metrics["avg_latency_ms"] = metrics["latency_sum_ms"] / metrics["requests_total"]
            metrics["feature_store_hit_rate"] = (
                metrics["feature_store_hits"] / metrics["requests_total"]
            )
        else:
            metrics["avg_latency_ms"] = 0
            metrics["feature_store_hit_rate"] = 0
        
        return metrics
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check."""
        return {
            "status": "healthy",
            "components": {
                "featureStore": self._feature_store is not None,
                "abTesting": self._ab_framework is not None,
                "ltr": self._ltr_model is not None and self._ltr_model.model is not None,
            },
            "metrics": self.get_metrics(),
            "timestamp": datetime.utcnow().isoformat(),
        }


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "MLIntegrationConfig",
    "MLIntegrationService",
]
