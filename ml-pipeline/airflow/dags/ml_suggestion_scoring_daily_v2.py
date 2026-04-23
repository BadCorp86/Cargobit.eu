"""
CargoBit ML Suggestion Scoring - Daily Pipeline DAG
====================================================

Airflow DAG für tägliche ML Pipeline nach User-Spezifikation:
1. ingest_events - Kafka → Warehouse
2. build_historical_features - SQL Aggregationen
3. build_training_dataset - Materialize View
4. train_model - LightGBM/XGBoost Training
5. promote_model_if_good - Model Promotion
6. notify - Slack/Email Notification

Autor: CargoBit ML Team
Version: 2.0.0 (User Spec)
Schedule: Daily at 02:00
"""

from datetime import datetime, timedelta
from typing import Any, Dict

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from airflow.providers.slack.operators.slack_webhook import SlackWebhookOperator
from airflow.models import Variable

# =============================================================================
# CONFIGURATION
# =============================================================================

DEFAULT_ARGS = {
    "owner": "ml-team",
    "retries": 1,
    "retry_delay": timedelta(minutes=10),
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def ingest_events_from_kafka_to_warehouse(**context) -> Dict[str, int]:
    """
    Ingest Events von Kafka Topics in Data Warehouse.
    
    Produktionsreife Implementation mit:
    - Batch-Processing (500 Events)
    - Idempotenz (ON CONFLICT UPDATE)
    - Schema-Mapping
    - Robustem Fehlerhandling
    - Offset-Commit erst nach erfolgreichem Write
    
    Topics:
    - suggestion.generated → suggestion_generated
    - suggestion.outcome → suggestion_outcome
    """
    import sys
    import os
    
    # Add etl module to path
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'etl'))
    
    from kafka_ingestion import ingest_events_from_kafka_to_warehouse as _ingest
    
    return _ingest(
        max_messages=None,  # No limit in production
        use_snowflake=os.getenv("WAREHOUSE_TYPE", "postgresql") == "snowflake",
    )


def train_model(**context):
    """
    Trainiert das ML-Modell.
    
    In Production: Databricks/MLflow-Job
    In Development: Lokales Training
    """
    from my_ml_package.training import train_and_register_model
    
    train_and_register_model(
        dataset_table="ml_training_dataset",
        registry_table="ml_model_registry",
    )


def promote_model_if_good(**context):
    """
    Promoted das beste CANDIDATE Modell zu ACTIVE wenn Metriken passen.
    
    Thresholds:
    - min_auc: 0.65
    - min_ndcg: 0.60
    """
    from my_ml_package.model_selection import promote_best_model
    
    promote_best_model(
        registry_table="ml_model_registry",
        min_auc=0.65,
    )


# =============================================================================
# DAG DEFINITION
# =============================================================================

with DAG(
    dag_id="ml_suggestion_scoring_daily",
    default_args=DEFAULT_ARGS,
    schedule_interval="0 2 * * *",  # täglich um 02:00
    start_date=datetime(2026, 4, 1),
    catchup=False,
    max_active_runs=1,
    tags=["ml", "scoring", "suggestions"],
) as dag:

    # =========================================================================
    # TASK 1: Ingest Events
    # =========================================================================
    ingest_events = PythonOperator(
        task_id="ingest_events",
        python_callable=ingest_events_from_kafka_to_warehouse,
    )

    # =========================================================================
    # TASK 2: Build Historical Features
    # =========================================================================
    build_historical_features = SQLExecuteQueryOperator(
        task_id="build_historical_features",
        conn_id="warehouse",
        sql="sql/build_historical_features.sql",  # Aggregationen 30d/90d
    )

    # =========================================================================
    # TASK 3: Build Training Dataset
    # =========================================================================
    build_training_dataset = SQLExecuteQueryOperator(
        task_id="build_training_dataset",
        conn_id="warehouse",
        sql="sql/materialize_ml_training_dataset.sql",
        # CREATE TABLE AS SELECT vw_ml_training_dataset
    )

    # =========================================================================
    # TASK 4: Train Model
    # =========================================================================
    def train_model(**context):
        # TODO: ersetzen durch Databricks/MLflow-Job
        from my_ml_package.training import train_and_register_model
        train_and_register_model(
            dataset_table="ml_training_dataset",
            registry_table="ml_model_registry",
        )

    train_model_task = PythonOperator(
        task_id="train_model",
        python_callable=train_model,
    )

    # =========================================================================
    # TASK 5: Promote Model
    # =========================================================================
    def promote_model_if_good(**context):
        from my_ml_package.model_selection import promote_best_model
        promote_best_model(
            registry_table="ml_model_registry",
            min_auc=0.65,
        )

    promote_model_task = PythonOperator(
        task_id="promote_model_if_good",
        python_callable=promote_model_if_good,
    )

    # =========================================================================
    # TASK 6: Notify
    # =========================================================================
    notify = SlackWebhookOperator(
        task_id="notify",
        slack_webhook_conn_id="slack_ml_alerts",
        message="""
:robot_face: *ML Pipeline Completed*

*DAG:* {{ ti.dag_id }}
*Execution Date:* {{ ti.execution_date }}
*Model Version:* {{ ti.xcom_pull(task_ids='train_model').get('model_version', 'N/A') }}
*Status:* {{ ti.xcom_pull(task_ids='promote_model_if_good').get('status', 'N/A') }}
""",
        trigger_rule="all_success",
    )

    # =========================================================================
    # TASK DEPENDENCIES
    # =========================================================================
    (
        ingest_events 
        >> build_historical_features 
        >> build_training_dataset 
        >> train_model_task 
        >> promote_model_task
        >> notify
    )
