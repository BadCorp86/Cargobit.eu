#!/bin/bash
#
# CargoBit Database Restore Script
# Usage: ./restore-db.sh <backup_file>
#
# Options:
#   -d, --database   Target database name
#   -h, --host       Database host
#   -p, --port       Database port
#   -n, --dry-run    Show what would be done
#   --help           Show help
#
# Environment:
#   DATABASE_URL   - PostgreSQL connection string
#

set -euo pipefail

# Configuration
BACKUP_FILE=""
TARGET_DB=""
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-postgres}"
DRY_RUN=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# HELP
# =============================================================================

show_help() {
  cat << EOF
CargoBit Database Restore Script

Usage: $0 [OPTIONS] <backup_file>

Options:
  -d, --database   Target database name
  -h, --host       Database host (default: localhost)
  -p, --port       Database port (default: 5432)
  -n, --dry-run    Show what would be done
  --help           Show this help

Examples:
  $0 /backups/cargobit_full_20240101.sql.gz
  $0 -d cargobit_test /backups/cargobit_full_20240101.sql.gz
EOF
}

# =============================================================================
# PARSE ARGUMENTS
# =============================================================================

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      -d|--database)
        TARGET_DB="$2"
        shift 2
        ;;
      -h|--host)
        DB_HOST="$2"
        shift 2
        ;;
      -p|--port)
        DB_PORT="$2"
        shift 2
        ;;
      -n|--dry-run)
        DRY_RUN=true
        shift
        ;;
      --help)
        show_help
        exit 0
        ;;
      -*)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
      *)
        BACKUP_FILE="$1"
        shift
        ;;
    esac
  done
}

# =============================================================================
# VERIFY BACKUP
# =============================================================================

verify_backup() {
  if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
  fi
  
  # Check checksum if available
  local checksum_file="${BACKUP_FILE}.sha256"
  if [ -f "$checksum_file" ]; then
    log_info "Verifying checksum..."
    if sha256sum -c "$checksum_file" --quiet; then
      log_info "Checksum OK"
    else
      log_error "Checksum verification FAILED"
      exit 1
    fi
  fi
}

# =============================================================================
# DECRYPT BACKUP (if encrypted)
# =============================================================================

decrypt_backup() {
  if [[ "$BACKUP_FILE" == *.gpg ]]; then
    log_info "Decrypting backup..."
    local decrypted="${BACKUP_FILE%.gpg}"
    
    if [ -n "${GPG_KEY_FILE:-}" ]; then
      gpg --batch --yes --passphrase-file "$GPG_KEY_FILE" \
        -o "$decrypted" -d "$BACKUP_FILE"
    else
      gpg -o "$decrypted" -d "$BACKUP_FILE"
    fi
    
    BACKUP_FILE="$decrypted"
  fi
}

# =============================================================================
# RESTORE
# =============================================================================

restore_database() {
  local db="${TARGET_DB:-cargobit}"
  
  log_info "=========================================="
  log_info "CargoBit Database Restore"
  log_info "=========================================="
  log_info "Backup: $BACKUP_FILE"
  log_info "Target: $db @ $DB_HOST:$DB_PORT"
  log_info "=========================================="
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would restore to: $db"
    return
  fi
  
  # Confirm destructive operation
  log_warn "This will REPLACE ALL DATA in database: $db"
  read -p "Continue? (yes/N): " confirm
  
  if [ "$confirm" != "yes" ]; then
    log_info "Restore cancelled"
    exit 0
  fi
  
  # Drop and recreate database
  log_info "Recreating database..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres << EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$db' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS $db;
CREATE DATABASE $db;
EOF
  
  # Restore from backup
  log_info "Restoring data..."
  if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db"
  else
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -f "$BACKUP_FILE"
  fi
  
  log_info "Restore completed"
  
  # Verify tables
  log_info "Verifying tables..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -c "\dt"
}

# =============================================================================
# MAIN
# =============================================================================

main() {
  parse_args "$@"
  
  if [ -z "$BACKUP_FILE" ]; then
    log_error "No backup file specified"
    show_help
    exit 1
  fi
  
  verify_backup
  decrypt_backup
  restore_database
}

main "$@"
