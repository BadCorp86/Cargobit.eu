# CargoBit Stripe Event Mapping Table
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert die Zuordnung zwischen Stripe-Events und CargoBit-Systemaktionen. Es dient als Referenz für die Webhook-Verarbeitung.

---

# 2. Event Mapping Table

## 2.1 Payment Events

| Stripe Event | CargoBit Action | Status Update |
|--------------|-----------------|---------------|
| payment_intent.succeeded | Create ledger entry, update wallet | pending → succeeded |
| payment_intent.payment_failed | Record failure reason | pending → failed |
| payment_intent.canceled | Record cancellation | pending → canceled |
| payment_intent.created | Log event only | N/A (created by us) |

## 2.2 Payout Events

| Stripe Event | CargoBit Action | Status Update |
|--------------|-----------------|---------------|
| payout.created | Update payout record | pending → processing |
| payout.paid | Create ledger entry (debit) | processing → succeeded |
| payout.failed | Record failure reason | processing → failed |
| payout.canceled | Return funds to wallet | processing → canceled |

## 2.3 Account Events

| Stripe Event | CargoBit Action | Notes |
|--------------|-----------------|-------|
| account.updated | Update account status | For connected accounts |

## 2.4 Charge Events

| Stripe Event | CargoBit Action | Notes |
|--------------|-----------------|-------|
| charge.succeeded | Already handled by payment_intent | Skip |
| charge.failed | Already handled by payment_intent | Skip |
| charge.refunded | Handle refund (future) | Create reversal entry |

---

# 3. Event Processing Details

## 3.1 payment_intent.succeeded

```typescript
async function handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const paymentId = paymentIntent.metadata.paymentId;
  
  await db.$transaction([
    // Update payment status
    db.payment.update({
      where: { id: paymentId },
      data: { 
        status: 'succeeded',
        processedAt: new Date()
      }
    }),
    
    // Create ledger entry
    db.ledgerEntry.create({
      data: {
        id: generateId(),
        walletId: paymentIntent.metadata.walletId,
        type: 'CREDIT',
        amount: paymentIntent.amount,
        reference: paymentId,
        referenceType: 'PAYMENT',
        balanceAfter: /* calculate */
      }
    }),
    
    // Update wallet balance
    db.wallet.update({
      where: { id: paymentIntent.metadata.walletId },
      data: { balance: { increment: paymentIntent.amount } }
    })
  ]);
}
```

## 3.2 payment_intent.payment_failed

```typescript
async function handlePaymentFailed(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const paymentId = paymentIntent.metadata.paymentId;
  
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: 'failed',
      processedAt: new Date(),
      metadata: {
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message
      }
    }
  });
}
```

## 3.3 payout.paid

```typescript
async function handlePayoutPaid(event: Stripe.Event): Promise<void> {
  const payout = event.data.object as Stripe.Payout;
  
  await db.$transaction([
    // Update payout status
    db.payout.update({
      where: { stripePayoutId: payout.id },
      data: { 
        status: 'succeeded',
        processedAt: new Date()
      }
    }),
    
    // Ledger entry already created at payout initiation
    // (debit was done when payout was created)
  ]);
}
```

---

# 4. Ignored Events

| Event | Reason |
|-------|--------|
| charge.succeeded | Redundant with payment_intent.succeeded |
| charge.failed | Redundant with payment_intent.payment_failed |
| customer.* | Not using customer objects |
| invoice.* | Not using invoicing |
| subscription.* | Not using subscriptions |

---

# 5. Event Processing Order

Events may arrive out of order. Handle with idempotency:

```typescript
async function processEvent(event: Stripe.Event): Promise<void> {
  // Check if already processed
  const existing = await db.stripeEvent.findUnique({
    where: { id: event.id }
  });
  
  if (existing?.status === 'processed') {
    return; // Skip
  }
  
  // Store event
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
  
  // Process based on type
  const handler = eventHandlers[event.type];
  if (handler) {
    await handler(event);
  }
  
  // Mark processed
  await db.stripeEvent.update({
    where: { id: event.id },
    data: { status: 'processed', processedAt: new Date() }
  });
}
```

---

# 6. Event Statistics

| Metric | Description |
|--------|-------------|
| events.received | Total events received |
| events.processed | Successfully processed |
| events.failed | Processing failures |
| events.ignored | Intentionally skipped |

---

# 7. Summary

Dieses Dokument definiert die Zuordnung zwischen Stripe-Events und CargoBit-Systemaktionen.

---

# 8. Contact

Engineering Team
CargoBit Internal
