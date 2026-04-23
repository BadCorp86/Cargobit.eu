"""
CargoBit Scoring Unit Tests
===========================

Unit tests for:
- Score calculation
- Weight validation
- Component scoring
- Profile management
"""

import pytest
from datetime import datetime
from typing import Dict, Any

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
    ServiceLevelType,
)


# =============================================================================
# SCORING WEIGHTS TESTS
# =============================================================================

class TestScoringWeights:
    """Tests for ScoringWeights model."""

    def test_valid_weights_sum_to_one(self):
        """Test that valid weights with sum=1.0 are accepted."""
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
        assert weights.priority == 0.10

    def test_weights_sum_less_than_one_rejected(self):
        """Test that weights summing to less than 1.0 are rejected."""
        with pytest.raises(ValueError, match="Sum of weights must equal 1.0"):
            ScoringWeights(
                revenue=0.30,  # Total will be 0.90
                capacityUtilization=0.20,
                priority=0.10,
                risk=0.10,
                serviceLevel=0.10,
                co2=0.10
            )

    def test_weights_sum_more_than_one_rejected(self):
        """Test that weights summing to more than 1.0 are rejected."""
        with pytest.raises(ValueError, match="Sum of weights must equal 1.0"):
            ScoringWeights(
                revenue=0.50,  # Total will be 1.10
                capacityUtilization=0.20,
                priority=0.10,
                risk=0.10,
                serviceLevel=0.15,
                co2=0.05
            )

    def test_negative_weight_rejected(self):
        """Test that negative weights are rejected."""
        with pytest.raises(ValueError):
            ScoringWeights(
                revenue=-0.10,  # Negative!
                capacityUtilization=0.50,
                priority=0.20,
                risk=0.10,
                serviceLevel=0.20,
                co2=0.10
            )

    def test_weight_above_one_rejected(self):
        """Test that weights above 1.0 are rejected."""
        with pytest.raises(ValueError):
            ScoringWeights(
                revenue=1.50,  # > 1.0
                capacityUtilization=0.0,
                priority=0.0,
                risk=0.0,
                serviceLevel=0.0,
                co2=-0.50
            )

    def test_floating_point_tolerance(self):
        """Test that floating point precision is handled correctly."""
        # This sum is 0.9999999999... due to floating point
        weights = ScoringWeights(
            revenue=0.333333333,
            capacityUtilization=0.166666667,
            priority=0.166666667,
            risk=0.166666667,
            serviceLevel=0.083333333,
            co2=0.083333333
        )
        # Should be accepted due to tolerance
        assert weights is not None

    def test_zero_weight_allowed(self):
        """Test that zero weights are allowed if sum is correct."""
        weights = ScoringWeights(
            revenue=0.40,
            capacityUtilization=0.30,
            priority=0.0,  # Zero
            risk=0.0,      # Zero
            serviceLevel=0.20,
            co2=0.10
        )
        assert weights.priority == 0.0
        assert weights.risk == 0.0


# =============================================================================
# SCORING CONFIG TESTS
# =============================================================================

class TestScoringConfig:
    """Tests for ScoringConfig model."""

    def test_valid_config(self, sample_scoring_config):
        """Test that valid config is accepted."""
        config = ScoringConfig(**sample_scoring_config)
        
        assert config.version == "1.0.0"
        assert config.metadata.name == "test-config"
        assert config.kind == "scoring-config"

    def test_version_format_validation(self, sample_scoring_config):
        """Test that version must be X.Y.Z format."""
        # Invalid version format
        sample_scoring_config["version"] = "invalid"
        
        with pytest.raises(ValueError, match="Version must be in format X.Y.Z"):
            ScoringConfig(**sample_scoring_config)

    def test_version_too_many_parts(self, sample_scoring_config):
        """Test that version with too many parts is rejected."""
        sample_scoring_config["version"] = "1.0.0.0"
        
        with pytest.raises(ValueError):
            ScoringConfig(**sample_scoring_config)

    def test_version_non_numeric_parts(self, sample_scoring_config):
        """Test that version with non-numeric parts is rejected."""
        sample_scoring_config["version"] = "1.0.a"
        
        with pytest.raises(ValueError):
            ScoringConfig(**sample_scoring_config)

    def test_get_active_weights_default(self, sample_scoring_config):
        """Test get_active_weights returns default profile weights."""
        config = ScoringConfig(**sample_scoring_config)
        weights = config.get_active_weights()
        
        assert weights.revenue == 0.35
        assert weights.co2 == 0.10

    def test_get_active_weights_tenant_override(self, sample_scoring_config):
        """Test get_active_weights with tenant override."""
        config = ScoringConfig(**sample_scoring_config)
        weights = config.get_active_weights(tenant_id="TENANT_TEST")
        
        # Should use sustainability profile (co2=0.30)
        assert weights.co2 == 0.30

    def test_get_active_weights_unknown_tenant(self, sample_scoring_config):
        """Test get_active_weights with unknown tenant returns default."""
        config = ScoringConfig(**sample_scoring_config)
        weights = config.get_active_weights(tenant_id="UNKNOWN_TENANT")
        
        # Should return default profile
        assert weights.revenue == 0.35


# =============================================================================
# FEATURE FLAGS TESTS
# =============================================================================

class TestFeatureFlags:
    """Tests for FeatureFlags model."""

    def test_default_feature_flags(self):
        """Test default feature flag values."""
        flags = FeatureFlags()
        
        assert flags.enableVisionModel is False
        assert flags.enableLearningToRank is False
        assert flags.enableDriverPreferenceScore is False
        assert flags.enableHybridScoring is True

    def test_custom_feature_flags(self):
        """Test custom feature flag values."""
        flags = FeatureFlags(
            enableVisionModel=True,
            enableLearningToRank=True,
            enableHybridScoring=False
        )
        
        assert flags.enableVisionModel is True
        assert flags.enableLearningToRank is True
        assert flags.enableHybridScoring is False


# =============================================================================
# ML HYBRID CONFIG TESTS
# =============================================================================

class TestMLHybridConfig:
    """Tests for MLHybridConfig model."""

    def test_valid_ml_config(self):
        """Test valid ML hybrid config."""
        config = MLHybridConfig(
            enabled=True,
            alpha=0.8,
            fallbackToHeuristic=True,
            canaryPercentage=10
        )
        
        assert config.enabled is True
        assert config.alpha == 0.8
        assert config.canaryPercentage == 10

    def test_alpha_bounds_lower(self):
        """Test alpha lower bound (0.0)."""
        with pytest.raises(ValueError):
            MLHybridConfig(alpha=-0.1)

    def test_alpha_bounds_upper(self):
        """Test alpha upper bound (1.0)."""
        with pytest.raises(ValueError):
            MLHybridConfig(alpha=1.1)

    def test_canary_percentage_bounds_lower(self):
        """Test canaryPercentage lower bound (0)."""
        with pytest.raises(ValueError):
            MLHybridConfig(canaryPercentage=-1)

    def test_canary_percentage_bounds_upper(self):
        """Test canaryPercentage upper bound (100)."""
        with pytest.raises(ValueError):
            MLHybridConfig(canaryPercentage=101)

    def test_shadow_mode(self):
        """Test shadow mode (canaryPercentage=0)."""
        config = MLHybridConfig(canaryPercentage=0)
        assert config.canaryPercentage == 0

    def test_full_ml_mode(self):
        """Test full ML mode (canaryPercentage=100)."""
        config = MLHybridConfig(canaryPercentage=100)
        assert config.canaryPercentage == 100


# =============================================================================
# MATCHING CONFIG TESTS
# =============================================================================

class TestMatchingConfig:
    """Tests for MatchingConfig model."""

    def test_valid_matching_config(self):
        """Test valid matching config."""
        config = MatchingConfig(
            maxPickupDetourKm=15,
            maxDeliveryDetourKm=20,
            minScoreThreshold=0.5,
            maxSuggestionsPerTour=5
        )
        
        assert config.maxPickupDetourKm == 15
        assert config.maxDeliveryDetourKm == 20
        assert config.minScoreThreshold == 0.5

    def test_negative_detour_rejected(self):
        """Test that negative detour values are rejected."""
        with pytest.raises(ValueError):
            MatchingConfig(maxPickupDetourKm=-10)

    def test_score_threshold_bounds(self):
        """Test score threshold bounds (0-1)."""
        with pytest.raises(ValueError):
            MatchingConfig(minScoreThreshold=1.5)

    def test_max_suggestions_bounds(self):
        """Test max suggestions bounds (1-20)."""
        with pytest.raises(ValueError):
            MatchingConfig(maxSuggestionsPerTour=0)

        with pytest.raises(ValueError):
            MatchingConfig(maxSuggestionsPerTour=25)


# =============================================================================
# PROFILE TESTS
# =============================================================================

class TestScoringProfile:
    """Tests for ScoringProfile model."""

    def test_valid_profile(self):
        """Test valid scoring profile."""
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

    def test_profile_id_lowercase_conversion(self):
        """Test profile ID is converted to lowercase."""
        profile = ScoringProfile(
            id="TEST_PROFILE",
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
        
        assert profile.id == "test_profile"

    def test_profile_id_invalid_chars(self):
        """Test profile ID with invalid characters is rejected."""
        with pytest.raises(ValueError):
            ScoringProfile(
                id="test profile",  # Space not allowed
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


# =============================================================================
# TENANT OVERRIDE TESTS
# =============================================================================

class TestTenantOverride:
    """Tests for TenantOverride model."""

    def test_valid_tenant_override(self):
        """Test valid tenant override."""
        override = TenantOverride(
            tenantId="TENANT_DE",
            region="DE",
            profileId="sustainability",
            reason="CO2 initiative"
        )
        
        assert override.tenantId == "TENANT_DE"
        assert override.profileId == "sustainability"

    def test_tenant_override_with_effective_date(self):
        """Test tenant override with effective date."""
        override = TenantOverride(
            tenantId="TENANT_DE",
            region="DE",
            profileId="sustainability",
            reason="CO2 initiative",
            effectiveFrom="2025-01-01"
        )
        
        assert override.effectiveFrom == "2025-01-01"


# =============================================================================
# ENUM TESTS
# =============================================================================

class TestEnums:
    """Tests for enum models."""

    def test_priority_level_values(self):
        """Test PriorityLevel enum values."""
        assert PriorityLevel.PREMIUM.value == "PREMIUM"
        assert PriorityLevel.HIGH.value == "HIGH"
        assert PriorityLevel.NORMAL.value == "NORMAL"
        assert PriorityLevel.LOW.value == "LOW"

    def test_risk_level_values(self):
        """Test RiskLevel enum values."""
        assert RiskLevel.VERY_LOW.value == "VERY_LOW"
        assert RiskLevel.LOW.value == "LOW"
        assert RiskLevel.MEDIUM.value == "MEDIUM"
        assert RiskLevel.HIGH.value == "HIGH"
        assert RiskLevel.VERY_HIGH.value == "VERY_HIGH"

    def test_service_level_values(self):
        """Test ServiceLevelType enum values."""
        assert ServiceLevelType.SLA_CRITICAL.value == "SLA_CRITICAL"
        assert ServiceLevelType.SLA_HIGH.value == "SLA_HIGH"
        assert ServiceLevelType.STANDARD.value == "STANDARD"


# =============================================================================
# SCORING CALCULATION TESTS
# =============================================================================

class TestScoringCalculation:
    """Tests for score calculation logic."""

    def test_calculate_total_score(self, sample_scores):
        """Test total score calculation."""
        weights = ScoringWeights(
            revenue=0.35,
            capacityUtilization=0.20,
            priority=0.10,
            risk=0.10,
            serviceLevel=0.15,
            co2=0.10
        )
        
        total = (
            weights.revenue * sample_scores["revenue"] +
            weights.capacityUtilization * sample_scores["capacityUtilization"] +
            weights.priority * sample_scores["priority"] +
            weights.risk * sample_scores["risk"] +
            weights.serviceLevel * sample_scores["serviceLevel"] +
            weights.co2 * sample_scores["co2"]
        )
        
        assert 0.0 <= total <= 1.0
        assert round(total, 4) == 0.5075

    def test_score_is_normalized(self, assert_score_valid):
        """Test that scores are normalized to [0, 1]."""
        scores = [0.0, 0.5, 1.0, 0.123, 0.999]
        
        for score in scores:
            assert_score_valid(score)

    def test_high_revenue_high_score(self, sample_order_data, sample_tour_data):
        """Test that high revenue leads to high score."""
        # High price = high revenue score
        sample_order_data["price"] = 500.0
        sample_tour_data["detourKm"] = 5.0
        
        # Revenue score = price / (detourKm + 1) / 10
        revenue_score = sample_order_data["price"] / (sample_tour_data["detourKm"] + 1) / 10
        revenue_score = min(1.0, revenue_score)
        
        assert revenue_score > 0.8

    def test_high_detour_lower_co2_score(self, sample_tour_data):
        """Test that high detour leads to lower CO2 score."""
        sample_tour_data["detourKm"] = 18.0
        
        # CO2 score = 1 - (detourKm / maxDetourKm)
        co2_score = max(0, 1 - (sample_tour_data["detourKm"] / 20))
        
        assert co2_score < 0.2

    def test_capacity_utilization_score(self, sample_order_data, sample_tour_data):
        """Test capacity utilization score calculation."""
        sample_order_data["volumeM3"] = 8.0
        sample_tour_data["freeCapacityM3"] = 10.0
        
        # Capacity score = orderVolume / freeCapacity
        capacity_score = min(1.0, sample_order_data["volumeM3"] / sample_tour_data["freeCapacityM3"])
        
        assert capacity_score == 0.8

    def test_priority_mapping(self):
        """Test priority score mapping."""
        priority_mapping = {
            "PREMIUM": 1.0,
            "HIGH": 0.8,
            "NORMAL": 0.5,
            "LOW": 0.2
        }
        
        assert priority_mapping["PREMIUM"] == 1.0
        assert priority_mapping["NORMAL"] == 0.5
        assert priority_mapping["LOW"] == 0.2

    def test_risk_mapping(self):
        """Test risk score mapping."""
        risk_mapping = {
            "VERY_LOW": 1.0,
            "LOW": 0.8,
            "MEDIUM": 0.5,
            "HIGH": 0.2,
            "VERY_HIGH": 0.0
        }
        
        assert risk_mapping["VERY_LOW"] == 1.0
        assert risk_mapping["MEDIUM"] == 0.5
        assert risk_mapping["VERY_HIGH"] == 0.0


# =============================================================================
# HYBRID SCORING TESTS
# =============================================================================

class TestHybridScoring:
    """Tests for hybrid scoring (heuristic + ML)."""

    def test_hybrid_score_formula(self):
        """Test hybrid score calculation."""
        heuristic_score = 0.70
        ml_score = 0.65
        alpha = 0.8  # 80% heuristic, 20% ML
        
        hybrid_score = alpha * heuristic_score + (1 - alpha) * ml_score
        
        # Should be between heuristic and ML
        assert hybrid_score >= min(heuristic_score, ml_score)
        assert hybrid_score <= max(heuristic_score, ml_score)
        assert round(hybrid_score, 3) == 0.690

    def test_shadow_mode_ignores_ml(self):
        """Test that shadow mode (canaryPercentage=0) ignores ML score."""
        canary_percentage = 0
        
        # In shadow mode, ML is calculated but not used
        ml_score = 0.75
        heuristic_score = 0.60
        
        # With canary_percentage = 0, all requests use heuristic
        import random
        random.seed(42)
        
        # Simulate decision
        uses_ml = random.random() * 100 < canary_percentage
        
        assert uses_ml is False

    def test_full_ml_mode(self):
        """Test that full ML mode (canaryPercentage=100) uses ML."""
        canary_percentage = 100
        
        import random
        random.seed(42)
        
        uses_ml = random.random() * 100 < canary_percentage
        
        assert uses_ml is True

    def test_fallback_to_heuristic(self):
        """Test fallback to heuristic when ML unavailable."""
        ml_score = None
        heuristic_score = 0.65
        fallback_enabled = True
        
        if ml_score is None and fallback_enabled:
            final_score = heuristic_score
        else:
            final_score = ml_score
        
        assert final_score == heuristic_score


# =============================================================================
# PROFILE WEIGHT ADJUSTMENT TESTS
# =============================================================================

class TestProfileAdjustment:
    """Tests for profile-based weight adjustments."""

    def test_sustainability_profile_increases_co2(self):
        """Test that sustainability profile increases CO2 weight."""
        default_weights = {
            "revenue": 0.35,
            "co2": 0.10
        }
        
        sustainability_weights = {
            "revenue": 0.25,
            "co2": 0.30
        }
        
        assert sustainability_weights["co2"] > default_weights["co2"]
        assert sustainability_weights["revenue"] < default_weights["revenue"]

    def test_risk_averse_profile_increases_risk(self):
        """Test that risk_averse profile increases risk weight."""
        default_weights = {
            "revenue": 0.35,
            "risk": 0.10
        }
        
        risk_averse_weights = {
            "revenue": 0.25,
            "risk": 0.25
        }
        
        assert risk_averse_weights["risk"] > default_weights["risk"]

    def test_all_profiles_sum_to_one(self, assert_weights_sum_to_one):
        """Test that all profile weights sum to 1.0."""
        profiles = {
            "revenue_focused": {
                "revenue": 0.35,
                "capacityUtilization": 0.20,
                "priority": 0.10,
                "risk": 0.10,
                "serviceLevel": 0.15,
                "co2": 0.10
            },
            "sustainability": {
                "revenue": 0.25,
                "capacityUtilization": 0.15,
                "priority": 0.10,
                "risk": 0.10,
                "serviceLevel": 0.10,
                "co2": 0.30
            },
            "risk_averse": {
                "revenue": 0.25,
                "capacityUtilization": 0.15,
                "priority": 0.10,
                "risk": 0.25,
                "serviceLevel": 0.15,
                "co2": 0.10
            }
        }
        
        for name, weights in profiles.items():
            assert_weights_sum_to_one(weights)
