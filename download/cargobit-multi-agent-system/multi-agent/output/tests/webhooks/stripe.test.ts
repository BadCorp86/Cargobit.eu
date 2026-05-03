/**
 * Stripe Webhook Handler Tests
 * CargoBit Payment System
 *
 * Comprehensive tests for Stripe webhook processing including:
 * - Signature verification
 * - Idempotency
 * - Event routing
 * - Error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    stripeEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    wallet: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    payout: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock services
jest.mock('@/services/stripeEvents', () => ({
  processStripeEvent: jest.fn(),
}));

jest.mock('@/services/auditLog', () => ({
  createAuditEntry: jest.fn(),
}));

// Import after mocking
import { POST, GET } from '../../src/webhooks/stripe';
import { prisma } from '@/lib/prisma';
import { processStripeEvent } from '@/services/stripeEvents';
import { createAuditEntry } from '@/services/auditLog';

// =============================================================================
// HELPERS
// =============================================================================

function createMockWebhookRequest(options: {
  body?: string;
  signature?: string;
}): NextRequest {
  const headers = new Headers();
  if (options.signature) {
    headers.set('stripe-signature', options.signature);
  }

  return {
    text: () => Promise.resolve(options.body || '{}'),
    headers,
    nextUrl: new URL('https://example.com/api/webhooks/stripe'),
  } as unknown as NextRequest;
}

function createMockStripeEvent(overrides: Partial<Stripe.Event> = {}): Stripe.Event {
  return {
    id: `evt_${Date.now()}`,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: `pi_${Date.now()}`,
        object: 'payment_intent',
        amount: 1000,
        currency: 'usd',
      } as any,
    },
    api_version: '2024-11-20.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    ...overrides,
  } as Stripe.Event;
}

// =============================================================================
// TEST SUITE: POST Handler
// =============================================================================

describe('POST /api/webhooks/stripe', () => {
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStripe = new Stripe('sk_test_123') as jest.Mocked<Stripe>;
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
  });

  describe('Signature Verification', () => {
    it('should reject requests without signature', async () => {
      const req = createMockWebhookRequest({
        body: JSON.stringify({ id: 'evt_123' }),
        signature: undefined,
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Missing signature');
    });

    it('should reject invalid signatures', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const req = createMockWebhookRequest({
        body: JSON.stringify({ id: 'evt_123' }),
        signature: 'invalid_signature',
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Invalid signature');
    });

    it('should accept valid signatures', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
        type: mockEvent.type,
      });
      (processStripeEvent as jest.Mock).mockResolvedValue(undefined);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
    });
  });

  describe('Idempotency', () => {
    it('should detect duplicate events', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
        type: mockEvent.type,
        createdAt: new Date(),
      });

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.note).toBe('Duplicate event');
      expect(processStripeEvent).not.toHaveBeenCalled();
    });

    it('should process new events', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
        type: mockEvent.type,
      });
      (processStripeEvent as jest.Mock).mockResolvedValue(undefined);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(processStripeEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should record event in database', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
        type: mockEvent.type,
      });
      (processStripeEvent as jest.Mock).mockResolvedValue(undefined);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      await POST(req);

      expect(prisma.stripeEvent.create).toHaveBeenCalledWith({
        data: {
          id: mockEvent.id,
          type: mockEvent.type,
          payload: mockEvent.data,
        },
      });
    });
  });

  describe('Event Processing', () => {
    it('should process payment_intent.succeeded', async () => {
      const mockEvent = createMockStripeEvent({
        type: 'payment_intent.succeeded',
      });
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
      });
      (processStripeEvent as jest.Mock).mockResolvedValue(undefined);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      expect(processStripeEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle processing errors gracefully', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
      });
      (processStripeEvent as jest.Mock).mockRejectedValue(
        new Error('Processing failed')
      );
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      const response = await POST(req);
      const json = await response.json();

      expect(json.error).toBe('Processing failed');
    });

    it('should include event ID in error response', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
      });
      (processStripeEvent as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      const response = await POST(req);
      const json = await response.json();

      expect(json.eventId).toBe(mockEvent.id);
    });
  });

  describe('Response Format', () => {
    it('should return success response with event ID', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
      });
      (processStripeEvent as jest.Mock).mockResolvedValue(undefined);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      const response = await POST(req);
      const json = await response.json();

      expect(json.received).toBe(true);
      expect(json.eventId).toBe(mockEvent.id);
      expect(json.duration).toBeDefined();
    });

    it('should indicate retryable errors', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
      });
      (processStripeEvent as jest.Mock).mockRejectedValue(
        new Error('connection timeout')
      );
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      const response = await POST(req);
      const json = await response.json();

      expect(json.retryable).toBe(true);
      expect(response.status).toBe(500);
    });

    it('should return 200 for non-retryable errors (acknowledged)', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
      });
      (processStripeEvent as jest.Mock).mockRejectedValue(
        new Error('Invalid data')
      );
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      const response = await POST(req);
      const json = await response.json();

      expect(json.retryable).toBe(false);
      expect(response.status).toBe(200);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit entry for received webhook', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
      });
      (processStripeEvent as jest.Mock).mockResolvedValue(undefined);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      await POST(req);

      expect(createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: 'stripe',
          action: 'WEBHOOK_RECEIVED',
          entity: 'StripeEvent',
          entityId: mockEvent.id,
        })
      );
    });

    it('should create audit entry for processed webhook', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
      });
      (processStripeEvent as jest.Mock).mockResolvedValue(undefined);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      await POST(req);

      expect(createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'WEBHOOK_PROCESSED',
        })
      );
    });

    it('should create audit entry for failed webhook', async () => {
      const mockEvent = createMockStripeEvent();
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
        id: mockEvent.id,
      });
      (processStripeEvent as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      const req = createMockWebhookRequest({
        body: JSON.stringify(mockEvent),
        signature: 'valid_signature',
      });

      await POST(req);

      expect(createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'WEBHOOK_ERROR',
        })
      );
    });
  });
});

// =============================================================================
// TEST SUITE: GET Handler (Health Check)
// =============================================================================

describe('GET /api/webhooks/stripe', () => {
  it('should return health status', async () => {
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('healthy');
    expect(json.endpoint).toBe('/api/webhooks/stripe');
    expect(json.supportedEvents).toBeDefined();
    expect(typeof json.supportedEvents).toBe('number');
  });
});

// =============================================================================
// TEST SUITE: Event Types
// =============================================================================

describe('Supported Event Types', () => {
  const supportedEvents = [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'charge.succeeded',
    'charge.refunded',
    'charge.dispute.created',
    'customer.created',
    'payout.created',
    'payout.paid',
    'payout.failed',
  ];

  it.each(supportedEvents)('should handle %s event type', async (eventType) => {
    const mockEvent = createMockStripeEvent({ type: eventType });
    const mockStripe = new Stripe('sk_test_123') as jest.Mocked<Stripe>;

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
    (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
      id: mockEvent.id,
    });
    (processStripeEvent as jest.Mock).mockResolvedValue(undefined);
    (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';

    const req = createMockWebhookRequest({
      body: JSON.stringify(mockEvent),
      signature: 'valid_signature',
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(processStripeEvent).toHaveBeenCalledWith(mockEvent);

    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
  });
});

// =============================================================================
// TEST SUITE: Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('should handle malformed JSON body', async () => {
    const mockStripe = new Stripe('sk_test_123') as jest.Mocked<Stripe>;
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid JSON');
    });

    const req = createMockWebhookRequest({
      body: 'not valid json',
      signature: 'some_signature',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('should handle very large payloads', async () => {
    const mockEvent = createMockStripeEvent({
      data: {
        object: {
          id: 'pi_large',
          metadata: {
            largeField: 'x'.repeat(10000),
          },
        } as any,
      },
    });

    const mockStripe = new Stripe('sk_test_123') as jest.Mocked<Stripe>;
    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
    (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
      id: mockEvent.id,
    });
    (processStripeEvent as jest.Mock).mockResolvedValue(undefined);
    (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

    const req = createMockWebhookRequest({
      body: JSON.stringify(mockEvent),
      signature: 'valid_signature',
    });

    const response = await POST(req);

    expect(response.status).toBe(200);
  });

  it('should handle empty payload', async () => {
    const mockStripe = new Stripe('sk_test_123') as jest.Mocked<Stripe>;
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Empty payload');
    });

    const req = createMockWebhookRequest({
      body: '',
      signature: 'some_signature',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('should handle concurrent duplicate events', async () => {
    const mockEvent = createMockStripeEvent();
    const mockStripe = new Stripe('sk_test_123') as jest.Mocked<Stripe>;

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    // Simulate race condition: first call returns null, second returns existing
    let callCount = 0;
    (prisma.stripeEvent.findUnique as jest.Mock).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return null;
      }
      return { id: mockEvent.id };
    });

    (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
      id: mockEvent.id,
    });
    (processStripeEvent as jest.Mock).mockResolvedValue(undefined);
    (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

    const req = createMockWebhookRequest({
      body: JSON.stringify(mockEvent),
      signature: 'valid_signature',
    });

    // Send two concurrent requests
    const [response1, response2] = await Promise.all([
      POST(req),
      POST(req),
    ]);

    // Both should succeed (one processed, one marked as duplicate)
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
  });

  it('should handle processing timeout', async () => {
    const mockEvent = createMockStripeEvent();
    const mockStripe = new Stripe('sk_test_123') as jest.Mocked<Stripe>;

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
    (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({
      id: mockEvent.id,
    });

    // Simulate slow processing
    (processStripeEvent as jest.Mock).mockImplementation(
      () => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Processing timeout')), 100)
      )
    );
    (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

    const req = createMockWebhookRequest({
      body: JSON.stringify(mockEvent),
      signature: 'valid_signature',
    });

    const response = await POST(req);
    const json = await response.json();

    expect(json.error).toBe('Processing failed');
    expect(json.retryable).toBe(true);
  });
});

// =============================================================================
// TEST SUITE: Security
// =============================================================================

describe('Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('should not expose internal errors to client', async () => {
    const mockStripe = new Stripe('sk_test_123') as jest.Mocked<Stripe>;
    mockStripe.webhooks.constructEvent.mockReturnValue(createMockStripeEvent());
    (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.stripeEvent.create as jest.Mock).mockResolvedValue({});
    (processStripeEvent as jest.Mock).mockRejectedValue(
      new Error('Internal database connection string: postgres://...')
    );
    (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

    const req = createMockWebhookRequest({
      body: JSON.stringify(createMockStripeEvent()),
      signature: 'valid_signature',
    });

    const response = await POST(req);
    const json = await response.json();

    // Should not expose internal error details
    expect(json.error).not.toContain('postgres://');
    expect(json.error).not.toContain('connection string');
  });

  it('should validate timestamp tolerance', async () => {
    const mockStripe = new Stripe('sk_test_123') as jest.Mocked<Stripe>;
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      const error = new Error('Timestamp outside tolerance');
      (error as any).type = 'StripeSignatureVerificationError';
      throw error;
    });

    const req = createMockWebhookRequest({
      body: JSON.stringify(createMockStripeEvent()),
      signature: 'old_signature',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
  });

  it('should handle replay attacks', async () => {
    const mockEvent = createMockStripeEvent({
      id: 'evt_replay_attack',
    });
    const mockStripe = new Stripe('sk_test_123') as jest.Mocked<Stripe>;

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
    (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue({
      id: mockEvent.id,
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
    });

    const req = createMockWebhookRequest({
      body: JSON.stringify(mockEvent),
      signature: 'valid_signature',
    });

    const response = await POST(req);
    const json = await response.json();

    // Should be marked as duplicate
    expect(json.note).toBe('Duplicate event');
    expect(processStripeEvent).not.toHaveBeenCalled();
  });
});
