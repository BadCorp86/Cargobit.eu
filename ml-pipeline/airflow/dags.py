"""
CargoBit ML Pipeline Airflow DAGs
=================================

Production ML Pipeline orchestration with Airflow.

Schedules (UTC):
- ETL: Daily at 01:00
- Feature Computation: Daily at 02:00
- Model Training: Daily at 03:00
- Model Evaluation: Daily at 04:00
- Canary Promotion: Daily at 05:00

Dependencies:
ETL → Features → Training → Evaluation → Promotion

Author: CargoBit ML Team
Version: 2.0.0
"""

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.amazon.aws.operators.emr import EmrAddStepsOperator
from airflow.providers.amazon.aws.sensors.emr import EmrStepSensor
from airflow.models import Variable
from airflow.utils.task_group import TaskGroup

# Default arguments
default_args = {
    "owner": "ml-team",
    "depends_on_past": False,
    "start_date": datetime(2025, 4, 1),
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "email": ["ml-team@cargobit.io"],
    "email_on_failure": True,
    "email_on_retry": False,
}

# Configuration from Airflow Variables
EMR_CLUSTER_ID = Variable.get("emr_cluster_id", default_var="j-XXXXXXXX")
MLFLOW_URI = Variable.get("mlflow_uri", default_var="http://mlflow.cargobit.io:5000")
S3_BUCKET = Variable.get("s3_bucket", default_var="cargobit-datalake")
ARTIFACTS_BUCKET = Variable.get("artifacts_bucket", default_var="cargobit-artifacts")


# =============================================================================
# MASTER DAG - Coordinated Pipeline
# =============================================================================

master_dag = DAG(
    "ml_pipeline_master",
    default_args=default_args,
    schedule_interval="0 1 * * *",  # Daily at 01:00 UTC
    catchup=False,
    max_active_runs=1,
    tags=["ml", "master", "pipeline"],
    description="Master DAG that orchestrates the complete ML pipeline",
)


# =============================================================================
# ETL TASKS
# =============================================================================

with TaskGroup("etl_group", dag=master_dag) as etl_group:
    
    run_etl = EmrAddStepsOperator(
        task_id="run_etl",
        job_flow_id=EMR_CLUSTER_ID,
        steps=[
            {
                "Name": "SuggestionETL",
                "ActionOnFailure": "CONTINUE",
                "HadoopJarStep": {
                    "Jar": "command-runner.jar",
                    "Args": [
                        "spark-submit",
                        "--deploy-mode", "cluster",
                        "--py-files", f"s3://{ARTIFACTS_BUCKET}/ml-pipeline/deps.zip",
                        f"s3://{ARTIFACTS_BUCKET}/ml-pipeline/etl/suggestion_etl.py",
                        "--date", "{{ ds }}",
                        "--lookback-days", "90",
                        "--s3-bucket", S3_BUCKET,
                    ],
                },
            }
        ],
    )
    
    wait_for_etl = EmrStepSensor(
        task_id="wait_for_etl",
        job_flow_id=EMR_CLUSTER_ID,
        step_id="{{ task_instance.xcom_pull(task_ids='etl_group.run_etl', key='return_value')[0] }}",
    )
    
    run_etl >> wait_for_etl


# =============================================================================
# FEATURE COMPUTATION TASKS
# =============================================================================

with TaskGroup("feature_group", dag=master_dag) as feature_group:
    
    compute_features = EmrAddStepsOperator(
        task_id="compute_features",
        job_flow_id=EMR_CLUSTER_ID,
        steps=[
            {
                "Name": "FeatureComputation",
                "ActionOnFailure": "CONTINUE",
                "HadoopJarStep": {
                    "Jar": "command-runner.jar",
                    "Args": [
                        "spark-submit",
                        "--deploy-mode", "cluster",
                        f"s3://{ARTIFACTS_BUCKET}/ml-pipeline/feature_store/compute_features.py",
                        "--date", "{{ ds }}",
                        "--s3-bucket", S3_BUCKET,
                    ],
                },
            }
        ],
    )
    
    wait_for_features = EmrStepSensor(
        task_id="wait_for_features",
        job_flow_id=EMR_CLUSTER_ID,
        step_id="{{ task_instance.xcom_pull(task_ids='feature_group.compute_features', key='return_value')[0] }}",
    )
    
    def materialize_features(**context):
        """Materializes features to Feast online store."""
        from feast import FeatureStore
        from datetime import datetime as dt
        
        store = FeatureStore(repo_path="/app/feature_store")
        end_date = dt.strptime(context["ds"], "%Y-%m-%d")
        
        store.materialize_incremental(end_date=end_date)
        
        return "Features materialized"
    
    materialize = PythonOperator(
        task_id="materialize_features",
        python_callable=materialize_features,
    )
    
    compute_features >> wait_for_features >> materialize


# =============================================================================
# TRAINING TASKS
# =============================================================================

with TaskGroup("training_group", dag=master_dag) as training_group:
    
    def run_training(**context):
        """Runs model training with SHAP explainability."""
        import sys
        import subprocess
        
        # Run training script
        result = subprocess.run([
            "python", "/app/ml-pipeline/training/train_ltr.py",
            "--start-date", context["start_date"],
            "--end-date", context["ds"],
            "--mlflow-uri", MLFLOW_URI,
            "--data-path", f"s3://{S3_BUCKET}/training_datasets/suggestions/",
            "--min-ndcg", "0.65",
            "--compute-shap",
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            raise RuntimeError(f"Training failed: {result.stderr}")
        
        return result.stdout
    
    train_model = PythonOperator(
        task_id="train_model",
        python_callable=run_training,
        op_kwargs={
            "start_date": "{{ (ds | as_datetime - macros.timedelta(days=90)).strftime('%Y-%m-%d') }}"
        },
    )
    
    def validate_model(**context):
        """Validates model before promotion."""
        from mlflow.tracking import MlflowClient
        
        client = MlflowClient()
        
        # Get latest staging model
        staging = client.get_latest_versions("suggestion_ltr_model", stages=["Staging"])
        
        if not staging:
            return {"status": "no_staging_model", "promote": False}
        
        # Get metrics
        run = client.get_run(staging[0].run_id)
        ndcg = run.data.metrics.get("final_ndcg@10", 0)
        
        # Validate thresholds
        if ndcg >= 0.65:
            return {"status": "validation_passed", "promote": True, "ndcg": ndcg}
        else:
            return {"status": "validation_failed", "promote": False, "ndcg": ndcg}
    
    validate = PythonOperator(
        task_id="validate_model",
        python_callable=validate_model,
    )
    
    train_model >> validate


# =============================================================================
# EVALUATION TASKS
# =============================================================================

with TaskGroup("eval_group", dag=master_dag) as eval_group:
    
    def run_evaluation(**context):
        """Evaluates model performance in production."""
        import pandas as pd
        import mlflow
        
        # Load recent outcomes
        df = pd.read_parquet(
            f"s3://{S3_BUCKET}/events/suggestion.outcome/",
            filters=[("date", ">=", context["ds"])]
        )
        
        # Compute metrics
        metrics = {
            "total_suggestions": len(df),
            "acceptance_rate": df["decision"].eq("ACCEPT").mean() if len(df) > 0 else 0,
            "execution_rate": df["executed"].mean() if len(df) > 0 else 0,
            "avg_margin": df["realizedMargin"].mean() if len(df) > 0 else 0,
            "avg_delay": df["delayMinutes"].mean() if len(df) > 0 else 0,
        }
        
        # Log metrics to MLflow
        mlflow.set_tracking_uri(MLFLOW_URI)
        with mlflow.start_run(run_name=f"eval_{context['ds']}"):
            mlflow.log_metrics(metrics)
        
        # Check for degradation
        alerts = []
        if metrics["acceptance_rate"] < 0.15:
            alerts.append("Low acceptance rate")
        if metrics["avg_delay"] > 15:
            alerts.append("High average delay")
        
        return {
            "metrics": metrics,
            "alerts": alerts,
        }
    
    evaluate = PythonOperator(
        task_id="evaluate_model",
        python_callable=run_evaluation,
    )
    
    def check_model_drift(**context):
        """Checks for model drift."""
        from mlflow.tracking import MlflowClient
        
        client = MlflowClient()
        
        # Compare recent performance with training metrics
        # This is a simplified version - production would use more sophisticated drift detection
        
        prod_versions = client.get_latest_versions("suggestion_ltr_model", stages=["Production"])
        
        if not prod_versions:
            return {"drift_detected": False, "reason": "no_production_model"}
        
        # Get production metrics
        prod_run = client.get_run(prod_versions[0].run_id)
        prod_ndcg = prod_run.data.metrics.get("final_ndcg@10", 0)
        
        # Check for drift (simplified: just check if still above threshold)
        drift_detected = prod_ndcg < 0.60
        
        return {
            "drift_detected": drift_detected,
            "production_ndcg": prod_ndcg,
        }
    
    check_drift = PythonOperator(
        task_id="check_model_drift",
        python_callable=check_model_drift,
    )
    
    evaluate >> check_drift


# =============================================================================
# PROMOTION TASKS
# =============================================================================

with TaskGroup("promotion_group", dag=master_dag) as promotion_group:
    
    def promote_model(**context):
        """Promotes model to production if validation passed."""
        from mlflow.tracking import MlflowClient
        
        client = MlflowClient()
        
        # Get validation result
        ti = context["task_instance"]
        validation_result = ti.xcom_pull(task_ids="training_group.validate_model")
        
        if not validation_result.get("promote", False):
            return {"action": "no_promotion", "reason": validation_result.get("status")}
        
        # Get staging model
        staging = client.get_latest_versions("suggestion_ltr_model", stages=["Staging"])
        
        if not staging:
            return {"action": "no_promotion", "reason": "no_staging_model"}
        
        # Archive old production model
        prod_versions = client.get_latest_versions("suggestion_ltr_model", stages=["Production"])
        
        if prod_versions:
            client.transition_model_version_stage(
                name="suggestion_ltr_model",
                version=prod_versions[0].version,
                stage="Archived"
            )
        
        # Promote new model
        client.transition_model_version_stage(
            name="suggestion_ltr_model",
            version=staging[0].version,
            stage="Production"
        )
        
        return {
            "action": "promoted",
            "version": staging[0].version,
            "ndcg": validation_result.get("ndcg"),
        }
    
    promote = PythonOperator(
        task_id="promote_model",
        python_callable=promote_model,
    )
    
    def reload_serving(**context):
        """Triggers model reload in serving service."""
        import requests
        
        try:
            response = requests.post(
                "http://ml-scoring-service:8080/reload",
                timeout=30
            )
            return {"status": "reloaded", "response": response.json()}
        except Exception as e:
            return {"status": "failed", "error": str(e)}
    
    reload = PythonOperator(
        task_id="reload_serving",
        python_callable=reload_serving,
    )
    
    promote >> reload


# =============================================================================
# DAG DEPENDENCIES
# =============================================================================

# Start
start = EmptyOperator(task_id="start", dag=master_dag)

# End
end = EmptyOperator(task_id="end", dag=master_dag)

# Pipeline flow
start >> etl_group >> feature_group >> training_group >> eval_group >> promotion_group >> end


# =============================================================================
# STANDALONE ETL DAG (for backfills)
# =============================================================================

etl_dag = DAG(
    "suggestion_etl_standalone",
    default_args=default_args,
    schedule_interval=None,  # Manual trigger only
    catchup=False,
    tags=["ml", "etl", "backfill"],
)

etl_step = EmrAddStepsOperator(
    task_id="run_etl",
    job_flow_id=EMR_CLUSTER_ID,
    steps=[
        {
            "Name": "SuggestionETL",
            "ActionOnFailure": "CONTINUE",
            "HadoopJarStep": {
                "Jar": "command-runner.jar",
                "Args": [
                    "spark-submit",
                    "--deploy-mode", "cluster",
                    f"s3://{ARTIFACTS_BUCKET}/ml-pipeline/etl/suggestion_etl.py",
                    "--date", "{{ ds }}",
                    "--lookback-days", "90",
                ],
            },
        }
    ],
    dag=etl_dag,
)

etl_sensor = EmrStepSensor(
    task_id="wait_for_etl",
    job_flow_id=EMR_CLUSTER_ID,
    step_id="{{ task_instance.xcom_pull(task_ids='run_etl', key='return_value')[0] }}",
    dag=etl_dag,
)

etl_step >> etl_sensor


# =============================================================================
# STANDALONE TRAINING DAG (for manual training)
# =============================================================================

training_dag = DAG(
    "suggestion_training_standalone",
    default_args=default_args,
    schedule_interval=None,  # Manual trigger only
    catchup=False,
    tags=["ml", "training", "manual"],
)


def run_standalone_training(**context):
    """Runs training with configurable parameters."""
    import subprocess
    
    start_date = context["dag_run"].conf.get("start_date", "2025-01-01")
    end_date = context["dag_run"].conf.get("end_date", context["ds"])
    min_ndcg = context["dag_run"].conf.get("min_ndcg", 0.65)
    
    result = subprocess.run([
        "python", "/app/ml-pipeline/training/train_ltr.py",
        "--start-date", start_date,
        "--end-date", end_date,
        "--mlflow-uri", MLFLOW_URI,
        "--min-ndcg", str(min_ndcg),
        "--compute-shap",
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        raise RuntimeError(f"Training failed: {result.stderr}")
    
    return result.stdout


train_task = PythonOperator(
    task_id="train_model",
    python_callable=run_standalone_training,
    provide_context=True,
    dag=training_dag,
)
