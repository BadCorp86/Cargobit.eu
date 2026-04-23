"""
CargoBit Feature Store Client
=============================

Client for accessing online features from Feast Feature Store.
Provides low-latency (<10ms) feature retrieval for ML scoring.

Usage:
    from feature_store_client import FeatureStoreClient
    
    client = FeatureStoreClient()
    
    # Get online features
    features = client.get_online_features(
        entity_rows=[{"customer_id": "cust_001", "driver_id": "drv_001"}],
        feature_service="scoring_features"
    )

Author: CargoBit ML Team
Version: 3.0.0
"""

import logging
import os
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import numpy as np
import pandas as pd

# Feast imports (will be installed in production)
try:
    from feast import FeatureStore
    FEAST_AVAILABLE = True
except ImportError:
    FEAST_AVAILABLE = False
    logging.warning("Feast not installed. Using mock client for development.")


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class FeatureStoreConfig:
    """Configuration for Feature Store Client."""
    
    # Feast configuration
    repo_path: str = field(default_factory=lambda: os.getenv("FEAST_REPO_PATH", "./feature_repo"))
    
    # Redis configuration (for direct access if needed)
    redis_host: str = field(default_factory=lambda: os.getenv("REDIS_HOST", "localhost"))
    redis_port: int = field(default_factory=lambda: int(os.getenv("REDIS_PORT", "6379")))
    
    # Performance settings
    timeout_ms: int = 100
    max_retries: int = 3
    batch_size: int = 100
    
    # Feature services
    default_feature_service: str = "scoring_features"
    
    # Caching
    enable_cache: bool = True
    cache_ttl_seconds: int = 300  # 5 minutes


# =============================================================================
# FEATURE STORE CLIENT
# =============================================================================

class FeatureStoreClient:
    """
    Client for accessing Feast Feature Store.
    
    Provides:
    - Online feature retrieval (<10ms latency)
    - Batch feature retrieval for training
    - Feature freshness monitoring
    - Caching for hot entities
    """
    
    def __init__(self, config: Optional[FeatureStoreConfig] = None):
        self.config = config or FeatureStoreConfig()
        self._store: Optional[Any] = None
        self._cache: Dict[str, Any] = {}
        self._metrics = {
            "requests_total": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "latency_sum_ms": 0.0,
            "errors_total": 0,
        }
        
        self._initialize_store()
    
    def _initialize_store(self):
        """Initialize the Feast Feature Store."""
        if not FEAST_AVAILABLE:
            logger.warning("Using mock Feature Store client")
            self._store = MockFeatureStore()
            return
        
        try:
            self._store = FeatureStore(repo_path=self.config.repo_path)
            logger.info(f"Feast Feature Store initialized at {self.config.repo_path}")
        except Exception as e:
            logger.error(f"Failed to initialize Feast: {e}")
            self._store = MockFeatureStore()
    
    def get_online_features(
        self,
        entity_rows: List[Dict[str, Union[str, int]]],
        feature_service: Optional[str] = None,
        features: Optional[List[str]] = None,
    ) -> pd.DataFrame:
        """
        Retrieve online features for the given entities.
        
        Args:
            entity_rows: List of entity dictionaries, e.g.,
                [{"customer_id": "cust_001", "driver_id": "drv_001"}]
            feature_service: Name of feature service to use
            features: List of specific features (if not using feature service)
        
        Returns:
            DataFrame with entity keys and feature values
        
        Example:
            >>> client.get_online_features(
            ...     entity_rows=[{"customer_id": "cust_001"}],
            ...     feature_service="scoring_features"
            ... )
        """
        start_time = time.time()
        self._metrics["requests_total"] += 1
        
        # Check cache first
        if self.config.enable_cache:
            cache_key = self._get_cache_key(entity_rows, feature_service, features)
            if cache_key in self._cache:
                cached_result, cached_time = self._cache[cache_key]
                if time.time() - cached_time < self.config.cache_ttl_seconds:
                    self._metrics["cache_hits"] += 1
                    return cached_result.copy()
        
        self._metrics["cache_misses"] += 1
        
        try:
            # Get features from Feast
            if feature_service:
                fs = self._store.get_feature_service(feature_service)
                result = self._store.get_online_features(
                    features=fs,
                    entity_rows=entity_rows,
                ).to_df()
            elif features:
                result = self._store.get_online_features(
                    features=features,
                    entity_rows=entity_rows,
                ).to_df()
            else:
                raise ValueError("Either feature_service or features must be provided")
            
            # Cache result
            if self.config.enable_cache and cache_key:
                self._cache[cache_key] = (result.copy(), time.time())
            
            # Update metrics
            latency_ms = (time.time() - start_time) * 1000
            self._metrics["latency_sum_ms"] += latency_ms
            
            return result
            
        except Exception as e:
            self._metrics["errors_total"] += 1
            logger.error(f"Failed to get online features: {e}")
            raise
    
    def get_historical_features(
        self,
        entity_df: pd.DataFrame,
        feature_service: Optional[str] = None,
        features: Optional[List[str]] = None,
        full_feature_names: bool = False,
    ) -> pd.DataFrame:
        """
        Retrieve historical features for training.
        
        Args:
            entity_df: DataFrame with entity keys and event_timestamp
            feature_service: Name of feature service
            features: List of specific features
            full_feature_names: Whether to include feature view names
        
        Returns:
            DataFrame with entity keys, timestamps, and feature values
        """
        if not FEAST_AVAILABLE:
            logger.warning("Mock store: returning empty historical features")
            return entity_df.copy()
        
        if feature_service:
            fs = self._store.get_feature_service(feature_service)
            result = self._store.get_historical_features(
                entity_df=entity_df,
                features=fs,
                full_feature_names=full_feature_names,
            ).to_df()
        elif features:
            result = self._store.get_historical_features(
                entity_df=entity_df,
                features=features,
                full_feature_names=full_feature_names,
            ).to_df()
        else:
            raise ValueError("Either feature_service or features must be provided")
        
        return result
    
    def push_online_features(
        self,
        entity_rows: List[Dict[str, Any]],
        feature_view_name: str,
    ) -> None:
        """
        Push features directly to online store (for real-time updates).
        
        Args:
            entity_rows: List of entity dictionaries with feature values
            feature_view_name: Name of the feature view to push to
        """
        if not FEAST_AVAILABLE:
            logger.warning("Mock store: skipping push")
            return
        
        df = pd.DataFrame(entity_rows)
        self._store.push(
            feature_view_name=feature_view_name,
            df=df,
        )
        
        logger.info(f"Pushed {len(entity_rows)} rows to {feature_view_name}")
    
    def materialize_incremental(
        self,
        feature_views: Optional[List[str]] = None,
    ) -> None:
        """
        Materialize incremental features from offline to online store.
        
        Args:
            feature_views: List of feature views to materialize (all if None)
        """
        if not FEAST_AVAILABLE:
            logger.warning("Mock store: skipping materialization")
            return
        
        end_date = datetime.utcnow()
        
        if feature_views:
            for fv in feature_views:
                self._store.materialize_incremental(
                    feature_views=[fv],
                    end_date=end_date,
                )
        else:
            self._store.materialize_incremental(end_date=end_date)
        
        logger.info(f"Materialized features up to {end_date}")
    
    def get_feature_metadata(
        self,
        feature_name: str,
    ) -> Dict[str, Any]:
        """
        Get metadata for a specific feature.
        
        Args:
            feature_name: Name of the feature
        
        Returns:
            Dictionary with feature metadata
        """
        if not FEAST_AVAILABLE:
            return {"name": feature_name, "available": False}
        
        try:
            # Parse feature view and feature name
            parts = feature_name.split(":")
            if len(parts) == 2:
                fv_name, f_name = parts
            else:
                raise ValueError(f"Invalid feature name format: {feature_name}")
            
            fv = self._store.get_feature_view(fv_name)
            
            for feature in fv.features:
                if feature.name == f_name:
                    return {
                        "name": feature_name,
                        "feature_view": fv_name,
                        "type": str(feature.dtype),
                        "available": True,
                        "ttl_seconds": fv.ttl.total_seconds() if fv.ttl else None,
                        "online": fv.online,
                    }
            
            return {"name": feature_name, "available": False}
            
        except Exception as e:
            logger.error(f"Failed to get feature metadata: {e}")
            return {"name": feature_name, "available": False, "error": str(e)}
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get client metrics."""
        metrics = self._metrics.copy()
        if metrics["requests_total"] > 0:
            metrics["avg_latency_ms"] = metrics["latency_sum_ms"] / metrics["requests_total"]
            metrics["cache_hit_rate"] = metrics["cache_hits"] / metrics["requests_total"]
        else:
            metrics["avg_latency_ms"] = 0
            metrics["cache_hit_rate"] = 0
        return metrics
    
    def clear_cache(self):
        """Clear the feature cache."""
        self._cache.clear()
        logger.info("Feature cache cleared")
    
    def _get_cache_key(
        self,
        entity_rows: List[Dict],
        feature_service: Optional[str],
        features: Optional[List[str]],
    ) -> Optional[str]:
        """Generate cache key for the request."""
        if not entity_rows:
            return None
        
        # Create a deterministic key from entities and features
        entity_key = str(sorted(entity_rows[0].items()))
        features_key = feature_service or str(sorted(features or []))
        return f"{entity_key}:{features_key}"


# =============================================================================
# MOCK FEATURE STORE (for development without Feast)
# =============================================================================

class MockFeatureStore:
    """Mock Feature Store for development/testing."""
    
    def __init__(self):
        self._feature_views = {}
        self._feature_services = {}
    
    def get_feature_service(self, name: str):
        """Get a mock feature service."""
        return MockFeatureService(name)
    
    def get_online_features(self, features, entity_rows):
        """Return mock online features."""
        return MockOnlineFeaturesResponse(entity_rows, features)
    
    def get_historical_features(self, entity_df, features, full_feature_names=False):
        """Return mock historical features."""
        return MockHistoricalFeaturesResponse(entity_df)
    
    def get_feature_view(self, name: str):
        """Get a mock feature view."""
        return MockFeatureView(name)
    
    def push(self, feature_view_name, df):
        """Mock push operation."""
        pass
    
    def materialize_incremental(self, feature_views=None, end_date=None):
        """Mock materialization."""
        pass


class MockFeatureService:
    def __init__(self, name: str):
        self.name = name


class MockFeatureView:
    def __init__(self, name: str):
        self.name = name
        self.features = []
        self.ttl = None
        self.online = True


class MockOnlineFeaturesResponse:
    def __init__(self, entity_rows, features):
        self.entity_rows = entity_rows
        self.features = features
    
    def to_df(self) -> pd.DataFrame:
        """Generate mock feature values."""
        rows = []
        for entity in self.entity_rows:
            row = entity.copy()
            # Add mock feature values
            row["acceptance_rate_30d"] = np.random.uniform(0.3, 0.9)
            row["realized_margin_avg_30d"] = np.random.uniform(20, 80)
            row["on_time_rate_30d"] = np.random.uniform(0.7, 1.0)
            row["credit_rating"] = np.random.uniform(0.5, 1.0)
            row["rating"] = np.random.uniform(3.0, 5.0)
            rows.append(row)
        return pd.DataFrame(rows)


class MockHistoricalFeaturesResponse:
    def __init__(self, entity_df):
        self.entity_df = entity_df
    
    def to_df(self) -> pd.DataFrame:
        """Return entity df with mock features."""
        df = self.entity_df.copy()
        df["acceptance_rate_30d"] = np.random.uniform(0.3, 0.9, len(df))
        df["realized_margin_avg_30d"] = np.random.uniform(20, 80, len(df))
        return df


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

# Global client instance
_client: Optional[FeatureStoreClient] = None


def get_client(config: Optional[FeatureStoreConfig] = None) -> FeatureStoreClient:
    """Get or create a global FeatureStoreClient instance."""
    global _client
    if _client is None:
        _client = FeatureStoreClient(config)
    return _client


def get_scoring_features(
    customer_id: str,
    driver_id: str,
    tour_id: Optional[str] = None,
    lane_id: Optional[str] = None,
) -> Dict[str, float]:
    """
    Convenience function to get scoring features for a suggestion.
    
    Args:
        customer_id: Customer ID
        driver_id: Driver ID
        tour_id: Optional tour ID
        lane_id: Optional lane ID
    
    Returns:
        Dictionary of feature values
    """
    client = get_client()
    
    entity_row = {"customer_id": customer_id, "driver_id": driver_id}
    if tour_id:
        entity_row["tour_id"] = tour_id
    if lane_id:
        entity_row["lane_id"] = lane_id
    
    df = client.get_online_features(
        entity_rows=[entity_row],
        feature_service="scoring_features"
    )
    
    if len(df) > 0:
        return df.iloc[0].to_dict()
    return {}


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "FeatureStoreConfig",
    "FeatureStoreClient",
    "MockFeatureStore",
    "get_client",
    "get_scoring_features",
]
