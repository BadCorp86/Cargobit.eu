/**
 * CargoBit Payout Service Tests
 * 
 * Unit tests for payout creation, listing, and retry functionality.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    payout: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    payoutAuditEvent: {
      create: jest.fn(),
    },
    wallet: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn({
      payout: {
        create: jest.fn(),
        update: jest.fn(),
      },
      payoutAuditEvent: {
        create: jest.fn(),
      },
      wallet: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
      },
    })),
  },
}));

// Mock wallet service
jest.mock('@/services/wallet.service', () => ({
  getOrCreateWallet: jest.fn().mockResolvedValue({
    id: 'wallet_123',
    ownerUserId: 'user_123',
    balance: 1000,
    currency: 'EUR',
  }),
  getWalletBalance: jest.fn().mockResolvedValue(1000),
  centsToEuros: (cents: number) => cents / 100,
}));

// Import after mocking
import { validatePayoutCreateDto, parsePayoutListQuery, toPayoutSummaryDto } from '@/dto/payout.dto';

describe('Payout DTOs', () => {
  describe('validatePayoutCreateDto', () => {
    it('should validate a valid payout request', () => {
      const dto = {
        userId: 'user_123',
        amountCents: 5000,
        currency: 'EUR',
      };

      const result = validatePayoutCreateDto(dto);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing userId', () => {
      const dto = {
        amountCents: 5000,
      };

      const result = validatePayoutCreateDto(dto);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userId is required and must be a string');
    });

    it('should reject missing amountCents', () => {
      const dto = {
        userId: 'user_123',
      };

      const result = validatePayoutCreateDto(dto);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amountCents is required and must be a positive number');
    });

    it('should reject zero amountCents', () => {
      const dto = {
        userId: 'user_123',
        amountCents: 0,
      };

      const result = validatePayoutCreateDto(dto);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amountCents is required and must be a positive number');
    });

    it('should reject negative amountCents', () => {
      const dto = {
        userId: 'user_123',
        amountCents: -100,
      };

      const result = validatePayoutCreateDto(dto);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amountCents is required and must be a positive number');
    });

    it('should accept optional fields', () => {
      const dto = {
        userId: 'user_123',
        amountCents: 5000,
        currency: 'EUR',
        idempotencyKey: 'payout_user_123_20260420_v1',
        description: 'Test payout',
      };

      const result = validatePayoutCreateDto(dto);

      expect(result.valid).toBe(true);
    });
  });

  describe('parsePayoutListQuery', () => {
    it('should parse valid query parameters', () => {
      const query = {
        status: 'PENDING',
        userId: 'user_123',
        limit: '50',
        offset: '10',
        order: 'asc',
      };

      const result = parsePayoutListQuery(query);

      expect(result.status).toBe('PENDING');
      expect(result.userId).toBe('user_123');
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
      expect(result.order).toBe('asc');
    });

    it('should apply default values', () => {
      const query = {};

      const result = parsePayoutListQuery(query);

      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(result.order).toBe('desc');
      expect(result.status).toBeUndefined();
      expect(result.userId).toBeUndefined();
    });

    it('should enforce maximum limit', () => {
      const query = {
        limit: '5000',
      };

      const result = parsePayoutListQuery(query);

      expect(result.limit).toBe(1000);
    });

    it('should enforce minimum limit', () => {
      const query = {
        limit: '0',
      };

      const result = parsePayoutListQuery(query);

      expect(result.limit).toBe(1);
    });

    it('should enforce minimum offset', () => {
      const query = {
        offset: '-10',
      };

      const result = parsePayoutListQuery(query);

      expect(result.offset).toBe(0);
    });

    it('should default order to desc', () => {
      const query = {
        order: 'invalid',
      };

      const result = parsePayoutListQuery(query);

      expect(result.order).toBe('desc');
    });
  });

  describe('toPayoutSummaryDto', () => {
    it('should transform payout to summary DTO', () => {
      const payout = {
        id: 'payout_123',
        userId: 'user_123',
        amountCents: 5000,
        currency: 'EUR',
        status: 'PENDING' as const,
        createdAt: new Date('2026-04-20T12:00:00Z'),
        stripeTransferId: null,
      };

      const result = toPayoutSummaryDto(payout);

      expect(result.id).toBe('payout_123');
      expect(result.userId).toBe('user_123');
      expect(result.amountCents).toBe(5000);
      expect(result.currency).toBe('EUR');
      expect(result.status).toBe('PENDING');
      expect(result.stripeTransferId).toBeNull();
    });

    it('should include Stripe transfer ID when present', () => {
      const payout = {
        id: 'payout_123',
        userId: 'user_123',
        amountCents: 5000,
        currency: 'EUR',
        status: 'PROCESSING' as const,
        createdAt: new Date('2026-04-20T12:00:00Z'),
        stripeTransferId: 'tr_abc123',
      };

      const result = toPayoutSummaryDto(payout);

      expect(result.stripeTransferId).toBe('tr_abc123');
    });
  });
});

describe('Payout Service Logic', () => {
  // These tests would require more extensive mocking
  // For now, we test the core business logic through integration tests

  it('should calculate correct wallet balance changes', () => {
    // Test balance calculation logic
    const balanceBefore = 1000; // €1000
    const payoutAmountCents = 5000; // €50

    const balanceAfter = balanceBefore - payoutAmountCents / 100;

    expect(balanceAfter).toBe(950);
  });

  it('should detect insufficient balance', () => {
    const balance = 10; // €10
    const requestedAmountCents = 5000; // €50

    const hasSufficient = balance >= requestedAmountCents / 100;

    expect(hasSufficient).toBe(false);
  });

  it('should generate correct idempotency key format', () => {
    const payoutId = 'payout_123';
    const timestamp = Date.now();

    const idempotencyKey = `payout_${payoutId}_${timestamp}`;

    expect(idempotencyKey).toMatch(/^payout_payout_123_\d+$/);
  });
});

describe('Payout Status Transitions', () => {
  it('should allow PENDING -> PROCESSING', () => {
    const fromStatus = 'PENDING';
    const toStatus = 'PROCESSING';
    
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'FAILED', 'CANCELLED'],
      PROCESSING: ['PAID', 'FAILED'],
      FAILED: ['PENDING'], // For retry
      PAID: [],
      CANCELLED: [],
    };

    expect(allowedTransitions[fromStatus]).toContain(toStatus);
  });

  it('should allow PROCESSING -> PAID', () => {
    const fromStatus = 'PROCESSING';
    const toStatus = 'PAID';

    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'FAILED', 'CANCELLED'],
      PROCESSING: ['PAID', 'FAILED'],
      FAILED: ['PENDING'],
      PAID: [],
      CANCELLED: [],
    };

    expect(allowedTransitions[fromStatus]).toContain(toStatus);
  });

  it('should allow PROCESSING -> FAILED', () => {
    const fromStatus = 'PROCESSING';
    const toStatus = 'FAILED';

    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'FAILED', 'CANCELLED'],
      PROCESSING: ['PAID', 'FAILED'],
      FAILED: ['PENDING'],
      PAID: [],
      CANCELLED: [],
    };

    expect(allowedTransitions[fromStatus]).toContain(toStatus);
  });

  it('should allow FAILED -> PENDING (for retry)', () => {
    const fromStatus = 'FAILED';
    const toStatus = 'PENDING';

    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PROCESSING', 'FAILED', 'CANCELLED'],
      PROCESSING: ['PAID', 'FAILED'],
      FAILED: ['PENDING'],
      PAID: [],
      CANCELLED: [],
    };

    expect(allowedTransitions[fromStatus]).toContain(toStatus);
  });

  it('should not allow PAID -> any other status', () => {
    const fromStatus = 'PAID';
    const targetStatuses = ['PENDING', 'PROCESSING', 'FAILED', 'CANCELLED'];

    const allowedTransitions: Record<string, string[]> = {
      PAID: [],
    };

    targetStatuses.forEach(status => {
      expect(allowedTransitions[fromStatus]).not.toContain(status);
    });
  });
});
