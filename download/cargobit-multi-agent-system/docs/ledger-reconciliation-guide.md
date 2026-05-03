# CargoBit Ledger Reconciliation Guide
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument beschreibt den Prozess für die Abstimmung (Reconciliation) des Ledgers. Es stellt sicher, dass alle finanziellen Aufzeichnungen korrekt und konsistent sind.

---

# 2. Reconciliation Types

| Type | Frequency | Scope |
|------|-----------|-------|
| Balance Check | Daily | Wallet balances vs ledger |
| Transaction Match | Daily | Payments vs ledger entries |
| Full Reconciliation | Weekly | All records verified |
| Audit Reconciliation | Quarterly | Compliance verification |

---

# 3. Daily Balance Check

## 3.1 Purpose

Verify wallet balances match ledger sums.

## 3.2 Query

```sql
-- Find wallets with balance mismatches
SELECT 
  w.id as wallet_id,
  w.balance as wallet_balance,
  COALESCE(
    SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE -l.amount END),
    0
  ) as ledger_balance,
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

## 3.3 Expected Result

- Zero rows returned = All balances correct
- Any rows = Investigate discrepancies

---

# 4. Transaction Matching

## 4.1 Payment-to-Ledger Match

```sql
-- Find payments without ledger entries
SELECT p.id, p.status, p.amount
FROM "Payment" p
LEFT JOIN "LedgerEntry" l ON p.id = l.reference AND l."referenceType" = 'PAYMENT'
WHERE p.status = 'succeeded' AND l.id IS NULL;
```

## 4.2 Payout-to-Ledger Match

```sql
-- Find payouts without ledger entries
SELECT p.id, p.status, p.amount
FROM "Payout" p
LEFT JOIN "LedgerEntry" l ON p.id = l.reference AND l."referenceType" = 'PAYOUT'
WHERE p.status = 'succeeded' AND l.id IS NULL;
```

---

# 5. Full Reconciliation Process

## 5.1 Step 1: Balance Verification

```bash
./scripts/recon-check-balances.sh
```

Expected output: All wallets balanced.

## 5.2 Step 2: Entry Verification

```bash
./scripts/recon-check-entries.sh
```

Checks:
- All payments have ledger entries
- All payouts have ledger entries
- No orphan ledger entries

## 5.3 Step 3: Running Balance Verification

```sql
-- Verify running balance is correct for each entry
WITH entries_with_prev AS (
  SELECT 
    l.*,
    LAG(l."balanceAfter") OVER (
      PARTITION BY l."walletId" 
      ORDER BY l."createdAt"
    ) as prev_balance
  FROM "LedgerEntry" l
)
SELECT id, "walletId", type, amount, prev_balance, "balanceAfter"
FROM entries_with_prev
WHERE prev_balance IS NOT NULL
  AND "balanceAfter" != CASE 
    WHEN type = 'CREDIT' THEN prev_balance + amount
    ELSE prev_balance - amount
  END;
```

## 5.4 Step 4: Cross-System Verification

Compare with Stripe records:

```bash
./scripts/recon-stripe-compare.sh --date 2024-01-15
```

---

# 6. Handling Discrepancies

## 6.1 Types of Discrepancies

| Type | Description | Priority |
|------|-------------|----------|
| Missing entry | Ledger entry not created | High |
| Duplicate entry | Entry created twice | High |
| Balance mismatch | Wallet balance incorrect | Critical |
| Amount mismatch | Entry amount incorrect | Critical |

## 6.2 Resolution Process

### Missing Entry

```sql
-- Create missing entry
INSERT INTO "LedgerEntry" (
  id, "walletId", type, amount, reference, 
  "referenceType", "balanceAfter", "createdAt"
) VALUES (
  'le_recon_001',
  'wallet_xyz',
  'CREDIT',
  1000,
  'pay_abc123',
  'PAYMENT',
  (SELECT balance FROM "Wallet" WHERE id = 'wallet_xyz') + 1000,
  NOW()
);

-- Update wallet balance
UPDATE "Wallet" SET balance = balance + 1000 WHERE id = 'wallet_xyz';
```

### Duplicate Entry

```sql
-- Mark duplicate (don't delete)
UPDATE "LedgerEntry" 
SET metadata = jsonb_set(metadata, '{duplicate}', 'true')
WHERE id = 'le_dup_001';

-- Adjust wallet balance
UPDATE "Wallet" SET balance = balance - 1000 WHERE id = 'wallet_xyz';
```

---

# 7. Reconciliation Report

## 7.1 Report Template

```markdown
# Reconciliation Report

Date: YYYY-MM-DD
Type: Daily / Weekly / Audit

## Summary
- Total wallets: X
- Balanced wallets: Y
- Discrepancies: Z

## Discrepancies Found
| Wallet | Type | Amount | Status |
|--------|------|--------|--------|
| ... | ... | ... | ... |

## Actions Taken
- [Action 1]
- [Action 2]

## Recommendations
- [Recommendation 1]

## Sign-off
- Reconciled by: [Name]
- Reviewed by: [Name]
- Date: [Date]
```

---

# 8. Automation

## 8.1 Daily Script

```bash
#!/bin/bash
# daily-reconciliation.sh

echo "Starting daily reconciliation..."

# Balance check
balance_result=$(psql -f sql/check-balances.sql)
if [ $? -ne 0 ]; then
  echo "ERROR: Balance check failed"
  send-alert "Balance mismatch detected"
  exit 1
fi

# Transaction match
match_result=$(psql -f sql/check-transactions.sql)
if [ $? -ne 0 ]; then
  echo "ERROR: Transaction match failed"
  send-alert "Transaction mismatch detected"
  exit 1
fi

echo "Reconciliation complete. No discrepancies found."
```

## 8.2 Scheduling

```cron
# Daily at 06:00 UTC
0 6 * * * /opt/cargobit/scripts/daily-reconciliation.sh >> /var/log/reconciliation.log 2>&1
```

---

# 9. Summary

Dieses Dokument beschreibt den Prozess für die Abstimmung des Ledgers.

---

# 10. Contact

Finance / Engineering
CargoBit Internal
