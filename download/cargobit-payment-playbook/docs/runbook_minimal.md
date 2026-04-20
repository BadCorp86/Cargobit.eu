# Runbook Webhook Processing Incident

## 1. Ersteinschätzung
- Prüfe Grafana Alert und Sentry Fehlergruppe.
- Prüfe `stripe_events` Tabelle auf `processed = false` oder viele 5xx.

## 2. Sofortmaßnahmen
- Wenn DB down: bring DB up; Stripe wird Webhooks retryen.
- Wenn App fehlerhaft: restart service or rollback last deploy.
- Wenn massiver orphan spike: markiere Events processed true nur nach Review.

## 3. Reprocessing
- Für transient errors: Stripe retryt automatisch.
- Für manuelles Reprocess:
  1. Exportiere payloads: `SELECT id, payload FROM stripe_events WHERE processed = false;`
  2. Reprocess sicher per script (siehe Reprocess Script).
  3. Prüfe idempotency: ensure `stripe_events` row is updated to processed after success.

## 4. Wallet Korrektur bei Doppelbuchungen
- Stoppe Webhook Verarbeitung.
- Erstelle Reversal WalletTransaction via Service mit Audit.
- Markiere betroffene payments und run reconciliation.

## 5. Postmortem
- Dokumentiere Ursache, Impact, Timeline, Fix, Prävention.

---

**Akzeptanzkriterium:** Runbook ist im Team-Wiki; On-Call weiß, wie reprocessen geht.
