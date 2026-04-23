"""
CargoBit Test Configuration - Pytest Fixtures
==============================================

Zentrale Fixtures für alle Tests:
- Database fixtures
- Config fixtures
- Scoring fixtures
- Mock services
"""

import asyncio
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Generator, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import yaml

# =============================================================================
# Event Loop
# =============================================================================

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# =============================================================================
# Config Fixtures
# =============================================================================

@pytest.fixture
def sample_scoring_config() -> Dict[str, Any]:
    """Sample scoring configuration for tests."""
    return {
        "version": "1.0.0",
        "kind": "scoring-config",
        "metadata": {
            "name": "test-config",
            "description": "Test configuration",
            "owner": "test-team",
            "lastUpdatedBy": "test-user",
            "lastUpdatedAt": "2025-01-01T00:00:00Z",
            "tags": ["test"]
        },
        "spec": {
            "scoring": {
                "weights": {
                    "revenue": 0.35,
                    "capacityUtilization": 0.20,
                    "priority": 0.10,
                    "risk": 0.10,
                    "serviceLevel": 0.15,
                    "co2": 0.10
                },
                "constraints": {
                    "sumEquals": 1.0,
                    "minValue": 0.0,
                    "maxValue": 1.0,
                    "precision": 2
                },
                "components": {
                    "revenue": {
                        "minDetourKm": 0,
                        "maxDetourKm": 20,
                        "formula": "price / (detourKm + 1)"
                    },
                    "capacityUtilization": {
                        "method": "volume",
                        "minVolume": 0.0,
                        "maxVolume": 100.0
                    },
                    "priority": {
                        "mapping": {
                            "PREMIUM": 1.0,
                            "HIGH": 0.8,
                            "NORMAL": 0.5,
                            "LOW": 0.2
                        },
                        "default": "NORMAL"
                    },
                    "risk": {
                        "mapping": {
                            "VERY_LOW": 1.0,
                            "LOW": 0.8,
                            "MEDIUM": 0.5,
                            "HIGH": 0.2,
                            "VERY_HIGH": 0.0
                        },
                        "default": "MEDIUM"
                    },
                    "serviceLevel": {
                        "mapping": {
                            "SLA_CRITICAL": 1.0,
                            "SLA_HIGH": 0.7,
                            "STANDARD": 0.3
                        },
                        "default": "STANDARD"
                    },
                    "co2": {
                        "formula": "1 - (detourKm / maxDetourKm)",
                        "maxDetourKm": 20
                    }
                }
            },
            "matching": {
                "maxPickupDetourKm": 15,
                "maxDeliveryDetourKm": 20,
                "minScoreThreshold": 0.5,
                "maxSuggestionsPerTour": 5
            },
            "features": {
                "enableVisionModel": False,
                "enableLearningToRank": False,
                "enableDriverPreferenceScore": False,
                "enableRiskModelV2": False,
                "enableCO2Optimization": False,
                "enableHybridScoring": True
            },
            "mlHybrid": {
                "enabled": True,
                "alpha": 0.8,
                "fallbackToHeuristic": True,
                "canaryPercentage": 0
            },
            "profiles": [
                {
                    "id": "default",
                    "name": "Default",
                    "isDefault": True,
                    "weights": {
                        "revenue": 0.35,
                        "capacityUtilization": 0.20,
                        "priority": 0.10,
                        "risk": 0.10,
                        "serviceLevel": 0.15,
                        "co2": 0.10
                    }
                },
                {
                    "id": "sustainability",
                    "name": "Nachhaltigkeit",
                    "isDefault": False,
                    "weights": {
                        "revenue": 0.25,
                        "capacityUtilization": 0.15,
                        "priority": 0.10,
                        "risk": 0.10,
                        "serviceLevel": 0.10,
                        "co2": 0.30
                    }
                }
            ],
            "tenantOverrides": [
                {
                    "tenantId": "TENANT_TEST",
                    "region": "DE",
                    "profileId": "sustainability",
                    "reason": "Test override"
                }
            ],
            "audit": {
                "logAllScoringDecisions": True,
                "retentionDays": 90,
                "includeExplainability": True
            }
        }
    }


@pytest.fixture
def config_yaml_file(sample_scoring_config) -> Generator[str, None, None]:
    """Create temporary config YAML file."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
        yaml.dump(sample_scoring_config, f)
        yield f.name
    os.unlink(f.name)


@pytest.fixture
def config_service(config_yaml_file):
    """Create ConfigService instance for tests."""
    from config_service.core import ConfigService
    return ConfigService(config_path=config_yaml_file)


# =============================================================================
# Scoring Fixtures
# =============================================================================

@pytest.fixture
def sample_order_data() -> Dict[str, Any]:
    """Sample order data for scoring tests."""
    return {
        "orderId": "order_test_001",
        "price": 150.0,
        "volumeM3": 5.0,
        "weightKg": 500.0,
        "priority": "NORMAL",
        "riskLevel": "MEDIUM",
        "serviceLevel": "STANDARD",
        "customerId": "cust_001",
        "pickupAddress": {
            "street": "Teststraße 1",
            "city": "Hamburg",
            "postalCode": "20095",
            "country": "DE"
        },
        "deliveryAddress": {
            "street": "Beispielweg 42",
            "city": "Berlin",
            "postalCode": "10115",
            "country": "DE"
        },
        "pickupTime": "2025-04-20T08:00:00Z",
        "deliveryTime": "2025-04-20T14:00:00Z",
    }


@pytest.fixture
def sample_tour_data() -> Dict[str, Any]:
    """Sample tour data for scoring tests."""
    return {
        "tourId": "tour_test_001",
        "driverId": "driver_001",
        "vehicleId": "vehicle_001",
        "freeCapacityM3": 10.0,
        "freeCapacityKg": 1000.0,
        "currentLocation": {
            "lat": 53.5511,
            "lng": 9.9937,
            "city": "Hamburg"
        },
        "detourKm": 12.0,
        "detourMinutes": 25,
        "startTime": "2025-04-20T06:00:00Z",
        "plannedEndTime": "2025-04-20T18:00:00Z",
    }


@pytest.fixture
def sample_scores() -> Dict[str, float]:
    """Sample score components."""
    return {
        "revenue": 0.75,
        "capacityUtilization": 0.50,
        "priority": 0.50,
        "risk": 0.50,
        "serviceLevel": 0.30,
        "co2": 0.40
    }


@pytest.fixture
def sample_shap_values() -> Dict[str, float]:
    """Sample SHAP values for ML explainability."""
    return {
        "price_per_km": 0.05,
        "capacity_fill_rate": 0.03,
        "customer_priority": 0.04,
        "detour_efficiency": -0.02,
        "risk_factor": 0.01,
        "historical_success": 0.02,
        "route_complexity": -0.01,
        "time_window_fit": 0.03
    }


# =============================================================================
# Matching Fixtures
# =============================================================================

@pytest.fixture
def sample_suggestion(sample_order_data, sample_tour_data) -> Dict[str, Any]:
    """Sample matching suggestion."""
    return {
        "id": "sg_test_001",
        "tourId": sample_tour_data["tourId"],
        "orderId": sample_order_data["orderId"],
        "tourName": "Test Tour Hamburg-Berlin",
        "orderName": "Testauftrag 001",
        
        "totalScore": 0.52,
        "heuristicScore": 0.52,
        "mlScore": None,
        
        "components": {
            "revenue": {"score": 0.75, "weight": 0.35, "contribution": 0.2625},
            "capacityUtilization": {"score": 0.50, "weight": 0.20, "contribution": 0.10},
            "priority": {"score": 0.50, "weight": 0.10, "contribution": 0.05},
            "risk": {"score": 0.50, "weight": 0.10, "contribution": 0.05},
            "serviceLevel": {"score": 0.30, "weight": 0.15, "contribution": 0.045},
            "co2": {"score": 0.40, "weight": 0.10, "contribution": 0.04}
        },
        
        "shapContributions": [],
        "detourKm": 12,
        "pickupTime": "08:30",
        "deliveryTime": "14:00",
        "additionalRevenue": 187.50,
        "co2Saved": 4.2,
        
        "status": "pending",
        "createdAt": datetime.utcnow().isoformat(),
        "mlEnabled": False,
        "canaryMode": True
    }


# =============================================================================
# Mock Fixtures
# =============================================================================

@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    mock = MagicMock()
    mock.get.return_value = None
    mock.set.return_value = True
    mock.delete.return_value = 1
    mock.exists.return_value = 0
    mock.ping.return_value = True
    return mock


@pytest.fixture
def mock_postgres():
    """Mock PostgreSQL connection."""
    mock = MagicMock()
    mock.execute.return_value = MagicMock()
    mock.fetch.return_value = []
    mock.fetchrow.return_value = None
    return mock


@pytest.fixture
def mock_kafka_producer():
    """Mock Kafka producer."""
    mock = MagicMock()
    mock.send_and_wait.return_value = MagicMock(offset=0, partition=0)
    mock.flush.return_value = None
    return mock


@pytest.fixture
def mock_http_client():
    """Mock HTTP client for external services."""
    mock = AsyncMock()
    mock.get.return_value = MagicMock(
        status_code=200,
        json=lambda: {"success": True}
    )
    mock.post.return_value = MagicMock(
        status_code=200,
        json=lambda: {"success": True}
    )
    return mock


# =============================================================================
# Service Mocks
# =============================================================================

@pytest.fixture
def mock_config_service_client():
    """Mock ConfigServiceClient."""
    mock = AsyncMock()
    mock.get_weights.return_value = {
        "revenue": 0.35,
        "capacityUtilization": 0.20,
        "priority": 0.10,
        "risk": 0.10,
        "serviceLevel": 0.15,
        "co2": 0.10
    }
    mock.get_feature_flags.return_value = {
        "enableHybridScoring": True,
        "enableLearningToRank": False
    }
    mock.get_ml_hybrid_config.return_value = {
        "enabled": True,
        "alpha": 0.8,
        "fallbackToHeuristic": True,
        "canaryPercentage": 0
    }
    return mock


@pytest.fixture
def mock_ml_scoring_service():
    """Mock ML Scoring Service."""
    mock = AsyncMock()
    mock.score.return_value = {
        "score": 0.68,
        "shap_values": {
            "price_per_km": 0.05,
            "capacity_fill_rate": 0.03,
            "customer_priority": 0.04
        },
        "model_version": "v1.2.3"
    }
    return mock


# =============================================================================
# Database Fixtures (for integration tests)
# =============================================================================

@pytest.fixture(scope="session")
def docker_services():
    """Docker services for integration tests."""
    # This would be used with pytest-docker or testcontainers
    # For now, we skip if services are not available
    pytest.skip("Docker services not available")


@pytest.fixture
def test_db_url():
    """Test database URL."""
    return os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql://test:test@localhost:5432/cargobit_test"
    )


@pytest.fixture
def test_redis_url():
    """Test Redis URL."""
    return os.environ.get(
        "TEST_REDIS_URL",
        "redis://localhost:6379/15"
    )


# =============================================================================
# Helper Functions
# =============================================================================

@pytest.fixture
def assert_score_valid():
    """Helper to validate score."""
    def _assert(score: float):
        assert 0.0 <= score <= 1.0, f"Score {score} out of range [0, 1]"
    return _assert


@pytest.fixture
def assert_weights_sum_to_one():
    """Helper to validate weights sum."""
    def _assert(weights: Dict[str, float]):
        total = sum(weights.values())
        assert abs(total - 1.0) < 0.001, f"Weights sum to {total}, expected 1.0"
    return _assert


# =============================================================================
# Test Data Generators
# =============================================================================

@pytest.fixture
def generate_order():
    """Generate test orders."""
    def _generate(**kwargs):
        base = {
            "orderId": f"order_{datetime.utcnow().timestamp()}",
            "price": 100.0,
            "volumeM3": 5.0,
            "priority": "NORMAL",
            "riskLevel": "MEDIUM",
        }
        base.update(kwargs)
        return base
    return _generate


@pytest.fixture
def generate_tour():
    """Generate test tours."""
    def _generate(**kwargs):
        base = {
            "tourId": f"tour_{datetime.utcnow().timestamp()}",
            "freeCapacityM3": 10.0,
            "detourKm": 10.0,
        }
        base.update(kwargs)
        return base
    return _generate
