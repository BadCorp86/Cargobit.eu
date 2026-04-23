# Task 4: Reconciliation Deploy Checklist

## Vor dem Deployment

- [ ] **Code Review abgeschlossen**
  - [ ] ReconciliationService implementiert
  - [ ] ReconciliationScheduler implementiert
  - [ ] API Routes erstellt
  - [ ] DTOs validiert

- [ ] **Tests bestanden**
  - [ ] Jest Unit Tests: `npm run test -- --testPathPattern=src/reconciliation`
  - [ ] Lint Check: `npm run lint`
  - [ ] Type Check: `npm run build`

- [ ] **Datenbank-Schema aktuell**
  - [ ] `payout_events` Tabelle existiert
  - [ ] `audit_events` Tabelle existiert
  - [ ] `leader_locks` Tabelle existiert (für Leader Election)

## Deployment

### 1. Helm Values aktualisieren

```bash
# Reconciliation zu values.yaml hinzufügen
cat helm/payments-service/values-reconciliation.yaml >> helm/payments-service/values.yaml
```

### 2. Image bauen und pushen

```bash
# Build
npm run build

# Docker Image
docker build -f Dockerfile.backend -t registry.cargobit.io/payments-backend:v1.1.0 .
docker push registry.cargobit.io/payments-backend:v1.1.0
```

### 3. Helm Deploy

```bash
# Staging
helm upgrade --install payments ./helm/payments-service \
  -n staging \
  --set image.tag=v1.1.0 \
  --set reconciliation.enabled=true \
  --wait --timeout 5m

# Production (nach Staging-Verifikation)
helm upgrade --install payments ./helm/payments-service \
  -n production \
  --set image.tag=v1.1.0 \
  --set reconciliation.enabled=true \
  --wait --timeout 5m
```

### 4. CronJob verifizieren

```bash
# CronJob prüfen
kubectl -n staging get cronjob payments-reconciliation

# CronJob Details
kubectl -n staging describe cronjob payments-reconciliation

# Manual Trigger
kubectl -n staging create job --from=cronjob/payments-reconciliation \
  temp-recon-$(date +%s)

# Logs prüfen
kubectl -n staging logs -l app=payments-reconciliation --tail=100
```

## Post-Deployment Verifikation

### 5. API Endpoints testen

```bash
# Health Check
curl -k https://payments.staging.cargobit.io/api/health

# List Open Payouts (mit Admin JWT)
curl -H "Authorization: Bearer $ADMIN_JWT" \
  https://payments.staging.cargobit.io/api/admin/reconciliation/open

# Reconciliation Report
curl -H "Authorization: Bearer $ADMIN_JWT" \
  https://payments.staging.cargobit.io/api/admin/reconciliation/report

# Manual Trigger
curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  https://payments.staging.cargobit.io/api/admin/reconciliation/trigger
```

### 6. Newman E2E Tests

```bash
# Postman Collection ausführen
newman run postman/postman_reconciliation.json \
  -e postman/postman_env_staging.json \
  --reporters cli,junit \
  --reporter-junit-export reports/newman-reconciliation.xml
```

### 7. Datenbank-Verifikation

```sql
-- Prüfe Payout Events
SELECT * FROM payout_events 
WHERE type = 'manual_mark' 
ORDER BY created_at DESC LIMIT 10;

-- Prüfe Audit Events
SELECT * FROM audit_events 
WHERE action = 'reconciliation.mark' 
ORDER BY created_at DESC LIMIT 10;

-- Prüfe Leader Locks
SELECT * FROM leader_locks WHERE key = 'reconciliation:leader';
```

### 8. Idempotency Tests

```bash
# Gleiche Markierung zweimal ausführen (sollte idempotent sein)
for i in 1 2; do
  curl -X POST \
    -H "Authorization: Bearer $ADMIN_JWT" \
    -H "Content-Type: application/json" \
    -d '{"status":"needs_review","note":"Idempotency test"}' \
    https://payments.staging.cargobit.io/api/admin/reconciliation/$PAYOUT_ID/mark
  echo "Run $i complete"
  sleep 1
done

# Prüfe Events (sollte nur 1 Event geben)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM payout_events WHERE payout_id = '$PAYOUT_ID' AND type = 'manual_mark'"
```

## Monitoring

### 9. Alerts konfigurieren

```yaml
# Zu Prometheus Rules hinzufügen
- alert: ReconciliationCronJobFailed
  expr: kube_job_failed{job_name=~"payments-reconciliation.*"} > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Reconciliation CronJob failed"
    description: "The reconciliation CronJob has failed in namespace {{ $labels.namespace }}"
```

### 10. Dashboard aktualisieren

- [ ] Grafana Dashboard um Reconciliation Metrics erweitern
- [ ] Total Open Payouts Panel
- [ ] Reconciliation Duration Panel
- [ ] Diffs Found Panel

## Rollback

### Bei Problemen

```bash
# CronJob deaktivieren
kubectl -n staging patch cronjob payments-reconciliation \
  -p '{"spec":{"suspend":true}}'

# Zu vorheriger Version zurückkehren
helm rollback payments -n staging

# Logs für Debugging
kubectl -n staging logs -l app=payments-reconciliation --previous
```

## Dokumentation

- [ ] CHANGELOG.md aktualisieren
- [ ] API Dokumentation erweitern (OpenAPI)
- [ ] Runbook für Reconciliation erstellen
- [ ] Audit Log Eintrag in `docs/secret-rotation-audit.md`

## Sign-off

| Rolle | Name | Datum | Unterschrift |
|-------|------|-------|--------------|
| Developer | | | |
| Reviewer | | | |
| Ops | | | |

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Notes:** _________________________________________________________________
