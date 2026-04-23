"""
CargoBit ML Model Training Script
=================================

Train and export ML models for the inference service.
Creates pickled model files that can be loaded by ml-inference service.

Usage:
    # Train and set as stable
    python train_model.py --version v2026-04-19
    
    # Train and set as canary
    python train_model.py --version v2026-05-01 --set-canary
    
    # Train and promote to stable (full rollout)
    python train_model.py --version v2026-05-01 --set-stable
"""

import argparse
import json
import joblib
import numpy as np
from pathlib import Path
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.metrics import classification_report

# ============================================
# FEATURE DEFINITION (11 features from CargoBit)
# ============================================

FEATURE_NAMES = [
    "job_weight_kg",
    "capacity_ratio",
    "dist_km",
    "route_match",
    "exp_match",
    "lang_match",
    "rating",
    "past_jobs",
    "cancel_rate",
    "same_region",
    "hour_of_day"
]

# ============================================
# SYNTHETIC TRAINING DATA GENERATOR
# ============================================

def generate_synthetic_data(n_samples: int = 10000, seed: int = 42):
    """
    Generate synthetic training data for the matching model.
    
    In production, this would be replaced by:
    - export_training_data() from ml-featurestore.service.ts
    - Or direct database query
    """
    np.random.seed(seed)
    
    # Generate features
    X = np.zeros((n_samples, len(FEATURE_NAMES)))
    
    # job_weight_kg: 100 - 25000 kg
    X[:, 0] = np.random.uniform(100, 25000, n_samples)
    
    # capacity_ratio: 0.1 - 1.0
    X[:, 1] = np.random.uniform(0.1, 1.0, n_samples)
    
    # dist_km: 10 - 2000 km
    X[:, 2] = np.random.uniform(10, 2000, n_samples)
    
    # route_match: 0 or 1
    X[:, 3] = np.random.randint(0, 2, n_samples)
    
    # exp_match: 0 or 1
    X[:, 4] = np.random.randint(0, 2, n_samples)
    
    # lang_match: 0 or 1
    X[:, 5] = np.random.randint(0, 2, n_samples)
    
    # rating: 1.0 - 5.0
    X[:, 6] = np.random.uniform(1.0, 5.0, n_samples)
    
    # past_jobs: 0 - 500
    X[:, 7] = np.random.randint(0, 501, n_samples)
    
    # cancel_rate: 0.0 - 0.5
    X[:, 8] = np.random.uniform(0.0, 0.5, n_samples)
    
    # same_region: 0 or 1
    X[:, 9] = np.random.randint(0, 2, n_samples)
    
    # hour_of_day: 0 - 23
    X[:, 10] = np.random.randint(0, 24, n_samples)
    
    # Generate labels based on feature logic
    # Higher rating, lower cancel rate, route/exp/lang match -> better match
    y = (
        (X[:, 6] > 3.5) &                    # Good rating
        (X[:, 8] < 0.2) &                    # Low cancel rate
        ((X[:, 3] + X[:, 4] + X[:, 5]) >= 1) # At least one match
    ).astype(int)
    
    # Add some noise
    noise = np.random.random(n_samples) < 0.1
    y = np.where(noise, 1 - y, y)
    
    return X, y

# ============================================
# MODEL TRAINING
# ============================================

def train_model(X, y, model_type: str = "rf"):
    """Train a classifier model"""
    
    if model_type == "rf":
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
    elif model_type == "gb":
        model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
    elif model_type == "lr":
        model = LogisticRegression(max_iter=1000, random_state=42)
    else:
        raise ValueError(f"Unknown model type: {model_type}")
    
    # Cross-validation
    scores = cross_val_score(model, X, y, cv=5, scoring='f1')
    print(f"Cross-validation F1 scores: {scores.mean():.3f} (+/- {scores.std() * 2:.3f})")
    
    # Train on full data
    model.fit(X, y)
    
    # Set feature names for inference service
    model.feature_names_in_ = np.array(FEATURE_NAMES)
    
    return model

# ============================================
# MODEL SAVING WITH REGISTRY UPDATE
# ============================================

def save_model(
    model,
    version: str,
    model_dir: Path = Path("models"),
    set_stable: bool = False,
    set_canary: bool = False,
    canary_traffic: float = None
):
    """
    Save model and update registry with canary support.
    
    Args:
        model: Trained model
        version: Model version string (e.g., v2026-04-19)
        model_dir: Directory to save models
        set_stable: Set this version as stable (full rollout)
        set_canary: Set this version as canary
        canary_traffic: Traffic percentage for canary (0.0 - 1.0)
    """
    model_dir.mkdir(exist_ok=True)
    registry_path = model_dir.parent / "model_registry.json"
    
    # Save model
    model_path = model_dir / f"{version}.pkl"
    joblib.dump(model, model_path)
    print(f"Model saved: {model_path}")
    
    # Load or create registry
    if registry_path.exists():
        registry = json.loads(registry_path.read_text())
    else:
        registry = {
            "stable": version,
            "canary": version,
            "canaryTraffic": 0.0,
            "models": []
        }
    
    # Add to models list if not present
    if version not in registry["models"]:
        registry["models"].append(version)
    
    # Update stable/canary configuration
    if set_stable:
        registry["stable"] = version
        # Optionally reset canary traffic
        if canary_traffic is not None:
            registry["canaryTraffic"] = canary_traffic
        else:
            registry["canaryTraffic"] = 0.0
        print(f"Set {version} as STABLE (canaryTraffic={registry['canaryTraffic']})")
    
    if set_canary:
        registry["canary"] = version
        if canary_traffic is not None:
            registry["canaryTraffic"] = canary_traffic
        else:
            registry["canaryTraffic"] = registry.get("canaryTraffic", 0.1)
        print(f"Set {version} as CANARY (canaryTraffic={registry['canaryTraffic']})")
    
    # If neither specified, just add to available models
    if not set_stable and not set_canary:
        print(f"Added {version} to available models (not promoted)")
    
    # Save registry
    registry_path.write_text(json.dumps(registry, indent=2))
    print(f"Registry updated: {registry_path}")
    
    return model_path


def print_rollout_guide():
    """Print canary rollout guide"""
    print("""
╔══════════════════════════════════════════════════════════════════╗
║              CANARY ROLLOUT GUIDE                                ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  1. Train new model as canary:                                   ║
║     python train_model.py --version v2026-05-01 --set-canary     ║
║                                                                  ║
║  2. Start with 5% traffic:                                       ║
║     python train_model.py --version v2026-05-01 --set-canary \\   ║
║       --canary-traffic 0.05                                      ║
║                                                                  ║
║  3. Monitor metrics (scores, latency, errors)                    ║
║                                                                  ║
║  4. Gradually increase traffic:                                  ║
║     curl -X PATCH http://ml-inference-svc/registry \\            ║
║       -d '{"canaryTraffic": 0.1}'                                ║
║                                                                  ║
║  5. When satisfied, promote to stable:                           ║
║     python train_model.py --version v2026-05-01 --set-stable     ║
║                                                                  ║
║  6. If issues, rollback:                                         ║
║     curl -X PATCH http://ml-inference-svc/registry \\            ║
║       -d '{"canaryTraffic": 0.0}'                                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
""")


# ============================================
# MAIN
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description="Train CargoBit ML model with canary support",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Train and add to available models
  python train_model.py --version v2026-05-01
  
  # Train and set as canary (10% traffic)
  python train_model.py --version v2026-05-01 --set-canary
  
  # Train and set as canary with 5% traffic
  python train_model.py --version v2026-05-01 --set-canary --canary-traffic 0.05
  
  # Promote to stable (full rollout)
  python train_model.py --version v2026-05-01 --set-stable
"""
    )
    parser.add_argument(
        "--version",
        default=f"v{datetime.now().strftime('%Y-%m-%d')}",
        help="Model version (default: today's date)"
    )
    parser.add_argument(
        "--model-type",
        choices=["rf", "gb", "lr"],
        default="rf",
        help="Model type: rf (RandomForest), gb (GradientBoosting), lr (LogisticRegression)"
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=10000,
        help="Number of synthetic samples"
    )
    parser.add_argument(
        "--set-stable",
        action="store_true",
        help="Set this version as stable (full rollout)"
    )
    parser.add_argument(
        "--set-canary",
        action="store_true",
        help="Set this version as canary"
    )
    parser.add_argument(
        "--canary-traffic",
        type=float,
        default=None,
        help="Canary traffic percentage (0.0 - 1.0)"
    )
    parser.add_argument(
        "--show-guide",
        action="store_true",
        help="Show canary rollout guide"
    )
    
    args = parser.parse_args()
    
    if args.show_guide:
        print_rollout_guide()
        return
    
    print(f"\n{'='*60}")
    print(f"CargoBit ML Model Training (with Canary Support)")
    print(f"{'='*60}")
    print(f"Version: {args.version}")
    print(f"Model type: {args.model_type}")
    print(f"Training samples: {args.samples}")
    print(f"Set as stable: {args.set_stable}")
    print(f"Set as canary: {args.set_canary}")
    if args.canary_traffic is not None:
        print(f"Canary traffic: {args.canary_traffic * 100:.0f}%")
    
    # Generate data
    print("\nGenerating training data...")
    X, y = generate_synthetic_data(args.samples)
    print(f"Positive samples: {y.sum()} ({y.mean()*100:.1f}%)")
    
    # Train model
    print("\nTraining model...")
    model = train_model(X, y, args.model_type)
    
    # Feature importance (for tree-based models)
    if hasattr(model, 'feature_importances_'):
        print("\nFeature importance:")
        for name, imp in sorted(zip(FEATURE_NAMES, model.feature_importances_), key=lambda x: -x[1]):
            print(f"  {name}: {imp:.4f}")
    
    # Save model
    print("\nSaving model...")
    save_model(
        model,
        args.version,
        set_stable=args.set_stable,
        set_canary=args.set_canary,
        canary_traffic=args.canary_traffic
    )
    
    print(f"\n{'='*60}")
    print("Training complete!")
    print(f"{'='*60}\n")
    
    # Show next steps
    if not args.set_stable and not args.set_canary:
        print("Next steps:")
        print(f"  To set as canary: python train_model.py --version {args.version} --set-canary")
        print(f"  To set as stable: python train_model.py --version {args.version} --set-stable")


if __name__ == "__main__":
    main()
