# Task 4: Payout Reconciliation - Deployment Guide

## Übersicht

Task 4 implementiert die **Payout Reconciliation** Funktionalität, die lokale Payout-Daten mit Stripe Transfers abgleicht und Differenzen erkennt und behebt.

### Features

- **Automatische Reconciliation**: Alle 6 Stunden via Kubernetes CronJob
- **Stripe API Integration**: Echtzeit-Abgleich mit Stripe Transfers
- **Leader Lock**: Verhindert parallele Runs in verteilten Systemen
- **Prometheus Metrics**: Vollständige Observability
- **Admin API**: Manuelles Markieren und Triggern
- **Audit Trail**: Vollständige Nachvollziehbarkeit aller Aktionen

---

## Dateistruktur

```
src/reconciliation/
├── reconciliation.module.ts           # NestJS Module
├── services/
│   ├── reconciliation.service.ts      # Basis Service
│   └── stripe-reconciliation.service.ts # Stripe Integration
├── schedulers/
│   └── reconciliation.scheduler.ts    # Cron Scheduler
├── dto/
│   └── mark-payout.dto.ts             # DTOs
├── metrics/
│   └── reconciliation.metrics.ts      # Prometheus Metrics
├── __tests__/
│   └── reconciliation.service.spec.ts # Jest Tests
└── run-scheduler.ts                   # Standalone Entry Point

src/app/api/admin/reconciliation/
├── open/route.ts                      # GET /api/admin/reconciliation/open
├── [id]/mark/route.ts                 # POST /api/admin/reconciliation/:id/mark
├── report/route.ts                    # GET /api/admin/reconciliation/report
└── trigger/route.ts                   # POST /api/admin/reconciliation/trigger

src/app/api/metrics/reconciliation/
└── route.ts                           # GET /api/metrics/reconciliation

helm/payments-service/
├── templates/
│   └── reconciliation-cronjob.yaml    # Kubernetes CronJob
└── values-reconciliation.yaml         # Helm Values

.github/workflows/
└── reconciliation-e2e.yml             # Newman E2E Tests

observability/grafana/dashboards/
└── reconciliation.json                # Grafana Dashboard

postman/
└── postman_reconciliation.json        # Postman Collection
```

---

## API Endpoints

### 1. Open Payouts auflisten

```http
GET /api/admin/reconciliation/open?status=pending&limit=50
Authorization: Bearer <admin_jwt>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payout-uuid",
      "amount_cents": 10000,
      "currency": "EUR",
      "status": "pending",
      "diff": 0,
      "created_at": "2024-01-15T10:00:00Z",
      "stripe_transfer_id": "tr_123456",
      "user_id": "user-uuid"
    }
  ],
  "count": 1
}
```

### 2. Payout manuell markieren

```http
POST /api/admin/reconciliation/{payoutId}/mark
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "status": "resolved",
  "note": "Manually verified with bank statement"
}
```

**Response:**
```json
{
  "ok": true,
  "payout": {
    "id": "payout-uuid",
    "status": "paid",
    "updated_at": "2024-01-15T12:00:00Z"
  },
  "event": {
    "id": "event-uuid",
    "type": "manual_mark",
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

### 3. Reconciliation Report

```http
GET /api/admin/reconciliation/report
Authorization: Bearer <admin_jwt>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_open": 42,
    "total_amount_cents": 1250000,
    "by_status": {
      "pending": 30,
      "processing": 10,
      "failed": 2
    },
    "diffs_found": 3,
    "generated_at": "2024-01-15T12:00:00Z"
  }
}
```

### 4. Manuelles Triggern

```http
POST /api/admin/reconciliation/trigger
Authorization: Bearer <admin_jwt>
```

### 5. Prometheus Metrics

```http
GET /api/metrics/reconciliation
X-Service-Key: <service_api_key>
```

---

## Deployment

### 1. Voraussetzungen

- Kubernetes Cluster mit namespace `staging`/`production`
- Helm 3.x installiert
- `kubectl` konfiguriert
- Docker Registry Zugriff
- Stripe API Key konfiguriert

### 2. Secrets konfigurieren

```bash
# Kubernetes Secret erstellen
kubectl -n staging create secret generic payments-secrets \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxx \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --from-literal=REDIS_HOST=redis.default.svc.cluster.local

# Oder via SealedSecret (empfohlen für GitOps)
kubectl apply -f kubernetes/sealedsecret-payments.yaml
```

### 3. Helm Deploy

```bash
# Lint Chart
helm lint helm/payments-service

# Dry Run
helm upgrade --install payments ./helm/payments-service \
  --namespace staging \
  --values helm/payments-service/values.yaml \
  --values helm/payments-service/values-reconciliation.yaml \
  --dry-run --debug

# Deploy
helm upgrade --install payments ./helm/payments-service \
  --namespace staging \
  --values helm/payments-service/values.yaml \
  --values helm/payments-service/values-reconciliation.yaml \
  --wait --timeout 5m
```

### 4. CronJob verifizieren

```bash
# CronJob Status
kubectl -n staging get cronjob payments-reconciliation

# Manuelles Triggern
kubectl -n staging create job --from=cronjob/payments-reconciliation manual-recon-$(date +%s)

# Logs prüfen
kubectl -n staging logs -l app=payments-reconciliation --tail=100
```

---

## E2E Tests ausführen

### Lokal mit Newman

```bash
# Newman installieren
npm install -g newman

# Environment vorbereiten
export ADMIN_JWT="eyJhbGci..."

# Tests ausführen
newman run postman/postman_reconciliation.json \
  -e postman_env_staging.json \
  --reporters cli,junit \
  --reporter-junit-export reports/newman.xml
```

### Via GitHub Actions

Der Workflow `.github/workflows/reconciliation-e2e.yml` läuft:
- Bei Push auf `main`/`develop` mit Änderungen an Reconciliation-Code
- Alle 6 Stunden nach dem CronJob (Schedule)
- Manuell via `workflow_dispatch`

**Benötigte GitHub Secrets:**
- `STAGING_BASE_URL`
- `STAGING_ADMIN_JWT`
- `PRODUCTION_BASE_URL`
- `PRODUCTION_ADMIN_JWT`
- `SLACK_WEBHOOK_URL` (optional)

---

## Grafana Dashboard importieren

1. Grafana öffnen → Dashboards → Import
2. `observability/grafana/dashboards/reconciliation.json` hochladen
3. Prometheus DataSource auswählen
4. Namespace-Variable auf `staging` oder `production` setzen

**Dashboard Panels:**
- Open Payouts by Status
- Discrepancies Found
- Reconciliation Runs (24h)
- Duration (p50, p95, p99)
- Stripe API Latency
- Errors by Type
- Manual Marks (24h)
- Processed Payouts by Final Status

---

## Prometheus Metrics

| Metric | Type | Beschreibung |
|--------|------|--------------|
| `reconciliation_runs_total` | Counter | Runs nach Result (success/failure/skipped) |
| `reconciliation_open_payouts_gauge` | Gauge | Offene Payouts nach Status |
| `reconciliation_duration_seconds` | Histogram | Laufzeit der Reconciliation |
| `reconciliation_diffs_found` | Gauge | Gefundene Differenzen |
| `reconciliation_errors_total` | Counter | Fehler nach Typ |
| `reconciliation_manual_marks_total` | Counter | Manuelle Markierungen |
| `reconciliation_stripe_api_latency_seconds` | Gauge | Stripe API Latenz |
| `reconciliation_processed_payouts_total` | Counter | Verarbeitete Payouts |

### Beispiel PromQL Queries

```promql
# Reconciliation Erfolgsrate (24h)
sum(increase(reconciliation_runs_total{result="success"}[24h]))
/ sum(increase(reconciliation_runs_total[24h])) * 100

# Durchschnittliche Laufzeit
rate(reconciliation_duration_seconds_sum[5m])
/ rate(reconciliation_duration_seconds_count[5m])

# Offene Payouts Alert
sum(reconciliation_open_payouts_gauge) > 100
```

---

## Fehlersuche

### CronJob läuft nicht

```bash
# CronJob Events prüfen
kubectl -n staging describe cronjob payments-reconciliation

# Letzte Jobs anzeigen
kubectl -n staging get jobs -l app=payments-reconciliation

# Pod Logs
kubectl -n staging logs -l app=payments-reconciliation --previous
```

### Stripe API Fehler

```bash
# Stripe Key prüfen
kubectl -n staging get secret payments-secrets -o jsonpath='{.data.STRIPE_SECRET_KEY}' | base64 -d

# API Connectivity Test (im Pod)
kubectl -n staging exec deploy/payments-backend -- curl -s https://api.stripe.com/v1/charges \
  -u sk_test_xxx:
```

### Leader Lock Probleme

```sql
-- Prüfe Lock-Tabelle
SELECT * FROM leader_lock WHERE key = 'reconciliation:leader';

-- Lock manuell freigeben (nur im Notfall!)
DELETE FROM leader_lock WHERE key = 'reconciliation:leader';
```

---

## Rollback

```bash
# Helm History
helm history payments -n staging

# Rollback zur vorherigen Revision
helm rollback payments -n staging

# Auf spezifische Revision
helm rollback payments 42 -n staging
```

---

## Checklist vor Production-Deploy

- [ ] Stripe API Key konfiguriert (Live Key)
- [ ] Database Migrations ausgeführt
- [ ] Secrets via SealedSecret deployt
- [ ] E2E Tests auf Staging bestanden
- [ ] Grafana Dashboard importiert
- [ ] Alerting Rules konfiguriert
- [ ] On-Call Team informiert
- [ ] Rollback-Plan bekannt
