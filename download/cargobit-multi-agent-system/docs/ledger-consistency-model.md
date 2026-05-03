# CargoBit Ledger Consistency Model
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert das Ledger-Konsistenzmodell für das CargoBit System. Es stellt sicher, dass alle finanziellen Transaktionen korrekt, vollständig und konsistent sind.

---

# 2. Ledger Architecture

## 2.1 Principles

| Principle | Description |
|-----------|-------------|
| Immutability | Ledger entries can never be modified or deleted |
| Double-Entry | Every transaction has equal debits and credits |
| Auditability | All entries are traceable and verifiable |
| Consistency | Wallet balances always match ledger entries |

## 2.2 Tables

### LedgerEntry

```sql
CREATE TABLE "LedgerEntry" (
  id TEXT PRIMARY KEY,
  walletId TEXT NOT NULL REFERENCES "Wallet"(id),
  type TEXT NOT NULL, -- 'CREDIT' or 'DEBIT'
  amount INTEGER NOT NULL,
  reference TEXT NOT NULL,
  referenceType TEXT NOT NULL, -- 'PAYMENT', 'PAYOUT', 'ADJUSTMENT'
  balance_after INTEGER NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX idx_ledger_wallet ON "LedgerEntry"("walletId");
CREATE INDEX idx_ledger_reference ON "LedgerEntry"(reference);
CREATE INDEX idx_ledger_created ON "LedgerEntry"("createdAt");
```

### Wallet

```sql
CREATE TABLE "Wallet" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

# 3. Double-Entry Model

## 3.1 Transaction Types

| Transaction | Credit | Debit |
|-------------|--------|-------|
| Payment | User wallet | Settlement account |
| Payout | Settlement account | User wallet |
| Fee | Fee account | User wallet |
| Adjustment | As applicable | As applicable |

## 3.2 Entry Structure

```
Payment Success:
┌─────────────────┬────────┬────────┐
│ Account         │ Debit  │ Credit │
├─────────────────┼────────┼────────┤
│ User Wallet     │        │ 1000   │
│ Settlement      │ 1000   │        │
├─────────────────┼────────┼────────┤
│ Total           │ 1000   │ 1000   │
└─────────────────┴────────┴────────┘

Payout:
┌─────────────────┬────────┬────────┐
│ Account         │ Debit  │ Credit │
├─────────────────┼────────┼────────┤
│ User Wallet     │ 500    │        │
│ Settlement      │        │ 500    │
├─────────────────┼────────┼────────┤
│ Total           │ 500    │ 500    │
└─────────────────┴────────┴────────┘
```

---

# 4. Consistency Rules

## 4.1 Balance Consistency

```
Wallet Balance = Sum of all CREDIT entries - Sum of all DEBIT entries
```

## 4.2 Referential Integrity

- Every ledger entry must reference a valid wallet
- Every entry must reference a source transaction (payment, payout, etc.)
- No orphan entries allowed

## 4.3 Temporal Consistency

- Entries are ordered by timestamp
- Balance_after must equal previous balance + credit - debit
- No future-dated entries

---

# 5. Consistency Checks

## 5.1 Balance Verification

```sql
-- Verify all wallet balances
SELECT 
  w.id as wallet_id,
  w.balance as stored_balance,
  COALESCE(
    SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END),
    0
  ) as calculated_balance,
  w.balance - COALESCE(
    SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END),
    0
  ) as difference
FROM "Wallet" w
LEFT JOIN "LedgerEntry" l ON w.id = l."walletId"
GROUP BY w.id, w.balance
HAVING w.balance != COALESCE(
  SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END),
  0
);
```

## 5.2 Running Balance Verification

```sql
-- Verify running balances are correct
WITH entries_with_prev AS (
  SELECT 
    l.*,
    LAG(l.balance_after) OVER (
      PARTITION BY l."walletId" 
      ORDER BY l."createdAt"
    ) as prev_balance
  FROM "LedgerEntry" l
)
SELECT 
  id,
  "walletId",
  type,
  amount,
  prev_balance,
  balance_after,
  CASE 
    WHEN prev_balance IS NULL THEN balance_after
    WHEN type = 'CREDIT' THEN prev_balance + amount
    ELSE prev_balance - amount
  END as expected_balance
FROM entries_with_prev
WHERE prev_balance IS NOT NULL
  AND balance_after != CASE 
    WHEN type = 'CREDIT' THEN prev_balance + amount
    ELSE prev_balance - amount
  END;
```

## 5.3 Duplicate Detection

```sql
-- Find potential duplicate entries
SELECT 
  "walletId",
  reference,
  referenceType,
  COUNT(*) as entry_count
FROM "LedgerEntry"
GROUP BY "walletId", reference, referenceType
HAVING COUNT(*) > 1;
```

---

# 6. Reconciliation Process

## 6.1 Daily Reconciliation

| Step | Description |
|------|-------------|
| 1 | Calculate sum of all ledger entries |
| 2 | Compare with wallet balances |
| 3 | Identify discrepancies |
| 4 | Generate reconciliation report |
| 5 | Alert if discrepancies found |

## 6.2 Reconciliation Query

```sql
-- Full reconciliation
WITH wallet_totals AS (
  SELECT 
    "walletId",
    SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END) as total_credits,
    SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
    COUNT(*) as entry_count
  FROM "LedgerEntry"
  WHERE "createdAt" >= CURRENT_DATE - INTERVAL '1 day'
  GROUP BY "walletId"
)
SELECT 
  w.id,
  w.balance,
  wt.total_credits,
  wt.total_debits,
  wt.total_credits - wt.total_debits as net_change,
  wt.entry_count
FROM "Wallet" w
LEFT JOIN wallet_totals wt ON w.id = wt."walletId"
ORDER BY w.id;
```

---

# 7. Error Detection & Correction

## 7.1 Error Types

| Error | Detection | Correction |
|-------|-----------|------------|
| Balance mismatch | Daily reconciliation | Adjustment entry |
| Missing entry | Transaction comparison | Backfill entry |
| Duplicate entry | Duplicate detection | Mark duplicate, reverse |
| Orphan entry | Referential check | Investigate, correct |

## 7.2 Correction Process

```
1. Identify discrepancy
   └── Reconciliation query identifies mismatch

2. Investigate root cause
   └── Trace transactions, check logs

3. Create correction entry
   └── Adjustment entry with documentation

4. Document
   └── Record reason, approver, evidence

5. Verify
   └── Re-run reconciliation
```

## 7.3 Adjustment Entries

```sql
-- Create adjustment entry
INSERT INTO "LedgerEntry" (
  id, "walletId", type, amount, reference, 
  "referenceType", balance_after, created_by
) VALUES (
  'adj_abc123',
  'wallet_xyz',
  'CREDIT', -- or 'DEBIT'
  100,
  'ADJ-2024-001',
  'ADJUSTMENT',
  (SELECT balance FROM "Wallet" WHERE id = 'wallet_xyz') + 100,
  'system'
);

-- Update wallet balance
UPDATE "Wallet" 
SET balance = balance + 100, "updatedAt" = NOW()
WHERE id = 'wallet_xyz';
```

---

# 8. Audit Trail

## 8.1 Audit Requirements

| Requirement | Implementation |
|-------------|----------------|
| Immutable entries | INSERT-only table |
| Timestamp | CreatedAt field |
| Actor | Created_by field |
| Reference | Reference field |
| Balance proof | Balance_after field |

## 8.2 Audit Queries

```sql
-- Transaction history for a wallet
SELECT 
  l.id,
  l.type,
  l.amount,
  l.balance_after,
  l.reference,
  l.referenceType,
  l.createdAt
FROM "LedgerEntry" l
WHERE l."walletId" = 'wallet_xyz'
ORDER BY l.createdAt DESC;

-- Transaction by reference
SELECT * FROM "LedgerEntry" WHERE reference = 'pay_abc123';
```

---

# 9. Performance Considerations

## 9.1 Indexing Strategy

| Index | Purpose |
|-------|---------|
| walletId | Fast wallet queries |
| reference | Fast reference lookups |
| createdAt | Time-range queries |
| Composite (walletId, createdAt) | Balance history |

## 9.2 Partitioning (Future)

```
Partition by time (monthly):
- ledger_entries_2024_01
- ledger_entries_2024_02
- ...
```

---

# 10. Monitoring

## 10.1 Metrics

| Metric | Description |
|--------|-------------|
| ledger.entries.total | Total ledger entries |
| ledger.entries.by_type | Entries by type (credit/debit) |
| ledger.balance.total | Sum of all wallet balances |
| reconciliation.discrepancies | Count of discrepancies |

## 10.2 Alerts

| Alert | Threshold |
|-------|-----------|
| Balance mismatch | Any discrepancy |
| Reconciliation failure | Failure to complete |
| High entry rate | > 1000 entries/minute |

---

# 11. Summary

Dieses Modell stellt sicher, dass alle finanziellen Transaktionen korrekt, vollständig und konsistent sind.

---

# 12. Contact

Backend Team
CargoBit Internal
