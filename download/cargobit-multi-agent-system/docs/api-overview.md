# CargoBit API Overview & Contract Specification
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument beschreibt alle API-Endpunkte, Datenstrukturen, Fehlercodes und Integrationsanforderungen. Es dient als verbindliche API-Spezifikation für Partner und interne Entwickler.

---

# 2. API Principles

| Principle | Description |
|-----------|-------------|
| RESTful | Resource-oriented design |
| Deterministic | Same input → same output |
| Idempotent | POST requests are repeatable |
| Versioned | URL-based versioning (/v1/) |
| Secure by default | TLS, auth, validation |

---

# 3. Authentication

## 3.1 Methods

| Method | Use Case |
|--------|----------|
| API Key | Server-to-server integration |
| Bearer Token | Authenticated user requests |

## 3.2 Header Format

```
Authorization: Bearer <API_KEY>
```

## 3.3 Security Requirements

- TLS 1.2+ required
- API keys must be kept secret
- No client-side API key exposure
- Rotate keys every 90 days

---

# 4. Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | application/json |
| Authorization | Yes | Bearer token |
| Idempotency-Key | POST only | UUID for idempotency |
| X-Request-ID | Optional | Correlation ID |

---

# 5. Endpoints

## 5.1 Payments

### POST /v1/payments

Create a new payment.

**Request:**
```json
{
  "amount": 12000,
  "currency": "EUR",
  "reference": "ORDER-12345",
  "metadata": {
    "customer_id": "cust_abc123"
  }
}
```

**Response (201):**
```json
{
  "paymentId": "pay_abc123",
  "status": "pending",
  "amount": 12000,
  "currency": "EUR",
  "reference": "ORDER-12345",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### GET /v1/payments/{paymentId}

Retrieve payment status.

**Response (200):**
```json
{
  "paymentId": "pay_abc123",
  "status": "succeeded",
  "amount": 12000,
  "currency": "EUR",
  "reference": "ORDER-12345",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:31:00Z"
}
```

### GET /v1/payments

List payments with pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | int | Max results (default 20) |
| offset | int | Pagination offset |
| status | string | Filter by status |

---

## 5.2 Wallets

### GET /v1/wallets/{userId}

Retrieve wallet balance.

**Response (200):**
```json
{
  "userId": "user_abc123",
  "balance": 50000,
  "currency": "EUR",
  "status": "active"
}
```

### POST /v1/wallets/{userId}/adjust

Adjust wallet balance (internal only).

**Request:**
```json
{
  "amount": 1000,
  "type": "credit",
  "reference": "REFUND-123",
  "idempotencyKey": "uuid-here"
}
```

---

## 5.3 Payouts

### POST /v1/payouts

Create a payout.

**Request:**
```json
{
  "userId": "user_abc123",
  "amount": 10000,
  "currency": "EUR",
  "destination": "bank_account_123"
}
```

### GET /v1/payouts/{payoutId}

Retrieve payout status.

---

## 5.4 Webhooks

### POST /v1/webhooks/stripe

Stripe event ingestion endpoint.

**Headers:**
```
Stripe-Signature: t=...,v1=...
```

**Processing:**
1. Validate signature
2. Parse event
3. Check idempotency
4. Process event
5. Return 200 OK

---

# 6. Error Model

## 6.1 Error Response Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Amount must be positive",
    "details": {
      "field": "amount"
    }
  },
  "requestId": "req_abc123"
}
```

## 6.2 Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| INVALID_REQUEST | 400 | Malformed request |
| UNAUTHORIZED | 401 | Missing/invalid auth |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Duplicate resource |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

# 7. Idempotency

## 7.1 Requirements

- Required for all POST requests
- Idempotency-Key header must be UUID v4
- Same key → same response (24h window)

## 7.2 Behavior

| Scenario | Response |
|----------|----------|
| First request | 201 Created |
| Duplicate (success) | 200 OK + cached response |
| Duplicate (in progress) | 200 OK + original response |
| Duplicate (failed) | Original error response |

---

# 8. Rate Limiting

## 8.1 Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /payments | 100 | 1 minute |
| /wallets | 200 | 1 minute |
| /webhooks | 1000 | 1 minute |

## 8.2 Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

# 9. Versioning

## 9.1 Strategy

- URL-based versioning (/v1/, /v2/)
- Breaking changes → new major version
- Non-breaking changes → additive only

## 9.2 Lifecycle

| Stage | Duration | Support |
|-------|----------|---------|
| Current | Active | Full support |
| Deprecated | 6 months | Security fixes only |
| Sunset | End | No support |

---

# 10. Webhook Events

| Event | Description |
|-------|-------------|
| payment.created | Payment initiated |
| payment.succeeded | Payment completed |
| payment.failed | Payment failed |
| payout.created | Payout initiated |
| payout.succeeded | Payout completed |
| wallet.updated | Balance changed |

---

# 11. SDK & Client Libraries

| Language | Package |
|----------|---------|
| TypeScript | @cargobit/sdk-ts |
| Python | cargobit-sdk |
| Go | cargobit-go |

---

# 12. Summary

Diese API-Spezifikation definiert die verbindliche Schnittstelle für alle CargoBit-Integrationen. Änderungen erfolgen kontrolliert über die Versionierungsstrategie.

---

# 13. Contact

API Engineering
CargoBit Internal
