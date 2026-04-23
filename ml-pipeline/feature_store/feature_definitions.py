"""
CargoBit Feature Store - Feature Definitions
============================================

Uses Feast for feature management:
- Online Store: Redis (real-time serving, <10ms latency)
- Offline Store: S3/Parquet (training, historical data)
- Registry: PostgreSQL

Setup:
    feast apply
    feast materialize-incremental $(date -u +"%Y-%m-%d %H:%M:%S")

Author: CargoBit ML Team
Version: 2.0.0
"""

from datetime import timedelta
from feast import Entity, Feature, FeatureView, FileSource, ValueSource
from feast.value_type import ValueType
from feast.infra.online_stores.redis import RedisOnlineStore
from feast.on_demand_feature_view import on_demand_feature_view


# =============================================================================
# ENTITIES
# =============================================================================

# Customer Entity
customer = Entity(
    name="customer_id",
    value_type=ValueType.STRING,
    description="Unique customer identifier",
    tags={"domain": "logistics", "team": "core"}
)

# Driver Entity
driver = Entity(
    name="driver_id",
    value_type=ValueType.STRING,
    description="Unique driver identifier",
    tags={"domain": "logistics", "team": "core"}
)

# Vehicle Entity
vehicle = Entity(
    name="vehicle_id",
    value_type=ValueType.STRING,
    description="Unique vehicle identifier",
    tags={"domain": "logistics", "team": "core"}
)

# Lane Entity (origin -> destination route)
lane = Entity(
    name="lane_id",
    value_type=ValueType.STRING,
    description="Lane identifier (e.g., DE-BER->DE-HAM)",
    tags={"domain": "logistics", "team": "core"}
)

# Tour Entity (for grouping suggestions)
tour = Entity(
    name="tour_id",
    value_type=ValueType.STRING,
    description="Unique tour identifier",
    tags={"domain": "logistics", "team": "core"}
)


# =============================================================================
# DATA SOURCES
# =============================================================================

# Customer Features Source
customer_features_source = FileSource(
    path="s3://cargobit-feature-store/customer_features/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)

# Driver Features Source
driver_features_source = FileSource(
    path="s3://cargobit-feature-store/driver_features/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)

# Lane Features Source
lane_features_source = FileSource(
    path="s3://cargobit-feature-store/lane_features/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)

# Vehicle Features Source
vehicle_features_source = FileSource(
    path="s3://cargobit-feature-store/vehicle_features/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)

# Tour Context Source (real-time)
tour_context_source = FileSource(
    path="s3://cargobit-feature-store/tour_context/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)


# =============================================================================
# FEATURE VIEWS
# =============================================================================

# Customer Features (Updated Daily)
customer_features = FeatureView(
    name="customer_features",
    entities=[customer],
    ttl=timedelta(days=1),
    features=[
        # === Acceptance Rates ===
        Feature(name="acceptance_rate_7d", dtype=ValueType.FLOAT),
        Feature(name="acceptance_rate_30d", dtype=ValueType.FLOAT),
        Feature(name="acceptance_rate_90d", dtype=ValueType.FLOAT),
        
        # === Margins ===
        Feature(name="realized_margin_avg_7d", dtype=ValueType.FLOAT),
        Feature(name="realized_margin_avg_30d", dtype=ValueType.FLOAT),
        Feature(name="realized_margin_avg_90d", dtype=ValueType.FLOAT),
        Feature(name="margin_stddev_30d", dtype=ValueType.FLOAT),
        
        # === Volume ===
        Feature(name="total_suggestions_7d", dtype=ValueType.INT64),
        Feature(name="total_suggestions_30d", dtype=ValueType.INT64),
        Feature(name="total_accepts_30d", dtype=ValueType.INT64),
        
        # === Quality Metrics ===
        Feature(name="cancellation_rate_30d", dtype=ValueType.FLOAT),
        Feature(name="avg_delay_minutes_30d", dtype=ValueType.FLOAT),
        Feature(name="on_time_rate_30d", dtype=ValueType.FLOAT),
        
        # === Customer Profile ===
        Feature(name="tier_encoded", dtype=ValueType.INT64),
        Feature(name="sla_level_encoded", dtype=ValueType.INT64),
        Feature(name="credit_rating", dtype=ValueType.FLOAT),
        Feature(name="region_encoded", dtype=ValueType.INT64),
        
        # === Engagement ===
        Feature(name="response_time_avg_seconds", dtype=ValueType.FLOAT),
        Feature(name="preferred_time_slot_encoded", dtype=ValueType.INT64),
    ],
    source=customer_features_source,
    tags={"team": "core", "type": "aggregated", "refresh": "daily"},
)

# Driver Features (Updated Daily)
driver_features = FeatureView(
    name="driver_features",
    entities=[driver],
    ttl=timedelta(days=1),
    features=[
        # === Acceptance Rates ===
        Feature(name="acceptance_rate_7d", dtype=ValueType.FLOAT),
        Feature(name="acceptance_rate_30d", dtype=ValueType.FLOAT),
        Feature(name="acceptance_rate_90d", dtype=ValueType.FLOAT),
        
        # === Margins ===
        Feature(name="realized_margin_avg_30d", dtype=ValueType.FLOAT),
        Feature(name="margin_stddev_30d", dtype=ValueType.FLOAT),
        
        # === Volume ===
        Feature(name="total_suggestions_7d", dtype=ValueType.INT64),
        Feature(name="total_suggestions_30d", dtype=ValueType.INT64),
        Feature(name="total_accepts_30d", dtype=ValueType.INT64),
        Feature(name="total_tours_30d", dtype=ValueType.INT64),
        
        # === Performance ===
        Feature(name="rating", dtype=ValueType.FLOAT),
        Feature(name="experience_years", dtype=ValueType.FLOAT),
        Feature(name="preferred_vehicle_type_encoded", dtype=ValueType.INT64),
        
        # === Quality Metrics ===
        Feature(name="avg_delay_minutes_30d", dtype=ValueType.FLOAT),
        Feature(name="on_time_rate_30d", dtype=ValueType.FLOAT),
        Feature(name="avg_detour_km_30d", dtype=ValueType.FLOAT),
    ],
    source=driver_features_source,
    tags={"team": "core", "type": "aggregated", "refresh": "daily"},
)

# Lane Features (Updated Daily)
lane_features = FeatureView(
    name="lane_features",
    entities=[lane],
    ttl=timedelta(days=7),
    features=[
        # === Acceptance Rates ===
        Feature(name="acceptance_rate_30d", dtype=ValueType.FLOAT),
        Feature(name="acceptance_rate_90d", dtype=ValueType.FLOAT),
        
        # === Margins ===
        Feature(name="realized_margin_avg_30d", dtype=ValueType.FLOAT),
        Feature(name="realized_margin_avg_90d", dtype=ValueType.FLOAT),
        
        # === Distance & Duration ===
        Feature(name="avg_distance_km", dtype=ValueType.FLOAT),
        Feature(name="avg_duration_minutes", dtype=ValueType.FLOAT),
        
        # === Quality ===
        Feature(name="avg_delay_minutes_90d", dtype=ValueType.FLOAT),
        Feature(name="avg_detour_km_90d", dtype=ValueType.FLOAT),
        
        # === Seasonality ===
        Feature(name="seasonality_score", dtype=ValueType.FLOAT),
        Feature(name="demand_factor", dtype=ValueType.FLOAT),
        
        # === Volume ===
        Feature(name="total_tours_30d", dtype=ValueType.INT64),
    ],
    source=lane_features_source,
    tags={"team": "core", "type": "aggregated", "refresh": "daily"},
)

# Vehicle Features (Updated Daily)
vehicle_features = FeatureView(
    name="vehicle_features",
    entities=[vehicle],
    ttl=timedelta(days=1),
    features=[
        # === Capacity ===
        Feature(name="volume_max_m3", dtype=ValueType.FLOAT),
        Feature(name="weight_max_kg", dtype=ValueType.FLOAT),
        Feature(name="pallets_max", dtype=ValueType.INT64),
        
        # === Utilization ===
        Feature(name="utilization_rate_7d", dtype=ValueType.FLOAT),
        Feature(name="utilization_rate_30d", dtype=ValueType.FLOAT),
        
        # === Performance ===
        Feature(name="avg_margin_7d", dtype=ValueType.FLOAT),
        Feature(name="total_tours_7d", dtype=ValueType.INT64),
        
        # === Type ===
        Feature(name="vehicle_type_encoded", dtype=ValueType.INT64),
    ],
    source=vehicle_features_source,
    tags={"team": "core", "type": "aggregated", "refresh": "daily"},
)

# Tour Context Features (Real-time)
tour_context = FeatureView(
    name="tour_context",
    entities=[tour],
    ttl=timedelta(hours=6),
    features=[
        # === Current State ===
        Feature(name="remaining_capacity_m3", dtype=ValueType.FLOAT),
        Feature(name="remaining_capacity_kg", dtype=ValueType.FLOAT),
        Feature(name="remaining_pallets", dtype=ValueType.INT64),
        
        # === Progress ===
        Feature(name="stops_completed", dtype=ValueType.INT64),
        Feature(name="stops_remaining", dtype=ValueType.INT64),
        Feature(name="distance_traveled_km", dtype=ValueType.FLOAT),
        Feature(name="distance_remaining_km", dtype=ValueType.FLOAT),
        
        # === Time ===
        Feature(name="elapsed_time_minutes", dtype=ValueType.FLOAT),
        Feature(name="eta_destination_minutes", dtype=ValueType.FLOAT),
        Feature(name="delay_minutes", dtype=ValueType.FLOAT),
        
        # === Context ===
        Feature(name="current_region_encoded", dtype=ValueType.INT64),
        Feature(name="traffic_condition_encoded", dtype=ValueType.INT64),
        Feature(name="weather_condition_encoded", dtype=ValueType.INT64),
    ],
    source=tour_context_source,
    tags={"team": "core", "type": "realtime", "refresh": "continuous"},
)


# =============================================================================
# ON-DEMAND FEATURE VIEWS (Real-time transformations)
# =============================================================================

@on_demand_feature_view(
    sources=[customer_features, driver_features, lane_features],
    features=[
        Feature(name="combined_acceptance_score", dtype=ValueType.FLOAT),
        Feature(name="risk_adjusted_score", dtype=ValueType.FLOAT),
        Feature(name="reliability_score", dtype=ValueType.FLOAT),
    ],
)
def combined_features(inputs: dict) -> dict:
    """
    Computes combined features in real-time.
    Blends customer, driver, and lane features.
    """
    # Get acceptance rates with defaults
    customer_rate = inputs.get("customer_features__acceptance_rate_30d", 0.5)
    driver_rate = inputs.get("driver_features__acceptance_rate_30d", 0.5)
    lane_rate = inputs.get("lane_features__acceptance_rate_30d", 0.5)
    
    # Weighted combination
    combined = (
        0.4 * customer_rate +
        0.3 * driver_rate +
        0.3 * lane_rate
    )
    
    # Risk adjustment
    credit_rating = inputs.get("customer_features__credit_rating", 0.5)
    risk_adjusted = combined * credit_rating
    
    # Reliability score
    on_time = inputs.get("customer_features__on_time_rate_30d", 0.9)
    driver_rating = inputs.get("driver_features__rating", 3.0) / 5.0
    reliability = (on_time + driver_rating) / 2.0
    
    return {
        "combined_acceptance_score": float(combined),
        "risk_adjusted_score": float(risk_adjusted),
        "reliability_score": float(reliability),
    }


# =============================================================================
# FEATURE SERVICES
# =============================================================================

from feast import FeatureService

# Scoring Feature Service (all features needed for ML scoring)
scoring_features = FeatureService(
    name="scoring_features",
    features=[
        customer_features,
        driver_features,
        lane_features,
        vehicle_features,
        combined_features,
    ],
    tags={"use_case": "ml_scoring", "latency": "real_time"},
)

# Training Feature Service (historical features for training)
training_features = FeatureService(
    name="training_features",
    features=[
        customer_features,
        driver_features,
        lane_features,
    ],
    tags={"use_case": "training", "latency": "batch"},
)


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Entities
    "customer",
    "driver",
    "vehicle",
    "lane",
    "tour",
    # Feature Views
    "customer_features",
    "driver_features",
    "lane_features",
    "vehicle_features",
    "tour_context",
    # On-Demand Views
    "combined_features",
    # Feature Services
    "scoring_features",
    "training_features",
]
