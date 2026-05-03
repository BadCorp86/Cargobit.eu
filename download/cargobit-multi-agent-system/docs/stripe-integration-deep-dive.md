# CargoBit Stripe Integration Deep Dive
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument beschreibt die technische Integration mit Stripe im Detail. Es dient als Referenz für Entwickler, die an der Zahlungsintegration arbeiten.

---

# 2. Integration Architecture

## 2.1 Components

```
┌─────────────────────────────────────────────────────────────┐
│                   STRIPE INTEGRATION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   CargoBit API                                               │
│       │                                                      │
│       ├── Payment Service                                    │
│       │       │                                              │
│       │       └── Stripe SDK (outbound)                     │
│       │                                                      │
│       ├── Webhook Handler                                    │
│       │       │                                              │
│       │       └── Stripe Events (inbound)                   │
│       │                                                      │
│       └── Signature Validator                                │
│               │                                              │
│               └── HMAC-SHA256 verification                  │
│                                                              │
│   Stripe Platform                                            │
│       │                                                      │
│       ├── Payment Intents API                               │
│       ├── Payouts API                                        │
│       └── Webhooks API                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 2.2 Data Flow

```
Payment Creation:
Partner → CargoBit API → Stripe API → Payment Intent Created
                                            ↓
Webhook Notification:
Stripe → CargoBit Webhook → Validate → Process → Update DB
```

---

# 3. Signature Validation

## 3.1 Header Structure

```
Stripe-Signature: t=1705312800,v1=abc123def456...,v0=...
```

| Component | Description |
|-----------|-------------|
| t | Unix timestamp |
| v1 | HMAC-SHA256 signature (current) |
| v0 | Legacy signature (deprecated) |

## 3.2 Validation Algorithm

```typescript
function validateSignature(
  payload: string,
  header: string,
  secret: string,
  tolerance: number = 300 // 5 minutes
): boolean {
  // 1. Parse header
  const { timestamp, signature } = parseHeader(header);
  
  // 2. Check timestamp
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > tolerance) {
    throw new Error('Timestamp too old');
  }
  
  // 3. Construct signed payload
  const signedPayload = `${timestamp}.${payload}`;
  
  // 4. Compute HMAC
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  // 5. Compare signatures (constant-time)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

## 3.3 Security Considerations

| Consideration | Implementation |
|---------------|----------------|
| Replay attacks | Timestamp validation (5 min window) |
| Timing attacks | Constant-time comparison |
| Secret management | Environment variables, rotation |

---

# 4. Idempotency

## 4.1 Stripe Idempotency Keys

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1000,
  currency: 'eur',
}, {
  idempotencyKey: idempotencyKey
});
```

## 4.2 Idempotency Behavior

| Scenario | Behavior |
|----------|----------|
| First request | Creates new PaymentIntent |
| Retry with same key | Returns original PaymentIntent |
| Original failed | Returns original error |
| Key expired (24h) | Creates new PaymentIntent |

## 4.3 Our Idempotency Layer

```sql
-- Store Stripe events for deduplication
CREATE TABLE "StripeEvent" (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 5. Event Mapping

## 5.1 Supported Events

| Stripe Event | CargoBit Action |
|--------------|-----------------|
| payment_intent.succeeded | Update payment status, create ledger entry |
| payment_intent.payment_failed | Update payment status, notify partner |
| payment_intent.canceled | Update payment status |
| payout.created | Create payout record |
| payout.paid | Update payout status, create ledger entry |
| payout.failed | Update payout status, notify partner |
| account.updated | Update account status |

## 5.2 Event Processing

```typescript
async function processEvent(event: Stripe.Event): Promise<void> {
  // 1. Check idempotency
  const existing = await db.stripeEvent.findUnique({
    where: { id: event.id }
  });
  
  if (existing?.status === 'processed') {
    return; // Already processed
  }
  
  // 2. Store event
  await db.stripeEvent.upsert({
    where: { id: event.id },
    create: {
      id: event.id,
      type: event.type,
      data: event.data,
      status: 'pending'
    },
    update: { status: 'pending' }
  });
  
  // 3. Route to handler
  const handler = eventHandlers[event.type];
  if (handler) {
    await handler(event.data);
  }
  
  // 4. Mark processed
  await db.stripeEvent.update({
    where: { id: event.id },
    data: { status: 'processed', processedAt: new Date() }
  });
}
```

---

# 6. Error Handling

## 6.1 Stripe Error Types

| Error Type | HTTP Code | Handling |
|------------|-----------|----------|
| CardError | 402 | User-facing message |
| RateLimitError | 429 | Retry with backoff |
| InvalidRequestError | 400 | Log and fix |
| AuthenticationError | 401 | Alert, check keys |
| APIConnectionError | N/A | Retry |
| APIError | 500 | Retry, alert if persistent |

## 6.2 Retry Strategy

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isRetryable(error)) {
        throw error;
      }
      
      const delay = Math.pow(2, i) * 1000;
      await sleep(delay);
    }
  }
  
  throw lastError;
}

function isRetryable(error: Stripe.StripeError): boolean {
  return error.type === 'APIConnectionError' ||
         error.type === 'APIError' ||
         (error.type === 'RateLimitError');
}
```

---

# 7. Payment Flow

## 7.1 Create Payment

```typescript
async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  // 1. Create payment record
  const payment = await db.payment.create({
    data: {
      id: generateId(),
      amount: input.amount,
      currency: input.currency,
      status: 'pending',
      reference: input.reference
    }
  });
  
  // 2. Create Stripe PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: input.amount,
    currency: input.currency.toLowerCase(),
    metadata: {
      paymentId: payment.id,
      reference: input.reference
    }
  }, {
    idempotencyKey: input.idempotencyKey
  });
  
  // 3. Update payment with Stripe ID
  await db.payment.update({
    where: { id: payment.id },
    data: { stripePaymentIntentId: paymentIntent.id }
  });
  
  return payment;
}
```

## 7.2 Handle Payment Success

```typescript
async function handlePaymentSucceeded(data: Stripe.PaymentIntent): Promise<void> {
  const paymentId = data.metadata.paymentId;
  
  await db.$transaction([
    // Update payment
    db.payment.update({
      where: { id: paymentId },
      data: { status: 'succeeded' }
    }),
    
    // Create ledger entry
    db.ledgerEntry.create({
      data: {
        id: generateId(),
        walletId: data.metadata.walletId,
        type: 'CREDIT',
        amount: data.amount,
        reference: paymentId,
        referenceType: 'PAYMENT'
      }
    }),
    
    // Update wallet balance
    db.wallet.update({
      where: { id: data.metadata.walletId },
      data: { balance: { increment: data.amount } }
    })
  ]);
}
```

---

# 8. Payout Flow

## 8.1 Create Payout

```typescript
async function createPayout(input: CreatePayoutInput): Promise<Payout> {
  // 1. Validate wallet balance
  const wallet = await db.wallet.findUnique({
    where: { id: input.walletId }
  });
  
  if (wallet.balance < input.amount) {
    throw new Error('Insufficient funds');
  }
  
  // 2. Create payout record
  const payout = await db.payout.create({
    data: {
      id: generateId(),
      walletId: input.walletId,
      amount: input.amount,
      status: 'pending'
    }
  });
  
  // 3. Debit wallet
  await db.wallet.update({
    where: { id: input.walletId },
    data: { balance: { decrement: input.amount } }
  });
  
  // 4. Create Stripe payout
  const stripePayout = await stripe.payouts.create({
    amount: input.amount,
    currency: 'eur',
    destination: input.destination
  });
  
  // 5. Update payout with Stripe ID
  await db.payout.update({
    where: { id: payout.id },
    data: { stripePayoutId: stripePayout.id }
  });
  
  return payout;
}
```

---

# 9. Monitoring

## 9.1 Key Metrics

| Metric | Description |
|--------|-------------|
| stripe.api.calls | Total Stripe API calls |
| stripe.api.latency | API call latency |
| stripe.api.errors | API error count |
| webhook.received | Webhooks received |
| webhook.processed | Webhooks successfully processed |
| webhook.failed | Webhook processing failures |

## 9.2 Alerts

| Alert | Threshold |
|-------|-----------|
| High API error rate | > 1% |
| Webhook processing failures | > 5% |
| API latency | > 5 seconds |

---

# 10. Testing

## 10.1 Test Cards

| Card Number | Result |
|-------------|--------|
| 4242424242424242 | Success |
| 4000000000000002 | Decline |
| 4000000000009995 | Insufficient funds |
| 4000000000000069 | Expired card |

## 10.2 Test Webhooks

```bash
# Using Stripe CLI
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

---

# 11. Summary

Dieses Dokument beschreibt die vollständige technische Integration mit Stripe.

---

# 12. Contact

Backend Team
CargoBit Internal
