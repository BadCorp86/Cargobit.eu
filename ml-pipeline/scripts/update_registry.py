#!/usr/bin/env python3
"""
Update Model Registry - Standalone Script
==========================================

Usage:
    python update_registry.py \
        --version 20240115_120000 \
        --metrics '{"cv_auc_mean": 0.78}' \
        --model-path s3://ml-models/models/20240115_120000 \
        --status CANDIDATE
"""

import argparse
import json
import os
import sys
from datetime import datetime

import psycopg2
from psycopg2.extras import Json


def main():
    parser = argparse.ArgumentParser(description="Update ML Model Registry")
    parser.add_argument('--version', default=None, help='Model version (auto-generated if not provided)')
    parser.add_argument('--metrics', required=True, help='JSON metrics or path to metrics file')
    parser.add_argument('--model-path', help='S3 path to model')
    parser.add_argument('--status', default='CANDIDATE', choices=['CANDIDATE', 'ACTIVE', 'ROLLED_BACK', 'DEPRECATED'])
    parser.add_argument('--db', env_var='DB_CONNECTION', help='Database connection string')
    
    args = parser.parse_args()
    
    # Get DB connection
    db_conn = args.db or os.environ.get('DB_CONNECTION')
    if not db_conn:
        print("Error: DB_CONNECTION not set")
        sys.exit(1)
    
    # Parse metrics
    if os.path.exists(args.metrics):
        with open(args.metrics) as f:
            metrics = json.load(f)
    else:
        metrics = json.loads(args.metrics)
    
    # Generate version if needed
    version = args.version or datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Model paths
    model_path = args.model_path or f's3://ml-models/models/{version}'
    explainer_path = f'{model_path}/explainer.pkl'
    model_file = f'{model_path}/model.txt'
    
    # Connect and insert
    conn = psycopg2.connect(db_conn)
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ml_model_registry 
                (version, model_type, model_path, explainer_path, metrics, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (version) DO UPDATE SET
                    metrics = EXCLUDED.metrics,
                    model_path = EXCLUDED.model_path,
                    status = EXCLUDED.status,
                    updated_at = NOW()
            """, (
                version,
                metrics.get('model_type', 'lightgbm'),
                model_file,
                explainer_path,
                Json(metrics),
                args.status
            ))
            
            conn.commit()
            print(f"✅ Registered model {version} with status {args.status}")
            print(version)  # Output for scripts
            
    finally:
        conn.close()


if __name__ == "__main__":
    main()
