/**
 * Stripe Event Processing Service Tests
 * CargoBit Payment System
 *
 * Comprehensive tests for Stripe event handlers including:
 * - Payment Intent handlers
 * - Charge handlers
 * - Payout handlers
 * - Customer handlers
 * - Event routing
 */

import Stripe from 'stripe';
import {
  processStripeEvent,
  isEventProcessed,
  getUnprocessedEvents,
} from '../../src/services/stripeEvents';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
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
    payout: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    stripeEvent: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock audit log
jest.mock('./auditLog', () => ({
  createAuditEntry: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { createAuditEntry } from './auditLog';

// =============================================================================
// HELPERS
// =============================================================================

function createPaymentIntentEvent(
  overrides: Partial<Stripe.PaymentIntent> = {}
): Stripe.PaymentIntentSucceededEvent {
  return {
    id: `evt_${Date.now()}`,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: `pi_${Date.now()}`,
        object: 'payment_intent',
        amount: 1000,
        currency: 'usd',
        status: 'succeeded',
        ...overrides,
      } as Stripe.PaymentIntent,
    },
    api_version: '2024-11-20.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  } as Stripe.PaymentIntentSucceededEvent;
}

function createChargeEvent(
  overrides: Partial<Stripe.Charge> = {}
): Stripe.ChargeSucceededEvent {
  return {
    id: `evt_${Date.now()}`,
    type: 'charge.succeeded',
    data: {
      object: {
        id: `ch_${Date.now()}`,
        object: 'charge',
        amount: 1000,
        currency: 'usd',
        paid: true,
        payment_intent: `pi_${Date.now()}`,
        ...overrides,
      } as Stripe.Charge,
    },
    api_version: '2024-11-20.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  } as Stripe.ChargeSucceededEvent;
}

function createPayoutEvent(
  overrides: Partial<Stripe.Payout> = {}
): Stripe.PayoutCreatedEvent {
  return {
    id: `evt_${Date.now()}`,
    type: 'payout.created',
    data: {
      object: {
        id: `po_${Date.now()}`,
        object: 'payout',
        amount: 5000,
        currency: 'usd',
        status: 'pending',
        arrival_date: Math.floor(Date.now() / 1000) + 86400,
        ...overrides,
      } as Stripe.Payout,
    },
    api_version: '2024-11-20.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  } as Stripe.PayoutCreatedEvent;
}

// =============================================================================
// TEST SUITE: processStripeEvent
// =============================================================================

describe('processStripeEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should route to correct handler based on event type', async () => {
    const event = createPaymentIntentEvent();
    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);

    await processStripeEvent(event);

    // Should have looked for payment
    expect(prisma.payment.findFirst).toHaveBeenCalled();
  });

  it('should handle unknown event types gracefully', async () => {
    const event = {
      id: 'evt_unknown',
      type: 'unknown.event.type',
      data: { object: {} },
    } as Stripe.Event;

    // Should not throw
    await expect(processStripeEvent(event)).resolves.not.toThrow();
  });

  it('should propagate handler errors', async () => {
    const event = createPaymentIntentEvent();
    (prisma.payment.findFirst as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    await expect(processStripeEvent(event)).rejects.toThrow('Database error');
  });
});

// =============================================================================
// TEST SUITE: Payment Intent Handlers
// =============================================================================

describe('Payment Intent Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('payment_intent.succeeded', () => {
    it('should update payment status to SUCCEEDED', async () => {
      const event = createPaymentIntentEvent();
      const mockPayment = {
        id: 'pay_123',
        userId: 'user_123',
        amount: 1000,
        currency: 'usd',
        status: 'PENDING',
        metadata: {},
      };

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: 'SUCCEEDED',
      });
      (prisma.wallet.findFirst as jest.Mock).mockResolvedValue(null);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUCCEEDED',
          }),
        })
      );
    });

    it('should credit wallet when payment succeeds', async () => {
      const event = createPaymentIntentEvent();
      const mockPayment = {
        id: 'pay_123',
        userId: 'user_123',
        amount: 1000,
        currency: 'usd',
        status: 'PENDING',
        metadata: {},
      };
      const mockWallet = {
        id: 'wallet_123',
        userId: 'user_123',
        currency: 'usd',
        balance: 5000,
      };

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: 'SUCCEEDED',
      });
      (prisma.wallet.findFirst as jest.Mock).mockResolvedValue(mockWallet);
      (prisma.transaction.create as jest.Mock).mockResolvedValue({});
      (prisma.wallet.update as jest.Mock).mockResolvedValue({
        ...mockWallet,
        balance: 6000,
      });
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            walletId: mockWallet.id,
            amount: 1000,
            type: 'CREDIT',
          }),
        })
      );

      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balance: { increment: 1000 },
          }),
        })
      );
    });

    it('should handle missing payment gracefully', async () => {
      const event = createPaymentIntentEvent();
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);

      // Should not throw
      await expect(processStripeEvent(event)).resolves.not.toThrow();
    });

    it('should create audit entry on success', async () => {
      const event = createPaymentIntentEvent();
      const mockPayment = {
        id: 'pay_123',
        userId: 'user_123',
        amount: 1000,
        currency: 'usd',
        status: 'PENDING',
        metadata: {},
      };

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: 'SUCCEEDED',
      });
      (prisma.wallet.findFirst as jest.Mock).mockResolvedValue(null);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_SUCCEEDED',
          entity: 'Payment',
          entityId: mockPayment.id,
        })
      );
    });
  });

  describe('payment_intent.payment_failed', () => {
    function createFailedEvent(): Stripe.PaymentIntentPaymentFailedEvent {
      return {
        id: `evt_${Date.now()}`,
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: `pi_${Date.now()}`,
            object: 'payment_intent',
            amount: 1000,
            currency: 'usd',
            status: 'failed',
            last_payment_error: {
              code: 'card_declined',
              message: 'Your card was declined',
            },
          } as Stripe.PaymentIntent,
        },
        api_version: '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      } as Stripe.PaymentIntentPaymentFailedEvent;
    }

    it('should update payment status to FAILED', async () => {
      const event = createFailedEvent();
      const mockPayment = {
        id: 'pay_123',
        userId: 'user_123',
        amount: 1000,
        currency: 'usd',
        status: 'PENDING',
        metadata: {},
      };

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: 'FAILED',
      });
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
          }),
        })
      );
    });

    it('should store failure details in metadata', async () => {
      const event = createFailedEvent();
      const mockPayment = {
        id: 'pay_123',
        userId: 'user_123',
        amount: 1000,
        currency: 'usd',
        status: 'PENDING',
        metadata: {},
      };

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: 'FAILED',
      });
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              failureCode: 'card_declined',
              failureMessage: 'Your card was declined',
            }),
          }),
        })
      );
    });

    it('should create audit entry on failure', async () => {
      const event = createFailedEvent();
      const mockPayment = {
        id: 'pay_123',
        userId: 'user_123',
        amount: 1000,
        currency: 'usd',
        status: 'PENDING',
        metadata: {},
      };

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: 'FAILED',
      });
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_FAILED',
        })
      );
    });
  });
});

// =============================================================================
// TEST SUITE: Charge Handlers
// =============================================================================

describe('Charge Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('charge.succeeded', () => {
    it('should create audit entry', async () => {
      const event = createChargeEvent();
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CHARGE_SUCCEEDED',
          entity: 'Charge',
        })
      );
    });
  });

  describe('charge.refunded', () => {
    function createRefundEvent(): Stripe.ChargeRefundedEvent {
      return {
        id: `evt_${Date.now()}`,
        type: 'charge.refunded',
        data: {
          object: {
            id: `ch_${Date.now()}`,
            object: 'charge',
            amount: 1000,
            currency: 'usd',
            paid: true,
            payment_intent: 'pi_123',
            refunds: {
              data: [
                { id: 're_123', amount: 1000, status: 'succeeded' },
              ],
            },
          } as Stripe.Charge,
        },
        api_version: '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      } as Stripe.ChargeRefundedEvent;
    }

    it('should update payment status to REFUNDED', async () => {
      const event = createRefundEvent();
      const mockPayment = {
        id: 'pay_123',
        userId: 'user_123',
        amount: 1000,
        currency: 'usd',
        status: 'SUCCEEDED',
        metadata: {},
      };

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: 'REFUNDED',
      });
      (prisma.wallet.findFirst as jest.Mock).mockResolvedValue(null);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REFUNDED',
          }),
        })
      );
    });

    it('should debit wallet for refund', async () => {
      const event = createRefundEvent();
      const mockPayment = {
        id: 'pay_123',
        userId: 'user_123',
        amount: 1000,
        currency: 'usd',
        status: 'SUCCEEDED',
        metadata: {},
      };
      const mockWallet = {
        id: 'wallet_123',
        userId: 'user_123',
        currency: 'usd',
        balance: 10000,
      };

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        ...mockPayment,
        status: 'REFUNDED',
      });
      (prisma.wallet.findFirst as jest.Mock).mockResolvedValue(mockWallet);
      (prisma.transaction.create as jest.Mock).mockResolvedValue({});
      (prisma.wallet.update as jest.Mock).mockResolvedValue({
        ...mockWallet,
        balance: 9000,
      });
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'DEBIT',
            amount: -1000,
          }),
        })
      );
    });
  });

  describe('charge.dispute.created', () => {
    function createDisputeEvent(): Stripe.ChargeDisputeCreatedEvent {
      return {
        id: `evt_${Date.now()}`,
        type: 'charge.dispute.created',
        data: {
          object: {
            id: `dp_${Date.now()}`,
            object: 'dispute',
            amount: 1000,
            charge: 'ch_123',
            reason: 'fraudulent',
            status: 'needs_response',
          } as Stripe.Dispute,
        },
        api_version: '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      } as Stripe.ChargeDisputeCreatedEvent;
    }

    it('should create audit entry with dispute details', async () => {
      const event = createDisputeEvent();
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DISPUTE_CREATED',
          entity: 'Dispute',
          metadata: expect.objectContaining({
            reason: 'fraudulent',
            status: 'needs_response',
          }),
        })
      );
    });
  });
});

// =============================================================================
// TEST SUITE: Payout Handlers
// =============================================================================

describe('Payout Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('payout.created', () => {
    it('should update existing payout status', async () => {
      const event = createPayoutEvent();
      const mockPayout = {
        id: 'payout_123',
        userId: 'user_123',
        amount: 5000,
        currency: 'usd',
        status: 'PENDING',
        reference: event.data.object.id,
        metadata: {},
      };

      (prisma.payout.findFirst as jest.Mock).mockResolvedValue(mockPayout);
      (prisma.payout.update as jest.Mock).mockResolvedValue({
        ...mockPayout,
        status: 'PROCESSING',
      });
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(prisma.payout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PROCESSING',
          }),
        })
      );
    });

    it('should handle unknown payout gracefully', async () => {
      const event = createPayoutEvent();
      (prisma.payout.findFirst as jest.Mock).mockResolvedValue(null);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      // Should not throw
      await expect(processStripeEvent(event)).resolves.not.toThrow();
    });
  });

  describe('payout.paid', () => {
    function createPaidEvent(): Stripe.PayoutPaidEvent {
      return {
        id: `evt_${Date.now()}`,
        type: 'payout.paid',
        data: {
          object: {
            id: `po_${Date.now()}`,
            object: 'payout',
            amount: 5000,
            currency: 'usd',
            status: 'paid',
          } as Stripe.Payout,
        },
        api_version: '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      } as Stripe.PayoutPaidEvent;
    }

    it('should update payout status to COMPLETED', async () => {
      const event = createPaidEvent();
      const mockPayout = {
        id: 'payout_123',
        userId: 'user_123',
        amount: 5000,
        currency: 'usd',
        status: 'PROCESSING',
        reference: event.data.object.id,
        metadata: {},
      };

      (prisma.payout.findFirst as jest.Mock).mockResolvedValue(mockPayout);
      (prisma.payout.update as jest.Mock).mockResolvedValue({
        ...mockPayout,
        status: 'COMPLETED',
      });
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(prisma.payout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should create audit entry for completed payout', async () => {
      const event = createPaidEvent();
      const mockPayout = {
        id: 'payout_123',
        userId: 'user_123',
        amount: 5000,
        currency: 'usd',
        status: 'PROCESSING',
        reference: event.data.object.id,
        metadata: {},
      };

      (prisma.payout.findFirst as jest.Mock).mockResolvedValue(mockPayout);
      (prisma.payout.update as jest.Mock).mockResolvedValue({
        ...mockPayout,
        status: 'COMPLETED',
      });
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYOUT_COMPLETED',
        })
      );
    });
  });

  describe('payout.failed', () => {
    function createFailedEvent(): Stripe.PayoutFailedEvent {
      return {
        id: `evt_${Date.now()}`,
        type: 'payout.failed',
        data: {
          object: {
            id: `po_${Date.now()}`,
            object: 'payout',
            amount: 5000,
            currency: 'usd',
            status: 'failed',
            failure_code: 'bank_account_closed',
            failure_message: 'The bank account has been closed',
          } as Stripe.Payout,
        },
        api_version: '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      } as Stripe.PayoutFailedEvent;
    }

    it('should update payout status to FAILED', async () => {
      const event = createFailedEvent();
      const mockPayout = {
        id: 'payout_123',
        userId: 'user_123',
        amount: 5000,
        currency: 'usd',
        status: 'PROCESSING',
        reference: event.data.object.id,
        metadata: {},
      };

      (prisma.payout.findFirst as jest.Mock).mockResolvedValue(mockPayout);
      (prisma.payout.update as jest.Mock).mockResolvedValue({
        ...mockPayout,
        status: 'FAILED',
      });
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(prisma.payout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
          }),
        })
      );
    });

    it('should store failure details', async () => {
      const event = createFailedEvent();
      const mockPayout = {
        id: 'payout_123',
        userId: 'user_123',
        amount: 5000,
        currency: 'usd',
        status: 'PROCESSING',
        reference: event.data.object.id,
        metadata: {},
      };

      (prisma.payout.findFirst as jest.Mock).mockResolvedValue(mockPayout);
      (prisma.payout.update as jest.Mock).mockResolvedValue({
        ...mockPayout,
        status: 'FAILED',
      });
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(prisma.payout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              failureCode: 'bank_account_closed',
              failureMessage: 'The bank account has been closed',
            }),
          }),
        })
      );
    });
  });
});

// =============================================================================
// TEST SUITE: Customer Handlers
// =============================================================================

describe('Customer Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('customer.created', () => {
    function createCustomerEvent(): Stripe.CustomerCreatedEvent {
      return {
        id: `evt_${Date.now()}`,
        type: 'customer.created',
        data: {
          object: {
            id: `cus_${Date.now()}`,
            object: 'customer',
            email: 'user@example.com',
          } as Stripe.Customer,
        },
        api_version: '2024-11-20.acacia',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      } as Stripe.CustomerCreatedEvent;
    }

    it('should link customer to existing user', async () => {
      const event = createCustomerEvent();
      const mockUser = {
        id: 'user_123',
        email: 'user@example.com',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

      await processStripeEvent(event);

      expect(createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_CREATED',
          entityId: mockUser.id,
          metadata: expect.objectContaining({
            stripeCustomerId: event.data.object.id,
          }),
        })
      );
    });

    it('should handle user not found gracefully', async () => {
      const event = createCustomerEvent();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Should not throw
      await expect(processStripeEvent(event)).resolves.not.toThrow();
    });

    it('should handle customer without email', async () => {
      const event = {
        ...createCustomerEvent(),
        data: {
          object: {
            id: 'cus_123',
            object: 'customer',
            email: null,
          },
        },
      } as Stripe.CustomerCreatedEvent;

      // Should not throw
      await expect(processStripeEvent(event)).resolves.not.toThrow();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// TEST SUITE: Helper Functions
// =============================================================================

describe('Helper Functions', () => {
  describe('isEventProcessed', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true for processed events', async () => {
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue({
        id: 'evt_123',
        type: 'payment_intent.succeeded',
      });

      const result = await isEventProcessed('evt_123');

      expect(result).toBe(true);
    });

    it('should return false for unprocessed events', async () => {
      (prisma.stripeEvent.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isEventProcessed('evt_999');

      expect(result).toBe(false);
    });
  });

  describe('getUnprocessedEvents', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return events ordered by creation date', async () => {
      const mockEvents = [
        { id: 'evt_1', createdAt: new Date('2024-01-01') },
        { id: 'evt_2', createdAt: new Date('2024-01-02') },
      ];

      (prisma.stripeEvent.findMany as jest.Mock).mockResolvedValue(mockEvents);

      const result = await getUnprocessedEvents();

      expect(result).toEqual(mockEvents);
      expect(prisma.stripeEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        })
      );
    });

    it('should respect limit parameter', async () => {
      (prisma.stripeEvent.findMany as jest.Mock).mockResolvedValue([]);

      await getUnprocessedEvents(50);

      expect(prisma.stripeEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should use default limit of 100', async () => {
      (prisma.stripeEvent.findMany as jest.Mock).mockResolvedValue([]);

      await getUnprocessedEvents();

      expect(prisma.stripeEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });
  });
});

// =============================================================================
// TEST SUITE: Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle zero amount payments', async () => {
    const event = createPaymentIntentEvent({ amount: 0 });
    const mockPayment = {
      id: 'pay_123',
      userId: 'user_123',
      amount: 0,
      currency: 'usd',
      status: 'PENDING',
      metadata: {},
    };

    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
    (prisma.payment.update as jest.Mock).mockResolvedValue({
      ...mockPayment,
      status: 'SUCCEEDED',
    });
    (prisma.wallet.findFirst as jest.Mock).mockResolvedValue(null);
    (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

    await processStripeEvent(event);

    expect(prisma.payment.update).toHaveBeenCalled();
  });

  it('should handle multiple currencies correctly', async () => {
    const event = createPaymentIntentEvent({
      amount: 1000,
      currency: 'eur',
    });
    const mockPayment = {
      id: 'pay_123',
      userId: 'user_123',
      amount: 1000,
      currency: 'eur',
      status: 'PENDING',
      metadata: {},
    };
    const mockWallet = {
      id: 'wallet_eur',
      userId: 'user_123',
      currency: 'eur',
      balance: 5000,
    };

    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
    (prisma.payment.update as jest.Mock).mockResolvedValue({
      ...mockPayment,
      status: 'SUCCEEDED',
    });
    (prisma.wallet.findFirst as jest.Mock).mockResolvedValue(mockWallet);
    (prisma.transaction.create as jest.Mock).mockResolvedValue({});
    (prisma.wallet.update as jest.Mock).mockResolvedValue({});
    (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

    await processStripeEvent(event);

    expect(prisma.wallet.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          currency: 'eur',
        }),
      })
    );
  });

  it('should handle partial refunds', async () => {
    const event = {
      id: `evt_${Date.now()}`,
      type: 'charge.refunded',
      data: {
        object: {
          id: `ch_${Date.now()}`,
          object: 'charge',
          amount: 1000,
          currency: 'usd',
          paid: true,
          payment_intent: 'pi_123',
          refunds: {
            data: [
              { id: 're_1', amount: 500, status: 'succeeded' },
              { id: 're_2', amount: 300, status: 'succeeded' },
            ],
          },
        },
      },
      api_version: '2024-11-20.acacia',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: { id: null, idempotency_key: null },
    } as Stripe.ChargeRefundedEvent;

    const mockPayment = {
      id: 'pay_123',
      userId: 'user_123',
      amount: 1000,
      currency: 'usd',
      status: 'SUCCEEDED',
      metadata: {},
    };

    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
    (prisma.payment.update as jest.Mock).mockResolvedValue({
      ...mockPayment,
      status: 'REFUNDED',
    });
    (prisma.wallet.findFirst as jest.Mock).mockResolvedValue(null);
    (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

    await processStripeEvent(event);

    // Total refund should be 800
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            refundAmount: 800,
          }),
        }),
      })
    );
  });

  it('should handle very large amounts', async () => {
    const largeAmount = 9999999999; // ~$99,999,999.99
    const event = createPaymentIntentEvent({ amount: largeAmount });
    const mockPayment = {
      id: 'pay_123',
      userId: 'user_123',
      amount: largeAmount,
      currency: 'usd',
      status: 'PENDING',
      metadata: {},
    };

    (prisma.payment.findFirst as jest.Mock).mockResolvedValue(mockPayment);
    (prisma.payment.update as jest.Mock).mockResolvedValue({
      ...mockPayment,
      status: 'SUCCEEDED',
    });
    (prisma.wallet.findFirst as jest.Mock).mockResolvedValue(null);
    (createAuditEntry as jest.Mock).mockResolvedValue(undefined);

    await processStripeEvent(event);

    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            stripeAmount: largeAmount,
          }),
        }),
      })
    );
  });
});
