"""
CargoBit ML Package
===================

Modulares ML Package für CargoBit Transport Platform.

Modules:
- training: Model Training & Registration
- model_selection: Model Promotion & Selection
- inference: ML Inference Service
- features: Feature Engineering
"""

from .training import train_and_register_model
from .model_selection import promote_best_model

__version__ = "1.0.0"
__all__ = [
    "train_and_register_model",
    "promote_best_model",
]
