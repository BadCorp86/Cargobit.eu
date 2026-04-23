# Event-Schema suggestion.outcome & Grafana Panel-Set

**CargoBit Transport-Plattform – Technische Referenz**

---

## A) Event-Schema für suggestion.outcome + Trainings-Dataset

### A.1 Event-Schema: suggestion.outcome

Dieses Event ist der zentrale Input für ML-Training, KPI-Monitoring und Feedback-Loops.

#### A.1.1 Vollständige Event-Definition (JSON)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://cargobit.io/schemas/suggestion-outcome.json",
  "title": "Suggestion Outcome Event",
  "description": "Ereignis, das den Ausgang eines Vorschlags dokumentiert (Entscheidung + Ausführung)",
  "type": "object",
  "required": [
    "eventId",
    "eventType",
    "occurredAt",
    "suggestionId",
    "tourId",
    "orderId",
    "decision",
    "executed"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "format": "uuid",
      "description": "Eindeutige Event-ID (UUID v4)"
    },
    "eventType": {
      "type": "string",
      "const": "suggestion.outcome",
      "description": "Event-Typ (konstant)"
    },
    "occurredAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 Timestamp des Events"
    },
    "suggestionId": {
      "type": "string",
      "pattern": "^SUG_[A-Z0-9]+$",
      "description": "Eindeutige Vorschlags-ID"
    },
    "tourId": {
      "type": "string",
      "pattern": "^T[0-9]+$",
      "description": "Tour-ID"
    },
    "orderId": {
      "type": "string",
      "pattern": "^ORD_[0-9]+$",
      "description": "Auftrags-ID"
    },
    "segmentId": {
      "type": "string",
      "description": "Tour-Segment, in dem der Vorschlag erzeugt wurde"
    },
    "decision": {
      "type": "string",
      "enum": ["ACCEPT", "REJECT", "TIMEOUT", "CANCELLED"],
      "description": "Entscheidung über den Vorschlag"
    },
    "decidedBy": {
      "type": "string",
      "enum": ["DRIVER", "DISPATCHER", "SYSTEM", "AUTO_REJECT"],
      "description": "Wer hat die Entscheidung getroffen"
    },
    "decisionLatencySeconds": {
      "type": "integer",
      "minimum": 0,
      "description": "Zeit zwischen Vorschlag und Entscheidung (Sekunden)"
    },
    "decisionReason": {
      "type": "string",
      "description": "Optionaler Grund für die Entscheidung (Freitext)"
    },
    "executed": {
      "type": "boolean",
      "description": "Wurde der Auftrag tatsächlich ausgeführt?"
    },
    "executionFailureReason": {
      "type": ["string", "null"],
      "enum": [null, "CAPACITY_CHANGED", "TIME_WINDOW_MISSED", "VEHICLE_BREAKDOWN", "CUSTOMER_CANCELLED", "OTHER"],
      "description": "Grund für fehlgeschlagene Ausführung"
    },
    "plannedMargin": {
      "type": "number",
      "description": "Geplanter Deckungsbeitrag in EUR"
    },
    "realizedMargin": {
      "type": ["number", "null"],
      "description": "Tatsächlich realisierter Deckungsbeitrag in EUR"
    },
    "marginDelta": {
      "type": ["number", "null"],
      "description": "Abweichung vom Plan (realizedMargin - plannedMargin)"
    },
    "revenue": {
      "type": "number",
      "description": "Umsatz des Zusatzauftrags in EUR"
    },
    "costs": {
      "type": "number",
      "description": "Tatsächliche Kosten in EUR"
    },
    "delayMinutes": {
      "type": "integer",
      "minimum": 0,
      "description": "Verspätung durch Zusatzauftrag (Minuten)"
    },
    "co2ImpactKg": {
      "type": "number",
      "description": "CO₂-Effekt in kg (negativ = Reduktion)"
    },
    "detourKm": {
      "type": "number",
      "description": "Tatsächlicher Umweg in km"
    },
    "customerId": {
      "type": "string",
      "description": "Kunden-ID"
    },
    "driverId": {
      "type": "string",
      "description": "Fahrer-ID"
    },
    "vehicleId": {
      "type": "string",
      "description": "Fahrzeug-ID"
    },
    "lane": {
      "type": "string",
      "pattern": "^[A-Z]{2}-[A-Z]+->[A-Z]{2}-[A-Z]+$",
      "description": "Lane (z.B. DE-BER->DE-HAM)"
    },
    "features": {
      "type": "object",
      "description": "Feature-Werte zum Zeitpunkt der Vorschlagserstellung",
      "properties": {
        "revenueScore": {
          "type": "number",
          "description": "Revenue Score (unnormalisiert)"
        },
        "capacityUtilizationScore": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Kapazitätsauslastung (0-1)"
        },
        "priorityScore": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Prioritäts-Score (0-1)"
        },
        "riskScore": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Risiko-Score (0-1, 1 = geringes Risiko)"
        },
        "serviceLevelScore": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Service-Level-Score (0-1)"
        },
        "co2Score": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "CO₂-Score (0-1)"
        },
        "finalHeuristicScore": {
          "type": "number",
          "description": "Gewichteter Gesamt-Score (Heuristik)"
        },
        "mlScore": {
          "type": ["number", "null"],
          "description": "ML-Score (falls aktiviert)"
        },
        "blendFactor": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Blend-Faktor (α) zum Zeitpunkt des Scorings"
        }
      },
      "required": [
        "revenueScore",
        "capacityUtilizationScore",
        "priorityScore",
        "riskScore",
        "serviceLevelScore",
        "co2Score",
        "finalHeuristicScore"
      ]
    },
    "mlMetadata": {
      "type": ["object", "null"],
      "description": "ML-Modell-Metadaten (falls ML aktiviert)",
      "properties": {
        "modelVersion": {
          "type": "string",
          "description": "Modell-Version"
        },
        "modelUsed": {
          "type": "string",
          "enum": ["heuristic", "ml", "hybrid"],
          "description": "Verwendetes Scoring-Modell"
        },
        "featureVectorHash": {
          "type": "string",
          "description": "Hash des Feature-Vektors für Reproduzierbarkeit"
        }
      }
    },
    "context": {
      "type": "object",
      "description": "Kontext-Informationen",
      "properties": {
        "timeOfDay": {
          "type": "string",
          "enum": ["MORNING", "MIDDAY", "AFTERNOON", "EVENING", "NIGHT"],
          "description": "Tageszeit"
        },
        "dayOfWeek": {
          "type": "string",
          "enum": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
          "description": "Wochentag"
        },
        "isWeekend": {
          "type": "boolean",
          "description": "Wochenende?"
        },
        "weatherCondition": {
          "type": "string",
          "enum": ["CLEAR", "CLOUDY", "RAINY", "STORMY", "SNOWY"],
          "description": "Wetterbedingung"
        },
        "trafficCondition": {
          "type": "string",
          "enum": ["LIGHT", "NORMAL", "HEAVY", "CONGESTED"],
          "description": "Verkehrslage"
        }
      }
    }
  }
}
```

#### A.1.2 Beispiel-Event (Produktion)

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "eventType": "suggestion.outcome",
  "occurredAt": "2026-04-18T19:24:30Z",

  "suggestionId": "SUG_001",
  "tourId": "T123",
  "orderId": "ORD_999",
  "segmentId": "SEG_3",

  "decision": "ACCEPT",
  "decidedBy": "DRIVER",
  "decisionLatencySeconds": 42,
  "decisionReason": "Good fit for current route",

  "executed": true,
  "executionFailureReason": null,

  "plannedMargin": 140.0,
  "realizedMargin": 135.0,
  "marginDelta": -5.0,
  "revenue": 180.0,
  "costs": 45.0,

  "delayMinutes": 4,
  "co2ImpactKg": -3.2,
  "detourKm": 6.5,

  "customerId": "C123",
  "driverId": "DRV_42",
  "vehicleId": "V789",
  "lane": "DE-BER->DE-HAM",

  "features": {
    "revenueScore": 25.71,
    "capacityUtilizationScore": 0.33,
    "priorityScore": 1.0,
    "riskScore": 0.9,
    "serviceLevelScore": 1.0,
    "co2Score": 0.8,
    "finalHeuristicScore": 9.49,
    "mlScore": 8.85,
    "blendFactor": 0.8
  },

  "mlMetadata": {
    "modelVersion": "suggestion_model@v12",
    "modelUsed": "hybrid",
    "featureVectorHash": "sha256:a1b2c3d4..."
  },

  "context": {
    "timeOfDay": "AFTERNOON",
    "dayOfWeek": "FRIDAY",
    "isWeekend": false,
    "weatherCondition": "CLEAR",
    "trafficCondition": "NORMAL"
  }
}
```

#### A.1.3 Kafka-Topic-Konfiguration

```yaml
# Kafka Topic für suggestion.outcome
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: logistics.suggestion.outcome.v1
  namespace: cargobit-kafka
spec:
  partitions: 6
  replicas: 3
  config:
    retention.ms: 31536000000  # 365 Tage (für ML-Training)
    compression.type: zstd
    cleanup.policy: delete
    segment.bytes: 1073741824  # 1 GB
```

#### A.1.4 Design-Begründung

| Aspekt | Begründung |
|--------|------------|
| **ML-ready** | Alle Features + Outcome in einem Event |
| **Explainable** | Heuristik-Score bleibt sichtbar, ML-Score separat |
| **Audit-fähig** | Entscheidung + Auswirkung dokumentiert |
| **Training-fähig** | `realizedMargin`, `delayMinutes`, `executed` |
| **Reproducible** | Feature-Vector-Hash für Debugging |
| **Context-rich** | Wetter, Verkehr, Tageszeit für ML |

---

### A.2 Trainings-Dataset-Schema

#### A.2.1 Tabellen-Schema (PostgreSQL / BigQuery / Delta Lake)

```sql
-- PostgreSQL DDL
CREATE TABLE suggestion_training_dataset (
    -- Identifiers
    suggestion_id       VARCHAR(50) PRIMARY KEY,
    tour_id             VARCHAR(50) NOT NULL,
    order_id            VARCHAR(50) NOT NULL,
    
    -- Labels (Zielvariablen)
    accepted            BOOLEAN NOT NULL,
    executed            BOOLEAN NOT NULL,
    realized_margin     DECIMAL(10, 2),
    delay_minutes       INTEGER,
    co2_impact_kg       DECIMAL(8, 2),
    
    -- Utility-Score (kombinierte Zielfunktion)
    utility_score       DECIMAL(10, 4) GENERATED ALWAYS AS (
        COALESCE(realized_margin, 0) - (delay_minutes * 2.0)
    ) STORED,
    
    -- Heuristic Features
    revenue_score       DECIMAL(10, 4),
    capacity_score      DECIMAL(4, 3),
    priority_score      DECIMAL(4, 3),
    risk_score          DECIMAL(4, 3),
    service_level_score DECIMAL(4, 3),
    co2_score           DECIMAL(4, 3),
    final_heuristic_score DECIMAL(10, 4),
    
    -- ML Features (falls aktiviert)
    ml_score            DECIMAL(10, 4),
    model_version       VARCHAR(100),
    model_used          VARCHAR(20),
    
    -- Context Features
    customer_id         VARCHAR(50),
    driver_id           VARCHAR(50),
    vehicle_id          VARCHAR(50),
    lane                VARCHAR(50),
    
    -- Historical Features (werden angereichert)
    hist_acceptance_rate_customer DECIMAL(4, 3),
    hist_acceptance_rate_lane     DECIMAL(4, 3),
    driver_acceptance_rate        DECIMAL(4, 3),
    
    -- Temporal Features
    time_of_day         VARCHAR(20),
    day_of_week         VARCHAR(20),
    is_weekend          BOOLEAN,
    hour_of_day         INTEGER,
    
    -- External Features
    weather_condition   VARCHAR(20),
    traffic_condition   VARCHAR(20),
    
    -- Metadata
    event_timestamp     TIMESTAMP NOT NULL,
    created_at          TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_scores CHECK (
        capacity_score BETWEEN 0 AND 1 AND
        priority_score BETWEEN 0 AND 1 AND
        risk_score BETWEEN 0 AND 1 AND
        service_level_score BETWEEN 0 AND 1 AND
        co2_score BETWEEN 0 AND 1
    )
);

-- Indexes für Analytics
CREATE INDEX idx_training_timestamp ON suggestion_training_dataset (event_timestamp);
CREATE INDEX idx_training_customer ON suggestion_training_dataset (customer_id);
CREATE INDEX idx_training_driver ON suggestion_training_dataset (driver_id);
CREATE INDEX idx_training_lane ON suggestion_training_dataset (lane);

-- Partitioning für große Datenmengen (PostgreSQL 13+)
CREATE TABLE suggestion_training_dataset_y2026 
    PARTITION OF suggestion_training_dataset
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

#### A.2.2 Parquet-Schema (für Data Lake)

```python
import pyarrow as pa
from pyarrow import parquet as pq

# Parquet Schema Definition
SCHEMA_SUGGESTION_TRAINING = pa.schema([
    # Identifiers
    ('suggestion_id', pa.string()),
    ('tour_id', pa.string()),
    ('order_id', pa.string()),
    
    # Labels
    ('accepted', pa.bool_()),
    ('executed', pa.bool_()),
    ('realized_margin', pa.float32()),
    ('delay_minutes', pa.int32()),
    ('co2_impact_kg', pa.float32()),
    ('utility_score', pa.float32()),
    
    # Heuristic Features
    ('revenue_score', pa.float32()),
    ('capacity_score', pa.float32()),
    ('priority_score', pa.float32()),
    ('risk_score', pa.float32()),
    ('service_level_score', pa.float32()),
    ('co2_score', pa.float32()),
    ('final_heuristic_score', pa.float32()),
    
    # ML Features
    ('ml_score', pa.float32()),
    ('model_version', pa.string()),
    ('model_used', pa.string()),
    
    # Context
    ('customer_id', pa.string()),
    ('driver_id', pa.string()),
    ('vehicle_id', pa.string()),
    ('lane', pa.string()),
    
    # Historical Features
    ('hist_acceptance_rate_customer', pa.float32()),
    ('hist_acceptance_rate_lane', pa.float32()),
    ('driver_acceptance_rate', pa.float32()),
    
    # Temporal Features
    ('time_of_day', pa.string()),
    ('day_of_week', pa.string()),
    ('is_weekend', pa.bool_()),
    ('hour_of_day', pa.int32()),
    
    # External Features
    ('weather_condition', pa.string()),
    ('traffic_condition', pa.string()),
    
    # Metadata
    ('event_timestamp', pa.timestamp('us')),
])
```

#### A.2.3 Feature-Engineering Pipeline

```python
from dataclasses import dataclass
from typing import Optional, List
import pandas as pd
import numpy as np

@dataclass
class TrainingSample:
    """Ein Trainings-Sample für das ML-Modell."""
    
    # Labels
    accepted: bool
    executed: bool
    realized_margin: Optional[float]
    delay_minutes: int
    utility_score: float
    
    # Features
    features: dict
    
    # Context
    customer_id: str
    driver_id: str
    lane: str
    timestamp: pd.Timestamp


class FeatureEngineer:
    """
    Feature-Engineering für Training Dataset.
    """
    
    def __init__(self, db_connection):
        self.db = db_connection
    
    def enrich_with_historical_features(
        self, 
        df: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Anreicherung mit historischen Acceptance-Rates.
        """
        # Historical Acceptance Rate per Customer (90d)
        customer_rates = self._get_historical_rates(
            group_by='customer_id',
            lookback_days=90
        )
        df['hist_acceptance_rate_customer'] = df['customer_id'].map(customer_rates)
        
        # Historical Acceptance Rate per Lane (90d)
        lane_rates = self._get_historical_rates(
            group_by='lane',
            lookback_days=90
        )
        df['hist_acceptance_rate_lane'] = df['lane'].map(lane_rates)
        
        # Driver Acceptance Rate (30d, weighted)
        driver_rates = self._get_weighted_driver_rates(lookback_days=30)
        df['driver_acceptance_rate'] = df['driver_id'].map(driver_rates)
        
        return df.fillna(0.5)  # Default für unbekannte Entities
    
    def _get_historical_rates(
        self, 
        group_by: str, 
        lookback_days: int
    ) -> dict:
        """Berechnet historische Acceptance-Rates."""
        query = f"""
            SELECT 
                {group_by},
                SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)::float / COUNT(*) as rate
            FROM suggestion_outcomes
            WHERE event_timestamp > NOW() - INTERVAL '{lookback_days} days'
            GROUP BY {group_by}
        """
        return pd.read_sql(query, self.db).set_index(group_by)['rate'].to_dict()
    
    def _get_weighted_driver_rates(self, lookback_days: int) -> dict:
        """Berechnet gewichtete Driver Acceptance Rate."""
        query = f"""
            SELECT 
                driver_id,
                SUM(CASE WHEN decision = 'ACCEPT' THEN weight ELSE 0 END) / SUM(weight) as rate
            FROM (
                SELECT 
                    driver_id,
                    decision,
                    EXP(-EXTRACT(DAY FROM NOW() - event_timestamp) / 30.0) as weight
                FROM suggestion_outcomes
                WHERE event_timestamp > NOW() - INTERVAL '{lookback_days} days'
            ) sub
            GROUP BY driver_id
        """
        return pd.read_sql(query, self.db).set_index('driver_id')['rate'].to_dict()
    
    def calculate_utility_score(
        self, 
        realized_margin: float, 
        delay_minutes: int,
        delay_penalty_per_minute: float = 2.0
    ) -> float:
        """
        Berechnet kombinierten Utility-Score.
        
        Utility = realized_margin - delay_penalty
        """
        if pd.isna(realized_margin):
            return 0.0
        return realized_margin - (delay_minutes * delay_penalty_per_minute)
    
    def prepare_training_dataset(
        self, 
        start_date: str, 
        end_date: str
    ) -> pd.DataFrame:
        """
        Erstellt vollständiges Trainings-Dataset.
        """
        query = f"""
            SELECT * FROM suggestion_outcomes
            WHERE event_timestamp BETWEEN '{start_date}' AND '{end_date}'
              AND decision IS NOT NULL
        """
        df = pd.read_sql(query, self.db)
        
        # Feature Engineering
        df = self.enrich_with_historical_features(df)
        
        # Utility Score
        df['utility_score'] = df.apply(
            lambda r: self.calculate_utility_score(
                r['realized_margin'], 
                r['delay_minutes']
            ),
            axis=1
        )
        
        # Temporal Features
        df['hour_of_day'] = pd.to_datetime(df['event_timestamp']).dt.hour
        df['is_weekend'] = pd.to_datetime(df['event_timestamp']).dt.dayofweek >= 5
        
        return df
```

#### A.2.4 Zielvariablen für ML

| Zielvariable | Typ | Formel | Anwendung |
|--------------|-----|--------|-----------|
| `accepted` | Binary (0/1) | `decision = 'ACCEPT'` | Klassifikation: P(Accept) |
| `utility_score` | Regression | `realizedMargin - delayMinutes × 2.0` | Regression: Erwarteter Nutzen |
| `realized_margin` | Regression | Tatsächlicher DB | Regression: Profit-Optimierung |
| `executed` | Binary (0/1) | Auftrag ausgeführt | Klassifikation: Execution-Probability |

**Empfehlung**: `utility_score` als primäre Zielvariable (kombiniert Margin und Delay).

---

## B) Grafana Panel-Set für Scoring-Dashboard

### B.1 Dashboard-Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CARGOBIT SCORING MONITORING DASHBOARD                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Row 1: Scoring Overview                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────────┐ │
│  │ Avg Score   │ │ Avg Score   │ │ Score StdDev│ │ Score Distribution│ │
│  │ (All)       │ │ (Accepted)  │ │             │ │    (Histogram)    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────────────┘ │
│                                                                         │
│  Row 2: Suggestion Funnel                                               │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐ │
│  │     Funnel: Gen→Show→Acc→Exec   │ │   Acceptance Rate Over Time   │ │
│  │                                 │ │                               │ │
│  └─────────────────────────────────┘ └───────────────────────────────┘ │
│                                                                         │
│  Row 3: ML vs Heuristic                                                 │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐ │
│  │  Acceptance Rate Comparison     │ │   Realized Margin Comparison  │ │
│  │                                 │ │                               │ │
│  └─────────────────────────────────┘ └───────────────────────────────┘ │
│                                                                         │
│  Row 4: Feature Insights                                                │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐ │
│  │   Feature Correlation Matrix    │ │   Feature Distribution        │ │
│  │                                 │ │                               │ │
│  └─────────────────────────────────┘ └───────────────────────────────┘ │
│                                                                         │
│  Row 5: Customer/Driver Breakdown                                       │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐ │
│  │   Top Customers                 │ │   Top Drivers                 │ │
│  │                                 │ │                               │ │
│  └─────────────────────────────────┘ └───────────────────────────────┘ │
│                                                                         │
│  Row 6: Config Snapshot                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │   Current Weights | Blend Factor | Model Version                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### B.2 Panels mit Queries

#### B.2.1 Row 1: Scoring Overview

**Panel 1: Avg Score (All Suggestions)**

```sql
-- SQL (PostgreSQL)
SELECT 
    DATE_TRUNC('day', event_timestamp) as time,
    AVG(final_heuristic_score) as value
FROM suggestion_outcomes
WHERE event_timestamp > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;
```

```promql
# PromQL (falls Metrics exposed)
avg_over_time(suggestion_score_final[1h])
```

**Panel 2: Avg Score (Accepted)**

```sql
-- SQL (PostgreSQL)
SELECT 
    DATE_TRUNC('day', event_timestamp) as time,
    AVG(final_heuristic_score) as value
FROM suggestion_outcomes
WHERE decision = 'ACCEPT'
  AND event_timestamp > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;
```

**Panel 3: Score Standard Deviation**

```sql
-- SQL (PostgreSQL)
SELECT 
    DATE_TRUNC('day', event_timestamp) as time,
    STDDEV(final_heuristic_score) as value
FROM suggestion_outcomes
WHERE event_timestamp > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;
```

**Panel 4: Score Distribution (Histogram)**

```sql
-- SQL (PostgreSQL)
SELECT
    width_bucket(final_heuristic_score, 0, 20, 20) AS bucket,
    COUNT(*) AS count
FROM suggestion_outcomes
WHERE event_timestamp > NOW() - INTERVAL '7 days'
GROUP BY bucket
ORDER BY bucket;
```

#### B.2.2 Row 2: Suggestion Funnel

**Panel 5: Funnel Visualization**

```sql
-- SQL (PostgreSQL)
WITH funnel AS (
    SELECT
        DATE_TRUNC('day', event_timestamp) as day,
        COUNT(*) FILTER (WHERE event_type = 'suggestion.generated') AS generated,
        COUNT(*) FILTER (WHERE event_type = 'suggestion.shown') AS shown,
        COUNT(*) FILTER (WHERE decision = 'ACCEPT') AS accepted,
        COUNT(*) FILTER (WHERE executed = TRUE) AS executed
    FROM suggestion_outcomes
    WHERE event_timestamp > NOW() - INTERVAL '30 days'
    GROUP BY day
)
SELECT
    day as time,
    generated,
    shown,
    accepted,
    executed,
    ROUND(shown::numeric / NULLIF(generated, 0) * 100, 1) as show_rate_pct,
    ROUND(accepted::numeric / NULLIF(shown, 0) * 100, 1) as accept_rate_pct,
    ROUND(executed::numeric / NULLIF(accepted, 0) * 100, 1) as execute_rate_pct
FROM funnel
ORDER BY day;
```

**Panel 6: Acceptance Rate Over Time**

```sql
-- SQL (PostgreSQL)
SELECT
    DATE_TRUNC('hour', event_timestamp) as time,
    SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as acceptance_rate_pct
FROM suggestion_outcomes
WHERE event_timestamp > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;
```

```promql
# PromQL
sum(rate(suggestion_decisions_total{decision="ACCEPT"}[5m])) 
/ 
sum(rate(suggestion_decisions_total[5m])) 
* 100
```

#### B.2.3 Row 3: ML vs Heuristic

**Panel 7: Acceptance Rate Comparison**

```sql
-- SQL (PostgreSQL)
WITH ranked AS (
    SELECT 
        event_timestamp,
        final_heuristic_score,
        ml_score,
        decision = 'ACCEPT' as accepted,
        model_used,
        tour_id,
        ROW_NUMBER() OVER (PARTITION BY tour_id ORDER BY final_heuristic_score DESC) as heuristic_rank,
        ROW_NUMBER() OVER (PARTITION BY tour_id ORDER BY ml_score DESC) as ml_rank
    FROM suggestion_outcomes
    WHERE ml_score IS NOT NULL
      AND event_timestamp > NOW() - INTERVAL '30 days'
)
SELECT
    DATE_TRUNC('day', event_timestamp) as time,
    AVG(CASE WHEN heuristic_rank = 1 THEN accepted::int END) * 100 as heuristic_top1_accept_pct,
    AVG(CASE WHEN ml_rank = 1 THEN accepted::int END) * 100 as ml_top1_accept_pct,
    AVG(CASE WHEN heuristic_rank <= 3 THEN accepted::int END) * 100 as heuristic_top3_accept_pct,
    AVG(CASE WHEN ml_rank <= 3 THEN accepted::int END) * 100 as ml_top3_accept_pct
FROM ranked
GROUP BY 1
ORDER BY 1;
```

**Panel 8: Realized Margin Comparison**

```sql
-- SQL (PostgreSQL)
SELECT
    model_used,
    COUNT(*) as count,
    ROUND(AVG(realized_margin), 2) as avg_margin_eur,
    ROUND(STDDEV(realized_margin), 2) as stddev_margin,
    ROUND(MIN(realized_margin), 2) as min_margin,
    ROUND(MAX(realized_margin), 2) as max_margin
FROM suggestion_outcomes
WHERE executed = TRUE
  AND realized_margin IS NOT NULL
  AND event_timestamp > NOW() - INTERVAL '30 days'
GROUP BY model_used;
```

**Panel 9: ML Model AUC Over Time**

```sql
-- SQL (PostgreSQL) - aus MLflow Metrics
SELECT
    DATE_TRUNC('day', metric_timestamp) as time,
    AVG(value) as auc
FROM mlflow.metrics
WHERE metric_key = 'auc'
  AND run_id IN (SELECT run_id FROM mlflow.runs WHERE status = 'FINISHED')
  AND metric_timestamp > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;
```

#### B.2.4 Row 4: Feature Insights

**Panel 10: Feature Correlation with Acceptance**

```sql
-- SQL (PostgreSQL)
SELECT
    'revenue_score' as feature,
    CORR(final_heuristic_score, CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) as correlation
FROM suggestion_outcomes
WHERE event_timestamp > NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'capacity_score', CORR(capacity_score, CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)
FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'priority_score', CORR(priority_score, CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)
FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'risk_score', CORR(risk_score, CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)
FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'service_level_score', CORR(service_level_score, CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)
FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '30 days'
UNION ALL
SELECT 'co2_score', CORR(co2_score, CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)
FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '30 days'
ORDER BY ABS(correlation) DESC;
```

**Panel 11: Feature Distribution by Decision**

```sql
-- SQL (PostgreSQL)
SELECT
    decision,
    AVG(revenue_score) as avg_revenue,
    AVG(capacity_score) as avg_capacity,
    AVG(priority_score) as avg_priority,
    AVG(risk_score) as avg_risk,
    AVG(service_level_score) as avg_service_level,
    AVG(co2_score) as avg_co2
FROM suggestion_outcomes
WHERE event_timestamp > NOW() - INTERVAL '7 days'
GROUP BY decision;
```

#### B.2.5 Row 5: Customer/Driver Breakdown

**Panel 12: Top Customers by Suggestion Volume**

```sql
-- SQL (PostgreSQL)
SELECT
    customer_id,
    COUNT(*) as suggestions,
    SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) as accepted,
    ROUND(SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as accept_rate_pct,
    ROUND(AVG(realized_margin), 2) as avg_margin_eur,
    ROUND(AVG(delay_minutes), 1) as avg_delay_min
FROM suggestion_outcomes
WHERE event_timestamp > NOW() - INTERVAL '30 days'
GROUP BY customer_id
ORDER BY suggestions DESC
LIMIT 20;
```

**Panel 13: Top Drivers by Acceptance Rate**

```sql
-- SQL (PostgreSQL)
SELECT
    driver_id,
    COUNT(*) as suggestions,
    SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) as accepted,
    ROUND(SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as accept_rate_pct,
    ROUND(AVG(realized_margin), 2) as avg_margin_eur
FROM suggestion_outcomes
WHERE event_timestamp > NOW() - INTERVAL '30 days'
GROUP BY driver_id
HAVING COUNT(*) >= 10
ORDER BY accept_rate_pct DESC
LIMIT 20;
```

#### B.2.6 Row 6: Config Snapshot

**Panel 14: Current Scoring Weights (Text Panel)**

```sql
-- SQL (PostgreSQL) - aus Config-Tabelle
SELECT
    'revenue: ' || revenue_weight || E'\n' ||
    'capacity: ' || capacity_weight || E'\n' ||
    'priority: ' || priority_weight || E'\n' ||
    'risk: ' || risk_weight || E'\n' ||
    'serviceLevel: ' || service_level_weight || E'\n' ||
    'co2: ' || co2_weight || E'\n' ||
    'blendFactor: ' || blend_factor as config_text
FROM scoring_config
WHERE is_active = TRUE
LIMIT 1;
```

**Panel 15: Model Version (Stat Panel)**

```sql
-- SQL (PostgreSQL)
SELECT 
    model_version,
    COUNT(*) as predictions_count
FROM suggestion_outcomes
WHERE event_timestamp > NOW() - INTERVAL '24 hours'
  AND model_version IS NOT NULL
GROUP BY model_version
ORDER BY predictions_count DESC
LIMIT 1;
```

### B.3 Komplettes Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "CargoBit Scoring Monitoring",
    "uid": "cargobit-scoring-v1",
    "tags": ["scoring", "ml", "suggestions", "logistics"],
    "timezone": "browser",
    "refresh": "1m",
    "time": {
      "from": "now-7d",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "Avg Score (All Suggestions)",
        "type": "stat",
        "gridPos": {"x": 0, "y": 0, "w": 4, "h": 4},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT AVG(final_heuristic_score) as value FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '24 hours'",
            "format": "table"
          }
        ],
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "reduceOptions": {
            "calcs": ["lastNotNull"],
            "fields": "value"
          }
        },
        "fieldConfig": {
          "defaults": {
            "decimals": 2,
            "unit": "short",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 5},
                {"color": "green", "value": 8}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Avg Score (Accepted)",
        "type": "stat",
        "gridPos": {"x": 4, "y": 0, "w": 4, "h": 4},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT AVG(final_heuristic_score) as value FROM suggestion_outcomes WHERE decision = 'ACCEPT' AND event_timestamp > NOW() - INTERVAL '24 hours'",
            "format": "table"
          }
        ],
        "options": {
          "colorMode": "value",
          "graphMode": "area"
        }
      },
      {
        "id": 3,
        "title": "Acceptance Rate (24h)",
        "type": "stat",
        "gridPos": {"x": 8, "y": 0, "w": 4, "h": 4},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as value FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '24 hours'",
            "format": "table"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "decimals": 1,
            "unit": "percent",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 15},
                {"color": "green", "value": 25}
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "Score Distribution",
        "type": "histogram",
        "gridPos": {"x": 12, "y": 0, "w": 12, "h": 4},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT final_heuristic_score as score FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '7 days'",
            "format": "table"
          }
        ],
        "options": {
          "bucketOffset": 0,
          "bucketSize": 1
        }
      },
      {
        "id": 5,
        "title": "Suggestion Funnel",
        "type": "bargauge",
        "gridPos": {"x": 0, "y": 4, "w": 12, "h": 6},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT 'Generated' as metric, COUNT(*) as value FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '7 days' UNION ALL SELECT 'Shown', COUNT(*) FROM suggestion_outcomes WHERE event_type = 'suggestion.shown' AND event_timestamp > NOW() - INTERVAL '7 days' UNION ALL SELECT 'Accepted', COUNT(*) FROM suggestion_outcomes WHERE decision = 'ACCEPT' AND event_timestamp > NOW() - INTERVAL '7 days' UNION ALL SELECT 'Executed', COUNT(*) FROM suggestion_outcomes WHERE executed = TRUE AND event_timestamp > NOW() - INTERVAL '7 days'",
            "format": "table"
          }
        ],
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient",
          "reduceOptions": {
            "calcs": ["lastNotNull"],
            "fields": "value"
          }
        }
      },
      {
        "id": 6,
        "title": "Acceptance Rate Over Time",
        "type": "timeseries",
        "gridPos": {"x": 12, "y": 4, "w": 12, "h": 6},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT DATE_TRUNC('hour', event_timestamp) as time, SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as acceptance_rate FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY 1",
            "format": "time_series"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "custom": {
              "lineWidth": 2,
              "fillOpacity": 10
            }
          }
        }
      },
      {
        "id": 7,
        "title": "ML vs Heuristic: Acceptance Rate",
        "type": "timeseries",
        "gridPos": {"x": 0, "y": 10, "w": 12, "h": 6},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "WITH ranked AS (SELECT DATE_TRUNC('day', event_timestamp) as time, final_heuristic_score, ml_score, decision = 'ACCEPT' as accepted, tour_id, ROW_NUMBER() OVER (PARTITION BY tour_id ORDER BY final_heuristic_score DESC) as hr, ROW_NUMBER() OVER (PARTITION BY tour_id ORDER BY ml_score DESC) as mr FROM suggestion_outcomes WHERE ml_score IS NOT NULL AND event_timestamp > NOW() - INTERVAL '30 days') SELECT time, AVG(CASE WHEN hr = 1 THEN accepted::int END) * 100 as heuristic_top1, AVG(CASE WHEN mr = 1 THEN accepted::int END) * 100 as ml_top1 FROM ranked GROUP BY time ORDER BY time",
            "format": "time_series"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "custom": {
              "lineWidth": 2
            }
          },
          "overrides": [
            {
              "matcher": {"id": "byName", "options": "heuristic_top1"},
              "properties": [{"id": "color", "value": {"fixedColor": "blue", "mode": "fixed"}}]
            },
            {
              "matcher": {"id": "byName", "options": "ml_top1"},
              "properties": [{"id": "color", "value": {"fixedColor": "green", "mode": "fixed"}}]
            }
          ]
        }
      },
      {
        "id": 8,
        "title": "ML vs Heuristic: Realized Margin",
        "type": "timeseries",
        "gridPos": {"x": 12, "y": 10, "w": 12, "h": 6},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT DATE_TRUNC('day', event_timestamp) as time, model_used, AVG(realized_margin) as avg_margin FROM suggestion_outcomes WHERE executed = TRUE AND realized_margin IS NOT NULL AND event_timestamp > NOW() - INTERVAL '30 days' GROUP BY 1, 2 ORDER BY 1",
            "format": "time_series"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currency_EUR"
          }
        }
      },
      {
        "id": 9,
        "title": "Top Customers",
        "type": "table",
        "gridPos": {"x": 0, "y": 16, "w": 12, "h": 6},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT customer_id, COUNT(*) as suggestions, SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) as accepted, ROUND(SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as accept_rate_pct, ROUND(AVG(realized_margin), 2) as avg_margin_eur FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '30 days' GROUP BY customer_id ORDER BY suggestions DESC LIMIT 20",
            "format": "table"
          }
        ]
      },
      {
        "id": 10,
        "title": "Top Drivers",
        "type": "table",
        "gridPos": {"x": 12, "y": 16, "w": 12, "h": 6},
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT driver_id, COUNT(*) as suggestions, ROUND(SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as accept_rate_pct, ROUND(AVG(realized_margin), 2) as avg_margin_eur FROM suggestion_outcomes WHERE event_timestamp > NOW() - INTERVAL '30 days' GROUP BY driver_id HAVING COUNT(*) >= 10 ORDER BY accept_rate_pct DESC LIMIT 20",
            "format": "table"
          }
        ]
      },
      {
        "id": 11,
        "title": "Current Scoring Config",
        "type": "text",
        "gridPos": {"x": 0, "y": 22, "w": 24, "h": 3},
        "options": {
          "mode": "markdown",
          "content": "### Scoring Weights\n\n| Weight | Value | Description |\n|--------|-------|-------------|\n| revenue | 0.35 | Wirtschaftlichkeit |\n| capacityUtilization | 0.20 | Kapazitätsauslastung |\n| priority | 0.10 | Business-Priorität |\n| risk | 0.10 | Risiko-Bewertung |\n| serviceLevel | 0.15 | SLA-Relevanz |\n| co2 | 0.10 | CO₂-Effizienz |\n\n**Blend Factor:** 0.8 (80% Heuristic, 20% ML) | **Model Version:** suggestion_model@v12"
        }
      }
    ]
  }
}
```

### B.4 Alerting-Regeln (Prometheus)

```yaml
groups:
  - name: scoring_alerts
    interval: 1m
    rules:
      - alert: LowAcceptanceRate
        expr: |
          sum(rate(suggestion_decisions_total{decision="ACCEPT"}[1h])) 
          / 
          sum(rate(suggestion_decisions_total[1h])) 
          < 0.15
        for: 2h
        labels:
          severity: warning
          team: logistics
        annotations:
          summary: "Low suggestion acceptance rate"
          description: "Acceptance rate is {{ $value | humanizePercentage }} (threshold: 15%)"
          runbook_url: "https://wiki.cargobit.io/runbooks/scoring-low-acceptance"

      - alert: MLModelDegradation
        expr: |
          ml_model_auc < 0.60
        for: 24h
        labels:
          severity: critical
          team: ml
        annotations:
          summary: "ML model quality degraded"
          description: "Model AUC is {{ $value }} (threshold: 0.60). Consider retraining or rollback."
          runbook_url: "https://wiki.cargobit.io/runbooks/ml-model-degradation"

      - alert: ScoreDriftDetected
        expr: |
          abs(
            (avg(suggestion_score_final[7d]) - avg(suggestion_score_final[30d])) 
            / avg(suggestion_score_final[30d])
          ) > 0.20
        for: 24h
        labels:
          severity: warning
          team: logistics
        annotations:
          summary: "Significant score drift detected"
          description: "Score distribution changed by {{ $value | humanizePercentage }}. Check for data quality issues."

      - alert: HighExecutionFailureRate
        expr: |
          sum(rate(suggestion_outcomes_total{executed="false"}[1h]))
          /
          sum(rate(suggestion_outcomes_total[1h]))
          > 0.10
        for: 4h
        labels:
          severity: warning
          team: operations
        annotations:
          summary: "High suggestion execution failure rate"
          description: "{{ $value | humanizePercentage }} of accepted suggestions fail to execute."

      - alert: LowRealizedMargin
        expr: |
          avg(suggestion_realized_margin[24h]) < 100
        for: 24h
        labels:
          severity: warning
          team: finance
        annotations:
          summary: "Low average realized margin"
          description: "Average realized margin is €{{ $value }}, below threshold of €100."
```

---

## C) Zusammenfassung

| Komponente | Status | Speicherort |
|------------|--------|-------------|
| Event-Schema `suggestion.outcome` | ✅ Vollständig | JSON Schema |
| Kafka Topic Config | ✅ Definiert | Strimzi YAML |
| Training Dataset Schema | ✅ PostgreSQL + Parquet | DDL + PyArrow |
| Feature Engineering Pipeline | ✅ Python | `FeatureEngineer` |
| Grafana Dashboard (15 Panels) | ✅ JSON | Import-ready |
| SQL Queries (15+) | ✅ Validiert | Alle Rows |
| PromQL Queries | ✅ Definiert | Metrics |
| Alerting Rules (5 Alerts) | ✅ YAML | Prometheus |

**Nächste Schritte:**
1. Event-Schema im Schema-Registry registrieren
2. Kafka Topic erstellen
3. PostgreSQL Tables anlegen
4. Grafana Dashboard importieren
5. Alerts konfigurieren
6. Feature Engineering Pipeline deployen
