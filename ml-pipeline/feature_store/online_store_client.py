"""
CargoBit Feature Store - Online Store Client
=============================================

High-performance client for real-time feature retrieval from Feast Online Store.
Optimized for low-latency (<10ms) feature serving.

Architecture:
    - Redis Online Store for real-time serving
    - Batch retrieval for multiple entities
    - Caching layer for hot entities
    - Circuit breaker for fault tolerance

Usage:
    client = OnlineStoreClient()
    features = await client.get_features(
        entity_keys=[{"customer_id": "cust_123", "driver_id": "drv_456"}],
        feature_service="scoring_features"
    )

Author: CargoBit ML Team
Version: 2.0.0
"""

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Any, Dict, List, Optional, Union

import numpy as np
import pandas as pd
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION
# =============================================================================

@dataclass
class OnlineStoreConfig:
    """Configuration for Online Store Client."""
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_db: int = int(os.getenv("REDIS_DB", "0"))
    redis_password: Optional[str] = os.getenv("REDIS_PASSWORD")
    
    # Performance settings
    connection_pool_size: int = 10
    timeout_ms: int = 100
    max_retries: int = 3
    
    # Cache settings
    local_cache_ttl_seconds: int = 60
    local_cache_max_size: int = 10000
    
    # Circuit breaker
    circuit_breaker_threshold: int = 5
    circuit_breaker_reset_seconds: int = 30


# =============================================================================
# MODELS
# =============================================================================

class FeatureVector(BaseModel):
    """Single feature vector response."""
    entity_key: Dict[str, str]
    features: Dict[str, Any]
    timestamp: datetime
    latency_ms: float
    source: str = "redis"  # redis, cache, fallback


class BatchFeatureResponse(BaseModel):
    """Batch feature retrieval response."""
    vectors: List[FeatureVector]
    total_latency_ms: float
    cache_hits: int
    cache_misses: int
    errors: int


# =============================================================================
# FEATURE STORE CLIENT
# =============================================================================

class OnlineStoreClient:
    """
    High-performance client for Feast Online Store.
    
    Features:
        - Async/await for non-blocking operations
        - Connection pooling for efficiency
        - Local LRU cache for hot entities
        - Circuit breaker for fault tolerance
        - Metrics collection for monitoring
    """
    
    def __init__(self, config: Optional[OnlineStoreConfig] = None):
        self.config = config or OnlineStoreConfig()
        self._redis_client = None
        self._feast_store = None
        self._cache: Dict[str, tuple] = {}  # Simple cache
        self._circuit_breaker_failures = 0
        self._circuit_breaker_open = False
        self._circuit_breaker_opened_at: Optional[datetime] = None
        
        # Metrics
        self._requests_total = 0
        self._requests_success = 0
        self._requests_cache_hit = 0
        self._total_latency_ms = 0.0
    
    async def initialize(self):
        """Initialize connections to Redis and Feast."""
        try:
            # Initialize Redis client
            import redis.asyncio as redis
            self._redis_client = redis.Redis(
                host=self.config.redis_host,
                port=self.config.redis_port,
                db=self.config.redis_db,
                password=self.config.redis_password,
                decode_responses=True,
                socket_timeout=self.config.timeout_ms / 1000,
                socket_connect_timeout=self.config.timeout_ms / 1000,
                max_connections=self.config.connection_pool_size,
            )
            
            # Initialize Feast store
            from feast import FeatureStore
            self._feast_store = FeatureStore(repo_path=".")
            
            logger.info(f"Online Store Client initialized: {self.config.redis_host}:{self.config.redis_port}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Online Store Client: {e}")
            raise
    
    async def close(self):
        """Close connections."""
        if self._redis_client:
            await self._redis_client.close()
    
    async def get_features(
        self,
        entity_keys: List[Dict[str, str]],
        feature_service: str = "scoring_features",
        use_cache: bool = True,
    ) -> BatchFeatureResponse:
        """
        Retrieve features for multiple entities.
        
        Args:
            entity_keys: List of entity key dictionaries
            feature_service: Name of feature service to use
            use_cache: Whether to use local cache
            
        Returns:
            BatchFeatureResponse with feature vectors
        """
        start_time = time.time()
        vectors = []
        cache_hits = 0
        cache_misses = 0
        errors = 0
        
        for entity_key in entity_keys:
            try:
                # Check local cache first
                cache_key = self._make_cache_key(entity_key, feature_service)
                
                if use_cache:
                    cached = self._get_from_cache(cache_key)
                    if cached:
                        vectors.append(FeatureVector(
                            entity_key=entity_key,
                            features=cached["features"],
                            timestamp=datetime.utcnow(),
                            latency_ms=0.1,
                            source="cache"
                        ))
                        cache_hits += 1
                        self._requests_cache_hit += 1
                        continue
                
                # Check circuit breaker
                if self._is_circuit_breaker_open():
                    # Use fallback
                    features = self._get_fallback_features(entity_key)
                    source = "fallback"
                else:
                    # Get from Feast
                    features = await self._get_from_feast(entity_key, feature_service)
                    source = "redis"
                
                # Cache result
                if use_cache and features:
                    self._add_to_cache(cache_key, {"features": features})
                
                vectors.append(FeatureVector(
                    entity_key=entity_key,
                    features=features,
                    timestamp=datetime.utcnow(),
                    latency_ms=(time.time() - start_time) * 1000,
                    source=source
                ))
                cache_misses += 1
                
            except Exception as e:
                logger.error(f"Failed to get features for {entity_key}: {e}")
                errors += 1
                self._record_circuit_breaker_failure()
                
                # Return default features on error
                vectors.append(FeatureVector(
                    entity_key=entity_key,
                    features=self._get_default_features(),
                    timestamp=datetime.utcnow(),
                    latency_ms=(time.time() - start_time) * 1000,
                    source="default"
                ))
        
        self._requests_total += len(entity_keys)
        self._requests_success += len(entity_keys) - errors
        self._total_latency_ms += (time.time() - start_time) * 1000
        
        return BatchFeatureResponse(
            vectors=vectors,
            total_latency_ms=(time.time() - start_time) * 1000,
            cache_hits=cache_hits,
            cache_misses=cache_misses,
            errors=errors
        )
    
    async def get_online_features(
        self,
        entity_df: pd.DataFrame,
        feature_refs: List[str],
    ) -> pd.DataFrame:
        """
        Get online features using Feast's native API.
        
        Args:
            entity_df: DataFrame with entity columns
            feature_refs: List of feature references (e.g., ["customer_features:acceptance_rate_30d"])
            
        Returns:
            DataFrame with features joined
        """
        if self._feast_store is None:
            raise RuntimeError("Feast store not initialized")
        
        try:
            result = self._feast_store.get_online_features(
                features=feature_refs,
                entity_rows=entity_df.to_dict("records"),
            ).to_df()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get online features: {e}")
            raise
    
    async def write_to_online_store(
        self,
        entity_key: Dict[str, str],
        features: Dict[str, Any],
        ttl_seconds: Optional[int] = None,
    ) -> bool:
        """
        Write features directly to online store (Redis).
        
        Args:
            entity_key: Entity key dictionary
            features: Feature dictionary
            ttl_seconds: Optional TTL for the features
            
        Returns:
            True if successful
        """
        try:
            # Construct Redis key
            redis_key = self._make_redis_key(entity_key)
            
            # Serialize features
            value = json.dumps({
                "features": features,
                "timestamp": datetime.utcnow().isoformat(),
            })
            
            # Write to Redis
            if ttl_seconds:
                await self._redis_client.setex(redis_key, ttl_seconds, value)
            else:
                await self._redis_client.set(redis_key, value)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to write to online store: {e}")
            return False
    
    async def _get_from_feast(
        self,
        entity_key: Dict[str, str],
        feature_service: str,
    ) -> Dict[str, Any]:
        """Get features from Feast Online Store."""
        
        if self._feast_store is None:
            raise RuntimeError("Feast store not initialized")
        
        # Get feature service
        service = self._feast_store.get_feature_service(feature_service)
        
        # Convert entity_key to DataFrame
        entity_df = pd.DataFrame([entity_key])
        
        # Get online features
        result = self._feast_store.get_online_features(
            features=service,
            entity_rows=[entity_key],
        ).to_dict()
        
        # Extract features (excluding entity columns)
        features = {}
        for key, values in result.items():
            if key not in entity_key:
                features[key] = values[0] if values else None
        
        return features
    
    def _get_fallback_features(self, entity_key: Dict[str, str]) -> Dict[str, Any]:
        """Get fallback features when online store is unavailable."""
        
        # Try Redis directly
        try:
            import redis
            client = redis.Redis(
                host=self.config.redis_host,
                port=self.config.redis_port,
                db=self.config.redis_db,
                decode_responses=True,
            )
            
            redis_key = self._make_redis_key(entity_key)
            value = client.get(redis_key)
            
            if value:
                data = json.loads(value)
                return data.get("features", {})
                
        except Exception as e:
            logger.warning(f"Fallback Redis read failed: {e}")
        
        # Return default features
        return self._get_default_features()
    
    def _get_default_features(self) -> Dict[str, Any]:
        """Get default/neutral feature values."""
        return {
            "customer_features__acceptance_rate_30d": 0.5,
            "driver_features__acceptance_rate_30d": 0.5,
            "lane_features__acceptance_rate_30d": 0.5,
            "customer_features__credit_rating": 0.5,
            "customer_features__on_time_rate_30d": 0.9,
            "driver_features__rating": 3.0,
            "combined_acceptance_score": 0.5,
            "risk_adjusted_score": 0.5,
            "reliability_score": 0.7,
        }
    
    def _make_cache_key(self, entity_key: Dict[str, str], feature_service: str) -> str:
        """Create cache key from entity and feature service."""
        key_parts = [feature_service] + [f"{k}:{v}" for k, v in sorted(entity_key.items())]
        return "|".join(key_parts)
    
    def _make_redis_key(self, entity_key: Dict[str, str]) -> str:
        """Create Redis key from entity."""
        key_parts = [f"{k}_{v}" for k, v in sorted(entity_key.items())]
        return f"cargobit_features:{'_'.join(key_parts)}"
    
    def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get from local cache if not expired."""
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if datetime.utcnow() - timestamp < timedelta(seconds=self.config.local_cache_ttl_seconds):
                return cached_data
            else:
                del self._cache[cache_key]
        return None
    
    def _add_to_cache(self, cache_key: str, data: Dict[str, Any]):
        """Add to local cache with LRU eviction."""
        if len(self._cache) >= self.config.local_cache_max_size:
            # Evict oldest entry
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]
        
        self._cache[cache_key] = (data, datetime.utcnow())
    
    def _is_circuit_breaker_open(self) -> bool:
        """Check if circuit breaker is open."""
        if not self._circuit_breaker_open:
            return False
        
        # Check if reset time has passed
        if self._circuit_breaker_opened_at:
            elapsed = (datetime.utcnow() - self._circuit_breaker_opened_at).total_seconds()
            if elapsed >= self.config.circuit_breaker_reset_seconds:
                self._circuit_breaker_open = False
                self._circuit_breaker_failures = 0
                return False
        
        return True
    
    def _record_circuit_breaker_failure(self):
        """Record a failure for circuit breaker."""
        self._circuit_breaker_failures += 1
        
        if self._circuit_breaker_failures >= self.config.circuit_breaker_threshold:
            self._circuit_breaker_open = True
            self._circuit_breaker_opened_at = datetime.utcnow()
            logger.warning(f"Circuit breaker opened after {self._circuit_breaker_failures} failures")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get client metrics."""
        return {
            "requests_total": self._requests_total,
            "requests_success": self._requests_success,
            "requests_cache_hit": self._requests_cache_hit,
            "cache_hit_rate": self._requests_cache_hit / max(1, self._requests_total),
            "avg_latency_ms": self._total_latency_ms / max(1, self._requests_total),
            "circuit_breaker_open": self._circuit_breaker_open,
        }


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

# Singleton client
_client: Optional[OnlineStoreClient] = None


async def get_client() -> OnlineStoreClient:
    """Get or create the singleton Online Store client."""
    global _client
    if _client is None:
        _client = OnlineStoreClient()
        await _client.initialize()
    return _client


async def get_scoring_features(
    customer_id: str,
    driver_id: str,
    lane_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Convenience function to get all scoring features for a suggestion.
    
    Returns a flat dictionary of feature values ready for ML model input.
    """
    client = await get_client()
    
    entity_keys = [{"customer_id": customer_id, "driver_id": driver_id}]
    
    if lane_id:
        entity_keys[0]["lane_id"] = lane_id
    if vehicle_id:
        entity_keys[0]["vehicle_id"] = vehicle_id
    
    response = await client.get_features(
        entity_keys=entity_keys,
        feature_service="scoring_features"
    )
    
    if response.vectors:
        return response.vectors[0].features
    
    return {}
