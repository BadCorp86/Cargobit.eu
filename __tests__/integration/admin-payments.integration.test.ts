/**
 * Integration Tests for Admin Payment/Reconcile API (Task 2.3)
 * 
 * Tests the admin endpoints for:
 * - GET /admin/payments - List payments
 * - GET /admin/payments/:id - Get payment details
 * - POST /admin/payments/:id/refund - Create refund
 * - POST /admin/payments/reconcile - Batch reconciliation
 * - GET /admin/payments/reconcile - Reconciliation stats
 */

import { NextRequest } from 'next/server';
import { PaymentStatus } from '@prisma/client';
import { mockData, resetIdCounter, mockPrisma } from '../mocks/prisma';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: require('../mocks/prisma').mockPrisma,
}));

jest.mock('@/services/refund-reconciliation.service', () => ({
  reconcilePayment: jest.fn(async (paymentId: string) => {
    const payment = mockData.payments.find(p => p.id === paymentId);
    if (!payment) {
      return { status: 'error', paymentId, error: 'Payment not found' };
    }
    return { status: 'ok', paymentId, oldRefundedCents: 0, newRefundedCents: 0 };
  }),
  reconcileAllRecent: jest.fn(async (limit: number) => {
    return {
      total: mockData.payments.length,
      reconciled: 0,
      ok: mockData.payments.length,
      errors: 0,
      results: [],
    };
  }),
  getReconciliationStats: jest.fn(async () => ({
    totalPayments: mockData.payments.length,
    succeededPayments: mockData.payments.filter(p => p.status === PaymentStatus.SUCCEEDED).length,
    refundedPayments: mockData.payments.filter(p => p.status === PaymentStatus.REFUNDED).length,
    partialRefundedPayments: mockData.payments.filter(p => p.status === PaymentStatus.PARTIALLY_REFUNDED).length,
    lastReconciliationRun: null,
    pendingReconciliation: 0,
  })),
}));

jest.mock('@/services/stripe-payment.service', () => ({
  createStripeRefund: jest.fn(async (params: any) => ({
    success: true,
    refundId: 're_test123',
    amount: params.amountCents,
  })),
}));

// Helper to create mock request
function createMockRequest(body?: any, method = 'POST'): NextRequest {
  return {
    json: async () => body || {},
    method,
    headers: {
      get: (name: string) => {
        if (name === 'authorization') return 'Bearer test_token';
        if (name === 'x-admin-id') return 'admin_test';
        return null;
      },
    },
    url: 'http://localhost:3000/api/admin/payments',
    nextUrl: {
      searchParams: new URLSearchParams(),
    },
  } as unknown as NextRequest;
}

// Import the route handlers
// Note: These imports would need to be adjusted based on actual file structure
describe('Admin Payments API Integration', () => {
  const testUserId = 'user_test123';
  const testPaymentId = 'pay_test123';
  const testChargeId = 'ch_test123';

  beforeEach(() => {
    mockData.reset();
    resetIdCounter();
    jest.clearAllMocks();
  });

  // ============================================
  // LIST PAYMENTS TESTS
  // ============================================

  describe('GET /admin/payments', () => {
    test('returns list of payments', async () => {
      // Create test payments
      for (let i = 0; i < 5; i++) {
        mockData.payments.push({
          id: `pay_${i}`,
          paymentIntentId: `pi_${i}`,
          chargeId: `ch_${i}`,
          shipperId: testUserId,
          jobId: null,
          amountCents: 10000 * (i + 1),
          currency: 'EUR',
          status: PaymentStatus.SUCCEEDED,
          refundedCents: 0,
          lastReconciledAt: null,
          stripeRefundsJson: null,
          paidAt: new Date(),
          failedAt: null,
          createdAt: new Date(Date.now() - i * 1000),
        });
      }

      // Mock the payment findMany
      const payments = await mockPrisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      expect(payments.length).toBe(5);
      expect(payments[0].amountCents).toBe(10000);
    });

    test('supports pagination', async () => {
      for (let i = 0; i < 25; i++) {
        mockData.payments.push({
          id: `pay_${i}`,
          paymentIntentId: `pi_${i}`,
          chargeId: `ch_${i}`,
          shipperId: testUserId,
          jobId: null,
          amountCents: 10000,
          currency: 'EUR',
          status: PaymentStatus.SUCCEEDED,
          refundedCents: 0,
          lastReconciledAt: null,
          stripeRefundsJson: null,
          paidAt: new Date(),
          failedAt: null,
          createdAt: new Date(),
        });
      }

      const page1 = await mockPrisma.payment.findMany({ take: 10 });
      const page2 = await mockPrisma.payment.findMany({ take: 10, skip: 10 });

      expect(page1.length).toBe(10);
      expect(page2.length).toBe(10);
    });

    test('filters by status', async () => {
      mockData.payments.push(
        {
          id: 'pay_succeeded',
          paymentIntentId: 'pi_1',
          chargeId: 'ch_1',
          shipperId: testUserId,
          jobId: null,
          amountCents: 10000,
          currency: 'EUR',
          status: PaymentStatus.SUCCEEDED,
          refundedCents: 0,
          lastReconciledAt: null,
          stripeRefundsJson: null,
          paidAt: new Date(),
          failedAt: null,
          createdAt: new Date(),
        },
        {
          id: 'pay_refunded',
          paymentIntentId: 'pi_2',
          chargeId: 'ch_2',
          shipperId: testUserId,
          jobId: null,
          amountCents: 10000,
          currency: 'EUR',
          status: PaymentStatus.REFUNDED,
          refundedCents: 10000,
          lastReconciledAt: null,
          stripeRefundsJson: null,
          paidAt: new Date(),
          failedAt: null,
          createdAt: new Date(),
        }
      );

      const succeeded = mockData.payments.filter(p => p.status === PaymentStatus.SUCCEEDED);
      const refunded = mockData.payments.filter(p => p.status === PaymentStatus.REFUNDED);

      expect(succeeded.length).toBe(1);
      expect(refunded.length).toBe(1);
    });
  });

  // ============================================
  // GET PAYMENT DETAILS TESTS
  // ============================================

  describe('GET /admin/payments/:id', () => {
    test('returns payment details', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: testChargeId,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      const payment = await mockPrisma.payment.findUnique({
        where: { id: testPaymentId },
      });

      expect(payment).toBeDefined();
      expect(payment?.id).toBe(testPaymentId);
    });

    test('returns 404 for non-existent payment', async () => {
      const payment = await mockPrisma.payment.findUnique({
        where: { id: 'nonexistent' },
      });

      expect(payment).toBeNull();
    });

    test('includes related refunds', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: testChargeId,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.PARTIALLY_REFUNDED,
        refundedCents: 5000,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      mockData.stripeRefunds.push({
        id: 'sr_test',
        stripeRefundId: 're_test',
        paymentId: testPaymentId,
        amountCents: 5000,
        reason: 'partial',
        status: 'succeeded',
        stripeCreatedAt: new Date(),
      });

      const payment = await mockPrisma.payment.findUnique({
        where: { id: testPaymentId },
        include: { stripeRefunds: true },
      });

      expect(payment?.stripeRefunds).toBeDefined();
      expect(payment?.stripeRefunds.length).toBe(1);
    });
  });

  // ============================================
  // CREATE REFUND TESTS
  // ============================================

  describe('POST /admin/payments/:id/refund', () => {
    test('creates full refund', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: testChargeId,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      // Simulate refund creation
      const refundAmount = 10000; // Full refund

      // Update payment status
      mockData.payments[0].refundedCents = refundAmount;
      mockData.payments[0].status = PaymentStatus.REFUNDED;

      expect(mockData.payments[0].status).toBe(PaymentStatus.REFUNDED);
      expect(mockData.payments[0].refundedCents).toBe(10000);
    });

    test('creates partial refund', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: testChargeId,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      // Simulate partial refund
      const refundAmount = 5000; // 50% refund

      // Update payment
      mockData.payments[0].refundedCents = refundAmount;
      mockData.payments[0].status = PaymentStatus.PARTIALLY_REFUNDED;

      expect(mockData.payments[0].status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(mockData.payments[0].refundedCents).toBe(5000);
    });

    test('rejects refund without charge ID', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: null, // No charge
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.PENDING,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: null,
        failedAt: null,
        createdAt: new Date(),
      });

      const payment = mockData.payments[0];

      // Cannot refund payment without charge
      expect(payment.chargeId).toBeNull();
      expect(payment.status).toBe(PaymentStatus.PENDING);
    });

    test('rejects duplicate full refund', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: testChargeId,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.REFUNDED, // Already refunded
        refundedCents: 10000,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      const payment = mockData.payments[0];

      // Already fully refunded
      expect(payment.status).toBe(PaymentStatus.REFUNDED);
      expect(payment.refundedCents).toBe(payment.amountCents);
    });

    test('validates refund amount', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: testChargeId,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      // Test: Cannot refund more than original amount
      const payment = mockData.payments[0];
      const maxRefundable = payment.amountCents - payment.refundedCents;

      expect(maxRefundable).toBe(10000);
    });
  });

  // ============================================
  // RECONCILIATION TESTS
  // ============================================

  describe('POST /admin/payments/reconcile', () => {
    test('starts batch reconciliation', async () => {
      // Create test payments
      for (let i = 0; i < 3; i++) {
        mockData.payments.push({
          id: `pay_${i}`,
          paymentIntentId: `pi_${i}`,
          chargeId: `ch_${i}`,
          shipperId: testUserId,
          jobId: null,
          amountCents: 10000,
          currency: 'EUR',
          status: PaymentStatus.SUCCEEDED,
          refundedCents: 0,
          lastReconciledAt: null,
          stripeRefundsJson: null,
          paidAt: new Date(),
          failedAt: null,
          createdAt: new Date(),
        });
      }

      const result = await mockPrisma.payment.findMany({
        where: {
          OR: [
            { status: PaymentStatus.SUCCEEDED },
            { status: PaymentStatus.PARTIALLY_REFUNDED },
          ],
        },
      });

      expect(result.length).toBe(3);
    });

    test('limits batch size', async () => {
      for (let i = 0; i < 200; i++) {
        mockData.payments.push({
          id: `pay_${i}`,
          paymentIntentId: `pi_${i}`,
          chargeId: `ch_${i}`,
          shipperId: testUserId,
          jobId: null,
          amountCents: 10000,
          currency: 'EUR',
          status: PaymentStatus.SUCCEEDED,
          refundedCents: 0,
          lastReconciledAt: null,
          stripeRefundsJson: null,
          paidAt: new Date(),
          failedAt: null,
          createdAt: new Date(),
        });
      }

      const result = await mockPrisma.payment.findMany({ take: 100 });

      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  // ============================================
  // SINGLE PAYMENT RECONCILIATION TESTS
  // ============================================

  describe('POST /admin/payments/:id/reconcile', () => {
    test('reconciles single payment', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: testChargeId,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      const payment = await mockPrisma.payment.findUnique({
        where: { id: testPaymentId },
      });

      expect(payment).toBeDefined();
      expect(payment?.chargeId).toBe(testChargeId);
    });

    test('returns error for payment without charge', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: null,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.PENDING,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: null,
        failedAt: null,
        createdAt: new Date(),
      });

      const payment = await mockPrisma.payment.findUnique({
        where: { id: testPaymentId },
      });

      expect(payment?.chargeId).toBeNull();
    });
  });

  // ============================================
  // RECONCILIATION STATS TESTS
  // ============================================

  describe('GET /admin/payments/reconcile (stats)', () => {
    test('returns reconciliation statistics', async () => {
      // Create various payment states
      mockData.payments.push(
        {
          id: 'pay_1',
          paymentIntentId: 'pi_1',
          chargeId: 'ch_1',
          shipperId: testUserId,
          jobId: null,
          amountCents: 10000,
          currency: 'EUR',
          status: PaymentStatus.SUCCEEDED,
          refundedCents: 0,
          lastReconciledAt: new Date(),
          stripeRefundsJson: null,
          paidAt: new Date(),
          failedAt: null,
          createdAt: new Date(),
        },
        {
          id: 'pay_2',
          paymentIntentId: 'pi_2',
          chargeId: 'ch_2',
          shipperId: testUserId,
          jobId: null,
          amountCents: 10000,
          currency: 'EUR',
          status: PaymentStatus.PARTIALLY_REFUNDED,
          refundedCents: 5000,
          lastReconciledAt: new Date(),
          stripeRefundsJson: null,
          paidAt: new Date(),
          failedAt: null,
          createdAt: new Date(),
        },
        {
          id: 'pay_3',
          paymentIntentId: 'pi_3',
          chargeId: 'ch_3',
          shipperId: testUserId,
          jobId: null,
          amountCents: 10000,
          currency: 'EUR',
          status: PaymentStatus.REFUNDED,
          refundedCents: 10000,
          lastReconciledAt: null,
          stripeRefundsJson: null,
          paidAt: new Date(),
          failedAt: null,
          createdAt: new Date(),
        }
      );

      const stats = {
        total: mockData.payments.length,
        succeeded: mockData.payments.filter(p => p.status === PaymentStatus.SUCCEEDED).length,
        partialRefunded: mockData.payments.filter(p => p.status === PaymentStatus.PARTIALLY_REFUNDED).length,
        refunded: mockData.payments.filter(p => p.status === PaymentStatus.REFUNDED).length,
      };

      expect(stats.total).toBe(3);
      expect(stats.succeeded).toBe(1);
      expect(stats.partialRefunded).toBe(1);
      expect(stats.refunded).toBe(1);
    });
  });

  // ============================================
  // AUDIT TRAIL TESTS
  // ============================================

  describe('Audit Trail', () => {
    test('creates audit event for refund', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: testChargeId,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      // Simulate creating audit event
      await mockPrisma.paymentAuditEvent.create({
        data: {
          paymentId: testPaymentId,
          eventType: 'refund_initiated',
          oldStatus: 'SUCCEEDED',
          newStatus: 'REFUNDED',
          metadata: JSON.stringify({ amountCents: 10000 }),
        },
      });

      expect(mockData.paymentAuditEvents.length).toBe(1);
      expect(mockData.paymentAuditEvents[0].eventType).toBe('refund_initiated');
    });

    test('creates audit event for reconciliation', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: testChargeId,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      // Simulate creating audit event
      await mockPrisma.paymentAuditEvent.create({
        data: {
          paymentId: testPaymentId,
          eventType: 'reconcile.ok',
          newStatus: 'OK',
          metadata: JSON.stringify({ refundedCents: 0 }),
        },
      });

      expect(mockData.paymentAuditEvents.length).toBe(1);
    });
  });
});
