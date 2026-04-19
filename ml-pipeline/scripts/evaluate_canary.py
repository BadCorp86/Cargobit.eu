#!/usr/bin/env python3
"""
Evaluate Canary Model - Standalone Script
==========================================

Evaluates canary metrics and determines if promotion is warranted.

Usage:
    python evaluate_canary.py --output evaluation.json
"""

import argparse
import json
import os
import sys

import psycopg2
from psycopg2.extras import RealDictCursor


# Thresholds
MIN_ACCEPTANCE_RATE_DELTA = 0.02  # Candidate must be 2% better
MIN_SAMPLE_SIZE = 100
MAX_LATENCY_INCREASE_MS = 10


def main():
    parser = argparse.ArgumentParser(description="Evaluate Canary Model")
    parser.add_argument('--output', default='evaluation.json', help='Output file')
    parser.add_argument('--metrics', default='metrics.json', help='Metrics output file')
    parser.add_argument('--db', help='Database connection string')
    
    args = parser.parse_args()
    
    # Get DB connection
    db_conn = args.db or os.environ.get('DB_CONNECTION')
    if not db_conn:
        print("Error: DB_CONNECTION not set")
        sys.exit(1)
    
    conn = psycopg2.connect(db_conn)
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get candidate
            cur.execute("""
                SELECT version, metrics, created_at
                FROM ml_model_registry 
                WHERE status = 'CANDIDATE'
                ORDER BY created_at DESC LIMIT 1
            """)
            candidate = cur.fetchone()
            
            # Get active
            cur.execute("""
                SELECT version, metrics, created_at
                FROM ml_model_registry 
                WHERE status = 'ACTIVE'
                ORDER BY created_at DESC LIMIT 1
            """)
            active = cur.fetchone()
            
            # Get prediction metrics
            cur.execute("""
                SELECT 
                    model_version,
                    COUNT(*) as total,
                    AVG(CASE WHEN accepted THEN 1 ELSE 0 END) as acceptance_rate,
                    AVG(latency_ms) as avg_latency_ms
                FROM ml_prediction_log
                WHERE predicted_at > NOW() - INTERVAL '24 hours'
                GROUP BY model_version
            """)
            prediction_metrics = {row['model_version']: dict(row) for row in cur.fetchall()}
        
        # Evaluate
        result = {
            'candidate_version': candidate['version'] if candidate else None,
            'active_version': active['version'] if active else None,
            'should_promote': False,
            'reason': None,
            'metrics': {}
        }
        
        if not candidate:
            result['reason'] = 'No candidate model found'
        
        elif not active:
            result['should_promote'] = True
            result['reason'] = 'No active model - auto-promote'
        
        else:
            # Compare offline metrics
            candidate_metrics = candidate['metrics'] or {}
            active_metrics = active['metrics'] or {}
            
            candidate_auc = float(candidate_metrics.get('cv_auc_mean', 0))
            active_auc = float(active_metrics.get('cv_auc_mean', 0))
            
            # Compare online metrics
            cand_online = prediction_metrics.get(candidate['version'], {})
            active_online = prediction_metrics.get(active['version'], {})
            
            cand_acceptance = float(cand_online.get('acceptance_rate', 0))
            active_acceptance = float(active_online.get('acceptance_rate', 0))
            
            cand_latency = float(cand_online.get('avg_latency_ms', 0))
            active_latency = float(active_online.get('avg_latency_ms', 0))
            
            # Calculate deltas
            auc_delta = candidate_auc - active_auc
            acceptance_delta = cand_acceptance - active_acceptance
            latency_delta = cand_latency - active_latency
            
            result['metrics'] = {
                'candidate_auc': candidate_auc,
                'active_auc': active_auc,
                'auc_delta': auc_delta,
                'candidate_acceptance_rate': cand_acceptance,
                'active_acceptance_rate': active_acceptance,
                'acceptance_delta': acceptance_delta,
                'candidate_latency_ms': cand_latency,
                'active_latency_ms': active_latency,
                'latency_delta_ms': latency_delta,
                'candidate_samples': cand_online.get('total', 0),
                'active_samples': active_online.get('total', 0)
            }
            
            # Decision logic
            reasons = []
            should_promote = True
            
            # Check AUC
            if auc_delta < 0:
                reasons.append(f'AUC degraded by {-auc_delta:.4f}')
                should_promote = False
            
            # Check acceptance rate
            if acceptance_delta < MIN_ACCEPTANCE_RATE_DELTA:
                reasons.append(f'Acceptance rate improvement {acceptance_delta:.2%} below threshold {MIN_ACCEPTANCE_RATE_DELTA:.0%}')
            
            # Check latency
            if latency_delta > MAX_LATENCY_INCREASE_MS:
                reasons.append(f'Latency increased by {latency_delta:.1f}ms')
                should_promote = False
            
            # Check sample size
            if cand_online.get('total', 0) < MIN_SAMPLE_SIZE:
                reasons.append(f'Insufficient samples: {cand_online.get("total", 0)}')
                should_promote = False
            
            result['should_promote'] = should_promote
            result['reason'] = '; '.join(reasons) if reasons else 'All checks passed'
        
        # Write output
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=2)
        
        with open(args.metrics, 'w') as f:
            json.dump(result['metrics'], f, indent=2)
        
        print(f"{'✅' if result['should_promote'] else '❌'} Evaluation complete: {result['reason']}")
        
        if result['should_promote']:
            sys.exit(0)
        else:
            sys.exit(1)
            
    finally:
        conn.close()


if __name__ == "__main__":
    main()
