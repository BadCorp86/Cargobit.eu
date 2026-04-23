# CargoBit ML Serving Layer - Architektur

## Übersicht

Diese Dokumentation beschreibt die Architektur des ML Serving Layers für die CargoBit Suggestion Scoring Plattform.

---

## Komponenten-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CargoBit ML Serving Architecture                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────┐         ┌────────────────┐ │
│  │ Suggestion      │         │ ML Inference    │         │ Config Service │ │
│  │ Service         │────────▶│ Service         │◀────────│                │ │
│  │                 │         │                 │         │                │ │
│  │ - Kandidaten    │         │ - /score        │         │ - blendFactor  │ │
│  │ - Heuristik     │         │ - /explain      │         │ - featureFlags │ │
│  │ - Blend Logic   │         │ - /health       │         │ - modelVersion │ │
│  └────────┬────────┘         └────────┬────────┘         └────────────────┘ │
│           │                           │                                     │
│           │                           │                                     │
│           ▼                           ▼                                     │
│  ┌─────────────────┐         ┌─────────────────┐                           │
│  │ Feature Store   │         │ Model Registry  │                           │
│  │ (Feast + Redis) │         │ + Model Store   │                           │
│  │                 │         │                 │                           │
│  │ - Online Store  │         │ - Versionen     │                           │
│  │ - <10ms Latency │         │ - Metriken      │                           │
│  └─────────────────┘         │ - Artefakte     │                           │
│                              └────────┬────────┘                           │
│                                       │                                     │
│                                       ▼                                     │
│                              ┌─────────────────┐                           │
│                              │ Monitoring      │                           │
│                              │                 │                           │
│                              │ - Inference Log │                           │
│                              │ - Dashboards    │                           │
│                              │ - Drift Detect  │                           │
│                              └─────────────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Komponenten im Detail

### 1.1 Suggestion Service

**Verantwortlichkeit:**
- Generierung von Suggestion-Kandidaten
- Berechnung der Heuristik-Scores
- Blend von Heuristik + ML Scores
- Rückgabe an Dispatcher UI

**Flow:**
```
1. Lade Config (blendFactor, aktive model_version)
2. Generiere Kandidaten aus Capacity Engine
3. Berechne Heuristik-Scores (revenueScore, capacityScore, ...)
4. Hole ML-Score vom ML Inference Service
5. Blend: score_final = α * score_heuristic + (1-α) * score_ml
6. Sortiere Kandidaten nach score_final
7. Return Top-N an Dispatcher
```

**API:**
```http
POST /suggestions/generate
Content-Type: application/json

{
  "tourId": "tour_123",
  "orderId": "order_456",
  "constraints": {
    "maxDetourKm": 50,
    "minMargin": 100
  }
}

Response:
{
  "suggestions": [
    {
      "suggestionId": "sg_789",
      "scoreFinal": 0.87,
      "scoreHeuristic": 0.82,
      "scoreMl": 0.91,
      "rank": 1
    },
    ...
  ],
  "modelVersion": "v20250419_a3b2c1",
  "blendAlpha": 0.8
}
```

---

### 1.2 ML Inference Service

**Verantwortlichkeit:**
- Laden des aktiven Modells
- Scoring von Features
- SHAP Explainability

**Endpoints:**

#### POST /score
```http
POST /score
Content-Type: application/json

{
  "suggestionId": "sg_789",
  "features": {
    "revenueScore": 0.85,
    "capacityUtilizationScore": 0.72,
    "priorityScore": 1.0,
    "riskScore": 0.9,
    "serviceLevelScore": 0.7,
    "co2Score": 0.8,
    "distancePickupToRouteKm": 3.2,
    "etaToPickupMinutes": 14,
    "freeVolumeM3": 6.0,
    "tourProgressPct": 0.45,
    "customerAcceptanceRate30d": 0.68,
    "driverAcceptanceRate30d": 0.72
  }
}

Response:
{
  "scoreMl": 0.91,
  "modelVersion": "v20250419_a3b2c1",
  "latencyMs": 8.5
}
```

#### POST /explain
```http
POST /explain
Content-Type: application/json

{
  "modelVersion": "latest",
  "features": { ... }
}

Response:
{
  "modelVersion": "v20250419_a3b2c1",
  "mlScore": 0.91,
  "topContributors": [
    { "feature": "revenueScore", "impact": 0.35, "direction": "positive" },
    { "feature": "serviceLevelScore", "impact": 0.22, "direction": "positive" },
    { "feature": "distancePickupToRouteKm", "impact": -0.12, "direction": "negative" }
  ],
  "explanationMethod": "shap",
  "generatedAt": "2025-04-19T14:30:00Z"
}
```

#### GET /health
```json
{
  "status": "healthy",
  "modelLoaded": true,
  "modelVersion": "v20250419_a3b2c1",
  "uptimeSeconds": 86400,
  "requestsProcessed": 15234
}
```

---

### 1.3 Config Service

**Verantwortlichkeit:**
- Zentrale Konfiguration für ML-Parameter
- Feature Flags
- A/B Test Konfiguration

**Config Parameter:**
```yaml
ml_config:
  blend_alpha: 0.8                    # 80% Heuristik, 20% ML
  active_model_version: "v20250419_a3b2c1"
  ml_enabled: true
  fallback_to_heuristic: true
  
feature_flags:
  ml_scoring_enabled: true
  shap_explanations_enabled: true
  ltr_ranking_enabled: false
  
ab_tests:
  - experiment_id: "exp_ml_blend_v2"
    variants:
      - name: "control"
        blend_alpha: 0.8
      - name: "treatment"
        blend_alpha: 0.6
    traffic_allocation: 0.1           # 10% Traffic
```

---

### 1.4 Model Registry & Model Store

**Model Registry (Datenbank):**
```sql
SELECT * FROM ml_model_registry WHERE status = 'ACTIVE';

model_version      | v20250419_a3b2c1
created_at         | 2025-04-19 02:15:00
algorithm          | LIGHTGBM
metric_auc         | 0.78
metric_ndcg_10     | 0.72
status             | ACTIVE
artifact_path      | s3://cargobit-models/v20250419_a3b2c1/model.txt
```

**Model Store (S3/DBFS):**
```
s3://cargobit-models/
├── v20250419_a3b2c1/
│   ├── model.txt              # LightGBM Model
│   ├── model_metadata.json    # Features, Params
│   └── preprocessing.pkl      # Scaler, Encoder
├── v20250418_x9y8z7/
│   └── ...
```

---

### 1.5 Feature Store (Feast)

**Online Store (Redis):**
- Echtzeit-Features für Inference
- <10ms Latency
- Key: `cargobit_features:{customer_id}:{driver_id}:{tour_id}`

**Feature Retrieval:**
```python
from feast import FeatureStore

store = FeatureStore(repo_path=".")

# Get online features
features = store.get_online_features(
    features=[
        "customer_features:acceptance_rate_30d",
        "driver_features:acceptance_rate_30d",
        "lane_features:realized_margin_avg_90d",
    ],
    entity_rows=[
        {"customer_id": "cust_123", "driver_id": "drv_456", "lane_id": "lane_789"}
    ],
).to_dict()
```

---

### 1.6 Monitoring & Logging

**ml_inference_log:**
```sql
-- Jeder Inference-Request wird geloggt
INSERT INTO ml_inference_log (
    inference_id, suggestion_id, model_version,
    inference_at, score_ml, score_heuristic, score_final,
    top_feature_contributors, actual_outcome
) VALUES (...);
```

**Dashboards:**
1. **Score Distribution** - Verteilung der ML/Heuristik Scores
2. **Acceptance Rate by Score** - Korrelation Score → Acceptance
3. **Model Drift** - Feature Drift Detection (KS-Test, PSI)
4. **Latency** - P50/P95/P99 Inference Latency

**Alerts:**
- AUC Drop < 0.70
- Feature Drift (PSI > 0.2)
- Latency P95 > 50ms
- Model Load Failure

---

## 2. End-to-End Flow

### 2.1 Suggestion Scoring Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         Suggestion Scoring Flow                            │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. Config Load                                                            │
│  ┌─────────────┐                                                           │
│  │ Suggestion  │──▶ GET /config ──▶ Config Service                         │
│  │ Service     │◀── blendAlpha=0.8, modelVersion=v20250419                 │
│  └─────────────┘                                                           │
│        │                                                                   │
│        ▼                                                                   │
│  2. Feature Retrieval                                                       │
│  ┌─────────────┐                                                           │
│  │ Suggestion  │──▶ get_online_features() ──▶ Feature Store (Redis)        │
│  │ Service     │◀── customer_acceptance_rate_30d=0.68, ...                 │
│  └─────────────┘                                                           │
│        │                                                                   │
│        ▼                                                                   │
│  3. Heuristik Scoring                                                      │
│  ┌─────────────┐                                                           │
│  │ Suggestion  │──▶ score_heuristic = f(revenueScore, capacityScore, ...)  │
│  │ Service     │    = 0.35 * revenue + 0.20 * capacity + ...               │
│  └─────────────┘    = 0.82                                                 │
│        │                                                                   │
│        ▼                                                                   │
│  4. ML Scoring                                                             │
│  ┌─────────────┐     ┌─────────────┐                                       │
│  │ Suggestion  │──▶  │ ML Inference│──▶ Load Model from Store              │
│  │ Service     │     │ Service     │    model.predict(features)            │
│  └─────────────┘     └─────────────┘    = 0.91                             │
│        │                    │                                              │
│        │◀───────────────────┘                                              │
│        │                                                                   │
│        ▼                                                                   │
│  5. Blend                                                                  │
│  ┌─────────────┐                                                           │
│  │ Suggestion  │──▶ score_final = 0.8 * 0.82 + 0.2 * 0.91                 │
│  │ Service     │            = 0.656 + 0.182 = 0.838                        │
│  └─────────────┘                                                           │
│        │                                                                   │
│        ▼                                                                   │
│  6. Logging                                                                │
│  ┌─────────────┐                                                           │
│  │ Suggestion  │──▶ INSERT INTO ml_inference_log (...)                     │
│  │ Service     │                                                           │
│  └─────────────┘                                                           │
│        │                                                                   │
│        ▼                                                                   │
│  7. Response                                                               │
│  ┌─────────────┐                                                           │
│  │ Dispatcher  │◀── Top-N suggestions sorted by score_final                │
│  │ UI          │                                                           │
│  └─────────────┘                                                           │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Explainability Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         Explainability Flow                                 │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. User Request (Dispatcher clicks "Explain")                             │
│  ┌─────────────┐                                                           │
│  │ Dispatcher  │──▶ POST /explain {suggestionId: "sg_789"}                 │
│  │ UI          │                                                           │
│  └─────────────┘                                                           │
│        │                                                                   │
│        ▼                                                                   │
│  2. Load Features from Log                                                 │
│  ┌─────────────┐                                                           │
│  │ ML Service  │──▶ SELECT feature_snapshot FROM ml_inference_log          │
│  │             │    WHERE suggestion_id = 'sg_789'                         │
│  └─────────────┘                                                           │
│        │                                                                   │
│        ▼                                                                   │
│  3. Compute SHAP Values                                                    │
│  ┌─────────────┐                                                           │
│  │ ML Service  │──▶ explainer = shap.TreeExplainer(model)                  │
│  │             │    shap_values = explainer.shap_values(features)          │
│  └─────────────┘                                                           │
│        │                                                                   │
│        ▼                                                                   │
│  4. Format Response                                                        │
│  ┌─────────────┐                                                           │
│  │ ML Service  │──▶ top_contributors = sorted(shap_values)[:5]             │
│  │             │    format with FEATURE_DESCRIPTIONS                       │
│  └─────────────┘                                                           │
│        │                                                                   │
│        ▼                                                                   │
│  5. Display in UI                                                          │
│  ┌─────────────┐                                                           │
│  │ Dispatcher  │◀── Waterfall Chart + Feature Importance                   │
│  │ UI          │    + Natural Language Explanation                         │
│  └─────────────┘                                                           │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Model Lifecycle

### 3.1 Training Pipeline (Daily)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Daily Training Pipeline (Airflow)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 02:00 UTC - DAG Start                                                    ││
│  └────────────────────────────────────┬────────────────────────────────────┘│
│                                       │                                      │
│                                       ▼                                      │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │ ingest_events    │────▶│ build_features   │────▶│ build_dataset    │    │
│  │ (Kafka→Warehouse)│     │ (30d/90d Agg)    │     │ (Materialize)    │    │
│  └──────────────────┘     └──────────────────┘     └──────────────────┘    │
│                                                              │               │
│                                                              ▼               │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │ notify_success   │◀────│ promote_model    │◀────│ train_model      │    │
│  │ (Slack)          │     │ (if AUC/NDCG OK) │     │ (LightGBM)       │    │
│  └──────────────────┘     └──────────────────┘     └──────────────────┘    │
│                                       │                                      │
│                                       ▼                                      │
│                          ┌──────────────────────┐                            │
│                          │ Model Registry       │                            │
│                          │ status: ACTIVE       │                            │
│                          │ artifact_path: s3:// │                            │
│                          └──────────────────────┘                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Promotion Criteria

```python
# Thresholds
MODEL_AUC_THRESHOLD = 0.72
MODEL_NDCG_THRESHOLD = 0.65
MIN_TRAINING_SAMPLES = 10000

# Promotion Logic
if auc >= MODEL_AUC_THRESHOLD and ndcg >= MODEL_NDCG_THRESHOLD:
    # Deactivate old model
    UPDATE ml_model_registry SET status = 'DEPRECATED' WHERE status = 'ACTIVE'
    # Promote new model
    INSERT model_version, status = 'ACTIVE'
else:
    # Keep as candidate
    INSERT model_version, status = 'CANDIDATE'
```

### 3.3 Rollback Procedure

```
1. Identify issue (monitoring alert, manual review)
2. UPDATE ml_model_registry 
   SET status = 'DEPRECATED', 
       deprecated_reason = 'Performance degradation'
   WHERE model_version = 'v20250419_a3b2c1'
3. UPDATE ml_model_registry 
   SET status = 'ACTIVE' 
   WHERE model_version = 'v20250418_x9y8z7'
4. ML Service auto-reloads on status change (or restart)
5. Verify metrics normalize
```

---

## 4. A/B Testing Integration

### 4.1 Experiment Setup

```python
# Create experiment
experiment = ab_framework.create_experiment(
    name="ml_blend_alpha_v2",
    variants=[
        {"name": "control", "blend_alpha": 0.8, "is_control": True},
        {"name": "treatment", "blend_alpha": 0.6},
    ],
    metrics=[
        {"name": "acceptance_rate", "type": "binary"},
        {"name": "realized_margin", "type": "continuous"},
    ],
    traffic_allocation="multi_armed_bandit",
)
```

### 4.2 Variant Assignment

```python
# Get variant for user
variant = ab_framework.get_variant(
    experiment_id="exp_ml_blend_v2",
    user_id="dispatcher_123",
)

# Use variant config
blend_alpha = variant.config.get("blend_alpha", 0.8)
```

### 4.3 Outcome Tracking

```python
# Track conversion
ab_framework.track_event(
    experiment_id="exp_ml_blend_v2",
    user_id="dispatcher_123",
    metric_name="acceptance_rate",
    value=1.0,  # accepted
)
```

---

## 5. Performance Requirements

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Inference Latency P50 | < 10ms | > 15ms |
| Inference Latency P95 | < 25ms | > 40ms |
| Inference Latency P99 | < 50ms | > 80ms |
| Model Load Time | < 5s | > 10s |
| Feature Store Latency | < 10ms | > 20ms |
| Throughput | > 1000 req/s | < 500 req/s |

---

## 6. Security

- **Service-to-Service Auth:** mTLS + Service JWT
- **API Auth:** Bearer Token (Dispatcher Service)
- **Model Signing:** Models are signed and verified on load
- **Feature Data:** Encrypted at rest (AES-256)
- **Audit Log:** All inference requests logged

---

## 7. Disaster Recovery

### Fallback Strategy

```python
# ML Service fallback logic
def get_score(suggestion_id, features):
    try:
        # Try ML scoring
        ml_score = ml_service.score(features)
        return ml_score
    except Exception as e:
        logger.error(f"ML scoring failed: {e}")
        
        if config.get("fallback_to_heuristic", True):
            # Fallback to heuristic only
            return heuristic_score
        else:
            raise
```

### Circuit Breaker

```python
# Circuit breaker for ML service
circuit_breaker = CircuitBreaker(
    failure_threshold=5,
    reset_timeout_seconds=30,
)

@circuit_breaker
def call_ml_service(features):
    return ml_client.score(features)
```

---

## 8. File Structure

```
/ml-pipeline/
├── sql/
│   ├── ddl_schema.sql              # Data Warehouse Schema
│   ├── vw_suggestion_base_features.sql
│   └── vw_ml_training_dataset.sql
├── airflow/
│   └── dags/
│       └── ml_suggestion_scoring_daily.py
├── serving/
│   ├── ml_serving_service.py       # FastAPI Service
│   └── explainability_api.py       # SHAP API
├── feature_store/
│   ├── feature_store.yaml          # Feast Config
│   ├── feature_definitions.py
│   └── online_store_client.py
├── ltr/
│   └── learning_to_rank.py         # LTR Model
├── ab_testing/
│   └── ab_testing_framework.py     # A/B Testing
└── training/
    └── train_ltr.py                # Training Scripts
```

---

**Version:** 2.0.0  
**Autor:** CargoBit ML Team  
**Letzte Aktualisierung:** 2025-04-19
