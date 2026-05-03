# Testing Guide

## Overview

This document describes the testing strategy and structure for the CargoBit Payment System.

## Test Structure

```
tests/
├── rateLimit.test.ts          # Rate limiting library unit tests
├── middleware/
│   └── rateLimit.test.ts      # Middleware integration tests
├── webhooks/
│   └── stripe.test.ts         # Stripe webhook handler tests
└── services/
    └── stripeEvents.test.ts   # Stripe event processing tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/rateLimit.test.ts

# Run tests in watch mode
npm run test:watch
```

## Test Categories

### 1. Unit Tests

Unit tests focus on individual functions and classes in isolation.

**Rate Limiting (`tests/rateLimit.test.ts`)**:
- RedisRateLimitStore operations
- RateLimiter check/reset logic
- Factory functions
- Utility functions (extractClientIp, createRateLimitKey)
- Edge cases (concurrent requests, unicode, long identifiers)

### 2. Integration Tests

Integration tests verify components work together correctly.

**Middleware (`tests/middleware/rateLimit.test.ts`)**:
- Request handling
- Path exclusions
- IP extraction
- Preset configurations
- Error handling (fail-open behavior)

### 3. Webhook Tests

Webhook tests ensure secure and reliable event processing.

**Stripe Webhooks (`tests/webhooks/stripe.test.ts`)**:
- Signature verification
- Idempotency
- Event routing
- Error handling
- Security (replay attacks, timestamp validation)

### 4. Service Tests

Service tests validate business logic.

**Stripe Events (`tests/services/stripeEvents.test.ts`)**:
- Payment intent handlers
- Charge handlers (success, refund, dispute)
- Payout handlers
- Customer handlers
- Edge cases (zero amounts, multiple currencies)

## Mocking Strategy

### Redis Mocking

The rate limiting tests use an in-memory mock Redis implementation:

```typescript
class MockRedis {
  private store: Map<string, { score: number; value: string }[]> = new Map();

  async eval(script, numKeys, ...args) {
    // Simulates Redis Lua script execution
  }

  async del(key) { /* ... */ }
  async zrange(key, start, stop) { /* ... */ }
  async zrem(key, ...members) { /* ... */ }
}
```

### Prisma Mocking

Database operations are mocked using Jest:

```typescript
jest.mock('@/lib/prisma', () => ({
  prisma: {
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    // ... other models
  },
}));
```

### Stripe Mocking

Stripe SDK is mocked to test webhook processing:

```typescript
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});
```

## Coverage Requirements

Minimum coverage thresholds:

| Metric    | Threshold |
|-----------|-----------|
| Branches  | 70%       |
| Functions | 70%       |
| Lines     | 70%       |
| Statements| 70%       |

## Test Best Practices

### 1. Isolation

Each test should be independent and not rely on other tests:

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  redis.reset();
});
```

### 2. Descriptive Names

Use clear, descriptive test names:

```typescript
it('should block requests exceeding limit', async () => {
  // ...
});

it('should return 429 with proper error format', async () => {
  // ...
});
```

### 3. Arrange-Act-Assert

Structure tests clearly:

```typescript
it('should update payment status', async () => {
  // Arrange
  const event = createPaymentIntentEvent();
  const mockPayment = { id: 'pay_123', status: 'PENDING' };
  mockPrisma.findFirst.mockResolvedValue(mockPayment);

  // Act
  await processStripeEvent(event);

  // Assert
  expect(mockPrisma.update).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'SUCCEEDED' })
  );
});
```

### 4. Edge Cases

Test boundary conditions:

```typescript
describe('Edge Cases', () => {
  it('should handle zero amount payments', async () => { /* ... */ });
  it('should handle very large amounts', async () => { /* ... */ });
  it('should handle unicode identifiers', async () => { /* ... */ });
});
```

## Security Testing

### Signature Verification

```typescript
it('should reject requests without signature', async () => {
  const response = await POST(req);
  expect(response.status).toBe(400);
});

it('should reject invalid signatures', async () => {
  mockStripe.webhooks.constructEvent.mockImplementation(() => {
    throw new Error('Invalid signature');
  });
  // ...
});
```

### Replay Attack Prevention

```typescript
it('should handle replay attacks', async () => {
  mockPrisma.findUnique.mockResolvedValue({
    id: mockEvent.id,
    createdAt: new Date(Date.now() - 86400000),
  });

  const response = await POST(req);
  const json = await response.json();
  expect(json.note).toBe('Duplicate event');
});
```

## Performance Testing

For rate limiting, test concurrent scenarios:

```typescript
it('should handle concurrent increments', async () => {
  const promises = Array(10).fill(null).map(() =>
    limiter.checkLimit('user')
  );
  const results = await Promise.all(promises);

  const allowed = results.filter(r => r.allowed).length;
  expect(allowed).toBe(3);
});
```

## CI/CD Integration

Tests run automatically in CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

1. **"Cannot find module '@/lib/prisma'"**
   - Ensure `moduleNameMapper` is configured in jest.config.js

2. **"Test timeout exceeded"**
   - Increase timeout: `jest.setTimeout(30000)`
   - Or use `testTimeout` in jest.config.js

3. **"Jest did not exit one second after the test run"**
   - Check for open handles (connections, timers)
   - Use `--detectOpenHandles` flag

4. **"Cannot read property of undefined"**
   - Check mock implementation
   - Ensure all required mocks are set up
