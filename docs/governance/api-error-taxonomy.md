# CargoBit API Error Taxonomy
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument definiert alle API-Fehlerkategorien, Fehlercodes und Fehlerstrukturen. Es stellt sicher, dass Fehler einheitlich, nachvollziehbar und partnerfreundlich behandelt werden.

---

# 2. Error Categories

| Category | HTTP Range | Meaning |
|----------|------------|---------|
| ValidationError | 400 | Ungültige Eingaben |
| AuthenticationError | 401 | Fehlende/ungültige Credentials |
| AuthorizationError | 403 | Zugriff verweigert |
| NotFoundError | 404 | Ressource existiert nicht |
| ConflictError | 409 | Idempotency-Konflikte |
| RateLimitError | 429 | Zu viele Anfragen |
| InternalError | 500 | Unerwarteter Fehler |

---

# 3. Error Response Format

## 3.1 Standard Format

```json
{
  "error": {
    "type": "ValidationError",
    "message": "Invalid amount",
    "code": "ERR_AMOUNT_INVALID",
    "details": {
      "field": "amount",
      "constraint": "must be positive integer"
    }
  },
  "correlationId": "corr_abc123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 3.2 Field-Level Errors

```json
{
  "error": {
    "type": "ValidationError",
    "message": "Request validation failed",
    "code": "ERR_VALIDATION",
    "details": {
      "fields": [
        { "field": "amount", "message": "Must be positive" },
        { "field": "currency", "message": "Invalid currency code" }
      ]
    }
  }
}
```

---

# 4. Error Codes

## 4.1 Validation Errors (400)

| Code | Message | Description |
|------|---------|-------------|
| ERR_AMOUNT_INVALID | Invalid amount | Amount must be positive integer in cents |
| ERR_CURRENCY_INVALID | Invalid currency | Currency must be 3-letter ISO code |
| ERR_REFERENCE_MISSING | Reference missing | Reference is required |
| ERR_METADATA_INVALID | Invalid metadata | Metadata must be key-value object |
| ERR_IDEMPOTENCY_KEY_INVALID | Invalid idempotency key | Must be valid UUID v4 |

## 4.2 Authentication Errors (401)

| Code | Message | Description |
|------|---------|-------------|
| ERR_AUTH_MISSING | Authentication required | No Authorization header |
| ERR_AUTH_INVALID | Invalid credentials | API key invalid or expired |
| ERR_AUTH_EXPIRED | Token expired | Bearer token has expired |

## 4.3 Authorization Errors (403)

| Code | Message | Description |
|------|---------|-------------|
| ERR_FORBIDDEN | Access denied | Insufficient permissions |
| ERR_SCOPE_INSUFFICIENT | Insufficient scope | Required scope not granted |

## 4.4 Not Found Errors (404)

| Code | Message | Description |
|------|---------|-------------|
| ERR_PAYMENT_NOT_FOUND | Payment not found | Payment ID does not exist |
| ERR_WALLET_NOT_FOUND | Wallet not found | Wallet does not exist |
| ERR_PAYOUT_NOT_FOUND | Payout not found | Payout ID does not exist |

## 4.5 Conflict Errors (409)

| Code | Message | Description |
|------|---------|-------------|
| ERR_IDEMPOTENCY_CONFLICT | Idempotency conflict | Request with same key already processed |
| ERR_DUPLICATE_REFERENCE | Duplicate reference | Reference already used |

## 4.6 Rate Limit Errors (429)

| Code | Message | Description |
|------|---------|-------------|
| ERR_RATE_LIMIT | Rate limit exceeded | Too many requests |
| ERR_RATE_LIMIT_IP | IP rate limit exceeded | Too many requests from IP |
| ERR_RATE_LIMIT_USER | User rate limit exceeded | Too many requests for user |

## 4.7 Internal Errors (500)

| Code | Message | Description |
|------|---------|-------------|
| ERR_INTERNAL | Internal error | Unexpected server error |
| ERR_DATABASE | Database error | Database operation failed |
| ERR_EXTERNAL | External service error | Stripe or other service failed |

---

# 5. Error Handling Guidelines

## 5.1 For Partners

1. Always check HTTP status code first
2. Parse error body for details
3. Use correlation ID for support requests
4. Implement retry logic for 5xx errors
5. Implement backoff for 429 errors

## 5.2 Retry Strategy

| Status Code | Retry? | Strategy |
|-------------|--------|----------|
| 400 | No | Fix request |
| 401 | No | Check credentials |
| 403 | No | Check permissions |
| 404 | No | Check resource ID |
| 409 | No | Check idempotency key |
| 429 | Yes | Exponential backoff |
| 500 | Yes | Exponential backoff (max 3 retries) |

---

# 6. Error Logging

All errors are logged with:

- Error code
- Error message
- Correlation ID
- Request context (no PII)
- Stack trace (internal only)

---

# 7. Summary

Diese Error Taxonomy stellt sicher, dass alle API-Fehler einheitlich, nachvollziehbar und partnerfreundlich behandelt werden.

---

# 8. Contact

API Engineering
CargoBit Internal
