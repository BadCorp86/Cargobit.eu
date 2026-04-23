"""
CargoBit Config Service - Unit Tests
====================================

Tests für:
- Pydantic Models
- Config-Service Core
- API Endpoints
- Scoring Integration
"""

import pytest
import tempfile
import yaml
from pathlib import Path
from datetime import datetime

from config_service.models import (
    ScoringWeights,
    ScoringConfig,
    FeatureFlags,
    MLHybridConfig,
    MatchingConfig,
    ScoringProfile,
    TenantOverride,
    PriorityLevel,
    RiskLevel,
    ConfigValidationResponse,
)
from config_service.core import ConfigService, ConfigValidationError


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def sample_config_dict():
    """Sample config as dictionary."""
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
                    "maxValue": 1.0
                },
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


@pytest.fixture
def sample_config_yaml(sample_config_dict, tmp_path):
    """Sample config as YAML file."""
    config_path = tmp_path / "scoring-config.yaml"
    with open(config_path, 'w') as f:
        yaml.dump(sample_config_dict, f)
    return str(config_path)


# =============================================================================
# MODEL TESTS
# =============================================================================

class TestScoringWeights:
    """Tests für ScoringWeights Model."""
    
    def test_valid_weights(self):
        """Test mit gültigen Gewichten."""
        weights = ScoringWeights(
            revenue=0.35,
            capacityUtilization=0.20,
            priority=0.10,
            risk=0.10,
            serviceLevel=0.15,
            co2=0.10
        )
        assert weights.revenue == 0.35
        assert weights.capacityUtilization == 0.20
    
    def test_weights_sum_validation_success(self):
        """Test: Summe = 1.0 ist gültig."""
        weights = ScoringWeights(
            revenue=0.35,
            capacityUtilization=0.20,
            priority=0.10,
            risk=0.10,
            serviceLevel=0.15,
            co2=0.10
        )
        # Sollte keinen Fehler werfen
        assert weights.model_validate(weights.model_dump())
    
    def test_weights_sum_validation_failure(self):
        """Test: Summe != 1.0 ist ungültig."""
        with pytest.raises(ValueError, match="Sum of weights must equal 1.0"):
            ScoringWeights(
                revenue=0.50,  # Summe wird > 1.0
                capacityUtilization=0.20,
                priority=0.10,
                risk=0.10,
                serviceLevel=0.15,
                co2=0.10
            )
    
    def test_weight_bounds_validation(self):
        """Test: Gewicht außerhalb 0-1 ist ungültig."""
        with pytest.raises(ValueError):
            ScoringWeights(
                revenue=1.5,  # > 1.0
                capacityUtilization=0.0,
                priority=0.0,
                risk=0.0,
                serviceLevel=0.0,
                co2=-0.5  # < 0.0
            )


class TestFeatureFlags:
    """Tests für FeatureFlags Model."""
    
    def test_default_feature_flags(self):
        """Test Default-Werte."""
        flags = FeatureFlags()
        assert flags.enableVisionModel is False
        assert flags.enableLearningToRank is False
        assert flags.enableHybridScoring is True
    
    def test_custom_feature_flags(self):
        """Test mit Custom-Werten."""
        flags = FeatureFlags(
            enableVisionModel=True,
            enableLearningToRank=True
        )
        assert flags.enableVisionModel is True
        assert flags.enableLearningToRank is True


class TestMLHybridConfig:
    """Tests für MLHybridConfig Model."""
    
    def test_valid_ml_config(self):
        """Test mit gültiger ML-Config."""
        config = MLHybridConfig(
            enabled=True,
            alpha=0.8,
            fallbackToHeuristic=True,
            canaryPercentage=10
        )
        assert config.alpha == 0.8
        assert config.canaryPercentage == 10
    
    def test_alpha_bounds(self):
        """Test Alpha-Bounds (0-1)."""
        with pytest.raises(ValueError):
            MLHybridConfig(alpha=1.5)  # > 1.0
        
        with pytest.raises(ValueError):
            MLHybridConfig(alpha=-0.1)  # < 0.0
    
    def test_canary_percentage_bounds(self):
        """Test Canary-Percentage Bounds (0-100)."""
        with pytest.raises(ValueError):
            MLHybridConfig(canaryPercentage=150)  # > 100


class TestScoringProfile:
    """Tests für ScoringProfile Model."""
    
    def test_valid_profile(self):
        """Test mit gültigem Profil."""
        profile = ScoringProfile(
            id="test_profile",
            name="Test Profile",
            isDefault=False,
            weights=ScoringWeights(
                revenue=0.35,
                capacityUtilization=0.20,
                priority=0.10,
                risk=0.10,
                serviceLevel=0.15,
                co2=0.10
            )
        )
        assert profile.id == "test_profile"
        assert profile.isDefault is False
    
    def test_profile_id_validation(self):
        """Test ID-Format-Validierung."""
        with pytest.raises(ValueError):
            ScoringProfile(
                id="invalid-id-with-spaces",  # Spaces nicht erlaubt
                name="Test",
                weights=ScoringWeights(
                    revenue=0.35,
                    capacityUtilization=0.20,
                    priority=0.10,
                    risk=0.10,
                    serviceLevel=0.15,
                    co2=0.10
                )
            )


class TestScoringConfig:
    """Tests für ScoringConfig Model."""
    
    def test_valid_config(self, sample_config_dict):
        """Test mit gültiger Konfiguration."""
        config = ScoringConfig(**sample_config_dict)
        assert config.version == "1.0.0"
        assert config.metadata.name == "test-config"
    
    def test_version_format_validation(self, sample_config_dict):
        """Test Semantic Versioning Validierung."""
        # Ungültiges Format
        sample_config_dict['version'] = "invalid"
        with pytest.raises(ValueError):
            ScoringConfig(**sample_config_dict)
        
        # Zu viele Parts
        sample_config_dict['version'] = "1.0.0.0"
        with pytest.raises(ValueError):
            ScoringConfig(**sample_config_dict)
    
    def test_get_active_weights_default(self, sample_config_dict):
        """Test get_active_weights ohne Tenant."""
        config = ScoringConfig(**sample_config_dict)
        weights = config.get_active_weights()
        assert weights.revenue == 0.35
    
    def test_get_active_weights_with_tenant(self, sample_config_dict):
        """Test get_active_weights mit Tenant-Override."""
        sample_config_dict['spec']['tenantOverrides'] = [
            {
                "tenantId": "TEST_TENANT",
                "region": "DE",
                "profileId": "default",
                "reason": "Test override"
            }
        ]
        config = ScoringConfig(**sample_config_dict)
        weights = config.get_active_weights("TEST_TENANT")
        assert weights is not None


# =============================================================================
# CONFIG SERVICE TESTS
# =============================================================================

class TestConfigService:
    """Tests für ConfigService Core."""
    
    def test_load_config(self, sample_config_yaml):
        """Test Config-Loading."""
        service = ConfigService(config_path=sample_config_yaml)
        config = service.get_config()
        
        assert config is not None
        assert config.version == "1.0.0"
    
    def test_get_weights(self, sample_config_yaml):
        """Test get_weights."""
        service = ConfigService(config_path=sample_config_yaml)
        weights = service.get_active_weights()
        
        assert weights.revenue == 0.35
        assert weights.capacityUtilization == 0.20
    
    def test_get_feature_flags(self, sample_config_yaml):
        """Test get_feature_flags."""
        service = ConfigService(config_path=sample_config_yaml)
        flags = service.get_feature_flags()
        
        assert flags.enableHybridScoring is True
        assert flags.enableVisionModel is False
    
    def test_validate_config_valid(self, sample_config_yaml):
        """Test validate_config mit gültiger Config."""
        service = ConfigService(config_path=sample_config_yaml)
        result = service.validate_config()
        
        assert result.valid is True
        assert len(result.errors) == 0
    
    def test_validate_config_invalid(self, tmp_path):
        """Test validate_config mit ungültiger Config."""
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
                        "revenue": 0.50,  # Summe != 1.0
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
        
        config_path = tmp_path / "invalid-config.yaml"
        with open(config_path, 'w') as f:
            yaml.dump(invalid_config, f)
        
        service = ConfigService(config_path=str(config_path))
        result = service.validate_config()
        
        assert result.valid is False
        assert len(result.errors) > 0
    
    def test_calculate_score(self, sample_config_yaml):
        """Test calculate_score."""
        service = ConfigService(config_path=sample_config_yaml)
        
        scores = {
            'revenue': 0.8,
            'capacityUtilization': 0.6,
            'priority': 0.5,
            'risk': 0.7,
            'serviceLevel': 0.4,
            'co2': 0.9
        }
        
        total = service.calculate_score(scores)
        
        # Manuelle Berechnung
        expected = (
            0.35 * 0.8 +
            0.20 * 0.6 +
            0.10 * 0.5 +
            0.10 * 0.7 +
            0.15 * 0.4 +
            0.10 * 0.9
        )
        
        assert abs(total - expected) < 0.001
    
    def test_health_check(self, sample_config_yaml):
        """Test health_check."""
        service = ConfigService(config_path=sample_config_yaml)
        health = service.health_check()
        
        assert health['status'] == 'healthy'
        assert 'version' in health


# =============================================================================
# API TESTS
# =============================================================================

class TestConfigAPI:
    """Tests für Config Service API."""
    
    @pytest.fixture
    def test_client(self, sample_config_yaml):
        """Create test client."""
        from fastapi.testclient import TestClient
        from config_service.api import app, config_service as global_service
        
        # Override global service
        import config_service.api
        config_service.api.config_service = ConfigService(config_path=sample_config_yaml)
        
        return TestClient(app)
    
    def test_health_endpoint(self, test_client):
        """Test /health endpoint."""
        response = test_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
    
    def test_ready_endpoint(self, test_client):
        """Test /ready endpoint."""
        response = test_client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'ready'
    
    def test_get_config(self, test_client):
        """Test GET /api/v1/config."""
        response = test_client.get("/api/v1/config")
        assert response.status_code == 200
        data = response.json()
        assert data['version'] == '1.0.0'
    
    def test_get_weights(self, test_client):
        """Test GET /api/v1/config/weights."""
        response = test_client.get("/api/v1/config/weights")
        assert response.status_code == 200
        data = response.json()
        assert 'weights' in data
        assert data['weights']['revenue'] == 0.35
    
    def test_get_features(self, test_client):
        """Test GET /api/v1/config/features."""
        response = test_client.get("/api/v1/config/features")
        assert response.status_code == 200
        data = response.json()
        assert 'enableHybridScoring' in data
    
    def test_validate_config(self, test_client):
        """Test POST /api/v1/config/validate."""
        response = test_client.post("/api/v1/config/validate")
        assert response.status_code == 200
        data = response.json()
        assert data['valid'] is True


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

class TestScoringIntegration:
    """Tests für Scoring Integration."""
    
    def test_score_components_calculation(self):
        """Test Score-Komponenten-Berechnung."""
        from config_service.scoring_integration import ScoreComponents
        
        components = ScoreComponents(
            revenue=0.8,
            capacityUtilization=0.6,
            priority=0.5,
            risk=0.7,
            serviceLevel=0.4,
            co2=0.9
        )
        
        result = components.to_dict()
        assert result['revenue'] == 0.8
        assert result['co2'] == 0.9


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
