#!/usr/bin/env bash
# =============================================================================
# Quick Reference: Task 4 Commands
# =============================================================================

# === PR Status prüfen ===
gh pr view feat/reconciliation-task4 --json state,title,url,author

# Oder mit Web-UI öffnen
gh pr view --web

# === Dashboard Datasource anpassen ===
# Ersetze "Prometheus" durch deinen Datasource-Namen
sed -i 's/"datasource": "Prometheus"/"datasource": "YOUR_DATASOURCE_NAME"/g' \
    observability/grafana/dashboards/reconciliation-prometheus.json

# Oder mit jq (falls installiert)
jq '.panels[].datasource = "YOUR_DATASOURCE_NAME"' \
    observability/grafana/dashboards/reconciliation-prometheus.json > temp.json && mv temp.json observability/grafana/dashboards/reconciliation-prometheus.json

# === Grafana Import via API ===
curl -X POST "https://YOUR_GRAFANA_URL/api/dashboards/db" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d @observability/grafana/dashboards/reconciliation-prometheus.json

# === Newman E2E ausführen ===
newman run postman/postman_reconciliation.json \
  -e postman_env_staging.json \
  --reporters cli,junit \
  --reporter-junit-export reports/newman-reconciliation.xml

# === Kubernetes CronJob triggern ===
kubectl -n staging create job --from=cronjob/payments-reconciliation manual-recon-$(date +%s)

# === CronJob Logs anzeigen ===
kubectl -n staging logs -l app=payments-reconciliation --tail=100 -f

# === Helm Rollback ===
helm rollback payments -n staging
