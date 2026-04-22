-- =============================================================================
-- CargoBit Payment Platform - SQL Verification Snippets
-- =============================================================================
-- Diese SQL-Queries dienen zur Verifikation und Diagnose des Payment-Systems.
-- Sie können für manuelle Prüfungen, Debugging und Acceptance-Tests verwendet
-- werden.
--
-- Verwendung:
--   psql -U <user> -d cargobit_payments -f verification_queries.sql
--   oder einzelne Queries in einem SQL-Client ausführen
-- =============================================================================

-- ============================================================================
-- SECTION 1: Payment Verification
-- ============================================================================

-- 1.1 Neueste Payments anzeigen
SELECT
    id,
    job_id,
    stripe_payment_intent_id,
    amount_cents,
    refunded_cents,
    status,
    created_at,
    updated_at
FROM payments
ORDER BY created_at DESC
LIMIT 20;

-- 1.2 Payment mit Status "processing" länger als 5 Minuten
SELECT
    id,
    job_id,
    stripe_payment_intent_id,
    status,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS minutes_in_processing
FROM payments
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- 1.3 Payments ohne Stripe PaymentIntent ID (orphaned)
SELECT
    id,
    job_id,
    amount_cents,
    status,
    created_at
FROM payments
WHERE stripe_payment_intent_id IS NULL
  AND status IN ('pending', 'processing')
ORDER BY created_at DESC;

-- 1.4 Payment-Statistiken nach Status
SELECT
    status,
    COUNT(*) AS count,
    SUM(amount_cents) / 100.0 AS total_amount_eur,
    AVG(amount_cents) / 100.0 AS avg_amount_eur
FROM payments
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY count DESC;

-- ============================================================================
-- SECTION 2: Refund Verification
-- ============================================================================

-- 2.1 Alle Refunds für einen Payment anzeigen
SELECT
    sr.id AS stripe_refund_id,
    sr.payment_id,
    sr.stripe_refund_id,
    sr.amount_cents,
    sr.status,
    sr.reason,
    sr.created_at,
    p.amount_cents AS payment_total,
    p.refunded_cents AS payment_refunded_total
FROM stripe_refunds sr
JOIN payments p ON sr.payment_id = p.id
WHERE p.id = '<payment_id>'  -- Replace with actual payment_id
ORDER BY sr.created_at DESC;

-- 2.2 Payments mit Refund-Diskrepanzen (lokale DB vs. Stripe Refunds)
SELECT
    p.id AS payment_id,
    p.amount_cents,
    p.refunded_cents AS local_refunded_cents,
    COALESCE(SUM(sr.amount_cents), 0) AS stripe_refunded_cents,
    p.refunded_cents - COALESCE(SUM(sr.amount_cents), 0) AS diff_cents,
    p.status
FROM payments p
LEFT JOIN stripe_refunds sr ON p.id = sr.payment_id
WHERE p.status IN ('succeeded', 'partial_refunded', 'refunded')
GROUP BY p.id, p.amount_cents, p.refunded_cents, p.status
HAVING p.refunded_cents <> COALESCE(SUM(sr.amount_cents), 0)
ORDER BY ABS(diff_cents) DESC;

-- 2.3 Failed Refunds
SELECT
    sr.id,
    sr.payment_id,
    sr.stripe_refund_id,
    sr.amount_cents,
    sr.status,
    sr.failure_reason,
    sr.created_at
FROM stripe_refunds sr
WHERE sr.status = 'failed'
ORDER BY sr.created_at DESC
LIMIT 20;

-- 2.4 Refund-Volumen der letzten 24 Stunden
SELECT
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(*) AS refund_count,
    SUM(amount_cents) / 100.0 AS refund_volume_eur
FROM stripe_refunds
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND status = 'succeeded'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- ============================================================================
-- SECTION 3: Stripe Events & Webhook Processing
-- ============================================================================

-- 3.1 Stripe Events für einen PaymentIntent
SELECT
    id,
    type,
    processed,
    processed_at,
    created_at
FROM stripe_events
WHERE payload::text LIKE '%<payment_intent_id>%'  -- Replace with actual pi_xxx
ORDER BY created_at DESC;

-- 3.2 Unverarbeitete Stripe Events
SELECT
    id,
    type,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS minutes_old
FROM stripe_events
WHERE processed = false
ORDER BY created_at DESC
LIMIT 50;

-- 3.3 Doppelte Events (gleiche Event-ID mehrfach)
SELECT
    id,
    COUNT(*) AS occurrence_count,
    MIN(created_at) AS first_seen,
    MAX(created_at) AS last_seen
FROM stripe_events
GROUP BY id
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC;

-- 3.4 Events nach Typ (letzte 24 Stunden)
SELECT
    type,
    COUNT(*) AS count,
    SUM(CASE WHEN processed THEN 1 ELSE 0 END) AS processed_count,
    SUM(CASE WHEN NOT processed THEN 1 ELSE 0 END) AS unprocessed_count
FROM stripe_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY count DESC;

-- 3.5 Event Processing Latency
SELECT
    id,
    type,
    created_at AS received_at,
    processed_at,
    EXTRACT(EPOCH FROM (processed_at - created_at)) AS processing_seconds
FROM stripe_events
WHERE processed = true
  AND processed_at IS NOT NULL
ORDER BY processing_seconds DESC
LIMIT 20;

-- ============================================================================
-- SECTION 4: Wallet Transactions
-- ============================================================================

-- 4.1 Wallet Transactions für einen Payment
SELECT
    wt.id,
    wt.wallet_id,
    wt.type,
    wt.amount_cents,
    wt.reference,
    wt.reference_type,
    wt.created_at
FROM wallet_transactions wt
WHERE wt.reference = '<payment_id>'  -- Replace with actual payment_id
ORDER BY wt.created_at DESC;

-- 4.2 Wallet Transaction Count für einen Payment (für Idempotency-Test)
SELECT
    reference AS payment_id,
    COUNT(*) AS transaction_count
FROM wallet_transactions
WHERE reference_type = 'payment'
GROUP BY reference
HAVING COUNT(*) > 1;  -- Mehr als 1 Transaction sollte nicht vorkommen

-- 4.3 Doppelte Wallet Transactions identifizieren
SELECT
    reference,
    type,
    amount_cents,
    COUNT(*) AS duplicate_count
FROM wallet_transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY reference, type, amount_cents
HAVING COUNT(*) > 1;

-- 4.4 Wallet Balance für alle Kunden
SELECT
    w.id AS wallet_id,
    w.user_id,
    COALESCE(SUM(wt.amount_cents), 0) / 100.0 AS balance_eur
FROM wallets w
LEFT JOIN wallet_transactions wt ON w.id = wt.wallet_id
GROUP BY w.id, w.user_id
ORDER BY balance_eur DESC;

-- ============================================================================
-- SECTION 5: Audit Events
-- ============================================================================

-- 5.1 Audit Events für einen Payment
SELECT
    id,
    event_type,
    entity_type,
    entity_id,
    metadata,
    created_at
FROM audit_events
WHERE entity_type = 'payment'
  AND entity_id = '<payment_id>'  -- Replace with actual payment_id
ORDER BY created_at DESC;

-- 5.2 Idempotency-bezogene Audit Events
SELECT
    id,
    event_type,
    entity_type,
    entity_id,
    created_at
FROM audit_events
WHERE event_type IN (
    'payment.already_succeeded',
    'payment.refund_already_applied',
    'wallet.duplicate_prevented',
    'webhook.duplicate_event'
)
ORDER BY created_at DESC
LIMIT 50;

-- 5.3 Reconciliation Audit Events
SELECT
    id,
    event_type,
    entity_id AS payment_id,
    metadata->>'diff_cents' AS diff_cents,
    metadata->>'fix_applied' AS fix_applied,
    created_at
FROM audit_events
WHERE event_type = 'reconciliation.fix_applied'
ORDER BY created_at DESC
LIMIT 20;

-- 5.4 Audit Event Statistik (letzte 24 Stunden)
SELECT
    event_type,
    COUNT(*) AS count
FROM audit_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;

-- ============================================================================
-- SECTION 6: Reconciliation Queries
-- ============================================================================

-- 6.1 Alle Payments mit Reconciliation-Diff
SELECT
    p.id AS payment_id,
    p.stripe_payment_intent_id,
    p.amount_cents,
    p.refunded_cents AS local_refunded,
    COALESCE(
        (SELECT SUM(amount_cents) FROM stripe_refunds WHERE payment_id = p.id AND status = 'succeeded'),
        0
    ) AS stripe_refunded,
    p.refunded_cents - COALESCE(
        (SELECT SUM(amount_cents) FROM stripe_refunds WHERE payment_id = p.id AND status = 'succeeded'),
        0
    ) AS diff_cents
FROM payments p
WHERE p.status IN ('succeeded', 'partial_refunded', 'refunded')
  AND p.refunded_cents <> COALESCE(
        (SELECT SUM(amount_cents) FROM stripe_refunds WHERE payment_id = p.id AND status = 'succeeded'),
        0
    )
ORDER BY ABS(diff_cents) DESC;

-- 6.2 Letzte Reconciliation Runs
SELECT
    id,
    started_at,
    completed_at,
    payments_checked,
    discrepancies_found,
    fixes_applied,
    EXTRACT(EPOCH FROM (completed_at - started_at)) AS duration_seconds
FROM reconciliation_runs
ORDER BY started_at DESC
LIMIT 10;

-- 6.3 Leader Lock Status (Redis-basiert, via Application Log)
-- Hinweis: Dies erfordert eine Tabelle für Lock-Status oder Log-Einträge
SELECT
    lock_name,
    locked_by,
    locked_at,
    expires_at,
    CASE
        WHEN expires_at > NOW() THEN 'ACTIVE'
        ELSE 'EXPIRED'
    END AS lock_status
FROM distributed_locks
WHERE lock_name = 'recon:lock:refunds';

-- ============================================================================
-- SECTION 7: Health Check Queries
-- ============================================================================

-- 7.1 Payment Flow Health Summary
SELECT
    'total_payments_24h' AS metric,
    COUNT(*) AS value
FROM payments
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT
    'succeeded_payments_24h',
    COUNT(*)
FROM payments
WHERE status = 'succeeded'
  AND created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT
    'failed_payments_24h',
    COUNT(*)
FROM payments
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT
    'stuck_in_processing',
    COUNT(*)
FROM payments
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes'
UNION ALL
SELECT
    'orphaned_events',
    COUNT(*)
FROM stripe_events
WHERE processed = false
  AND created_at < NOW() - INTERVAL '1 hour';

-- 7.2 Database Connection Pool Status
SELECT
    state,
    COUNT(*) AS connection_count
FROM pg_stat_activity
WHERE datname = 'cargobit_payments'
GROUP BY state;

-- 7.3 Long-running Queries
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND datname = 'cargobit_payments'
ORDER BY duration DESC;

-- ============================================================================
-- SECTION 8: Test Data Cleanup
-- ============================================================================

-- 8.1 Test-Jobs und zugehörige Payments löschen (Vorsicht!)
-- Nur in Test/Staging-Umgebung verwenden!
BEGIN;

-- Lösche zugehörige Datensätze in der richtigen Reihenfolge
DELETE FROM wallet_transactions
WHERE reference IN (
    SELECT p.id::text
    FROM payments p
    JOIN jobs j ON p.job_id = j.id
    WHERE j.title LIKE 'E2E Test%'
);

DELETE FROM stripe_refunds
WHERE payment_id IN (
    SELECT p.id
    FROM payments p
    JOIN jobs j ON p.job_id = j.id
    WHERE j.title LIKE 'E2E Test%'
);

DELETE FROM stripe_events
WHERE payload::text LIKE '%E2E Test%';

DELETE FROM audit_events
WHERE entity_id IN (
    SELECT p.id::text
    FROM payments p
    JOIN jobs j ON p.job_id = j.id
    WHERE j.title LIKE 'E2E Test%'
);

DELETE FROM payments
WHERE job_id IN (
    SELECT id FROM jobs WHERE title LIKE 'E2E Test%'
);

DELETE FROM jobs WHERE title LIKE 'E2E Test%';

-- Zeige was gelöscht würde (ROLLBACK zum Testen)
-- ROLLBACK;
COMMIT;

-- ============================================================================
-- SECTION 9: Idempotency Test Queries
-- ============================================================================

-- 9.1 Vor Replay: Wallet Transaction Count
SELECT COUNT(*) AS wallet_tx_count_before
FROM wallet_transactions
WHERE reference = '<payment_id>';

-- 9.2 Nach Replay: Wallet Transaction Count
SELECT COUNT(*) AS wallet_tx_count_after
FROM wallet_transactions
WHERE reference = '<payment_id>';

-- 9.3 Event Processing Status
SELECT
    id AS event_id,
    type,
    processed,
    processed_at,
    created_at AS received_at
FROM stripe_events
WHERE id = '<event_id>';

-- 9.4 Vollständiger Idempotency Check
WITH before_count AS (
    SELECT COUNT(*) AS cnt FROM wallet_transactions WHERE reference = '<payment_id>'
),
event_status AS (
    SELECT id, processed, processed_at FROM stripe_events WHERE id = '<event_id>'
)
SELECT
    b.cnt AS wallet_tx_count,
    e.id AS event_id,
    e.processed,
    e.processed_at,
    CASE
        WHEN e.processed = true THEN 'EVENT_ALREADY_PROCESSED'
        ELSE 'EVENT_NOT_PROCESSED'
    END AS status
FROM before_count b
CROSS JOIN event_status e;
