"""
CargoBit Scoring Service - Config Integration
==============================================

Integration zwischen Config-Service und Scoring-Service.
Ermöglicht:
- Dynamisches Nachladen der Scoring-Konfiguration
- Hybrid-Scoring (Heuristik + ML)
- Feature-Flag-basierte Steuerung
"""

import httpx
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import asyncio
import json

from .models import (
    ScoringWeights,
    FeatureFlags,
    MLHybridConfig,
    PriorityLevel,
    RiskLevel,
    ServiceLevelType,
)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ScoreComponents:
    """Einzelne Score-Komponenten."""
    revenue: float
    capacityUtilization: float
    priority: float
    risk: float
    serviceLevel: float
    co2: float
    
    def to_dict(self) -> Dict[str, float]:
        return {
            'revenue': self.revenue,
            'capacityUtilization': self.capacityUtilization,
            'priority': self.priority,
            'risk': self.risk,
            'serviceLevel': self.serviceLevel,
            'co2': self.co2
        }


@dataclass
class ScoringResult:
    """Ergebnis der Scoring-Berechnung."""
    totalScore: float
    heuristicScore: float
    mlScore: Optional[float]
    components: ScoreComponents
    weights: ScoringWeights
    shapContributions: Optional[Dict[str, float]]
    metadata: Dict[str, Any]


# =============================================================================
# CONFIG CLIENT
# =============================================================================

class ConfigServiceClient:
    """
    Client für die Kommunikation mit dem Config-Service.
    
    Features:
    - HTTP-basierte Kommunikation
    - Caching mit TTL
    - Retry-Logik
    - Fallback auf Default-Werte
    """
    
    def __init__(
        self,
        base_url: str = "http://config-service:8080",
        cache_ttl_seconds: int = 60,
        timeout_seconds: float = 5.0,
        max_retries: int = 3
    ):
        self.base_url = base_url.rstrip('/')
        self.cache_ttl = cache_ttl_seconds
        self.timeout = timeout_seconds
        self.max_retries = max_retries
        
        # Cache
        self._cache: Dict[str, Tuple[Any, datetime]] = {}
        
        # HTTP Client
        self._client = httpx.AsyncClient(timeout=timeout_seconds)
    
    async def _get_cached(self, key: str) -> Optional[Any]:
        """Holt Wert aus Cache wenn noch gültig."""
        if key in self._cache:
            value, timestamp = self._cache[key]
            age = (datetime.utcnow() - timestamp).total_seconds()
            if age < self.cache_ttl:
                return value
        return None
    
    def _set_cache(self, key: str, value: Any) -> None:
        """Setzt Wert im Cache."""
        self._cache[key] = (value, datetime.utcnow())
    
    async def _fetch_with_retry(self, url: str) -> Dict[str, Any]:
        """Fetch mit Retry-Logik."""
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                response = await self._client.get(url)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(0.5 * (attempt + 1))  # Exponential backoff
        
        raise ConnectionError(f"Failed to fetch from config service: {last_error}")
    
    async def get_weights(
        self,
        tenant_id: Optional[str] = None,
        profile_id: Optional[str] = None
    ) -> ScoringWeights:
        """
        Holt die aktiven Scoring-Gewichte.
        
        Args:
            tenant_id: Optional Tenant-ID für Override
            profile_id: Optional Profile-ID
            
        Returns:
            ScoringWeights
        """
        cache_key = f"weights:{tenant_id}:{profile_id}"
        cached = await self._get_cached(cache_key)
        if cached:
            return ScoringWeights(**cached)
        
        # Build URL
        url = f"{self.base_url}/api/v1/config/weights"
        params = {}
        if tenant_id:
            params['tenant_id'] = tenant_id
        if profile_id:
            params['profile_id'] = profile_id
        
        response = await self._fetch_with_retry(f"{url}?{'&'.join(f'{k}={v}' for k, v in params.items())}" if params else url)
        weights = ScoringWeights(**response['weights'])
        
        self._set_cache(cache_key, response['weights'])
        return weights
    
    async def get_feature_flags(self) -> FeatureFlags:
        """Holt die aktuellen Feature-Flags."""
        cache_key = "features"
        cached = await self._get_cached(cache_key)
        if cached:
            return FeatureFlags(**cached)
        
        response = await self._fetch_with_retry(f"{self.base_url}/api/v1/config/features")
        features = FeatureFlags(**response)
        
        self._set_cache(cache_key, response)
        return features
    
    async def get_ml_hybrid_config(self) -> MLHybridConfig:
        """Holt die ML-Hybrid-Konfiguration."""
        cache_key = "ml_hybrid"
        cached = await self._get_cached(cache_key)
        if cached:
            return MLHybridConfig(**cached)
        
        response = await self._fetch_with_retry(f"{self.base_url}/api/v1/config/ml-hybrid")
        config = MLHybridConfig(**response)
        
        self._set_cache(cache_key, response)
        return config
    
    async def calculate_score(
        self,
        scores: Dict[str, float],
        tenant_id: Optional[str] = None,
        profile_id: Optional[str] = None
    ) -> float:
        """
        Berechnet den gewichteten Gesamt-Score via Config-Service.
        
        Args:
            scores: Dictionary mit Teil-Scores
            tenant_id: Optional Tenant-ID
            profile_id: Optional Profile-ID
            
        Returns:
            Gewichteter Gesamt-Score
        """
        url = f"{self.base_url}/api/v1/scoring/calculate"
        payload = {
            "scores": scores,
            "tenantId": tenant_id,
            "profileId": profile_id
        }
        
        response = await self._client.post(url, json=payload)
        response.raise_for_status()
        return response.json()['totalScore']
    
    def invalidate_cache(self) -> None:
        """Leert den gesamten Cache."""
        self._cache.clear()
    
    async def close(self) -> None:
        """Schließt den HTTP-Client."""
        await self._client.aclose()


# =============================================================================
# SCORING SERVICE
# =============================================================================

class HybridScoringService:
    """
    Hybrid Scoring Service für CargoBit.
    
    Kombiniert heuristische Scores mit ML-Predictions:
    final_score = alpha * heuristic_score + (1 - alpha) * ml_score
    
    Features:
    - Config-basierte Gewichtungen
    - Hybrid-Scoring mit Feature-Flags
    - SHAP-Explainability
    - Fallback bei ML-Ausfall
    """
    
    def __init__(
        self,
        config_client: ConfigServiceClient,
        ml_service_url: str = "http://ml-scoring-service:8081"
    ):
        self.config_client = config_client
        self.ml_service_url = ml_service_url
        self._http_client = httpx.AsyncClient(timeout=5.0)
    
    async def _calculate_heuristic_score(
        self,
        order_data: Dict[str, Any],
        tour_data: Dict[str, Any],
        weights: ScoringWeights
    ) -> Tuple[float, ScoreComponents]:
        """
        Berechnet den heuristischen Score.
        
        Args:
            order_data: Auftragsdaten
            tour_data: Tourdaten
            weights: Scoring-Gewichte
            
        Returns:
            Tuple aus Gesamt-Score und Einzel-Komponenten
        """
        # Revenue Score
        price = order_data.get('price', 0)
        detour_km = tour_data.get('detourKm', 0)
        revenue_score = min(1.0, price / (detour_km + 1) / 10)  # Normalisiert auf 0-1
        
        # Capacity Utilization Score
        order_volume = order_data.get('volumeM3', 0)
        free_capacity = tour_data.get('freeCapacityM3', 1)
        capacity_score = min(1.0, order_volume / free_capacity)
        
        # Priority Score
        priority = order_data.get('priority', 'NORMAL')
        priority_mapping = {
            'PREMIUM': 1.0,
            'HIGH': 0.8,
            'NORMAL': 0.5,
            'LOW': 0.2
        }
        priority_score = priority_mapping.get(priority, 0.5)
        
        # Risk Score
        risk_level = order_data.get('riskLevel', 'MEDIUM')
        risk_mapping = {
            'VERY_LOW': 1.0,
            'LOW': 0.8,
            'MEDIUM': 0.5,
            'HIGH': 0.2,
            'VERY_HIGH': 0.0
        }
        risk_score = risk_mapping.get(risk_level, 0.5)
        
        # Service Level Score
        service_level = order_data.get('serviceLevel', 'STANDARD')
        service_mapping = {
            'SLA_CRITICAL': 1.0,
            'SLA_HIGH': 0.7,
            'STANDARD': 0.3
        }
        service_score = service_mapping.get(service_level, 0.3)
        
        # CO2 Score
        max_detour = 20
        co2_score = max(0, 1 - (detour_km / max_detour))
        
        components = ScoreComponents(
            revenue=revenue_score,
            capacityUtilization=capacity_score,
            priority=priority_score,
            risk=risk_score,
            serviceLevel=service_score,
            co2=co2_score
        )
        
        # Gewichteter Gesamt-Score
        total_score = (
            weights.revenue * revenue_score +
            weights.capacityUtilization * capacity_score +
            weights.priority * priority_score +
            weights.risk * risk_score +
            weights.serviceLevel * service_score +
            weights.co2 * co2_score
        )
        
        return total_score, components
    
    async def _get_ml_score(
        self,
        order_data: Dict[str, Any],
        tour_data: Dict[str, Any]
    ) -> Tuple[Optional[float], Optional[Dict[str, float]]]:
        """
        Holt den ML-Score vom ML-Service.
        
        Returns:
            Tuple aus ML-Score und SHAP-Contributions
        """
        try:
            payload = {
                "order": order_data,
                "tour": tour_data
            }
            
            response = await self._http_client.post(
                f"{self.ml_service_url}/score",
                json=payload
            )
            response.raise_for_status()
            
            data = response.json()
            return data.get('score'), data.get('shap_values')
            
        except httpx.HTTPError as e:
            print(f"ML service unavailable: {e}")
            return None, None
    
    async def score(
        self,
        order_data: Dict[str, Any],
        tour_data: Dict[str, Any],
        tenant_id: Optional[str] = None,
        profile_id: Optional[str] = None
    ) -> ScoringResult:
        """
        Berechnet den hybrid-gewichteten Score.
        
        Args:
            order_data: Auftragsdaten
            tour_data: Tourdaten
            tenant_id: Optional Tenant-ID
            profile_id: Optional Profile-ID
            
        Returns:
            ScoringResult mit allen Details
        """
        # Hole Konfiguration
        weights = await self.config_client.get_weights(tenant_id, profile_id)
        features = await self.config_client.get_feature_flags()
        ml_config = await self.config_client.get_ml_hybrid_config()
        
        # Berechne heuristischen Score
        heuristic_score, components = await self._calculate_heuristic_score(
            order_data, tour_data, weights
        )
        
        # ML-Score wenn aktiviert
        ml_score = None
        shap_values = None
        
        if features.enableHybridScoring and ml_config.enabled:
            ml_score, shap_values = await self._get_ml_score(order_data, tour_data)
        
        # Hybrid-Berechnung
        if ml_score is not None:
            # Canary-Check: Nur für definierten Prozentsatz ML verwenden
            import random
            if random.random() * 100 < ml_config.canaryPercentage:
                total_score = (
                    ml_config.alpha * heuristic_score +
                    (1 - ml_config.alpha) * ml_score
                )
            else:
                # Shadow Mode: ML-Score wird berechnet aber nicht verwendet
                total_score = heuristic_score
        elif ml_config.fallbackToHeuristic:
            # Fallback auf Heuristik
            total_score = heuristic_score
        else:
            # Kein Fallback -> Fehler
            raise RuntimeError("ML service unavailable and fallback disabled")
        
        return ScoringResult(
            totalScore=round(total_score, 4),
            heuristicScore=round(heuristic_score, 4),
            mlScore=round(ml_score, 4) if ml_score else None,
            components=components,
            weights=weights,
            shapContributions=shap_values,
            metadata={
                'tenantId': tenant_id,
                'profileId': profile_id,
                'hybridEnabled': features.enableHybridScoring,
                'alpha': ml_config.alpha,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
    
    async def close(self) -> None:
        """Schließt alle Clients."""
        await self._http_client.aclose()
        await self.config_client.close()


# =============================================================================
# SYNC WRAPPER (für einfachere Integration)
# =============================================================================

class SyncScoringClient:
    """
    Synchroner Client für Scoring-Berechnungen.
    
    Usage:
        client = SyncScoringClient()
        result = client.score(order_data, tour_data)
    """
    
    def __init__(self, config_service_url: str = "http://config-service:8080"):
        self._config_client = ConfigServiceClient(config_service_url)
        self._scoring_service = HybridScoringService(self._config_client)
    
    def score(
        self,
        order_data: Dict[str, Any],
        tour_data: Dict[str, Any],
        tenant_id: Optional[str] = None
    ) -> float:
        """
        Berechnet den Gesamt-Score (synchron).
        
        Returns:
            Gesamt-Score (0-1)
        """
        async def _score():
            result = await self._scoring_service.score(
                order_data, tour_data, tenant_id
            )
            return result.totalScore
        
        return asyncio.run(_score())
    
    def score_detailed(
        self,
        order_data: Dict[str, Any],
        tour_data: Dict[str, Any],
        tenant_id: Optional[str] = None
    ) -> ScoringResult:
        """
        Berechnet den detaillierten Score (synchron).
        
        Returns:
            ScoringResult mit allen Details
        """
        async def _score():
            return await self._scoring_service.score(
                order_data, tour_data, tenant_id
            )
        
        return asyncio.run(_score())
