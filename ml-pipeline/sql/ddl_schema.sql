-- =============================================================================
-- CargoBit ML Data Warehouse Schema (DDL)
-- =============================================================================
-- Komplettes DDL für Data-Warehouse (Snowflake/BigQuery/Redshift-style)
-- 
-- Tabellen:
--   1. suggestion_generated - Roh-Events der Suggestion Engine
--   2. suggestion_outcome - Outcome/Labels der Suggestions
--   3. historical_features - Aggregierte historische Features
--   4. ml_model_registry - Modell-Versionierung
--   5. ml_inference_log - Inference Logging
--
-- Views:
--   vw_suggestion_base_features - Base Features + Labels
--   vw_ml_training_dataset - Finales Training Dataset
--
-- Autor: CargoBit ML Team
-- Version: 1.0.0
-- Kompatibilität: Snowflake, BigQuery, Redshift, Delta Lake
-- =============================================================================

-- =============================================================================
-- 1) ROH-EVENTS: suggestion_generated
-- =============================================================================
-- Zweck: Events aus der Suggestion Engine (Kafka/Log-basiert)
-- Source: suggestion-generated Kafka Topic
-- Refresh: Echtzeit (Streaming)
-- Partitionierung: Nach generated_at (Tage)
-- =============================================================================

CREATE TABLE IF NOT EXISTS suggestion_generated (
    -- Primary Keys
    suggestion_id                  VARCHAR(64)    NOT NULL,
    tour_id                        VARCHAR(64)    NOT NULL,
    order_id                       VARCHAR(64)    NOT NULL,
    segment_id                     VARCHAR(64)    NOT NULL,
    generated_at                   TIMESTAMP      NOT NULL,
    
    -- =========================================================================
    -- A.1 HEURISTIC FEATURES (aus Suggestion Engine)
    -- =========================================================================
    revenue_score                  FLOAT,
    capacity_utilization_score     FLOAT,
    priority_score                 FLOAT,
    risk_score                     FLOAT,
    service_level_score            FLOAT,
    co2_score                      FLOAT,
    final_heuristic_score          FLOAT,
    
    -- =========================================================================
    -- A.2 CONTEXT FEATURES (aus Routing/Capacity Engine)
    -- =========================================================================
    distance_pickup_to_route_km        FLOAT,
    distance_delivery_to_destination_km FLOAT,
    eta_to_pickup_minutes              FLOAT,
    eta_to_delivery_minutes            FLOAT,
    free_volume_m3                     FLOAT,
    free_pallets                       INTEGER,
    free_weight_kg                     FLOAT,
    vehicle_type                       VARCHAR(32),
    tour_progress_pct                  FLOAT,
    
    -- =========================================================================
    -- ENTITY IDs (für Joins mit historischen Features)
    -- =========================================================================
    customer_id                    VARCHAR(64),
    driver_id                      VARCHAR(64),
    vehicle_id                     VARCHAR(64),
    lane_id                        VARCHAR(64),
    
    -- =========================================================================
    -- METADATA
    -- =========================================================================
    source_system                  VARCHAR(32)    DEFAULT 'suggestion-engine',
    ingestion_timestamp            TIMESTAMP      DEFAULT CURRENT_TIMESTAMP(),
    
    -- Primary Key Constraint
    PRIMARY KEY (suggestion_id)
);

-- Indexes für Performance
CREATE INDEX idx_suggestion_generated_tour ON suggestion_generated(tour_id);
CREATE INDEX idx_suggestion_generated_customer ON suggestion_generated(customer_id);
CREATE INDEX idx_suggestion_generated_driver ON suggestion_generated(driver_id);
CREATE INDEX idx_suggestion_generated_at ON suggestion_generated(generated_at);

-- Partitioning (Snowflake/BigQuery style)
-- ALTER TABLE suggestion_generated CLUSTER BY (generated_at, tour_id);


-- =============================================================================
-- 2) ROH-EVENTS: suggestion_outcome
-- =============================================================================
-- Zweck: Outcome/Labels aus Suggestion-Entscheidungen
-- Source: suggestion-outcome Kafka Topic
-- Refresh: Echtzeit (Streaming)
-- =============================================================================

CREATE TABLE IF NOT EXISTS suggestion_outcome (
    -- Primary Key
    suggestion_id                  VARCHAR(64)    NOT NULL,
    
    -- =========================================================================
    -- DECISION
    -- =========================================================================
    decision                       VARCHAR(16),              -- ACCEPT / REJECT / NONE / TIMEOUT
    decided_by                     VARCHAR(16),              -- DRIVER / DISPATCHER / SYSTEM / AUTO
    decision_at                    TIMESTAMP,
    decision_latency_seconds       INTEGER,
    
    -- =========================================================================
    -- EXECUTION
    -- =========================================================================
    executed                       BOOLEAN,
    execution_failure_reason       VARCHAR(256),
    execution_at                   TIMESTAMP,
    
    -- =========================================================================
    -- FINANCIAL / OPERATIONAL METRICS
    -- =========================================================================
    planned_margin                 FLOAT,
    realized_margin                FLOAT,
    margin_delta                   FLOAT,                    -- realized - planned
    delay_minutes                  FLOAT,
    co2_impact_kg                  FLOAT,
    distance_actual_km             FLOAT,
    
    -- =========================================================================
    -- ML CONTEXT (welches Modell war aktiv)
    -- =========================================================================
    model_used                     VARCHAR(16),              -- HEURISTIC / ML / BLEND
    model_version                  VARCHAR(32),
    heuristic_weights_version      VARCHAR(32),
    config_version                 VARCHAR(32),
    
    -- =========================================================================
    -- FEEDBACK
    -- =========================================================================
    feedback_rating                INTEGER,                  -- 1-5 Sterne
    feedback_text                  VARCHAR(1000),
    
    -- =========================================================================
    -- METADATA
    -- =========================================================================
    source_system                  VARCHAR(32)    DEFAULT 'execution-service',
    ingestion_timestamp            TIMESTAMP      DEFAULT CURRENT_TIMESTAMP(),
    
    -- Primary Key Constraint
    PRIMARY KEY (suggestion_id)
);

-- Indexes
CREATE INDEX idx_suggestion_outcome_decision ON suggestion_outcome(decision);
CREATE INDEX idx_suggestion_outcome_at ON suggestion_outcome(decision_at);
CREATE INDEX idx_suggestion_outcome_model ON suggestion_outcome(model_version);


-- =============================================================================
-- 3) HISTORISCHE FEATURES (aggregiert, täglich)
-- =============================================================================
-- Zweck: Vorberechnete historische Features für ML Training/Serving
-- Refresh: Täglich (Batch)
-- Aggregationen: 30d/90d Rolling Windows
-- =============================================================================

CREATE TABLE IF NOT EXISTS historical_features (
    -- Composite Primary Key
    customer_id                    VARCHAR(64)    NOT NULL,
    driver_id                      VARCHAR(64)    NOT NULL,
    tour_id                        VARCHAR(64)    NOT NULL,
    lane_id                        VARCHAR(64),
    snapshot_date                  DATE           NOT NULL,
    
    -- =========================================================================
    -- A.3 CUSTOMER HISTORICAL FEATURES
    -- =========================================================================
    customer_acceptance_rate_7d    FLOAT,
    customer_acceptance_rate_30d   FLOAT,
    customer_acceptance_rate_90d   FLOAT,
    customer_delay_avg_30d         FLOAT,
    customer_cancellation_rate_30d FLOAT,
    customer_total_suggestions_30d INTEGER,
    customer_total_accepts_30d     INTEGER,
    customer_margin_avg_90d        FLOAT,
    customer_on_time_rate_30d      FLOAT,
    
    -- =========================================================================
    -- A.3 DRIVER HISTORICAL FEATURES
    -- =========================================================================
    driver_acceptance_rate_7d      FLOAT,
    driver_acceptance_rate_30d     FLOAT,
    driver_acceptance_rate_90d     FLOAT,
    driver_delay_avg_30d           FLOAT,
    driver_total_suggestions_30d   INTEGER,
    driver_total_accepts_30d       INTEGER,
    driver_margin_avg_90d          FLOAT,
    driver_rating_avg              FLOAT,
    driver_on_time_rate_30d        FLOAT,
    
    -- =========================================================================
    -- A.3 LANE/ROUTE HISTORICAL FEATURES
    -- =========================================================================
    lane_realized_margin_avg_90d   FLOAT,
    lane_acceptance_rate_30d       FLOAT,
    lane_delay_avg_90d             FLOAT,
    lane_total_tours_90d           INTEGER,
    lane_seasonality_score         FLOAT,
    lane_demand_factor             FLOAT,
    
    -- =========================================================================
    -- GLOBAL METRICS
    -- =========================================================================
    historical_execution_rate      FLOAT,          -- Global execution rate
    global_acceptance_rate_30d     FLOAT,
    
    -- =========================================================================
    -- METADATA
    -- =========================================================================
    computed_at                    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP(),
    data_quality_score             FLOAT,          -- Quality indicator (0-1)
    
    -- Primary Key Constraint
    PRIMARY KEY (customer_id, driver_id, tour_id, snapshot_date)
);

-- Indexes
CREATE INDEX idx_historical_features_date ON historical_features(snapshot_date);
CREATE INDEX idx_historical_features_customer ON historical_features(customer_id);
CREATE INDEX idx_historical_features_driver ON historical_features(driver_id);
CREATE INDEX idx_historical_features_lane ON historical_features(lane_id);


-- =============================================================================
-- 4) ML MODEL REGISTRY
-- =============================================================================
-- Zweck: Versionierung und Management von ML-Modellen
-- Lifecycle: CANDIDATE → ACTIVE → DEPRECATED → ROLLED_BACK
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_model_registry (
    -- Primary Key
    model_version                  VARCHAR(32)    NOT NULL,
    
    -- =========================================================================
    -- MODEL METADATA
    -- =========================================================================
    model_name                     VARCHAR(64)    NOT NULL DEFAULT 'suggestion_scoring',
    created_at                     TIMESTAMP      NOT NULL,
    created_by                     VARCHAR(64)    NOT NULL,
    algorithm                      VARCHAR(32)    NOT NULL,   -- XGBOOST / LIGHTGBM / CATBOOST
    
    -- =========================================================================
    -- HYPERPARAMETERS (JSON)
    -- =========================================================================
    hyperparams                    VARCHAR(4000),             -- JSON string
    feature_columns                VARCHAR(4000),             -- JSON array
    label_column                   VARCHAR(64)   DEFAULT 'label_accepted',
    
    -- =========================================================================
    -- TRAINING CONTEXT
    -- =========================================================================
    train_start                    TIMESTAMP,
    train_end                      TIMESTAMP,
    train_samples                  INTEGER,
    train_duration_seconds         INTEGER,
    
    -- =========================================================================
    -- VALIDATION METRICS
    -- =========================================================================
    metric_auc                     FLOAT,
    metric_ndcg_10                 FLOAT,
    metric_precision_10            FLOAT,
    metric_recall_10               FLOAT,
    metric_logloss                 FLOAT,
    
    -- =========================================================================
    -- CROSS-VALIDATION
    -- =========================================================================
    cv_folds                       INTEGER,
    cv_auc_mean                    FLOAT,
    cv_auc_std                     FLOAT,
    
    -- =========================================================================
    -- MODEL STATUS
    -- =========================================================================
    status                         VARCHAR(16)   NOT NULL DEFAULT 'CANDIDATE',  -- CANDIDATE / ACTIVE / DEPRECATED / ROLLED_BACK
    promoted_at                    TIMESTAMP,
    promoted_by                    VARCHAR(64),
    deprecated_at                  TIMESTAMP,
    deprecated_reason              VARCHAR(256),
    
    -- =========================================================================
    -- ARTIFACT LOCATION
    -- =========================================================================
    artifact_path                  VARCHAR(512),              -- S3/DBFS path
    artifact_size_bytes            BIGINT,
    artifact_checksum              VARCHAR(64),               -- MD5/SHA256
    
    -- =========================================================================
    -- MONITORING
    -- =========================================================================
    last_inference_at              TIMESTAMP,
    total_inferences               BIGINT       DEFAULT 0,
    avg_latency_ms                 FLOAT,
    
    -- Primary Key Constraint
    PRIMARY KEY (model_version)
);

-- Indexes
CREATE INDEX idx_model_registry_status ON ml_model_registry(status);
CREATE INDEX idx_model_registry_created ON ml_model_registry(created_at);
CREATE INDEX idx_model_registry_name ON ml_model_registry(model_name);


-- =============================================================================
-- 5) ML INFERENCE LOG
-- =============================================================================
-- Zweck: Logging aller ML-Inference-Requests für Monitoring & Debugging
-- Retention: 90 Tage (konfigurierbar)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_inference_log (
    -- Primary Key
    inference_id                   VARCHAR(64)    NOT NULL,
    suggestion_id                  VARCHAR(64)    NOT NULL,
    
    -- =========================================================================
    -- MODEL CONTEXT
    -- =========================================================================
    model_version                  VARCHAR(32)    NOT NULL,
    model_name                     VARCHAR(64)    NOT NULL DEFAULT 'suggestion_scoring',
    
    -- =========================================================================
    -- TIMING
    -- =========================================================================
    inference_at                   TIMESTAMP      NOT NULL,
    inference_latency_ms           FLOAT,
    
    -- =========================================================================
    -- SCORES
    -- =========================================================================
    score_ml                       FLOAT,
    score_heuristic                FLOAT,
    score_final                    FLOAT,
    blend_alpha                    FLOAT,          -- 0.8 = 80% heuristic
    
    -- =========================================================================
    -- FEATURES SNAPSHOT (für Drift Detection)
    -- =========================================================================
    feature_snapshot               VARCHAR(8000),  -- JSON der Input-Features
    
    -- =========================================================================
    -- EXPLAINABILITY
    -- =========================================================================
    top_feature_contributors       VARCHAR(2000),  -- JSON array [{feature, impact, direction}]
    shap_values                    VARCHAR(4000),  -- JSON (optional, bei Bedarf)
    
    -- =========================================================================
    -- CONTEXT
    -- =========================================================================
    customer_id                    VARCHAR(64),
    driver_id                      VARCHAR(64),
    tour_id                        VARCHAR(64),
    request_source                 VARCHAR(32),    -- DISPATCHER_UI / API / BATCH
    
    -- =========================================================================
    -- OUTCOME TRACKING (wird später aktualisiert)
    -- =========================================================================
    actual_outcome                 VARCHAR(16),    -- ACCEPT / REJECT (nachgeführt)
    outcome_updated_at             TIMESTAMP,
    
    -- Primary Key Constraint
    PRIMARY KEY (inference_id)
);

-- Indexes
CREATE INDEX idx_inference_log_suggestion ON ml_inference_log(suggestion_id);
CREATE INDEX idx_inference_log_model ON ml_inference_log(model_version);
CREATE INDEX idx_inference_log_at ON ml_inference_log(inference_at);
CREATE INDEX idx_inference_log_customer ON ml_inference_log(customer_id);
CREATE INDEX idx_inference_log_driver ON ml_inference_log(driver_id);

-- Partitioning für Performance (nach Zeit)
-- ALTER TABLE ml_inference_log PARTITION BY RANGE (inference_at);


-- =============================================================================
-- 6) ML TRAINING DATASET (materialisiert)
-- =============================================================================
-- Zweck: Materialisiertes Training Dataset für schnelles Training
-- Refresh: Täglich via ETL Pipeline
-- =============================================================================

CREATE TABLE IF NOT EXISTS ml_training_dataset (
    -- Primary Key
    suggestion_id                  VARCHAR(64)    NOT NULL,
    
    -- =========================================================================
    -- ENTITY IDs
    -- =========================================================================
    tour_id                        VARCHAR(64)    NOT NULL,
    order_id                       VARCHAR(64),
    customer_id                    VARCHAR(64),
    driver_id                      VARCHAR(64),
    vehicle_id                     VARCHAR(64),
    lane_id                        VARCHAR(64),
    
    -- =========================================================================
    -- A.1 HEURISTIC FEATURES
    -- =========================================================================
    revenue_score                  FLOAT,
    capacity_utilization_score     FLOAT,
    priority_score                 FLOAT,
    risk_score                     FLOAT,
    service_level_score            FLOAT,
    co2_score                      FLOAT,
    final_heuristic_score          FLOAT,
    
    -- =========================================================================
    -- A.2 CONTEXT FEATURES
    -- =========================================================================
    distance_pickup_to_route_km    FLOAT,
    distance_delivery_to_destination_km FLOAT,
    eta_to_pickup_minutes          FLOAT,
    eta_to_delivery_minutes        FLOAT,
    free_volume_m3                 FLOAT,
    free_pallets                   INTEGER,
    free_weight_kg                 FLOAT,
    vehicle_type                   VARCHAR(32),
    tour_progress_pct              FLOAT,
    
    -- =========================================================================
    -- A.3 HISTORICAL FEATURES
    -- =========================================================================
    customer_acceptance_rate_30d   FLOAT,
    driver_acceptance_rate_30d     FLOAT,
    lane_realized_margin_avg_90d   FLOAT,
    customer_delay_avg_30d         FLOAT,
    driver_delay_avg_30d           FLOAT,
    customer_cancellation_rate_30d FLOAT,
    historical_execution_rate      FLOAT,
    
    -- =========================================================================
    -- LABELS
    -- =========================================================================
    label_accepted                 INTEGER,        -- 0 / 1
    label_executed                 FLOAT,          -- 0 / 0.5 / 1
    decision                       VARCHAR(16),
    
    -- =========================================================================
    -- TIME FEATURES
    -- =========================================================================
    generated_at                   TIMESTAMP,
    hour_of_day                    INTEGER,
    day_of_week                    INTEGER,
    week_of_year                   INTEGER,
    
    -- =========================================================================
    -- DERIVED FEATURES
    -- =========================================================================
    combined_acceptance_rate       FLOAT,
    risk_adjusted_revenue          FLOAT,
    distance_ratio                 FLOAT,
    capacity_urgency               FLOAT,
    time_pressure_score            FLOAT,
    
    -- =========================================================================
    -- META
    -- =========================================================================
    model_version                  VARCHAR(32),
    snapshot_date                  DATE,
    created_at                     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP(),
    
    -- Primary Key Constraint
    PRIMARY KEY (suggestion_id)
);

-- Indexes
CREATE INDEX idx_training_dataset_date ON ml_training_dataset(snapshot_date);
CREATE INDEX idx_training_dataset_label ON ml_training_dataset(label_accepted);


-- =============================================================================
-- 7) DATA QUALITY LOG
-- =============================================================================
-- Zweck: Logging der Datenqualität für Monitoring
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_quality_log (
    check_id                       VARCHAR(64)    NOT NULL,
    table_name                     VARCHAR(64)    NOT NULL,
    check_date                     DATE           NOT NULL,
    
    -- Quality Metrics
    total_rows                     INTEGER,
    null_rate                      FLOAT,
    duplicate_rate                 FLOAT,
    anomaly_rate                   FLOAT,
    data_freshness_hours           FLOAT,
    
    -- Status
    status                         VARCHAR(16),    -- PASS / WARN / FAIL
    details                        VARCHAR(2000),  -- JSON
    
    created_at                     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (check_id)
);


-- =============================================================================
-- 8) FEATURE DRIFT LOG
-- =============================================================================
-- Zweck: Tracking von Feature Drift für Model Monitoring
-- =============================================================================

CREATE TABLE IF NOT EXISTS feature_drift_log (
    drift_id                       VARCHAR(64)    NOT NULL,
    feature_name                   VARCHAR(64)    NOT NULL,
    check_date                     DATE           NOT NULL,
    
    -- Statistics (Reference vs Current)
    ref_mean                       FLOAT,
    ref_std                        FLOAT,
    curr_mean                      FLOAT,
    curr_std                       FLOAT,
    
    -- Drift Metrics
    ks_statistic                   FLOAT,
    ks_p_value                     FLOAT,
    psi_score                      FLOAT,          -- Population Stability Index
    
    -- Status
    drift_detected                 BOOLEAN,
    severity                       VARCHAR(16),    -- NONE / LOW / MEDIUM / HIGH
    
    created_at                     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP(),
    
    PRIMARY KEY (drift_id)
);


-- =============================================================================
-- VIEWS
-- =============================================================================

-- View 1: Base Features (Join generated + outcome)
CREATE OR REPLACE VIEW vw_suggestion_base_features AS
SELECT
    -- Primary Keys
    g.suggestion_id,
    g.tour_id,
    g.order_id,
    g.segment_id,
    g.generated_at,
    
    -- A.1 Heuristic Features
    g.revenue_score,
    g.capacity_utilization_score,
    g.priority_score,
    g.risk_score,
    g.service_level_score,
    g.co2_score,
    g.final_heuristic_score,
    
    -- A.2 Context Features
    g.distance_pickup_to_route_km,
    g.distance_delivery_to_destination_km,
    g.eta_to_pickup_minutes,
    g.eta_to_delivery_minutes,
    g.free_volume_m3,
    g.free_pallets,
    g.free_weight_kg,
    g.vehicle_type,
    g.tour_progress_pct,
    
    -- Entity IDs
    g.customer_id,
    g.driver_id,
    g.vehicle_id,
    g.lane_id,
    
    -- Outcome / Labels
    o.decision,
    CASE WHEN o.decision = 'ACCEPT' THEN 1 ELSE 0 END AS label_accepted,
    o.executed,
    o.realized_margin,
    o.delay_minutes,
    o.co2_impact_kg,
    
    -- Meta
    o.model_used,
    o.model_version,
    o.heuristic_weights_version,
    o.decision_at,
    o.decision_latency_seconds,
    
    -- Derived Labels
    CASE 
        WHEN o.decision = 'ACCEPT' AND o.executed = TRUE THEN 1
        WHEN o.decision = 'ACCEPT' AND o.executed = FALSE THEN 0.5
        ELSE 0 
    END AS label_executed,
    
    -- Time Features
    EXTRACT(HOUR FROM g.generated_at) AS hour_of_day,
    EXTRACT(DOW FROM g.generated_at) AS day_of_week,
    EXTRACT(WEEK FROM g.generated_at) AS week_of_year

FROM suggestion_generated g
LEFT JOIN suggestion_outcome o
    ON g.suggestion_id = o.suggestion_id;

-- View 2: Training Dataset (Base + Historical)
CREATE OR REPLACE VIEW vw_ml_training_dataset AS
SELECT
    b.*,
    
    -- A.3 Historical Features (with COALESCE for defaults)
    COALESCE(h.customer_acceptance_rate_30d, 0.5) AS customer_acceptance_rate_30d,
    COALESCE(h.driver_acceptance_rate_30d, 0.5) AS driver_acceptance_rate_30d,
    COALESCE(h.lane_realized_margin_avg_90d, 0.0) AS lane_realized_margin_avg_90d,
    COALESCE(h.customer_delay_avg_30d, 0.0) AS customer_delay_avg_30d,
    COALESCE(h.driver_delay_avg_30d, 0.0) AS driver_delay_avg_30d,
    COALESCE(h.customer_cancellation_rate_30d, 0.0) AS customer_cancellation_rate_30d,
    COALESCE(h.historical_execution_rate, 0.5) AS historical_execution_rate,
    
    -- Derived Features
    (COALESCE(h.customer_acceptance_rate_30d, 0.5) + 
     COALESCE(h.driver_acceptance_rate_30d, 0.5)) / 2.0 AS combined_acceptance_rate,
    
    b.revenue_score * (1.0 - COALESCE(b.risk_score, 0)) AS risk_adjusted_revenue,
    
    CASE 
        WHEN b.distance_pickup_to_route_km > 0 
        THEN b.distance_delivery_to_destination_km / b.distance_pickup_to_route_km
        ELSE 1.0 
    END AS distance_ratio,
    
    b.tour_progress_pct * (1.0 - (b.free_volume_m3 / 100.0)) AS capacity_urgency,
    
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

-- View 3: Labeled Training Data only
CREATE OR REPLACE VIEW vw_ml_training_labeled AS
SELECT *
FROM vw_ml_training_dataset
WHERE label_accepted IS NOT NULL
  AND decision IS NOT NULL;

-- View 4: Inference Features (no labels)
CREATE OR REPLACE VIEW vw_ml_inference_features AS
SELECT
    suggestion_id,
    tour_id,
    order_id,
    generated_at,
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
    combined_acceptance_rate,
    risk_adjusted_revenue,
    distance_ratio,
    capacity_urgency,
    time_pressure_score
FROM vw_ml_training_dataset
WHERE decision IS NULL;


-- =============================================================================
-- GRANTS / PERMISSIONS
-- =============================================================================
-- GRANT SELECT ON ALL TABLES IN SCHEMA ml TO ROLE ml_reader;
-- GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA ml TO ROLE ml_writer;
-- GRANT ALL ON ALL TABLES IN SCHEMA ml TO ROLE ml_admin;
