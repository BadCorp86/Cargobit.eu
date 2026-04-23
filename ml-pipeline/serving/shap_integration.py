"""
CargoBit ML Pipeline - SHAP Integration
========================================

SHAP Explainability für Offline (Training) und Online (Inference).

Features:
- Offline: SHAP Explainer fitten und mit Modell speichern
- Online: SHAP für einzelne Requests nutzen
- Global Cache für Model + Explainer
- S3/DBFS Storage Support

Author: CargoBit ML Team
Version: 1.0.0
"""

import json
import logging
import os
import pickle
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURATION
# =============================================================================

SHAP_CACHE_SIZE = int(os.getenv("SHAP_CACHE_SIZE", "10"))
ENABLE_SHAP_CACHING = os.getenv("ENABLE_SHAP_CACHING", "true").lower() == "true"


# =============================================================================
# GLOBAL CACHES
# =============================================================================

# Model cache (version -> model)
_model_cache: Dict[str, Any] = {}

# Explainer cache (version -> explainer)
_explainer_cache: Dict[str, Any] = {}

# Cache metadata (for LRU eviction)
_cache_metadata: Dict[str, Dict[str, Any]] = {}


# =============================================================================
# OFFLINE SHAP (Training)
# =============================================================================

def train_model_with_shap(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_valid: pd.DataFrame,
    y_valid: pd.Series,
    params: Dict[str, Any],
    feature_columns: List[str],
    model_version: str,
) -> Tuple[Any, Any, Dict[str, float]]:
    """
    Train model and create SHAP explainer.
    
    Args:
        X_train: Training features
        y_train: Training labels
        X_valid: Validation features
        y_valid: Validation labels
        params: Model hyperparameters
        feature_columns: List of feature names
        model_version: Version string for the model
        
    Returns:
        Tuple of (model, explainer, metrics)
    """
    import lightgbm as lgb
    import shap
    
    logger.info(f"Training model {model_version} with {len(X_train)} samples")
    
    # Create datasets
    train_data = lgb.Dataset(X_train, label=y_train, feature_name=feature_columns)
    valid_data = lgb.Dataset(X_valid, label=y_valid, reference=train_data, feature_name=feature_columns)
    
    # Train model
    model = lgb.train(
        params,
        train_data,
        valid_sets=[train_data, valid_data],
        valid_names=["train", "valid"],
        num_boost_round=params.get("num_boost_round", 1000),
        callbacks=[
            lgb.early_stopping(stopping_rounds=params.get("early_stopping_rounds", 50)),
            lgb.log_evaluation(period=100),
        ]
    )
    
    # Create SHAP explainer
    logger.info("Creating SHAP TreeExplainer...")
    explainer = shap.TreeExplainer(model)
    
    # Compute metrics
    from sklearn.metrics import roc_auc_score, ndcg_score
    
    y_pred = model.predict(X_valid)
    
    metrics = {
        "auc": float(roc_auc_score(y_valid, y_pred)),
        "best_iteration": model.best_iteration,
        "num_features": len(feature_columns),
        "num_trees": model.num_trees(),
    }
    
    # NDCG@10
    try:
        metrics["ndcg_10"] = float(ndcg_score(
            y_valid.values.reshape(1, -1),
            y_pred.reshape(1, -1),
            k=10
        ))
    except Exception:
        metrics["ndcg_10"] = 0.0
    
    logger.info(f"Model trained - AUC: {metrics['auc']:.4f}, NDCG@10: {metrics.get('ndcg_10', 0):.4f}")
    
    return model, explainer, metrics


def save_model_and_explainer(
    model: Any,
    explainer: Any,
    model_version: str,
    metrics: Dict[str, float],
    output_path: str,
    upload_to_s3: bool = False,
    s3_bucket: Optional[str] = None,
    s3_prefix: str = "suggestion-scoring",
) -> Dict[str, str]:
    """
    Save model and explainer artifacts.
    
    Args:
        model: Trained model
        explainer: SHAP explainer
        model_version: Version string
        metrics: Training metrics
        output_path: Local path for artifacts
        upload_to_s3: Whether to upload to S3
        s3_bucket: S3 bucket name
        s3_prefix: S3 key prefix
        
    Returns:
        Dict with artifact paths
    """
    output_dir = Path(output_path) / model_version
    output_dir.mkdir(parents=True, exist_ok=True)
    
    artifact_paths = {}
    
    # Save model
    model_file = output_dir / "model.txt"
    model.save_model(str(model_file))
    artifact_paths["model"] = str(model_file)
    logger.info(f"Model saved to {model_file}")
    
    # Save explainer (pickle for TreeExplainer)
    explainer_file = output_dir / "explainer.pkl"
    with open(explainer_file, "wb") as f:
        pickle.dump(explainer, f)
    artifact_paths["explainer"] = str(explainer_file)
    logger.info(f"Explainer saved to {explainer_file}")
    
    # Save metadata
    metadata = {
        "model_version": model_version,
        "created_at": datetime.utcnow().isoformat(),
        "metrics": metrics,
        "artifacts": artifact_paths,
    }
    
    metadata_file = output_dir / "metadata.json"
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)
    artifact_paths["metadata"] = str(metadata_file)
    
    # Save feature importance
    try:
        importance_df = pd.DataFrame({
            "feature": model.feature_name(),
            "importance": model.feature_importance(importance_type="gain"),
        }).sort_values("importance", ascending=False)
        
        importance_file = output_dir / "feature_importance.csv"
        importance_df.to_csv(importance_file, index=False)
        artifact_paths["feature_importance"] = str(importance_file)
    except Exception as e:
        logger.warning(f"Could not save feature importance: {e}")
    
    # Upload to S3
    if upload_to_s3 and s3_bucket:
        import boto3
        
        s3 = boto3.client("s3")
        
        for artifact_name, local_path in artifact_paths.items():
            s3_key = f"{s3_prefix}/{model_version}/{Path(local_path).name}"
            s3.upload_file(local_path, s3_bucket, s3_key)
            logger.info(f"Uploaded {s3_key} to S3")
        
        artifact_paths["s3_location"] = f"s3://{s3_bucket}/{s3_prefix}/{model_version}/"
    
    return artifact_paths


def compute_shap_summary(
    model: Any,
    X: pd.DataFrame,
    output_path: str,
    max_samples: int = 10000,
) -> Dict[str, Any]:
    """
    Compute SHAP summary statistics for offline analysis.
    
    Args:
        model: Trained model
        X: Feature DataFrame
        output_path: Path to save summary
        max_samples: Maximum samples to compute SHAP for
        
    Returns:
        Dict with summary statistics
    """
    import shap
    
    # Sample if too large
    if len(X) > max_samples:
        X_sample = X.sample(n=max_samples, random_state=42)
    else:
        X_sample = X
    
    # Compute SHAP values
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)
    
    # Handle binary classification
    if isinstance(shap_values, list):
        shap_values = shap_values[1]
    
    # Compute summary statistics
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    
    summary = {
        "feature_names": X_sample.columns.tolist(),
        "mean_abs_shap": mean_abs_shap.tolist(),
        "base_value": float(explainer.expected_value) if not isinstance(explainer.expected_value, np.ndarray) else float(explainer.expected_value[0]),
        "num_samples": len(X_sample),
    }
    
    # Create summary DataFrame
    summary_df = pd.DataFrame({
        "feature": X_sample.columns,
        "mean_abs_shap": mean_abs_shap,
    }).sort_values("mean_abs_shap", ascending=False)
    
    # Save summary
    summary_file = Path(output_path) / "shap_summary.csv"
    summary_df.to_csv(summary_file, index=False)
    
    logger.info(f"SHAP summary saved to {summary_file}")
    
    return summary


# =============================================================================
# ONLINE SHAP (Inference)
# =============================================================================

def load_model_and_explainer(
    version: str,
    model_loader_func: Optional[callable] = None,
) -> Tuple[Any, Any]:
    """
    Load model and explainer from cache or storage.
    
    Args:
        version: Model version or "latest"
        model_loader_func: Optional custom loader function
        
    Returns:
        Tuple of (model, explainer)
    """
    global _model_cache, _explainer_cache, _cache_metadata
    
    # Resolve "latest" to actual version
    if version == "latest":
        version = get_active_model_version()
    
    # Check cache
    if ENABLE_SHAP_CACHING and version in _model_cache:
        # Update access time
        _cache_metadata[version]["last_access"] = datetime.utcnow()
        logger.debug(f"Cache hit for model {version}")
        return _model_cache[version], _explainer_cache[version]
    
    # Load model
    if model_loader_func:
        model = model_loader_func(version)
    else:
        model = load_model_from_store(version)
    
    # Load or create explainer
    explainer = load_explainer_from_store(version, model)
    
    # Cache
    if ENABLE_SHAP_CACHING:
        # Evict old entries if cache is full
        if len(_model_cache) >= SHAP_CACHE_SIZE:
            _evict_oldest_from_cache()
        
        _model_cache[version] = model
        _explainer_cache[version] = explainer
        _cache_metadata[version] = {
            "loaded_at": datetime.utcnow(),
            "last_access": datetime.utcnow(),
        }
        
        logger.info(f"Cached model {version}, cache size: {len(_model_cache)}")
    
    return model, explainer


def load_explainer_from_store(version: str, model: Any) -> Any:
    """
    Load SHAP explainer from storage or create from model.
    
    Tries to load pre-computed explainer first, falls back to creating new one.
    """
    import shap
    
    # Try to load pre-computed explainer
    explainer_path = get_explainer_path(version)
    
    if explainer_path and os.path.exists(explainer_path):
        try:
            with open(explainer_path, "rb") as f:
                explainer = pickle.load(f)
            logger.info(f"Loaded pre-computed explainer for {version}")
            return explainer
        except Exception as e:
            logger.warning(f"Could not load explainer from {explainer_path}: {e}")
    
    # Create new explainer from model
    logger.info(f"Creating new SHAP explainer for {version}")
    return shap.TreeExplainer(model)


def explain_single_prediction(
    features: Dict[str, float],
    model_version: str,
    top_k: int = 5,
    return_base_value: bool = False,
) -> Dict[str, Any]:
    """
    Explain a single prediction with SHAP values.
    
    Args:
        features: Feature dictionary
        model_version: Model version or "latest"
        top_k: Number of top contributors to return
        return_base_value: Whether to return base value
        
    Returns:
        Dict with contributors and optionally base value
    """
    model, explainer = load_model_and_explainer(model_version)
    
    # Create DataFrame
    x = pd.DataFrame([features])
    
    # Ensure feature order matches model
    if hasattr(model, "feature_name"):
        model_features = model.feature_name()
        x = x.reindex(columns=model_features, fill_value=0.0)
    
    # Compute SHAP values
    shap_values = explainer.shap_values(x)
    
    # Handle binary classification
    if isinstance(shap_values, list):
        shap_values = shap_values[1]
    
    shap_values = shap_values[0]
    
    # Get feature names
    feature_names = x.columns.tolist()
    
    # Sort by absolute impact
    pairs = list(zip(feature_names, shap_values))
    pairs_sorted = sorted(pairs, key=lambda p: abs(p[1]), reverse=True)[:top_k]
    
    # Build contributors
    contributors = []
    for name, value in pairs_sorted:
        contributors.append({
            "feature": name,
            "impact": float(abs(value)),
            "direction": "positive" if value >= 0 else "negative",
            "shap_value": float(value),
        })
    
    result = {"contributors": contributors}
    
    if return_base_value:
        base_value = explainer.expected_value
        if isinstance(base_value, np.ndarray):
            base_value = base_value[0]
        result["base_value"] = float(base_value)
    
    return result


def get_active_model_version() -> str:
    """Get the currently active model version from registry."""
    import os
    import sqlalchemy as sa
    
    warehouse_conn = os.getenv("WAREHOUSE_CONN")
    if not warehouse_conn:
        # Fallback for development
        return "v20260419_default"
    
    engine = sa.create_engine(warehouse_conn)
    
    with engine.connect() as conn:
        row = conn.execute(
            """
            SELECT model_version
            FROM ml_model_registry
            WHERE status = 'ACTIVE'
            ORDER BY created_at DESC
            LIMIT 1
            """
        ).fetchone()
    
    if not row:
        raise RuntimeError("No ACTIVE model in registry")
    
    return row[0]


def get_explainer_path(version: str) -> Optional[str]:
    """Get path to pre-computed explainer file."""
    # Check local models directory
    local_path = f"./models/{version}/explainer.pkl"
    if os.path.exists(local_path):
        return local_path
    
    # Check S3/DBFS paths
    model_bucket = os.getenv("MODEL_BUCKET")
    if model_bucket:
        # Download from S3
        try:
            import boto3
            import tempfile
            
            s3 = boto3.client("s3")
            s3_key = f"suggestion-scoring/{version}/explainer.pkl"
            
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pkl")
            s3.download_fileobj(model_bucket, s3_key, tmp)
            tmp.close()
            return tmp.name
        except Exception as e:
            logger.warning(f"Could not download explainer from S3: {e}")
    
    return None


def load_model_from_store(version: str) -> Any:
    """Load model from S3/DBFS or local storage."""
    import lightgbm as lgb
    import boto3
    import tempfile
    
    # Check local cache first
    local_path = f"./models/{version}/model.txt"
    if os.path.exists(local_path):
        return lgb.Booster(model_file=local_path)
    
    # Download from S3
    model_bucket = os.getenv("MODEL_BUCKET", "ml-models")
    s3 = boto3.client("s3")
    
    s3_key = f"suggestion-scoring/{version}/model.txt"
    
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
    s3.download_fileobj(model_bucket, s3_key, tmp)
    tmp.close()
    
    model = lgb.Booster(model_file=tmp.name)
    
    # Clean up temp file
    os.unlink(tmp.name)
    
    return model


def _evict_oldest_from_cache():
    """Evict oldest entry from cache (LRU)."""
    global _model_cache, _explainer_cache, _cache_metadata
    
    if not _cache_metadata:
        return
    
    # Find oldest
    oldest_version = min(
        _cache_metadata.keys(),
        key=lambda v: _cache_metadata[v]["last_access"]
    )
    
    # Remove from cache
    del _model_cache[oldest_version]
    del _explainer_cache[oldest_version]
    del _cache_metadata[oldest_version]
    
    logger.info(f"Evicted model {oldest_version} from cache")


def clear_cache():
    """Clear all cached models and explainers."""
    global _model_cache, _explainer_cache, _cache_metadata
    
    _model_cache.clear()
    _explainer_cache.clear()
    _cache_metadata.clear()
    
    logger.info("Cleared model and explainer cache")


def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics."""
    return {
        "num_cached_models": len(_model_cache),
        "cached_versions": list(_model_cache.keys()),
        "cache_size_limit": SHAP_CACHE_SIZE,
        "caching_enabled": ENABLE_SHAP_CACHING,
    }


# =============================================================================
# FASTAPI INTEGRATION
# =============================================================================

def create_explain_endpoint_response(
    request_features: Dict[str, float],
    model_version: str,
    top_k: int,
) -> Dict[str, Any]:
    """
    Create response for FastAPI /explain endpoint.
    
    Args:
        request_features: Features from request
        model_version: Requested model version
        top_k: Number of top contributors
        
    Returns:
        Dict ready for ExplainResponse
    """
    import time
    
    # Get model and predict
    model, _ = load_model_and_explainer(model_version)
    
    x = pd.DataFrame([request_features])
    if hasattr(model, "feature_name"):
        x = x.reindex(columns=model.feature_name(), fill_value=0.0)
    
    score = float(model.predict(x)[0])
    score = max(0.0, min(1.0, score))
    
    # Get explanation
    explanation = explain_single_prediction(
        request_features,
        model_version,
        top_k=top_k,
        return_base_value=True,
    )
    
    return {
        "model_version": model_version if model_version != "latest" else get_active_model_version(),
        "ml_score": round(score, 4),
        "top_contributors": explanation["contributors"],
        "base_value": explanation.get("base_value", 0.5),
        "explanation_method": "shap",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
