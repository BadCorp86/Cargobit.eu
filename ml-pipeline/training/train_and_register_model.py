"""
CargoBit ML Pipeline - Training & Model Selection Module
=========================================================

Modul für Training und Modell-Selektion:
- Training mit LightGBM/XGBoost
- Hyperparameter-Tuning (Optuna)
- Cross-Validation
- Model Registry Integration
- Promotion Logic

Author: CargoBit ML Team
Version: 1.0.0
"""

import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import lightgbm as lgb
import mlflow
import mlflow.lightgbm
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import (
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    ndcg_score,
    average_precision_score,
)

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

class TrainingConfig:
    """Configuration for Model Training."""
    
    # Model parameters
    ALGORITHM: str = os.getenv("ML_ALGORITHM", "LIGHTGBM")
    NUM_LEAVES: int = int(os.getenv("ML_NUM_LEAVES", "31"))
    MAX_DEPTH: int = int(os.getenv("ML_MAX_DEPTH", "6"))
    LEARNING_RATE: float = float(os.getenv("ML_LEARNING_RATE", "0.05"))
    
    # Training parameters
    NUM_BOOST_ROUND: int = int(os.getenv("ML_NUM_BOOST_ROUND", "500"))
    EARLY_STOPPING_ROUNDS: int = int(os.getenv("ML_EARLY_STOPPING_ROUNDS", "50"))
    N_FOLDS: int = int(os.getenv("ML_N_FOLDS", "5"))
    
    # Thresholds
    MIN_AUC: float = float(os.getenv("ML_MIN_AUC", "0.65"))
    MIN_NDCG: float = float(os.getenv("ML_MIN_NDCG", "0.60"))
    MIN_TRAINING_SAMPLES: int = int(os.getenv("ML_MIN_TRAINING_SAMPLES", "10000"))
    
    # MLflow
    MLFLOW_TRACKING_URI: str = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    MLFLOW_EXPERIMENT: str = os.getenv("MLFLOW_EXPERIMENT", "suggestion-scoring")
    
    # Model Registry
    MODEL_REGISTRY_PATH: str = os.getenv("MODEL_REGISTRY_PATH", "./models/")
    
    # Features
    FEATURE_COLUMNS: List[str] = [
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
        "lane_realized_margin_avg_90d",
        "customer_delay_avg_30d",
        "driver_delay_avg_30d",
        # Meta Features
        "combined_acceptance_rate",
        "risk_adjusted_revenue",
        "time_pressure_score",
    ]


# =============================================================================
# TRAINING FUNCTIONS
# =============================================================================

def train_and_register_model(
    dataset_table: str,
    registry_table: str,
    snapshot_date: Optional[str] = None,
    config: Optional[TrainingConfig] = None,
) -> Dict[str, Any]:
    """
    Trainiert ein neues Modell und registriert es in der Model Registry.
    
    Args:
        dataset_table: Name der Training-Dataset-Tabelle
        registry_table: Name der Model-Registry-Tabelle
        snapshot_date: Datum des Training-Datasets
        config: Training-Konfiguration
        
    Returns:
        Dict mit Training-Ergebnissen
    """
    if config is None:
        config = TrainingConfig()
    
    # Initialize MLflow
    mlflow.set_tracking_uri(config.MLFLOW_TRACKING_URI)
    mlflow.set_experiment(config.MLFLOW_EXPERIMENT)
    
    # Generate model version
    model_version = f"v{datetime.utcnow().strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"
    
    logger.info(f"Starting training for model {model_version}")
    
    # Load data
    df = load_training_data(dataset_table, snapshot_date)
    
    # Validate data
    validate_training_data(df, config)
    
    # Prepare features
    X, y = prepare_features_and_labels(df, config)
    
    # Train model
    training_result = train_model(X, y, model_version, config)
    
    # Register model
    register_model_in_registry(
        model=training_result["model"],
        model_version=model_version,
        metrics=training_result["metrics"],
        registry_table=registry_table,
        config=config,
    )
    
    return {
        "model_version": model_version,
        "metrics": training_result["metrics"],
        "training_samples": len(X),
        "feature_count": len(config.FEATURE_COLUMNS),
    }


def load_training_data(
    dataset_table: str,
    snapshot_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Lädt das Training-Dataset.
    
    In Production: Lädt aus Snowflake/Databricks
    In Development: Generiert Mock-Daten
    """
    # Check if we're in production or development
    if os.getenv("ENVIRONMENT") == "production":
        # Production: Load from Snowflake
        import snowflake.connector
        from airflow.models import Variable
        
        conn = snowflake.connector.connect(
            user=Variable.get('snowflake_user'),
            password=Variable.get('snowflake_password'),
            account=Variable.get('snowflake_account'),
            warehouse='ML_WH',
            database='CARGOBIT_ML',
            schema='TRAINING',
        )
        
        query = f"""
        SELECT * FROM {dataset_table}
        WHERE snapshot_date = '{snapshot_date}'
        """
        
        df = pd.read_sql(query, conn)
        conn.close()
        
        return df
    else:
        # Development: Generate mock data
        logger.warning("Using mock training data for development")
        return generate_mock_training_data()


def generate_mock_training_data(n_samples: int = 50000) -> pd.DataFrame:
    """Generiert Mock-Daten für Development/Testing."""
    np.random.seed(42)
    
    config = TrainingConfig()
    
    # Generate features
    data = {}
    for feat in config.FEATURE_COLUMNS:
        if "vehicle_type" in feat:
            data[feat] = np.zeros(n_samples)
        else:
            data[feat] = np.random.random(n_samples)
    
    # Set one-hot vehicle type
    vehicle_types = np.random.choice(["van", "truck_7t", "truck_18t", "truck_40t"], n_samples)
    for vt in ["van", "truck_7t", "truck_18t", "truck_40t"]:
        data[f"vehicle_type_{vt}"] = (vehicle_types == vt).astype(float)
    
    # Generate labels with some correlation to features
    label = (
        0.3 * data["revenue_score"] +
        0.2 * data["capacity_utilization_score"] +
        0.1 * data["customer_acceptance_rate_30d"] +
        0.1 * data["driver_acceptance_rate_30d"] -
        0.05 * data["distance_pickup_to_route_km"] / 100 +
        np.random.random(n_samples) * 0.3
    ) > 0.5
    data["label_accepted"] = label.astype(int)
    
    return pd.DataFrame(data)


def validate_training_data(df: pd.DataFrame, config: TrainingConfig) -> None:
    """Validiert das Training-Dataset."""
    # Check minimum samples
    if len(df) < config.MIN_TRAINING_SAMPLES:
        raise ValueError(
            f"Insufficient training samples: {len(df)} < {config.MIN_TRAINING_SAMPLES}"
        )
    
    # Check label distribution
    label_rate = df["label_accepted"].mean()
    if label_rate < 0.05 or label_rate > 0.95:
        logger.warning(f"Imbalanced label distribution: {label_rate:.2%} positive")
    
    # Check for missing features
    missing_features = set(config.FEATURE_COLUMNS) - set(df.columns)
    if missing_features:
        logger.warning(f"Missing features will be filled with defaults: {missing_features}")
    
    logger.info(f"Training data validated: {len(df)} samples, {label_rate:.2%} positive")


def prepare_features_and_labels(
    df: pd.DataFrame,
    config: TrainingConfig,
) -> Tuple[pd.DataFrame, pd.Series]:
    """Bereitet Features und Labels vor."""
    # Select features
    available_features = [f for f in config.FEATURE_COLUMNS if f in df.columns]
    
    X = df[available_features].copy()
    y = df["label_accepted"]
    
    # Fill missing values
    X = X.fillna(0)
    
    # Add missing features with defaults
    for feat in config.FEATURE_COLUMNS:
        if feat not in X.columns:
            X[feat] = 0.0
    
    # Ensure correct column order
    X = X[config.FEATURE_COLUMNS]
    
    return X, y


def train_model(
    X: pd.DataFrame,
    y: pd.Series,
    model_version: str,
    config: TrainingConfig,
) -> Dict[str, Any]:
    """
    Trainiert das Modell mit Cross-Validation.
    """
    # Split data
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Model parameters
    params = {
        "objective": "binary",
        "metric": ["auc", "binary_logloss"],
        "boosting_type": "gbdt",
        "num_leaves": config.NUM_LEAVES,
        "max_depth": config.MAX_DEPTH,
        "learning_rate": config.LEARNING_RATE,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq": 5,
        "verbose": -1,
        "n_jobs": -1,
        "seed": 42,
    }
    
    # Cross-validation
    cv_results = cross_validate(X_train, y_train, params, config)
    
    # Train final model
    train_data = lgb.Dataset(X_train, label=y_train)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)
    
    with mlflow.start_run(run_name=model_version):
        # Log parameters
        mlflow.log_params(params)
        mlflow.log_param("train_samples", len(X_train))
        mlflow.log_param("val_samples", len(X_val))
        mlflow.log_param("feature_count", len(config.FEATURE_COLUMNS))
        mlflow.log_param("model_version", model_version)
        
        # Train
        model = lgb.train(
            params,
            train_data,
            num_boost_round=config.NUM_BOOST_ROUND,
            valid_sets=[train_data, val_data],
            valid_names=["train", "valid"],
            callbacks=[
                lgb.early_stopping(stopping_rounds=config.EARLY_STOPPING_ROUNDS),
                lgb.log_evaluation(period=50),
            ]
        )
        
        # Compute metrics
        y_pred = model.predict(X_val)
        metrics = compute_metrics(y_val, y_pred)
        
        # Log metrics
        mlflow.log_metrics(metrics)
        mlflow.log_metric("best_iteration", model.best_iteration)
        
        # Log feature importance
        feature_importance = log_feature_importance(model, config.FEATURE_COLUMNS)
        
        # Log model
        mlflow.lightgbm.log_model(model, "model")
    
    return {
        "model": model,
        "metrics": metrics,
        "cv_results": cv_results,
        "feature_importance": feature_importance,
    }


def cross_validate(
    X: pd.DataFrame,
    y: pd.Series,
    params: Dict[str, Any],
    config: TrainingConfig,
) -> Dict[str, List[float]]:
    """Führt Cross-Validation durch."""
    skf = StratifiedKFold(n_splits=config.N_FOLDS, shuffle=True, random_state=42)
    
    cv_metrics = {"auc": [], "precision": [], "recall": []}
    
    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
        X_train_fold = X.iloc[train_idx]
        y_train_fold = y.iloc[train_idx]
        X_val_fold = X.iloc[val_idx]
        y_val_fold = y.iloc[val_idx]
        
        train_data = lgb.Dataset(X_train_fold, label=y_train_fold)
        val_data = lgb.Dataset(X_val_fold, label=y_val_fold, reference=train_data)
        
        model = lgb.train(
            params,
            train_data,
            num_boost_round=200,  # Faster for CV
            valid_sets=[val_data],
            valid_names=["valid"],
            callbacks=[lgb.early_stopping(30), lgb.log_evaluation(0)],
        )
        
        y_pred = model.predict(X_val_fold)
        cv_metrics["auc"].append(roc_auc_score(y_val_fold, y_pred))
        cv_metrics["precision"].append(precision_score(y_val_fold, y_pred > 0.5))
        cv_metrics["recall"].append(recall_score(y_val_fold, y_pred > 0.5))
    
    # Aggregate CV metrics
    cv_summary = {
        f"cv_{k}_mean": np.mean(v) for k, v in cv_metrics.items()
    }
    cv_summary.update({
        f"cv_{k}_std": np.std(v) for k, v in cv_metrics.items()
    })
    
    logger.info(f"CV Results: {cv_summary}")
    
    return cv_metrics


def compute_metrics(y_true: pd.Series, y_pred: np.ndarray) -> Dict[str, float]:
    """Berechnet alle Metriken."""
    y_pred_binary = (y_pred > 0.5).astype(int)
    
    metrics = {
        "auc": roc_auc_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred_binary),
        "recall": recall_score(y_true, y_pred_binary),
        "f1": f1_score(y_true, y_pred_binary),
        "average_precision": average_precision_score(y_true, y_pred),
    }
    
    # NDCG@10 (approximate)
    try:
        metrics["ndcg_10"] = ndcg_score(
            y_true.values.reshape(1, -1),
            y_pred.reshape(1, -1),
            k=10
        )
    except Exception:
        metrics["ndcg_10"] = 0.0
    
    return metrics


def log_feature_importance(
    model: lgb.Booster,
    feature_names: List[str],
) -> Dict[str, float]:
    """Loggt Feature Importance."""
    importance = model.feature_importance(importance_type="gain")
    
    feature_importance = {}
    for name, imp in sorted(zip(feature_names, importance), key=lambda x: -x[1]):
        feature_importance[name] = float(imp)
        mlflow.log_metric(f"feature_importance_{name}", imp)
    
    logger.info(f"Top 5 features: {list(feature_importance.keys())[:5]}")
    
    return feature_importance


def register_model_in_registry(
    model: lgb.Booster,
    model_version: str,
    metrics: Dict[str, float],
    registry_table: str,
    config: TrainingConfig,
) -> None:
    """Registriert das Modell in der Registry."""
    # Save model file
    registry_path = Path(config.MODEL_REGISTRY_PATH)
    registry_path.mkdir(parents=True, exist_ok=True)
    
    model_file = registry_path / f"model_{model_version}.txt"
    model.save_model(str(model_file))
    
    logger.info(f"Model saved to {model_file}")
    
    # Register in MLflow Model Registry
    try:
        model_uri = f"runs:/{mlflow.active_run().info.run_id}/model"
        mlflow.register_model(model_uri, "suggestion-scoring")
    except Exception as e:
        logger.warning(f"Could not register model in MLflow: {e}")
    
    # In production: Also insert into database registry
    if os.getenv("ENVIRONMENT") == "production":
        insert_model_registry_db(model_version, metrics, registry_table)


def insert_model_registry_db(
    model_version: str,
    metrics: Dict[str, float],
    registry_table: str,
) -> None:
    """Fügt Modell in Datenbank-Registry ein."""
    import snowflake.connector
    from airflow.models import Variable
    
    conn = snowflake.connector.connect(
        user=Variable.get('snowflake_user'),
        password=Variable.get('snowflake_password'),
        account=Variable.get('snowflake_account'),
        warehouse='ML_WH',
        database='CARGOBIT_ML',
        schema='MODELS',
    )
    
    cursor = conn.cursor()
    
    try:
        insert_sql = f"""
        INSERT INTO {registry_table} (
            model_version, created_at, created_by, algorithm,
            metric_auc, metric_ndcg_10, metric_precision, metric_recall,
            status, config
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(insert_sql, (
            model_version,
            datetime.utcnow(),
            "airflow-pipeline",
            "LIGHTGBM",
            metrics["auc"],
            metrics.get("ndcg_10", 0.0),
            metrics["precision"],
            metrics["recall"],
            "CANDIDATE",
            json.dumps({"num_leaves": 31, "max_depth": 6}),
        ))
        
        conn.commit()
        logger.info(f"Model registered in database: {model_version}")
        
    finally:
        cursor.close()
        conn.close()


# =============================================================================
# MODEL PROMOTION
# =============================================================================

def promote_best_model(
    registry_table: str,
    min_auc: float = 0.65,
    min_ndcg: float = 0.60,
) -> Dict[str, Any]:
    """
    Promoted das beste CANDIDATE-Modell zu ACTIVE wenn Metriken passen.
    
    Args:
        registry_table: Name der Model-Registry-Tabelle
        min_auc: Minimum AUC für Promotion
        min_ndcg: Minimum NDCG für Promotion
        
    Returns:
        Dict mit Promotion-Ergebnis
    """
    if os.getenv("ENVIRONMENT") == "production":
        return promote_model_production(registry_table, min_auc, min_ndcg)
    else:
        return promote_model_development(min_auc, min_ndcg)


def promote_model_production(
    registry_table: str,
    min_auc: float,
    min_ndcg: float,
) -> Dict[str, Any]:
    """Promotion in Production-Umgebung."""
    import snowflake.connector
    from airflow.models import Variable
    
    conn = snowflake.connector.connect(
        user=Variable.get('snowflake_user'),
        password=Variable.get('snowflake_password'),
        account=Variable.get('snowflake_account'),
        warehouse='ML_WH',
        database='CARGOBIT_ML',
        schema='MODELS',
    )
    
    cursor = conn.cursor()
    
    try:
        # Get best candidate
        cursor.execute(f"""
            SELECT model_version, metric_auc, metric_ndcg_10
            FROM {registry_table}
            WHERE status = 'CANDIDATE'
            ORDER BY metric_auc DESC, created_at DESC
            LIMIT 1
        """)
        
        result = cursor.fetchone()
        
        if result is None:
            return {"promoted": False, "reason": "No candidate models found"}
        
        model_version, auc, ndcg = result
        
        # Check thresholds
        if auc < min_auc:
            return {
                "promoted": False,
                "model_version": model_version,
                "reason": f"AUC {auc:.4f} below threshold {min_auc}"
            }
        
        if ndcg < min_ndcg:
            return {
                "promoted": False,
                "model_version": model_version,
                "reason": f"NDCG {ndcg:.4f} below threshold {min_ndcg}"
            }
        
        # Deprecate old active models
        cursor.execute(f"""
            UPDATE {registry_table}
            SET status = 'DEPRECATED', deprecated_at = CURRENT_TIMESTAMP()
            WHERE status = 'ACTIVE'
        """)
        
        # Promote new model
        cursor.execute(f"""
            UPDATE {registry_table}
            SET status = 'ACTIVE', promoted_at = CURRENT_TIMESTAMP()
            WHERE model_version = %s
        """, (model_version,))
        
        conn.commit()
        
        logger.info(f"Model {model_version} promoted to ACTIVE")
        
        return {
            "promoted": True,
            "model_version": model_version,
            "auc": float(auc),
            "ndcg": float(ndcg),
        }
        
    finally:
        cursor.close()
        conn.close()


def promote_model_development(
    min_auc: float,
    min_ndcg: float,
) -> Dict[str, Any]:
    """Promotion in Development-Umgebung (Mock)."""
    logger.info("Development mode: Simulating model promotion")
    
    # Simulate good metrics
    return {
        "promoted": True,
        "model_version": f"v{datetime.utcnow().strftime('%Y%m%d')}_mock",
        "auc": 0.72,
        "ndcg": 0.65,
        "reason": "Development mock promotion",
    }


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    # Test training
    result = train_and_register_model(
        dataset_table="ml_training_dataset",
        registry_table="ml_model_registry",
    )
    
    print(f"Training completed: {result}")
