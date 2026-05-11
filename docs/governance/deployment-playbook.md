# CargoBit Deployment Playbook
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Playbook definiert den Deployment-Prozess für das CargoBit System. Es stellt sicher, dass Deployments reproduzierbar, sicher und rückrollbar sind.

---

# 2. Pre-Deployment Checklist

## 2.1 Code Quality Gates

- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed (2 approvals)
- [ ] Security review completed (if applicable)
- [ ] Documentation updated
- [ ] No TODO/FIXME in code
- [ ] No secrets in code

## 2.2 Pipeline Validation

- [ ] Pipeline green on main branch
- [ ] Determinism validation passed
- [ ] Schema validation passed
- [ ] Webhook validation passed

## 2.3 Infrastructure Readiness

- [ ] Database migrations prepared
- [ ] Environment variables configured
- [ ] Secrets stored in vault
- [ ] Backup completed before deployment

---

# 3. Deployment Steps

## 3.1 Standard Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT WORKFLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. ANNOUNCE                                                 │
│     └── Post deployment notice to #deployments               │
│                                                              │
│  2. BACKUP                                                   │
│     └── Trigger pre-deployment backup                        │
│                                                              │
│  3. FREEZE                                                   │
│     └── Enable maintenance mode (if required)                │
│                                                              │
│  4. DEPLOY                                                   │
│     └── Deploy new version to all services                   │
│                                                              │
│  5. MIGRATE                                                  │
│     └── Run database migrations                              │
│                                                              │
│  6. VALIDATE                                                 │
│     └── Run smoke tests                                      │
│                                                              │
│  7. UNFREEZE                                                 │
│     └── Disable maintenance mode                             │
│                                                              │
│  8. MONITOR                                                  │
│     └── Watch metrics for 30 minutes                         │
│                                                              │
│  9. ANNOUNCE                                                 │
│     └── Post completion notice                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 3.2 Zero-Downtime Deployment

```bash
# 1. Deploy to staging
./scripts/deploy.sh staging

# 2. Run smoke tests
./scripts/smoke-test.sh staging

# 3. Promote to production (blue-green)
./scripts/promote.sh production

# 4. Verify
./scripts/smoke-test.sh production

# 5. Complete
./scripts/complete-deployment.sh
```

---

# 4. Database Migration Strategy

## 4.1 Migration Types

| Type | Risk | Strategy |
|------|------|----------|
| Additive (new table/column) | Low | Deploy code first, then migrate |
| Destructive (drop column) | High | Migrate in 3 phases |
| Data transformation | Medium | Run in transaction |

## 4.2 Safe Migration Pattern

```
Phase 1: Add new column (non-breaking)
         └── Deploy code that writes to both old and new

Phase 2: Backfill data
         └── Migrate existing data to new column

Phase 3: Switch reads
         └── Deploy code that reads from new column

Phase 4: Remove old column
         └── Deploy code without old column references
         └── Drop old column
```

## 4.3 Migration Rollback

| Migration Type | Rollback | Risk |
|----------------|----------|------|
| Add table | Drop table | Data loss |
| Add column | Drop column | Data loss |
| Drop column | Restore from backup | High |
| Data transformation | Restore from backup | High |

---

# 5. Post-Deployment

## 5.1 Smoke Tests

```bash
# API health check
curl -f https://api.cargobit.example.com/health || exit 1

# Database connectivity
./scripts/check-db-connection.sh || exit 1

# Webhook endpoint
curl -f https://api.cargobit.example.com/webhooks/health || exit 1

# Payment flow
./scripts/test-payment-flow.sh || exit 1
```

## 5.2 Monitoring Checklist

- [ ] Error rate < 0.1%
- [ ] Latency p99 < 200ms
- [ ] No new alerts fired
- [ ] Database connections stable
- [ ] Webhook processing normal

---

# 6. Rollback Procedure

## 6.1 Automatic Rollback Triggers

| Trigger | Action |
|---------|--------|
| Error rate > 5% | Automatic rollback |
| Smoke test failure | Automatic rollback |
| Health check failure | Automatic rollback |

## 6.2 Manual Rollback

```bash
# 1. Announce rollback
./scripts/announce-rollback.sh

# 2. Rollback code
./scripts/rollback.sh production --version PREVIOUS_VERSION

# 3. Rollback database (if necessary)
./scripts/rollback-migrations.sh --to PREVIOUS_VERSION

# 4. Verify
./scripts/smoke-test.sh production

# 5. Complete
./scripts/complete-rollback.sh
```

## 6.3 Rollback Decision Matrix

| Scenario | Code Rollback | DB Rollback | Data Restore |
|----------|---------------|-------------|--------------|
| Bug in new code | Yes | No | No |
| Migration failed | Yes | Yes | No |
| Data corruption | Yes | No | Yes |
| Performance issue | Yes | No | No |

---

# 7. Deployment Windows

## 7.1 Standard Windows

| Environment | Window | Approval |
|-------------|--------|----------|
| Staging | Any time | Engineering |
| Production | Tue-Thu 10:00-16:00 CET | Lead Engineer |
| Production (hotfix) | Any time | On-call + Lead |

## 7.2 Freeze Periods

| Period | Reason |
|--------|--------|
| Month-end close | Financial reporting |
| Black Friday | High traffic |
| Major holidays | Reduced staffing |

---

# 8. Communication Templates

## 8.1 Pre-Deployment

```
🚀 Deployment Starting

Service: CargoBit API
Version: v1.2.3
Environment: Production
Time: 2024-01-15 10:00 CET
Expected duration: 15 minutes

Changes:
- Feature: New webhook retry logic
- Fix: Payment timeout handling
- Chore: Dependency updates

Impact: No downtime expected
On-call: @engineer
```

## 8.2 Post-Deployment

```
✅ Deployment Complete

Service: CargoBit API
Version: v1.2.3
Environment: Production
Duration: 12 minutes

Status: All systems operational
Next steps: Monitoring for 30 minutes
```

## 8.3 Rollback

```
⚠️ Rollback Initiated

Service: CargoBit API
From: v1.2.3
To: v1.2.2
Reason: [Reason]
Status: In progress

On-call: @engineer
```

---

# 9. Summary

Dieses Playbook stellt sicher, dass Deployments reproduzierbar, sicher und rückrollbar sind.

---

# 10. Contact

DevOps Team
CargoBit Internal
