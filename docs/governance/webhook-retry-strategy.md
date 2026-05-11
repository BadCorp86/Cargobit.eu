# CargoBit Webhook Retry Strategy
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert die Retry-Strategie für Webhooks. Es stellt sicher, dass Webhooks zuverlässig zugestellt werden, ohne Partner-Systeme zu überlasten.

---

# 2. Retry Philosophy

| Principle | Description |
|-----------|-------------|
| At-least-once delivery | Events may be delivered multiple times |
| Idempotency required | Partners must handle duplicates |
| Graceful degradation | Failures don't block the system |
| Transparent | Partners are notified of issues |

---

# 3. Retry Schedule

## 3.1 Exponential Backoff

| Attempt | Delay | Cumulative |
|---------|-------|------------|
| 1 | Immediate | 0 |
| 2 | 1 minute | 1 min |
| 3 | 5 minutes | 6 min |
| 4 | 30 minutes | 36 min |
| 5 | 2 hours | 2h 36min |
| 6 | 12 hours | 14h 36min |
| 7 | 24 hours | 38h 36min |

## 3.2 Maximum Attempts

- **Total attempts:** 7
- **Total window:** ~72 hours
- **After exhaustion:** Event archived, partner notified

---

# 4. Retry Triggers

## 4.1 Retry on These Responses

| Response | Reason |
|----------|--------|
| 5xx | Server error |
| Timeout | Endpoint too slow |
| Connection failure | Network issue |

## 4.2 Do Not Retry on These

| Response | Reason |
|----------|--------|
| 2xx | Success |
| 4xx (except 429) | Client error |
| Invalid signature | Security issue |

---

# 5. Retry Implementation

## 5.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RETRY ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Event Created                                              │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────┐                                            │
│   │ Event Queue │                                            │
│   └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────┐     Failure      ┌─────────────┐          │
│   │   Deliver   │ ────────────────▶│ Retry Queue │          │
│   └─────────────┘                  └─────────────┘          │
│        │                                 │                   │
│        │ Success                         │ Scheduled         │
│        ▼                                 ▼                   │
│   ┌─────────────┐                  ┌─────────────┐          │
│   │    Done     │                  │   Deliver   │          │
│   └─────────────┘                  └─────────────┘          │
│                                           │                   │
│                                           │ Max attempts     │
│                                           ▼                   │
│                                    ┌─────────────┐           │
│                                    │   Archive   │           │
│                                    └─────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 5.2 Retry Queue Schema

```sql
CREATE TABLE "WebhookRetry" (
  id TEXT PRIMARY KEY,
  eventId TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  payload JSONB NOT NULL,
  attemptCount INTEGER DEFAULT 0,
  nextAttemptAt TIMESTAMP,
  lastError TEXT,
  status TEXT DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT NOW()
);
```

---

# 6. Dead Letter Handling

## 6.1 Dead Letter Queue

Events that exceed maximum retries are moved to dead letter queue.

## 6.2 Retention

| Status | Retention |
|--------|-----------|
| Pending | Until processed |
| Delivered | 7 days |
| Failed (DLQ) | 30 days |

## 6.3 Partner Notification

When events enter DLQ:
1. Email notification to partner
2. Event logged in partner dashboard
3. Manual retry option available

---

# 7. Monitoring

## 7.1 Metrics

| Metric | Description |
|--------|-------------|
| webhook.delivered | Successfully delivered |
| webhook.retried | Retries attempted |
| webhook.failed | Permanently failed |
| webhook.latency | Delivery time |

## 7.2 Alerts

| Alert | Threshold |
|-------|-----------|
| High failure rate | > 5% |
| Partner DLQ entries | Any |
| Retry queue backlog | > 1000 |

---

# 8. Partner Requirements

## 8.1 Endpoint Requirements

- Return 200 within 2 seconds
- Handle duplicate events (idempotency)
- Validate signatures
- Return meaningful errors

## 8.2 Idempotency

Partners must:
- Store event IDs
- Return same response for duplicates
- Not create duplicate side effects

---

# 9. Manual Intervention

## 9.1 Retry Commands

```bash
# Retry single event
./scripts/retry-webhook.sh --event evt_abc123

# Retry all failed for partner
./scripts/retry-webhook.sh --partner partner_xyz --all-failed

# Clear DLQ (with approval)
./scripts/clear-dlq.sh --partner partner_xyz
```

## 9.2 Approval Process

| Action | Approval Required |
|--------|-------------------|
| Retry single event | SRE |
| Retry all partner events | SRE + Partner |
| Clear DLQ | SRE Lead + Partner |

---

# 10. Summary

Dieses Dokument definiert die Retry-Strategie für Webhooks.

---

# 11. Contact

Engineering Team
CargoBit Internal
