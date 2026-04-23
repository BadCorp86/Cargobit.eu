-- =============================================================================
-- CargoBit ML Training Dataset - Final View
-- =============================================================================
-- Purpose: Final training dataset including historical features
-- Structure: Base Features + Historical Features (aggregated)
--
-- Why this structure?
--   - Modular: Base features + history separated
--   - Extensible: New features = new LEFT JOINs
--   - ML-friendly: Flat table, no arrays, no nested structures
--   - Audit-capable: Every column is traceable
--
-- Usage:
--   SELECT * FROM vw_ml_training_dataset 
--   WHERE generated_at >= '2025-01-01' 
--   AND label_accepted IS NOT NULL;
--
-- Compatibility: ANSI-SQL, Delta Lake, BigQuery, Snowflake
-- =============================================================================

CREATE OR REPLACE VIEW vw_ml_training_dataset AS
SELECT
    -- =========================================================================
    -- BASE FEATURES (from vw_suggestion_base_features)
    -- =========================================================================
    b.suggestion_id,
    b.tour_id,
    b.order_id,
    b.segment_id,
    b.generated_at,
    
    -- A.1 Heuristic Features
    b.revenue_score,
    b.capacity_utilization_score,
    b.priority_score,
    b.risk_score,
    b.service_level_score,
    b.co2_score,
    b.final_heuristic_score,
    
    -- A.2 Context Features
    b.distance_pickup_to_route_km,
    b.distance_delivery_to_destination_km,
    b.eta_to_pickup_minutes,
    b.eta_to_delivery_minutes,
    b.free_volume_m3,
    b.free_pallets,
    b.free_weight_kg,
    b.vehicle_type,
    b.tour_progress_pct,
    
    -- Entity IDs
    b.customer_id,
    b.driver_id,
    b.vehicle_id,
    b.lane_id,
    
    -- Labels
    b.decision,
    b.label_accepted,
    b.executed,
    b.realized_margin,
    b.delay_minutes,
    b.co2_impact_kg,
    b.label_executed,
    
    -- Time features
    b.hour_of_day,
    b.day_of_week,
    b.week_of_year,
    
    -- Meta
    b.model_used,
    b.model_version,
    b.heuristic_weights_version,

    -- =========================================================================
    -- A.3 HISTORICAL FEATURES (from historical_features table)
    -- =========================================================================
    
    -- Customer History
    COALESCE(h.customer_acceptance_rate_30d, 0.5) AS customer_acceptance_rate_30d,
    COALESCE(h.customer_delay_avg_30d, 0.0) AS customer_delay_avg_30d,
    COALESCE(h.customer_cancellation_rate_30d, 0.0) AS customer_cancellation_rate_30d,
    
    -- Driver History
    COALESCE(h.driver_acceptance_rate_30d, 0.5) AS driver_acceptance_rate_30d,
    COALESCE(h.driver_delay_avg_30d, 0.0) AS driver_delay_avg_30d,
    
    -- Lane/Route History
    COALESCE(h.lane_realized_margin_avg_90d, 0.0) AS lane_realized_margin_avg_90d,
    
    -- Global Execution Rate
    COALESCE(h.historical_execution_rate, 0.5) AS historical_execution_rate,

    -- =========================================================================
    -- DERIVED FEATURES (computed on-the-fly)
    -- =========================================================================
    
    -- Combined acceptance score (customer + driver)
    (COALESCE(h.customer_acceptance_rate_30d, 0.5) + 
     COALESCE(h.driver_acceptance_rate_30d, 0.5)) / 2.0 AS combined_acceptance_rate,
    
    -- Risk-adjusted revenue score
    b.revenue_score * (1.0 - b.risk_score) AS risk_adjusted_revenue,
    
    -- Distance efficiency (lower is better)
    CASE 
        WHEN b.distance_pickup_to_route_km > 0 
        THEN b.distance_delivery_to_destination_km / b.distance_pickup_to_route_km
        ELSE 1.0 
    END AS distance_ratio,
    
    -- Capacity urgency (tour progress vs free capacity)
    b.tour_progress_pct * (1.0 - (b.free_volume_m3 / 100.0)) AS capacity_urgency,
    
    -- Time pressure indicator
    CASE 
        WHEN b.eta_to_pickup_minutes < 30 THEN 1.0
        WHEN b.eta_to_pickup_minutes < 60 THEN 0.7
        WHEN b.eta_to_pickup_minutes < 120 THEN 0.4
        ELSE 0.2
    END AS time_pressure_score

FROM vw_suggestion_base_features b
LEFT JOIN historical_features h
    ON b.customer_id = h.customer_id
    AND b.driver_id = h.driver_id
    AND b.tour_id = h.tour_id;

-- =============================================================================
-- ADDITIONAL VIEWS FOR SPECIFIC USE CASES
-- =============================================================================

-- View for Training (only rows with valid labels)
CREATE OR REPLACE VIEW vw_ml_training_dataset_labeled AS
SELECT *
FROM vw_ml_training_dataset
WHERE label_accepted IS NOT NULL
  AND decision IS NOT NULL;

-- View for Inference (current suggestions without outcome)
CREATE OR REPLACE VIEW vw_ml_inference_features AS
SELECT
    suggestion_id,
    tour_id,
    order_id,
    segment_id,
    generated_at,
    -- All features
    revenue_score,
    capacity_utilization_score,
    priority_score,
    risk_score,
    service_level_score,
    co2_score,
    final_heuristic_score,
    distance_pickup_to_route_km,
    distance_delivery_to_destination_km,
    eta_to_pickup_minutes,
    eta_to_delivery_minutes,
    free_volume_m3,
    free_pallets,
    free_weight_kg,
    vehicle_type,
    tour_progress_pct,
    customer_id,
    driver_id,
    vehicle_id,
    lane_id,
    customer_acceptance_rate_30d,
    driver_acceptance_rate_30d,
    lane_realized_margin_avg_90d,
    customer_delay_avg_30d,
    driver_delay_avg_30d,
    customer_cancellation_rate_30d,
    historical_execution_rate,
    combined_acceptance_rate,
    risk_adjusted_revenue,
    distance_ratio,
    capacity_urgency,
    time_pressure_score
FROM vw_ml_training_dataset
WHERE decision IS NULL;

-- =============================================================================
-- INDEX RECOMMENDATIONS FOR HISTORICAL FEATURES
-- =============================================================================
-- CREATE INDEX idx_historical_customer ON historical_features(customer_id);
-- CREATE INDEX idx_historical_driver ON historical_features(driver_id);
-- CREATE INDEX idx_historical_tour ON historical_features(tour_id);
-- CREATE INDEX idx_historical_composite ON historical_features(customer_id, driver_id, tour_id);
