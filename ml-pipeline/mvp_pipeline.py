"""
CargoBit MVP ML Pipeline - Iteration 1
======================================

Production-ready ML Pipeline für Binary Classifier (Acceptance Prediction).
Follows the MVP specification with 5 steps:
1. ETL - Events → Data Lake (Parquet)
2. Training - LightGBM Binary Classifier
3. Deployment - Model export and serving
4. Online-Scoring - Hybrid scoring (Heuristic + ML)
5. Monitoring - Grafana dashboards and alerts

Author: CargoBit ML Team
Version: 2.0.0
"""

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from pydantic import BaseModel, Field, validator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

class MVPScope(str, Enum):
    """MVP Scope Definition"""
    IN_SCOPE = "in_scope"
    NOT_IN_SCOPE = "not_in_scope"


@dataclass
class MVPConfig:
    """MVP Pipeline Configuration"""
    
    # === Scope Definition ===
    in_scope: List[str] = field(default_factory=lambda: [
        "events_collecting",           # suggestion.generated, decision.made, outcome
        "simple_training_dataset",      # Join events, Heuristic + Context features
        "binary_classifier",            # LightGBM for P(ACCEPT)
        "model_deployment",             # REST service or local artifact
        "blend_mode_scoring",           # 0.8 * heuristic + 0.2 * ml
        "basic_monitoring",             # Acceptance rate, margin, score distribution
    ])
    
    not_in_scope: List[str] = field(default_factory=lambda: [
        "feature_store",                # Iteration 2
        "learning_to_rank",             # Iteration 3
        "shap_explainability",          # Iteration 2
        "online_features",              # Iteration 2
        "ab_experiments",               # Iteration 3
        "auto_retraining",              # Iteration 3
    ])
    
    # === Data Paths ===
    raw_events_path: str = "s3://cargobit-ml-data/raw_events/"
    training_data_path: str = "s3://cargobit-ml-training/acceptance_v1/"
    model_artifact_path: str = "s3://cargobit-ml-models/acceptance_v1/"
    
    # === Model Config ===
    model_type: str = "lightgbm"
    target_column: str = "accepted"
    positive_class: str = "ACCEPTED"
    negative_classes: List[str] = field(default_factory=lambda: ["REJECTED", "IGNORED", "TIMEOUT"])
    
    # === Blend Mode ===
    alpha: float = 0.8  # Weight for heuristic score
    # final_score = alpha * heuristic + (1 - alpha) * ml_score
    
    # === Training Config ===
    train_test_split: float = 0.2
    validation_split: float = 0.1
    random_state: int = 42
    
    # === LightGBM Parameters ===
    lgbm_params: Dict[str, Any] = field(default_factory=lambda: {
        "objective": "binary",
        "metric": ["auc", "binary_logloss"],
        "boosting_type": "gbdt",
        "num_leaves": 31,
        "max_depth": 6,
        "learning_rate": 0.05,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "min_child_samples": 20,
        "reg_alpha": 0.1,
        "reg_lambda": 0.1,
        "verbose": -1,
        "n_jobs": -1,
    })
    
    num_boost_round: int = 1000
    early_stopping_rounds: int = 50
    
    # === Features (MVP Scope) ===
    heuristic_features: List[str] = field(default_factory=lambda: [
        "revenueScore",
        "capacityUtilizationScore",
        "priorityScore",
        "riskScore",
        "serviceLevelScore",
        "co2Score",
        "finalHeuristicScore",
    ])
    
    context_features: List[str] = field(default_factory=lambda: [
        "distancePickupToRouteKm",
        "distanceDeliveryToDestinationKm",
        "etaToPickupMinutes",
        "etaToDeliveryMinutes",
        "freeVolumeM3",
        "freePallets",
        "freeWeightKg",
        "vehicleType",  # One-hot encoded
        "tourProgressPct",
    ])
    
    @property
    def all_features(self) -> List[str]:
        """All MVP features (16 + vehicleType one-hot)"""
        features = self.heuristic_features + self.context_features
        return features


# =============================================================================
# STEP 1: ETL
# =============================================================================

class ETLPipeline:
    """
    Step 1: ETL Pipeline
    
    Events → Data Lake (Parquet)
    Daily batch job builds training dataset
    """
    
    def __init__(self, config: MVPConfig):
        self.config = config
        self.events_schema = pa.schema([
            ("suggestion_id", pa.string()),
            ("event_timestamp", pa.timestamp("us")),
            ("event_date", pa.date32()),
            ("event_type", pa.string()),
            # Heuristic Features
            ("revenueScore", pa.float32()),
            ("capacityUtilizationScore", pa.float32()),
            ("priorityScore", pa.float32()),
            ("riskScore", pa.float32()),
            ("serviceLevelScore", pa.float32()),
            ("co2Score", pa.float32()),
            ("finalHeuristicScore", pa.float32()),
            # Context Features
            ("distancePickupToRouteKm", pa.float32()),
            ("distanceDeliveryToDestinationKm", pa.float32()),
            ("etaToPickupMinutes", pa.float32()),
            ("etaToDeliveryMinutes", pa.float32()),
            ("freeVolumeM3", pa.float32()),
            ("freePallets", pa.int32()),
            ("freeWeightKg", pa.float32()),
            ("vehicleType", pa.string()),
            ("tourProgressPct", pa.float32()),
            # Entity IDs
            ("customer_id", pa.string()),
            ("driver_id", pa.string()),
            ("tour_id", pa.string()),
            ("order_id", pa.string()),
            ("lane_id", pa.string()),
            # Decision & Outcome
            ("decision", pa.string()),
            ("decision_at", pa.timestamp("us")),
            ("execution_status", pa.string()),
            ("actual_margin", pa.float32()),
        ])
    
    def process_suggestion_generated(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Process suggestion.generated event"""
        return {
            "suggestion_id": event["suggestionId"],
            "event_timestamp": event["generatedAt"],
            "event_date": event["generatedAt"][:10],  # YYYY-MM-DD
            "event_type": "GENERATED",
            # Extract features from event
            **{k: event.get(k) for k in self.config.all_features if k in event},
            # Entity IDs
            "customer_id": event.get("customerId"),
            "driver_id": event.get("driverId"),
            "tour_id": event.get("tourId"),
            "order_id": event.get("orderId"),
            "lane_id": event.get("laneId"),
        }
    
    def process_suggestion_decision(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Process suggestion.decision.made event"""
        return {
            "suggestion_id": event["suggestionId"],
            "event_type": "DECISION",
            "decision": event["decision"],
            "decision_at": event["decisionAt"],
        }
    
    def process_suggestion_outcome(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Process suggestion.outcome event"""
        return {
            "suggestion_id": event["suggestionId"],
            "event_type": "OUTCOME",
            "execution_status": event["executionStatus"],
            "actual_margin": event.get("actualMargin"),
        }
    
    def build_training_dataset(
        self,
        start_date: datetime,
        end_date: datetime,
        output_path: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Build training dataset by joining events on suggestionId.
        
        Steps:
        1. Load suggestion.generated events (features)
        2. Join with suggestion.decision.made (label)
        3. Optionally join with suggestion.outcome (margin)
        4. Create binary label: accepted (0/1)
        5. Save as Parquet
        """
        logger.info(f"Building training dataset from {start_date} to {end_date}")
        
        # Simulated data loading (in production, load from S3/Kafka)
        # Here we create a synthetic dataset for demonstration
        
        np.random.seed(self.config.random_state)
        n_samples = 10000
        
        # Generate synthetic features
        data = {
            "suggestion_id": [f"sg_{i:06d}" for i in range(n_samples)],
            "event_timestamp": pd.date_range(start_date, periods=n_samples, freq="H"),
        }
        
        # Heuristic features (correlated with acceptance)
        data["revenueScore"] = np.clip(np.random.normal(0.5, 0.2, n_samples), 0, 1)
        data["capacityUtilizationScore"] = np.clip(np.random.normal(0.6, 0.15, n_samples), 0, 1)
        data["priorityScore"] = np.random.choice([0.2, 0.5, 0.8, 1.0], n_samples, p=[0.1, 0.5, 0.3, 0.1])
        data["riskScore"] = np.clip(np.random.normal(0.7, 0.2, n_samples), 0, 1)
        data["serviceLevelScore"] = np.random.choice([0.3, 0.7, 1.0], n_samples, p=[0.6, 0.3, 0.1])
        data["co2Score"] = np.clip(np.random.normal(0.5, 0.2, n_samples), 0, 1)
        
        # Final heuristic score (weighted combination)
        data["finalHeuristicScore"] = (
            0.35 * data["revenueScore"] +
            0.20 * data["capacityUtilizationScore"] +
            0.10 * data["priorityScore"] +
            0.10 * data["riskScore"] +
            0.15 * data["serviceLevelScore"] +
            0.10 * data["co2Score"]
        )
        
        # Context features
        data["distancePickupToRouteKm"] = np.clip(np.random.exponential(5, n_samples), 0, 50)
        data["distanceDeliveryToDestinationKm"] = np.clip(np.random.exponential(8, n_samples), 0, 50)
        data["etaToPickupMinutes"] = np.clip(np.random.exponential(30, n_samples), 0, 180)
        data["etaToDeliveryMinutes"] = data["etaToPickupMinutes"] + np.random.exponential(60, n_samples)
        data["freeVolumeM3"] = np.clip(np.random.normal(20, 10, n_samples), 0, 100)
        data["freePallets"] = np.random.randint(0, 15, n_samples)
        data["freeWeightKg"] = np.clip(np.random.normal(5000, 2000, n_samples), 0, 25000)
        data["vehicleType"] = np.random.choice(["VAN", "TRUCK_7_5T", "TRUCK_18T", "TRUCK_40T"], n_samples)
        data["tourProgressPct"] = np.clip(np.random.beta(2, 2, n_samples), 0, 1)
        
        # Entity IDs
        data["customer_id"] = [f"cust_{np.random.randint(1, 100):04d}" for _ in range(n_samples)]
        data["driver_id"] = [f"drv_{np.random.randint(1, 50):04d}" for _ in range(n_samples)]
        data["tour_id"] = [f"tour_{np.random.randint(1, 200):04d}" for _ in range(n_samples)]
        data["lane_id"] = [f"DE-{np.random.choice(['BER', 'HAM', 'MUC', 'FRA'])}->{np.random.choice(['BER', 'HAM', 'MUC', 'FRA'])}" for _ in range(n_samples)]
        
        # Generate binary label (correlated with features)
        prob_accept = (
            0.3 +
            0.3 * data["revenueScore"] +
            0.2 * data["capacityUtilizationScore"] +
            0.1 * data["priorityScore"] +
            0.1 * data["riskScore"] -
            0.05 * data["distancePickupToRouteKm"] / 50
        )
        prob_accept = np.clip(prob_accept, 0, 1)
        data["accepted"] = (np.random.random(n_samples) < prob_accept).astype(int)
        
        # Decision and outcome
        data["decision"] = ["ACCEPTED" if a == 1 else np.random.choice(["REJECTED", "IGNORED"]) for a in data["accepted"]]
        data["actual_margin"] = np.where(
            data["accepted"] == 1,
            np.random.normal(50, 30, n_samples),
            0
        )
        
        df = pd.DataFrame(data)
        
        # Save to Parquet
        if output_path:
            df.to_parquet(output_path, index=False)
            logger.info(f"Saved training dataset to {output_path}")
        
        return df


# =============================================================================
# STEP 2: TRAINING
# =============================================================================

class ModelTrainer:
    """
    Step 2: Model Training
    
    LightGBM Binary Classifier for P(ACCEPT)
    Metrics: AUC, Precision@Top3
    """
    
    def __init__(self, config: MVPConfig):
        self.config = config
        self.model = None
        self.feature_importance = None
        self.best_iteration = None
        self.metrics = {}
    
    def prepare_features(
        self,
        df: pd.DataFrame,
        fit_encoder: bool = True
    ) -> Tuple[pd.DataFrame, Optional[Dict]]:
        """
        Prepare features for training/prediction.
        
        - One-hot encode categorical features
        - Handle missing values
        - Normalize if needed
        """
        df = df.copy()
        encoders = {}
        
        # One-hot encode vehicleType
        if "vehicleType" in df.columns:
            vehicle_dummies = pd.get_dummies(df["vehicleType"], prefix="vehicleType")
            df = pd.concat([df, vehicle_dummies], axis=1)
            df.drop("vehicleType", axis=1, inplace=True)
            encoders["vehicle_dummies"] = list(vehicle_dummies.columns)
        
        # Fill missing values
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
        
        # Get feature columns (exclude non-features)
        exclude_cols = [
            "suggestion_id", "event_timestamp", "event_date", "event_type",
            "customer_id", "driver_id", "tour_id", "order_id", "lane_id",
            "decision", "execution_status", "accepted", "actual_margin"
        ]
        feature_cols = [c for c in df.columns if c not in exclude_cols]
        
        return df[feature_cols], encoders if fit_encoder else None
    
    def train(
        self,
        df: pd.DataFrame,
        features: Optional[List[str]] = None
    ) -> Dict[str, float]:
        """
        Train LightGBM Binary Classifier.
        
        Returns:
            Dictionary with metrics (AUC, Precision@Top3)
        """
        import lightgbm as lgb
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import roc_auc_score, precision_score, recall_score
        
        logger.info("Starting model training...")
        
        # Prepare features
        X, encoders = self.prepare_features(df)
        y = df[self.config.target_column].values
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.config.train_test_split,
            random_state=self.config.random_state,
            stratify=y
        )
        
        X_train, X_val, y_train, y_val = train_test_split(
            X_train, y_train,
            test_size=self.config.validation_split,
            random_state=self.config.random_state,
            stratify=y_train
        )
        
        logger.info(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")
        
        # Create LightGBM datasets
        train_data = lgb.Dataset(X_train, label=y_train)
        val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)
        
        # Train model
        self.model = lgb.train(
            self.config.lgbm_params,
            train_data,
            num_boost_round=self.config.num_boost_round,
            valid_sets=[train_data, val_data],
            valid_names=["train", "valid"],
            callbacks=[
                lgb.early_stopping(self.config.early_stopping_rounds),
                lgb.log_evaluation(period=100),
            ]
        )
        
        self.best_iteration = self.model.best_iteration
        
        # Evaluate on test set
        y_pred_proba = self.model.predict(X_test, num_iteration=self.best_iteration)
        y_pred = (y_pred_proba > 0.5).astype(int)
        
        # Calculate metrics
        auc = roc_auc_score(y_test, y_pred_proba)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        
        # Precision@Top3 (top 3 predictions per tour)
        # For simplicity, calculate precision at top 20% of predictions
        top_k = int(len(y_test) * 0.2)
        top_indices = np.argsort(y_pred_proba)[-top_k:]
        precision_at_top = y_test[top_indices].mean()
        
        self.metrics = {
            "auc": auc,
            "precision": precision,
            "recall": recall,
            "precision_at_top20pct": precision_at_top,
            "best_iteration": self.best_iteration,
        }
        
        # Feature importance
        self.feature_importance = pd.DataFrame({
            "feature": X.columns,
            "importance": self.model.feature_importance(importance_type="gain"),
        }).sort_values("importance", ascending=False)
        
        logger.info(f"Training complete. AUC: {auc:.4f}, Precision@Top20%: {precision_at_top:.4f}")
        
        return self.metrics
    
    def save_model(self, path: str):
        """Save model to file"""
        if self.model is None:
            raise ValueError("No model to save. Train first.")
        
        self.model.save_model(path)
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path: str):
        """Load model from file"""
        import lightgbm as lgb
        self.model = lgb.Booster(model_file=path)
        logger.info(f"Model loaded from {path}")


# =============================================================================
# STEP 3: DEPLOYMENT
# =============================================================================

class ModelDeployment:
    """
    Step 3: Model Deployment
    
    - Export model as .bin or .json
    - Suggestion-Service loads model at startup
    - Configuration for blend mode
    """
    
    def __init__(self, config: MVPConfig):
        self.config = config
        self.model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def export_model(
        self,
        trainer: ModelTrainer,
        output_dir: str
    ) -> Dict[str, str]:
        """
        Export model artifacts for deployment.
        
        Returns:
            Dictionary with paths to exported artifacts
        """
        import json
        
        os.makedirs(output_dir, exist_ok=True)
        
        artifacts = {}
        
        # Export model
        model_path = os.path.join(output_dir, f"model_{self.model_version}.txt")
        trainer.save_model(model_path)
        artifacts["model_path"] = model_path
        
        # Export feature importance
        importance_path = os.path.join(output_dir, f"feature_importance_{self.model_version}.json")
        with open(importance_path, "w") as f:
            json.dump(trainer.feature_importance.to_dict("records"), f, indent=2)
        artifacts["feature_importance_path"] = importance_path
        
        # Export metrics
        metrics_path = os.path.join(output_dir, f"metrics_{self.model_version}.json")
        with open(metrics_path, "w") as f:
            json.dump(trainer.metrics, f, indent=2)
        artifacts["metrics_path"] = metrics_path
        
        # Export model metadata
        metadata = {
            "model_version": self.model_version,
            "model_type": self.config.model_type,
            "alpha": self.config.alpha,
            "features": self.config.all_features,
            "created_at": datetime.now().isoformat(),
            "metrics": trainer.metrics,
        }
        metadata_path = os.path.join(output_dir, f"metadata_{self.model_version}.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        artifacts["metadata_path"] = metadata_path
        
        logger.info(f"Model artifacts exported to {output_dir}")
        
        return artifacts


# =============================================================================
# STEP 4: ONLINE SCORING
# =============================================================================

class HybridScorer:
    """
    Step 4: Online Scoring
    
    Blend Mode:
    Score_final = alpha * Score_heuristic + (1 - alpha) * Score_ml
    
    alpha = 0.8 (default)
    """
    
    def __init__(
        self,
        model_path: str,
        config: MVPConfig,
        alpha: Optional[float] = None
    ):
        self.config = config
        self.alpha = alpha if alpha is not None else config.alpha
        self.trainer = ModelTrainer(config)
        self.trainer.load_model(model_path)
    
    def compute_heuristic_score(
        self,
        features: Dict[str, float]
    ) -> float:
        """
        Compute heuristic score from features.
        
        Uses weights from scoring-config.yaml:
        - revenue: 0.35
        - capacityUtilization: 0.20
        - priority: 0.10
        - risk: 0.10
        - serviceLevel: 0.15
        - co2: 0.10
        """
        weights = {
            "revenueScore": 0.35,
            "capacityUtilizationScore": 0.20,
            "priorityScore": 0.10,
            "riskScore": 0.10,
            "serviceLevelScore": 0.15,
            "co2Score": 0.10,
        }
        
        score = 0.0
        for feature, weight in weights.items():
            score += weight * features.get(feature, 0.5)
        
        return score
    
    def compute_ml_score(
        self,
        features: Dict[str, Any]
    ) -> float:
        """Compute ML score using trained model."""
        # Convert features to DataFrame
        df = pd.DataFrame([features])
        X, _ = self.trainer.prepare_features(df, fit_encoder=False)
        
        # Predict
        ml_score = self.trainer.model.predict(X)[0]
        
        return float(ml_score)
    
    def compute_final_score(
        self,
        features: Dict[str, Any],
        heuristic_score: Optional[float] = None
    ) -> Dict[str, float]:
        """
        Compute final hybrid score.
        
        Returns:
            Dictionary with heuristic_score, ml_score, final_score
        """
        # Compute heuristic score
        if heuristic_score is None:
            heuristic_score = self.compute_heuristic_score(features)
        
        # Compute ML score
        ml_score = self.compute_ml_score(features)
        
        # Blend
        final_score = self.alpha * heuristic_score + (1 - self.alpha) * ml_score
        
        return {
            "heuristic_score": heuristic_score,
            "ml_score": ml_score,
            "final_score": final_score,
            "alpha": self.alpha,
        }


# =============================================================================
# STEP 5: MONITORING
# =============================================================================

class MonitoringConfig(BaseModel):
    """Monitoring Configuration"""
    metrics: List[str] = Field(default_factory=lambda: [
        "acceptance_rate",
        "heuristic_acceptance_rate",
        "ml_acceptance_rate",
        "avg_realized_margin",
        "score_distribution",
    ])
    alertThresholds: Dict[str, float] = Field(default_factory=lambda: {
        "acceptance_rate_drop": 0.1,  # Alert if acceptance drops by >10%
        "score_drift": 0.05,           # KS-test threshold
    })


class MLPipelineMonitor:
    """
    Step 5: Monitoring
    
    - Acceptance Rate (Heuristik vs ML)
    - Realized Margin
    - Score Distribution
    - Grafana Dashboard
    - Alerts for Score Drift
    """
    
    def __init__(self, config: MVPConfig):
        self.config = config
        self.monitoring_config = MonitoringConfig()
    
    def compute_daily_metrics(
        self,
        df: pd.DataFrame
    ) -> Dict[str, Any]:
        """Compute daily monitoring metrics."""
        
        metrics = {
            "date": df["event_timestamp"].dt.date.iloc[0] if len(df) > 0 else None,
            "total_predictions": len(df),
            "acceptance_rate": df["accepted"].mean() if "accepted" in df.columns else None,
        }
        
        if "finalHeuristicScore" in df.columns:
            metrics["avg_score_heuristic"] = df["finalHeuristicScore"].mean()
            metrics["score_distribution_heuristic"] = {
                "p5": df["finalHeuristicScore"].quantile(0.05),
                "p25": df["finalHeuristicScore"].quantile(0.25),
                "p50": df["finalHeuristicScore"].quantile(0.50),
                "p75": df["finalHeuristicScore"].quantile(0.75),
                "p95": df["finalHeuristicScore"].quantile(0.95),
            }
        
        if "ml_score" in df.columns:
            metrics["avg_score_ml"] = df["ml_score"].mean()
            
            # Acceptance rate by ML score quartile
            df["ml_quartile"] = pd.qcut(df["ml_score"], 4, labels=["Q1", "Q2", "Q3", "Q4"])
            metrics["acceptance_by_ml_quartile"] = df.groupby("ml_quartile")["accepted"].mean().to_dict()
        
        if "actual_margin" in df.columns:
            metrics["avg_realized_margin"] = df[df["accepted"] == 1]["actual_margin"].mean()
        
        return metrics
    
    def detect_score_drift(
        self,
        reference_distribution: np.ndarray,
        current_distribution: np.ndarray
    ) -> Dict[str, Any]:
        """
        Detect score drift using Kolmogorov-Smirnov test.
        
        Returns:
            Dictionary with drift detection results
        """
        from scipy.stats import ks_2samp
        
        statistic, p_value = ks_2samp(reference_distribution, current_distribution)
        
        drift_detected = p_value < self.monitoring_config.alertThresholds["score_drift"]
        
        return {
            "ks_statistic": statistic,
            "p_value": p_value,
            "drift_detected": drift_detected,
            "threshold": self.monitoring_config.alertThresholds["score_drift"],
        }
    
    def generate_grafana_dashboard_json(self) -> Dict[str, Any]:
        """Generate Grafana dashboard JSON for ML monitoring."""
        
        dashboard = {
            "dashboard": {
                "title": "CargoBit ML Pipeline Monitoring",
                "tags": ["ml", "cargobit", "monitoring"],
                "panels": [
                    {
                        "title": "Acceptance Rate Over Time",
                        "type": "graph",
                        "targets": [
                            {"expr": "avg(cargobit_ml_acceptance_rate)", "legendFormat": "Acceptance Rate"},
                        ],
                        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8},
                    },
                    {
                        "title": "Heuristic vs ML Score Distribution",
                        "type": "histogram",
                        "targets": [
                            {"expr": "cargobit_ml_heuristic_score", "legendFormat": "Heuristic"},
                            {"expr": "cargobit_ml_score", "legendFormat": "ML"},
                        ],
                        "gridPos": {"x": 12, "y": 0, "w": 12, "h": 8},
                    },
                    {
                        "title": "Realized Margin",
                        "type": "stat",
                        "targets": [
                            {"expr": "avg(cargobit_ml_realized_margin)", "legendFormat": "Avg Margin"},
                        ],
                        "gridPos": {"x": 0, "y": 8, "w": 6, "h": 4},
                    },
                    {
                        "title": "Score Drift Alert",
                        "type": "alert",
                        "targets": [
                            {"expr": "cargobit_ml_drift_p_value < 0.05", "legendFormat": "Drift Detected"},
                        ],
                        "gridPos": {"x": 6, "y": 8, "w": 6, "h": 4},
                    },
                ],
            }
        }
        
        return dashboard


# =============================================================================
# MAIN PIPELINE ORCHESTRATOR
# =============================================================================

class MVPPipeline:
    """
    Complete MVP ML Pipeline Orchestrator.
    
    Usage:
        pipeline = MVPPipeline()
        
        # Run ETL
        df = pipeline.etl.build_training_dataset(start_date, end_date)
        
        # Train model
        metrics = pipeline.train(df)
        
        # Deploy model
        artifacts = pipeline.deploy()
        
        # Score new suggestions
        scores = pipeline.score(features)
    """
    
    def __init__(self, config: Optional[MVPConfig] = None):
        self.config = config or MVPConfig()
        self.etl = ETLPipeline(self.config)
        self.trainer = ModelTrainer(self.config)
        self.deployment = ModelDeployment(self.config)
        self.monitor = MLPipelineMonitor(self.config)
        self.scorer: Optional[HybridScorer] = None
    
    def run_full_pipeline(
        self,
        start_date: datetime,
        end_date: datetime,
        output_dir: str = "./ml-artifacts"
    ) -> Dict[str, Any]:
        """
        Run the complete MVP pipeline.
        
        Steps:
        1. ETL - Build training dataset
        2. Train - Train binary classifier
        3. Deploy - Export model artifacts
        4. Return results
        """
        results = {}
        
        # Step 1: ETL
        logger.info("=== Step 1: ETL ===")
        df = self.etl.build_training_dataset(start_date, end_date)
        results["etl_samples"] = len(df)
        
        # Step 2: Training
        logger.info("=== Step 2: Training ===")
        metrics = self.trainer.train(df)
        results["training_metrics"] = metrics
        
        # Step 3: Deployment
        logger.info("=== Step 3: Deployment ===")
        artifacts = self.deployment.export_model(self.trainer, output_dir)
        results["artifacts"] = artifacts
        
        # Step 4: Initialize Scorer
        logger.info("=== Step 4: Initialize Scorer ===")
        self.scorer = HybridScorer(artifacts["model_path"], self.config)
        
        logger.info("=== Pipeline Complete ===")
        
        return results


# =============================================================================
# CLI ENTRY POINT
# =============================================================================

def main():
    """CLI entry point for running the MVP pipeline."""
    import argparse
    
    parser = argparse.ArgumentParser(description="CargoBit MVP ML Pipeline")
    parser.add_argument("--start-date", type=str, required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=str, required=True, help="End date (YYYY-MM-DD)")
    parser.add_argument("--output-dir", type=str, default="./ml-artifacts", help="Output directory")
    parser.add_argument("--alpha", type=float, default=0.8, help="Blend mode alpha")
    
    args = parser.parse_args()
    
    config = MVPConfig(alpha=args.alpha)
    pipeline = MVPPipeline(config)
    
    results = pipeline.run_full_pipeline(
        start_date=datetime.strptime(args.start_date, "%Y-%m-%d"),
        end_date=datetime.strptime(args.end_date, "%Y-%m-%d"),
        output_dir=args.output_dir,
    )
    
    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
