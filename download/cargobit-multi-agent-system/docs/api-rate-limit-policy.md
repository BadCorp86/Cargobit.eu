# CargoBit API Rate Limit Policy
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument definiert die Rate-Limiting-Richtlinie für die CargoBit API. Es stellt sicher, dass die API vor Überlastung und Missbrauch geschützt ist.

---

# 2. Rate Limiting Strategy

## 2.1 Types of Limits

| Type | Scope | Purpose |
|------|-------|---------|
| Per-IP | IP address | Prevent DoS attacks |
| Per-User | User ID | Fair usage |
| Per-Partner | API key | Partner quota |
| Global | System-wide | Capacity protection |

## 2.2 Algorithm

Token Bucket Algorithm with:
- Burst capacity for temporary spikes
- Refill rate for sustained throughput
- Configurable per endpoint

---

# 3. Rate Limits

## 3.1 Standard Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /v1/payments | 100 | 1 minute |
| GET /v1/payments | 200 | 1 minute |
| GET /v1/payments/:id | 300 | 1 minute |
| POST /v1/wallets/:id/adjust | 50 | 1 minute |
| GET /v1/wallets/:id | 200 | 1 minute |
| POST /v1/payouts | 50 | 1 minute |
| POST /webhooks/stripe | 1000 | 1 minute |

## 3.2 Partner Tiers

| Tier | Payments/min | Wallets/min | Payouts/min |
|------|--------------|-------------|-------------|
| Bronze | 50 | 100 | 25 |
| Silver | 100 | 200 | 50 |
| Gold | 500 | 1000 | 250 |
| Enterprise | Custom | Custom | Custom |

## 3.3 Burst Allowance

| Tier | Burst Multiplier | Duration |
|------|------------------|----------|
| Bronze | 2x | 10 seconds |
| Silver | 2x | 10 seconds |
| Gold | 3x | 10 seconds |
| Enterprise | Custom | Custom |

---

# 4. Rate Limit Headers

## 4.1 Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
X-RateLimit-Retry-After: 60
```

## 4.2 Header Descriptions

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Maximum requests per window |
| X-RateLimit-Remaining | Requests remaining in window |
| X-RateLimit-Reset | Unix timestamp when window resets |
| X-RateLimit-Retry-After | Seconds until retry allowed |

---

# 5. Rate Limit Response

## 5.1 HTTP 429 Response

```json
{
  "error": {
    "type": "RateLimitError",
    "code": "ERR_RATE_LIMIT",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2024-01-15T10:31:00Z",
      "retryAfter": 60
    }
  },
  "correlationId": "corr_abc123"
}
```

---

# 6. Retry Strategy

## 6.1 Recommended Approach

```
1. Check X-RateLimit-Remaining header
2. If low, slow down requests
3. On 429, read Retry-After header
4. Wait specified duration
5. Retry request
6. Implement exponential backoff for repeated 429s
```

## 6.2 Exponential Backoff

| Retry | Delay | Max Delay |
|-------|-------|-----------|
| 1 | 1 second | - |
| 2 | 2 seconds | - |
| 3 | 4 seconds | - |
| 4 | 8 seconds | - |
| 5 | 16 seconds | 60 seconds |

---

# 7. Abuse Detection

## 7.1 Patterns

| Pattern | Indicator | Action |
|---------|-----------|--------|
| Scraping | High read volume | Throttle + alert |
| Brute force | Many failed auth | Block + alert |
| Bot activity | Inhuman speed | CAPTCHA + throttle |
| Abuse | Rate limit evasion | Ban + investigate |

## 7.2 Automatic Actions

| Threshold | Action |
|-----------|--------|
| 80% of limit | Warning header |
| 100% of limit | Throttle |
| 150% of limit | Temporary block (5 min) |
| 300% of limit | Extended block (1 hour) |

---

# 8. Exemptions

## 8.1 Exemption Criteria

| Criteria | Justification |
|-----------|---------------|
| Load testing | Pre-approved performance testing |
| Migration | Bulk operations during migration |
| Emergency | Critical business operations |

## 8.2 Request Process

```
1. Submit exemption request
   └── Include: Reason, duration, expected volume

2. Security review
   └── Evaluate risk and necessity

3. Approval
   └── Manager + Security team

4. Implementation
   └── Temporary limit increase

5. Expiration
   └── Auto-revert after specified time
```

---

# 9. Monitoring

## 9.1 Metrics

| Metric | Description |
|--------|-------------|
| Rate limit hits | Count of 429 responses |
| Top limited IPs | IPs with most limit hits |
| Top limited partners | Partners with most limit hits |
| Burst usage | Frequency of burst usage |
| Abuse alerts | Suspicious activity alerts |

## 9.2 Alerts

| Alert | Threshold |
|-------|-----------|
| High rate limit rate | > 5% of requests |
| Abuse pattern detected | Any detection |
| IP blocked | Any block |

---

# 10. Implementation

## 10.1 Technology Stack

| Component | Technology |
|-----------|------------|
| Rate limiting | Redis + Token Bucket |
| IP limiting | API Gateway |
| User limiting | Application layer |

## 10.2 Configuration

```typescript
const rateLimitConfig = {
  payments: {
    create: { limit: 100, window: 60 },
    read: { limit: 200, window: 60 }
  },
  wallets: {
    read: { limit: 200, window: 60 },
    adjust: { limit: 50, window: 60 }
  }
};
```

---

# 11. Partner Communication

## 11.1 Notification

| Scenario | Communication |
|----------|---------------|
| Approaching limit | Warning in headers |
| Limit exceeded | 429 response + email |
| Abuse detected | Direct contact |
| Quota change | Advance notification |

## 11.2 Quota Increase Request

Partners can request quota increases through:
1. Partner portal
2. Partner support email
3. Account manager

---

# 12. Summary

Diese Policy stellt sicher, dass die API vor Überlastung und Missbrauch geschützt ist.

---

# 13. Contact

API Team
CargoBit Internal
