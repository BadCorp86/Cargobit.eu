# Grafana Dashboard Import

## Quick Import

1. **Via UI:**
   - Navigate to Dashboards → Import
   - Upload `scoring-monitoring.json` or paste JSON
   - Select PostgreSQL datasource
   - Click Import

2. **Via API:**
   ```bash
   curl -X POST \
     -H "Authorization: Bearer $GRAFANA_API_KEY" \
     -H "Content-Type: application/json" \
     -d @scoring-monitoring.json \
     http://grafana.cargobit.io/api/dashboards/db
   ```

3. **Via ConfigMap (Kubernetes):**
   ```yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: grafana-dashboard-scoring
     namespace: monitoring
     labels:
       grafana_dashboard: "1"
   data:
     scoring-monitoring.json: |
       # ... (dashboard JSON content)
   ```

## Dashboard Panels

| Row | Panels | Description |
|-----|--------|-------------|
| **1. Scoring Overview** | Avg Score (All), Avg Score (Accepted), Acceptance Rate, Distribution | Core scoring metrics |
| **2. Suggestion Funnel** | Funnel Chart, Acceptance Over Time | Conversion tracking |
| **3. ML vs Heuristic** | Acceptance Comparison, Margin Comparison | Model performance |
| **4. Breakdown** | Top Customers, Top Drivers | Entity-level insights |
| **5. Config Snapshot** | Weights Table, ML Config, Active Profile | Current configuration |

## Required Datasource

```yaml
# PostgreSQL Datasource Configuration
apiVersion: 1
datasources:
  - name: PostgreSQL-CargoBit
    type: postgres
    url: postgres.cargobit.io:5432
    database: cargobit_analytics
    user: grafana_reader
    secureJsonData:
      password: ${POSTGRES_PASSWORD}
    jsonData:
      sslmode: require
      maxOpenConns: 10
      maxIdleConns: 5
      connMaxLifetime: 14400
    uid: postgres-cargobit
```

## Environment Variables

Set these for the dashboard to function:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Password for grafana_reader user |
| `GRAFANA_API_KEY` | API key for dashboard import |

## Alerts

The dashboard includes pre-configured alerts:

| Alert | Condition | Severity |
|-------|-----------|----------|
| Low Acceptance Rate | < 15% for 2h | Warning |
| ML Model Degradation | AUC < 0.60 for 24h | Critical |
| High Execution Failure | > 10% for 4h | Warning |
