# CargoBit Data Migration Playbook
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument beschreibt den Prozess für Datenmigrationen im CargoBit System. Es stellt sicher, dass Migrationen sicher, nachvollziehbar und rückrollbar sind.

---

# 2. Migration Types

| Type | Description | Risk |
|------|-------------|------|
| Schema migration | Database structure changes | Medium |
| Data migration | Data transformation | High |
| System migration | Complete system move | Very High |

---

# 3. Migration Process

## 3.1 Preparation

| Step | Description |
|------|-------------|
| 1 | Define migration scope |
| 2 | Create migration plan |
| 3 | Estimate data volume |
| 4 | Plan rollback strategy |
| 5 | Schedule migration window |

## 3.2 Execution

```
┌─────────────────────────────────────────────────────────────┐
│                    MIGRATION WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. ANNOUNCE                                                │
│      └── Notify stakeholders                                 │
│                                                              │
│   2. FREEZE                                                  │
│      └── Stop writes to affected data                        │
│                                                              │
│   3. BACKUP                                                  │
│      └── Create pre-migration backup                         │
│                                                              │
│   4. EXPORT                                                  │
│      └── Extract data from source                            │
│                                                              │
│   5. TRANSFORM                                               │
│      └── Apply transformations                               │
│                                                              │
│   6. VALIDATE                                                │
│      └── Verify transformed data                             │
│                                                              │
│   7. IMPORT                                                  │
│      └── Load data to destination                            │
│                                                              │
│   8. VERIFY                                                  │
│      └── Validate final state                                │
│                                                              │
│   9. UNFREEZE                                                │
│      └── Resume normal operations                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# 4. Schema Migration

## 4.1 Additive Changes (Safe)

```sql
-- Add new column (non-breaking)
ALTER TABLE "Payment" ADD COLUMN "metadata" JSONB DEFAULT '{}';

-- Add new index
CREATE INDEX idx_payment_status ON "Payment"(status);
```

## 4.2 Destructive Changes (Require Care)

```sql
-- Step 1: Add new column
ALTER TABLE "Payment" ADD COLUMN "newField" TEXT;

-- Step 2: Migrate data
UPDATE "Payment" SET "newField" = "oldField";

-- Step 3: Update application to use new field
-- (Deploy application changes)

-- Step 4: Remove old column (after verification)
ALTER TABLE "Payment" DROP COLUMN "oldField";
```

---

# 5. Data Migration

## 5.1 Export

```bash
# Export data
pg_dump -t "Payment" cargobit > payments_export.sql

# Or CSV format
psql -c "COPY (SELECT * FROM \"Payment\") TO STDOUT WITH CSV HEADER" \
  > payments.csv
```

## 5.2 Transform

```python
# transform.py
import csv

def transform_row(row):
    # Apply transformations
    row['new_field'] = transform(row['old_field'])
    return row

with open('payments.csv', 'r') as infile, \
     open('payments_transformed.csv', 'w') as outfile:
    reader = csv.DictReader(infile)
    writer = csv.DictWriter(outfile, fieldnames=reader.fieldnames + ['new_field'])
    writer.writeheader()
    for row in reader:
        writer.writerow(transform_row(row))
```

## 5.3 Validate

```sql
-- Check counts
SELECT COUNT(*) FROM source_table;
SELECT COUNT(*) FROM destination_table;

-- Check samples
SELECT * FROM destination_table ORDER BY RANDOM() LIMIT 100;
```

## 5.4 Import

```bash
# Import data
psql -c "COPY \"Payment\" FROM STDIN WITH CSV HEADER" < payments_transformed.csv
```

---

# 6. Rollback Strategy

## 6.1 Pre-Migration Backup

```bash
# Create backup
pg_dump cargobit > pre_migration_backup.sql
```

## 6.2 Rollback Procedure

```bash
# 1. Stop application
kubectl scale deployment api --replicas=0

# 2. Restore from backup
psql cargobit < pre_migration_backup.sql

# 3. Verify
psql -c "SELECT COUNT(*) FROM \"Payment\";"

# 4. Resume application
kubectl scale deployment api --replicas=2
```

---

# 7. Migration Checklist

## 7.1 Pre-Migration

- [ ] Migration plan documented
- [ ] Stakeholders notified
- [ ] Backup created
- [ ] Rollback plan tested
- [ ] Migration window confirmed

## 7.2 During Migration

- [ ] Writes frozen
- [ ] Export completed
- [ ] Transform completed
- [ ] Validation passed
- [ ] Import completed

## 7.3 Post-Migration

- [ ] Data verified
- [ ] Application tested
- [ ] Writes resumed
- [ ] Stakeholders notified
- [ ] Documentation updated

---

# 8. Summary

Dieses Dokument beschreibt den Prozess für Datenmigrationen im CargoBit System.

---

# 9. Contact

Engineering Team
CargoBit Internal
