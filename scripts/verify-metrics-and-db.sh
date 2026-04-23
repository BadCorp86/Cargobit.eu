#!/usr/bin/env bash
set -euo pipefail

# verify-metrics-and-db.sh
# Usage:
#   ./scripts/verify-metrics-and-db.sh \
#     --metrics-url https://payments.staging.example.com/metrics \
#     --prometheus-url http://prometheus.example.com:9090 \
#     --db-url "postgres://user:pass@db:5432/payments" \
#     --report-dir reports

METRICS_URL="https://payments.staging.example.com/metrics"
PROM_URL="http://localhost:9090"
DB_URL=""
REPORT_DIR="reports"
mkdir -p "$REPORT_DIR"

while [[ $# -gt 0 ]]; do
  case $1 in
    --metrics-url) METRICS_URL="$2"; shift 2;;
    --prometheus-url) PROM_URL="$2"; shift 2;;
    --db-url) DB_URL="$2"; shift 2;;
    --report-dir) REPORT_DIR="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

echo "1) Fetching /metrics from $METRICS_URL"
curl -fsS "$METRICS_URL" -o "$REPORT_DIR/metrics.txt" || { echo "Failed to fetch metrics"; exit 1; }
grep -E "reconciliation_runs_total|reconciliation_open_payouts_gauge|reconciliation_duration_seconds" "$REPORT_DIR/metrics.txt" || true
echo "Saved metrics to $REPORT_DIR/metrics.txt"

echo "2) Checking Prometheus targets ($PROM_URL)"
curl -fsS "$PROM_URL/api/v1/targets" -o "$REPORT_DIR/prom_targets.json" || { echo "Failed to query Prometheus"; exit 1; }
jq '.data.activeTargets[] | {scrapePool, health, labels}' "$REPORT_DIR/prom_targets.json" > "$REPORT_DIR/prom_targets_summary.json" || true
echo "Saved Prometheus target summary to $REPORT_DIR/prom_targets_summary.json"

if [ -n "$DB_URL" ]; then
  echo "3) Running DB verification queries"
  # Requires psql in PATH and DB_URL in libpq format
  PSQL_CMD="psql \"$DB_URL\" -At -c"
  echo "Open payouts (sample):" > "$REPORT_DIR/db_checks.txt"
  $PSQL_CMD "SELECT id, status, amount_cents, created_at FROM payouts WHERE status IN ('pending','processing') ORDER BY created_at DESC LIMIT 50;" >> "$REPORT_DIR/db_checks.txt" || true
  $PSQL_CMD "SELECT id, payout_id, type, payload, created_at FROM payout_events ORDER BY created_at DESC LIMIT 50;" >> "$REPORT_DIR/db_checks.txt" || true
  $PSQL_CMD "SELECT id, event_type, payload, created_at FROM audit_events WHERE event_type LIKE 'reconciliation.%' ORDER BY created_at DESC LIMIT 50;" >> "$REPORT_DIR/db_checks.txt" || true
  echo "Saved DB checks to $REPORT_DIR/db_checks.txt"
else
  echo "DB_URL not provided; skipping DB checks."
fi

echo "Verification artifacts saved in $REPORT_DIR"
