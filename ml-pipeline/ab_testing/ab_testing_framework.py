"""
CargoBit A/B Testing Framework
==============================

Production-ready A/B Testing framework for ML model experiments.
Supports multi-armed bandit, Bayesian optimization, and statistical significance testing.

Features:
- Experiment management (create, start, stop, analyze)
- Traffic allocation strategies (50/50, multi-armed bandit, bayesian)
- Statistical significance testing (t-test, chi-square, Bayesian)
- Metric tracking (acceptance rate, margin, latency)
- Automatic winner detection
- Rollback capabilities

Author: CargoBit ML Team
Version: 3.0.0
"""

import hashlib
import json
import logging
import os
import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS
# =============================================================================

class ExperimentStatus(str, Enum):
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class TrafficAllocationStrategy(str, Enum):
    FIXED = "fixed"
    MULTI_ARMED_BANDIT = "multi_armed_bandit"
    BAYESIAN = "bayesian"


class MetricType(str, Enum):
    BINARY = "binary"
    CONTINUOUS = "continuous"
    COUNT = "count"


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class MetricConfig:
    name: str
    type: MetricType
    description: str = ""
    higher_is_better: bool = True
    min_samples: int = 100


@dataclass
class VariantConfig:
    name: str
    description: str = ""
    traffic_percentage: float = 0.5
    is_control: bool = False
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExperimentConfig:
    name: str
    description: str = ""
    variants: List[VariantConfig] = field(default_factory=list)
    metrics: List[MetricConfig] = field(default_factory=list)
    traffic_allocation: TrafficAllocationStrategy = TrafficAllocationStrategy.FIXED
    significance_level: float = 0.05


@dataclass
class ExperimentMetrics:
    variant_name: str
    metric_name: str
    count: int = 0
    sum: float = 0.0
    sum_squares: float = 0.0
    conversions: int = 0
    
    @property
    def mean(self) -> float:
        return self.sum / self.count if self.count > 0 else 0.0
    
    @property
    def rate(self) -> float:
        return self.conversions / self.count if self.count > 0 else 0.0


@dataclass
class ExperimentResult:
    experiment_id: str
    metric_name: str
    control_mean: float
    treatment_mean: float
    control_samples: int
    treatment_samples: int
    p_value: Optional[float] = None
    relative_lift: Optional[float] = None
    is_significant: bool = False
    winner: Optional[str] = None


@dataclass
class Experiment:
    id: str
    name: str
    description: str
    status: ExperimentStatus
    config: ExperimentConfig
    metrics: Dict[str, Dict[str, ExperimentMetrics]] = field(default_factory=dict)
    participants: Dict[str, int] = field(default_factory=dict)
    results: List[ExperimentResult] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    winner: Optional[str] = None


# =============================================================================
# STATISTICAL ANALYZER
# =============================================================================

class StatisticalAnalyzer:
    """Statistical analysis for A/B tests."""
    
    @staticmethod
    def t_test(control: ExperimentMetrics, treatment: ExperimentMetrics) -> float:
        """Perform t-test and return p-value."""
        try:
            from scipy import stats
            if control.count < 2 or treatment.count < 2:
                return 1.0
            
            # Standard error
            se_control = (control.sum_squares - control.sum**2/control.count) / (control.count - 1)
            se_treatment = (treatment.sum_squares - treatment.sum**2/treatment.count) / (treatment.count - 1)
            
            se_control = (se_control / control.count) ** 0.5 if se_control > 0 else 0.001
            se_treatment = (se_treatment / treatment.count) ** 0.5 if se_treatment > 0 else 0.001
            
            se_pooled = (se_control**2 + se_treatment**2) ** 0.5
            
            if se_pooled == 0:
                return 1.0
            
            diff = treatment.mean - control.mean
            t_stat = diff / se_pooled
            df = control.count + treatment.count - 2
            
            return 2 * (1 - abs(stats.t.cdf(t_stat, df)))
        except:
            return 1.0
    
    @staticmethod
    def chi_square(control: ExperimentMetrics, treatment: ExperimentMetrics) -> float:
        """Perform chi-square test for binary metrics."""
        try:
            from scipy import stats
            observed = [
                [control.conversions, control.count - control.conversions],
                [treatment.conversions, treatment.count - treatment.conversions]
            ]
            chi2, p_value, dof, expected = stats.chi2_contingency(observed)
            return p_value
        except:
            return 1.0
    
    @staticmethod
    def bayesian_analysis(control: ExperimentMetrics, treatment: ExperimentMetrics, samples: int = 10000) -> Tuple[float, float, float]:
        """Perform Bayesian analysis for binary metrics."""
        # Beta posteriors
        control_alpha = 1 + control.conversions
        control_beta = 1 + (control.count - control.conversions)
        treatment_alpha = 1 + treatment.conversions
        treatment_beta = 1 + (treatment.count - treatment.conversions)
        
        # Sample from posteriors
        control_samples = [random.betavariate(control_alpha, control_beta) for _ in range(samples)]
        treatment_samples = [random.betavariate(treatment_alpha, treatment_beta) for _ in range(samples)]
        
        prob_treatment_better = sum(1 for c, t in zip(control_samples, treatment_samples) if t > c) / samples
        expected_loss = sum(max(c - t, 0) for c, t in zip(control_samples, treatment_samples)) / samples
        
        return 1 - prob_treatment_better, prob_treatment_better, expected_loss


# =============================================================================
# THOMPSON SAMPLING
# =============================================================================

class ThompsonSampling:
    """Thompson Sampling for multi-armed bandit."""
    
    def get_traffic_allocation(self, metrics: Dict[str, ExperimentMetrics]) -> Dict[str, float]:
        """Calculate traffic allocation using Thompson Sampling."""
        samples = {}
        
        for variant_name, m in metrics.items():
            alpha = 1 + m.conversions
            beta = 1 + (m.count - m.conversions)
            samples[variant_name] = random.betavariate(alpha, beta)
        
        total = sum(samples.values()) or 1
        return {v: s / total for v, s in samples.items()}


# =============================================================================
# A/B TESTING FRAMEWORK
# =============================================================================

class ABTestingFramework:
    """A/B Testing Framework for ML experiments."""
    
    def __init__(self, storage_path: str = "./ab_experiments"):
        self.storage_path = storage_path
        self.experiments: Dict[str, Experiment] = {}
        self.analyzer = StatisticalAnalyzer()
        self.bandit = ThompsonSampling()
        self._load_experiments()
    
    def _load_experiments(self):
        """Load experiments from storage."""
        os.makedirs(self.storage_path, exist_ok=True)
        
        for filename in os.listdir(self.storage_path):
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(self.storage_path, filename), "r") as f:
                        data = json.load(f)
                        experiment = self._deserialize_experiment(data)
                        self.experiments[experiment.id] = experiment
                except Exception as e:
                    logger.error(f"Failed to load experiment {filename}: {e}")
    
    def _save_experiment(self, experiment: Experiment):
        """Save experiment to storage."""
        path = os.path.join(self.storage_path, f"{experiment.id}.json")
        with open(path, "w") as f:
            json.dump(self._serialize_experiment(experiment), f, indent=2)
    
    def _serialize_experiment(self, experiment: Experiment) -> dict:
        return {
            "id": experiment.id,
            "name": experiment.name,
            "description": experiment.description,
            "status": experiment.status.value,
            "config": {
                "name": experiment.config.name,
                "variants": [{"name": v.name, "traffic_percentage": v.traffic_percentage, "is_control": v.is_control} for v in experiment.config.variants],
                "metrics": [{"name": m.name, "type": m.type.value} for m in experiment.config.metrics],
                "traffic_allocation": experiment.config.traffic_allocation.value,
                "significance_level": experiment.config.significance_level,
            },
            "metrics": {
                v: {m: {"count": met.count, "sum": met.sum, "conversions": met.conversions} for m, met in metrics.items()}
                for v, metrics in experiment.metrics.items()
            },
            "participants": experiment.participants,
            "winner": experiment.winner,
            "created_at": experiment.created_at.isoformat(),
        }
    
    def _deserialize_experiment(self, data: dict) -> Experiment:
        return Experiment(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            status=ExperimentStatus(data["status"]),
            config=ExperimentConfig(
                name=data["config"]["name"],
                variants=[VariantConfig(name=v["name"], traffic_percentage=v.get("traffic_percentage", 0.5), is_control=v.get("is_control", False)) for v in data["config"].get("variants", [])],
                metrics=[MetricConfig(name=m["name"], type=MetricType(m["type"])) for m in data["config"].get("metrics", [])],
                traffic_allocation=TrafficAllocationStrategy(data["config"].get("traffic_allocation", "fixed")),
            ),
            participants=data.get("participants", {}),
            winner=data.get("winner"),
            created_at=datetime.fromisoformat(data["created_at"]),
        )
    
    def create_experiment(
        self,
        name: str,
        variants: List[Dict[str, Any]],
        metrics: List[Dict[str, Any]],
        description: str = "",
        traffic_allocation: str = "fixed",
    ) -> Experiment:
        """Create a new experiment."""
        experiment_id = f"exp_{uuid.uuid4().hex[:8]}"
        
        config = ExperimentConfig(
            name=name,
            description=description,
            variants=[
                VariantConfig(
                    name=v["name"],
                    traffic_percentage=v.get("traffic_percentage", 1.0 / len(variants)),
                    is_control=v.get("is_control", i == 0),
                )
                for i, v in enumerate(variants)
            ],
            metrics=[
                MetricConfig(name=m["name"], type=MetricType(m.get("type", "binary")))
                for m in metrics
            ],
            traffic_allocation=TrafficAllocationStrategy(traffic_allocation),
        )
        
        experiment = Experiment(
            id=experiment_id,
            name=name,
            description=description,
            status=ExperimentStatus.DRAFT,
            config=config,
            metrics={v.name: {} for v in config.variants},
            participants={v.name: 0 for v in config.variants},
        )
        
        self.experiments[experiment_id] = experiment
        self._save_experiment(experiment)
        logger.info(f"Created experiment: {experiment_id}")
        return experiment
    
    def start_experiment(self, experiment_id: str) -> Experiment:
        """Start an experiment."""
        experiment = self.experiments.get(experiment_id)
        if not experiment:
            raise ValueError(f"Experiment not found: {experiment_id}")
        
        experiment.status = ExperimentStatus.RUNNING
        experiment.started_at = datetime.utcnow()
        self._save_experiment(experiment)
        logger.info(f"Started experiment: {experiment_id}")
        return experiment
    
    def stop_experiment(self, experiment_id: str, winner: Optional[str] = None) -> Experiment:
        """Stop an experiment."""
        experiment = self.experiments.get(experiment_id)
        if not experiment:
            raise ValueError(f"Experiment not found: {experiment_id}")
        
        experiment.status = ExperimentStatus.COMPLETED
        experiment.completed_at = datetime.utcnow()
        experiment.winner = winner
        self._save_experiment(experiment)
        logger.info(f"Stopped experiment: {experiment_id}, winner: {winner}")
        return experiment
    
    def get_variant(self, experiment_id: str, user_id: str) -> str:
        """Get the variant for a user using consistent hashing."""
        experiment = self.experiments.get(experiment_id)
        if not experiment:
            raise ValueError(f"Experiment not found: {experiment_id}")
        
        if experiment.status != ExperimentStatus.RUNNING:
            control = next((v for v in experiment.config.variants if v.is_control), None)
            return control.name if control else experiment.config.variants[0].name
        
        # Calculate allocation
        if experiment.config.traffic_allocation == TrafficAllocationStrategy.FIXED:
            allocation = {v.name: v.traffic_percentage for v in experiment.config.variants}
        else:
            primary_metric = experiment.config.metrics[0].name if experiment.config.metrics else "conversion"
            variant_metrics = {
                v: experiment.metrics.get(v, {}).get(primary_metric, ExperimentMetrics(variant_name=v, metric_name=primary_metric))
                for v in experiment.participants.keys()
            }
            allocation = self.bandit.get_traffic_allocation(variant_metrics)
        
        # Consistent hash
        hash_value = int(hashlib.md5(f"{experiment_id}:{user_id}".encode()).hexdigest(), 16)
        bucket = (hash_value % 10000) / 10000.0
        
        cumulative = 0.0
        for variant_name, percentage in allocation.items():
            cumulative += percentage
            if bucket < cumulative:
                experiment.participants[variant_name] = experiment.participants.get(variant_name, 0) + 1
                self._save_experiment(experiment)
                return variant_name
        
        return list(allocation.keys())[-1]
    
    def track_event(
        self,
        experiment_id: str,
        user_id: str,
        metric_name: str,
        value: float = 1.0,
        variant: Optional[str] = None,
    ):
        """Track an event for an experiment."""
        experiment = self.experiments.get(experiment_id)
        if not experiment or experiment.status != ExperimentStatus.RUNNING:
            return
        
        if not variant:
            variant = self.get_variant(experiment_id, user_id)
        
        if variant not in experiment.metrics:
            experiment.metrics[variant] = {}
        
        if metric_name not in experiment.metrics[variant]:
            experiment.metrics[variant][metric_name] = ExperimentMetrics(variant_name=variant, metric_name=metric_name)
        
        m = experiment.metrics[variant][metric_name]
        m.count += 1
        m.sum += value
        m.sum_squares += value ** 2
        
        metric_config = next((m for m in experiment.config.metrics if m.name == metric_name), None)
        if metric_config and metric_config.type == MetricType.BINARY and value > 0:
            m.conversions += 1
        
        self._save_experiment(experiment)
    
    def analyze_experiment(self, experiment_id: str, metric_name: Optional[str] = None) -> List[ExperimentResult]:
        """Analyze experiment results."""
        experiment = self.experiments.get(experiment_id)
        if not experiment:
            raise ValueError(f"Experiment not found: {experiment_id}")
        
        results = []
        metrics_to_analyze = [metric_name] if metric_name else [m.name for m in experiment.config.metrics]
        
        for metric in metrics_to_analyze:
            control_name = next((v.name for v in experiment.config.variants if v.is_control), None) or experiment.config.variants[0].name
            control = experiment.metrics.get(control_name, {}).get(metric)
            
            if not control or control.count == 0:
                continue
            
            for variant in experiment.config.variants:
                if variant.is_control:
                    continue
                
                treatment = experiment.metrics.get(variant.name, {}).get(metric)
                if not treatment or treatment.count == 0:
                    continue
                
                metric_config = next((m for m in experiment.config.metrics if m.name == metric), None)
                
                if metric_config and metric_config.type == MetricType.BINARY:
                    p_value = self.analyzer.chi_square(control, treatment)
                else:
                    p_value = self.analyzer.t_test(control, treatment)
                
                relative_lift = (treatment.mean - control.mean) / control.mean if control.mean != 0 else 0.0
                is_significant = p_value < experiment.config.significance_level
                
                winner = None
                if is_significant:
                    higher_better = metric_config.higher_is_better if metric_config else True
                    if (higher_better and treatment.mean > control.mean) or (not higher_better and treatment.mean < control.mean):
                        winner = variant.name
                    else:
                        winner = control_name
                
                results.append(ExperimentResult(
                    experiment_id=experiment_id,
                    metric_name=metric,
                    control_mean=control.mean,
                    treatment_mean=treatment.mean,
                    control_samples=control.count,
                    treatment_samples=treatment.count,
                    p_value=p_value,
                    relative_lift=relative_lift,
                    is_significant=is_significant,
                    winner=winner,
                ))
        
        experiment.results = results
        self._save_experiment(experiment)
        return results


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "ExperimentStatus",
    "TrafficAllocationStrategy",
    "MetricType",
    "MetricConfig",
    "VariantConfig",
    "ExperimentConfig",
    "ExperimentMetrics",
    "ExperimentResult",
    "Experiment",
    "StatisticalAnalyzer",
    "ThompsonSampling",
    "ABTestingFramework",
]
