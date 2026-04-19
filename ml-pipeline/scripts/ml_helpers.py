"""
CargoBit ML Pipeline - Helper Scripts
=====================================

Scripts for:
- update_registry.py: Register model in PostgreSQL
- evaluate_canary.py: Evaluate canary metrics
- promote_model.py: Promote candidate to active
- rollback_model.py: Rollback canary model
- cleanup_models.py: Cleanup old models
- set_canary_version.py: Update Kubernetes ConfigMap
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, Optional

import psycopg2
from psycopg2.extras import Json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# UPDATE REGISTRY
# =============================================================================

def update_registry(args):
    """Register a new model version in the registry"""
    
    conn = psycopg2.connect(os.environ.get('DB_CONNECTION', args.db_connection))
    
    try:
        with conn.cursor() as cur:
            # Parse metrics
            metrics = json.loads(args.metrics) if isinstance(args.metrics, str) else args.metrics
            
            # Generate version if auto
            version = args.version
            if version == 'auto' or not version:
                version = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            # Insert or update model
            cur.execute("""
                INSERT INTO ml_model_registry 
                (version, model_type, model_path, explainer_path, metrics, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (version) DO UPDATE SET
                    metrics = EXCLUDED.metrics,
                    status = EXCLUDED.status,
                    updated_at = NOW()
            """, (
                version,
                metrics.get('model_type', 'lightgbm'),
                args.model_path or f's3://ml-models/models/{version}/model.txt',
                f's3://ml-models/models/{version}/explainer.pkl',
                Json(metrics),
                args.status
            ))
            
            conn.commit()
            logger.info(f"Registered model version {version} with status {args.status}")
            
            # Output version for GitHub Actions
            if args.output_version:
                with open(args.output_version, 'w') as f:
                    f.write(version)
            
            return version
            
    finally:
        conn.close()


# =============================================================================
# EVALUATE CANARY
# =============================================================================

def evaluate_canary(args):
    """Evaluate canary model metrics for promotion decision"""
    
    conn = psycopg2.connect(os.environ.get('DB_CONNECTION', args.db_connection))
    
    try:
        with conn.cursor() as cur:
            # Get candidate version
            cur.execute("""
                SELECT version, metrics 
                FROM ml_model_registry 
                WHERE status = 'CANDIDATE'
                ORDER BY created_at DESC LIMIT 1
            """)
            candidate = cur.fetchone()
            
            # Get active version
            cur.execute("""
                SELECT version, metrics 
                FROM ml_model_registry 
                WHERE status = 'ACTIVE'
                ORDER BY created_at DESC LIMIT 1
            """)
            active = cur.fetchone()
            
            if not candidate:
                result = {
                    'should_promote': False,
                    'reason': 'No candidate model found',
                    'candidate_version': None,
                    'active_version': active[0] if active else None
                }
            elif not active:
                result = {
                    'should_promote': True,
                    'reason': 'No active model - auto-promote',
                    'candidate_version': candidate[0],
                    'active_version': None
                }
            else:
                # Compare metrics
                candidate_metrics = candidate[1] or {}
                active_metrics = active[1] or {}
                
                candidate_auc = float(candidate_metrics.get('cv_auc_mean', 0))
                active_auc = float(active_metrics.get('cv_auc_mean', 0))
                
                # Promotion criteria
                min_improvement = 0.02  # 2% improvement required
                auc_improvement = candidate_auc - active_auc
                
                should_promote = auc_improvement >= min_improvement
                
                result = {
                    'should_promote': should_promote,
                    'reason': f'AUC improvement: {auc_improvement:.4f} (threshold: {min_improvement})',
                    'candidate_version': candidate[0],
                    'active_version': active[0],
                    'metrics': {
                        'candidate_auc': candidate_auc,
                        'active_auc': active_auc,
                        'improvement': auc_improvement
                    }
                }
            
            # Write output
            with open(args.output, 'w') as f:
                json.dump(result, f, indent=2)
            
            if args.metrics:
                with open(args.metrics, 'w') as f:
                    json.dump(result.get('metrics', {}), f, indent=2)
            
            logger.info(f"Evaluation result: {result}")
            return result
            
    finally:
        conn.close()


# =============================================================================
# PROMOTE MODEL
# =============================================================================

def promote_model(args):
    """Promote a model version to ACTIVE status"""
    
    conn = psycopg2.connect(os.environ.get('DB_CONNECTION', args.db_connection))
    
    try:
        with conn.cursor() as cur:
            # Get version if not specified
            version = args.version
            if not version:
                cur.execute("""
                    SELECT version FROM ml_model_registry 
                    WHERE status = 'CANDIDATE'
                    ORDER BY created_at DESC LIMIT 1
                """)
                result = cur.fetchone()
                version = result[0] if result else None
            
            if not version:
                logger.error("No candidate model to promote")
                return False
            
            # Set current ACTIVE to ROLLED_BACK
            cur.execute("""
                UPDATE ml_model_registry 
                SET status = 'ROLLED_BACK', updated_at = NOW()
                WHERE status = 'ACTIVE'
            """)
            
            # Promote specified version
            cur.execute("""
                UPDATE ml_model_registry 
                SET status = 'ACTIVE', updated_at = NOW()
                WHERE version = %s AND status = %s
            """, (version, args.from_status))
            
            if cur.rowcount == 0:
                logger.error(f"Model {version} not found with status {args.from_status}")
                conn.rollback()
                return False
            
            conn.commit()
            logger.info(f"Promoted model {version} to ACTIVE")
            return True
            
    finally:
        conn.close()


# =============================================================================
# ROLLBACK MODEL
# =============================================================================

def rollback_model(args):
    """Rollback a canary model to ROLLED_BACK status"""
    
    conn = psycopg2.connect(os.environ.get('DB_CONNECTION', args.db_connection))
    
    try:
        with conn.cursor() as cur:
            # Get canary version
            version = args.version
            if not version:
                cur.execute("""
                    SELECT version FROM ml_model_registry 
                    WHERE status = 'CANDIDATE'
                    ORDER BY created_at DESC LIMIT 1
                """)
                result = cur.fetchone()
                version = result[0] if result else None
            
            if not version:
                logger.warning("No canary model to rollback")
                return True
            
            # Set canary to ROLLED_BACK
            cur.execute("""
                UPDATE ml_model_registry 
                SET status = 'ROLLED_BACK', updated_at = NOW()
                WHERE version = %s
            """, (version,))
            
            # Log rollback reason
            if args.reason:
                cur.execute("""
                    INSERT INTO ml_model_events (version, event_type, details, created_at)
                    VALUES (%s, 'ROLLBACK', %s, NOW())
                """, (version, json.dumps({'reason': args.reason})))
            
            conn.commit()
            logger.info(f"Rolled back model {version}")
            return True
            
    finally:
        conn.close()


# =============================================================================
# CLEANUP MODELS
# =============================================================================

def cleanup_models(args):
    """Cleanup old model versions"""
    
    conn = psycopg2.connect(os.environ.get('DB_CONNECTION', args.db_connection))
    
    try:
        with conn.cursor() as cur:
            statuses = args.status if isinstance(args.status, list) else [args.status]
            keep = args.keep
            
            for status in statuses:
                # Delete old models, keeping only the most recent N
                cur.execute("""
                    DELETE FROM ml_model_registry
                    WHERE id IN (
                        SELECT id FROM ml_model_registry
                        WHERE status = %s
                        ORDER BY created_at DESC
                        OFFSET %s
                    )
                """, (status, keep))
                
                deleted = cur.rowcount
                if deleted > 0:
                    logger.info(f"Deleted {deleted} old models with status {status}")
            
            conn.commit()
            
    finally:
        conn.close()


# =============================================================================
# SET CANARY VERSION (Kubernetes)
# =============================================================================

def set_canary_version(args):
    """Update Kubernetes ConfigMap with canary version"""
    
    try:
        import subprocess
        
        share = args.share if args.share else 0
        
        cmd = [
            'kubectl', 'patch', 'configmap', 'ml-inference-config',
            '--namespace', 'ml-serving',
            '--type', 'merge',
            '-p', json.dumps({
                'data': {
                    'canary_version': args.version or '',
                    'canary_share': str(share)
                }
            })
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Failed to update ConfigMap: {result.stderr}")
            return False
        
        logger.info(f"Set canary version to {args.version} with share {share}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to set canary version: {e}")
        return False


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ML Pipeline Helper Scripts")
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Update registry
    reg_parser = subparsers.add_parser('update-registry', help='Update model registry')
    reg_parser.add_argument('--version', default='auto')
    reg_parser.add_argument('--metrics', required=True)
    reg_parser.add_argument('--model-path')
    reg_parser.add_argument('--status', default='CANDIDATE')
    reg_parser.add_argument('--db-connection')
    reg_parser.add_argument('--output-version')
    
    # Evaluate canary
    eval_parser = subparsers.add_parser('evaluate-canary', help='Evaluate canary metrics')
    eval_parser.add_argument('--output', default='evaluation.json')
    eval_parser.add_argument('--metrics', default='metrics.json')
    eval_parser.add_argument('--db-connection')
    
    # Promote model
    prom_parser = subparsers.add_parser('promote-model', help='Promote model to active')
    prom_parser.add_argument('--version')
    prom_parser.add_argument('--from-status', default='CANDIDATE')
    prom_parser.add_argument('--to-status', default='ACTIVE')
    prom_parser.add_argument('--db-connection')
    
    # Rollback model
    roll_parser = subparsers.add_parser('rollback-model', help='Rollback canary model')
    roll_parser.add_argument('--version')
    roll_parser.add_argument('--reason', default='Manual rollback')
    roll_parser.add_argument('--db-connection')
    
    # Cleanup models
    clean_parser = subparsers.add_parser('cleanup-models', help='Cleanup old models')
    clean_parser.add_argument('--keep', type=int, default=5)
    clean_parser.add_argument('--status', nargs='+', default=['ROLLED_BACK', 'DEPRECATED'])
    clean_parser.add_argument('--db-connection')
    
    # Set canary version
    canary_parser = subparsers.add_parser('set-canary-version', help='Set canary version in K8s')
    canary_parser.add_argument('--version')
    canary_parser.add_argument('--share', type=float, default=0.1)
    
    args = parser.parse_args()
    
    if args.command == 'update-registry':
        update_registry(args)
    elif args.command == 'evaluate-canary':
        evaluate_canary(args)
    elif args.command == 'promote-model':
        promote_model(args)
    elif args.command == 'rollback-model':
        rollback_model(args)
    elif args.command == 'cleanup-models':
        cleanup_models(args)
    elif args.command == 'set-canary-version':
        set_canary_version(args)
    else:
        parser.print_help()
