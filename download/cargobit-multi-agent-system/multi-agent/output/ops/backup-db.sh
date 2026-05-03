#!/bin/bash
#
# CargoBit Database Backup Script
# Usage: ./backup-db.sh [full|incremental|wal]
#
# Environment:
#   DATABASE_URL   - PostgreSQL connection string
#   BACKUP_DIR     - Backup directory (default: /var/backups/cargobit)
#   S3_BUCKET      - Optional S3 bucket for offsite storage
#

set -euo pipefail

# Configuration
BACKUP_TYPE="${1:-full}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/cargobit}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)

# Database config from DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Retention
FULL_RETENTION_DAYS=30
INCREMENTAL_RETENTION_DAYS=7

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Create backup directory
mkdir -p "$BACKUP_DIR"

# =============================================================================
# FULL BACKUP
# =============================================================================

backup_full() {
  local backup_file="${BACKUP_DIR}/cargobit_full_${TIMESTAMP}.sql.gz"
  local checksum_file="${backup_file}.sha256"
  
  log_info "Starting full backup: $backup_file"
  
  # Run pg_dump with compression
  if pg_dump "$DATABASE_URL" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    | gzip -6 > "$backup_file"; then
    
    # Generate checksum
    sha256sum "$backup_file" > "$checksum_file"
    
    local size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file")
    local size_mb=$((size / 1024 / 1024))
    
    log_info "Backup completed: ${size_mb}MB"
    log_info "Checksum: $(cut -d' ' -f1 "$checksum_file")"
    
    # Upload to S3 if configured
    if [ -n "${S3_BUCKET:-}" ]; then
      log_info "Uploading to S3..."
      aws s3 cp "$backup_file" "s3://${S3_BUCKET}/backups/$(basename $backup_file)"
      aws s3 cp "$checksum_file" "s3://${S3_BUCKET}/backups/$(basename $checksum_file)"
    fi
    
    echo "$backup_file"
  else
    log_error "Backup failed"
    rm -f "$backup_file"
    exit 1
  fi
}

# =============================================================================
# INCREMENTAL BACKUP (WAL-based)
# =============================================================================

backup_incremental() {
  log_info "Incremental backup (WAL switch)"
  
  # Force WAL switch
  psql "$DATABASE_URL" -c "SELECT pg_switch_wal();" 2>/dev/null || true
  
  # Archive WAL files if wal-archive is configured
  local wal_dir="${BACKUP_DIR}/wal_archive"
  mkdir -p "$wal_dir"
  
  # Note: This requires archive_mode=on and archive_command in postgresql.conf
  log_info "WAL files should be archived to: $wal_dir"
  log_warn "Ensure postgresql.conf has archive_mode=on"
}

# =============================================================================
# WAL ARCHIVE SYNC
# =============================================================================

backup_wal() {
  local wal_dir="${BACKUP_DIR}/wal_archive"
  mkdir -p "$wal_dir"
  
  log_info "Syncing WAL archive..."
  
  # Copy new WAL files from pg_wal
  local pg_wal_dir=$(psql "$DATABASE_URL" -t -c "SHOW data_directory;" | tr -d ' ')/pg_wal
  
  if [ -d "$pg_wal_dir" ]; then
    rsync -av --ignore-existing "$pg_wal_dir/" "$wal_dir/"
    log_info "WAL sync completed"
  else
    log_warn "Cannot access pg_wal directory"
  fi
}

# =============================================================================
# CLEANUP OLD BACKUPS
# =============================================================================

cleanup_old_backups() {
  log_info "Cleaning up old backups..."
  
  # Full backups older than retention
  find "$BACKUP_DIR" -name "cargobit_full_*.sql.gz" \
    -mtime +$FULL_RETENTION_DAYS \
    -delete 2>/dev/null || true
  
  # Incremental backups older than retention
  find "$BACKUP_DIR" -name "cargobit_incr_*" \
    -mtime +$INCREMENTAL_RETENTION_DAYS \
    -delete 2>/dev/null || true
  
  # Clean checksum files
  find "$BACKUP_DIR" -name "*.sha256" \
    -mtime +$FULL_RETENTION_DAYS \
    -delete 2>/dev/null || true
}

# =============================================================================
# MAIN
# =============================================================================

main() {
  log_info "=========================================="
  log_info "CargoBit Database Backup"
  log_info "=========================================="
  log_info "Type: $BACKUP_TYPE"
  log_info "Database: $DB_NAME @ $DB_HOST:$DB_PORT"
  log_info "Output: $BACKUP_DIR"
  log_info "Timestamp: $TIMESTAMP"
  log_info "=========================================="
  
  case "$BACKUP_TYPE" in
    full)
      backup_full
      ;;
    incremental)
      backup_incremental
      ;;
    wal)
      backup_wal
      ;;
    *)
      log_error "Unknown backup type: $BACKUP_TYPE"
      echo "Usage: $0 [full|incremental|wal]"
      exit 1
      ;;
  esac
  
  cleanup_old_backups
  
  log_info "Backup process completed"
}

main "$@"
