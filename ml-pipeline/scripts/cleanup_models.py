#!/usr/bin/env python3
"""
Cleanup Old Models - Standalone Script
======================================

Removes old model versions from the registry.

Usage:
    python cleanup_models.py --keep 5 --status ROLLED_BACK DEPRECATED
"""

import argparse
import os
import sys

import psycopg2


def main():
    parser = argparse.ArgumentParser(description="Cleanup Old ML Models")
    parser.add_argument('--keep', type=int, default=5, help='Number of models to keep per status')
    parser.add_argument('--status', nargs='+', default=['ROLLED_BACK', 'DEPRECATED'], help='Statuses to cleanup')
    parser.add_argument('--db', help='Database connection string')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be deleted')
    
    args = parser.parse_args()
    
    # Get DB connection
    db_conn = args.db or os.environ.get('DB_CONNECTION')
    if not db_conn:
        print("Error: DB_CONNECTION not set")
        sys.exit(1)
    
    conn = psycopg2.connect(db_conn)
    
    try:
        with conn.cursor() as cur:
            total_deleted = 0
            
            for status in args.status:
                # Count models to delete
                cur.execute("""
                    SELECT COUNT(*) FROM (
                        SELECT id FROM ml_model_registry
                        WHERE status = %s
                        ORDER BY created_at DESC
                        OFFSET %s
                    ) sub
                """, (status, args.keep))
                
                count = cur.fetchone()[0]
                
                if count == 0:
                    print(f"No {status} models to cleanup")
                    continue
                
                if args.dry_run:
                    print(f"Would delete {count} {status} models")
                    continue
                
                # Delete
                cur.execute("""
                    DELETE FROM ml_model_registry
                    WHERE id IN (
                        SELECT id FROM ml_model_registry
                        WHERE status = %s
                        ORDER BY created_at DESC
                        OFFSET %s
                    )
                """, (status, args.keep))
                
                deleted = cur.rowcount
                total_deleted += deleted
                print(f"Deleted {deleted} {status} models")
            
            if not args.dry_run:
                conn.commit()
                print(f"\n✅ Total deleted: {total_deleted} models")
            
    finally:
        conn.close()


if __name__ == "__main__":
    main()
