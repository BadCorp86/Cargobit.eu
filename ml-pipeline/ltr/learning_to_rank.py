"""
CargoBit Learning-to-Rank Model
===============================

Production-ready Learning-to-Rank (LTR) model for ranking suggestions.
Uses LambdaMART (LightGBM) for pairwise ranking optimization.

Features:
- Rank suggestions by acceptance probability
- Contextual ranking based on customer/driver/tour features
- NDCG optimization for top-N recommendations
- Real-time serving with feature store integration

Usage:
    from learning_to_rank import LTRModel
    
    model = LTRModel()
    model.train(training_data)
    
    # Rank suggestions
    ranked = model.rank(suggestions, context_features)

Author: CargoBit ML Team
Version: 3.0.0
"""

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class LTRConfig:
    """Configuration for Learning-to-Rank model."""
    
    # Model parameters
    model_type: str = "lambdarank"
    num_leaves: int = 31
    max_depth: int = 6
    learning_rate: float = 0.05
    n_estimators: int = 500
    
    # Ranking parameters
    objective: str = "lambdarank"  # lambdarank, rank_xendcg, rank_ndcg
    metric: str = "ndcg"
    eval_at: List[int] = field(default_factory=lambda: [1, 3, 5, 10])
    label_gain: List[float] = field(default_factory=lambda: [0, 1, 2, 3, 4, 5])
    
    # Training parameters
    early_stopping_rounds: int = 50
    validation_fraction: float = 0.1
    
    # Feature configuration
    feature_columns: List[str] = field(default_factory=lambda: [
        # Heuristic features
        "revenue_score", "capacity_utilization_score", "priority_score",
        "risk_score", "service_level_score", "co2_score",
        # Context features
        "distance_pickup_to_route_km", "eta_to_pickup_minutes",
        "free_volume_m3", "tour_progress_pct",
        # Historical features
        "customer_acceptance_rate_30d", "driver_acceptance_rate_30d",
        "lane_realized_margin_avg_90d",
        # Combined features
        "combined_acceptance_score", "reliability_score",
    ])
    
    # Group column for ranking (query id)
    group_column: str = "tour_id"
    
    # Label column
    label_column: str = "label"  # 0=rejected, 1=accepted, 2=accepted_high_margin
    
    # Model path
    model_path: str = "./models/ltr_model.txt"


# =============================================================================
# LABEL GENERATION
# =============================================================================

def generate_ranking_labels(
    df: pd.DataFrame,
    label_strategy: str = "acceptance_margin"
) -> pd.Series:
    """
    Generate ranking labels from suggestion outcomes.
    
    Label strategies:
    - "binary": 0=rejected, 1=accepted
    - "acceptance_margin": 0=rejected, 1=accepted_low, 2=accepted_high
    - "grade": 0-5 based on margin percentile
    
    Args:
        df: DataFrame with suggestion outcomes
        label_strategy: Strategy for label generation
    
    Returns:
        Series with ranking labels
    """
    if label_strategy == "binary":
        return df["accepted"].astype(int)
    
    elif label_strategy == "acceptance_margin":
        # 0 = rejected
        # 1 = accepted with low margin (< median)
        # 2 = accepted with high margin (>= median)
        labels = pd.Series(0, index=df.index)
        
        accepted_mask = df["accepted"] == 1
        if accepted_mask.any():
            median_margin = df.loc[accepted_mask, "actual_margin"].median()
            
            low_margin = accepted_mask & (df["actual_margin"] < median_margin)
            high_margin = accepted_mask & (df["actual_margin"] >= median_margin)
            
            labels[low_margin] = 1
            labels[high_margin] = 2
        
        return labels
    
    elif label_strategy == "grade":
        # 0 = rejected
        # 1-5 = accepted with margin in percentile buckets
        labels = pd.Series(0, index=df.index)
        
        accepted_mask = df["accepted"] == 1
        if accepted_mask.any():
            margins = df.loc[accepted_mask, "actual_margin"]
            percentiles = margins.rank(pct=True)
            
            # Grade 1: 0-20th percentile, Grade 5: 80-100th percentile
            labels[accepted_mask] = (percentiles * 5).clip(1, 5).astype(int)
        
        return labels
    
    else:
        raise ValueError(f"Unknown label strategy: {label_strategy}")


# =============================================================================
# METRICS
# =============================================================================

def dcg_at_k(relevance: List[float], k: int) -> float:
    """
    Compute Discounted Cumulative Gain at K.
    
    DCG@k = sum_{i=1}^{k} (2^{rel_i} - 1) / log2(i + 1)
    """
    relevance = np.array(relevance[:k])
    if relevance.size == 0:
        return 0.0
    
    gains = 2 ** relevance - 1
    discounts = np.log2(np.arange(1, relevance.size + 1) + 1)
    
    return np.sum(gains / discounts)


def ndcg_at_k(relevance: List[float], k: int) -> float:
    """
    Compute Normalized Discounted Cumulative Gain at K.
    
    NDCG@k = DCG@k / IDCG@k
    """
    dcg = dcg_at_k(relevance, k)
    
    # Ideal DCG: relevance sorted in descending order
    ideal_relevance = sorted(relevance, reverse=True)
    idcg = dcg_at_k(ideal_relevance, k)
    
    if idcg == 0:
        return 0.0
    
    return dcg / idcg


def mrr_at_k(rankings: List[int], k: int) -> float:
    """
    Compute Mean Reciprocal Rank at K.
    
    MRR@k = mean(1 / rank_of_first_relevant) for rank <= k
    """
    reciprocal_ranks = []
    
    for rank in rankings:
        if 1 <= rank <= k:
            reciprocal_ranks.append(1.0 / rank)
    
    if not reciprocal_ranks:
        return 0.0
    
    return np.mean(reciprocal_ranks)


# =============================================================================
# LTR MODEL
# =============================================================================

class LTRModel:
    """
    Learning-to-Rank model for suggestion ranking.
    
    Uses LightGBM LambdaMART for pairwise ranking optimization.
    Optimizes for NDCG@k to rank top suggestions per tour.
    """
    
    def __init__(self, config: Optional[LTRConfig] = None):
        self.config = config or LTRConfig()
        self.model = None
        self.feature_importance = None
        self.training_metrics = {}
        self.model_version = None
    
    def prepare_training_data(
        self,
        df: pd.DataFrame,
        label_strategy: str = "acceptance_margin"
    ) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
        """
        Prepare data for LTR training.
        
        Args:
            df: Raw suggestion data with outcomes
            label_strategy: Strategy for label generation
        
        Returns:
            Tuple of (features, labels, groups)
        """
        # Generate labels
        labels = generate_ranking_labels(df, label_strategy)
        
        # Extract features
        feature_cols = [c for c in self.config.feature_columns if c in df.columns]
        X = df[feature_cols].copy()
        
        # Fill missing values
        X = X.fillna(X.median())
        
        # Create groups (number of suggestions per tour)
        groups = df.groupby(self.config.group_column).size().values
        
        return X, labels, pd.DataFrame({"group": groups})
    
    def train(
        self,
        df: pd.DataFrame,
        label_strategy: str = "acceptance_margin",
        eval_df: Optional[pd.DataFrame] = None,
    ) -> Dict[str, float]:
        """
        Train the LTR model.
        
        Args:
            df: Training data with suggestions and outcomes
            label_strategy: Strategy for label generation
            eval_df: Optional validation data
        
        Returns:
            Dictionary with training metrics
        """
        import lightgbm as lgb
        
        logger.info("Preparing LTR training data...")
        
        # Prepare training data
        X_train, y_train, groups_train = self.prepare_training_data(df, label_strategy)
        
        # Create LightGBM dataset with groups
        train_data = lgb.Dataset(
            X_train,
            label=y_train,
            group=groups_train["group"].values,
            feature_name=list(X_train.columns),
        )
        
        # Validation data
        valid_data = None
        if eval_df is not None:
            X_valid, y_valid, groups_valid = self.prepare_training_data(eval_df, label_strategy)
            valid_data = lgb.Dataset(
                X_valid,
                label=y_valid,
                group=groups_valid["group"].values,
                reference=train_data,
            )
        
        # Model parameters
        params = {
            "objective": self.config.objective,
            "metric": self.config.metric,
            "eval_at": self.config.eval_at,
            "label_gain": self.config.label_gain,
            "num_leaves": self.config.num_leaves,
            "max_depth": self.config.max_depth,
            "learning_rate": self.config.learning_rate,
            "feature_fraction": 0.8,
            "bagging_fraction": 0.8,
            "bagging_freq": 5,
            "verbose": -1,
            "n_jobs": -1,
        }
        
        logger.info("Training LTR model...")
        
        # Train model
        callbacks = [lgb.log_evaluation(period=50)]
        if valid_data:
            callbacks.append(lgb.early_stopping(self.config.early_stopping_rounds))
        
        self.model = lgb.train(
            params,
            train_data,
            num_boost_round=self.config.n_estimators,
            valid_sets=[train_data, valid_data] if valid_data else [train_data],
            valid_names=["train", "valid"] if valid_data else ["train"],
            callbacks=callbacks,
        )
        
        # Store feature importance
        self.feature_importance = pd.DataFrame({
            "feature": X_train.columns,
            "importance": self.model.feature_importance(importance_type="gain"),
        }).sort_values("importance", ascending=False)
        
        # Compute training metrics
        self.training_metrics = {
            "best_iteration": self.model.best_iteration,
            "num_features": len(X_train.columns),
            "training_samples": len(X_train),
            "num_groups": len(groups_train),
        }
        
        # Compute NDCG on training set
        train_scores = self.model.predict(X_train)
        self.training_metrics["train_ndcg"] = self._compute_ndcg(
            train_scores, y_train, groups_train["group"].values
        )
        
        # Model version
        self.model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        logger.info(f"Training complete. NDCG@10: {self.training_metrics['train_ndcg']:.4f}")
        
        return self.training_metrics
    
    def _compute_ndcg(
        self,
        scores: np.ndarray,
        labels: pd.Series,
        groups: np.ndarray,
        k: int = 10
    ) -> float:
        """Compute NDCG@k across all groups."""
        ndcg_scores = []
        start_idx = 0
        
        for group_size in groups:
            end_idx = start_idx + group_size
            
            group_scores = scores[start_idx:end_idx]
            group_labels = labels.iloc[start_idx:end_idx].values
            
            # Rank by predicted scores (descending)
            ranked_indices = np.argsort(-group_scores)
            ranked_labels = group_labels[ranked_indices]
            
            ndcg = ndcg_at_k(ranked_labels.tolist(), k)
            ndcg_scores.append(ndcg)
            
            start_idx = end_idx
        
        return np.mean(ndcg_scores)
    
    def rank(
        self,
        suggestions: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
        top_n: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Rank suggestions and return top N.
        
        Args:
            suggestions: List of suggestion dictionaries with features
            context: Optional context features to add
            top_n: Number of top suggestions to return
        
        Returns:
            List of ranked suggestions with scores
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        # Convert to DataFrame
        df = pd.DataFrame(suggestions)
        
        # Add context features if provided
        if context:
            for key, value in context.items():
                df[key] = value
        
        # Ensure all features are present
        for col in self.config.feature_columns:
            if col not in df.columns:
                df[col] = 0.0
        
        # Extract features in correct order
        X = df[self.config.feature_columns].fillna(0)
        
        # Predict scores
        scores = self.model.predict(X)
        
        # Add scores to suggestions
        for i, suggestion in enumerate(suggestions):
            suggestion["ltr_score"] = float(scores[i])
        
        # Sort by score and return top N
        ranked = sorted(suggestions, key=lambda x: x["ltr_score"], reverse=True)
        
        # Add rank position
        for i, suggestion in enumerate(ranked[:top_n]):
            suggestion["rank_position"] = i + 1
        
        return ranked[:top_n]
    
    def get_feature_importance(self, top_k: int = 10) -> pd.DataFrame:
        """Get top K most important features."""
        if self.feature_importance is None:
            raise ValueError("Model not trained. Call train() first.")
        return self.feature_importance.head(top_k)
    
    def save(self, path: Optional[str] = None):
        """Save model to file."""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        path = path or self.config.model_path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        self.model.save_model(path)
        
        # Save metadata
        metadata = {
            "model_version": self.model_version,
            "config": self.config.__dict__,
            "training_metrics": self.training_metrics,
            "feature_columns": self.config.feature_columns,
        }
        
        metadata_path = path.replace(".txt", "_metadata.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Model saved to {path}")
    
    def load(self, path: Optional[str] = None):
        """Load model from file."""
        import lightgbm as lgb
        
        path = path or self.config.model_path
        
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
        
        self.model = lgb.Booster(model_file=path)
        
        # Load metadata
        metadata_path = path.replace(".txt", "_metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
            self.model_version = metadata.get("model_version")
            self.training_metrics = metadata.get("training_metrics", {})
        
        logger.info(f"Model loaded from {path}")


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "LTRConfig",
    "LTRModel",
    "generate_ranking_labels",
    "dcg_at_k",
    "ndcg_at_k",
    "mrr_at_k",
]
