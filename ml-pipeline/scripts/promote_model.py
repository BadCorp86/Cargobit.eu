#!/usr/bin/env python3
"""
Promote Model - Standalone Script
==================================

Promotes a candidate model to active status.

Usage:
    python promote_model.py --version 20240115_120000
    python promote_model.py  # Auto-detect candidate
"""

import argparse
import os
import sys

import psycopg2


def main():
    parser = argparse.ArgumentParser(description="Promote ML Model")
    parser.add_argument('--version', help='Model version to promote (auto-detect if not provided)')
    parser.add_argument('--from-status', default='CANDIDATE', help='Current status')
    parser.add_argument('--to-status', default='ACTIVE', help='Target status')
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
                    WHERE status = %s
                    ORDER BY created_at DESC LIMIT 1
                """, (args.from_status,))
                result = cur.fetchone()
                version = result[0] if result else None
            
            if not version:
                print(f"Error: No model found with status {args.from_status}")
                sys.exit(1)
            
            # If promoting to ACTIVE, rollback current ACTIVE
            if args.to_status == 'ACTIVE':
                cur.execute("""
                    UPDATE ml_model_registry 
                    SET status = 'ROLLED_BACK', updated_at = NOW()
                    WHERE status = 'ACTIVE'
                """)
                print(f"Rolled back current ACTIVE model(s)")
            
            # Promote
            cur.execute("""
                UPDATE ml_model_registry 
                SET status = %s, updated_at = NOW()
                WHERE version = %s AND status = %s
            """, (args.to_status, version, args.from_status))
            
            if cur.rowcount == 0:
                conn.rollback()
                print(f"Error: Model {version} not found with status {args.from_status}")
                sys.exit(1)
            
            conn.commit()
            print(f"✅ Promoted model {version} to {args.to_status}")
            
    finally:
        conn.close()


if __name__ == "__main__":
    main()
