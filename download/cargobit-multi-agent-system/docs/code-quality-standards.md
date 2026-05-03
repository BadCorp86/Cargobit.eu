# CargoBit Code Quality Standards
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert die Code-Qualitätsstandards für das CargoBit System. Es stellt sicher, dass Code wartbar, sicher und deterministisch ist.

---

# 2. Core Principles

| Principle | Description |
|-----------|-------------|
| Determinism | No randomness, no timestamps, no Date.now() |
| Clarity | Code should be self-documenting |
| Simplicity | No over-engineering |
| Security | No secrets, no PII in logs |
| Testability | All code must be testable |

---

# 3. Forbidden Patterns

## 3.1 Never Use

| Pattern | Reason | Alternative |
|---------|--------|-------------|
| `Date.now()` | Non-deterministic | Use passed timestamp |
| `Math.random()` | Non-deterministic | Use seeded random |
| `new Date()` | Non-deterministic | Use injected clock |
| `TODO` / `FIXME` | Incomplete code | Complete or create ticket |
| `console.log` | Unstructured logging | Use structured logger |
| Hardcoded secrets | Security risk | Environment variables |
| Hardcoded URLs | Inflexible | Configuration |

## 3.2 Deterministic Code

```typescript
// ❌ Bad: Non-deterministic
function createPayment(amount: number) {
  return {
    id: `pay_${Date.now()}`,  // Non-deterministic!
    amount,
    createdAt: new Date()
  };
}

// ✅ Good: Deterministic
function createPayment(amount: number, options: { id: string; timestamp: string }) {
  return {
    id: options.id,
    amount,
    createdAt: options.timestamp
  };
}
```

---

# 4. Code Style

## 4.1 TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## 4.2 ESLint Rules

```json
{
  "rules": {
    "no-console": "error",
    "no-debugger": "error",
    "no-warning-comments": ["error", { "terms": ["TODO", "FIXME"] }],
    "no-var": "error",
    "prefer-const": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error"
  }
}
```

## 4.3 Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

# 5. Naming Conventions

## 5.1 General

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `paymentId` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Functions | camelCase | `createPayment` |
| Classes | PascalCase | `PaymentService` |
| Interfaces | PascalCase | `PaymentRepository` |
| Types | PascalCase | `PaymentStatus` |
| Files | kebab-case | `payment-service.ts` |
| Directories | kebab-case | `payment-service/` |

## 5.2 Database

| Element | Convention | Example |
|---------|------------|---------|
| Tables | PascalCase | `Payment` |
| Columns | camelCase | `paymentId` |
| Indexes | idx_table_column | `idx_payment_userId` |
| Constraints | fk_table_column | `fk_payment_userId` |

---

# 6. Documentation Standards

## 6.1 Code Comments

```typescript
/**
 * Creates a new payment in the system.
 * 
 * @param input - Payment creation parameters
 * @param input.amount - Amount in smallest currency unit (cents)
 * @param input.currency - ISO 4217 currency code
 * @param options - Additional options
 * @param options.idempotencyKey - Unique key for idempotency
 * @returns Created payment with ID and status
 * @throws ValidationError if amount is invalid
 * @throws RateLimitError if rate limit exceeded
 */
async function createPayment(
  input: CreatePaymentInput,
  options: CreatePaymentOptions
): Promise<Payment> {
  // Implementation
}
```

## 6.2 README Template

```markdown
# Module Name

Brief description.

## Installation

\`\`\`bash
npm install @cargobit/module
\`\`\`

## Usage

\`\`\`typescript
import { createPayment } from '@cargobit/module';

const payment = await createPayment({ amount: 1000, currency: 'EUR' });
\`\`\`

## API

### createPayment(input)

Description.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| amount | number | Amount in cents |

#### Returns

Payment object.
```

---

# 7. Error Handling

## 7.1 Error Classes

```typescript
class CargoBitError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'CargoBitError';
  }
}

class ValidationError extends CargoBitError {
  constructor(message: string, public field?: string) {
    super(message, 'ERR_VALIDATION', 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends CargoBitError {
  constructor(resource: string) {
    super(`${resource} not found`, 'ERR_NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}
```

## 7.2 Error Handling Pattern

```typescript
async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  try {
    // Validate input
    validateInput(input);
    
    // Process payment
    const payment = await paymentRepository.create(input);
    
    return payment;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    
    // Log unexpected error
    logger.error('Unexpected error in createPayment', {
      error: error.message,
      correlationId: getCorrelationId()
    });
    
    throw new CargoBitError(
      'Failed to create payment',
      'ERR_INTERNAL',
      500
    );
  }
}
```

---

# 8. Code Review Standards

## 8.1 Review Checklist

- [ ] No TODO/FIXME comments
- [ ] No hardcoded values
- [ ] No secrets in code
- [ ] No PII in logs
- [ ] Deterministic code
- [ ] Tests included
- [ ] Documentation updated
- [ ] Types defined
- [ ] Error handling complete

## 8.2 Approval Requirements

| Change Type | Reviewers Required |
|-------------|-------------------|
| Documentation | 1 |
| Bug fix | 2 |
| Feature | 2 |
| Security-related | 2 + Security team |
| Schema change | 2 + Architect |

---

# 9. Git Standards

## 9.1 Commit Messages

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation |
| style | Formatting |
| refactor | Code refactoring |
| test | Tests |
| chore | Maintenance |

### Example

```
feat(payment): add webhook retry logic

Implement exponential backoff for failed webhook deliveries.
Max 5 retries with 72-hour window.

Closes #123
```

## 9.2 Branch Naming

| Pattern | Example |
|---------|---------|
| feature/ | feature/webhook-retry |
| fix/ | fix/payment-timeout |
| hotfix/ | hotfix/security-patch |
| chore/ | chore/update-dependencies |

---

# 10. Summary

Diese Standards stellen sicher, dass Code wartbar, sicher und deterministisch ist.

---

# 11. Contact

Engineering Team
CargoBit Internal
