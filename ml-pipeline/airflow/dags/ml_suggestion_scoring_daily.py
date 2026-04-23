"""
CargoBit ML Suggestion Scoring - Daily Pipeline DAG
====================================================

Airflow DAG für tägliche ML Pipeline:
1. Ingest Events (Kafka → Warehouse)
2. Build Historical Features
3. Build Training Dataset
4. Train Model (XGBoost/LightGBM)
5. Promote Model (if metrics pass thresholds)
6. Notify Team

Autor: CargoBit ML Team
Version: 2.0.0
Schedule: Daily at 02:00 UTC
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import json
import logging

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator
from airflow.providers.databricks.operators.databricks import DatabricksSubmitRunOperator
from airflow.providers.slack.operators.slack_webhook import SlackWebhookOperator
from airflow.models import Variable
from airflow.utils.task_group import TaskGroup
from airflow.sensors.external_task import ExternalTaskSensor

# =============================================================================
# CONFIGURATION
# =============================================================================

# Default arguments
default_args = {
    'owner': 'ml-team',
    'depends_on_past': False,
    'email': ['ml-alerts@cargobit.io'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2),
}

# Environment config
SNOWFLAKE_CONN_ID = Variable.get('snowflake_conn_id', 'snowflake_prod')
DATABRICKS_CONN_ID = Variable.get('databricks_conn_id', 'databricks_prod')
SLACK_WEBHOOK_CONN_ID = Variable.get('slack_webhook_conn_id', 'slack_ml_alerts')

# Model promotion thresholds
MODEL_AUC_THRESHOLD = float(Variable.get('model_auc_threshold', '0.72'))
MODEL_NDCG_THRESHOLD = float(Variable.get('model_ndcg_threshold', '0.65'))
MIN_TRAINING_SAMPLES = int(Variable.get('min_training_samples', '10000'))

# =============================================================================
# DAG DEFINITION
# =============================================================================

dag = DAG(
    dag_id='ml_suggestion_scoring_daily',
    description='Daily ML Pipeline for Suggestion Scoring Model',
    schedule_interval='0 2 * * *',  # Daily at 02:00 UTC
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    default_args=default_args,
    tags=['ml', 'suggestion-scoring', 'training', 'production'],
    doc_md=__doc__,
)

# =============================================================================
# TASK FUNCTIONS
# =============================================================================

def ingest_events_from_kafka(**context) -> Dict[str, int]:
    """
    Ingest events from Kafka topics into Data Warehouse.
    
    Reads from:
    - suggestion-generated topic → suggestion_generated table
    - suggestion-outcome topic → suggestion_outcome table
    
    Returns:
        Dict with counts of ingested records
    """
    from kafka import KafkaConsumer
    from datetime import datetime, timedelta
    import snowflake.connector
    
    execution_date = context['execution_date']
    yesterday = execution_date - timedelta(days=1)
    
    # Kafka consumer setup
    consumer = KafkaConsumer(
        'suggestion-generated',
        'suggestion-outcome',
        bootstrap_servers=Variable.get('kafka_brokers', 'kafka:9092'),
        group_id='ml-pipeline-ingestion',
        auto_offset_reset='earliest',
        enable_auto_commit=False,
        value_deserializer=lambda x: json.loads(x.decode('utf-8')),
    )
    
    # Snowflake connection
    conn = snowflake.connector.connect(
        user=Variable.get('snowflake_user'),
        password=Variable.get('snowflake_password'),
        account=Variable.get('snowflake_account'),
        warehouse='ML_WH',
        database='CARGOBIT_ML',
        schema='RAW',
    )
    
    generated_count = 0
    outcome_count = 0
    
    # Process messages (simplified - in production use batch insert)
    for topic, records in consumer.poll(timeout_ms=60000).items():
        for record in records:
            if topic.topic == 'suggestion-generated':
                # Insert into suggestion_generated
                pass  # Implementation omitted for brevity
                generated_count += 1
            elif topic.topic == 'suggestion-outcome':
                # Insert into suggestion_outcome
                pass
                outcome_count += 1
    
    consumer.close()
    conn.close()
    
    logging.info(f"Ingested {generated_count} generated, {outcome_count} outcome events")
    
    return {
        'generated_count': generated_count,
        'outcome_count': outcome_count,
    }


def build_historical_features(**context) -> Dict[str, Any]:
    """
    Build historical feature aggregations from suggestion_outcome.
    
    Aggregations:
    - Customer: acceptance_rate_30d, delay_avg_30d, cancellation_rate_30d
    - Driver: acceptance_rate_30d, delay_avg_30d
    - Lane: realized_margin_avg_90d
    """
    import snowflake.connector
    from datetime import datetime, timedelta
    
    execution_date = context['execution_date']
    snapshot_date = (execution_date - timedelta(days=1)).strftime('%Y-%m-%d')
    
    conn = snowflake.connector.connect(
        user=Variable.get('snowflake_user'),
        password=Variable.get('snowflake_password'),
        account=Variable.get('snowflake_account'),
        warehouse='ML_WH',
        database='CARGOBIT_ML',
        schema='FEATURES',
    )
    
    cursor = conn.cursor()
    
    # Customer features
    customer_sql = f"""
    INSERT INTO historical_features (
        customer_id, driver_id, tour_id, snapshot_date,
        customer_acceptance_rate_30d, customer_delay_avg_30d, 
        customer_cancellation_rate_30d, customer_total_suggestions_30d,
        customer_total_accepts_30d
    )
    SELECT 
        customer_id,
        'ALL' as driver_id,
        'ALL' as tour_id,
        '{snapshot_date}' as snapshot_date,
        SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) * 1.0 / 
            NULLIF(COUNT(*), 0) as customer_acceptance_rate_30d,
        AVG(delay_minutes) as customer_delay_avg_30d,
        SUM(CASE WHEN decision = 'REJECT' THEN 1 ELSE 0 END) * 1.0 / 
            NULLIF(COUNT(*), 0) as customer_cancellation_rate_30d,
        COUNT(*) as customer_total_suggestions_30d,
        SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) as customer_total_accepts_30d
    FROM vw_suggestion_base_features
    WHERE generated_at >= DATEADD(day, -30, '{snapshot_date}')
      AND generated_at < '{snapshot_date}'
    GROUP BY customer_id
    """
    
    # Driver features
    driver_sql = f"""
    INSERT INTO historical_features (
        customer_id, driver_id, tour_id, snapshot_date,
        driver_acceptance_rate_30d, driver_delay_avg_30d,
        driver_total_suggestions_30d, driver_total_accepts_30d
    )
    SELECT 
        'ALL' as customer_id,
        driver_id,
        'ALL' as tour_id,
        '{snapshot_date}' as snapshot_date,
        SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) * 1.0 / 
            NULLIF(COUNT(*), 0) as driver_acceptance_rate_30d,
        AVG(delay_minutes) as driver_delay_avg_30d,
        COUNT(*) as driver_total_suggestions_30d,
        SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) as driver_total_accepts_30d
    FROM vw_suggestion_base_features
    WHERE generated_at >= DATEADD(day, -30, '{snapshot_date}')
      AND generated_at < '{snapshot_date}'
    GROUP BY driver_id
    """
    
    # Lane features (90d)
    lane_sql = f"""
    INSERT INTO historical_features (
        customer_id, driver_id, tour_id, lane_id, snapshot_date,
        lane_realized_margin_avg_90d, lane_acceptance_rate_30d
    )
    SELECT 
        'ALL' as customer_id,
        'ALL' as driver_id,
        'ALL' as tour_id,
        lane_id,
        '{snapshot_date}' as snapshot_date,
        AVG(realized_margin) as lane_realized_margin_avg_90d,
        SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) * 1.0 / 
            NULLIF(COUNT(*), 0) as lane_acceptance_rate_30d
    FROM vw_suggestion_base_features
    WHERE generated_at >= DATEADD(day, -90, '{snapshot_date}')
      AND generated_at < '{snapshot_date}'
    GROUP BY lane_id
    """
    
    try:
        cursor.execute(customer_sql)
        cursor.execute(driver_sql)
        cursor.execute(lane_sql)
        conn.commit()
        
        rows_inserted = cursor.rowcount
        logging.info(f"Built historical features for {snapshot_date}: {rows_inserted} rows")
        
        return {
            'snapshot_date': snapshot_date,
            'rows_inserted': rows_inserted,
            'status': 'success'
        }
        
    except Exception as e:
        logging.error(f"Failed to build historical features: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def build_training_dataset(**context) -> Dict[str, int]:
    """
    Materialize vw_ml_training_dataset into ml_training_dataset table.
    
    This creates a snapshot of the training data for fast model training.
    """
    import snowflake.connector
    from datetime import datetime, timedelta
    
    execution_date = context['execution_date']
    snapshot_date = (execution_date - timedelta(days=1)).strftime('%Y-%m-%d')
    
    conn = snowflake.connector.connect(
        user=Variable.get('snowflake_user'),
        password=Variable.get('snowflake_password'),
        account=Variable.get('snowflake_account'),
        warehouse='ML_WH',
        database='CARGOBIT_ML',
        schema='TRAINING',
    )
    
    cursor = conn.cursor()
    
    # Materialize view into table
    sql = f"""
    INSERT INTO ml_training_dataset
    SELECT 
        *,
        '{snapshot_date}' as snapshot_date
    FROM vw_ml_training_labeled
    WHERE generated_at >= DATEADD(day, -90, CURRENT_DATE())
      AND generated_at < CURRENT_DATE()
    """
    
    try:
        cursor.execute(sql)
        conn.commit()
        
        count_sql = "SELECT COUNT(*) FROM ml_training_dataset WHERE snapshot_date = %s"
        cursor.execute(count_sql, (snapshot_date,))
        rows = cursor.fetchone()[0]
        
        logging.info(f"Built training dataset for {snapshot_date}: {rows} rows")
        
        return {
            'snapshot_date': snapshot_date,
            'training_rows': rows,
        }
        
    except Exception as e:
        logging.error(f"Failed to build training dataset: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def train_model(**context) -> Dict[str, Any]:
    """
    Train ML model using LightGBM/XGBoost.
    
    Steps:
    1. Load training data
    2. Split train/validation
    3. Train model
    4. Compute metrics
    5. Log to MLflow
    6. Register model
    """
    import pandas as pd
    import numpy as np
    import lightgbm as lgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import roc_auc_score, ndcg_score, precision_score, recall_score
    import mlflow
    import mlflow.lightgbm
    import uuid
    from datetime import datetime
    
    execution_date = context['execution_date']
    model_version = f"v{execution_date.strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"
    
    # Initialize MLflow
    mlflow.set_tracking_uri(Variable.get('mlflow_tracking_uri', 'http://mlflow:5000'))
    mlflow.set_experiment('suggestion-scoring')
    
    # Feature columns
    FEATURE_COLUMNS = [
        'revenue_score', 'capacity_utilization_score', 'priority_score',
        'risk_score', 'service_level_score', 'co2_score',
        'distance_pickup_to_route_km', 'eta_to_pickup_minutes',
        'free_volume_m3', 'tour_progress_pct',
        'customer_acceptance_rate_30d', 'driver_acceptance_rate_30d',
        'lane_realized_margin_avg_90d', 'combined_acceptance_rate',
        'risk_adjusted_revenue', 'time_pressure_score',
    ]
    
    # Load data (simplified - in production use Snowflake connector)
    # df = pd.read_sql("SELECT * FROM ml_training_dataset WHERE snapshot_date = ...", conn)
    
    # Mock data for demonstration
    np.random.seed(42)
    n_samples = 50000
    df = pd.DataFrame({
        **{col: np.random.random(n_samples) for col in FEATURE_COLUMNS},
        'label_accepted': np.random.randint(0, 2, n_samples),
    })
    
    # Split data
    X = df[FEATURE_COLUMNS]
    y = df['label_accepted']
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Check minimum samples
    if len(X_train) < MIN_TRAINING_SAMPLES:
        raise ValueError(f"Insufficient training samples: {len(X_train)} < {MIN_TRAINING_SAMPLES}")
    
    # Model parameters
    params = {
        'objective': 'binary',
        'metric': ['auc', 'binary_logloss'],
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'max_depth': 6,
        'learning_rate': 0.05,
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'n_jobs': -1,
    }
    
    # Train model
    train_data = lgb.Dataset(X_train, label=y_train)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)
    
    with mlflow.start_run(run_name=model_version):
        # Log parameters
        mlflow.log_params(params)
        mlflow.log_param('train_samples', len(X_train))
        mlflow.log_param('val_samples', len(X_val))
        mlflow.log_param('feature_count', len(FEATURE_COLUMNS))
        
        # Train
        model = lgb.train(
            params,
            train_data,
            num_boost_round=500,
            valid_sets=[train_data, val_data],
            valid_names=['train', 'valid'],
            callbacks=[
                lgb.early_stopping(stopping_rounds=50),
                lgb.log_evaluation(period=50),
            ]
        )
        
        # Predictions
        y_pred = model.predict(X_val)
        
        # Metrics
        auc = roc_auc_score(y_val, y_pred)
        precision = precision_score(y_val, (y_pred > 0.5).astype(int))
        recall = recall_score(y_val, (y_pred > 0.5).astype(int))
        
        # NDCG@10 (approximate)
        ndcg = ndcg_score(y_val.values.reshape(1, -1), y_pred.reshape(1, -1), k=10)
        
        # Log metrics
        mlflow.log_metric('auc', auc)
        mlflow.log_metric('ndcg_10', ndcg)
        mlflow.log_metric('precision', precision)
        mlflow.log_metric('recall', recall)
        mlflow.log_metric('best_iteration', model.best_iteration)
        
        # Log model
        mlflow.lightgbm.log_model(model, 'model')
        
        # Log feature importance
        importance = pd.DataFrame({
            'feature': FEATURE_COLUMNS,
            'importance': model.feature_importance(importance_type='gain'),
        }).sort_values('importance', ascending=False)
        
        for _, row in importance.iterrows():
            mlflow.log_metric(f"feature_importance_{row['feature']}", row['importance'])
    
    logging.info(f"Model trained: {model_version}")
    logging.info(f"AUC: {auc:.4f}, NDCG@10: {ndcg:.4f}")
    
    return {
        'model_version': model_version,
        'auc': float(auc),
        'ndcg_10': float(ndcg),
        'precision': float(precision),
        'recall': float(recall),
        'train_samples': len(X_train),
        'best_iteration': model.best_iteration,
    }


def promote_model_if_good(**context) -> Dict[str, Any]:
    """
    Promote model to ACTIVE if metrics pass thresholds.
    
    Checks:
    - AUC >= threshold
    - NDCG >= threshold
    - No critical issues
    """
    import snowflake.connector
    
    # Get training results from XCom
    ti = context['ti']
    training_result = ti.xcom_pull(task_ids='train_model')
    
    model_version = training_result['model_version']
    auc = training_result['auc']
    ndcg = training_result['ndcg_10']
    
    # Check thresholds
    auc_pass = auc >= MODEL_AUC_THRESHOLD
    ndcg_pass = ndcg >= MODEL_NDCG_THRESHOLD
    
    conn = snowflake.connector.connect(
        user=Variable.get('snowflake_user'),
        password=Variable.get('snowflake_password'),
        account=Variable.get('snowflake_account'),
        warehouse='ML_WH',
        database='CARGOBIT_ML',
        schema='MODELS',
    )
    
    cursor = conn.cursor()
    
    try:
        # Insert model into registry
        insert_sql = """
        INSERT INTO ml_model_registry (
            model_version, created_at, created_by, algorithm,
            metric_auc, metric_ndcg_10, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        # Determine status
        if auc_pass and ndcg_pass:
            # Deactivate old models
            cursor.execute(
                "UPDATE ml_model_registry SET status = 'DEPRECATED' WHERE status = 'ACTIVE'"
            )
            
            # Promote new model
            cursor.execute(insert_sql, (
                model_version,
                datetime.utcnow(),
                'airflow-pipeline',
                'LIGHTGBM',
                auc,
                ndcg,
                'ACTIVE',
            ))
            status = 'ACTIVE'
        else:
            cursor.execute(insert_sql, (
                model_version,
                datetime.utcnow(),
                'airflow-pipeline',
                'LIGHTGBM',
                auc,
                ndcg,
                'CANDIDATE',
            ))
            status = 'CANDIDATE'
        
        conn.commit()
        
        logging.info(f"Model {model_version} status: {status}")
        logging.info(f"AUC: {auc:.4f} ({'PASS' if auc_pass else 'FAIL'}), "
                    f"NDCG: {ndcg:.4f} ({'PASS' if ndcg_pass else 'FAIL'})")
        
        return {
            'model_version': model_version,
            'status': status,
            'auc': auc,
            'ndcg': ndcg,
            'auc_threshold': MODEL_AUC_THRESHOLD,
            'ndcg_threshold': MODEL_NDCG_THRESHOLD,
            'promoted': status == 'ACTIVE',
        }
        
    except Exception as e:
        logging.error(f"Failed to promote model: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def check_data_quality(**context) -> Dict[str, Any]:
    """
    Check data quality before training.
    
    Checks:
    - Row counts
    - Null rates
    - Data freshness
    - Label distribution
    """
    import snowflake.connector
    
    execution_date = context['execution_date']
    check_date = (execution_date - timedelta(days=1)).strftime('%Y-%m-%d')
    
    conn = snowflake.connector.connect(
        user=Variable.get('snowflake_user'),
        password=Variable.get('snowflake_password'),
        account=Variable.get('snowflake_account'),
        warehouse='ML_WH',
        database='CARGOBIT_ML',
        schema='QUALITY',
    )
    
    cursor = conn.cursor()
    
    checks = []
    
    # Check 1: Row count
    cursor.execute("""
        SELECT COUNT(*) FROM suggestion_generated 
        WHERE DATE(generated_at) = %s
    """, (check_date,))
    row_count = cursor.fetchone()[0]
    checks.append(('row_count', row_count, row_count > 0))
    
    # Check 2: Label distribution
    cursor.execute("""
        SELECT 
            SUM(CASE WHEN decision = 'ACCEPT' THEN 1 ELSE 0 END) as accepts,
            SUM(CASE WHEN decision = 'REJECT' THEN 1 ELSE 0 END) as rejects,
            COUNT(*) as total
        FROM suggestion_outcome
        WHERE DATE(decision_at) = %s
    """, (check_date,))
    result = cursor.fetchone()
    accept_rate = result[0] / result[2] if result[2] > 0 else 0
    checks.append(('accept_rate', accept_rate, 0.1 < accept_rate < 0.9))
    
    # Check 3: Data freshness
    cursor.execute("""
        SELECT DATEDIFF(hour, MAX(generated_at), CURRENT_TIMESTAMP()) 
        FROM suggestion_generated
    """)
    freshness_hours = cursor.fetchone()[0]
    checks.append(('freshness_hours', freshness_hours, freshness_hours < 48))
    
    # Log results
    all_passed = all(c[2] for c in checks)
    
    for check_name, value, passed in checks:
        status = 'PASS' if passed else 'FAIL'
        logging.info(f"Quality check {check_name}: {value} ({status})")
    
    cursor.close()
    conn.close()
    
    if not all_passed:
        raise ValueError(f"Data quality checks failed: {checks}")
    
    return {
        'check_date': check_date,
        'checks': {c[0]: {'value': c[1], 'passed': c[2]} for c in checks},
        'all_passed': all_passed,
    }


# =============================================================================
# TASK DEFINITIONS
# =============================================================================

# Start task
start = EmptyOperator(task_id='start', dag=dag)

# Data quality check
check_quality = PythonOperator(
    task_id='check_data_quality',
    python_callable=check_data_quality,
    dag=dag,
)

# Ingest events from Kafka
ingest_events = PythonOperator(
    task_id='ingest_events_from_kafka',
    python_callable=ingest_events_from_kafka,
    dag=dag,
)

# Build historical features
build_features = PythonOperator(
    task_id='build_historical_features',
    python_callable=build_historical_features,
    dag=dag,
)

# Build training dataset
build_dataset = PythonOperator(
    task_id='build_training_dataset',
    python_callable=build_training_dataset,
    dag=dag,
)

# Train model (can be Databricks or local)
train_model_task = PythonOperator(
    task_id='train_model',
    python_callable=train_model,
    execution_timeout=timedelta(hours=1),
    dag=dag,
)

# Promote model
promote_model = PythonOperator(
    task_id='promote_model_if_good',
    python_callable=promote_model_if_good,
    dag=dag,
)

# Slack notification on success
notify_success = SlackWebhookOperator(
    task_id='notify_success',
    slack_webhook_conn_id=SLACK_WEBHOOK_CONN_ID,
    message="""
✅ *ML Pipeline Completed*
*Model:* {{ ti.xcom_pull(task_ids='train_model')['model_version'] }}
*AUC:* {{ ti.xcom_pull(task_ids='train_model')['auc'] | round(4) }}
*NDCG@10:* {{ ti.xcom_pull(task_ids='train_model')['ndcg_10'] | round(4) }}
*Status:* {{ ti.xcom_pull(task_ids='promote_model_if_good')['status'] }}
*Training Samples:* {{ ti.xcom_pull(task_ids='train_model')['train_samples'] }}
""",
    dag=dag,
)

# End task
end = EmptyOperator(task_id='end', dag=dag)

# =============================================================================
# TASK DEPENDENCIES
# =============================================================================

start >> check_quality >> ingest_events >> build_features >> build_dataset >> train_model_task >> promote_model >> notify_success >> end
