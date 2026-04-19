#!/usr/bin/env python3
"""
Rollback Model - Standalone Script
===================================

Rollbacks a canary model.

Usage:
    python rollback_model.py --version 20240115_120000 --reason "High error rate"
"""

import argparse
import json
import os
import sys

import psycopg2


def main():
    parser = argparse.ArgumentParser(description="Rollback ML Model")
    parser.add_argument('--version', help='Model version to rollback (auto-detect canary if not provided)')
    parser.add_argument('--reason', default='Manual rollback', help='Rollback reason')
    parser.add_argument('--db', help='Database connection string')
    
    args = parser.parse_args()
    
    # Get DB connection
    db_conn = args.db or os.environ.get('DB_CONNECTION')
    if not db_conn:
        print("Error: DB_CONNECTION not set")
        sys.exit(1)
    
    conn = psycopg2.connect(db_conn)
    
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
                print("No canary model to rollback")
                sys.exit(0)
            
            # Rollback
            cur.execute("""
                UPDATE ml_model_registry 
                SET status = 'ROLLED_BACK', updated_at = NOW()
                WHERE version = %s
            """, (version,))
            
            # Log event
            cur.execute("""
                INSERT INTO ml_model_events (version, event_type, details, created_at)
                VALUES (%s, 'ROLLBACK', %s, NOW())
            """, (version, json.dumps({'reason': args.reason})))
            
            conn.commit()
            print(f"✅ Rolled back model {version}")
            print(f"   Reason: {args.reason}")
            
    finally:
        conn.close()


if __name__ == "__main__":
    main()
