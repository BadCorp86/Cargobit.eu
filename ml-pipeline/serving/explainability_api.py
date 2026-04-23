"""
CargoBit ML Explainability API
==============================

Production-ready Explainability API for ML suggestions.
Provides local explainability (Top-Feature-Contributors) for individual suggestions.

API Endpoint:
    POST /explain
    Content-Type: application/json

Author: CargoBit ML Team
Version: 1.0.0
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# =============================================================================
# EXPLAINABILITY CONFIGURATION
# =============================================================================

class ExplanationMethod(str, Enum):
    """Available explanation methods."""
    SHAP = "shap"
    INTEGRATED_GRADIENTS = "integrated_gradients"
    FEATURE_IMPORTANCE = "feature_importance"
    LIME = "lime"


@dataclass
class ExplainabilityConfig:
    """Configuration for explainability service."""
    default_method: ExplanationMethod = ExplanationMethod.SHAP
    top_n_contributors: int = 5
    min_contribution_threshold: float = 0.01
    include_feature_values: bool = True


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ExplainRequest(BaseModel):
    """
    Request schema for explainability endpoint.
    
    Example:
        {
            "modelVersion": "latest",
            "features": {
                "revenueScore": 25.7,
                "capacityUtilizationScore": 0.33,
                "priorityScore": 1.0,
                "riskScore": 0.9,
                "serviceLevelScore": 1.0,
                "co2Score": 0.8,
                "distancePickupToRouteKm": 3.2,
                "etaToPickupMinutes": 14,
                "freeVolumeM3": 6.0,
                "vehicleType": "TRUCK"
            }
        }
    """
    modelVersion: str = Field(default="latest", description="Model version to use for explanation")
    features: Dict[str, Any] = Field(..., description="Feature values for the suggestion")
    explanationMethod: Optional[str] = Field(default="shap", description="Explanation method to use")
    topN: Optional[int] = Field(default=5, description="Number of top contributors to return")


class FeatureContributor(BaseModel):
    """
    Single feature contributor to the prediction.
    
    Fields:
        - feature: Name of the feature
        - impact: Absolute impact on the score (positive or negative)
        - direction: Whether the feature increased or decreased the score
        - value: Actual feature value
        - description: Human-readable description of the feature
    """
    feature: str
    impact: float = Field(..., description="Absolute influence on score")
    direction: str = Field(..., description="'positive' = score increases, 'negative' = score decreases")
    value: Optional[float] = Field(default=None, description="Actual feature value")
    description: Optional[str] = Field(default=None, description="Human-readable feature description")


class ExplainResponse(BaseModel):
    """
    Response schema for explainability endpoint.
    
    Example:
        {
            "modelVersion": "v1.3.2",
            "mlScore": 0.82,
            "topContributors": [
                {
                    "feature": "revenueScore",
                    "impact": 0.35,
                    "direction": "positive"
                },
                {
                    "feature": "serviceLevelScore",
                    "impact": 0.22,
                    "direction": "positive"
                },
                {
                    "feature": "distancePickupToRouteKm",
                    "impact": -0.12,
                    "direction": "negative"
                }
            ],
            "explanationMethod": "shap",
            "generatedAt": "2026-04-18T19:24:30Z"
        }
    """
    modelVersion: str
    mlScore: float = Field(..., description="The pure ML score (before blend mode)")
    heuristicScore: Optional[float] = Field(default=None, description="Heuristic score for comparison")
    finalScore: Optional[float] = Field(default=None, description="Blended final score")
    topContributors: List[FeatureContributor]
    explanationMethod: str
    generatedAt: datetime
    confidence: Optional[float] = Field(default=None, description="Confidence of the explanation")
    featureImportance: Optional[Dict[str, float]] = Field(default=None, description="Full feature importance dict")


# =============================================================================
# FEATURE DESCRIPTIONS (for human-readable explanations)
# =============================================================================

FEATURE_DESCRIPTIONS = {
    # A.1 Heuristic Features
    "revenueScore": "Economic value normalized on detour - higher means better revenue per km detour",
    "capacityUtilizationScore": "Portion of capacity used after matching - higher means better vehicle utilization",
    "priorityScore": "Business priority of the order - Premium orders score highest",
    "riskScore": "Payment reliability and trust score - higher means lower risk",
    "serviceLevelScore": "SLA relevance and customer segment - critical SLAs score highest",
    "co2Score": "CO₂ efficiency from reduced empty kilometers - higher means greener route",
    "finalHeuristicScore": "Weighted combination of all heuristic components",
    
    # A.2 Context Features
    "distancePickupToRouteKm": "Detour distance to pickup location - lower is better",
    "distanceDeliveryToDestinationKm": "Detour distance to delivery destination - lower is better",
    "etaToPickupMinutes": "Estimated time to reach pickup - affects scheduling",
    "etaToDeliveryMinutes": "Estimated total time to delivery - affects SLA compliance",
    "freeVolumeM3": "Available volume on vehicle - must accommodate order",
    "freePallets": "Available pallet positions - must accommodate order",
    "freeWeightKg": "Available weight capacity - must accommodate order",
    "vehicleType": "Type of vehicle - affects capacity and route suitability",
    "tourProgressPct": "Progress through current tour - affects driver availability",
    
    # A.3 Historical Features
    "customerAcceptanceRate30d": "Customer's acceptance rate for additional orders (30 days)",
    "driverAcceptanceRate30d": "Driver's acceptance rate for suggestions (30 days)",
    "laneRealizedMarginAvg90d": "Average margin realized on this lane (90 days)",
    "customerDelayAvg30d": "Average delay at this customer's locations (30 days)",
    "driverDelayAvg30d": "Average delay for this driver (30 days)",
    "customerCancellationRate30d": "Customer's cancellation rate (30 days)",
    "historicalExecutionRate": "Global rate of executed suggestions",
    
    # Derived Features
    "combinedAcceptanceRate": "Combined customer and driver acceptance likelihood",
    "riskAdjustedRevenue": "Revenue score adjusted for customer risk",
    "distanceRatio": "Efficiency ratio of delivery to pickup distances",
    "capacityUrgency": "Urgency indicator based on tour progress and capacity",
    "timePressureScore": "Time pressure based on ETA to pickup",
}


# =============================================================================
# EXPLAINABILITY SERVICE
# =============================================================================

class ExplainabilityService:
    """
    Core Explainability Service.
    
    Provides local explainability for ML predictions using SHAP values
    or feature importance approximations.
    """
    
    def __init__(self, config: Optional[ExplainabilityConfig] = None):
        self.config = config or ExplainabilityConfig()
        
    def explain(
        self,
        features: Dict[str, Any],
        model_score: float,
        model,
        heuristic_score: Optional[float] = None,
        alpha: float = 0.8
    ) -> ExplainResponse:
        """
        Generate explanation for a single prediction.
        
        Args:
            features: Dictionary of feature values
            model_score: The ML model's prediction
            model: The trained model (LightGBM/XGBoost)
            heuristic_score: Optional heuristic score for comparison
            alpha: Blend weight for final score
            
        Returns:
            ExplainResponse with top contributors
        """
        # Compute SHAP values or feature importance
        contributors = self._compute_contributors(features, model)
        
        # Sort by absolute impact and take top N
        contributors.sort(key=lambda x: abs(x.impact), reverse=True)
        top_contributors = contributors[:self.config.top_n_contributors]
        
        # Calculate final score
        final_score = None
        if heuristic_score is not None:
            final_score = alpha * heuristic_score + (1 - alpha) * model_score
        
        # Build response
        return ExplainResponse(
            modelVersion=self._get_model_version(model),
            mlScore=round(model_score, 4),
            heuristicScore=round(heuristic_score, 4) if heuristic_score else None,
            finalScore=round(final_score, 4) if final_score else None,
            topContributors=top_contributors,
            explanationMethod=self.config.default_method.value,
            generatedAt=datetime.utcnow(),
            confidence=self._compute_confidence(contributors),
            featureImportance=self._get_feature_importance(contributors)
        )
    
    def _compute_contributors(
        self,
        features: Dict[str, Any],
        model
    ) -> List[FeatureContributor]:
        """Compute feature contributors using SHAP or feature importance."""
        
        contributors = []
        
        try:
            # Try to use SHAP if available
            import shap
            contributors = self._compute_shap_contributors(features, model)
        except ImportError:
            # Fallback to feature importance
            contributors = self._compute_importance_contributors(features, model)
        
        return contributors
    
    def _compute_shap_contributors(
        self,
        features: Dict[str, Any],
        model
    ) -> List[FeatureContributor]:
        """Compute SHAP values for explainability."""
        
        try:
            import shap
            
            # Prepare features as DataFrame
            feature_df = pd.DataFrame([features])
            
            # Create SHAP explainer
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(feature_df)[0]
            
            # Build contributors
            contributors = []
            for i, feature_name in enumerate(feature_df.columns):
                if feature_name in features:
                    shap_val = shap_values[i]
                    contributors.append(FeatureContributor(
                        feature=feature_name,
                        impact=round(float(abs(shap_val)), 4),
                        direction="positive" if shap_val > 0 else "negative",
                        value=features.get(feature_name),
                        description=FEATURE_DESCRIPTIONS.get(feature_name)
                    ))
            
            return contributors
            
        except Exception as e:
            logger.warning(f"SHAP computation failed, falling back to importance: {e}")
            return self._compute_importance_contributors(features, model)
    
    def _compute_importance_contributors(
        self,
        features: Dict[str, Any],
        model
    ) -> List[FeatureContributor]:
        """Compute contributors using feature importance as approximation."""
        
        try:
            # Get feature importance from model
            importance = model.feature_importance(importance_type="gain")
            feature_names = model.feature_name()
            
            # Normalize importance
            total_importance = sum(importance)
            if total_importance > 0:
                normalized = [i / total_importance for i in importance]
            else:
                normalized = [0] * len(importance)
            
            # Build contributors
            contributors = []
            for i, feature_name in enumerate(feature_names):
                # Map feature name (may have different casing)
                feature_key = self._find_feature_key(feature_name, features)
                
                if feature_key:
                    impact = normalized[i]
                    if impact >= self.config.min_contribution_threshold:
                        contributors.append(FeatureContributor(
                            feature=feature_name,
                            impact=round(impact, 4),
                            direction=self._determine_direction(feature_name, features.get(feature_key, 0)),
                            value=features.get(feature_key),
                            description=FEATURE_DESCRIPTIONS.get(feature_name)
                        ))
            
            return contributors
            
        except Exception as e:
            logger.error(f"Feature importance computation failed: {e}")
            return []
    
    def _find_feature_key(self, feature_name: str, features: Dict[str, Any]) -> Optional[str]:
        """Find matching feature key in features dict."""
        
        # Direct match
        if feature_name in features:
            return feature_name
        
        # Case-insensitive match
        for key in features:
            if key.lower() == feature_name.lower():
                return key
        
        # Partial match
        for key in features:
            if feature_name.lower() in key.lower() or key.lower() in feature_name.lower():
                return key
        
        return None
    
    def _determine_direction(self, feature_name: str, value: float) -> str:
        """Determine if feature has positive or negative impact on score."""
        
        # Features where higher is better
        positive_features = [
            "revenueScore", "capacityUtilizationScore", "priorityScore",
            "riskScore", "serviceLevelScore", "co2Score",
            "customerAcceptanceRate", "driverAcceptanceRate",
            "historicalExecutionRate"
        ]
        
        # Features where lower is better
        negative_features = [
            "distancePickupToRouteKm", "distanceDeliveryToDestinationKm",
            "etaToPickupMinutes", "etaToDeliveryMinutes",
            "customerDelayAvg", "driverDelayAvg",
            "customerCancellationRate"
        ]
        
        for pf in positive_features:
            if pf.lower() in feature_name.lower():
                return "positive" if value > 0.5 else "negative"
        
        for nf in negative_features:
            if nf.lower() in feature_name.lower():
                return "negative" if value > 0.5 else "positive"
        
        return "positive"
    
    def _compute_confidence(self, contributors: List[FeatureContributor]) -> float:
        """Compute confidence score for the explanation."""
        
        if not contributors:
            return 0.0
        
        # Confidence based on concentration of importance
        total_impact = sum(abs(c.impact) for c in contributors)
        if total_impact == 0:
            return 0.0
        
        top_impact = abs(contributors[0].impact) if contributors else 0
        concentration = top_impact / total_impact
        
        # Higher concentration = higher confidence
        return round(min(1.0, concentration * 1.5), 4)
    
    def _get_feature_importance(self, contributors: List[FeatureContributor]) -> Dict[str, float]:
        """Get feature importance as dictionary."""
        return {
            c.feature: c.impact 
            for c in contributors 
            if c.impact >= self.config.min_contribution_threshold
        }
    
    def _get_model_version(self, model) -> str:
        """Get model version string."""
        try:
            if hasattr(model, 'model_version'):
                return model.model_version
            return "unknown"
        except:
            return "unknown"


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def format_explanation_for_dispatcher(response: ExplainResponse) -> str:
    """
    Format explanation for dispatcher UI display.
    
    Returns a human-readable string suitable for tooltip or panel.
    """
    lines = [
        f"ML Score: {response.mlScore:.2f}",
        "",
        "Top Factors:",
    ]
    
    for i, contributor in enumerate(response.topContributors[:3], 1):
        direction_icon = "↑" if contributor.direction == "positive" else "↓"
        lines.append(
            f"  {i}. {contributor.feature}: {direction_icon} {abs(contributor.impact):.0%}"
        )
    
    if response.confidence:
        lines.append(f"\nConfidence: {response.confidence:.0%}")
    
    return "\n".join(lines)


def generate_explanation_html(response: ExplainResponse) -> str:
    """
    Generate HTML explanation for web UI.
    """
    html = f"""
    <div class="explanation-panel">
        <h3>Prediction Explanation</h3>
        <div class="score-summary">
            <span class="ml-score">ML: {response.mlScore:.2f}</span>
            {f'<span class="heuristic-score">Heuristic: {response.heuristicScore:.2f}</span>' if response.heuristicScore else ''}
            {f'<span class="final-score">Final: {response.finalScore:.2f}</span>' if response.finalScore else ''}
        </div>
        <ul class="contributors">
    """
    
    for contributor in response.topContributors:
        direction_class = "positive" if contributor.direction == "positive" else "negative"
        html += f"""
            <li class="contributor {direction_class}">
                <span class="feature-name">{contributor.feature}</span>
                <span class="impact">{contributor.direction}: {abs(contributor.impact):.0%}</span>
                {f'<span class="description">{contributor.description}</span>' if contributor.description else ''}
            </li>
        """
    
    html += """
        </ul>
    </div>
    """
    
    return html
