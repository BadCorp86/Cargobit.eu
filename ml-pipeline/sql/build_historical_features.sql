-- =============================================================================
-- CargoBit ML Pipeline - Build Historical Features
-- =============================================================================
-- Aggregation historischer Features aus suggestion_outcome für:
-- - Customer: acceptance_rate_30d, delay_avg_30d, cancellation_rate_30d
-- - Driver: acceptance_rate_30d, delay_avg_30d
-- - Lane: realized_margin_avg_90d
--
-- Schedule: Tägliche Ausführung via Airflow DAG
-- Author: CargoBit ML Team
-- Version: 1.0.0
-- =============================================================================

-- Parameter: snapshot_date (wird von Airflow gesetzt)
-- Format: YYYY-MM-DD

-- =============================================================================
-- 1. CUSTOMER FEATURES (30d Aggregation)
-- =============================================================================

INSERT INTO historical_features (
    entity_type,
    entity_id,
    snapshot_date,
    
    -- Acceptance Metrics
    acceptance_rate_30d,
    total_suggestions_30d,
    total_accepts_30d,
    total_rejects_30d,
    
    -- Delay Metrics
    delay_avg_minutes_30d,
    delay_median_minutes_30d,
    
    -- Margin Metrics
    realized_margin_avg_30d,
    realized_margin_std_30d,
    
    -- Time Metrics
    decision_time_avg_seconds_30d,
    
    -- Computed at
    computed_at
)
SELECT 
    'CUSTOMER' as entity_type,
    so.customer_id as entity_id,
    :snapshot_date as snapshot_date,
    
    -- Acceptance Rate
    SUM(CASE WHEN so.decision = 'ACCEPT' THEN 1 ELSE 0 END) * 1.0 / 
        NULLIF(COUNT(*), 0) as acceptance_rate_30d,
    COUNT(*) as total_suggestions_30d,
    SUM(CASE WHEN so.decision = 'ACCEPT' THEN 1 ELSE 0 END) as total_accepts_30d,
    SUM(CASE WHEN so.decision = 'REJECT' THEN 1 ELSE 0 END) as total_rejects_30d,
    
    -- Delay
    AVG(so.delay_minutes) as delay_avg_minutes_30d,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY so.delay_minutes) as delay_median_minutes_30d,
    
    -- Margin
    AVG(so.realized_margin_eur) as realized_margin_avg_30d,
    STDDEV(so.realized_margin_eur) as realized_margin_std_30d,
    
    -- Decision Time
    AVG(EXTRACT(EPOCH FROM (so.decision_at - sg.generated_at))) as decision_time_avg_seconds_30d,
    
    CURRENT_TIMESTAMP as computed_at
    
FROM suggestion_outcome so
JOIN suggestion_generated sg ON so.suggestion_id = sg.suggestion_id
WHERE sg.generated_at >= DATEADD(day, -30, :snapshot_date)
  AND sg.generated_at < :snapshot_date
  AND so.customer_id IS NOT NULL
GROUP BY so.customer_id;

-- =============================================================================
-- 2. DRIVER FEATURES (30d Aggregation)
-- =============================================================================

INSERT INTO historical_features (
    entity_type,
    entity_id,
    snapshot_date,
    
    acceptance_rate_30d,
    total_suggestions_30d,
    total_accepts_30d,
    total_rejects_30d,
    
    delay_avg_minutes_30d,
    delay_median_minutes_30d,
    
    realized_margin_avg_30d,
    
    -- Driver-specific
    capacity_utilization_avg_30d,
    tour_completion_rate_30d,
    
    computed_at
)
SELECT 
    'DRIVER' as entity_type,
    so.driver_id as entity_id,
    :snapshot_date as snapshot_date,
    
    SUM(CASE WHEN so.decision = 'ACCEPT' THEN 1 ELSE 0 END) * 1.0 / 
        NULLIF(COUNT(*), 0) as acceptance_rate_30d,
    COUNT(*) as total_suggestions_30d,
    SUM(CASE WHEN so.decision = 'ACCEPT' THEN 1 ELSE 0 END) as total_accepts_30d,
    SUM(CASE WHEN so.decision = 'REJECT' THEN 1 ELSE 0 END) as total_rejects_30d,
    
    AVG(so.delay_minutes) as delay_avg_minutes_30d,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY so.delay_minutes) as delay_median_minutes_30d,
    
    AVG(so.realized_margin_eur) as realized_margin_avg_30d,
    
    -- Driver-specific aggregations
    AVG(sg.capacity_utilization_pct) as capacity_utilization_avg_30d,
    SUM(CASE WHEN so.tour_completed = true THEN 1 ELSE 0 END) * 1.0 / 
        NULLIF(SUM(CASE WHEN so.decision = 'ACCEPT' THEN 1 ELSE 0 END), 0) as tour_completion_rate_30d,
    
    CURRENT_TIMESTAMP as computed_at
    
FROM suggestion_outcome so
JOIN suggestion_generated sg ON so.suggestion_id = sg.suggestion_id
WHERE sg.generated_at >= DATEADD(day, -30, :snapshot_date)
  AND sg.generated_at < :snapshot_date
  AND so.driver_id IS NOT NULL
GROUP BY so.driver_id;

-- =============================================================================
-- 3. LANE FEATURES (90d Aggregation)
-- =============================================================================

INSERT INTO historical_features (
    entity_type,
    entity_id,
    snapshot_date,
    
    acceptance_rate_90d,
    total_suggestions_90d,
    total_accepts_90d,
    
    realized_margin_avg_90d,
    realized_margin_std_90d,
    
    -- Lane-specific
    avg_distance_km_90d,
    avg_duration_minutes_90d,
    
    computed_at
)
SELECT 
    'LANE' as entity_type,
    sg.lane_id as entity_id,
    :snapshot_date as snapshot_date,
    
    SUM(CASE WHEN so.decision = 'ACCEPT' THEN 1 ELSE 0 END) * 1.0 / 
        NULLIF(COUNT(*), 0) as acceptance_rate_90d,
    COUNT(*) as total_suggestions_90d,
    SUM(CASE WHEN so.decision = 'ACCEPT' THEN 1 ELSE 0 END) as total_accepts_90d,
    
    AVG(so.realized_margin_eur) as realized_margin_avg_90d,
    STDDEV(so.realized_margin_eur) as realized_margin_std_90d,
    
    AVG(sg.distance_km) as avg_distance_km_90d,
    AVG(sg.duration_minutes) as avg_duration_minutes_90d,
    
    CURRENT_TIMESTAMP as computed_at
    
FROM suggestion_outcome so
JOIN suggestion_generated sg ON so.suggestion_id = sg.suggestion_id
WHERE sg.generated_at >= DATEADD(day, -90, :snapshot_date)
  AND sg.generated_at < :snapshot_date
  AND sg.lane_id IS NOT NULL
GROUP BY sg.lane_id;

-- =============================================================================
-- 4. COMBINED FEATURES (Customer + Driver Pair)
-- =============================================================================

INSERT INTO historical_features (
    entity_type,
    entity_id,
    entity_id_secondary,
    snapshot_date,
    
    combined_acceptance_rate_30d,
    combined_total_suggestions_30d,
    
    computed_at
)
SELECT 
    'CUSTOMER_DRIVER' as entity_type,
    so.customer_id as entity_id,
    so.driver_id as entity_id_secondary,
    :snapshot_date as snapshot_date,
    
    SUM(CASE WHEN so.decision = 'ACCEPT' THEN 1 ELSE 0 END) * 1.0 / 
        NULLIF(COUNT(*), 0) as combined_acceptance_rate_30d,
    COUNT(*) as combined_total_suggestions_30d,
    
    CURRENT_TIMESTAMP as computed_at
    
FROM suggestion_outcome so
JOIN suggestion_generated sg ON so.suggestion_id = sg.suggestion_id
WHERE sg.generated_at >= DATEADD(day, -30, :snapshot_date)
  AND sg.generated_at < :snapshot_date
  AND so.customer_id IS NOT NULL
  AND so.driver_id IS NOT NULL
GROUP BY so.customer_id, so.driver_id
HAVING COUNT(*) >= 5;  -- Mindestens 5 gemeinsame Suggestions für relevante Statistik

-- =============================================================================
-- 5. CLEANUP OLD FEATURES (Retention: 365 days)
-- =============================================================================

DELETE FROM historical_features 
WHERE snapshot_date < DATEADD(day, -365, :snapshot_date);

-- =============================================================================
-- 6. UPDATE FEATURE CATALOG
-- =============================================================================

INSERT INTO feature_catalog (
    feature_name,
    feature_type,
    aggregation_period,
    last_computed,
    row_count
)
SELECT 
    entity_type || '_features_' || aggregation_period as feature_name,
    'HISTORICAL' as feature_type,
    aggregation_period,
    CURRENT_TIMESTAMP as last_computed,
    COUNT(*) as row_count
FROM historical_features
CROSS JOIN (VALUES ('30d'), ('90d')) as t(aggregation_period)
WHERE snapshot_date = :snapshot_date
GROUP BY entity_type, aggregation_period
ON CONFLICT (feature_name) 
DO UPDATE SET 
    last_computed = EXCLUDED.last_computed,
    row_count = EXCLUDED.row_count;
