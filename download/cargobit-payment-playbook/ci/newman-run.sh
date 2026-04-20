#!/usr/bin/env bash
# =============================================================================
# Newman CI Script für automatisierte Postman-Collection Runs
# =============================================================================
set -euo pipefail

COLLECTION="postman_collection_payments_e2e.json"
ENV="postman_env_staging.json"
REPORT_DIR="reports"
mkdir -p "$REPORT_DIR"

echo "Running Postman collection with Newman..."
newman run "$COLLECTION" -e "$ENV" --reporters cli,junit --reporter-junit-export "$REPORT_DIR/newman-results.xml"
echo "Newman finished. Report: $REPORT_DIR/newman-results.xml"
