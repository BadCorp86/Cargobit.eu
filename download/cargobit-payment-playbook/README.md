# CargoBit Payment Platform - Testing Playbook

## Übersicht

Kompakte Artefakte für E2E Testing, Monitoring und Incident Handling.

## Verzeichnisstruktur

```
cargobit-payment-playbook/
├── README.md                              # Diese Datei
├── postman_collection_payments_e2e.json   # Postman Collection (9 E2E Tests)
├── postman_env_staging.json               # Environment Template
├── ci/
│   ├── newman-run.sh                      # Newman CI Script
│   └── github-actions-e2e.yml             # GitHub Actions Workflow
├── monitoring/
│   ├── prometheus_alerts_minimal.yaml     # 3 Alert Rules
│   └── grafana_dashboard_minimal.json     # 6 Panels Dashboard
├── sql/
│   └── idempotency_checks.sql             # 5 SQL Snippets
├── scripts/
│   ├── reprocess-stripe-events.js         # Minimal Reprocess Script
│   └── reprocess-stripe-events-safe.js    # Safe Version mit Dry-Run
└── docs/
    └── runbook_minimal.md                 # 5-Step Runbook
```

## Schnellstart

### 1. Newman E2E Tests

```bash
# Environment konfigurieren
vim postman_env_staging.json

# Tests ausführen
chmod +x ci/newman-run.sh
./ci/newman-run.sh
```

**Akzeptanzkriterium:** `newman` Lauf beendet mit Exit 0; `reports/newman-results.xml` vorhanden.

### 2. SQL Verification

```bash
psql -d cargobit_payments -f sql/idempotency_checks.sql
```

**Akzeptanzkriterium:** Nach Replay `wallet_tx_count` unverändert; `stripe_events` zeigt `processed = true`.

### 3. Prometheus Alerts

```bash
cp monitoring/prometheus_alerts_minimal.yaml /etc/prometheus/rules/
systemctl reload prometheus
```

### 4. Grafana Dashboard

1. Grafana → Dashboards → Import
2. `monitoring/grafana_dashboard_minimal.json` hochladen
3. Prometheus Data Source auswählen

**Akzeptanzkriterium:** Panels zeigen Werte nach Testläufen; Alerts feuern bei simulierten Fehlern.

### 5. Reprocess Script

```bash
# Dry-Run (erst testen!)
node scripts/reprocess-stripe-events-safe.js \
  --dbUrl="postgres://user:pass@host:5432/db" \
  --webhookUrl="https://staging.example.com/webhooks/stripe" \
  --dry-run

# Echtes Reprocessing
node scripts/reprocess-stripe-events-safe.js \
  --dbUrl="postgres://user:pass@host:5432/db" \
  --webhookUrl="https://staging.example.com/webhooks/stripe" \
  --limit=5
```

**Wichtig:** Teste zuerst mit 1-2 Events!

## Priorisierte To-Dos

| # | Task | Befehl/Aktion |
|---|------|---------------|
| 1 | Newman Run lokal/CI | `./ci/newman-run.sh` mit korrektem `postman_env_staging.json` |
| 2 | Idempotency Replay Test | SQL Count vor/nach Replay; sende Replay via curl; vergleiche Counts |
| 3 | Reconciliation Cron Leader Lock | prüfe Redis key TTL und Cron logs |
| 4 | Alerts | lade Prometheus rules hoch; simuliere Alert |
| 5 | Runbook | verteile an On-Call, führe Dry-Run mit Team |

## Environment Variablen

| Variable | Beschreibung |
|----------|--------------|
| `base_url` | API Base URL |
| `admin_jwt` | Admin JWT Token (Bearer ...) |
| `stripe_test_secret` | Stripe Webhook Secret (whsec_...) |

## Test Flow

```
1. POST /jobs                    → Job erstellen
2. POST /booking/confirm         → PaymentIntent erzeugen
3. POST /webhooks/stripe         → payment_intent.succeeded
4. GET /admin/payments           → Payment verifizieren
5. POST /admin/jobs/:id/refund   → Partial Refund
6. POST /webhooks/stripe         → charge.refunded
7. GET /admin/payments/:id       → refunded_cents prüfen
8. POST /admin/payments/:id/reconcile → Reconciliation
9. POST /webhooks/stripe         → Idempotency Test
```

---
*Version: 1.1 (Kompakte Version)*
