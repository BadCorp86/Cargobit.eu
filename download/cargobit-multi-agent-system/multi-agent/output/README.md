# CargoBit Payment System

A production-ready payment system foundation with rate limiting, Stripe integration, and immutable audit logging.

## Overview

CargoBit is a payment processing platform designed for reliability, security, and compliance. It provides:

- **Rate Limiting**: Redis-based sliding window rate limiter with configurable presets
- **Stripe Integration**: Webhook handling with signature verification and idempotency
- **Audit Logging**: Hash-chain immutable logs with integrity verification
- **Backup & Recovery**: Automated database backup and restore procedures

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Stripe account (test mode)

### Installation

```bash
# Clone the repository
git clone https://github.com/cargobit/payment-system.git
cd payment-system

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

### Stripe Webhook Testing

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Project Structure

```
cargobit-payment-system/
├── src/
│   ├── lib/
│   │   └── rateLimit.ts         # Redis rate limiting library
│   ├── middleware/
│   │   └── rateLimit.ts         # Express/Next.js middleware
│   ├── services/
│   │   ├── auditLog.ts          # Hash-chain audit logging
│   │   └── stripeEvents.ts      # Stripe event processing
│   ├── webhooks/
│   │   └── stripe.ts            # Stripe webhook handler
│   └── jobs/
│       └── auditVerify.ts       # Audit chain verification
├── prisma/
│   └── schema.prisma            # Database schema
├── migrations/
│   ├── 0001_init.sql            # Initial schema
│   └── 0002_indexes.sql         # Performance indexes
├── ops/
│   ├── backup-db.sh             # Database backup script
│   ├── restore-db.sh            # Database restore script
│   ├── cron-backup.yaml         # CronJob configuration
│   └── export-audit-log.ts      # Audit log export
├── tests/
│   ├── rateLimit.test.ts        # Rate limiting tests
│   ├── middleware/
│   ├── webhooks/
│   └── services/
├── docs/
│   ├── security-policy.md
│   ├── compliance-readiness.md
│   ├── slas.md
│   └── ...
├── manifest.json
├── package.json
└── README.md
```

## Modules

### Rate Limiting

```typescript
import { createRateLimiter, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

// Use preset
const limiter = createRateLimiter(redis, 'paymentCreate');

// Or custom configuration
const limiter = createRateLimiter(redis, {
  limit: 10,
  windowMs: 60000,
  keyPrefix: 'payment:',
});

// Check limit
const result = await limiter.checkLimit('user:123');
if (!result.allowed) {
  // Handle rate limit exceeded
}
```

**Available Presets**:

| Preset | Limit | Window | Use Case |
|--------|-------|--------|----------|
| `publicApi` | 100/min | 60s | Public API endpoints |
| `authenticatedApi` | 1000/min | 60s | Authenticated users |
| `webhooks` | 500/min | 60s | Webhook processing |
| `adminApi` | 5000/min | 60s | Admin operations |
| `paymentCreate` | 10/min | 60s | Payment creation |
| `authAttempts` | 5/min | 60s | Auth brute-force protection |

### Stripe Integration

```typescript
// Webhook handler automatically:
// 1. Verifies signature
// 2. Checks idempotency
// 3. Routes to appropriate handler
// 4. Creates audit entries

// Supported events:
// - payment_intent.succeeded
// - payment_intent.payment_failed
// - charge.succeeded
// - charge.refunded
// - charge.dispute.created
// - payout.created, payout.paid, payout.failed
// - customer.created
```

### Audit Logging

```typescript
import { createAuditEntry } from '@/services/auditLog';

// Create audit entry
await createAuditEntry({
  actor: 'user:123',
  action: 'PAYMENT_CREATED',
  entity: 'Payment',
  entityId: 'pay_abc123',
  metadata: { amount: 1000, currency: 'usd' },
});

// Verify chain integrity
// Run: npm run audit:verify
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run test` | Run tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Lint code |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run backup` | Create database backup |
| `npm run restore <file>` | Restore from backup |
| `npm run audit:verify` | Verify audit chain integrity |
| `npm run audit:export` | Export audit logs |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `REDIS_URL` | Yes | Redis connection URL |
| `STRIPE_SECRET_KEY` | Yes | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `NODE_ENV` | No | Environment (development/production) |
| `LOG_LEVEL` | No | Log level (debug/info/warn/error) |

See `.env.example` for full configuration options.

## Compliance

### PCI-DSS SAQ-A

CargoBit operates under PCI-DSS SAQ-A compliance model:
- Cardholder data handled exclusively by Stripe
- No card numbers stored on CargoBit systems
- Stripe.js for client-side tokenization

### GDPR

- Data minimization implemented
- Data subject rights (export, deletion)
- Retention policies defined (180 days for audit logs)

### SOC 2 Type 2

Control implementations for:
- Security (CC6.0)
- Availability (A1.0)
- Confidentiality (C1.0)
- Processing Integrity (PI1.0)

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/rateLimit.test.ts

# Watch mode
npm run test:watch
```

**Coverage Requirements**:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Deployment

### Production Checklist

1. Configure production environment variables
2. Set Stripe live keys
3. Run database migrations
4. Enable monitoring and alerting
5. Configure backup schedule
6. Run production readiness checklist

See `docs/operational-readiness-checklist.md` for full details.

### Backup

```bash
# Create backup
./ops/backup-db.sh

# Restore from backup
./ops/restore-db.sh backup_2024-05-03.dump
```

## Documentation

- [Architecture Overview](docs/architecture-overview.md)
- [Security Policy](docs/security-policy.md)
- [Compliance Readiness](docs/compliance-readiness.md)
- [SLA Definitions](docs/slas.md)
- [Incident Playbook](docs/incident-playbook-payment-outage.md)
- [On-Call Runbook](docs/on-call-runbook.md)
- [Testing Guide](docs/testing-guide.md)

## License

UNLICENSED - Proprietary software

## Support

For support, contact support@cargobit.com
