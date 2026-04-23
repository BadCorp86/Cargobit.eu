# ML-Pipeline: ETL → Feature Store → Training → Deployment

**CargoBit Transport-Plattform – Technische Spezifikation**

---

## 1. Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ML PIPELINE ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│  │   Events    │     │  Stammdaten │     │   Config    │                  │
│  │   (Kafka)   │     │ (PostgreSQL)│     │  (Service)  │                  │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                  │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         ETL LAYER                                   │   │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │   │
│  │  │  Ingest  │──▶│  Clean   │──▶│  Join    │──▶│ Transform│        │   │
│  │  │  (Flink) │   │  (Spark) │   │  (SQL)   │   │ (Python) │        │   │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       FEATURE STORE                                  │   │
│  │  ┌───────────────────────┐     ┌───────────────────────┐           │   │
│  │  │   Offline Store       │     │    Online Store       │           │   │
│  │  │   (S3/Parquet)        │     │    (Redis/Feast)      │           │   │
│  │  │                       │     │                       │           │   │
│  │  │  • Training Data      │     │  • Real-time Features │           │   │
│  │  │  • Historical Features│     │  • Low Latency (<10ms)│           │   │
│  │  └───────────────────────┘     └───────────────────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      TRAINING PIPELINE                               │   │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │   │
│  │  │  Load    │──▶│  Split   │──▶│  Train   │──▶│ Evaluate │        │   │
│  │  │  Data    │   │ (Time)   │   │ (LTR)    │   │ (AUC)    │        │   │
│  │  └──────────┘   └──────────┘   └──────────┘   └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MODEL REGISTRY (MLflow)                         │   │
│  │  • Model Versioning                                                  │   │
│  │  • Experiment Tracking                                               │   │
│  │  • Promotion: Staging → Production                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      DEPLOYMENT                                      │   │
│  │  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐     │   │
│  │  │  Shadow Mode  │────▶│   Canary      │────▶│  Production   │     │   │
│  │  │  (Log Only)   │     │  (10% Traffic)│     │  (Full Rollout)│     │   │
│  │  └───────────────┘     └───────────────┘     └───────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Datenquellen

### 2.1 Events (Kafka)

| Event | Topic | Zweck | Felder |
|-------|-------|-------|--------|
| `suggestion.generated` | `logistics.suggestion.v1` | Features zum Entscheidungszeitpunkt | score, components, tourId, orderId |
| `suggestion.decision.made` | `logistics.suggestion-decision.v1` | Entscheidung | decision, decidedBy, latency |
| `suggestion.outcome` | `logistics.suggestion-outcome.v1` | Outcome + Labels | executed, realizedMargin, delay, co2Impact |

### 2.2 Stammdaten (PostgreSQL)

| Tabelle | Felder | Zweck |
|---------|--------|-------|
| `customers` | customer_id, tier, sla_level, region | Kunden-Metadaten |
| `drivers` | driver_id, acceptance_rate, rating | Fahrer-Metadaten |
| `vehicles` | vehicle_id, type, volume_max, weight_max | Fahrzeug-Metadaten |
| `lanes` | lane_id, origin, destination, avg_margin | Lane-Statistiken |

### 2.3 Config (Config-Service)

```yaml
# Aktuelle Scoring-Weights (für Logging & Vergleich)
scoring:
  weights:
    revenue: 0.35
    capacityUtilization: 0.20
    priority: 0.10
    risk: 0.10
    serviceLevel: 0.15
    co2: 0.10
  ml:
    blendFactor: 0.8
    minAuc: 0.65
```

---

## 3. ETL-Schicht

### 3.1 Datenfluss

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Kafka      │────▶│   Flink      │────▶│   S3/Data    │────▶│   Spark      │
│   Events     │     │   Stream     │     │   Lake       │     │   Batch      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
                            ┌──────────────────────────────────────────────┐
                            │              Parquet Partitioned              │
                            │  /suggestion_events/date=2025-04-19/         │
                            │  /customer_master/                           │
                            │  /driver_master/                             │
                            │  /training_datasets/                         │
                            └──────────────────────────────────────────────┘
```

### 3.2 ETL-Job (PySpark)

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.window import Window
from datetime import datetime, timedelta

class SuggestionETL:
    """
    ETL Pipeline für Suggestion Training Dataset.
    
    Schritte:
    1. Events laden (suggestion.generated + suggestion.outcome)
    2. Join auf suggestionId
    3. Stammdaten anreichern
    4. Feature Engineering
    5. Training Dataset schreiben
    """
    
    def __init__(self, spark: SparkSession, s3_bucket: str):
        self.spark = spark
        self.s3_bucket = s3_bucket
    
    def run(self, date: str) -> None:
        """Führt ETL für ein bestimmtes Datum aus."""
        
        # Step 1: Events laden
        generated_df = self._load_events("suggestion.generated", date)
        outcome_df = self._load_events("suggestion.outcome", date)
        
        # Step 2: Join Events
        joined_df = self._join_events(generated_df, outcome_df)
        
        # Step 3: Stammdaten anreichern
        enriched_df = self._enrich_with_master_data(joined_df)
        
        # Step 4: Feature Engineering
        features_df = self._engineer_features(enriched_df)
        
        # Step 5: Training Dataset schreiben
        self._write_training_dataset(features_df, date)
    
    def _load_events(self, event_type: str, date: str) -> DataFrame:
        """Lädt Events aus S3 Parquet."""
        path = f"s3://{self.s3_bucket}/events/{event_type}/date={date}/"
        return self.spark.read.parquet(path)
    
    def _join_events(
        self, 
        generated_df: DataFrame, 
        outcome_df: DataFrame
    ) -> DataFrame:
        """Joint suggestion.generated mit suggestion.outcome."""
        
        return generated_df.join(
            outcome_df,
            on="suggestionId",
            how="left"
        ).select(
            # Identifiers
            generated_df.suggestionId,
            generated_df.tourId,
            generated_df.orderId,
            generated_df.customerId,
            generated_df.driverId,
            generated_df.vehicleId,
            
            # Features from generated
            generated_df.features.revenueScore.alias("revenueScore"),
            generated_df.features.capacityUtilizationScore.alias("capacityScore"),
            generated_df.features.priorityScore.alias("priorityScore"),
            generated_df.features.riskScore.alias("riskScore"),
            generated_df.features.serviceLevelScore.alias("serviceLevelScore"),
            generated_df.features.co2Score.alias("co2Score"),
            generated_df.features.finalHeuristicScore.alias("heuristicScore"),
            generated_df.features.mlScore.alias("mlScoreOld"),
            
            # Labels from outcome
            outcome_df.decision.alias("decision"),
            outcome_df.executed.alias("executed"),
            outcome_df.realizedMargin.alias("realizedMargin"),
            outcome_df.delayMinutes.alias("delayMinutes"),
            outcome_df.co2ImpactKg.alias("co2Impact"),
            
            # Context
            generated_df.context.timeOfDay.alias("timeOfDay"),
            generated_df.context.dayOfWeek.alias("dayOfWeek"),
            generated_df.context.weatherCondition.alias("weather"),
            generated_df.context.trafficCondition.alias("traffic"),
            
            # Timestamps
            generated_df.occurredAt.alias("generatedAt"),
            outcome_df.occurredAt.alias("outcomeAt")
        )
    
    def _enrich_with_master_data(self, df: DataFrame) -> DataFrame:
        """Reichert Daten mit Stammdaten an."""
        
        # Kunden-Stammdaten
        customers_df = self.spark.read.parquet(
            f"s3://{self.s3_bucket}/master_data/customers/"
        )
        df = df.join(
            customers_df.select(
                "customerId", 
                "tier", 
                "slaLevel", 
                "region"
            ),
            on="customerId",
            how="left"
        )
        
        # Fahrer-Stammdaten
        drivers_df = self.spark.read.parquet(
            f"s3://{self.s3_bucket}/master_data/drivers/"
        )
        df = df.join(
            drivers_df.select(
                "driverId", 
                "acceptanceRate", 
                "rating",
                "experienceYears"
            ),
            on="driverId",
            how="left"
        )
        
        # Lane-Statistiken
        lanes_df = self.spark.read.parquet(
            f"s3://{self.s3_bucket}/master_data/lanes/"
        )
        df = df.join(
            lanes_df.select(
                "laneId",
                "avgMargin90d",
                "acceptanceRate90d",
                "avgDelayMinutes"
            ),
            on="laneId",
            how="left"
        )
        
        return df
    
    def _engineer_features(self, df: DataFrame) -> DataFrame:
        """Feature Engineering."""
        
        # Label: accepted (binary)
        df = df.withColumn(
            "accepted",
            when(col("decision") == "ACCEPT", 1).otherwise(0)
        )
        
        # Label: utility (continuous)
        df = df.withColumn(
            "utilityScore",
            coalesce(col("realizedMargin"), lit(0)) - 
            coalesce(col("delayMinutes"), lit(0)) * lit(2.0)
        )
        
        # Historical Features (from aggregates)
        df = self._add_historical_features(df)
        
        # Temporal Features
        df = df.withColumn("hourOfDay", hour(col("generatedAt")))
        df = df.withColumn("isWeekend", 
            when(dayofweek(col("generatedAt")).isin([1, 7]), 1).otherwise(0)
        )
        
        # Normalize Features
        df = df.withColumn("revenueScoreNorm", 
            col("revenueScore") / lit(50.0)  # Normalize to ~0-1 range
        )
        
        return df
    
    def _add_historical_features(self, df: DataFrame) -> DataFrame:
        """Fügt historische Aggregationen hinzu."""
        
        # Customer Acceptance Rate (30d)
        customer_rates = self._compute_historical_rate(
            df, "customerId", 30
        )
        df = df.join(
            customer_rates.withColumnRenamed(
                "acceptanceRate", 
                "customerAcceptanceRate30d"
            ),
            on="customerId",
            how="left"
        )
        
        # Driver Acceptance Rate (30d)
        driver_rates = self._compute_historical_rate(
            df, "driverId", 30
        )
        df = df.join(
            driver_rates.withColumnRenamed(
                "acceptanceRate", 
                "driverAcceptanceRate30d"
            ),
            on="driverId",
            how="left"
        )
        
        return df.fillna(0.5)  # Default for unknown
    
    def _compute_historical_rate(
        self, 
        df: DataFrame, 
        group_col: str, 
        days: int
    ) -> DataFrame:
        """Berechnet historische Acceptance Rate."""
        
        window = Window.partitionBy(group_col)
        
        return df.groupBy(group_col).agg(
            sum("accepted").alias("accepts"),
            count("*").alias("total"),
            (sum("accepted") / count("*")).alias("acceptanceRate")
        )
    
    def _write_training_dataset(self, df: DataFrame, date: str) -> None:
        """Schreibt Training Dataset."""
        
        output_path = f"s3://{self.s3_bucket}/training_datasets/suggestions/date={date}/"
        
        df.write.mode("overwrite").parquet(output_path)


# Main Entry Point
if __name__ == "__main__":
    spark = SparkSession.builder \
        .appName("SuggestionETL") \
        .config("spark.sql.adaptive.enabled", "true") \
        .getOrCreate()
    
    etl = SuggestionETL(spark, "cargobit-datalake")
    
    # Process last 7 days
    for i in range(7):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        etl.run(date)
    
    spark.stop()
```

### 3.3 Airflow DAG für ETL

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.amazon.aws.operators.emr import EmrAddStepsOperator
from airflow.providers.amazon.aws.sensors.emr import EmrStepSensor
from datetime import datetime, timedelta

default_args = {
    'owner': 'ml-team',
    'depends_on_past': False,
    'start_date': datetime(2025, 4, 1),
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'suggestion_etl_pipeline',
    default_args=default_args,
    schedule_interval='0 1 * * *',  # Täglich um 01:00
    catchup=False
)

# Step 1: Kafka to S3 (Flink Streaming - läuft kontinuierlich)
# Dieser Schritt ist separat als Streaming Job

# Step 2: Spark ETL Job
etl_step = EmrAddStepsOperator(
    task_id='run_etl_job',
    job_flow_id='{{ var.value.emr_cluster_id }}',
    steps=[
        {
            'Name': 'SuggestionETL',
            'ActionOnFailure': 'CONTINUE',
            'HadoopJarStep': {
                'Jar': 'command-runner.jar',
                'Args': [
                    'spark-submit',
                    '--deploy-mode', 'cluster',
                    '--py-files', 's3://cargobit-artifacts/etl/deps.zip',
                    's3://cargobit-artifacts/etl/suggestion_etl.py',
                    '--date', '{{ ds }}'
                ]
            }
        }
    ],
    dag=dag
)

# Step 3: Wait for completion
etl_sensor = EmrStepSensor(
    task_id='wait_for_etl',
    job_flow_id='{{ var.value.emr_cluster_id }}',
    step_id="{{ task_instance.xcom_pull(task_ids='run_etl_job', key='return_value')[0] }}",
    dag=dag
)

etl_step >> etl_sensor
```

---

## 4. Feature Store

### 4.1 Architektur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FEATURE STORE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────┐     ┌───────────────────────────────┐   │
│  │      OFFLINE STORE            │     │      ONLINE STORE             │   │
│  │      (S3/Parquet)             │     │      (Redis/Feast)            │   │
│  ├───────────────────────────────┤     ├───────────────────────────────┤   │
│  │                               │     │                               │   │
│  │  Features:                    │     │  Features:                    │   │
│  │  • customer_acceptance_30d    │     │  • customer_acceptance_30d    │   │
│  │  • driver_acceptance_30d      │     │  • driver_acceptance_30d      │   │
│  │  • lane_margin_avg_90d        │     │  • current_tour_capacity      │   │
│  │  • vehicle_utilization_7d     │     │  • real_time_demand_score     │   │
│  │  • all_historical_features    │     │  • current_weather            │   │
│  │                               │     │  • current_traffic            │   │
│  │  Use Cases:                   │     │                               │   │
│  │  • Training                   │     │  Use Cases:                   │   │
│  │  • Backtesting                │     │  • Online Scoring             │   │
│  │  • Analysis                   │     │  • Real-time Recommendations  │   │
│  │                               │     │  • A/B Testing                │   │
│  │  Latency: Minutes-Hours       │     │  Latency: < 10ms              │   │
│  │                               │     │                               │   │
│  └───────────────────────────────┘     └───────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Feature Definitions (Feast)

```python
# feature_store/feature_definitions.py
from feast import Entity, Feature, FeatureView, FileSource, ValueType
from datetime import timedelta

# Entities
customer = Entity(
    name="customer_id",
    value_type=ValueType.STRING,
    description="Customer identifier"
)

driver = Entity(
    name="driver_id",
    value_type=ValueType.STRING,
    description="Driver identifier"
)

lane = Entity(
    name="lane_id",
    value_type=ValueType.STRING,
    description="Lane identifier (origin->destination)"
)

vehicle = Entity(
    name="vehicle_id",
    value_type=ValueType.STRING,
    description="Vehicle identifier"
)

# Feature Views

# Customer Features
customer_features = FeatureView(
    name="customer_features",
    entities=["customer_id"],
    ttl=timedelta(days=1),
    features=[
        Feature(name="acceptance_rate_30d", dtype=ValueType.FLOAT),
        Feature(name="acceptance_rate_90d", dtype=ValueType.FLOAT),
        Feature(name="realized_margin_avg_90d", dtype=ValueType.FLOAT),
        Feature(name="total_orders_30d", dtype=ValueType.INT64),
        Feature(name="cancellation_rate_30d", dtype=ValueType.FLOAT),
        Feature(name="tier_score", dtype=ValueType.FLOAT),
        Feature(name="sla_level", dtype=ValueType.STRING),
    ],
    input=FileSource(
        path="s3://cargobit-feature-store/customer_features/",
        event_timestamp_column="event_timestamp"
    )
)

# Driver Features
driver_features = FeatureView(
    name="driver_features",
    entities=["driver_id"],
    ttl=timedelta(days=1),
    features=[
        Feature(name="acceptance_rate_30d", dtype=ValueType.FLOAT),
        Feature(name="acceptance_rate_90d", dtype=ValueType.FLOAT),
        Feature(name="realized_margin_avg_90d", dtype=ValueType.FLOAT),
        Feature(name="total_suggestions_30d", dtype=ValueType.INT64),
        Feature(name="rating", dtype=ValueType.FLOAT),
        Feature(name="experience_years", dtype=ValueType.FLOAT),
        Feature(name="preferred_vehicle_type", dtype=ValueType.STRING),
    ],
    input=FileSource(
        path="s3://cargobit-feature-store/driver_features/",
        event_timestamp_column="event_timestamp"
    )
)

# Lane Features
lane_features = FeatureView(
    name="lane_features",
    entities=["lane_id"],
    ttl=timedelta(days=7),
    features=[
        Feature(name="acceptance_rate_90d", dtype=ValueType.FLOAT),
        Feature(name="realized_margin_avg_90d", dtype=ValueType.FLOAT),
        Feature(name="avg_delay_minutes_90d", dtype=ValueType.FLOAT),
        Feature(name="total_suggestions_90d", dtype=ValueType.INT64),
        Feature(name="seasonality_score", dtype=ValueType.FLOAT),
    ],
    input=FileSource(
        path="s3://cargobit-feature-store/lane_features/",
        event_timestamp_column="event_timestamp"
    )
)

# Vehicle Features
vehicle_features = FeatureView(
    name="vehicle_features",
    entities=["vehicle_id"],
    ttl=timedelta(days=1),
    features=[
        Feature(name="utilization_rate_7d", dtype=ValueType.FLOAT),
        Feature(name="avg_margin_7d", dtype=ValueType.FLOAT),
        Feature(name="total_tours_7d", dtype=ValueType.INT64),
        Feature(name="vehicle_type", dtype=ValueType.STRING),
        Feature(name="volume_max_m3", dtype=ValueType.FLOAT),
        Feature(name="weight_max_kg", dtype=ValueType.FLOAT),
    ],
    input=FileSource(
        path="s3://cargobit-feature-store/vehicle_features/",
        event_timestamp_column="event_timestamp"
    )
)
```

### 4.3 Feature Store Service

```python
# services/feature_store_service.py
from feast import FeatureStore
from typing import Dict, List, Optional
import pandas as pd
from datetime import datetime

class FeatureStoreService:
    """
    Service für Feature Store Zugriffe.
    Unterstützt Online (Real-time) und Offline (Training) Features.
    """
    
    def __init__(self, repo_path: str = "/app/feature_store"):
        self.store = FeatureStore(repo_path=repo_path)
    
    # === Online Features (Real-time) ===
    
    def get_online_features(
        self,
        customer_id: str,
        driver_id: str,
        lane_id: str,
        vehicle_id: str
    ) -> Dict[str, float]:
        """
        Holt Online Features für Real-time Scoring.
        Latency: < 10ms
        """
        entity_rows = [{
            "customer_id": customer_id,
            "driver_id": driver_id,
            "lane_id": lane_id,
            "vehicle_id": vehicle_id,
        }]
        
        feature_refs = [
            "customer_features:acceptance_rate_30d",
            "customer_features:tier_score",
            "customer_features:sla_level",
            "driver_features:acceptance_rate_30d",
            "driver_features:rating",
            "lane_features:acceptance_rate_90d",
            "lane_features:realized_margin_avg_90d",
            "vehicle_features:utilization_rate_7d",
        ]
        
        result = self.store.get_online_features(
            entity_rows=entity_rows,
            feature_refs=feature_refs
        ).to_dict()
        
        # Flatten result
        features = {}
        for key, values in result.items():
            if key not in ["customer_id", "driver_id", "lane_id", "vehicle_id"]:
                features[key.split(":")[1]] = values[0]
        
        return features
    
    # === Offline Features (Training) ===
    
    def get_training_features(
        self,
        entity_df: pd.DataFrame,
        feature_refs: List[str]
    ) -> pd.DataFrame:
        """
        Holt historische Features für Training.
        """
        return self.store.get_historical_features(
            entity_df=entity_df,
            feature_refs=feature_refs
        ).to_df()
    
    # === Materialization ===
    
    def materialize_incremental(self, end_date: datetime) -> None:
        """
        Materialisiert neue Features seit letztem Run.
        """
        self.store.materialize_incremental(end_date=end_date)
    
    def materialize_all(self, start_date: datetime, end_date: datetime) -> None:
        """
        Materialisiert alle Features für Zeitraum.
        """
        self.store.materialize(
            start_date=start_date,
            end_date=end_date
        )


# Usage Example
if __name__ == "__main__":
    fs = FeatureStoreService()
    
    # Online Features
    features = fs.get_online_features(
        customer_id="C123",
        driver_id="DRV_42",
        lane_id="DE-BER->DE-HAM",
        vehicle_id="V789"
    )
    print(f"Online Features: {features}")
    
    # Materialize daily
    fs.materialize_incremental(datetime.now())
```

### 4.4 Feature Computation Jobs

```python
# jobs/feature_computation.py
from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.window import Window

class FeatureComputationJob:
    """
    Berechnet aggregierte Features für Feature Store.
    """
    
    def __init__(self, spark: SparkSession):
        self.spark = spark
    
    def compute_customer_features(self, date: str) -> None:
        """Berechnet Customer Features für einen Tag."""
        
        # Load suggestion outcomes
        outcomes = self.spark.read.parquet(
            f"s3://cargobit-datalake/training_datasets/suggestions/"
        ).filter(col("date") <= date)
        
        # Compute aggregations
        features = outcomes.groupBy("customerId").agg(
            # Acceptance rates
            (sum(when(col("decision") == "ACCEPT", 1).otherwise(0)) / count("*"))
                .alias("acceptance_rate_30d"),
            
            # Margins
            avg("realizedMargin").alias("realized_margin_avg_90d"),
            
            # Counts
            count("*").alias("total_orders_30d"),
            
            # Cancellation rate
            (sum(when(col("decision") == "CANCELLED", 1).otherwise(0)) / count("*"))
                .alias("cancellation_rate_30d"),
            
            # Latest timestamp
            max("outcomeAt").alias("event_timestamp")
        )
        
        # Write to Feature Store
        features.write.mode("overwrite").parquet(
            f"s3://cargobit-feature-store/customer_features/date={date}/"
        )
    
    def compute_driver_features(self, date: str) -> None:
        """Berechnet Driver Features."""
        
        outcomes = self.spark.read.parquet(
            f"s3://cargobit-datalake/training_datasets/suggestions/"
        ).filter(col("date") <= date)
        
        features = outcomes.groupBy("driverId").agg(
            (sum(when(col("decision") == "ACCEPT", 1).otherwise(0)) / count("*"))
                .alias("acceptance_rate_30d"),
            avg("realizedMargin").alias("realized_margin_avg_90d"),
            count("*").alias("total_suggestions_30d"),
            max("outcomeAt").alias("event_timestamp")
        )
        
        features.write.mode("overwrite").parquet(
            f"s3://cargobit-feature-store/driver_features/date={date}/"
        )
    
    def compute_lane_features(self, date: str) -> None:
        """Berechnet Lane Features."""
        
        outcomes = self.spark.read.parquet(
            f"s3://cargobit-datalake/training_datasets/suggestions/"
        ).filter(col("date") <= date)
        
        features = outcomes.groupBy("laneId").agg(
            (sum(when(col("decision") == "ACCEPT", 1).otherwise(0)) / count("*"))
                .alias("acceptance_rate_90d"),
            avg("realizedMargin").alias("realized_margin_avg_90d"),
            avg("delayMinutes").alias("avg_delay_minutes_90d"),
            count("*").alias("total_suggestions_90d"),
            max("outcomeAt").alias("event_timestamp")
        )
        
        features.write.mode("overwrite").parquet(
            f"s3://cargobit-feature-store/lane_features/date={date}/"
        )
```

---

## 5. Training Pipeline

### 5.1 Trainings-Job (LightGBM Learning-to-Rank)

```python
# training/ltr_trainer.py
import lightgbm as lgb
import pandas as pd
import numpy as np
from sklearn.model_selection import GroupKFold
from sklearn.metrics import ndcg_score
import mlflow
import mlflow.lightgbm
from typing import Dict, Tuple
from datetime import datetime

class LearningToRankTrainer:
    """
    Training Pipeline für Learning-to-Rank Modell.
    
    Ziel: Ranking lernen, sodass akzeptierte Vorschläge oben stehen.
    """
    
    # Feature Columns
    FEATURE_COLS = [
        # Heuristic Features
        "revenueScore",
        "capacityScore",
        "priorityScore",
        "riskScore",
        "serviceLevelScore",
        "co2Score",
        "heuristicScore",
        
        # Historical Features
        "customerAcceptanceRate30d",
        "driverAcceptanceRate30d",
        "laneMarginAvg90d",
        
        # Context Features
        "hourOfDay",
        "isWeekend",
        "weatherScore",
        "trafficScore",
        
        # Additional Features
        "distancePickupToRoute",
        "distanceDeliveryToDestination",
        "timeToPickup",
        "timeToDelivery",
    ]
    
    def __init__(self, config: Dict):
        self.config = config
        self.model = None
        
    def load_data(self, start_date: str, end_date: str) -> pd.DataFrame:
        """Lädt Trainingsdaten aus Feature Store."""
        
        # Load from Parquet
        df = pd.read_parquet(
            f"s3://cargobit-datalake/training_datasets/suggestions/",
            filters=[("date", ">=", start_date), ("date", "<=", end_date)]
        )
        
        # Filter valid samples
        df = df[df["decision"].notna()]
        
        return df
    
    def prepare_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
    Bereitet Daten für LTR vor.
        
        Returns:
            X: Features
            y: Labels (accepted)
            groups: Group sizes per tour
        """
        
        # Features
        X = df[self.FEATURE_COLS].fillna(0).values
        
        # Labels
        y = df["accepted"].values
        
        # Groups (samples per tour for ranking)
        groups = df.groupby("tourId").size().values
        
        return X, y, groups
    
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        groups_train: np.ndarray,
        X_valid: np.ndarray,
        y_valid: np.ndarray,
        groups_valid: np.ndarray
    ) -> lgb.Booster:
        """Trainiert LTR Modell."""
        
        # LightGBM Parameters
        params = {
            "objective": "lambdarank",
            "metric": "ndcg",
            "ndcg_eval_at": [1, 3, 5, 10],
            "learning_rate": 0.05,
            "num_leaves": 64,
            "max_depth": -1,
            "min_data_in_leaf": 50,
            "feature_fraction": 0.8,
            "bagging_fraction": 0.8,
            "bagging_freq": 5,
            "verbose": 1,
            "seed": 42,
        }
        
        # Create Dataset
        train_data = lgb.Dataset(
            data=X_train,
            label=y_train,
            group=groups_train,
            feature_name=self.FEATURE_COLS
        )
        
        valid_data = lgb.Dataset(
            data=X_valid,
            label=y_valid,
            group=groups_valid,
            feature_name=self.FEATURE_COLS
        )
        
        # Train
        with mlflow.start_run():
            # Log parameters
            mlflow.log_params(params)
            
            # Train model
            model = lgb.train(
                params,
                train_data,
                valid_sets=[train_data, valid_data],
                valid_names=["train", "valid"],
                num_boost_round=1000,
                callbacks=[
                    lgb.early_stopping(stopping_rounds=50),
                    lgb.log_evaluation(period=50)
                ]
            )
            
            # Log metrics
            for metric_name in ["ndcg@1", "ndcg@3", "ndcg@5", "ndcg@10"]:
                mlflow.log_metric(
                    metric_name, 
                    model.best_score["valid"][metric_name]
                )
            
            # Log model
            mlflow.lightgbm.log_model(model, "model")
        
        return model
    
    def evaluate(
        self,
        model: lgb.Booster,
        X: np.ndarray,
        y: np.ndarray,
        groups: np.ndarray
    ) -> Dict[str, float]:
        """Evaluiert Modell."""
        
        # Predict
        scores = model.predict(X)
        
        # Compute NDCG per group
        ndcg_scores = []
        start_idx = 0
        
        for group_size in groups:
            end_idx = start_idx + group_size
            group_y = y[start_idx:end_idx]
            group_scores = scores[start_idx:end_idx]
            
            if group_y.sum() > 0:  # Only if at least one positive
                ndcg = ndcg_score([group_y], [group_scores], k=10)
                ndcg_scores.append(ndcg)
            
            start_idx = end_idx
        
        return {
            "ndcg@10": np.mean(ndcg_scores),
            "ndcg_std": np.std(ndcg_scores),
        }
    
    def run_pipeline(self, start_date: str, end_date: str) -> Dict:
        """Führt komplette Training Pipeline aus."""
        
        # Load data
        print(f"Loading data from {start_date} to {end_date}...")
        df = self.load_data(start_date, end_date)
        
        # Time-based split (train on older, validate on newer)
        split_date = df["date"].max() - pd.Timedelta(days=7)
        train_df = df[df["date"] < split_date]
        valid_df = df[df["date"] >= split_date]
        
        # Prepare data
        X_train, y_train, groups_train = self.prepare_data(train_df)
        X_valid, y_valid, groups_valid = self.prepare_data(valid_df)
        
        print(f"Train: {len(X_train)} samples, {len(groups_train)} groups")
        print(f"Valid: {len(X_valid)} samples, {len(groups_valid)} groups")
        
        # Train
        print("Training model...")
        self.model = self.train(
            X_train, y_train, groups_train,
            X_valid, y_valid, groups_valid
        )
        
        # Evaluate
        print("Evaluating model...")
        metrics = self.evaluate(self.model, X_valid, y_valid, groups_valid)
        
        # Check threshold
        if metrics["ndcg@10"] >= self.config.get("min_ndcg", 0.65):
            print(f"✅ Model passed threshold: {metrics['ndcg@10']:.4f} >= 0.65")
            self._promote_model()
        else:
            print(f"❌ Model failed threshold: {metrics['ndcg@10']:.4f} < 0.65")
        
        return metrics
    
    def _promote_model(self) -> None:
        """Promoviert Modell zu Production."""
        from mlflow.tracking import MlflowClient
        
        client = MlflowClient()
        
        # Get latest model version
        model_versions = client.get_latest_versions(
            "suggestion_ltr_model",
            stages=["None"]
        )
        
        if model_versions:
            # Promote to Staging
            client.transition_model_version_stage(
                name="suggestion_ltr_model",
                version=model_versions[0].version,
                stage="Staging"
            )
            
            print(f"Model v{model_versions[0].version} promoted to Staging")


# Main
if __name__ == "__main__":
    config = {
        "min_ndcg": 0.65,
        "mlflow_tracking_uri": "http://mlflow.cargobit.io"
    }
    
    mlflow.set_tracking_uri(config["mlflow_tracking_uri"])
    mlflow.set_experiment("suggestion_ltr")
    
    trainer = LearningToRankTrainer(config)
    metrics = trainer.run_pipeline(
        start_date="2025-01-01",
        end_date="2025-04-19"
    )
    
    print(f"Final metrics: {metrics}")
```

### 5.2 Airflow DAG für Training

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'ml-team',
    'depends_on_past': False,
    'start_date': datetime(2025, 4, 1),
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'suggestion_model_training',
    default_args=default_args,
    schedule_interval='0 3 * * *',  # Täglich um 03:00
    catchup=False
)

def run_training(**context):
    from training.ltr_trainer import LearningToRankTrainer
    
    end_date = context['ds']
    start_date = (datetime.strptime(end_date, '%Y-%m-%d') - timedelta(days=90)).strftime('%Y-%m-%d')
    
    trainer = LearningToRankTrainer({
        "min_ndcg": 0.65,
        "mlflow_tracking_uri": "http://mlflow.cargobit.io:5000"
    })
    
    metrics = trainer.run_pipeline(start_date, end_date)
    return metrics

def run_shadow_evaluation(**context):
    """Evaluiert Modell im Shadow Mode."""
    # Compare heuristic vs ml on recent data
    pass

def promote_if_better(**context):
    """Promoviert Modell wenn besser als Production."""
    from mlflow.tracking import MlflowClient
    
    client = MlflowClient()
    
    staging = client.get_latest_versions("suggestion_ltr_model", stages=["Staging"])
    production = client.get_latest_versions("suggestion_ltr_model", stages=["Production"])
    
    if staging and (not production or staging[0].metrics.get("ndcg", 0) > production[0].metrics.get("ndcg", 0)):
        client.transition_model_version_stage(
            name="suggestion_ltr_model",
            version=staging[0].version,
            stage="Production"
        )
        return f"Promoted v{staging[0].version} to Production"
    return "No promotion"

train_task = PythonOperator(
    task_id='train_model',
    python_callable=run_training,
    dag=dag
)

evaluate_task = PythonOperator(
    task_id='shadow_evaluation',
    python_callable=run_shadow_evaluation,
    dag=dag
)

promote_task = PythonOperator(
    task_id='promote_model',
    python_callable=promote_if_better,
    dag=dag
)

train_task >> evaluate_task >> promote_task
```

---

## 6. Deployment

### 6.1 Deployment-Stages

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Shadow Mode   │────▶│     Canary      │────▶│   Production    │
│   (Log Only)    │     │  (10% Traffic)  │     │  (Full Rollout) │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│                 │     │                 │     │                 │
│  ML Score wird  │     │  10% der Touren │     │  Alle Touren    │
│  berechnet,     │     │  nutzen ML      │     │  nutzen ML      │
│  aber NICHT     │     │  Score aktiv    │     │  Score aktiv    │
│  verwendet.     │     │                 │     │                 │
│                 │     │  Vergleich:     │     │  Monitoring:    │
│  Vergleich mit  │     │  Heuristic vs   │     │  Acceptance,    │
│  Heuristic für  │     │  ML (A/B Test)  │     │  Margin, Delay  │
│  spätere Analyse│     │                 │     │                 │
│                 │     │  Rollback wenn: │     │  Rollback wenn: │
│  Dauer: 7 Tage  │     │  ML < Heuristic │     │  Degradation    │
│                 │     │  Dauer: 7 Tage  │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 6.2 Model Serving Service

```python
# services/model_serving_service.py
import lightgbm as lgb
import numpy as np
from typing import Dict, List, Optional
import mlflow
from dataclasses import dataclass
import os

@dataclass
class ScoringResult:
    """Ergebnis der ML-Scoring Anfrage."""
    suggestion_id: str
    heuristic_score: float
    ml_score: float
    final_score: float
    model_version: str
    blend_factor: float
    top_contributors: List[Dict]  # SHAP contributions


class ModelServingService:
    """
    Serving Service für ML-basiertes Scoring.
    
    Unterstützt:
    - Shadow Mode (log only)
    - Canary (partial traffic)
    - Production (full rollout)
    """
    
    FEATURE_COLS = [
        "revenueScore",
        "capacityScore",
        "priorityScore",
        "riskScore",
        "serviceLevelScore",
        "co2Score",
        "customerAcceptanceRate30d",
        "driverAcceptanceRate30d",
        "laneMarginAvg90d",
        "hourOfDay",
        "isWeekend",
        "weatherScore",
        "trafficScore",
    ]
    
    def __init__(self, config: Dict):
        self.config = config
        self.model = None
        self.model_version = None
        self.blend_factor = config.get("blend_factor", 0.8)
        self.mode = config.get("mode", "shadow")  # shadow, canary, production
        
        self._load_model()
    
    def _load_model(self) -> None:
        """Lädt aktuelles Production Modell."""
        mlflow.set_tracking_uri(self.config["mlflow_uri"])
        
        client = mlflow.tracking.MlflowClient()
        versions = client.get_latest_versions(
            "suggestion_ltr_model",
            stages=["Production"]
        )
        
        if versions:
            self.model = mlflow.lightgbm.load_model(
                f"models:/suggestion_ltr_model/{versions[0].version}"
            )
            self.model_version = versions[0].version
        else:
            print("Warning: No production model found, using heuristic only")
            self.model = None
    
    def score(
        self,
        suggestion_id: str,
        heuristic_score: float,
        features: Dict[str, float]
    ) -> ScoringResult:
        """
        Berechnet ML-Score und kombiniert mit Heuristik.
        
        Returns:
            ScoringResult mit final_score basierend auf Mode.
        """
        
        ml_score = 0.0
        top_contributors = []
        
        # Calculate ML score if model available
        if self.model is not None:
            # Prepare feature vector
            X = np.array([[features.get(col, 0) for col in self.FEATURE_COLS]])
            
            # Predict
            ml_score_raw = self.model.predict(X)[0]
            
            # Normalize to similar scale as heuristic
            ml_score = self._normalize_ml_score(ml_score_raw)
            
            # Get SHAP contributions (lightweight)
            top_contributors = self._get_top_contributors(X)
        
        # Calculate final score based on mode
        if self.mode == "shadow":
            # Shadow mode: use heuristic only, log ML score
            final_score = heuristic_score
            
        elif self.mode == "canary":
            # Canary: use blend for 10% of requests
            import random
            if random.random() < 0.1:
                final_score = self.blend_factor * heuristic_score + (1 - self.blend_factor) * ml_score
            else:
                final_score = heuristic_score
                
        else:  # production
            # Production: always use blend
            final_score = self.blend_factor * heuristic_score + (1 - self.blend_factor) * ml_score
        
        return ScoringResult(
            suggestion_id=suggestion_id,
            heuristic_score=heuristic_score,
            ml_score=ml_score,
            final_score=final_score,
            model_version=self.model_version or "none",
            blend_factor=self.blend_factor,
            top_contributors=top_contributors
        )
    
    def _normalize_ml_score(self, raw_score: float) -> float:
        """Normalisiert ML-Score auf vergleichbare Skala."""
        # ML model outputs ranking scores, normalize to ~0-15 range
        return max(0, min(15, raw_score * 10))
    
    def _get_top_contributors(self, X: np.ndarray) -> List[Dict]:
        """
        Berechnet Top Feature Contributions (vereinfacht).
        In Production: SHAP values verwenden.
        """
        if self.model is None:
            return []
        
        # Get feature importance from model
        importance = self.model.feature_importance(importance_type="gain")
        importance_pct = importance / importance.sum()
        
        # Get top 5 features
        top_indices = np.argsort(importance_pct)[::-1][:5]
        
        return [
            {
                "feature": self.FEATURE_COLS[i],
                "importance": float(importance_pct[i])
            }
            for i in top_indices
        ]


# API Integration
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="ML Scoring Service")

class ScoringRequest(BaseModel):
    suggestion_id: str
    heuristic_score: float
    features: Dict[str, float]

class ScoringResponse(BaseModel):
    suggestion_id: str
    heuristic_score: float
    ml_score: float
    final_score: float
    model_version: str
    blend_factor: float
    top_contributors: List[Dict]

# Initialize service
serving_service = ModelServingService({
    "mlflow_uri": os.getenv("MLFLOW_URI", "http://mlflow.cargobit.io:5000"),
    "blend_factor": float(os.getenv("BLEND_FACTOR", "0.8")),
    "mode": os.getenv("SCORING_MODE", "shadow")
})

@app.post("/score", response_model=ScoringResponse)
async def score(request: ScoringRequest):
    """Berechnet ML-erweiterten Score."""
    result = serving_service.score(
        suggestion_id=request.suggestion_id,
        heuristic_score=request.heuristic_score,
        features=request.features
    )
    
    return ScoringResponse(
        suggestion_id=result.suggestion_id,
        heuristic_score=result.heuristic_score,
        ml_score=result.ml_score,
        final_score=result.final_score,
        model_version=result.model_version,
        blend_factor=result.blend_factor,
        top_contributors=result.top_contributors
    )

@app.get("/health")
async def health():
    return {"status": "healthy", "model_version": serving_service.model_version}
```

### 6.3 Kubernetes Deployment

```yaml
# kubernetes/ml-scoring-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-scoring-service
  namespace: cargobit-ml
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-scoring-service
  template:
    metadata:
      labels:
        app: ml-scoring-service
    spec:
      containers:
      - name: scoring-service
        image: cargobit/ml-scoring-service:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: MLFLOW_URI
          value: "http://mlflow.cargobit.io:5000"
        - name: BLEND_FACTOR
          value: "0.8"
        - name: SCORING_MODE
          value: "shadow"  # shadow | canary | production
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: ml-scoring-service
  namespace: cargobit-ml
spec:
  selector:
    app: ml-scoring-service
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

---

## 7. Explainability (SHAP)

### 7.1 SHAP Integration

```python
# explainability/shap_explainer.py
import shap
import lightgbm as lgb
import numpy as np
import pandas as pd
from typing import Dict, List
import matplotlib.pyplot as plt

class SHAPExplainer:
    """
    SHAP-basierte Explainability für Suggestion Scoring.
    
    Features:
    - Globale Feature Importance
    - Lokale Erklärungen (pro Vorschlag)
    - Visualisierungen
    """
    
    def __init__(self, model: lgb.Booster, feature_names: List[str]):
        self.model = model
        self.feature_names = feature_names
        self.explainer = shap.TreeExplainer(model)
    
    def explain_single(self, features: np.ndarray) -> Dict:
        """
        Erklärt einen einzelnen Vorschlag.
        
        Returns:
            Dictionary mit Top Contributoren und SHAP Values.
        """
        # Calculate SHAP values
        shap_values = self.explainer.shap_values(features)
        
        # Get contributions
        contributions = list(zip(self.feature_names, shap_values[0]))
        contributions.sort(key=lambda x: abs(x[1]), reverse=True)
        
        return {
            "base_value": float(self.explainer.expected_value),
            "shap_values": {k: float(v) for k, v in contributions},
            "top_contributors": [
                {
                    "feature": feat,
                    "impact": float(val),
                    "direction": "positive" if val > 0 else "negative"
                }
                for feat, val in contributions[:5]
            ]
        }
    
    def get_global_importance(self, X: np.ndarray) -> pd.DataFrame:
        """
        Berechnet globale Feature Importance.
        """
        shap_values = self.explainer.shap_values(X)
        
        # Mean absolute SHAP values
        importance = np.abs(shap_values).mean(axis=0)
        
        df = pd.DataFrame({
            "feature": self.feature_names,
            "importance": importance
        }).sort_values("importance", ascending=False)
        
        return df
    
    def plot_summary(self, X: np.ndarray, output_path: str = None) -> None:
        """
        Erstellt SHAP Summary Plot.
        """
        shap_values = self.explainer.shap_values(X)
        
        plt.figure(figsize=(10, 8))
        shap.summary_plot(
            shap_values, 
            X, 
            feature_names=self.feature_names,
            show=False
        )
        
        if output_path:
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()
    
    def plot_waterfall(
        self, 
        features: np.ndarray, 
        output_path: str = None
    ) -> None:
        """
        Erstellt Waterfall Plot für einzelnen Vorschlag.
        """
        shap_values = self.explainer.shap_values(features)
        
        plt.figure(figsize=(10, 6))
        shap.waterfall_plot(
            shap.Explanation(
                values=shap_values[0],
                base_values=self.explainer.expected_value,
                feature_names=self.feature_names
            ),
            show=False
        )
        
        if output_path:
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()


# Integration mit Model Serving
class ExplainableModelServing(ModelServingService):
    """
    Erweitertes Model Serving mit Explainability.
    """
    
    def __init__(self, config: Dict):
        super().__init__(config)
        
        if self.model is not None:
            self.shap_explainer = SHAPExplainer(
                self.model, 
                self.FEATURE_COLS
            )
        else:
            self.shap_explainer = None
    
    def score_with_explanation(
        self,
        suggestion_id: str,
        heuristic_score: float,
        features: Dict[str, float]
    ) -> ScoringResult:
        """
        Score mit vollständiger Erklärung.
        """
        result = self.score(suggestion_id, heuristic_score, features)
        
        if self.shap_explainer is not None:
            X = np.array([[features.get(col, 0) for col in self.FEATURE_COLS]])
            explanation = self.shap_explainer.explain_single(X)
            
            result.top_contributors = explanation["top_contributors"]
            result.shap_base_value = explanation["base_value"]
            result.shap_values = explanation["shap_values"]
        
        return result
```

### 7.2 UI Integration

```python
# API Endpoint für Explainability
@app.post("/explain")
async def explain_suggestion(request: ScoringRequest):
    """
    Liefert detaillierte Erklärung für einen Vorschlag.
    """
    result = serving_service.score_with_explanation(
        suggestion_id=request.suggestion_id,
        heuristic_score=request.heuristic_score,
        features=request.features
    )
    
    return {
        "suggestion_id": result.suggestion_id,
        "scores": {
            "heuristic": result.heuristic_score,
            "ml": result.ml_score,
            "final": result.final_score
        },
        "explanation": {
            "model_version": result.model_version,
            "blend_factor": result.blend_factor,
            "top_contributors": result.top_contributors,
            "interpretation": _generate_interpretation(result.top_contributors)
        }
    }

def _generate_interpretation(contributors: List[Dict]) -> str:
    """
    Generiert menschenlesbare Interpretation.
    """
    if not contributors:
        return "Keine Erklärung verfügbar."
    
    top = contributors[0]
    interpretation = f"Dieser Vorschlag hat einen hohen Score wegen: {top['feature']}"
    
    if len(contributors) > 1:
        second = contributors[1]
        interpretation += f", zusätzlich begünstigt durch: {second['feature']}"
    
    if len(contributors) > 2:
        third = contributors[2]
        interpretation += f" und: {third['feature']}"
    
    return interpretation + "."
```

### 7.3 Dispatcher UI Komponente

```typescript
// components/SuggestionExplanation.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Contributor {
  feature: string;
  impact: number;
  direction: 'positive' | 'negative';
}

interface ExplanationProps {
  suggestionId: string;
  heuristicScore: number;
  mlScore: number;
  finalScore: number;
  topContributors: Contributor[];
  modelVersion: string;
  blendFactor: number;
}

export function SuggestionExplanation({
  suggestionId,
  heuristicScore,
  mlScore,
  finalScore,
  topContributors,
  modelVersion,
  blendFactor,
}: ExplanationProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm flex justify-between">
          <span>Score-Erklärung</span>
          <Badge variant="outline">ML v{modelVersion}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Heuristik</span>
            <span className="font-mono">{heuristicScore.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>ML-Score</span>
            <span className="font-mono">{mlScore.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t pt-2">
            <span>Final (α={blendFactor})</span>
            <span className="font-mono text-primary">{finalScore.toFixed(2)}</span>
          </div>
        </div>

        {/* Top Contributors */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
            Wichtigste Einflussfaktoren
          </h4>
          {topContributors.map((contributor, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>{_formatFeatureName(contributor.feature)}</span>
                  <span className="font-mono text-xs">
                    {Math.abs(contributor.impact * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={Math.abs(contributor.impact * 100)}
                  className={`h-2 ${
                    contributor.direction === 'positive'
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}
                />
              </div>
              <span
                className={`text-lg ${
                  contributor.direction === 'positive'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {contributor.direction === 'positive' ? '↑' : '↓'}
              </span>
            </div>
          ))}
        </div>

        {/* Interpretation */}
        <div className="bg-muted/50 rounded-md p-3 text-sm">
          <p className="text-muted-foreground">
            {_generateInterpretation(topContributors)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function _formatFeatureName(feature: string): string {
  const names: Record<string, string> = {
    revenueScore: 'Revenue',
    capacityScore: 'Kapazität',
    priorityScore: 'Priorität',
    riskScore: 'Risiko',
    serviceLevelScore: 'Service-Level',
    co2Score: 'CO₂',
    customerAcceptanceRate30d: 'Kunden-Akzeptanz',
    driverAcceptanceRate30d: 'Fahrer-Akzeptanz',
    laneMarginAvg90d: 'Lane-Margin',
  };
  return names[feature] || feature;
}

function _generateInterpretation(contributors: Contributor[]): string {
  if (!contributors || contributors.length === 0) {
    return 'Keine Erklärung verfügbar.';
  }

  const positive = contributors.filter(c => c.direction === 'positive');
  const negative = contributors.filter(c => c.direction === 'negative');

  let text = 'Dieser Vorschlag wurde ';
  
  if (positive.length > 0) {
    text += `begünstigt durch ${_formatFeatureName(positive[0].feature)}`;
    if (positive.length > 1) {
      text += ` und ${_formatFeatureName(positive[1].feature)}`;
    }
  }
  
  if (negative.length > 0) {
    text += `, aber ${_formatFeatureName(negative[0].feature)} wirkt negativ`;
  }

  return text + '.';
}
```

---

## 8. Monitoring & Alerts

### 8.1 ML-Specific Metrics

```yaml
# prometheus/ml_metrics.yml
groups:
  - name: ml_model_metrics
    interval: 1m
    rules:
      # Model Performance
      - record: ml:model:ndcg:avg
        expr: avg(ml_model_ndcg_score)
      
      - record: ml:model:acceptance_rate:avg
        expr: |
          sum(rate(suggestion_decisions_total{decision="ACCEPT",model_used="ml"}[1h]))
          /
          sum(rate(suggestion_decisions_total{model_used="ml"}[1h]))
      
      - record: ml:model:margin:avg
        expr: avg(ml_model_realized_margin)
      
      # Model Comparison
      - record: ml:comparison:acceptance_improvement
        expr: |
          (sum(rate(suggestion_decisions_total{decision="ACCEPT",model_used="ml"}[24h]))
           / sum(rate(suggestion_decisions_total{model_used="ml"}[24h])))
          -
          (sum(rate(suggestion_decisions_total{decision="ACCEPT",model_used="heuristic"}[24h]))
           / sum(rate(suggestion_decisions_total{model_used="heuristic"}[24h])))
      
      # Feature Store Latency
      - record: ml:feature_store:latency:p99
        expr: histogram_quantile(0.99, rate(feature_store_request_duration_seconds_bucket[5m]))
      
      # Model Serving Latency
      - record: ml:serving:latency:p99
        expr: histogram_quantile(0.99, rate(model_serving_request_duration_seconds_bucket[5m]))

  - name: ml_alerts
    interval: 5m
    rules:
      - alert: MLModelPerformanceDegraded
        expr: ml:model:ndcg:avg < 0.60
        for: 24h
        labels:
          severity: warning
          team: ml
        annotations:
          summary: "ML model NDCG degraded"
          description: "Model NDCG is {{ $value }} (threshold: 0.60)"
      
      - alert: MLWorseThanHeuristic
        expr: ml:comparison:acceptance_improvement < -0.05
        for: 12h
        labels:
          severity: critical
          team: ml
        annotations:
          summary: "ML model underperforming vs heuristic"
          description: "ML acceptance rate is {{ $value | humanizePercentage }} worse than heuristic"
      
      - alert: FeatureStoreLatencyHigh
        expr: ml:feature_store:latency:p99 > 0.05
        for: 15m
        labels:
          severity: warning
          team: ml
        annotations:
          summary: "Feature store latency too high"
          description: "P99 latency is {{ $value }}s (threshold: 50ms)"
      
      - alert: ModelServingLatencyHigh
        expr: ml:serving:latency:p99 > 0.1
        for: 15m
        labels:
          severity: warning
          team: ml
        annotations:
          summary: "Model serving latency too high"
          description: "P99 latency is {{ $value }}s (threshold: 100ms)"
```

---

## 9. Zusammenfassung

| Komponente | Status | Speicherort |
|------------|--------|-------------|
| ETL Pipeline | ✅ | PySpark + Airflow |
| Feature Store | ✅ | Feast (Online + Offline) |
| Training Pipeline | ✅ | LightGBM LTR + MLflow |
| Model Serving | ✅ | FastAPI + Kubernetes |
| Explainability | ✅ | SHAP + UI Components |
| Monitoring | ✅ | Prometheus + Alerts |
| Deployment Stages | ✅ | Shadow → Canary → Production |

**Deployment-Timeline:**

| Woche | Phase | Aktivität |
|-------|-------|-----------|
| 1-2 | Shadow Mode | ML Score logging, Vergleich mit Heuristik |
| 3-4 | Canary (10%) | A/B Test, Metrics sammeln |
| 5-6 | Canary (50%) | Skalieren, Validierung |
| 7+ | Production | Full Rollout, kontinuierliches Monitoring |
