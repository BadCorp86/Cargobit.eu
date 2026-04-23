"""
CargoBit ML Package - Training Module
=====================================

Model Training und Registration für Suggestion Scoring.

Usage:
    from my_ml_package.training import train_and_register_model
    
    result = train_and_register_model(
        dataset_table="ml_training_dataset",
        registry_table="ml_model_registry",
    )
"""

import logging
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import from parent training module
from training.train_and_register_model import (
    train_and_register_model as _train_and_register_model,
    TrainingConfig,
)

logger = logging.getLogger(__name__)


def train_and_register_model(
    dataset_table: str,
    registry_table: str,
    snapshot_date: str = None,
    **kwargs
):
    """
    Trainiert ein ML-Modell und registriert es in der Model Registry.
    
    Args:
        dataset_table: Name der Training-Dataset-Tabelle
        registry_table: Name der Model-Registry-Tabelle
        snapshot_date: Optional: Datum des Training-Datasets
        
    Returns:
        Dict mit Training-Ergebnissen:
        - model_version: Version des trainierten Modells
        - metrics: Dict mit Metriken (auc, ndcg_10, etc.)
        - training_samples: Anzahl Training-Samples
        - feature_count: Anzahl Features
    """
    logger.info(f"Starting model training from {dataset_table}")
    
    config = TrainingConfig()
    
    # Override config with kwargs
    for key, value in kwargs.items():
        if hasattr(config, key.upper()):
            setattr(config, key.upper(), value)
    
    result = _train_and_register_model(
        dataset_table=dataset_table,
        registry_table=registry_table,
        snapshot_date=snapshot_date,
        config=config,
    )
    
    logger.info(f"Training complete: {result['model_version']}")
    logger.info(f"Metrics: AUC={result['metrics']['auc']:.4f}, "
                f"NDCG@10={result['metrics'].get('ndcg_10', 0):.4f}")
    
    return result
