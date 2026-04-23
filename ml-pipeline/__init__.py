"""
CargoBit ML Pipeline - Main Module
===================================

Production-ready ML Pipeline für CargoBit Transport Platform.

Components:
- etl/kafka_ingestion.py: Kafka → Warehouse Ingestion
- serving/inference_api.py: FastAPI ML Inference Service
- training/train_and_register_model.py: Model Training
- sql/: SQL Scripts for Feature Engineering

Author: CargoBit ML Team
Version: 2.0.0
"""

__version__ = "2.0.0"

# Pipeline Components
from etl.kafka_ingestion import (
    ingest_events_from_kafka_to_warehouse,
    map_generated_event,
    map_outcome_event,
    write_batch,
)

from serving.inference_api import (
    app,
    InferenceEngine,
    ModelLoader,
    ScoreRequest,
    ScoreResponse,
    ExplainRequest,
    ExplainResponse,
    FeatureContribution,
)

from training.train_and_register_model import (
    train_and_register_model,
    promote_best_model,
    TrainingConfig,
)

__all__ = [
    # ETL
    "ingest_events_from_kafka_to_warehouse",
    "map_generated_event",
    "map_outcome_event",
    "write_batch",
    
    # Serving
    "app",
    "InferenceEngine",
    "ModelLoader",
    "ScoreRequest",
    "ScoreResponse",
    "ExplainRequest",
    "ExplainResponse",
    "FeatureContribution",
    
    # Training
    "train_and_register_model",
    "promote_best_model",
    "TrainingConfig",
]
