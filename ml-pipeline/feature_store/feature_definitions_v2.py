"""
CargoBit Feature Store - Feature Definitions V2
===============================================

Production-ready Feature Store with Feast for:
- Online Store: Redis (real-time serving, <10ms latency)
- Offline Store: S3/Parquet (training, historical data)
- Registry: PostgreSQL

Feature Categories:
- A.1 Heuristic Features (7) - Already computed
- A.2 Context Features (9) - Real-time computed
- A.3 Historical Features (7) - Aggregated daily
- A.4 Meta Features (3) - ML-Ops

Setup:
    feast apply
    feast materialize-incremental $(date -u +"%Y-%m-%d %H:%M:%S")

Author: CargoBit ML Team
Version: 3.0.0
"""

from datetime import timedelta
from feast import Entity, Feature, FeatureView, FileSource, ValueSource
from feast.value_type import ValueType
from feast.on_demand_feature_view import on_demand_feature_view
from feast.infra.online_stores.redis import RedisOnlineStore


# =============================================================================
# ENTITIES
# =============================================================================

# Customer Entity
customer = Entity(
    name="customer_id",
    value_type=ValueType.STRING,
    description="Unique customer identifier",
    tags={"domain": "logistics", "team": "core", "category": "entity"}
)

# Driver Entity
driver = Entity(
    name="driver_id",
    value_type=ValueType.STRING,
    description="Unique driver identifier",
    tags={"domain": "logistics", "team": "core", "category": "entity"}
)

# Vehicle Entity
vehicle = Entity(
    name="vehicle_id",
    value_type=ValueType.STRING,
    description="Unique vehicle identifier",
    tags={"domain": "logistics", "team": "core", "category": "entity"}
)

# Lane Entity (origin -> destination route)
lane = Entity(
    name="lane_id",
    value_type=ValueType.STRING,
    description="Lane identifier (e.g., DE-BER->DE-HAM)",
    tags={"domain": "logistics", "team": "core", "category": "entity"}
)

# Tour Entity (for grouping suggestions)
tour = Entity(
    name="tour_id",
    value_type=ValueType.STRING,
    description="Unique tour identifier",
    tags={"domain": "logistics", "team": "core", "category": "entity"}
)

# Suggestion Entity (for tracking suggestions across pipeline)
suggestion = Entity(
    name="suggestion_id",
    value_type=ValueType.STRING,
    description="Unique suggestion identifier",
    tags={"domain": "logistics", "team": "ml", "category": "entity"}
)


# =============================================================================
# DATA SOURCES
# =============================================================================

# Customer Features Source (Offline)
customer_features_source = FileSource(
    path="s3://cargobit-feature-store/customer_features/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)

# Driver Features Source (Offline)
driver_features_source = FileSource(
    path="s3://cargobit-feature-store/driver_features/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)

# Lane Features Source (Offline)
lane_features_source = FileSource(
    path="s3://cargobit-feature-store/lane_features/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)

# Vehicle Features Source (Offline)
vehicle_features_source = FileSource(
    path="s3://cargobit-feature-store/vehicle_features/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)

# Tour Context Source (Real-time push)
tour_context_source = FileSource(
    path="s3://cargobit-feature-store/tour_context/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)

# Suggestion Events Source (Training)
suggestion_events_source = FileSource(
    path="s3://cargobit-feature-store/suggestion_events/",
    event_timestamp_column="event_timestamp",
    file_format="parquet",
)


# =============================================================================
# A.1 HEURISTIC FEATURE VIEWS (Already computed by Suggestion Engine)
# =============================================================================

heuristic_features = FeatureView(
    name="heuristic_features",
    entities=[suggestion],
    ttl=timedelta(hours=1),
    features=[
        # Core heuristic scores
        Feature(name="revenue_score", dtype=ValueType.FLOAT),
        Feature(name="capacity_utilization_score", dtype=ValueType.FLOAT),
        Feature(name="priority_score", dtype=ValueType.FLOAT),
        Feature(name="risk_score", dtype=ValueType.FLOAT),
        Feature(name="service_level_score", dtype=ValueType.FLOAT),
        Feature(name="co2_score", dtype=ValueType.FLOAT),
        Feature(name="final_heuristic_score", dtype=ValueType.FLOAT),
        
        # Component breakdown for explainability
        Feature(name="revenue_component_raw", dtype=ValueType.FLOAT),
        Feature(name="capacity_component_raw", dtype=ValueType.FLOAT),
        Feature(name="detour_km", dtype=ValueType.FLOAT),
        Feature(name="price_eur", dtype=ValueType.FLOAT),
    ],
    source=suggestion_events_source,
    tags={"category": "A.1_heuristic", "refresh": "realtime", "team": "suggestion-engine"},
    online=True,
)


# =============================================================================
# A.2 CONTEXT FEATURE VIEWS (Real-time computed)
# =============================================================================

tour_context = FeatureView(
    name="tour_context",
    entities=[tour],
    ttl=timedelta(hours=6),
    features=[
        # Distance & ETA
        Feature(name="distance_pickup_to_route_km", dtype=ValueType.FLOAT),
        Feature(name="distance_delivery_to_destination_km", dtype=ValueType.FLOAT),
        Feature(name="eta_to_pickup_minutes", dtype=ValueType.FLOAT),
        Feature(name="eta_to_delivery_minutes", dtype=ValueType.FLOAT),
        
        # Capacity
        Feature(name="free_volume_m3", dtype=ValueType.FLOAT),
        Feature(name="free_pallets", dtype=ValueType.INT64),
        Feature(name="free_weight_kg", dtype=ValueType.FLOAT),
        
        # Progress
        Feature(name="tour_progress_pct", dtype=ValueType.FLOAT),
        Feature(name="stops_completed", dtype=ValueType.INT64),
        Feature(name="stops_remaining", dtype=ValueType.INT64),
        
        # Context
        Feature(name="vehicle_type", dtype=ValueType.STRING),
        Feature(name="current_region", dtype=ValueType.STRING),
        Feature(name="traffic_condition", dtype=ValueType.STRING),
        Feature(name="weather_condition", dtype=ValueType.STRING),
    ],
    source=tour_context_source,
    tags={"category": "A.2_context", "refresh": "realtime", "team": "telematics"},
    online=True,
)


# =============================================================================
# A.3 HISTORICAL FEATURE VIEWS (Aggregated daily)
# =============================================================================

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
    tags={"category": "A.3_historical", "refresh": "daily", "team": "data-engineering"},
    online=True,
)

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
    tags={"category": "A.3_historical", "refresh": "daily", "team": "data-engineering"},
    online=True,
)

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
    tags={"category": "A.3_historical", "refresh": "daily", "team": "data-engineering"},
    online=True,
)

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
    tags={"category": "A.3_historical", "refresh": "daily", "team": "data-engineering"},
    online=True,
)


# =============================================================================
# ON-DEMAND FEATURE VIEWS (Real-time transformations)
# =============================================================================

@on_demand_feature_view(
    sources=[customer_features, driver_features, lane_features, tour_context],
    features=[
        # Combined acceptance score
        Feature(name="combined_acceptance_score", dtype=ValueType.FLOAT),
        
        # Risk-adjusted score
        Feature(name="risk_adjusted_score", dtype=ValueType.FLOAT),
        
        # Reliability score
        Feature(name="reliability_score", dtype=ValueType.FLOAT),
        
        # Capacity fit score
        Feature(name="capacity_fit_score", dtype=ValueType.FLOAT),
        
        # Time efficiency score
        Feature(name="time_efficiency_score", dtype=ValueType.FLOAT),
    ],
)
def combined_features(inputs: dict) -> dict:
    """
    Computes combined features in real-time.
    Blends customer, driver, lane, and tour context features.
    """
    
    # Get acceptance rates with defaults
    customer_rate = inputs.get("customer_features__acceptance_rate_30d", 0.5)
    driver_rate = inputs.get("driver_features__acceptance_rate_30d", 0.5)
    lane_rate = inputs.get("lane_features__acceptance_rate_30d", 0.5)
    
    # Weighted combination for combined acceptance
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
    
    # Capacity fit score
    free_volume = inputs.get("tour_context__free_volume_m3", 20.0)
    free_pallets = inputs.get("tour_context__free_pallets", 5)
    capacity_fit = min(free_volume / 100.0, free_pallets / 34.0)  # Normalize
    
    # Time efficiency score
    eta_pickup = inputs.get("tour_context__eta_to_pickup_minutes", 30.0)
    eta_delivery = inputs.get("tour_context__eta_to_delivery_minutes", 120.0)
    time_efficiency = 1.0 - min(eta_pickup / 180.0, 1.0) * 0.5 - min(eta_delivery / 360.0, 1.0) * 0.5
    
    return {
        "combined_acceptance_score": float(combined),
        "risk_adjusted_score": float(risk_adjusted),
        "reliability_score": float(reliability),
        "capacity_fit_score": float(capacity_fit),
        "time_efficiency_score": float(time_efficiency),
    }


# =============================================================================
# FEATURE SERVICES (for Training & Serving)
# =============================================================================

from feast import FeatureService

# Scoring Feature Service (all features for ML scoring)
scoring_features = FeatureService(
    name="scoring_features",
    features=[
        heuristic_features,
        tour_context,
        customer_features,
        driver_features,
        lane_features,
        vehicle_features,
        combined_features,
    ],
    tags={"use_case": "ml_scoring", "latency": "real_time", "sla_ms": 10},
)

# Training Feature Service (historical features for training)
training_features = FeatureService(
    name="training_features",
    features=[
        heuristic_features,
        customer_features,
        driver_features,
        lane_features,
    ],
    tags={"use_case": "training", "latency": "batch"},
)

# Explainability Feature Service (for SHAP explanations)
explainability_features = FeatureService(
    name="explainability_features",
    features=[
        heuristic_features,
        customer_features,
        driver_features,
        tour_context,
        combined_features,
    ],
    tags={"use_case": "explainability", "latency": "real_time"},
)

# Learning-to-Rank Feature Service
ltr_features = FeatureService(
    name="ltr_features",
    features=[
        heuristic_features,
        customer_features,
        driver_features,
        lane_features,
        vehicle_features,
        tour_context,
        combined_features,
    ],
    tags={"use_case": "learning_to_rank", "latency": "real_time"},
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
    "suggestion",
    # Feature Views
    "heuristic_features",
    "tour_context",
    "customer_features",
    "driver_features",
    "lane_features",
    "vehicle_features",
    # On-Demand Views
    "combined_features",
    # Feature Services
    "scoring_features",
    "training_features",
    "explainability_features",
    "ltr_features",
]
