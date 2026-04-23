-- =============================================================================
-- CargoBit ML Pipeline - Materialize ML Training Dataset
-- =============================================================================
-- Materialisiert vw_ml_training_dataset in ml_training_dataset Tabelle.
-- 
-- Schedule: Tägliche Ausführung via Airflow DAG (nach build_historical_features)
-- Author: CargoBit ML Team
-- Version: 1.0.0
-- =============================================================================

-- Parameter: snapshot_date (wird von Airflow gesetzt)
-- Format: YYYY-MM-DD

-- =============================================================================
-- 1. CREATE TEMPORARY TABLE FOR NEW TRAINING DATA
-- =============================================================================

CREATE TEMPORARY TABLE temp_training_data AS
SELECT 
    -- Identifiers
    sg.suggestion_id,
    sg.tour_id,
    sg.order_id,
    sg.customer_id,
    sg.driver_id,
    sg.lane_id,
    
    -- Label
    CASE so.decision 
        WHEN 'ACCEPT' THEN 1 
        ELSE 0 
    END as label_accepted,
    
    -- Timestamp
    sg.generated_at,
    so.decision_at,
    :snapshot_date as snapshot_date,
    
    -- =========================================================================
    -- HEURISTIC FEATURES (6 Component Scores)
    -- =========================================================================
    sg.revenue_score,
    sg.capacity_utilization_score,
    sg.priority_score,
    sg.risk_score,
    sg.service_level_score,
    sg.co2_score,
    
    -- Computed Heuristic Score
    (
        0.35 * sg.revenue_score +
        0.20 * sg.capacity_utilization_score +
        0.10 * sg.priority_score +
        0.10 * sg.risk_score +
        0.15 * sg.service_level_score +
        0.10 * sg.co2_score
    ) as heuristic_score,
    
    -- =========================================================================
    -- CONTEXT FEATURES (12 Features)
    -- =========================================================================
    
    -- Distance Features
    sg.distance_pickup_to_route_km,
    sg.distance_delivery_to_destination_km,
    sg.total_distance_km,
    
    -- ETA Features
    sg.eta_to_pickup_minutes,
    sg.eta_to_delivery_minutes,
    sg.total_eta_minutes,
    
    -- Capacity Features
    sg.free_volume_m3,
    sg.free_pallets,
    sg.free_weight_kg,
    sg.required_volume_m3,
    sg.required_pallets,
    sg.required_weight_kg,
    
    -- Tour Progress
    sg.tour_progress_pct,
    sg.tour_stops_completed,
    sg.tour_stops_remaining,
    
    -- Vehicle Type (One-hot encoded)
    CASE WHEN sg.vehicle_type = 'VAN' THEN 1 ELSE 0 END as vehicle_type_van,
    CASE WHEN sg.vehicle_type = 'TRUCK_7T' THEN 1 ELSE 0 END as vehicle_type_truck_7t,
    CASE WHEN sg.vehicle_type = 'TRUCK_18T' THEN 1 ELSE 0 END as vehicle_type_truck_18t,
    CASE WHEN sg.vehicle_type = 'TRUCK_40T' THEN 1 ELSE 0 END as vehicle_type_truck_40t,
    
    -- Time Features
    EXTRACT(HOUR FROM sg.generated_at) as hour_of_day,
    EXTRACT(DOW FROM sg.generated_at) as day_of_week,
    CASE WHEN EXTRACT(DOW FROM sg.generated_at) IN (0, 6) THEN 1 ELSE 0 END as is_weekend,
    
    -- =========================================================================
    -- HISTORICAL FEATURES (From Feature Store)
    -- =========================================================================
    
    -- Customer Features (30d)
    hf_customer.acceptance_rate_30d as customer_acceptance_rate_30d,
    hf_customer.delay_avg_minutes_30d as customer_delay_avg_30d,
    hf_customer.total_suggestions_30d as customer_total_suggestions_30d,
    
    -- Driver Features (30d)
    hf_driver.acceptance_rate_30d as driver_acceptance_rate_30d,
    hf_driver.delay_avg_minutes_30d as driver_delay_avg_30d,
    hf_driver.capacity_utilization_avg_30d as driver_capacity_utilization_avg_30d,
    
    -- Lane Features (90d)
    hf_lane.realized_margin_avg_90d as lane_realized_margin_avg_90d,
    hf_lane.acceptance_rate_90d as lane_acceptance_rate_90d,
    
    -- Combined Features
    hf_combined.combined_acceptance_rate_30d,
    
    -- =========================================================================
    -- META FEATURES (Derived)
    -- =========================================================================
    
    -- Combined Acceptance Rate
    COALESCE(hf_customer.acceptance_rate_30d, 0.5) * 0.5 + 
    COALESCE(hf_driver.acceptance_rate_30d, 0.5) * 0.5 as combined_acceptance_rate,
    
    -- Risk-Adjusted Revenue
    sg.revenue_score * (1 - sg.risk_score * 0.5) as risk_adjusted_revenue,
    
    -- Time Pressure Score
    CASE 
        WHEN sg.eta_to_pickup_minutes < 30 THEN 1.0
        WHEN sg.eta_to_pickup_minutes < 60 THEN 0.7
        WHEN sg.eta_to_pickup_minutes < 120 THEN 0.4
        ELSE 0.2
    END as time_pressure_score,
    
    -- Capacity Fit Score
    CASE 
        WHEN sg.free_volume_m3 >= sg.required_volume_m3 * 1.2 THEN 1.0
        WHEN sg.free_volume_m3 >= sg.required_volume_m3 THEN 0.8
        WHEN sg.free_volume_m3 >= sg.required_volume_m3 * 0.9 THEN 0.5
        ELSE 0.2
    END as capacity_fit_score,
    
    -- =========================================================================
    -- OUTCOME FEATURES (For Analysis, not Training)
    -- =========================================================================
    so.decision,
    so.decided_by,
    so.model_used,
    so.delay_minutes,
    so.realized_margin_eur,
    
    -- Model Performance Tracking
    sg.heuristic_score as original_heuristic_score,
    sg.ml_score as original_ml_score,
    sg.final_score as original_final_score,
    
    CURRENT_TIMESTAMP as inserted_at

FROM suggestion_generated sg
LEFT JOIN suggestion_outcome so ON sg.suggestion_id = so.suggestion_id

-- Join Customer Features
LEFT JOIN historical_features hf_customer 
    ON hf_customer.entity_type = 'CUSTOMER' 
    AND hf_customer.entity_id = sg.customer_id
    AND hf_customer.snapshot_date = :snapshot_date

-- Join Driver Features
LEFT JOIN historical_features hf_driver 
    ON hf_driver.entity_type = 'DRIVER' 
    AND hf_driver.entity_id = sg.driver_id
    AND hf_driver.snapshot_date = :snapshot_date

-- Join Lane Features
LEFT JOIN historical_features hf_lane 
    ON hf_lane.entity_type = 'LANE' 
    AND hf_lane.entity_id = sg.lane_id
    AND hf_lane.snapshot_date = :snapshot_date

-- Join Combined Features
LEFT JOIN historical_features hf_combined 
    ON hf_combined.entity_type = 'CUSTOMER_DRIVER' 
    AND hf_combined.entity_id = sg.customer_id
    AND hf_combined.entity_id_secondary = sg.driver_id
    AND hf_combined.snapshot_date = :snapshot_date

WHERE sg.generated_at >= DATEADD(day, -90, :snapshot_date)
  AND sg.generated_at < :snapshot_date
  AND so.decision IS NOT NULL;  -- Only labeled data

-- =============================================================================
-- 2. INSERT INTO TRAINING TABLE
-- =============================================================================

INSERT INTO ml_training_dataset
SELECT * FROM temp_training_data;

-- =============================================================================
-- 3. UPDATE DATASET STATISTICS
-- =============================================================================

INSERT INTO training_dataset_stats (
    snapshot_date,
    total_rows,
    positive_labels,
    negative_labels,
    label_rate,
    feature_null_rates,
    computed_at
)
SELECT 
    :snapshot_date as snapshot_date,
    COUNT(*) as total_rows,
    SUM(label_accepted) as positive_labels,
    COUNT(*) - SUM(label_accepted) as negative_labels,
    AVG(label_accepted) as label_rate,
    
    -- Null rates for key features (as JSON)
    OBJECT_CONSTRUCT(
        'customer_acceptance_rate_30d', AVG(CASE WHEN customer_acceptance_rate_30d IS NULL THEN 1 ELSE 0 END),
        'driver_acceptance_rate_30d', AVG(CASE WHEN driver_acceptance_rate_30d IS NULL THEN 1 ELSE 0 END),
        'lane_realized_margin_avg_90d', AVG(CASE WHEN lane_realized_margin_avg_90d IS NULL THEN 1 ELSE 0 END)
    ) as feature_null_rates,
    
    CURRENT_TIMESTAMP as computed_at
    
FROM temp_training_data;

-- =============================================================================
-- 4. CLEANUP OLD TRAINING DATA (Retention: 90 days)
-- =============================================================================

DELETE FROM ml_training_dataset 
WHERE snapshot_date < DATEADD(day, -90, :snapshot_date);

-- =============================================================================
-- 5. VALIDATE DATASET QUALITY
-- =============================================================================

-- Check minimum samples
DO $$
DECLARE
    v_row_count INTEGER;
    v_min_samples INTEGER := 10000;
BEGIN
    SELECT COUNT(*) INTO v_row_count 
    FROM ml_training_dataset 
    WHERE snapshot_date = :snapshot_date;
    
    IF v_row_count < v_min_samples THEN
        RAISE EXCEPTION 'Insufficient training samples: % < %', v_row_count, v_min_samples;
    END IF;
    
    -- Log success
    INSERT INTO pipeline_log (pipeline_name, status, message, created_at)
    VALUES (
        'materialize_ml_training_dataset',
        'SUCCESS',
        FORMAT('Created training dataset with %s rows for %s', v_row_count, :snapshot_date),
        CURRENT_TIMESTAMP
    );
END $$;
