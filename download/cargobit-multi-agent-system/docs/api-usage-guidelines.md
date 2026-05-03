# CargoBit API Usage Guidelines
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument bietet Richtlinien für die korrekte Verwendung der CargoBit API. Es stellt sicher, dass Integrationen effizient, zuverlässig und sicher sind.

---

# 2. General Guidelines

## 2.1 Best Practices

| Practice | Description |
|----------|-------------|
| Use TLS 1.2+ | All connections must use TLS |
| Secure credentials | Never expose API keys client-side |
| Handle errors | Implement proper error handling |
| Use idempotency | All POST requests need idempotency keys |
| Respect rate limits | Stay within rate limits |

## 2.2 Anti-Patterns to Avoid

| Anti-Pattern | Why Avoid |
|--------------|-----------|
| Hardcoded credentials | Security risk |
| Client-side API calls | Key exposure |
| Infinite retry loops | Resource waste |
| Ignoring errors | Data inconsistency |
| Polling frequently | Unnecessary load |

---

# 3. Authentication

## 3.1 API Key Usage

```http
GET /v1/payments HTTP/1.1
Host: api.cargobit.example.com
Authorization: Bearer sk_live_abc123...
```

## 3.2 Key Management

| Practice | Description |
|----------|-------------|
| Storage | Environment variables or secret manager |
| Rotation | Rotate every 90 days |
| Scope | Use separate keys for environments |
| Revocation | Immediately revoke compromised keys |

---

# 4. Idempotency

## 4.1 Required for POST

```http
POST /v1/payments HTTP/1.1
Host: api.cargobit.example.com
Authorization: Bearer sk_live_abc123...
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "amount": 1000,
  "currency": "EUR"
}
```

## 4.2 Idempotency Behavior

| Request | Response |
|---------|----------|
| First with key | 201 Created |
| Duplicate (success) | 200 OK + original response |
| Duplicate (in progress) | 200 OK + original response |
| Duplicate (failed) | Original error |

---

# 5. Error Handling

## 5.1 Check Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 2xx | Success | Continue |
| 400 | Client error | Fix request |
| 401 | Unauthorized | Check credentials |
| 403 | Forbidden | Check permissions |
| 429 | Rate limited | Retry with backoff |
| 5xx | Server error | Retry with backoff |

## 5.2 Parse Error Body

```json
{
  "error": {
    "type": "ValidationError",
    "code": "ERR_AMOUNT_INVALID",
    "message": "Amount must be positive"
  },
  "correlationId": "corr_abc123"
}
```

## 5.3 Use Correlation ID

Include correlation ID in support requests for faster resolution.

---

# 6. Rate Limiting

## 6.1 Check Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

## 6.2 Handle 429 Responses

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Reset: 1705312800
X-RateLimit-Retry-After: 60
```

**Recommended Action:**
1. Read `Retry-After` header
2. Wait specified seconds
3. Retry request

---

# 7. Pagination

## 7.1 Request

```http
GET /v1/payments?limit=50&offset=100 HTTP/1.1
```

## 7.2 Response

```json
{
  "data": [...],
  "pagination": {
    "total": 500,
    "limit": 50,
    "offset": 100,
    "hasMore": true
  }
}
```

---

# 8. Webhook Handling

## 8.1 Validate Signatures

```typescript
function validateSignature(payload: string, header: string, secret: string): boolean {
  const { timestamp, signature } = parseHeader(header);
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = hmacSha256(secret, signedPayload);
  return secureCompare(signature, expectedSignature);
}
```

## 8.2 Return Quickly

- Return 200 within 2 seconds
- Process asynchronously if needed
- Handle duplicates (idempotency)

---

# 9. Retry Strategy

## 9.1 Retryable Errors

| Code | Retry? | Backoff |
|------|--------|---------|
| 429 | Yes | Use Retry-After |
| 500 | Yes | Exponential |
| 502 | Yes | Exponential |
| 503 | Yes | Exponential |
| 504 | Yes | Exponential |

## 9.2 Exponential Backoff

```typescript
async function withBackoff(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await sleep(delay);
    }
  }
}
```

---

# 10. Testing

## 10.1 Use Sandbox

- Sandbox API keys for testing
- No real money involved
- Same API behavior

## 10.2 Test Scenarios

| Scenario | How to Test |
|----------|-------------|
| Success | Normal request |
| Failure | Invalid data |
| Rate limit | Rapid requests |
| Idempotency | Same key twice |
| Signature | Valid/invalid |

---

# 11. Summary

Diese Richtlinien stellen sicher, dass Integrationen effizient, zuverlässig und sicher sind.

---

# 12. Contact

API Support
CargoBit Internal
