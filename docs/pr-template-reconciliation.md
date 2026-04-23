# PR Template: Task 4 Reconciliation API + Cron

## Title
```
feat(reconciliation): Task 4 Reconciliation API + Cron
```

## Summary

Adds ReconciliationModule with admin endpoints, reconciliation scheduler, Helm CronJob, Postman collection and unit tests.

**Implements:**
- `GET /admin/reconciliation/open` - List open payouts
- `POST /admin/reconciliation/{id}/mark` - Manually mark payout status
- ReconciliationScheduler CronJob (default every 6 hours)
- Helm template for reconciliation CronJob
- Postman collection for E2E testing
- Jest unit test skeleton

## Why

Provides automated reconciliation and manual review flow for payouts. Enables scheduled comparison with external provider and audit trail.

## Acceptance Criteria

- [ ] `GET /admin/reconciliation/open` returns open payouts
- [ ] `POST /admin/reconciliation/{id}/mark` updates payout status and creates `payout_event` + `audit_event`
- [ ] CronJob `payments-reconciliation` exists in staging and can be triggered manually
- [ ] Newman E2E collection passes in staging
- [ ] Unit tests for ReconciliationService pass
- [ ] Prometheus metrics exposed: `reconciliation_runs_total`, `reconciliation_open_payouts_gauge`, `reconciliation_duration_seconds`
- [ ] Grafana dashboard imported and panels show data

## How to test locally

### 1. Build and run tests
```bash
npm ci
npm run build
npm run test -- --testPathPattern=src/reconciliation
```

### 2. Run backend locally
```bash
# Apply patch or checkout branch
git apply patches/task4_reconciliation.patch
git add .
git commit -m "test: apply reconciliation patch"

# Start backend with local DB
docker-compose up -d postgres redis
npm run dev
```

### 3. Test with Postman
Import `postman/postman_reconciliation.json` and run against local backend.

```bash
# Or with Newman
newman run postman/postman_reconciliation.json \
  -e postman_env_local.json \
  --reporters cli
```

## Staging deploy steps

### 1. Ensure secrets present
```bash
kubectl -n staging get secret payments-secrets
# Must contain: STRIPE_SECRET_KEY, DATABASE_URL, REDIS_HOST, JWT_SECRET
```

### 2. Helm upgrade
```bash
helm upgrade --install payments ./helm/payments-service \
  --namespace staging \
  --values helm/payments-service/values.yaml \
  --values helm/payments-service/values-reconciliation.yaml \
  --wait --timeout 5m
```

### 3. Verify CronJob
```bash
kubectl -n staging get cronjob payments-reconciliation
kubectl -n staging describe cronjob payments-reconciliation
```

### 4. Trigger manual job and check logs
```bash
# Create manual job
kubectl -n staging create job --from=cronjob/payments-reconciliation manual-recon-$(date +%s)

# Get pod and logs
kubectl -n staging logs -l app=payments-reconciliation --tail=100
```

### 5. Run Newman E2E
```bash
newman run postman/postman_reconciliation.json \
  -e postman_env_staging.json \
  --reporters cli,junit \
  --reporter-junit-export reports/newman-reconciliation.xml
```

### 6. Verify DB events
```sql
-- Check payout events
SELECT * FROM payout_events WHERE type = 'manual_mark' ORDER BY created_at DESC LIMIT 10;

-- Check audit events
SELECT * FROM audit_events WHERE action = 'reconciliation.mark' ORDER BY created_at DESC LIMIT 10;
```

## Rollback plan

1. **Revert PR**:
   ```bash
   git revert <commit-sha>
   git push origin main
   ```

2. **Helm rollback**:
   ```bash
   helm rollback payments <previous-revision> -n staging
   ```

3. **Reapply previous sealed secrets** if necessary:
   ```bash
   kubectl apply -f kubernetes/sealedsecret-payments-previous.yaml
   ```

## Suggested Reviewers

| Role | Focus Area |
|------|------------|
| @backend-lead | Code + DB transactions |
| @payments-eng | Business logic + Stripe integration |
| @devops | Helm, CronJob, RBAC |
| @oncall | Monitoring + alerts |

## Notes

- The reconciliation logic in this PR is a scaffold. Before production enablement, implement:
  - Provider adapters (Stripe/bank API)
  - Idempotency safeguards
  - Additional DB constraints

- **Important**: Add `ux_wallet_transactions_reference_type` unique index before enabling automatic wallet writes:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS ux_wallet_transactions_reference_type
  ON wallet_transactions (reference, type) WHERE reference IS NOT NULL;
  ```

## Files changed

```
patches/task4_reconciliation.patch
src/reconciliation/
├── reconciliation.module.ts
├── controllers/
│   └── reconciliation.controller.ts
├── services/
│   └── reconciliation.service.ts
├── dto/
│   └── mark-payout.dto.ts
├── reconciliation/
│   └── reconciliation.scheduler.ts
└── __tests__/
    └── reconciliation.service.spec.ts
helm/payments-service/
├── templates/
│   └── reconciliation-cronjob.yaml
└── values-reconciliation.yaml
postman/postman_reconciliation.json
observability/grafana/dashboards/reconciliation-prometheus.json
```

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests added and passing
- [ ] Local testing completed
- [ ] Staging deployment verified
