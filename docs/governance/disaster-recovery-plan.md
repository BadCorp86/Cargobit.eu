# CargoBit Disaster Recovery Plan
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert den Disaster Recovery Plan (DRP) für das CargoBit System. Es stellt sicher, dass das System nach einem schwerwiegenden Ausfall oder einer Katastrophe wiederhergestellt werden kann.

---

# 2. Disaster Scenarios

## 2.1 Scenario Classification

| Scenario | Severity | Examples |
|----------|----------|----------|
| Minor | SEV-3 | Single server failure, minor data corruption |
| Major | SEV-2 | Database failure, partial outage |
| Critical | SEV-1 | Complete data center failure, ransomware |
| Catastrophic | SEV-0 | Multi-region failure, total data loss |

## 2.2 Recovery Priorities

| Priority | System | RTO | RPO |
|----------|--------|-----|-----|
| P1 | Payment database | 1 hour | 1 hour |
| P1 | Wallet database | 1 hour | 1 hour |
| P2 | Webhook processing | 2 hours | 1 hour |
| P2 | API services | 2 hours | 1 hour |
| P3 | Reporting | 24 hours | 24 hours |

---

# 3. Recovery Procedures

## 3.1 Database Recovery

### Full Database Restore

```bash
# 1. Identify backup to restore
aws s3 ls s3://cargobit-backups/database/

# 2. Download backup
aws s3 cp s3://cargobit-backups/database/backup-YYYYMMDD.sql.gz ./

# 3. Decrypt backup
gpg --decrypt backup-YYYYMMDD.sql.gz.gpg > backup.sql.gz

# 4. Decompress
gunzip backup.sql.gz

# 5. Restore database
psql -h $DB_HOST -U $DB_USER -d cargobit < backup.sql

# 6. Verify
psql -c "SELECT COUNT(*) FROM \"Payment\";"
psql -c "SELECT COUNT(*) FROM \"LedgerEntry\";"
```

### Point-in-Time Recovery

```bash
# 1. Identify recovery point
# 2. Restore base backup
# 3. Apply transaction logs
# 4. Verify integrity
```

## 3.2 Service Recovery

### API Services

```bash
# 1. Pull latest image
docker pull cargobit/api:latest

# 2. Stop existing containers
docker-compose down

# 3. Start new containers
docker-compose up -d

# 4. Health check
curl -f http://localhost:3000/health

# 5. Verify functionality
./scripts/smoke-test.sh
```

### Webhook Processing

```bash
# 1. Check pending events
psql -c "SELECT COUNT(*) FROM \"StripeEvent\" WHERE status = 'pending';"

# 2. Resume processing
./scripts/process-pending-events.sh

# 3. Verify delivery
./scripts/verify-webhook-delivery.sh
```

---

# 4. SEV-1 Recovery Procedure

## 4.1 Immediate Actions (0-15 minutes)

| Time | Action | Owner |
|------|--------|-------|
| T+0 | Alert triggered | On-call |
| T+5 | Incident declared | On-call |
| T+10 | Incident Commander assigned | Lead |
| T+15 | Stakeholders notified | Communications |

## 4.2 Assessment Phase (15-30 minutes)

| Action | Purpose |
|--------|---------|
| Determine scope | Which systems affected |
| Estimate duration | Expected recovery time |
| Identify data loss | RPO assessment |
| Activate DR team | Additional resources |

## 4.3 Recovery Phase (30-60 minutes)

| Step | Action |
|------|--------|
| 1 | Isolate affected systems |
| 2 | Begin database restore |
| 3 | Deploy services to backup region |
| 4 | Restore data integrity |
| 5 | Verify system functionality |

## 4.4 Validation Phase (60-90 minutes)

| Check | Description |
|-------|-------------|
| Data integrity | Ledger balance verification |
| Service health | All endpoints responding |
| Webhook processing | Events being processed |
| External integrations | Stripe connectivity |

---

# 5. Data Validation

## 5.1 Ledger Integrity Check

```sql
-- Verify ledger balances
SELECT 
  w.id as wallet_id,
  w.balance as wallet_balance,
  COALESCE(SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END), 0) as calculated_balance
FROM "Wallet" w
LEFT JOIN "LedgerEntry" l ON w.id = l."walletId"
GROUP BY w.id, w.balance
HAVING w.balance != COALESCE(SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END), 0);
```

## 5.2 Audit Log Chain Validation

```sql
-- Find broken chain links
SELECT a1.id, a1.hash, a2.previous_hash
FROM "AuditLog" a1
LEFT JOIN "AuditLog" a2 ON a1.id = a2.previous_id
WHERE a2.id IS NULL AND a1.previous_id IS NOT NULL;
```

## 5.3 Payment Reconciliation

```sql
-- Find payments without ledger entries
SELECT p.id, p.status, p.amount
FROM "Payment" p
LEFT JOIN "LedgerEntry" l ON p.id = l."referenceId"
WHERE p.status = 'succeeded' AND l.id IS NULL;
```

---

# 6. Roll-Forward Strategy

## 6.1 Pending Transactions

| Type | Action |
|------|--------|
| Pending payments | Check status with Stripe |
| Pending payouts | Verify and retry |
| Pending webhooks | Re-process events |

## 6.2 Reconciliation

```
1. Get list of all transactions during outage
2. Compare with Stripe records
3. Identify discrepancies
4. Create reconciliation entries
5. Update wallet balances
```

---

# 7. Communication Protocol

## 7.1 Internal Communication

| Audience | Channel | Frequency |
|----------|---------|-----------|
| DR Team | War room | Continuous |
| Engineering | Slack | Every 30 min |
| Executive | Email/Phone | Every hour |

## 7.2 External Communication

| Audience | Channel | Timing |
|----------|---------|--------|
| Partners | Email | Within 1 hour |
| Users | Status page | Within 30 min |
| Public | Status page | As needed |

---

# 8. DR Testing

## 8.1 Test Types

| Test | Scope | Frequency |
|------|-------|-----------|
| Backup restore | Database | Weekly |
| Failover | Services | Monthly |
| Full DR drill | All systems | Quarterly |
| Tabletop | Team response | Quarterly |

## 8.2 Test Documentation

| Document | Content |
|----------|---------|
| Test plan | Steps, success criteria |
| Test results | Pass/fail, timing |
| Issues found | Problems, remediation |
| Improvements | Action items |

---

# 9. Third-Party Recovery

## 9.1 Stripe Integration

| Scenario | Recovery |
|----------|----------|
| Stripe down | Queue events for later processing |
| Webhook misses | Reconcile from Stripe API |
| Payment disputes | Manual review process |

## 9.2 Cloud Provider

| Scenario | Recovery |
|----------|----------|
| Region failure | Failover to backup region |
| Service degradation | Scale horizontally |
| Complete outage | Activate offline procedures |

---

# 10. Post-Recovery

## 10.1 Verification Checklist

- [ ] All services operational
- [ ] Database integrity verified
- [ ] Ledger balances correct
- [ ] Webhook processing resumed
- [ ] Monitoring dashboards normal
- [ ] Alerts cleared
- [ ] Status page updated

## 10.2 Postmortem

| Item | Owner | Deadline |
|------|-------|----------|
| Timeline documentation | IC | 24 hours |
| Root cause analysis | Tech Lead | 72 hours |
| Action items | Team | 1 week |
| DRP update | Operations | 2 weeks |

---

# 11. Contact Directory

## 11.1 Internal Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Incident Commander | | | |
| Engineering Lead | | | |
| SRE Lead | | | |
| DBA | | | |

## 11.2 External Contacts

| Provider | Support | Phone |
|----------|---------|-------|
| AWS | Enterprise support | |
| Stripe | Technical support | |
| DNS Provider | Support | |

---

# 12. Summary

Dieser DRP stellt sicher, dass das System nach einem schwerwiegenden Ausfall oder einer Katastrophe wiederhergestellt werden kann.

---

# 13. Contact

SRE Team
CargoBit Internal
