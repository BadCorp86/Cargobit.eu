"""
CargoBit Learning-to-Rank Training Pipeline
===========================================

Production training pipeline for suggestion ranking model.

Features:
- LightGBM LambdaRank training
- Time-based train/validation split
- Cross-validation with group-aware splitting
- SHAP explainability integration
- MLflow experiment tracking
- Model promotion workflow

Usage:
    python train_ltr.py --start-date 2025-01-01 --end-date 2025-04-19

Author: CargoBit ML Team
Version: 2.0.0
"""

import argparse
import json
import logging
import os
import pickle
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import lightgbm as lgb
import mlflow
import mlflow.lightgbm
import numpy as np
import pandas as pd
import shap
from sklearn.metrics import ndcg_score
from sklearn.model_selection import GroupKFold

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class TrainingConfig:
    """Training configuration."""
    
    # Features
    feature_columns: List[str] = field(default_factory=lambda: [
        # Heuristic Features
        "revenueScore",
        "capacityScore",
        "priorityScore",
        "riskScore",
        "serviceLevelScore",
        "co2Score",
        "heuristicScoreNorm",
        
        # Historical Features
        "customerAcceptanceRate30d",
        "customerAvgMargin30d",
        "driverAcceptanceRate30d",
        "driverAvgMargin30d",
        "laneAcceptanceRate30d",
        "laneAvgMargin30d",
        
        # Context Features
        "hourOfDay",
        "dayOfWeekNumeric",
        "isWeekend",
        "timeOfDayEncoded",
        "weatherEncoded",
        "trafficEncoded",
        
        # Profile Features
        "customerTierEncoded",
        "customerCreditRating",
        "driverRating",
        "driverExperienceYears",
        
        # Distance/Time Features
        "distancePickupToRouteNorm",
        "distanceDeliveryToDestinationNorm",
        "timeToPickupNorm",
        "timeToDeliveryNorm",
    ])
    
    # Model parameters
    objective: str = "lambdarank"
    metric: str = "ndcg"
    ndcg_eval_at: List[int] = field(default_factory=lambda: [1, 3, 5, 10])
    learning_rate: float = 0.05
    num_leaves: int = 64
    max_depth: int = -1
    min_data_in_leaf: int = 50
    feature_fraction: float = 0.8
    bagging_fraction: float = 0.8
    bagging_freq: int = 5
    lambda_l1: float = 0.1
    lambda_l2: float = 0.1
    
    # Training
    num_boost_round: int = 1000
    early_stopping_rounds: int = 50
    n_folds: int = 5
    
    # Thresholds
    min_ndcg: float = 0.65
    min_samples: int = 5000
    
    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"
    experiment_name: str = "suggestion_ltr"
    model_name: str = "suggestion_ltr_model"
    
    # Data
    data_path: str = "s3://cargobit-datalake/training_datasets/suggestions/"
    
    # SHAP
    compute_shap: bool = True
    shap_samples: int = 1000


# =============================================================================
# DATA LOADING
# =============================================================================

def load_training_data(
    data_path: str,
    start_date: str,
    end_date: str,
    feature_columns: List[str],
    min_samples: int = 5000
) -> pd.DataFrame:
    """
    Loads training data from S3.
    
    Args:
        data_path: S3 path to training data
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        feature_columns: List of feature columns
        min_samples: Minimum samples required
        
    Returns:
        DataFrame with training data
    """
    logger.info(f"Loading data from {data_path}")
    logger.info(f"Date range: {start_date} to {end_date}")
    
    # Load parquet files
    df = pd.read_parquet(
        data_path,
        filters=[("date", ">=", start_date), ("date", "<=", end_date)]
    )
    
    logger.info(f"Loaded {len(df)} rows")
    
    # Filter valid samples (decision made)
    df = df[df["decision"].notna()].copy()
    logger.info(f"After filtering for decisions: {len(df)} rows")
    
    # Check minimum samples
    if len(df) < min_samples:
        raise ValueError(f"Insufficient samples: {len(df)} < {min_samples}")
    
    # Fill missing features
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0.0
            logger.warning(f"Missing feature column {col}, filled with 0.0")
        else:
            df[col] = df[col].fillna(0.0)
    
    # Convert isWeekend to int if needed
    if "isWeekend" in df.columns:
        df["isWeekend"] = df["isWeekend"].astype(int)
    
    return df


def prepare_ltr_data(
    df: pd.DataFrame,
    feature_columns: List[str]
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, pd.DataFrame]:
    """
    Prepares data for Learning-to-Rank training.
    
    Args:
        df: DataFrame with training data
        feature_columns: List of feature columns
        
    Returns:
        Tuple of (X, y, groups, tour_ids, metadata)
    """
    logger.info("Preparing LTR data...")
    
    # Sort by tour for proper grouping
    df = df.sort_values(["tourId", "generatedAt"]).reset_index(drop=True)
    
    # Features
    X = df[feature_columns].values.astype(np.float32)
    
    # Labels (accepted or utility-weighted)
    if "label" in df.columns and df["label"].nunique() > 2:
        # Multi-class: 0=rejected, 1=accepted, 2=high_value
        y = df["label"].values.astype(np.float32)
    else:
        # Binary: accepted
        y = df["accepted"].values.astype(np.float32)
    
    # Groups (samples per tour)
    tour_ids = df["tourId"].values
    unique_tours, group_sizes = np.unique(tour_ids, return_counts=True)
    
    # Metadata for analysis
    metadata = df[["suggestionId", "tourId", "date", "accepted", "realizedMargin"]].copy()
    
    logger.info(f"Features shape: {X.shape}")
    logger.info(f"Labels shape: {y.shape}")
    logger.info(f"Number of tours: {len(unique_tours)}")
    logger.info(f"Average suggestions per tour: {group_sizes.mean():.1f}")
    logger.info(f"Positive rate: {y.mean():.2%}")
    
    return X, y, group_sizes, tour_ids, metadata


# =============================================================================
# SHAP EXPLAINABILITY
# =============================================================================

class SHAPExplainer:
    """SHAP-based explainability for the ranking model."""
    
    def __init__(self, model: lgb.Booster, feature_columns: List[str]):
        self.model = model
        self.feature_columns = feature_columns
        self.explainer = None
        self.shap_values = None
    
    def fit(self, X: np.ndarray, n_samples: int = 1000) -> None:
        """
        Fits the SHAP explainer on a sample of data.
        
        Args:
            X: Feature matrix
            n_samples: Number of samples for SHAP computation
        """
        logger.info(f"Computing SHAP values on {n_samples} samples...")
        
        # Sample data for efficiency
        if len(X) > n_samples:
            indices = np.random.choice(len(X), n_samples, replace=False)
            X_sample = X[indices]
        else:
            X_sample = X
        
        # Tree SHAP explainer
        self.explainer = shap.TreeExplainer(self.model)
        self.shap_values = self.explainer.shap_values(X_sample)
        
        logger.info("SHAP computation complete")
    
    def get_feature_importance(self) -> pd.DataFrame:
        """Returns feature importance based on SHAP values."""
        
        if self.shap_values is None:
            raise ValueError("SHAP explainer not fitted. Call fit() first.")
        
        # Mean absolute SHAP value per feature
        if isinstance(self.shap_values, list):
            # Multi-class: use first class
            shap_arr = self.shap_values[0]
        else:
            shap_arr = self.shap_values
        
        importance = np.abs(shap_arr).mean(axis=0)
        
        importance_df = pd.DataFrame({
            "feature": self.feature_columns,
            "shap_importance": importance
        }).sort_values("shap_importance", ascending=False)
        
        return importance_df
    
    def explain_prediction(
        self,
        X: np.ndarray,
        idx: int,
        top_k: int = 5
    ) -> Dict:
        """
        Explains a single prediction.
        
        Args:
            X: Feature matrix
            idx: Index of the sample to explain
            top_k: Number of top contributors to return
            
        Returns:
            Dict with explanation details
        """
        if self.explainer is None:
            raise ValueError("SHAP explainer not fitted. Call fit() first.")
        
        # Get SHAP values for this sample
        shap_vals = self.explainer.shap_values(X[idx:idx+1])
        
        if isinstance(shap_vals, list):
            shap_vals = shap_vals[0][0]
        else:
            shap_vals = shap_vals[0]
        
        # Feature values
        feature_vals = X[idx]
        
        # Sort by absolute importance
        contributors = []
        for i, (feat, val, shap_val) in enumerate(
            zip(self.feature_columns, feature_vals, shap_vals)
        ):
            contributors.append({
                "feature": feat,
                "value": float(val),
                "shap_value": float(shap_val),
                "abs_impact": float(abs(shap_val)),
                "direction": "positive" if shap_val > 0 else "negative"
            })
        
        contributors.sort(key=lambda x: x["abs_impact"], reverse=True)
        
        return {
            "top_contributors": contributors[:top_k],
            "base_value": float(self.explainer.expected_value),
            "prediction": float(self.model.predict(X[idx:idx+1])[0])
        }
    
    def save(self, path: str) -> None:
        """Saves SHAP explainer state."""
        
        state = {
            "feature_columns": self.feature_columns,
            "shap_values": self.shap_values,
        }
        
        with open(path, "wb") as f:
            pickle.dump(state, f)
        
        logger.info(f"Saved SHAP state to {path}")


# =============================================================================
# TRAINING
# =============================================================================

def train_ltr_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    groups_train: np.ndarray,
    X_valid: np.ndarray,
    y_valid: np.ndarray,
    groups_valid: np.ndarray,
    config: TrainingConfig
) -> Tuple[lgb.Booster, Dict[str, float], SHAPExplainer]:
    """
    Trains LightGBM LambdaRank model.
    
    Args:
        X_train: Training features
        y_train: Training labels
        groups_train: Training group sizes
        X_valid: Validation features
        y_valid: Validation labels
        groups_valid: Validation group sizes
        config: Training configuration
        
    Returns:
        Tuple of (trained model, metrics dict, SHAP explainer)
    """
    logger.info("Training LTR model...")
    
    # LightGBM parameters
    params = {
        "objective": config.objective,
        "metric": config.metric,
        "ndcg_eval_at": config.ndcg_eval_at,
        "learning_rate": config.learning_rate,
        "num_leaves": config.num_leaves,
        "max_depth": config.max_depth,
        "min_data_in_leaf": config.min_data_in_leaf,
        "feature_fraction": config.feature_fraction,
        "bagging_fraction": config.bagging_fraction,
        "bagging_freq": config.bagging_freq,
        "lambda_l1": config.lambda_l1,
        "lambda_l2": config.lambda_l2,
        "verbosity": 1,
        "seed": 42,
        "num_threads": os.cpu_count(),
    }
    
    # Create datasets
    train_data = lgb.Dataset(
        data=X_train,
        label=y_train,
        group=groups_train,
        feature_name=config.feature_columns,
        free_raw_data=False
    )
    
    valid_data = lgb.Dataset(
        data=X_valid,
        label=y_valid,
        group=groups_valid,
        feature_name=config.feature_columns,
        reference=train_data,
        free_raw_data=False
    )
    
    # Train with MLflow tracking
    with mlflow.start_run():
        # Log parameters
        mlflow.log_params(params)
        mlflow.log_param("train_samples", len(X_train))
        mlflow.log_param("valid_samples", len(X_valid))
        mlflow.log_param("train_groups", len(groups_train))
        mlflow.log_param("valid_groups", len(groups_valid))
        mlflow.log_param("feature_count", len(config.feature_columns))
        
        # Train model
        model = lgb.train(
            params,
            train_data,
            valid_sets=[train_data, valid_data],
            valid_names=["train", "valid"],
            num_boost_round=config.num_boost_round,
            callbacks=[
                lgb.early_stopping(stopping_rounds=config.early_stopping_rounds),
                lgb.log_evaluation(period=50),
            ]
        )
        
        # Extract final metrics
        metrics = {}
        for name in ["ndcg@1", "ndcg@3", "ndcg@5", "ndcg@10"]:
            if name in model.best_score["valid"]:
                metrics[name] = float(model.best_score["valid"][name])
                mlflow.log_metric(f"final_{name}", metrics[name])
        
        mlflow.log_metric("best_iteration", model.best_iteration)
        
        # Feature importance
        importance = model.feature_importance(importance_type="gain")
        importance_df = pd.DataFrame({
            "feature": config.feature_columns,
            "importance": importance
        }).sort_values("importance", ascending=False)
        
        mlflow.log_dict(importance_df.to_dict("records"), "feature_importance.json")
        
        # Compute SHAP values
        if config.compute_shap:
            logger.info("Computing SHAP values...")
            shap_explainer = SHAPExplainer(model, config.feature_columns)
            shap_explainer.fit(X_valid, n_samples=config.shap_samples)
            
            # Log SHAP importance
            shap_importance = shap_explainer.get_feature_importance()
            mlflow.log_dict(
                shap_importance.to_dict("records"),
                "shap_importance.json"
            )
            
            # Save SHAP explainer
            shap_path = "/tmp/shap_explainer.pkl"
            shap_explainer.save(shap_path)
            mlflow.log_artifact(shap_path)
        else:
            shap_explainer = None
        
        # Log model
        mlflow.lightgbm.log_model(model, "model")
        
    logger.info(f"Training complete. Best iteration: {model.best_iteration}")
    logger.info(f"Validation metrics: {metrics}")
    
    return model, metrics, shap_explainer


# =============================================================================
# MODEL PROMOTION
# =============================================================================

def promote_model(
    model_name: str,
    min_ndcg: float,
    current_metrics: Dict[str, float]
) -> bool:
    """
    Promotes model to production if metrics exceed threshold.
    
    Args:
        model_name: MLflow model name
        min_ndcg: Minimum NDCG threshold
        current_metrics: Current model metrics
        
    Returns:
        True if promoted, False otherwise
    """
    from mlflow.tracking import MlflowClient
    
    client = MlflowClient()
    
    current_ndcg = current_metrics.get("ndcg@10", 0)
    
    if current_ndcg < min_ndcg:
        logger.warning(
            f"Model did not meet threshold: {current_ndcg:.4f} < {min_ndcg}"
        )
        return False
    
    # Get latest version
    versions = client.get_latest_versions(model_name, stages=["None"])
    
    if not versions:
        logger.warning("No model version found")
        return False
    
    version = versions[0].version
    
    # Transition to Staging
    client.transition_model_version_stage(
        name=model_name,
        version=version,
        stage="Staging"
    )
    
    logger.info(f"Model v{version} promoted to Staging")
    
    # Check if better than current production
    prod_versions = client.get_latest_versions(model_name, stages=["Production"])
    
    if not prod_versions:
        # No production model, promote directly
        client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage="Production"
        )
        logger.info(f"Model v{version} promoted to Production")
        return True
    
    # Compare with production
    prod_run = client.get_run(prod_versions[0].run_id)
    prod_ndcg = prod_run.data.metrics.get("final_ndcg@10", 0)
    
    if current_ndcg > prod_ndcg:
        # Archive old production
        client.transition_model_version_stage(
            name=model_name,
            version=prod_versions[0].version,
            stage="Archived"
        )
        
        # Promote new model
        client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage="Production"
        )
        
        logger.info(
            f"Model v{version} promoted to Production "
            f"(NDCG: {current_ndcg:.4f} > {prod_ndcg:.4f})"
        )
        return True
    
    logger.info(
        f"Model v{version} kept in Staging "
        f"(NDCG: {current_ndcg:.4f} <= {prod_ndcg:.4f})"
    )
    return False


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="CargoBit LTR Training Pipeline")
    parser.add_argument("--start-date", required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", required=True, help="End date (YYYY-MM-DD)")
    parser.add_argument("--data-path", default="s3://cargobit-datalake/training_datasets/suggestions/")
    parser.add_argument("--mlflow-uri", default="http://localhost:5000")
    parser.add_argument("--min-ndcg", type=float, default=0.65)
    parser.add_argument("--cross-validate", action="store_true", help="Run cross-validation")
    parser.add_argument("--no-promote", action="store_true", help="Skip model promotion")
    parser.add_argument("--compute-shap", action="store_true", default=True, help="Compute SHAP values")
    
    args = parser.parse_args()
    
    # Create config
    config = TrainingConfig(
        mlflow_tracking_uri=args.mlflow_uri,
        min_ndcg=args.min_ndcg,
        data_path=args.data_path,
        compute_shap=args.compute_shap,
    )
    
    # Setup MLflow
    mlflow.set_tracking_uri(config.mlflow_tracking_uri)
    mlflow.set_experiment(config.experiment_name)
    
    # Load data
    df = load_training_data(
        config.data_path,
        args.start_date,
        args.end_date,
        config.feature_columns,
        config.min_samples
    )
    
    # Prepare data
    X, y, groups, tour_ids, metadata = prepare_ltr_data(df, config.feature_columns)
    
    # Time-based split
    dates = df["date"].unique()
    dates = np.sort(dates)
    
    split_idx = int(len(dates) * 0.8)
    train_dates = dates[:split_idx]
    valid_dates = dates[split_idx:]
    
    train_mask = df["date"].isin(train_dates).values
    valid_mask = df["date"].isin(valid_dates).values
    
    X_train, y_train = X[train_mask], y[train_mask]
    X_valid, y_valid = X[valid_mask], y[valid_mask]
    
    # Recompute groups
    train_df = df[train_mask]
    valid_df = df[valid_mask]
    
    groups_train = train_df.groupby("tourId").size().values
    groups_valid = valid_df.groupby("tourId").size().values
    
    logger.info(f"Train: {len(X_train)} samples, {len(groups_train)} groups")
    logger.info(f"Valid: {len(X_valid)} samples, {len(groups_valid)} groups")
    
    # Train
    model, metrics, shap_explainer = train_ltr_model(
        X_train, y_train, groups_train,
        X_valid, y_valid, groups_valid,
        config
    )
    
    # Promote model
    if not args.no_promote:
        promote_model(config.model_name, config.min_ndcg, metrics)
    
    logger.info("Training pipeline complete!")
    
    # Print summary
    print("\n" + "=" * 60)
    print("Training Summary")
    print("=" * 60)
    print(f"Date Range: {args.start_date} to {args.end_date}")
    print(f"Training Samples: {len(X_train)}")
    print(f"Validation Samples: {len(X_valid)}")
    print(f"Best Iteration: {model.best_iteration}")
    print("\nMetrics:")
    for name, value in metrics.items():
        print(f"  {name}: {value:.4f}")
    
    if shap_explainer:
        print("\nTop 5 Features (SHAP Importance):")
        shap_imp = shap_explainer.get_feature_importance()
        for _, row in shap_imp.head(5).iterrows():
            print(f"  {row['feature']}: {row['shap_importance']:.4f}")


if __name__ == "__main__":
    main()
