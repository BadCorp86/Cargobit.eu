# CargoBit Restore Playbook (Extended)
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument beschreibt den erweiterten Restore-Prozess für das CargoBit System. Es stellt sicher, dass Daten zuverlässig und vollständig wiederhergestellt werden können.

---

# 2. Restore Scenarios

| Scenario | Type | Priority |
|----------|------|----------|
| Single table | Partial | P3 |
| Single database | Full | P2 |
| Complete system | Disaster | P1 |
| Point-in-time | PITR | P2 |

---

# 3. Pre-Restore Checklist

- [ ] Incident declared
- [ ] Stakeholders notified
- [ ] Backup identified
- [ ] Target environment prepared
- [ ] Write access frozen (if production)
- [ ] Restore window confirmed

---

# 4. Full Database Restore

## 4.1 Standard Restore

```bash
# 1. Download backup
aws s3 cp s3://backups/database/backup-YYYYMMDD.sql.gz ./

# 2. Verify checksum
sha256sum -c backup-YYYYMMDD.sql.gz.sha256

# 3. Decrypt (if encrypted)
gpg --decrypt backup-YYYYMMDD.sql.gz.gpg > backup.sql.gz

# 4. Decompress
gunzip backup.sql.gz

# 5. Drop existing database
psql -c "DROP DATABASE IF EXISTS cargobit;"

# 6. Create fresh database
psql -c "CREATE DATABASE cargobit;"

# 7. Restore
psql -d cargobit < backup.sql

# 8. Verify
psql -d cargobit -c "SELECT COUNT(*) FROM \"Payment\";"
```

## 4.2 Timeline

| Step | Duration |
|------|----------|
| Download | 5-10 min |
| Decrypt/Decompress | 2-5 min |
| Drop/Create | 1 min |
| Restore | 10-30 min |
| Verify | 5 min |
| **Total** | **25-50 min** |

---

# 5. Point-in-Time Recovery (PITR)

## 5.1 Prerequisites

- WAL archiving enabled
- Base backup available
- WAL files for target period

## 5.2 Process

```bash
# 1. Restore base backup
pg_restore -d cargobit base_backup

# 2. Configure recovery
cat > recovery.conf << EOF
restore_command = 'cp /wal_archive/%f %p'
recovery_target_time = '2024-01-15 10:30:00'
recovery_target_action = 'promote'
EOF

# 3. Start recovery
pg_ctl start

# 4. Verify point-in-time
psql -c "SELECT COUNT(*) FROM \"Payment\" WHERE \"createdAt\" < '2024-01-15 10:30:00';"
```

---

# 6. Partial Restore

## 6.1 Single Table

```bash
# Extract specific table from backup
pg_restore -t "Payment" -d cargobit backup.dump
```

## 6.2 Schema Only

```bash
# Restore schema without data
pg_restore --schema-only -d cargobit backup.dump
```

---

# 7. Validation Steps

## 7.1 Schema Validation

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check constraints
SELECT constraint_name FROM information_schema.table_constraints;

-- Check indexes
SELECT indexname FROM pg_indexes;
```

## 7.2 Data Validation

```sql
-- Count records per table
SELECT 
  table_name,
  (xpath('/row/cnt/text()', query_to_xml(
    'SELECT COUNT(*) as cnt FROM ' || table_name, false, true, ''
  )))[1]::text::int as count
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify ledger integrity
SELECT COUNT(*) FROM "LedgerEntry" 
WHERE balance_after != (
  SELECT balance_after FROM "LedgerEntry" l2 
  WHERE l2."walletId" = "LedgerEntry"."walletId" 
  AND l2."createdAt" < "LedgerEntry"."createdAt" 
  ORDER BY l2."createdAt" DESC LIMIT 1
);
```

## 7.3 Application Validation

- [ ] API health check passes
- [ ] Authentication works
- [ ] Sample queries return expected data
- [ ] Webhook processing works

---

# 8. Post-Restore

## 8.1 Checklist

- [ ] All validation passed
- [ ] Monitoring confirmed
- [ ] Stakeholders notified
- [ ] Writes unfrozen
- [ ] Incident closed

## 8.2 Documentation

- Restore time recorded
- Issues encountered documented
- Lessons learned captured
- Playbook updated if needed

---

# 9. Rollback from Failed Restore

```bash
# If restore fails, revert to previous state

# 1. Stop database
pg_ctl stop

# 2. Restore from previous backup
aws s3 cp s3://backups/database/previous-backup.sql.gz ./

# 3. Restore process
# ... (as above)

# 4. Notify stakeholders of rollback
```

---

# 10. Emergency Contacts

| Role | Contact |
|------|---------|
| On-call SRE | PagerDuty |
| Database Admin | [Contact] |
| Engineering Lead | [Contact] |

---

# 11. Summary

Dieses Playbook stellt sicher, dass Daten zuverlässig und vollständig wiederhergestellt werden können.

---

# 12. Contact

SRE Team
CargoBit Internal
