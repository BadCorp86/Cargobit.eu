# CargoBit API Sandbox Environment Guide
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument beschreibt die Sandbox-Umgebung für API-Testing. Partner können hier sicher testen, ohne Auswirkungen auf Produktionsdaten.

---

# 2. Sandbox Overview

## 2.1 Environment Details

| Property | Value |
|----------|-------|
| Base URL | https://sandbox-api.cargobit.example.com/v1/ |
| Data persistence | Reset daily |
| Rate limits | Relaxed |
| Support | Standard SLA |

## 2.2 Purpose

- Integration testing
- Development testing
- Demo and training
- Bug reproduction

---

# 3. Authentication

## 3.1 Sandbox API Keys

| Key Type | Prefix | Use Case |
|----------|--------|----------|
| Test secret key | sk_test_ | Server-side |
| Test publishable key | pk_test_ | Client-side (not recommended) |

## 3.2 Obtaining Keys

1. Log in to Partner Portal
2. Navigate to API Keys
3. Create new test key
4. Store securely

---

# 4. Test Data

## 4.1 Test Cards

| Card Number | Result |
|-------------|--------|
| 4242424242424242 | Success |
| 4000000000000002 | Decline |
| 4000000000009995 | Insufficient funds |
| 4000000000000069 | Expired card |
| 4000000000000119 | Processing error |

## 4.2 Test Amounts

| Amount | Result |
|--------|--------|
| Any valid amount | Success |
| 4000 | Decline (generic) |
| 4001 | Insufficient funds |
| 4002 | Lost card |
| 4003 | Stolen card |

---

# 5. Webhook Testing

## 5.1 Test Webhook Endpoint

```http
POST /v1/test/webhooks
Content-Type: application/json

{
  "eventType": "payment_intent.succeeded",
  "paymentId": "pay_test_123"
}
```

## 5.2 Webhook CLI

```bash
# Install CLI
npm install -g cargobit-cli

# Forward webhooks to local
cargobit webhooks:forward http://localhost:3000/webhooks

# Trigger test event
cargobit webhooks:trigger payment_intent.succeeded
```

---

# 6. Test Scenarios

## 6.1 Payment Flow

```bash
# 1. Create payment
curl -X POST https://sandbox-api.cargobit.example.com/v1/payments \
  -H "Authorization: Bearer sk_test_abc123" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "currency": "EUR"}'

# 2. Simulate success
curl -X POST https://sandbox-api.cargobit.example.com/v1/test/complete-payment \
  -H "Authorization: Bearer sk_test_abc123" \
  -d '{"paymentId": "pay_test_123"}'

# 3. Verify status
curl https://sandbox-api.cargobit.example.com/v1/payments/pay_test_123 \
  -H "Authorization: Bearer sk_test_abc123"
```

## 6.2 Error Scenarios

```bash
# Test validation error
curl -X POST https://sandbox-api.cargobit.example.com/v1/payments \
  -H "Authorization: Bearer sk_test_abc123" \
  -H "Content-Type: application/json" \
  -d '{"amount": -100, "currency": "EUR"}'

# Test rate limit
for i in {1..200}; do
  curl https://sandbox-api.cargobit.example.com/v1/payments \
    -H "Authorization: Bearer sk_test_abc123"
done
```

---

# 7. Sandbox Limitations

## 7.1 Not Supported

| Feature | Reason |
|---------|--------|
| Real payments | Test environment |
| Production webhooks | Use test endpoints |
| Persistent data | Reset daily |

## 7.2 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All | 1000 | 1 minute |

---

# 8. Best Practices

## 8.1 Development

| Practice | Description |
|----------|-------------|
| Use environment variables | Switch between sandbox/prod |
| Test all scenarios | Success, failure, edge cases |
| Validate signatures | Use test webhook secret |

## 8.2 Code Example

```typescript
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.cargobit.example.com/v1'
  : 'https://sandbox-api.cargobit.example.com/v1';

const API_KEY = process.env.NODE_ENV === 'production'
  ? process.env.CARGOBIT_API_KEY
  : process.env.CARGOBIT_TEST_API_KEY;
```

---

# 9. Support

## 9.1 Resources

| Resource | Location |
|----------|----------|
| API Documentation | docs/api-overview.md |
| Test cards | This document |
| Support | sandbox-support@cargobit.example.com |

---

# 10. Summary

Dieses Dokument beschreibt die Sandbox-Umgebung für API-Testing.

---

# 11. Contact

Partner Engineering
CargoBit Internal
