# CargoBit Schema Evolution Strategy
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert die Strategie für die Evolution des Datenbankschemas im CargoBit System. Es stellt sicher, dass Schema-Änderungen sicher und rückwärtskompatibel sind.

---

# 2. Evolution Principles

| Principle | Description |
|-----------|-------------|
| Additive by default | Add, don't remove |
| No breaking changes | Maintain compatibility |
| Backward compatible | Old code works with new schema |
| Forward compatible | New code works with old schema |
| Reversible | Can rollback if needed |

---

# 3. Safe Schema Changes

## 3.1 Always Safe

| Change | Example |
|--------|---------|
| Add table | CREATE TABLE "NewTable" |
| Add column (nullable) | ALTER TABLE ADD COLUMN nullable |
| Add index | CREATE INDEX ... |
| Add constraint (validated) | ALTER TABLE ADD CONSTRAINT ... |

## 3.2 Safe with Care

| Change | Requirements |
|--------|--------------|
| Add column (non-null) | Provide default value |
| Rename column | Multi-step process |
| Change data type | Compatible types |

## 3.3 Dangerous (Avoid)

| Change | Risk |
|--------|------|
| Drop column | Data loss |
| Drop table | Data loss |
| Rename table | Breaking change |
| Change column type | Data loss |

---

# 4. Multi-Step Migration Pattern

## 4.1 Adding a Required Field

### Step 1: Add as Nullable

```sql
-- Migration 001
ALTER TABLE "Payment" ADD COLUMN "newField" TEXT;
```

```typescript
// Application code writes both old and new
await db.payment.update({
  where: { id },
  data: { 
    oldField: value,
    newField: value 
  }
});
```

### Step 2: Backfill Data

```sql
-- Migration 002
UPDATE "Payment" SET "newField" = "oldField" WHERE "newField" IS NULL;
```

### Step 3: Switch Reads

```typescript
// Application code reads from new field
const payment = await db.payment.findFirst({
  select: { newField: true }
});
```

### Step 4: Add Constraint

```sql
-- Migration 003
ALTER TABLE "Payment" ALTER COLUMN "newField" SET NOT NULL;
```

### Step 5: Remove Old (Optional)

```sql
-- Migration 004 (after verifying application)
ALTER TABLE "Payment" DROP COLUMN "oldField";
```

---

# 5. Schema Versioning

## 5.1 Migration Files

```
migrations/
├── 001_initial_schema.sql
├── 002_add_audit_log.sql
├── 003_add_stripe_events.sql
└── ...
```

## 5.2 Migration Table

```sql
CREATE TABLE "_migration" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);
```

---

# 6. Migration Execution

## 6.1 Prisma Migrations

```bash
# Create migration
npx prisma migrate dev --name add_new_field

# Apply to production
npx prisma migrate deploy
```

## 6.2 Manual SQL

```bash
# Apply migration
psql -f migrations/004_add_new_field.sql cargobit

# Record migration
psql -c "INSERT INTO _migration (name) VALUES ('004_add_new_field')"
```

---

# 7. Rollback Strategy

## 7.1 Reversible Migrations

```sql
-- Up migration
ALTER TABLE "Payment" ADD COLUMN "newField" TEXT;

-- Down migration
ALTER TABLE "Payment" DROP COLUMN "newField";
```

## 7.2 Rollback Process

```bash
# Rollback last migration
psql -f migrations/004_add_new_field_down.sql cargobit
psql -c "DELETE FROM _migration WHERE name = '004_add_new_field'"
```

---

# 8. Zero-Downtime Migrations

## 8.1 Requirements

- No table locks
- No blocking writes
- Compatible with running application

## 8.2 Techniques

| Technique | Description |
|-----------|-------------|
| Online DDL | Use PostgreSQL online DDL |
| Background migration | Migrate data gradually |
| Dual-write | Write to both old and new |

---

# 9. Monitoring

## 9.1 Schema Metrics

| Metric | Alert |
|--------|-------|
| Migration duration | > 5 min |
| Lock wait time | > 1 min |
| Table bloat | > 20% |

## 9.2 Post-Migration Verification

```sql
-- Verify schema
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public';

-- Verify constraints
SELECT constraint_name 
FROM information_schema.table_constraints;

-- Verify indexes
SELECT indexname FROM pg_indexes;
```

---

# 10. Summary

Dieses Dokument definiert die Strategie für die Evolution des Datenbankschemas.

---

# 11. Contact

Engineering Team
CargoBit Internal
