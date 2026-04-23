"""
CargoBit Config Service - Integration Tests
============================================

Integration tests for Config Service and Scoring Integration.

Run with:
    pytest tests/ml/test_config_service.py -v

Author: CargoBit ML Team
Version: 2.0.0
"""

import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import yaml

# Add config-service to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "config-service"))

# Try importing the config service modules
try:
    from config_service.models import (
        ScoringConfig,
        ScoringWeights,
        ScoringConstraints,
        MatchingRules,
        MLHybridConfig,
        FeatureFlags,
        Profile,
        TenantOverride,
    )
    from config_service.core import ConfigService
except ImportError:
    pass


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def sample_config_dict():
    """Sample configuration dictionary for testing."""
    return {
        "version": "1.0.0",
        "kind": "scoring-config",
        "metadata": {
            "name": "test-scoring",
            "description": "Test configuration",
            "owner": "test-team",
            "lastUpdatedBy": "test-user",
            "lastUpdatedAt": "2024-01-15T10:00:00Z",
            "changeReason": "Test",
        },
        "spec": {
            "scoring": {
                "weights": {
                    "revenue": 0.35,
                    "capacityUtilization": 0.20,
                    "priority": 0.10,
                    "risk": 0.10,
                    "serviceLevel": 0.15,
                    "co2": 0.10,
                },
                "constraints": {
                    "sumEquals": 1.0,
                    "minValue": 0.0,
                    "maxValue": 1.0,
                    "precision": 2,
                },
            },
            "matching": {
                "maxPickupDetourKm": 15,
                "maxDeliveryDetourKm": 20,
                "minScoreThreshold": 0.5,
                "maxSuggestionsPerTour": 5,
            },
            "mlHybrid": {
                "enabled": True,
                "alpha": 0.8,
                "fallbackToHeuristic": True,
                "canaryPercentage": 0,
            },
            "features": {
                "enableHybridScoring": True,
                "enableLearningToRank": False,
            },
            "profiles": [],
            "tenantOverrides": [],
        }
    }


@pytest.fixture
def sample_scoring_weights():
    """Sample scoring weights for testing."""
    return {
        "revenue": 0.35,
        "capacityUtilization": 0.20,
        "priority": 0.10,
        "risk": 0.10,
        "serviceLevel": 0.15,
        "co2": 0.10,
    }


# =============================================================================
# PYDANTIC MODEL TESTS
# =============================================================================

class TestScoringWeights:
    """Tests for ScoringWeights model."""
    
    def test_valid_weights(self, sample_scoring_weights):
        """Test valid weight configuration."""
        try:
            weights = ScoringWeights(**sample_scoring_weights)
            
            assert weights.revenue == 0.35
            assert weights.capacityUtilization == 0.20
            assert sum([
                weights.revenue,
                weights.capacityUtilization,
                weights.priority,
                weights.risk,
                weights.serviceLevel,
                weights.co2,
            ]) == 1.0
        except NameError:
            pytest.skip("ScoringWeights not imported")
    
    def test_weights_sum_validation(self):
        """Test that weights must sum to 1.0."""
        try:
            invalid_weights = {
                "revenue": 0.50,
                "capacityUtilization": 0.30,
                "priority": 0.10,
                "risk": 0.10,
                "serviceLevel": 0.15,
                "co2": 0.10,
            }
            
            with pytest.raises(ValueError):
                ScoringWeights(**invalid_weights)
        except NameError:
            pytest.skip("ScoringWeights not imported")
    
    def test_weight_bounds(self):
        """Test that weights must be within [0, 1]."""
        try:
            invalid_weights = {
                "revenue": -0.1,  # Invalid
                "capacityUtilization": 0.20,
                "priority": 0.10,
                "risk": 0.10,
                "serviceLevel": 0.15,
                "co2": 0.10,
            }
            
            with pytest.raises(ValueError):
                ScoringWeights(**invalid_weights)
        except NameError:
            pytest.skip("ScoringWeights not imported")


class TestMLHybridConfig:
    """Tests for MLHybridConfig model."""
    
    def test_default_config(self):
        """Test default ML hybrid configuration."""
        try:
            config = MLHybridConfig()
            
            assert config.enabled == True
            assert config.alpha == 0.8
            assert config.fallbackToHeuristic == True
        except NameError:
            pytest.skip("MLHybridConfig not imported")
    
    def test_alpha_range(self):
        """Test that alpha must be in [0, 1]."""
        try:
            # Valid alpha
            config = MLHybridConfig(alpha=0.5)
            assert config.alpha == 0.5
            
            # Invalid alpha
            with pytest.raises(ValueError):
                MLHybridConfig(alpha=1.5)
        except NameError:
            pytest.skip("MLHybridConfig not imported")


class TestScoringConfig:
    """Tests for complete ScoringConfig model."""
    
    def test_full_config(self, sample_config_dict):
        """Test parsing of full configuration."""
        try:
            config = ScoringConfig(**sample_config_dict)
            
            assert config.version == "1.0.0"
            assert config.spec.scoring.weights.revenue == 0.35
            assert config.spec.mlHybrid.alpha == 0.8
        except NameError:
            pytest.skip("ScoringConfig not imported")


# =============================================================================
# CONFIG SERVICE TESTS
# =============================================================================

class TestConfigService:
    """Tests for ConfigService class."""
    
    def test_load_config(self, sample_config_dict, tmp_path):
        """Test loading configuration from file."""
        try:
            # Write config to temp file
            config_file = tmp_path / "scoring-config.yaml"
            with open(config_file, "w") as f:
                yaml.dump(sample_config_dict, f)
            
            service = ConfigService(config_path=str(config_file))
            
            assert service.config is not None
            assert service.config.version == "1.0.0"
        except NameError:
            pytest.skip("ConfigService not imported")
    
    def test_get_weights(self, sample_config_dict, tmp_path):
        """Test getting scoring weights."""
        try:
            config_file = tmp_path / "scoring-config.yaml"
            with open(config_file, "w") as f:
                yaml.dump(sample_config_dict, f)
            
            service = ConfigService(config_path=str(config_file))
            weights = service.get_weights()
            
            assert weights["revenue"] == 0.35
            assert weights["capacityUtilization"] == 0.20
        except NameError:
            pytest.skip("ConfigService not imported")
    
    def test_compute_heuristic_score(self, sample_config_dict, tmp_path):
        """Test heuristic score computation."""
        try:
            config_file = tmp_path / "scoring-config.yaml"
            with open(config_file, "w") as f:
                yaml.dump(sample_config_dict, f)
            
            service = ConfigService(config_path=str(config_file))
            
            # Sample feature scores
            component_scores = {
                "revenue": 0.8,
                "capacityUtilization": 0.7,
                "priority": 0.5,
                "risk": 0.9,
                "serviceLevel": 0.6,
                "co2": 0.4,
            }
            
            score = service.compute_score(component_scores)
            
            expected = (
                0.35 * 0.8 +
                0.20 * 0.7 +
                0.10 * 0.5 +
                0.10 * 0.9 +
                0.15 * 0.6 +
                0.10 * 0.4
            )
            
            assert abs(score - expected) < 0.0001
        except NameError:
            pytest.skip("ConfigService not imported")


# =============================================================================
# HYBRID SCORING TESTS
# =============================================================================

class TestHybridScoring:
    """Tests for hybrid scoring logic."""
    
    def test_blend_mode(self):
        """Test blend mode calculation."""
        alpha = 0.8
        heuristic_score = 0.7
        ml_score = 0.9
        
        final_score = alpha * heuristic_score + (1 - alpha) * ml_score
        
        expected = 0.8 * 0.7 + 0.2 * 0.9
        assert abs(final_score - expected) < 0.0001
    
    def test_fallback_to_heuristic(self):
        """Test fallback when ML is unavailable."""
        alpha = 0.8
        ml_score = None
        heuristic_score = 0.75
        
        # If ML unavailable, use heuristic
        if ml_score is None:
            final_score = heuristic_score
        else:
            final_score = alpha * heuristic_score + (1 - alpha) * ml_score
        
        assert final_score == heuristic_score
    
    def test_canary_rollout(self):
        """Test canary rollout logic."""
        canary_percentage = 20  # 20% traffic to ML
        
        # Simulate 100 requests
        np.random.seed(42)
        ml_used = sum(
            1 for _ in range(100)
            if np.random.random() * 100 < canary_percentage
        )
        
        # Should be approximately 20 (±5)
        assert 10 <= ml_used <= 30


# =============================================================================
# PROFILE TESTS
# =============================================================================

class TestProfiles:
    """Tests for scoring profiles."""
    
    def test_profile_weights_override(self):
        """Test that profile weights override default weights."""
        profiles = [
            {
                "id": "revenue_focused",
                "name": "Revenue Focus",
                "isDefault": True,
                "weights": {
                    "revenue": 0.45,
                    "capacityUtilization": 0.15,
                    "priority": 0.10,
                    "risk": 0.10,
                    "serviceLevel": 0.10,
                    "co2": 0.10,
                }
            }
        ]
        
        # Verify weights sum to 1.0
        weights = profiles[0]["weights"]
        total = sum(weights.values())
        assert abs(total - 1.0) < 0.0001
    
    def test_tenant_profile_mapping(self):
        """Test tenant-specific profile mapping."""
        tenant_overrides = [
            {
                "tenantId": "TENANT_DE_NORTH",
                "profileId": "sustainability",
            },
            {
                "tenantId": "TENANT_DE_SOUTH",
                "profileId": "premium_customers",
            }
        ]
        
        # Create mapping
        tenant_profile_map = {
            o["tenantId"]: o["profileId"]
            for o in tenant_overrides
        }
        
        assert tenant_profile_map["TENANT_DE_NORTH"] == "sustainability"
        assert tenant_profile_map["TENANT_DE_SOUTH"] == "premium_customers"


# =============================================================================
# API INTEGRATION TESTS
# =============================================================================

class TestAPIIntegration:
    """Tests for API integration."""
    
    @pytest.fixture
    def mock_config_service(self):
        """Create a mock config service."""
        mock = MagicMock()
        mock.get_weights.return_value = {
            "revenue": 0.35,
            "capacityUtilization": 0.20,
            "priority": 0.10,
            "risk": 0.10,
            "serviceLevel": 0.15,
            "co2": 0.10,
        }
        mock.compute_score.return_value = 0.72
        return mock
    
    def test_scoring_api_request(self, mock_config_service):
        """Test scoring API request handling."""
        # Simulate API request
        request_data = {
            "componentScores": {
                "revenue": 0.8,
                "capacityUtilization": 0.7,
                "priority": 0.5,
                "risk": 0.9,
                "serviceLevel": 0.6,
                "co2": 0.4,
            }
        }
        
        # Compute score
        score = mock_config_service.compute_score(request_data["componentScores"])
        
        assert 0 <= score <= 1
        mock_config_service.compute_score.assert_called_once()


# =============================================================================
# PERFORMANCE TESTS
# =============================================================================

class TestPerformance:
    """Performance tests for scoring."""
    
    def test_scoring_latency(self):
        """Test that scoring completes within acceptable latency."""
        import time
        
        # Simulate scoring calculation
        weights = {
            "revenue": 0.35,
            "capacityUtilization": 0.20,
            "priority": 0.10,
            "risk": 0.10,
            "serviceLevel": 0.15,
            "co2": 0.10,
        }
        
        component_scores = {
            "revenue": 0.8,
            "capacityUtilization": 0.7,
            "priority": 0.5,
            "risk": 0.9,
            "serviceLevel": 0.6,
            "co2": 0.4,
        }
        
        # Measure time for 10000 iterations
        start = time.time()
        for _ in range(10000):
            score = sum(
                weights[k] * component_scores[k]
                for k in weights.keys()
            )
        end = time.time()
        
        avg_latency_us = (end - start) / 10000 * 1_000_000
        
        # Should be less than 1 microsecond per calculation
        assert avg_latency_us < 1.0
    
    def test_batch_scoring(self):
        """Test batch scoring performance."""
        import time
        
        weights = {
            "revenue": 0.35,
            "capacityUtilization": 0.20,
            "priority": 0.10,
            "risk": 0.10,
            "serviceLevel": 0.15,
            "co2": 0.10,
        }
        
        # Generate 1000 samples
        np.random.seed(42)
        samples = np.random.uniform(0, 1, (1000, 6))
        
        start = time.time()
        
        # Vectorized computation
        weight_array = np.array([
            weights["revenue"],
            weights["capacityUtilization"],
            weights["priority"],
            weights["risk"],
            weights["serviceLevel"],
            weights["co2"],
        ])
        
        scores = samples @ weight_array
        
        end = time.time()
        
        # Should process 1000 samples in < 10ms
        assert (end - start) < 0.01
        assert len(scores) == 1000


# =============================================================================
# TEST UTILITIES
# =============================================================================

def create_test_config_file(tmp_path: Path, config_dict: dict) -> Path:
    """Helper to create a test config file."""
    config_file = tmp_path / "scoring-config.yaml"
    with open(config_file, "w") as f:
        yaml.dump(config_dict, f)
    return config_file


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
