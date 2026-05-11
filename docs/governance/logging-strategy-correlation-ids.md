# CargoBit Logging Strategy & Correlation IDs
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert die Logging-Strategie, Log-Formate und Correlation ID-Verwendung im CargoBit System. Es stellt sicher, dass Logs einheitlich, durchsuchbar und sicher sind.

---

# 2. Logging Principles

| Principle | Description |
|-----------|-------------|
| Structured | All logs in JSON format |
| No PII | No personal data in logs |
| No Secrets | No credentials, keys, or tokens |
| Correlated | All logs have correlation IDs |
| Searchable | Indexed and queryable |
| Retained | Defined retention period |

---

# 3. Log Format

## 3.1 Standard Log Structure

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "info",
  "message": "Payment processed successfully",
  "correlationId": "corr_abc123def456",
  "service": "payment-service",
  "environment": "production",
  "context": {
    "paymentId": "pay_abc123",
    "amount": 12000,
    "currency": "EUR"
  },
  "duration": 150,
  "userId": "user_123"
}
```

## 3.2 Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| ERROR | Failures requiring action | Payment failed, DB error |
| WARN | Potential issues | Slow query, retry attempt |
| INFO | Normal operations | Payment created, webhook received |
| DEBUG | Detailed diagnostics | Request/response bodies (no PII) |

## 3.3 Context Fields

| Field | Required | Description |
|-------|----------|-------------|
| timestamp | Yes | ISO 8601 UTC |
| level | Yes | Log level |
| message | Yes | Human-readable message |
| correlationId | Yes | Request correlation ID |
| service | Yes | Service name |
| environment | Yes | prod/staging/dev |
| context | No | Additional structured data |
| duration | No | Operation duration in ms |
| error | No | Error details if applicable |

---

# 4. Correlation ID Rules

## 4.1 Generation

- Generated at API gateway entry
- UUID v4 format
- Prefix: `corr_`

```javascript
const correlationId = `corr_${uuidv4()}`;
```

## 4.2 Propagation

```
┌─────────────────────────────────────────────────────────────┐
│                   CORRELATION ID FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Request → API Gateway → Service A → Service B → DB        │
│      │          │              │            │          │     │
│      │     Generate ID    Propagate ID  Propagate ID  Log   │
│      │          │              │            │          │     │
│      └──────────┴──────────────┴────────────┴──────────┘     │
│                          │                                   │
│                    Same ID throughout                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 4.3 Headers

| Direction | Header |
|-----------|--------|
| Incoming | X-Correlation-ID |
| Outgoing | X-Correlation-ID |
| Logs | correlationId field |

## 4.4 Implementation

```javascript
// Middleware to handle correlation IDs
function correlationMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || `corr_${uuidv4()}`;
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

// Usage in logger
function log(level, message, context = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId: getCorrelationId(),
    ...context
  }));
}
```

---

# 5. Logging by Component

## 5.1 API Gateway

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Request received",
  "correlationId": "corr_abc123",
  "service": "api-gateway",
  "method": "POST",
  "path": "/v1/payments",
  "ip": "192.168.1.1",
  "userAgent": "CargoBit-SDK/1.0"
}
```

## 5.2 Payment Service

```json
{
  "timestamp": "2024-01-15T10:30:00.100Z",
  "level": "info",
  "message": "Payment created",
  "correlationId": "corr_abc123",
  "service": "payment-service",
  "paymentId": "pay_xyz",
  "amount": 12000,
  "currency": "EUR",
  "duration": 45
}
```

## 5.3 Webhook Handler

```json
{
  "timestamp": "2024-01-15T10:30:01.000Z",
  "level": "info",
  "message": "Webhook processed",
  "correlationId": "corr_def456",
  "service": "webhook-handler",
  "eventType": "payment_intent.succeeded",
  "stripeEventId": "evt_abc",
  "duration": 120
}
```

## 5.4 Database Operations

```json
{
  "timestamp": "2024-01-15T10:30:00.150Z",
  "level": "debug",
  "message": "Query executed",
  "correlationId": "corr_abc123",
  "service": "payment-service",
  "query": "INSERT INTO Payment",
  "duration": 12
}
```

---

# 6. Security Considerations

## 6.1 What NOT to Log

| Data Type | Reason |
|-----------|--------|
| Passwords | Security risk |
| API keys | Security risk |
| Credit card numbers | PCI-DSS violation |
| Personal data | GDPR violation |
| Session tokens | Security risk |

## 6.2 Log Sanitization

```javascript
function sanitizeForLog(data) {
  const sensitive = ['password', 'apiKey', 'token', 'secret', 'creditCard'];
  const sanitized = { ...data };
  
  for (const key of Object.keys(sanitized)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}
```

---

# 7. Log Retention

| Log Type | Retention | Storage |
|----------|-----------|---------|
| API logs | 30 days | CloudWatch Logs |
| Error logs | 90 days | CloudWatch Logs |
| Audit logs | 180 days | Database |
| Debug logs | 7 days | CloudWatch Logs |

---

# 8. Log Queries

## 8.1 Find by Correlation ID

```
fields timestamp, level, message, service
| filter correlationId = "corr_abc123"
| sort timestamp asc
```

## 8.2 Error Analysis

```
fields timestamp, message, service, context
| filter level = "ERROR"
| stats count() by service, message
| sort count desc
```

## 8.3 Performance Analysis

```
fields timestamp, message, duration
| filter duration > 1000
| stats avg(duration), max(duration) by service
```

---

# 9. Summary

Diese Logging-Strategie stellt sicher, dass Logs einheitlich, durchsuchbar und sicher sind, und dass Correlation IDs die Nachvollziehbarkeit von Requests ermöglichen.

---

# 10. Contact

SRE Team
CargoBit Internal
