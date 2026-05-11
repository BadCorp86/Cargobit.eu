# CargoBit Operational Runbook Index
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument führt alle operativen Runbooks für das CargoBit System. Es dient als zentrale Referenz für SRE und On-Call-Teams.

---

# 2. Runbook Categories

| Category | Description |
|----------|-------------|
| Backup & Restore | Data protection procedures |
| Webhook Operations | Webhook processing issues |
| Database Operations | Database-related procedures |
| Security Operations | Security incident procedures |
| Performance | Performance troubleshooting |
| Partner Operations | Partner-related issues |

---

# 3. Backup & Restore

## 3.1 Backup Runbooks

| Runbook | Location | Trigger |
|---------|----------|---------|
| Daily Backup | ops/runbooks/backup-daily.md | Scheduled |
| Manual Backup | ops/runbooks/backup-manual.md | Pre-deployment |
| Backup Verification | ops/runbooks/backup-verify.md | Daily check |

## 3.2 Restore Runbooks

| Runbook | Location | Trigger |
|---------|----------|---------|
| Full Restore | ops/runbooks/restore-full.md | Data loss |
| Point-in-Time Restore | ops/runbooks/restore-pitr.md | Data corruption |
| Partial Restore | ops/runbooks/restore-partial.md | Single table issue |

---

# 4. Webhook Operations

| Runbook | Location | Trigger |
|---------|----------|---------|
| Webhook Failures | ops/runbooks/webhook-failures.md | High failure rate |
| Signature Validation | ops/runbooks/webhook-signature.md | Validation errors |
| Duplicate Events | ops/runbooks/webhook-duplicates.md | Duplicate processing |
| Retry Queue | ops/runbooks/webhook-retry.md | Queue backlog |

---

# 5. Database Operations

| Runbook | Location | Trigger |
|---------|----------|---------|
| DB Connection Issues | ops/runbooks/db-connection.md | Connection errors |
| Slow Queries | ops/runbooks/db-slow-queries.md | Performance issues |
| DB Locks | ops/runbooks/db-locks.md | Lock wait timeouts |
| Ledger Integrity | ops/runbooks/ledger-integrity.md | Balance mismatch |
| Schema Migration | ops/runbooks/db-migration.md | Migration failures |

---

# 6. Security Operations

| Runbook | Location | Trigger |
|---------|----------|---------|
| API Key Compromise | ops/runbooks/security-api-key.md | Key exposure |
| Rate Limit Abuse | ops/runbooks/security-rate-limit.md | Abuse detection |
| Unauthorized Access | ops/runbooks/security-access.md | Access violations |
| Audit Log Tampering | ops/runbooks/security-audit.md | Integrity failure |

---

# 7. Performance

| Runbook | Location | Trigger |
|---------|----------|---------|
| High Latency | ops/runbooks/perf-latency.md | p99 > threshold |
| Memory Issues | ops/runbooks/perf-memory.md | OOM errors |
| CPU Saturation | ops/runbooks/perf-cpu.md | High CPU |
| Connection Pool | ops/runbooks/perf-connections.md | Pool exhaustion |

---

# 8. Partner Operations

| Runbook | Location | Trigger |
|---------|----------|---------|
| Partner Integration Issue | ops/runbooks/partner-integration.md | Partner report |
| Partner Rate Limit | ops/runbooks/partner-rate-limit.md | Limit exceeded |
| Partner Onboarding | ops/runbooks/partner-onboarding.md | New partner |

---

# 9. Incident Response

| Runbook | Location | Trigger |
|---------|----------|---------|
| SEV-1 Response | ops/runbooks/incident-sev1.md | Major outage |
| SEV-2 Response | ops/runbooks/incident-sev2.md | Partial outage |
| SEV-3 Response | ops/runbooks/incident-sev3.md | Minor issue |
| Communication | ops/runbooks/incident-communication.md | Any incident |
| Postmortem | ops/runbooks/incident-postmortem.md | After resolution |

---

# 10. Accessing Runbooks

## 10.1 Locations

| Environment | Location |
|-------------|----------|
| Production | Internal wiki + Git repo |
| Offline | PDF exports available |

## 10.2 Quick Reference

```bash
# List all runbooks
ls ops/runbooks/

# Search runbooks
grep -r "keyword" ops/runbooks/

# View specific runbook
cat ops/runbooks/backup-daily.md
```

---

# 11. Runbook Template

```markdown
# [Runbook Title]

## Symptoms
[What indicates this issue]

## Impact
[What is affected]

## Diagnosis
1. [Step 1]
2. [Step 2]

## Resolution
1. [Step 1]
2. [Step 2]

## Escalation
[When and who to escalate to]

## Related Runbooks
[Links to related runbooks]
```

---

# 12. Summary

Dieses Dokument führt alle operativen Runbooks für das CargoBit System.

---

# 13. Contact

SRE Team
CargoBit Internal
