# ML-Upgrade & Scoring-Monitoring-Dashboard

**CargoBit Transport-Plattform – Technische Spezifikation**

---

## 1. ML-Upgrade auf Basis der bestehenden Heuristik

### 1.1 Zielbild

Das ML-Upgrade erweitert die bestehende Heuristik, ohne sie zu ersetzen:

| Komponente | Rolle | Status |
|------------|-------|--------|
| **Heuristik** | Fallback & Baseline | Immer aktiv |
| **ML-Modell** | Optimierung | Optional, blend-bar |

**Architektur-Prinzip:**
```
Score_final = α × Score_heuristic + (1 - α) × Score_ml

Start: α = 0.8 (Heuristik dominiert)
Ziel:  α = 0.5 (Ausgewogen) nach Validierung
```

### 1.2 Zusätzliche ML-Features

#### 1.2.1 Feature-Katalog

| Feature | Typ | Beschreibung | Quelle |
|---------|-----|--------------|--------|
| `historicalAcceptanceRate_customer` | Float (0-1) | Annahmerate pro Kunde | CRM/Analytics |
| `historicalAcceptanceRate_lane` | Float (0-1) | Annahmerate pro Lane | Analytics |
| `historicalAcceptanceRate_orderType` | Float (0-1) | Annahmerate pro Auftragstyp | Analytics |
| `driverAcceptanceRate` | Float (0-1) | Annahmerate pro Fahrer | Driver-Service |
| `vehicleTypeFit` | Float (0-1) | Passgenauigkeit Fahrzeugtyp | Vehicle-Service |
| `realizedMargin` | Float (€) | Geplanter vs. tatsächlicher DB | Finance |
| `delayImpact` | Int (Minuten) | Verspätung durch Zusatzauftrag | Tracking |
| `customerRetentionImpact` | Bool | Folgeaufträge generiert | CRM |
| `timeOfDayScore` | Float (0-1) | Tageszeit-Optimierung | Historical |
| `dayOfWeekScore` | Float (0-1) | Wochentag-Optimierung | Historical |
| `seasonalityScore` | Float (0-1) | Saisonalität | Historical |

#### 1.2.2 Feature-Berechnung (Beispiele)

```python
def calculate_historical_acceptance_rate(customer_id: str, lane: str) -> float:
    """
    Berechnet die historische Annahmerate für Kunde + Lane.
    Zeitfenster: Letzte 90 Tage
    """
    query = """
        SELECT 
            COUNT(*) FILTER (WHERE decision = 'ACCEPT')::float / COUNT(*) 
        FROM suggestion_decisions 
        WHERE customer_id = %s 
          AND lane = %s 
          AND created_at > NOW() - INTERVAL '90 days'
    """
    return execute_query(query, [customer_id, lane])


def calculate_driver_acceptance_rate(driver_id: str) -> float:
    """
    Berechnet die Annahmerate eines Fahrers für Zusatzaufträge.
    Gewichtung: Neuere Entscheidungen höher.
    """
    query = """
        SELECT 
            SUM(CASE WHEN decision = 'ACCEPT' THEN weight ELSE 0 END) / SUM(weight)
        FROM (
            SELECT 
                decision,
                EXP(-EXTRACT(DAY FROM NOW() - created_at) / 30.0) as weight
            FROM suggestion_decisions
            WHERE driver_id = %s
        ) sub
    """
    return execute_query(query, [driver_id])


def calculate_delay_impact(suggestion_id: str) -> int:
    """
    Berechnet die Verspätung in Minuten, die durch den Zusatzauftrag entstanden ist.
    """
    query = """
        SELECT 
            COALESCE(
                actual_delivery_time - planned_delivery_time, 
                INTERVAL '0 minutes'
            )::int / 60 as delay_minutes
        FROM tour_executions
        WHERE suggestion_id = %s
    """
    return execute_query(query, [suggestion_id])
```

### 1.3 Event-Schema für Training

#### 1.3.1 `suggestion.outcome` Event

```json
{
  "eventType": "suggestion.outcome",
  "eventId": "evt_abc123",
  "timestamp": "2025-04-19T14:30:00Z",
  "suggestionId": "SUG_001",
  "tourId": "T123",
  "orderId": "ORD_456",
  "customerId": "C123",
  "driverId": "DRV_42",
  "vehicleId": "V789",
  "lane": "DE-BER->DE-HAM",
  "decision": {
    "accepted": true,
    "decidedBy": "DISPATCHER",
    "decidedAt": "2025-04-19T10:15:00Z"
  },
  "execution": {
    "executed": true,
    "completedAt": "2025-04-19T18:45:00Z",
    "delayMinutes": 4,
    "issues": []
  },
  "financials": {
    "plannedMargin": 140.0,
    "realizedMargin": 135.0,
    "marginDelta": -5.0,
    "revenue": 180.0,
    "costs": 45.0
  },
  "heuristics": {
    "score": 9.49,
    "components": {
      "revenue": 9.00,
      "capacityUtilization": 0.07,
      "priority": 0.10,
      "risk": 0.09,
      "serviceLevel": 0.15,
      "co2": 0.08
    }
  },
  "context": {
    "timeOfDay": "MORNING",
    "dayOfWeek": "FRIDAY",
    "weatherCondition": "CLEAR",
    "trafficCondition": "NORMAL"
  }
}
```

#### 1.3.2 Kafka-Topic-Konfiguration

```yaml
# Ergänzung zu scoring-config.yaml
training:
  events:
    - topic: logistics.suggestion.outcome.v1
      partitionKey: suggestionId
      retention: 365d
      partitions: 6
      replication: 3
```

### 1.4 Trainingsloop

#### 1.4.1 Architektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ML TRAINING PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │  Suggestion  │     │   Decision   │     │  Execution   │            │
│  │   Service    │────▶│   Service    │────▶│   Service    │            │
│  └──────────────┘     └──────────────┘     └──────────────┘            │
│         │                    │                    │                     │
│         ▼                    ▼                    ▼                     │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              Kafka: logistics.suggestion.outcome.v1            │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                │                                        │
│                                ▼                                        │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │   Feature    │     │   Training   │     │    Model     │            │
│  │   Store      │────▶│   Pipeline   │────▶│   Registry   │            │
│  │  (Postgres)  │     │  (Airflow)   │     │   (MLflow)   │            │
│  └──────────────┘     └──────────────┘     └──────────────┘            │
│                                                     │                   │
│                                                     ▼                   │
│                                            ┌──────────────┐            │
│                                            │  Suggestion  │            │
│                                            │   Service    │            │
│                                            │ (Online ML)  │            │
│                                            └──────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 1.4.2 Trainings-Job (Airflow DAG)

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'ml-team',
    'depends_on_past': False,
    'start_date': datetime(2025, 4, 1),
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'suggestion_model_training',
    default_args=default_args,
    schedule_interval='0 2 * * *',  # Täglich um 02:00
    catchup=False
)

def extract_training_data(**context):
    """
    Extrahiert Trainingsdaten aus suggestion.outcome Events.
    """
    query = """
        SELECT 
            s.suggestion_id,
            s.customer_id,
            s.driver_id,
            s.lane,
            s.heuristic_score,
            s.heuristic_components,
            s.historical_acceptance_rate_customer,
            s.historical_acceptance_rate_lane,
            s.driver_acceptance_rate,
            s.time_of_day,
            s.day_of_week,
            s.weather_condition,
            s.traffic_condition,
            d.decision = 'ACCEPT' as label,
            e.realized_margin,
            e.delay_minutes,
            e.executed
        FROM suggestion_outcomes s
        LEFT JOIN suggestion_decisions d ON s.suggestion_id = d.suggestion_id
        LEFT JOIN suggestion_executions e ON s.suggestion_id = e.suggestion_id
        WHERE s.created_at > NOW() - INTERVAL '30 days'
          AND s.created_at < NOW() - INTERVAL '1 day'
    """
    df = pd.read_sql(query, db_connection)
    
    # Feature Engineering
    df['hour_of_day'] = pd.to_datetime(df['created_at']).dt.hour
    df['is_weekend'] = df['day_of_week'].isin(['SATURDAY', 'SUNDAY'])
    
    # Save to feature store
    save_to_feature_store(df, 'suggestion_training_v1')
    
    return len(df)


def train_model(**context):
    """
    Trainiert Learning-to-Rank Modell.
    """
    from sklearn.ensemble import GradientBoostingRanker
    from sklearn.model_selection import train_test_split
    import mlflow
    
    df = load_from_feature_store('suggestion_training_v1')
    
    # Features
    feature_cols = [
        'heuristic_score',
        'historical_acceptance_rate_customer',
        'historical_acceptance_rate_lane',
        'driver_acceptance_rate',
        'time_of_day_score',
        'day_of_week_score',
        'is_weekend',
        'weather_score',
        'traffic_score'
    ]
    
    X = df[feature_cols]
    y = df['label'].astype(int)
    
    # Groups for Learning-to-Rank (by tour)
    groups = df.groupby('tour_id').size().values
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train
    with mlflow.start_run():
        model = GradientBoostingRanker(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1
        )
        model.fit(X_train, y_train)
        
        # Evaluate
        auc = evaluate_auc(model, X_test, y_test)
        
        mlflow.log_metric('auc', auc)
        mlflow.sklearn.log_model(model, 'model')
        
        # Only promote if AUC > threshold
        if auc >= 0.65:
            promote_model_to_production('suggestion_model', model, auc)
        
        return {'auc': auc, 'samples': len(df)}


def evaluate_model(**context):
    """
    Vergleicht ML vs. Heuristik Performance.
    """
    model = load_production_model('suggestion_model')
    df = load_recent_outcomes(days=7)
    
    # ML Predictions
    df['ml_score'] = model.predict(df[feature_cols])
    
    # Compare
    heuristic_top1_acceptance = df.nlargest(100, 'heuristic_score')['label'].mean()
    ml_top1_acceptance = df.nlargest(100, 'ml_score')['label'].mean()
    
    metrics = {
        'heuristic_top1_acceptance': heuristic_top1_acceptance,
        'ml_top1_acceptance': ml_top1_acceptance,
        'improvement': ml_top1_acceptance - heuristic_top1_acceptance
    }
    
    save_metrics_to_dashboard(metrics)
    return metrics


extract_task = PythonOperator(
    task_id='extract_training_data',
    python_callable=extract_training_data,
    dag=dag
)

train_task = PythonOperator(
    task_id='train_model',
    python_callable=train_model,
    dag=dag
)

evaluate_task = PythonOperator(
    task_id='evaluate_model',
    python_callable=evaluate_model,
    dag=dag
)

extract_task >> train_task >> evaluate_task
```

### 1.5 Online-Serving mit Blending

#### 1.5.1 Scoring Engine (Erweitert)

```python
from dataclasses import dataclass
from typing import Optional, Dict
import yaml

@dataclass
class MLConfig:
    enabled: bool
    blend_factor: float  # α (Heuristik-Anteil)
    min_data_points: int
    min_model_auc: float


class HybridScoringEngine:
    """
    Kombiniert Heuristik und ML für Suggestion-Scoring.
    
    Score_final = α × Score_heuristic + (1 - α) × Score_ml
    """
    
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.heuristic_engine = HeuristicScoringEngine(config_path)
        self.ml_model = None
        self.feature_extractor = FeatureExtractor()
        
        if self.config.ml.enabled:
            self._load_ml_model()
    
    def _load_config(self, path: str) -> MLConfig:
        with open(path, 'r') as f:
            data = yaml.safe_load(f)
        
        ml = data.get('features', {}).get('learningToRank', {})
        return MLConfig(
            enabled=ml.get('enabled', False),
            blend_factor=ml.get('blendFactor', 0.8),
            min_data_points=ml.get('minDataPoints', 5000),
            min_model_auc=ml.get('minModelAuc', 0.65)
        )
    
    def _load_ml_model(self):
        """Lädt aktuelles Produktions-Modell aus MLflow."""
        from mlflow.tracking import MlflowClient
        
        client = MlflowClient()
        model_version = client.get_latest_versions(
            'suggestion_model', 
            stages=['Production']
        )[0]
        
        self.ml_model = mlflow.sklearn.load_model(
            f'models:/suggestion_model/{model_version.version}'
        )
    
    def calculate_score(
        self, 
        order: OrderCandidate, 
        tour: Tour, 
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Berechnet Hybrid-Score mit Heuristik und optional ML.
        """
        # Heuristic Score (immer)
        heuristic_score = self.heuristic_engine.calculate_score(order, tour)
        heuristic_explanation = self.heuristic_engine.explain_score(order, tour)
        
        result = {
            'heuristic_score': heuristic_score,
            'heuristic_components': heuristic_explanation['components'],
            'ml_score': None,
            'final_score': heuristic_score,  # Default: Heuristic
            'blend_factor': 1.0,  # 100% Heuristic
            'model_version': None
        }
        
        # ML Score (falls aktiviert und Modell verfügbar)
        if self.config.enabled and self.ml_model is not None:
            features = self.feature_extractor.extract(order, tour, context)
            ml_score = self._normalize_ml_score(
                self.ml_model.predict_proba([features])[0, 1]
            )
            
            # Blending
            alpha = self.config.blend_factor
            final_score = alpha * heuristic_score + (1 - alpha) * ml_score
            
            result.update({
                'ml_score': ml_score,
                'final_score': final_score,
                'blend_factor': alpha,
                'model_version': self._get_model_version()
            })
        
        return result
    
    def _normalize_ml_score(self, raw_score: float) -> float:
        """
        Normalisiert ML-Output auf vergleichbare Skala wie Heuristik.
        """
        # ML gibt Probability (0-1), Heuristik ist unbounded
        # Skalierung: P(ACCEPT) * avg_heuristic_score
        avg_heuristic = 7.0  # Aus Historical Data
        return raw_score * avg_heuristic * 1.5  # Scale-up for visibility
    
    def _get_model_version(self) -> str:
        """Gibt aktuelle Modell-Version zurück."""
        return getattr(self.ml_model, 'model_version', 'unknown')
```

### 1.6 Config-Erweiterung

```yaml
# Ergänzung zu scoring-config.yaml
features:
  enableLearningToRank: true
  
  learningToRank:
    blendFactor: 0.8           # α: 0.8 = 80% Heuristic, 20% ML
    minDataPoints: 5000        # Min. Trainings-Samples
    minModelAuc: 0.65          # Min. AUC für Production-Promotion
    retrainSchedule: "0 2 * * *"  # Täglich 02:00
    featureStore: "postgres"
    modelRegistry: "mlflow"
    
    features:
      - name: historicalAcceptanceRate_customer
        source: analytics
        lookbackDays: 90
      - name: historicalAcceptanceRate_lane
        source: analytics
        lookbackDays: 90
      - name: driverAcceptanceRate
        source: driver_service
        lookbackDays: 30
        decayFactor: 0.03
      - name: timeOfDayScore
        source: historical
      - name: dayOfWeekScore
        source: historical
      - name: seasonalityScore
        source: historical
```

---

## 2. Scoring-Monitoring-Dashboard

### 2.1 Dashboard-Architektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SCORING MONITORING DASHBOARD                          │
│                         (Grafana / Metabase)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Row 1: Scoring Overview                                          │   │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────┐ │   │
│  │ │  Avg Score  │ │  Avg Score  │ │    Score Distribution       │ │   │
│  │ │   (All)     │ │  (Accepted) ││         (Histogram)          │ │   │
│  │ │    7.2      │ │    8.5      ││  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░   │ │   │
│  │ └─────────────┘ └─────────────┘ └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Row 2: Suggestion Funnel                                         │   │
│  │ ┌───────────────────────────┐ ┌───────────────────────────────┐ │   │
│  │ │   Funnel: Gen → Shown →   │ │   Acceptance Rate Over Time   │ │   │
│  │ │   Accepted → Executed     │ │        (Line Chart)           │ │   │
│  │ │                           │ │                               │ │   │
│  │ │   1247 → 890 → 312 → 289  │ │   ╱╲    ╱╲                    │ │   │
│  │ │   100%   71%   25%   23%  │ │  ╱  ╲  ╱  ╲   ╱╲             │ │   │
│  │ │                           │ │ ╱    ╲╱    ╲ ╱  ╲            │ │   │
│  │ └───────────────────────────┘ └───────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Row 3: ML vs. Heuristic                                          │   │
│  │ ┌───────────────────────────┐ ┌───────────────────────────────┐ │   │
│  │ │  Acceptance Rate Compare  │ │  Realized Margin Compare      │ │   │
│  │ │  Heuristic vs ML          │ │  Heuristic vs ML              │ │   │
│  │ │                           │ │                               │ │   │
│  │ │  Heuristic: 23.4%         │ │  Heuristic: €132 avg          │ │   │
│  │ │  ML:        28.7% (+5.3%) │ │  ML:        €145 avg (+€13)   │ │   │
│  │ └───────────────────────────┘ └───────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Row 4: Breakdown                                                 │   │
│  │ ┌───────────────────────────┐ ┌───────────────────────────────┐ │   │
│  │ │  Top Customers            │ │  Top Drivers                  │ │   │
│  │ │  Customer | Vol | Accept  │ │  Driver | Accept | Margin     │ │   │
│  │ │  C001     | 45  | 34%     │ │  DRV_1 | 45%    | €156       │ │   │
│  │ │  C002     | 38  | 28%     │ │  DRV_2 | 42%    | €148       │ │   │
│  │ │  C003     | 31  | 41%     │ │  DRV_3 | 38%    | €142       │ │   │
│  │ └───────────────────────────┘ └───────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Row 5: Config Snapshot                                           │   │
│  │ ┌───────────────────────────────────────────────────────────┐   │   │
│  │ │  Current Weights                                          │   │   │
│  │ │  revenue: 0.35 | capacity: 0.20 | priority: 0.10 |        │   │   │
│  │ │  risk: 0.10 | serviceLevel: 0.15 | co2: 0.10              │   │   │
│  │ │  Blend Factor: 0.8 (80% Heuristic, 20% ML)                │   │   │
│  │ │  Model Version: suggestion_model@v12                      │   │   │
│  │ └───────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 KPI-Definitionen

#### 2.2.1 Scoring Overview

| KPI | Definition | Berechnung | Zielwert |
|-----|------------|------------|----------|
| `avg_score_all` | Durchschnittlicher Score aller generierten Vorschläge | `AVG(score) WHERE event = 'suggestion.generated'` | 6.0-8.0 |
| `avg_score_accepted` | Durchschnittlicher Score der akzeptierten Vorschläge | `AVG(score) WHERE event = 'suggestion.decision.made' AND decision = 'ACCEPT'` | > `avg_score_all` |
| `score_distribution` | Histogramm der Scores | `COUNT(*) GROUP BY FLOOR(score)` | Normalverteilt |
| `score_stddev` | Standardabweichung der Scores | `STDDEV(score)` | 2.0-3.0 |

#### 2.2.2 Suggestion Funnel

| Stage | Definition | Berechnung |
|-------|------------|------------|
| `generated` | Alle generierten Vorschläge | `COUNT(suggestion.generated)` |
| `shown` | Dem Dispatcher angezeigt | `COUNT(suggestion.shown)` |
| `accepted` | Vom Dispatcher akzeptiert | `COUNT(suggestion.decision.made WHERE decision='ACCEPT')` |
| `executed` | Tatsächlich ausgeführt | `COUNT(suggestion.outcome WHERE executed=true)` |

**Conversion Rates:**

```
show_rate = shown / generated
accept_rate = accepted / shown
execute_rate = executed / accepted
overall_conversion = executed / generated
```

#### 2.2.3 ML vs. Heuristic

| KPI | Heuristic | ML | Verbesserung |
|-----|-----------|-----|--------------|
| `top1_acceptance_rate` | Annahmerate Top-1 Vorschlag | Annahmerate ML-Ranking | Δ% |
| `top3_acceptance_rate` | Annahmerate Top-3 | Annahmerate ML-Top-3 | Δ% |
| `avg_realized_margin` | Durchschn. realisierter DB | Durchschn. ML-DB | Δ€ |
| `avg_delay_minutes` | Durchschn. Verspätung | ML-Verspätung | Δmin |
| `model_auc` | - | AUC auf Test-Set | - |

### 2.3 Dashboard-Queries (PostgreSQL)

#### 2.3.1 Scoring Overview

```sql
-- Avg Score (All Suggestions)
SELECT 
    DATE_TRUNC('day', created_at) as date,
    AVG(heuristic_score) as avg_score_all,
    STDDEV(heuristic_score) as score_stddev
FROM suggestion_outcomes
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;

-- Avg Score (Accepted)
SELECT 
    DATE_TRUNC('day', d.created_at) as date,
    AVG(o.heuristic_score) as avg_score_accepted
FROM suggestion_decisions d
JOIN suggestion_outcomes o ON d.suggestion_id = o.suggestion_id
WHERE d.decision = 'ACCEPT'
  AND d.created_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;

-- Score Distribution
SELECT 
    FLOOR(heuristic_score) as score_bucket,
    COUNT(*) as count
FROM suggestion_outcomes
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;
```

#### 2.3.2 Suggestion Funnel

```sql
-- Funnel Metrics (Daily)
WITH generated AS (
    SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as cnt
    FROM suggestion_outcomes
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY 1
),
shown AS (
    SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as cnt
    FROM suggestion_shown
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY 1
),
accepted AS (
    SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as cnt
    FROM suggestion_decisions
    WHERE decision = 'ACCEPT' AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY 1
),
executed AS (
    SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as cnt
    FROM suggestion_outcomes
    WHERE executed = true AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY 1
)
SELECT 
    g.date,
    g.cnt as generated,
    COALESCE(s.cnt, 0) as shown,
    COALESCE(a.cnt, 0) as accepted,
    COALESCE(e.cnt, 0) as executed,
    ROUND(COALESCE(s.cnt, 0)::numeric / NULLIF(g.cnt, 0) * 100, 1) as show_rate_pct,
    ROUND(COALESCE(a.cnt, 0)::numeric / NULLIF(s.cnt, 0) * 100, 1) as accept_rate_pct,
    ROUND(COALESCE(e.cnt, 0)::numeric / NULLIF(a.cnt, 0) * 100, 1) as execute_rate_pct
FROM generated g
LEFT JOIN shown s ON g.date = s.date
LEFT JOIN accepted a ON g.date = a.date
LEFT JOIN executed e ON g.date = e.date
ORDER BY g.date;
```

#### 2.3.3 ML vs. Heuristic

```sql
-- Acceptance Rate Comparison
WITH ranked AS (
    SELECT 
        suggestion_id,
        heuristic_score,
        ml_score,
        decision = 'ACCEPT' as accepted,
        ROW_NUMBER() OVER (PARTITION BY tour_id ORDER BY heuristic_score DESC) as heuristic_rank,
        ROW_NUMBER() OVER (PARTITION BY tour_id ORDER BY ml_score DESC) as ml_rank
    FROM suggestion_outcomes
    WHERE ml_score IS NOT NULL
      AND created_at > NOW() - INTERVAL '30 days'
)
SELECT 
    'Heuristic Top-1' as method,
    ROUND(AVG(CASE WHEN heuristic_rank = 1 THEN accepted::int END) * 100, 1) as acceptance_rate_pct,
    ROUND(AVG(CASE WHEN heuristic_rank <= 3 THEN accepted::int END) * 100, 1) as top3_acceptance_rate_pct
FROM ranked
UNION ALL
SELECT 
    'ML Top-1' as method,
    ROUND(AVG(CASE WHEN ml_rank = 1 THEN accepted::int END) * 100, 1) as acceptance_rate_pct,
    ROUND(AVG(CASE WHEN ml_rank <= 3 THEN accepted::int END) * 100, 1) as top3_acceptance_rate_pct
FROM ranked;

-- Realized Margin Comparison
WITH ranked AS (
    SELECT 
        suggestion_id,
        heuristic_score,
        ml_score,
        realized_margin,
        ROW_NUMBER() OVER (PARTITION BY tour_id ORDER BY heuristic_score DESC) as heuristic_rank,
        ROW_NUMBER() OVER (PARTITION BY tour_id ORDER BY ml_score DESC) as ml_rank
    FROM suggestion_outcomes
    WHERE ml_score IS NOT NULL
      AND executed = true
      AND created_at > NOW() - INTERVAL '30 days'
)
SELECT 
    'Heuristic Top-1' as method,
    ROUND(AVG(CASE WHEN heuristic_rank = 1 THEN realized_margin END), 2) as avg_margin_eur
FROM ranked
UNION ALL
SELECT 
    'ML Top-1' as method,
    ROUND(AVG(CASE WHEN ml_rank = 1 THEN realized_margin END), 2) as avg_margin_eur
FROM ranked;
```

#### 2.3.4 Customer / Driver Breakdown

```sql
-- Top Customers by Suggestion Volume
SELECT 
    customer_id,
    COUNT(*) as suggestion_count,
    SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) as accepted_count,
    ROUND(SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as accept_rate_pct,
    ROUND(AVG(realized_margin), 2) as avg_margin_eur
FROM suggestion_outcomes o
LEFT JOIN suggestion_decisions d ON o.suggestion_id = d.suggestion_id
WHERE o.created_at > NOW() - INTERVAL '30 days'
GROUP BY customer_id
ORDER BY suggestion_count DESC
LIMIT 20;

-- Top Drivers by Acceptance Rate
SELECT 
    driver_id,
    COUNT(*) as suggestion_count,
    SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) as accepted_count,
    ROUND(SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as accept_rate_pct,
    ROUND(AVG(realized_margin), 2) as avg_margin_eur
FROM suggestion_outcomes o
LEFT JOIN suggestion_decisions d ON o.suggestion_id = d.suggestion_id
WHERE o.created_at > NOW() - INTERVAL '30 days'
GROUP BY driver_id
HAVING COUNT(*) >= 10
ORDER BY accept_rate_pct DESC
LIMIT 20;
```

### 2.4 Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "CargoBit Scoring Monitoring",
    "uid": "scoring-monitoring",
    "tags": ["scoring", "ml", "suggestions"],
    "timezone": "browser",
    "refresh": "5m",
    "panels": [
      {
        "title": "Avg Score (All Suggestions)",
        "type": "stat",
        "gridPos": {"x": 0, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT AVG(heuristic_score) FROM suggestion_outcomes WHERE created_at > NOW() - INTERVAL '24 hours'"
          }
        ],
        "options": {
          "colorMode": "value",
          "graphMode": "area"
        },
        "fieldConfig": {
          "defaults": {
            "decimals": 2,
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 6},
                {"color": "green", "value": 8}
              ]
            }
          }
        }
      },
      {
        "title": "Avg Score (Accepted)",
        "type": "stat",
        "gridPos": {"x": 6, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT AVG(o.heuristic_score) FROM suggestion_outcomes o JOIN suggestion_decisions d ON o.suggestion_id = d.suggestion_id WHERE d.decision = 'ACCEPT' AND d.created_at > NOW() - INTERVAL '24 hours'"
          }
        ]
      },
      {
        "title": "Score Distribution",
        "type": "histogram",
        "gridPos": {"x": 12, "y": 0, "w": 12, "h": 4},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT heuristic_score as score FROM suggestion_outcomes WHERE created_at > NOW() - INTERVAL '7 days'"
          }
        ]
      },
      {
        "title": "Suggestion Funnel",
        "type": "bargauge",
        "gridPos": {"x": 0, "y": 4, "w": 12, "h": 6},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT 'Generated' as stage, COUNT(*) as count FROM suggestion_outcomes WHERE created_at > NOW() - INTERVAL '24 hours' UNION ALL SELECT 'Shown', COUNT(*) FROM suggestion_shown WHERE created_at > NOW() - INTERVAL '24 hours' UNION ALL SELECT 'Accepted', COUNT(*) FROM suggestion_decisions WHERE decision = 'ACCEPT' AND created_at > NOW() - INTERVAL '24 hours' UNION ALL SELECT 'Executed', COUNT(*) FROM suggestion_outcomes WHERE executed = true AND created_at > NOW() - INTERVAL '24 hours'"
          }
        ],
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient"
        }
      },
      {
        "title": "Acceptance Rate Over Time",
        "type": "timeseries",
        "gridPos": {"x": 12, "y": 4, "w": 12, "h": 6},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT DATE_TRUNC('hour', d.created_at) as time, SUM(CASE WHEN d.decision = 'ACCEPT' THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as accept_rate FROM suggestion_decisions d WHERE d.created_at > NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY 1"
          }
        ]
      },
      {
        "title": "ML vs Heuristic Acceptance",
        "type": "stat",
        "gridPos": {"x": 0, "y": 10, "w": 6, "h": 4},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "WITH ranked AS (SELECT suggestion_id, heuristic_score, ml_score, decision = 'ACCEPT' as accepted, ROW_NUMBER() OVER (PARTITION BY tour_id ORDER BY heuristic_score DESC) as hr, ROW_NUMBER() OVER (PARTITION BY tour_id ORDER BY ml_score DESC) as mr FROM suggestion_outcomes WHERE ml_score IS NOT NULL AND created_at > NOW() - INTERVAL '7 days') SELECT AVG(CASE WHEN mr = 1 THEN accepted::int END) - AVG(CASE WHEN hr = 1 THEN accepted::int END) as improvement FROM ranked"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "red", "value": -0.05},
                {"color": "yellow", "value": 0},
                {"color": "green", "value": 0.02}
              ]
            }
          }
        }
      }
    ]
  }
}
```

### 2.5 Alerting-Regeln

```yaml
# Grafana Alerting Rules
groups:
  - name: scoring_alerts
    interval: 5m
    rules:
      - alert: LowAcceptanceRate
        expr: |
          avg_acceptance_rate_24h < 0.15
        for: 2h
        labels:
          severity: warning
        annotations:
          summary: "Low suggestion acceptance rate"
          description: "Acceptance rate is {{ $value | humanizePercentage }} (threshold: 15%)"
      
      - alert: MLModelDegradation
        expr: |
          ml_model_auc < 0.60
        for: 24h
        labels:
          severity: critical
        annotations:
          summary: "ML model quality degraded"
          description: "Model AUC is {{ $value }} (threshold: 0.60). Consider retraining."
      
      - alert: ScoreDrift
        expr: |
          abs(avg_score_7d - avg_score_30d) / avg_score_30d > 0.20
        for: 24h
        labels:
          severity: warning
        annotations:
          summary: "Significant score drift detected"
          description: "Score distribution changed by {{ $value | humanizePercentage }}"
```

---

## 3. Umsetzungs-Reihenfolge

### Phase 1: Logging & Events (2 Wochen)

| Aufgabe | Deliverable |
|---------|-------------|
| `suggestion.generated` Event erweitern | Heuristic Components, Features |
| `suggestion.decision.made` persistieren | Decision, DecidedBy, Reason |
| `suggestion.outcome` Event implementieren | Execution, Margin, Delay |
| Kafka Topic `logistics.suggestion.outcome.v1` | Producer, Consumer |

### Phase 2: Dashboard (2 Wochen)

| Aufgabe | Deliverable |
|---------|-------------|
| PostgreSQL Views für Analytics | `suggestion_stats_daily`, `suggestion_funnel` |
| Grafana Dashboard aufsetzen | 5 Rows, 10+ Panels |
| Alerting konfigurieren | Low Acceptance, Model Degradation |
| Config-Snapshot-Integration | Current Weights, Blend Factor |

### Phase 3: ML Shadow Mode (4 Wochen)

| Aufgabe | Deliverable |
|---------|-------------|
| Feature Store aufsetzen | Historical Features, Real-time Features |
| Training Pipeline (Airflow) | DAG, Feature Extraction, Model Training |
| MLflow Model Registry | Staging → Production Promotion |
| Shadow Mode im Suggestion-Service | ML Score berechnen, nicht verwenden |
| Dashboard-Erweiterung | ML vs. Heuristic Panels |

### Phase 4: ML Blending aktivieren (2 Wochen)

| Aufgabe | Deliverable |
|---------|-------------|
| Blending-Logik implementieren | HybridScoringEngine |
| A/B-Test Setup | 50% Heuristic, 50% Hybrid |
| Monitoring-Verstärkung | Real-time Metrics, Alerts |
| Rollback-Plan | Feature Flag: `enableLearningToRank: false` |

---

## 4. Zusammenfassung

| Komponente | Status | Speicherort |
|------------|--------|-------------|
| ML-Upgrade Spezifikation | ✅ | Dieses Dokument |
| Feature-Katalog | ✅ | 11 Features definiert |
| Event Schema `suggestion.outcome` | ✅ | Kafka Topic |
| Training Pipeline | ✅ | Airflow DAG |
| HybridScoringEngine | ✅ | Python Implementierung |
| Dashboard Layout | ✅ | 5 Rows, 10+ Panels |
| KPI-Definitionen | ✅ | 20+ KPIs |
| Grafana Dashboard JSON | ✅ | Import-ready |
| Alerting Rules | ✅ | 3 Alerts |
| Config-Erweiterung | ✅ | scoring-config.yaml |

**Nächste Schritte:**
1. Events & Logging implementieren (Phase 1)
2. Dashboard deployen (Phase 2)
3. ML Shadow Mode starten (Phase 3)
4. Nach Validierung: Blending aktivieren (Phase 4)
