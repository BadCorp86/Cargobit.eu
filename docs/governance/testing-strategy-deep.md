# CargoBit Testing Strategy (Deep)
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert die umfassende Teststrategie für das CargoBit System. Es stellt sicher, dass alle Komponenten gründlich getestet werden und Qualitätsstandards eingehalten werden.

---

# 2. Test Pyramid

```
                    ┌─────────┐
                    │   E2E   │  ← Few, Slow, Expensive
                    │  Tests  │
                  ┌─┴─────────┴─┐
                  │ Integration │  ← Some, Medium
                  │   Tests     │
                ┌─┴─────────────┴─┐
                │    Unit Tests    │  ← Many, Fast, Cheap
                │                  │
                └──────────────────┘
```

---

# 3. Test Types

## 3.1 Unit Tests

| Aspect | Description |
|--------|-------------|
| Scope | Single function/class |
| Speed | < 100ms per test |
| Dependencies | Mocked |
| Coverage Target | 80% overall, 100% critical paths |

### Example

```typescript
describe('PaymentService', () => {
  describe('createPayment', () => {
    it('should create payment with valid input', async () => {
      const input = { amount: 1000, currency: 'EUR' };
      const result = await paymentService.createPayment(input);
      
      expect(result.status).toBe('pending');
      expect(result.amount).toBe(1000);
    });

    it('should reject invalid amount', async () => {
      const input = { amount: -100, currency: 'EUR' };
      
      await expect(paymentService.createPayment(input))
        .rejects.toThrow('Invalid amount');
    });
  });
});
```

## 3.2 Integration Tests

| Aspect | Description |
|--------|-------------|
| Scope | Multiple components |
| Speed | 100ms - 5s per test |
| Dependencies | Real (DB, services) |
| Coverage Target | Critical flows |

### Example

```typescript
describe('Payment API Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    await startTestServer();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await stopTestServer();
  });

  it('should process payment end-to-end', async () => {
    const response = await request(app)
      .post('/v1/payments')
      .set('Authorization', `Bearer ${testApiKey}`)
      .send({ amount: 1000, currency: 'EUR' });

    expect(response.status).toBe(201);
    expect(response.body.paymentId).toBeDefined();

    const payment = await db.payment.findUnique({
      where: { id: response.body.paymentId }
    });
    expect(payment.status).toBe('pending');
  });
});
```

## 3.3 End-to-End Tests

| Aspect | Description |
|--------|-------------|
| Scope | Full system |
| Speed | 5s - 60s per test |
| Dependencies | All real |
| Coverage Target | Happy paths + critical errors |

### Example

```typescript
describe('Payment Flow E2E', () => {
  it('should complete full payment flow', async () => {
    // 1. Create payment
    const createResponse = await api.post('/v1/payments', {
      amount: 1000,
      currency: 'EUR'
    });

    // 2. Simulate Stripe webhook
    const webhookResponse = await stripe.simulateWebhook(
      'payment_intent.succeeded',
      { paymentIntentId: createResponse.paymentId }
    );

    // 3. Verify payment status
    const statusResponse = await api.get(
      `/v1/payments/${createResponse.paymentId}`
    );

    expect(statusResponse.status).toBe('succeeded');
  });
});
```

---

# 4. Specialized Tests

## 4.1 Determinism Tests

```typescript
describe('Pipeline Determinism', () => {
  it('should produce identical output for identical input', () => {
    const input = { /* ... */ };
    
    const output1 = runPipeline(input);
    const output2 = runPipeline(input);
    
    expect(JSON.stringify(output1)).toBe(JSON.stringify(output2));
  });
});
```

## 4.2 Schema Validation Tests

```typescript
describe('Database Schema', () => {
  it('should have all required tables', async () => {
    const tables = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    
    const requiredTables = ['Payment', 'Wallet', 'LedgerEntry', 'AuditLog'];
    requiredTables.forEach(table => {
      expect(tables).toContain(table);
    });
  });
});
```

## 4.3 Webhook Simulation Tests

```typescript
describe('Webhook Processing', () => {
  it('should validate Stripe signature', async () => {
    const payload = { /* ... */ };
    const signature = generateTestSignature(payload, webhookSecret);
    
    const response = await request(app)
      .post('/webhooks/stripe')
      .set('Stripe-Signature', signature)
      .send(payload);

    expect(response.status).toBe(200);
  });

  it('should reject invalid signature', async () => {
    const response = await request(app)
      .post('/webhooks/stripe')
      .set('Stripe-Signature', 'invalid')
      .send({});

    expect(response.status).toBe(400);
  });
});
```

## 4.4 Audit Log Integrity Tests

```typescript
describe('Audit Log Hash Chain', () => {
  it('should maintain hash chain integrity', async () => {
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: 'asc' }
    });

    for (let i = 1; i < logs.length; i++) {
      const prev = logs[i - 1];
      const curr = logs[i];
      
      const expectedHash = computeHash(prev.hash, curr.action, curr.createdAt);
      expect(curr.previousHash).toBe(prev.hash);
    }
  });
});
```

---

# 5. Test Data Management

## 5.1 Fixtures

```
tests/
├── fixtures/
│   ├── payments.json
│   ├── wallets.json
│   ├── stripe-events.json
│   └── users.json
```

## 5.2 Factories

```typescript
const paymentFactory = {
  build: (overrides = {}) => ({
    amount: 1000,
    currency: 'EUR',
    status: 'pending',
    ...overrides
  }),
  
  create: async (overrides = {}) => {
    const data = paymentFactory.build(overrides);
    return db.payment.create({ data });
  }
};
```

---

# 6. Coverage Targets

| Component | Line Coverage | Branch Coverage |
|-----------|---------------|-----------------|
| Services | 80% | 75% |
| Controllers | 80% | 75% |
| Webhooks | 100% | 100% |
| Ledger | 100% | 100% |
| Utilities | 80% | 75% |

---

# 7. Test Environment

## 7.1 Environments

| Environment | Purpose | Data |
|-------------|---------|------|
| Unit | Fast feedback | Mocks |
| Integration | Component testing | Test DB |
| E2E | Full flow testing | Test DB + Stripe sandbox |

## 7.2 CI/CD Integration

```yaml
# GitHub Actions
test:
  steps:
    - name: Unit tests
      run: npm run test:unit
      
    - name: Integration tests
      run: npm run test:integration
      
    - name: E2E tests
      run: npm run test:e2e
      
    - name: Coverage report
      run: npm run test:coverage
```

---

# 8. Performance Testing

## 8.1 Load Testing

```typescript
describe('Load Tests', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      api.post('/v1/payments', { amount: 1000, currency: 'EUR' })
    );

    const results = await Promise.allSettled(requests);
    const successful = results.filter(r => r.status === 'fulfilled');
    
    expect(successful.length).toBeGreaterThan(95); // 95% success rate
  });
});
```

## 8.2 Performance Benchmarks

| Endpoint | Target | Maximum |
|----------|--------|---------|
| POST /payments | 100ms | 200ms |
| GET /payments/:id | 50ms | 100ms |
| POST /webhooks | 500ms | 2000ms |

---

# 9. Summary

Diese Teststrategie stellt sicher, dass alle Komponenten gründlich getestet werden und Qualitätsstandards eingehalten werden.

---

# 10. Contact

QA Team
CargoBit Internal
