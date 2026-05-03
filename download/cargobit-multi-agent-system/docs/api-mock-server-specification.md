# CargoBit API Mock Server Specification
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument spezifiziert den API Mock Server für Test- und Entwicklungszwecke. Er ermöglicht deterministische, reproduzierbare Tests ohne Backend-Abhängigkeiten.

---

# 2. Mock Server Principles

| Principle | Description |
|-----------|-------------|
| Deterministic | Same request = same response |
| No randomness | All responses are predictable |
| Replayable | Scenarios can be replayed |
| Configurable | Responses can be customized |

---

# 3. Endpoints

## 3.1 Payments

### Create Payment

```http
POST /v1/payments
Content-Type: application/json

{
  "amount": 1000,
  "currency": "EUR",
  "reference": "ORDER-123"
}
```

**Mock Response:**
```json
{
  "paymentId": "pay_mock_001",
  "status": "pending",
  "amount": 1000,
  "currency": "EUR",
  "reference": "ORDER-123",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Get Payment

```http
GET /v1/payments/pay_mock_001
```

**Mock Response:**
```json
{
  "paymentId": "pay_mock_001",
  "status": "succeeded",
  "amount": 1000,
  "currency": "EUR",
  "createdAt": "2024-01-15T10:00:00Z",
  "processedAt": "2024-01-15T10:00:05Z"
}
```

---

# 4. Scenario Configuration

## 4.1 Success Scenario

```json
{
  "scenario": "success",
  "responses": {
    "POST /v1/payments": {
      "status": 201,
      "body": {
        "paymentId": "pay_mock_success",
        "status": "pending"
      }
    }
  }
}
```

## 4.2 Failure Scenario

```json
{
  "scenario": "failure",
  "responses": {
    "POST /v1/payments": {
      "status": 400,
      "body": {
        "error": {
          "type": "ValidationError",
          "code": "ERR_AMOUNT_INVALID",
          "message": "Amount must be positive"
        }
      }
    }
  }
}
```

## 4.3 Rate Limit Scenario

```json
{
  "scenario": "rate_limit",
  "responses": {
    "*": {
      "status": 429,
      "headers": {
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": "1705312800",
        "Retry-After": "60"
      },
      "body": {
        "error": {
          "type": "RateLimitError",
          "code": "ERR_RATE_LIMIT"
        }
      }
    }
  }
}
```

---

# 5. Idempotency Handling

The mock server respects idempotency keys:

```typescript
const idempotencyStore = new Map<string, any>();

function handleRequest(req: Request): Response {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
    return idempotencyStore.get(idempotencyKey);
  }
  
  const response = generateResponse(req);
  
  if (idempotencyKey) {
    idempotencyStore.set(idempotencyKey, response);
  }
  
  return response;
}
```

---

# 6. Webhook Simulation

## 6.1 Simulate Webhook Event

```http
POST /mock/webhooks/simulate
Content-Type: application/json

{
  "eventType": "payment_intent.succeeded",
  "paymentId": "pay_mock_001"
}
```

## 6.2 Webhook Payload

```json
{
  "id": "evt_mock_001",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_mock_001",
      "amount": 1000,
      "currency": "eur",
      "metadata": {
        "paymentId": "pay_mock_001"
      }
    }
  }
}
```

---

# 7. Running the Mock Server

## 7.1 Docker

```bash
docker run -p 3001:3001 cargobit/mock-server:latest
```

## 7.2 Node.js

```bash
npm run mock-server
```

## 7.3 Configuration

```bash
MOCK_PORT=3001 \
MOCK_SCENARIO=success \
npm run mock-server
```

---

# 8. Test Integration

## 8.1 Jest Example

```typescript
describe('Payment API', () => {
  beforeAll(() => {
    process.env.API_URL = 'http://localhost:3001';
  });
  
  it('should create payment', async () => {
    const response = await createPayment({
      amount: 1000,
      currency: 'EUR'
    });
    
    expect(response.status).toBe('pending');
    expect(response.paymentId).toBeDefined();
  });
});
```

---

# 9. Available Scenarios

| Scenario | Description |
|----------|-------------|
| success | All requests succeed |
| failure | All requests fail |
| rate_limit | Rate limit exceeded |
| timeout | Slow responses |
| mixed | Random success/failure |

---

# 10. Summary

Dieses Dokument spezifiziert den API Mock Server für Test- und Entwicklungszwecke.

---

# 11. Contact

Engineering Team
CargoBit Internal
