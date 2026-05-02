# CargoBit Webhook Integration Guide (Technical Deep Dive)
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument beschreibt die technische Verarbeitung von Webhooks im Detail. Es richtet sich an Entwickler, die Webhooks implementieren, debuggen oder erweitern müssen.

---

# 2. Webhook Architecture Overview

```
Stripe → API Gateway → Webhook Handler → Validation → Processing → Response
```

---

# 3. Security Model

## 3.1 Signature Validation

Every webhook must be validated using HMAC-SHA256.

**Stripe-Signature Header:**
```
t=1705312800,v1=abc123def456...,v1=...
```

**Validation Steps:**
1. Extract timestamp and signature from header
2. Reconstruct signed payload: `t.{body}`
3. Compute HMAC with webhook secret
4. Compare with provided signature (constant-time)
5. Reject if mismatch

## 3.2 Timestamp Validation

- Reject events older than 5 minutes
- Prevent replay attacks
- Clock skew tolerance: ±30 seconds

## 3.3 Replay Prevention

- Store processed event IDs
- Reject duplicates within 72h window
- Use idempotency table

---

# 4. Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     WEBHOOK PROCESSING PIPELINE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Receive        POST /webhooks/stripe                        │
│       ↓                                                          │
│  2. Validate       Signature + Timestamp                        │
│       ↓                                                          │
│  3. Parse          JSON → StripeEvent                           │
│       ↓                                                          │
│  4. Idempotency    Check event_id in StripeEvent table          │
│       ↓                                                          │
│  5. Store          Insert StripeEvent (pending)                 │
│       ↓                                                          │
│  6. Process        Event-specific handler                       │
│       ↓                                                          │
│  7. Update         StripeEvent (processed)                      │
│       ↓                                                          │
│  8. Audit Log      Log to AuditLog table                        │
│       ↓                                                          │
│  9. Respond        200 OK                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 5. Event Types & Handlers

## 5.1 Payment Events

| Event | Handler | Action |
|-------|---------|--------|
| payment_intent.succeeded | handlePaymentSucceeded | Update payment status |
| payment_intent.payment_failed | handlePaymentFailed | Mark payment failed |
| payment_intent.canceled | handlePaymentCanceled | Mark payment canceled |

## 5.2 Payout Events

| Event | Handler | Action |
|-------|---------|--------|
| payout.created | handlePayoutCreated | Create payout record |
| payout.paid | handlePayoutPaid | Mark payout completed |
| payout.failed | handlePayoutFailed | Mark payout failed |

## 5.3 Account Events

| Event | Handler | Action |
|-------|---------|--------|
| account.updated | handleAccountUpdated | Update account status |

---

# 6. Database Schema

```sql
CREATE TABLE "StripeEvent" (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,
  data            JSONB NOT NULL,
  status          TEXT DEFAULT 'pending',
  processed_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  error_message   TEXT
);

CREATE INDEX idx_stripe_event_status ON "StripeEvent"(status);
CREATE INDEX idx_stripe_event_created ON "StripeEvent"(created_at);
```

---

# 7. Idempotency Implementation

## 7.1 Check Query

```sql
SELECT id, status FROM "StripeEvent" WHERE id = $1;
```

## 7.2 Scenarios

| Existing Status | Action |
|-----------------|--------|
| None | Process normally |
| pending | Return 200 (already processing) |
| processed | Return 200 (already done) |
| failed | Retry processing |

---

# 8. Failure Modes & Handling

## 8.1 Validation Failures

| Failure | Response | Action |
|---------|----------|--------|
| Invalid signature | 400 | Log warning, reject |
| Expired timestamp | 400 | Log warning, reject |
| Malformed JSON | 400 | Log error, reject |

## 8.2 Processing Failures

| Failure | Response | Action |
|---------|----------|--------|
| DB error | 500 | Log error, allow retry |
| Handler error | 500 | Log error, mark failed |
| Timeout | 500 | Log error, allow retry |

## 8.3 Unknown Event Types

| Scenario | Response | Action |
|----------|----------|--------|
| Unknown type | 200 | Log info, mark skipped |

---

# 9. Retry Logic

## 9.1 Stripe Retry Behavior

- Stripe retries webhooks with exponential backoff
- Retries over 72 hours
- Up to 19 attempts

## 9.2 Our Retry Handling

- Idempotency ensures safe retries
- Same response for same event_id
- No duplicate processing

---

# 10. Monitoring & Observability

## 10.1 Metrics

| Metric | Description |
|--------|-------------|
| webhook.received.total | Total webhooks received |
| webhook.validated.total | Successfully validated |
| webhook.processed.total | Successfully processed |
| webhook.failed.total | Processing failures |
| webhook.latency.ms | Processing latency |

## 10.2 Alerts

| Alert | Threshold |
|-------|-----------|
| High failure rate | > 5% in 5 min |
| Signature validation failures | > 10 in 1 min |
| Processing latency | > 5 seconds |

## 10.3 Logging

```
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event_id": "evt_abc123",
  "event_type": "payment_intent.succeeded",
  "status": "processed",
  "latency_ms": 150,
  "correlation_id": "req_xyz"
}
```

---

# 11. Testing

## 11.1 Test Scenarios

| Test | Description |
|------|-------------|
| Valid signature | Should process successfully |
| Invalid signature | Should reject with 400 |
| Expired timestamp | Should reject with 400 |
| Duplicate event | Should return 200, no duplicate processing |
| Unknown event type | Should return 200, mark skipped |
| Processing error | Should return 500, allow retry |

## 11.2 Test Tools

- Stripe CLI: `stripe listen --forward-to localhost:3000/webhooks/stripe`
- Stripe Dashboard: Send test events
- Custom test suite: Unit + integration tests

---

# 12. Debugging Guide

## 12.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Signature mismatch | Wrong secret | Verify webhook secret |
| Event not found | Not stored | Check DB connection |
| Duplicate processing | Idempotency not working | Check StripeEvent table |
| High latency | Slow DB queries | Optimize queries |

## 12.2 Debugging Commands

```sql
-- Check recent events
SELECT * FROM "StripeEvent" ORDER BY created_at DESC LIMIT 10;

-- Check failed events
SELECT * FROM "StripeEvent" WHERE status = 'failed';

-- Check event by ID
SELECT * FROM "StripeEvent" WHERE id = 'evt_abc123';
```

---

# 13. Summary

Dieses Dokument beschreibt die vollständige technische Implementierung der Webhook-Verarbeitung. Alle Webhooks werden validiert, idempotent verarbeitet und vollständig überwacht.

---

# 14. Contact

Backend Engineering
CargoBit Internal
