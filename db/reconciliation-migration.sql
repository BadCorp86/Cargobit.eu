-- Migration: Reconciliation Support Tables
-- Version: 004
-- Datum: 2024-01-15

-- ============================================
-- 1. Leader Lock Tabelle (für verteilte CronJobs)
-- ============================================

CREATE TABLE IF NOT EXISTS leader_lock (
    key VARCHAR(255) PRIMARY KEY,
    holder_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für schnelle Lock-Prüfung
CREATE INDEX IF NOT EXISTS idx_leader_lock_expires
ON leader_lock (expires_at);

-- Kommentar
COMMENT ON TABLE leader_lock IS 'Leader election für verteilte CronJobs';
COMMENT ON COLUMN leader_lock.key IS 'Eindeutiger Lock-Identifier (z.B. reconciliation:leader)';
COMMENT ON COLUMN leader_lock.holder_id IS 'ID des Lock-Inhabers (Hostname/Pod-Name)';
COMMENT ON COLUMN leader_lock.expires_at IS 'Ablaufzeit des Locks';

-- ============================================
-- 2. Payout Events Tabelle (falls nicht vorhanden)
-- ============================================

CREATE TABLE IF NOT EXISTS payout_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für schnelle Abfrage pro Payout
CREATE INDEX IF NOT EXISTS idx_payout_events_payout_id
ON payout_events (payout_id, created_at DESC);

-- Index für Event-Typ Suchen
CREATE INDEX IF NOT EXISTS idx_payout_events_type
ON payout_events (type);

-- Kommentar
COMMENT ON TABLE payout_events IS 'Audit-Trail für alle Payout-Ereignisse';
COMMENT ON COLUMN payout_events.type IS 'Event-Typ (created, processing, paid, failed, manual_mark, auto_resolved, etc.)';

-- ============================================
-- 3. Audit Events Tabelle (falls nicht vorhanden)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    actor_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für schnelle Entity-Abfrage
CREATE INDEX IF NOT EXISTS idx_audit_events_entity
ON audit_events (entity_type, entity_id, created_at DESC);

-- Index für Actor-basierte Suche
CREATE INDEX IF NOT EXISTS idx_audit_events_actor
ON audit_events (actor_id);

-- Index für Action-basierte Suche
CREATE INDEX IF NOT EXISTS idx_audit_events_action
ON audit_events (action);

-- Kommentar
COMMENT ON TABLE audit_events IS 'Generelle Audit-Tabelle für alle System-Aktionen';

-- ============================================
-- 4. Erweitere Payouts Tabelle (falls nötig)
-- ============================================

-- Prüfe ob Spalten existieren, füge sie sonst hinzu
DO $$
BEGIN
    -- paid_at Spalte
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payouts' AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE payouts ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN payouts.paid_at IS 'Zeitpunkt der erfolgreichen Auszahlung';
    END IF;

    -- stripe_transfer_id Spalte
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payouts' AND column_name = 'stripe_transfer_id'
    ) THEN
        ALTER TABLE payouts ADD COLUMN stripe_transfer_id VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_payouts_stripe_transfer_id ON payouts (stripe_transfer_id);
        COMMENT ON COLUMN payouts.stripe_transfer_id IS 'Stripe Transfer ID für Reconciliation';
    END IF;

    -- external_reference Spalte
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payouts' AND column_name = 'external_reference'
    ) THEN
        ALTER TABLE payouts ADD COLUMN external_reference VARCHAR(255);
        COMMENT ON COLUMN payouts.external_reference IS 'Externe Referenz (Stripe, Bank, etc.)';
    END IF;

    -- reconciled_at Spalte
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payouts' AND column_name = 'reconciled_at'
    ) THEN
        ALTER TABLE payouts ADD COLUMN reconciled_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN payouts.reconciled_at IS 'Letzter erfolgreicher Reconciliation-Zeitpunkt';
    END IF;
END $$;

-- ============================================
-- 5. Payout Attempts Tabelle (für Retry-Logik)
-- ============================================

CREATE TABLE IF NOT EXISTS payout_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    provider VARCHAR(50) NOT NULL,
    provider_response JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für Abfrage pro Payout
CREATE INDEX IF NOT EXISTS idx_payout_attempts_payout_id
ON payout_attempts (payout_id, attempt_at DESC);

COMMENT ON TABLE payout_attempts IS 'Protokolliert alle Zahlungsversuche pro Payout';

-- ============================================
-- 6. Wallet Transactions (falls nicht vorhanden)
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount_cents BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    type VARCHAR(50) NOT NULL, -- credit, debit, refund
    reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    balance_after BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique Constraint für Idempotency
CREATE UNIQUE INDEX IF NOT EXISTS ux_wallet_transactions_reference_type
ON wallet_transactions (reference, type)
WHERE reference IS NOT NULL;

-- Index für User-Abfrage
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user
ON wallet_transactions (user_id, created_at DESC);

COMMENT ON TABLE wallet_transactions IS 'Wallet Transaktions-Historie';

-- ============================================
-- 7. Reconciliation Status View
-- ============================================

CREATE OR REPLACE VIEW v_reconciliation_status AS
SELECT
    p.id,
    p.amount_cents,
    p.currency,
    p.status,
    p.stripe_transfer_id,
    p.created_at,
    p.updated_at,
    p.reconciled_at,
    u.email as user_email,
    c.name as company_name,
    COUNT(pe.id) as event_count,
    MAX(pe.created_at) as last_event_at
FROM payouts p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN companies c ON p.company_id = c.id
LEFT JOIN payout_events pe ON p.id = pe.payout_id
WHERE p.status IN ('pending', 'processing', 'failed')
GROUP BY p.id, p.amount_cents, p.currency, p.status,
         p.stripe_transfer_id, p.created_at, p.updated_at, p.reconciled_at,
         u.email, c.name
ORDER BY p.created_at DESC;

COMMENT ON VIEW v_reconciliation_status IS 'Übersicht aller offenen Payouts mit Reconciliation-Status';

-- ============================================
-- 8. Hilfsfunktionen
-- ============================================

-- Funktion zum Bereinigen abgelaufener Locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
    DELETE FROM leader_lock WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Funktion zum Prüfen und Erwerben eines Locks
CREATE OR REPLACE FUNCTION acquire_lock(
    p_key VARCHAR(255),
    p_holder_id VARCHAR(255),
    p_ttl_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_acquired BOOLEAN := FALSE;
BEGIN
    -- Versuche Lock zu erwerben
    INSERT INTO leader_lock (key, holder_id, expires_at)
    VALUES (p_key, p_holder_id, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL)
    ON CONFLICT (key) DO UPDATE
    SET holder_id = p_holder_id,
        expires_at = NOW() + (p_ttl_seconds || ' seconds')::INTERVAL,
        updated_at = NOW()
    WHERE leader_lock.expires_at < NOW() OR leader_lock.holder_id = p_holder_id;

    -- Prüfe ob wir den Lock haben
    SELECT EXISTS (
        SELECT 1 FROM leader_lock
        WHERE key = p_key AND holder_id = p_holder_id
    ) INTO v_acquired;

    RETURN v_acquired;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. Cleanup Job (via pg_cron falls verfügbar)
-- ============================================

-- Falls pg_cron installiert:
-- SELECT cron.schedule('cleanup_expired_locks', '*/5 * * * *', 'SELECT cleanup_expired_locks();');

-- Alternativ: Manuell aufrufen
-- SELECT cleanup_expired_locks();

-- ============================================
-- 10. Grant Permissions
-- ============================================

-- Passe User-Namen an deine Umgebung an
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO payments_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO payments_user;
