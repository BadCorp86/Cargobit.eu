"""
CargoBit Config Service API Integration Tests
==============================================

Integration tests for Config Service REST API:
- Health endpoints
- Config endpoints
- Scoring endpoints
- Versioning endpoints
"""

import json
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
import yaml
from fastapi.testclient import TestClient


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def test_config_yaml():
    """Create a test config YAML file."""
    config = {
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
                "constraints": {"sumEquals": 1.0, "minValue": 0.0, "maxValue": 1.0},
                "components": {}
            },
            "matching": {
                "maxPickupDetourKm": 15,
                "maxDeliveryDetourKm": 20,
                "minScoreThreshold": 0.5,
                "maxSuggestionsPerTour": 5,
                "timeWindowToleranceMinutes": 30,
                "minVolumeFreeM3": 0.5,
                "minWeightFreeKg": 100
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
                }
            ],
            "tenantOverrides": [],
            "audit": {
                "logAllScoringDecisions": True,
                "retentionDays": 90,
                "includeExplainability": True
            }
        }
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
        yaml.dump(config, f)
        yield f.name
    
    os.unlink(f.name)


@pytest.fixture
def api_client(test_config_yaml):
    """Create test client for Config Service API."""
    # Import and override config service
    from config_service.api import app, config_service
    
    # Create a new config service with test config
    from config_service.core import ConfigService
    test_service = ConfigService(config_path=test_config_yaml)
    
    # Patch the global config service
    with patch('config_service.api.config_service', test_service):
        client = TestClient(app)
        yield client


# =============================================================================
# HEALTH ENDPOINT TESTS
# =============================================================================

@pytest.mark.integration
class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_health_endpoint_returns_200(self, api_client):
        """Test /health returns 200 for healthy service."""
        response = api_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    def test_ready_endpoint_returns_200(self, api_client):
        """Test /ready returns 200 when service is ready."""
        response = api_client.get("/ready")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"

    def test_status_endpoint_returns_details(self, api_client):
        """Test /status returns detailed status."""
        response = api_client.get("/status")
        
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "features" in data
        assert "mlHybrid" in data


# =============================================================================
# CONFIG ENDPOINT TESTS
# =============================================================================

@pytest.mark.integration
class TestConfigEndpoints:
    """Tests for config management endpoints."""

    def test_get_config_returns_current_config(self, api_client):
        """Test GET /api/v1/config returns current configuration."""
        response = api_client.get("/api/v1/config")
        
        assert response.status_code == 200
        data = response.json()
        assert data["version"] == "1.0.0"
        assert data["kind"] == "scoring-config"
        assert "spec" in data

    def test_get_weights_returns_current_weights(self, api_client):
        """Test GET /api/v1/config/weights returns weights."""
        response = api_client.get("/api/v1/config/weights")
        
        assert response.status_code == 200
        data = response.json()
        assert "weights" in data
        assert data["weights"]["revenue"] == 0.35
        assert data["weights"]["co2"] == 0.10

    def test_get_weights_with_tenant_id(self, api_client):
        """Test GET /api/v1/config/weights with tenant_id parameter."""
        response = api_client.get("/api/v1/config/weights?tenant_id=TENANT_TEST")
        
        assert response.status_code == 200
        data = response.json()
        assert "weights" in data

    def test_get_features_returns_feature_flags(self, api_client):
        """Test GET /api/v1/config/features returns feature flags."""
        response = api_client.get("/api/v1/config/features")
        
        assert response.status_code == 200
        data = response.json()
        assert "enableHybridScoring" in data
        assert data["enableHybridScoring"] is True

    def test_get_ml_hybrid_config(self, api_client):
        """Test GET /api/v1/config/ml-hybrid returns ML config."""
        response = api_client.get("/api/v1/config/ml-hybrid")
        
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is True
        assert data["alpha"] == 0.8

    def test_get_matching_config(self, api_client):
        """Test GET /api/v1/config/matching returns matching rules."""
        response = api_client.get("/api/v1/config/matching")
        
        assert response.status_code == 200
        data = response.json()
        assert data["maxPickupDetourKm"] == 15
        assert data["minScoreThreshold"] == 0.5


# =============================================================================
# VALIDATION ENDPOINT TESTS
# =============================================================================

@pytest.mark.integration
class TestValidationEndpoints:
    """Tests for config validation endpoints."""

    def test_validate_current_config(self, api_client):
        """Test POST /api/v1/config/validate validates current config."""
        response = api_client.post("/api/v1/config/validate")
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["weightsSum"] == 1.0

    def test_validate_custom_config_valid(self, api_client):
        """Test validation of a valid custom config."""
        valid_config = {
            "version": "1.0.0",
            "kind": "scoring-config",
            "metadata": {
                "name": "test",
                "description": "test",
                "owner": "test",
                "lastUpdatedBy": "test",
                "lastUpdatedAt": "2025-01-01T00:00:00Z",
                "tags": []
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
                    }
                },
                "matching": {},
                "features": {},
                "mlHybrid": {},
                "profiles": [],
                "tenantOverrides": [],
                "audit": {}
            }
        }
        
        response = api_client.post("/api/v1/config/validate", json=valid_config)
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True

    def test_validate_custom_config_invalid_weights(self, api_client):
        """Test validation rejects invalid weights."""
        invalid_config = {
            "version": "1.0.0",
            "kind": "scoring-config",
            "metadata": {
                "name": "test",
                "description": "test",
                "owner": "test",
                "lastUpdatedBy": "test",
                "lastUpdatedAt": "2025-01-01T00:00:00Z",
                "tags": []
            },
            "spec": {
                "scoring": {
                    "weights": {
                        "revenue": 0.50,  # Sum will be > 1.0
                        "capacityUtilization": 0.20,
                        "priority": 0.10,
                        "risk": 0.10,
                        "serviceLevel": 0.15,
                        "co2": 0.10
                    }
                },
                "matching": {},
                "features": {},
                "mlHybrid": {},
                "profiles": [],
                "tenantOverrides": [],
                "audit": {}
            }
        }
        
        response = api_client.post("/api/v1/config/validate", json=invalid_config)
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert len(data["errors"]) > 0


# =============================================================================
# SCORING ENDPOINT TESTS
# =============================================================================

@pytest.mark.integration
class TestScoringEndpoints:
    """Tests for scoring calculation endpoints."""

    def test_calculate_score(self, api_client):
        """Test POST /api/v1/scoring/calculate calculates score."""
        payload = {
            "scores": {
                "revenue": 0.8,
                "capacityUtilization": 0.6,
                "priority": 0.5,
                "risk": 0.7,
                "serviceLevel": 0.4,
                "co2": 0.9
            }
        }
        
        response = api_client.post("/api/v1/scoring/calculate", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "totalScore" in data
        assert "weights" in data
        assert "breakdown" in data
        assert 0.0 <= data["totalScore"] <= 1.0

    def test_calculate_score_with_tenant(self, api_client):
        """Test score calculation with tenant override."""
        payload = {
            "scores": {
                "revenue": 0.8,
                "capacityUtilization": 0.6,
                "priority": 0.5,
                "risk": 0.7,
                "serviceLevel": 0.4,
                "co2": 0.9
            },
            "tenantId": "TENANT_TEST"
        }
        
        response = api_client.post("/api/v1/scoring/calculate", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["totalScore"] is not None


# =============================================================================
# PROFILE ENDPOINT TESTS
# =============================================================================

@pytest.mark.integration
class TestProfileEndpoints:
    """Tests for profile management endpoints."""

    def test_get_profiles(self, api_client):
        """Test GET /api/v1/config/profiles returns profiles."""
        response = api_client.get("/api/v1/config/profiles")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["id"] == "default"

    def test_get_profile_by_id(self, api_client):
        """Test GET /api/v1/config/profiles/{id} returns specific profile."""
        response = api_client.get("/api/v1/config/profiles/default")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "default"
        assert data["isDefault"] is True

    def test_get_profile_not_found(self, api_client):
        """Test GET /api/v1/config/profiles/{id} returns 404 for unknown profile."""
        response = api_client.get("/api/v1/config/profiles/unknown_profile")
        
        assert response.status_code == 404


# =============================================================================
# TENANT ENDPOINT TESTS
# =============================================================================

@pytest.mark.integration
class TestTenantEndpoints:
    """Tests for tenant override endpoints."""

    def test_get_tenants(self, api_client):
        """Test GET /api/v1/config/tenants returns tenant overrides."""
        response = api_client.get("/api/v1/config/tenants")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# =============================================================================
# ERROR HANDLING TESTS
# =============================================================================

@pytest.mark.integration
class TestErrorHandling:
    """Tests for error handling."""

    def test_404_for_unknown_endpoint(self, api_client):
        """Test 404 for unknown endpoint."""
        response = api_client.get("/api/v1/unknown")
        
        assert response.status_code == 404

    def test_422_for_invalid_request_body(self, api_client):
        """Test 422 for invalid request body."""
        response = api_client.post(
            "/api/v1/scoring/calculate",
            json={"invalid": "body"}
        )
        
        assert response.status_code == 422

    def test_method_not_allowed(self, api_client):
        """Test 405 for wrong HTTP method."""
        response = api_client.delete("/api/v1/config")
        
        assert response.status_code == 405


# =============================================================================
# RESPONSE FORMAT TESTS
# =============================================================================

@pytest.mark.integration
class TestResponseFormat:
    """Tests for response format consistency."""

    def test_json_content_type(self, api_client):
        """Test that responses are JSON."""
        response = api_client.get("/api/v1/config")
        
        assert response.headers["content-type"] == "application/json"

    def test_cors_headers(self, api_client):
        """Test CORS headers are present."""
        response = api_client.options("/api/v1/config")
        
        # CORS middleware should add these headers
        assert "access-control-allow-origin" in response.headers or response.status_code == 200
