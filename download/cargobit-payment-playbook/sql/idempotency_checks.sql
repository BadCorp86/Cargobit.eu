-- =============================================================================
-- SQL Prüf-Snippets für Idempotency und Reconciliation
-- =============================================================================
-- Zweck: schnelle DB-Checks vor/nach Tests

-- 1. Wallet transactions count for a payment
SELECT COUNT(*) AS wallet_tx_count
FROM wallet_transactions
WHERE reference = '<payment_id>';

-- 2. Stripe event processed state
SELECT id, type, processed, processed_at
FROM stripe_events
WHERE id = '<stripe_event_id>';

-- 3. Payments with refund diffs (local vs stripe_refunds table)
SELECT p.id, p.amount_cents, p.refunded_cents,
       COALESCE(sr.sum_refunds,0) AS stripe_refunded_cents,
       (p.refunded_cents - COALESCE(sr.sum_refunds,0)) AS diff
FROM payments p
LEFT JOIN (
  SELECT payment_id, SUM(amount_cents) AS sum_refunds
  FROM stripe_refunds
  GROUP BY payment_id
) sr ON sr.payment_id = p.id
WHERE p.status IN ('succeeded','partial_refunded')
  AND (p.refunded_cents IS DISTINCT FROM COALESCE(sr.sum_refunds,0));

-- 4. Recent stripe_events not processed
SELECT id, type, received_at
FROM stripe_events
WHERE processed = false
ORDER BY received_at DESC
LIMIT 50;

-- 5. Reconciliation cron last run audit
SELECT * FROM audit_events
WHERE event_type = 'reconcile.applied'
ORDER BY created_at DESC
LIMIT 50;

-- =============================================================================
-- Akzeptanzkriterien:
-- - Nach Replay: wallet_tx_count unverändert
-- - stripe_events zeigt processed = true
-- =============================================================================
