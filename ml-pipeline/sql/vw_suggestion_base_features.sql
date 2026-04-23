-- =============================================================================
-- CargoBit ML Training Dataset - Base Features View
-- =============================================================================
-- Purpose: Join of suggestion_generated + outcome labels from suggestion_outcome
-- This separates Feature Engineering cleanly from Label Engineering
--
-- Usage:
--   SELECT * FROM vw_suggestion_base_features WHERE generated_at >= '2026-01-01';
--
-- Compatibility: ANSI-SQL, Delta Lake, BigQuery, Snowflake
-- =============================================================================

CREATE OR REPLACE VIEW vw_suggestion_base_features AS
SELECT
    -- Primary Keys
    g.suggestion_id,
    g.tour_id,
    g.order_id,
    g.segment_id,
    g.generated_at,

    -- =========================================================================
    -- A.1 HEURISTIC FEATURES (from Suggestion Engine)
    -- =========================================================================
    g.revenue_score,
    g.capacity_utilization_score,
    g.priority_score,
    g.risk_score,
    g.service_level_score,
    g.co2_score,
    g.final_heuristic_score,

    -- =========================================================================
    -- A.2 CONTEXT FEATURES (from Routing/Capacity Engine)
    -- =========================================================================
    g.distance_pickup_to_route_km,
    g.distance_delivery_to_destination_km,
    g.eta_to_pickup_minutes,
    g.eta_to_delivery_minutes,
    g.free_volume_m3,
    g.free_pallets,
    g.free_weight_kg,
    g.vehicle_type,
    g.tour_progress_pct,

    -- =========================================================================
    -- ENTITY IDs (for historical feature joins)
    -- =========================================================================
    g.customer_id,
    g.driver_id,
    g.vehicle_id,
    g.lane_id,

    -- =========================================================================
    -- OUTCOME / LABELS (from suggestion_outcome)
    -- =========================================================================
    o.decision,
    CASE WHEN o.decision = 'ACCEPT' THEN 1 ELSE 0 END AS label_accepted,
    o.executed,
    o.realized_margin,
    o.delay_minutes,
    o.co2_impact_kg,

    -- =========================================================================
    -- META INFORMATION (for audit & debugging)
    -- =========================================================================
    o.model_used,
    o.model_version,
    o.heuristic_weights_version,
    o.decision_at,
    o.decision_latency_seconds,

    -- Derived fields for ML
    CASE 
        WHEN o.decision = 'ACCEPT' AND o.executed = TRUE THEN 1
        WHEN o.decision = 'ACCEPT' AND o.executed = FALSE THEN 0.5
        ELSE 0 
    END AS label_executed,
    
    -- Time features
    EXTRACT(HOUR FROM g.generated_at) AS hour_of_day,
    EXTRACT(DOW FROM g.generated_at) AS day_of_week,
    EXTRACT(WEEK FROM g.generated_at) AS week_of_year

FROM suggestion_generated g
LEFT JOIN suggestion_outcome o
    ON g.suggestion_id = o.suggestion_id;

-- =============================================================================
-- INDEX RECOMMENDATIONS
-- =============================================================================
-- CREATE INDEX idx_suggestion_generated_id ON suggestion_generated(suggestion_id);
-- CREATE INDEX idx_suggestion_outcome_id ON suggestion_outcome(suggestion_id);
-- CREATE INDEX idx_suggestion_generated_at ON suggestion_generated(generated_at);
-- CREATE INDEX idx_suggestion_customer ON suggestion_generated(customer_id);
-- CREATE INDEX idx_suggestion_driver ON suggestion_generated(driver_id);
