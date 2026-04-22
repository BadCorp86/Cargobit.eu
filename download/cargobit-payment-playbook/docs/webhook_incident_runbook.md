# Webhook Processing Incident Runbook

**CargoBit Payment Platform**

| Document Info | |
|---------------|---|
| Version | 1.0 |
| Last Updated | 2024-01-15 |
| Owner | Payment Team |
| Severity Levels | critical, warning, info |

---

## 1. Overview

### 1.1 Purpose

Dieses Runbook beschreibt die standardisierten Prozeduren zur Behandlung von Incidents im Webhook-Processing der CargoBit Payment Platform. Es deckt Stripe Webhook Events, Payment Processing, Refunds und Reconciliation ab.

### 1.2 Scope

- Stripe Webhook Events (`payment_intent.*`, `charge.*`, `refund.*`)
- Payment Status Transitions
- Refund Processing
- Wallet Transaction Updates
- Reconciliation Jobs

### 1.3 Affected Services

| Service | Description | Health Check |
|---------|-------------|--------------|
| `payment-webhook` | Stripe Webhook Endpoint | `/health/webhook` |
| `payment-service` | Payment Processing | `/health/payments` |
| `reconciliation-cron` | Periodische Reconciliation | Cron Schedule |
| `wallet-service` | Wallet Transactions | `/health/wallet` |

---

## 2. Ersteinschätzung (Triage)

### 2.1 Alert Empfang

Bei Alert-Empfang folgende Schritte ausführen:

1. **Alert Details prüfen** in Grafana/Alertmanager
2. **Severity bestimmen**:
   - **critical**: Sofortige Reaktion erforderlich (< 15 Min)
   - **warning**: Reaktion innerhalb 1 Stunde
   - **info**: Reaktion innerhalb 4 Stunden
3. **On-Call Engineer benachrichtigen** bei critical

### 2.2 Schnelle Diagnose

#### Grafana Dashboard Checks

```
Dashboard: CargoBit Payment Dashboard
URL: https://grafana.internal/d/cargobit-payments
```

**Key Panels prüfen:**
- Active Alerts Count
- Webhook Request Rate
- Webhook Latency (P95)
- Payment Status Distribution
- Reconciliation Diffs

#### Stripe Status prüfen

```
Stripe Status Page: https://status.stripe.com
```

Bei Stripe-Outage: Siehe Abschnitt 4.2 (Stripe API Issues)

### 2.3 Database Quick Check

```sql
-- Unverarbeitete Events zählen
SELECT COUNT(*) FROM stripe_events WHERE processed = false;

-- Payments stuck in processing
SELECT COUNT(*) FROM payments 
WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '5 minutes';
```

---

## 3. Incident Classification

### 3.1 Webhook 5xx Errors

**Symptome:**
- Alert: `StripeWebhookHighErrorRate`
- Hohe Rate an 500er Responses im Webhook Endpoint

**Mögliche Ursachen:**
1. Datenbank nicht erreichbar
2. Redis Lock nicht verfügbar
3. Stripe API Timeout
4. Application Error (Bug)
5. Memory/CPU Limits erreicht

### 3.2 Signature Validation Errors

**Symptome:**
- Alert: `StripeWebhookSignatureValidationErrors`
- Viele 400er Responses mit "Invalid signature"

**Mögliche Ursachen:**
1. Webhook Secret abgelaufen/rotiert
2. Replay Attack
3. Fehlkonfigurierte Environment Variables
4. Raw Body nicht korrekt übergeben

### 3.3 Orphaned Events

**Symptome:**
- Alert: `OrphanedPaymentIntentsHigh`
- Events in Stripe vorhanden, aber nicht in DB

**Mögliche Ursachen:**
1. Webhook Processing Fehler
2. Race Condition bei Job-Erstellung
3. Database Transaction Rollback

### 3.4 Reconciliation Discrepancies

**Symptome:**
- Alert: `ReconciliationDiscrepanciesDetected`
- Unterschiedliche refunded_cents zwischen DB und Stripe

**Mögliche Ursachen:**
1. Verpasste Webhook Events
2. Race Condition bei Refund Processing
3. Manual Refund in Stripe Dashboard

---

## 4. Sofortmaßnahmen

### 4.1 Webhook Service nicht erreichbar

```bash
# Service Status prüfen
kubectl get pods -l app=payment-webhook -n payments

# Logs prüfen
kubectl logs -l app=payment-webhook -n payments --tail=100

# Service Restart (falls nötig)
kubectl rollout restart deployment/payment-webhook -n payments
```

### 4.2 Stripe API Issues

Bei Stripe-Outage:

1. **Webhooks werden automatisch retryen** (Stripe Exponential Backoff)
2. **Keine manuellen Aktionen erforderlich**
3. **Monitoring erhöhen** - Dashboard alle 5 Minuten prüfen
4. **Communicate** - Stakeholder informieren

```bash
# Queue-Backlog überwachen
redis-cli LLEN webhook:queue:pending
```

### 4.3 Database Issues

```bash
# DB Connection Status
psql -U admin -d cargobit_payments -c "SELECT state, COUNT(*) FROM pg_stat_activity GROUP BY state;"

# Long-running Queries killen
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND pid <> pg_backend_pid();
```

### 4.4 Memory/CPU Issues

```bash
# Pod Resource Usage
kubectl top pods -n payments

# Memory Limit erhöhen (falls nötig)
kubectl patch deployment payment-webhook -n payments --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"1Gi"}]'

# Rollout Restart
kubectl rollout restart deployment/payment-webhook -n payments
```

---

## 5. Reprocessing Events

### 5.1 Automatisches Reprocessing

Stripe retryt fehlgeschlagene Webhooks automatisch:
- Sofortiger Retry
- Dann exponential backoff: 1m, 5m, 10m, 30m, 1h, 2h, 4h, 8h
- Max 3 Tage

**Wichtig:** Keine manuellen Aktionen bei transienten Fehlern!

### 5.2 Manuelles Reprocessing

Falls Events manuell reprocessed werden müssen:

#### Option A: Via Reprocess Script

```bash
# Reprocess Script verwenden
node scripts/reprocess_stripe_events.js \
  --event-id evt_xxx \
  --dry-run  # Erst testen!

# Ohne dry-run für echtes Reprocessing
node scripts/reprocess_stripe_events.js \
  --event-id evt_xxx \
  --force
```

#### Option B: Via API Endpoint

```bash
curl -X POST "{{base_url}}/admin/stripe-events/evt_xxx/reprocess" \
  -H "Authorization: Bearer {{admin_jwt}}" \
  -H "Content-Type: application/json"
```

#### Option C: Bulk Reprocessing (Vorsicht!)

```bash
# Alle unverarbeiteten Events der letzten Stunde
node scripts/reprocess_stripe_events.js \
  --unprocessed-only \
  --since "1 hour ago" \
  --dry-run
```

### 5.3 Reprocessing Checklist

- [ ] Event-ID identifiziert
- [ ] Ursache des Fehlers behoben
- [ ] Dry-Run durchgeführt
- [ ] Impact analysiert (zugehörige Payments)
- [ ] Reprocessing ausgeführt
- [ ] Ergebnis verifiziert
- [ ] Audit Log geprüft

---

## 6. Wallet-Korrektur

### 6.1 Doppelte Wallet Transaktionen

**Erkennung:**

```sql
-- Doppelte Wallet Transactions finden
SELECT reference, type, amount_cents, COUNT(*) as cnt
FROM wallet_transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY reference, type, amount_cents
HAVING COUNT(*) > 1;
```

**Korrektur-Schritte:**

1. **Services stoppen** (Webhook + Cron):
   ```bash
   kubectl scale deployment/payment-webhook -n payments --replicas=0
   kubectl scale deployment/reconciliation-cron -n payments --replicas=0
   ```

2. **Reversal Transaction erstellen:**
   ```sql
   BEGIN;

   -- Originale Transaktion identifizieren
   SELECT * FROM wallet_transactions WHERE id = '<duplicate_tx_id>';

   -- Reversal erstellen
   INSERT INTO wallet_transactions (
     wallet_id, type, amount_cents, reference, reference_type, metadata
   ) VALUES (
     '<wallet_id>',
     'reversal',
     -<original_amount_cents>,
     '<reference>',
     'reversal',
     '{"original_tx_id": "<duplicate_tx_id>", "reason": "duplicate_correction"}'::json
   );

   -- Payment refunded_cents korrigieren
   UPDATE payments 
   SET refunded_cents = refunded_cents - <duplicate_amount>
   WHERE id = '<payment_id>';

   COMMIT;
   ```

3. **Services wieder starten:**
   ```bash
   kubectl scale deployment/payment-webhook -n payments --replicas=2
   kubectl scale deployment/reconciliation-cron -n payments --replicas=1
   ```

4. **Reconciliation ausführen:**
   ```bash
   curl -X POST "{{base_url}}/admin/payments/<payment_id>/reconcile" \
     -H "Authorization: Bearer {{admin_jwt}}"
   ```

### 6.2 Falsche Wallet Balance

**Diagnose:**

```sql
-- Wallet Balance berechnen
SELECT
  w.id,
  COALESCE(SUM(wt.amount_cents), 0) as calculated_balance,
  w.balance as stored_balance,
  COALESCE(SUM(wt.amount_cents), 0) - w.balance as diff
FROM wallets w
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
GROUP BY w.id, w.balance
HAVING COALESCE(SUM(wt.amount_cents), 0) <> w.balance;
```

**Korrektur:**

```sql
BEGIN;

-- Balance neu berechnen und korrigieren
UPDATE wallets w
SET balance = calculated.sum
FROM (
  SELECT wallet_id, COALESCE(SUM(amount_cents), 0) as sum
  FROM wallet_transactions
  GROUP BY wallet_id
) calculated
WHERE w.id = calculated.wallet_id
  AND w.balance <> calculated.sum;

COMMIT;
```

---

## 7. Reconciliation Issues

### 7.1 Cron läuft nicht

**Diagnose:**

```bash
# Cron Schedule prüfen
kubectl get cronjobs -n payments

# Last Run prüfen
kubectl logs -l app=reconciliation-cron -n payments --tail=50

# Leader Lock prüfen
redis-cli GET recon:lock:refunds
redis-cli TTL recon:lock:refunds
```

**Lösung:**

```bash
# Falls Lock stale ist, löschen
redis-cli DEL recon:lock:refunds

# Cron manuell triggern
kubectl create job --from=cronjob/reconciliation-cron manual-reconcile-$(date +%s) -n payments

# Oder via API
curl -X POST "{{base_url}}/admin/reconciliation/run" \
  -H "Authorization: Bearer {{admin_jwt}}"
```

### 7.2 Parallele Cron Execution

**Symptome:**
- Duplicate Reconciliation Runs
- Race Conditions

**Diagnose:**

```bash
# Aktive Locks prüfen
redis-cli KEYS "recon:lock:*"

# TTL prüfen
redis-cli TTL recon:lock:refunds
```

**Lösung:**

1. **Lock TTL reduzieren** (in Config)
2. **Stale Locks löschen:**
   ```bash
   redis-cli DEL recon:lock:refunds
   ```
3. **Service Restart:**
   ```bash
   kubectl rollout restart deployment/reconciliation-cron -n payments
   ```

---

## 8. Escalation

### 8.1 Escalation Matrix

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| critical | < 15 min | On-Call → Team Lead → Engineering Manager |
| warning | < 1 hour | On-Call → Team Lead |
| info | < 4 hours | On-Call |

### 8.2 Communication Templates

**Slack Alert (critical):**

```
🚨 INCIDENT: Stripe Webhook Processing Failure

**Severity:** CRITICAL
**Service:** payment-webhook
**Started:** <timestamp>

**Impact:** <X> webhooks failing with 5xx errors
**Affected Payments:** <count>

**Current Actions:**
- Investigating root cause
- <action items>

**Next Update:** <time>
**On-Call:** @<engineer>
```

**Status Page Update:**

```
[Investigating] We are currently experiencing issues with payment webhook processing. 
Some transactions may be delayed. All payments are secure and will be processed once 
the issue is resolved.

Started: <timestamp>
Affected: Payment processing delays
```

### 8.3 Stakeholder Notification

Bei kritischen Incidents:

1. **Internal Slack:** #incidents Channel
2. **Status Page:** status.cargobit.com
3. **Customer Support:** Bei Customer-facing Impact
4. **Management:** Bei prolonged outage > 30 min

---

## 9. Postmortem

### 9.1 Postmortem Template

```markdown
# Incident Report: <Title>

**Date:** YYYY-MM-DD
**Severity:** <severity>
**Duration:** X hours Y minutes
**Author:** <name>

## Summary
<1-2 sentence summary>

## Timeline
| Time | Event |
|------|-------|
| HH:MM | Alert triggered |
| HH:MM | On-call engaged |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Service restored |

## Root Cause
<Detailed technical explanation>

## Impact
- X payments affected
- Y customers impacted
- Z minutes of degraded service

## Resolution
<How the issue was fixed>

## Lessons Learned
1. <What went well>
2. <What could be improved>
3. <Action items>

## Action Items
- [ ] <Action 1> - Owner: @<name> - Due: <date>
- [ ] <Action 2> - Owner: @<name> - Due: <date>
```

### 9.2 Postmortem Checklist

- [ ] Timeline dokumentiert
- [ ] Root Cause identifiziert
- [ ] Impact quantifiziert
- [ ] Resolution dokumentiert
- [ ] Lessons Learned festgehalten
- [ ] Action Items erstellt mit Owners
- [ ] Postmortem Meeting angesetzt
- [ ] Stakeholder informiert

---

## 10. Quick Reference

### 10.1 Important Commands

```bash
# Service Status
kubectl get pods -n payments

# Logs
kubectl logs -l app=payment-webhook -n payments --tail=100 -f

# Service Restart
kubectl rollout restart deployment/payment-webhook -n payments

# Scale Up
kubectl scale deployment/payment-webhook -n payments --replicas=3

# Redis Lock
redis-cli GET recon:lock:refunds
redis-cli DEL recon:lock:refunds
```

### 10.2 Important SQL Queries

```sql
-- Unprocessed events
SELECT COUNT(*) FROM stripe_events WHERE processed = false;

-- Stuck payments
SELECT COUNT(*) FROM payments WHERE status = 'processing';

-- Reconciliation diffs
SELECT COUNT(*) FROM payment_reconciliation_diffs;

-- Recent errors
SELECT * FROM audit_events WHERE event_type LIKE '%error%' ORDER BY created_at DESC LIMIT 20;
```

### 10.3 Important URLs

| Resource | URL |
|----------|-----|
| Grafana Dashboard | https://grafana.internal/d/cargobit-payments |
| Stripe Dashboard | https://dashboard.stripe.com |
| Stripe Status | https://status.stripe.com |
| Sentry Errors | https://sentry.io/cargobit/payments |
| Runbook Wiki | https://wiki.internal/cargobit/runbooks |

### 10.4 Key Metrics Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Webhook Error Rate | > 1% | > 5% |
| Webhook Latency P95 | > 2s | > 5s |
| Unprocessed Events | > 50 | > 100 |
| Stuck Payments | > 10 | > 50 |
| Reconciliation Diffs | > 5 | > 20 |

---

## Appendix A: Contact Information

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| On-Call Engineer | (Rotation) | @oncall-payments | +49-xxx |
| Team Lead | TBD | @teamlead-payments | +49-xxx |
| Engineering Manager | TBD | @eng-manager | +49-xxx |
| Stripe Support | N/A | N/A | support@stripe.com |

---

## Appendix B: Related Documentation

- [Payment Architecture](./architecture/payments.md)
- [Stripe Integration Guide](./integrations/stripe.md)
- [Database Schema](./database/schema.md)
- [API Reference](./api/payments.md)
- [Testing Guide](./testing/e2e-payments.md)
