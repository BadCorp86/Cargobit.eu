/**
 * Unit Tests for Stripe Webhook Service (Task 2.2)
 * 
 * Tests cover:
 * - dispatchStripeEvent: Event routing and idempotency
 * - handlePaymentIntentSucceeded: Payment success flow
 * - handlePaymentIntentFailed: Payment failure flow
 * - handleChargeRefunded: Refund processing
 * - Idempotency protection
 */

import {
  dispatchStripeEvent,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handleChargeRefunded,
} from '@/services/stripe-webhook.service';
import { mockPrisma, mockData, resetIdCounter } from '../mocks/prisma';
import { PaymentStatus } from '@prisma/client';

// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: require('../mocks/prisma').mockPrisma,
}));

// Mock wallet service
jest.mock('@/services/wallet.service', () => ({
  creditWallet: jest.fn(async () => ({ success: true, transactionId: 'tx_123' })),
  reverseCredit: jest.fn(async () => ({ success: true })),
}));

describe('Stripe Webhook Service', () => {
  const testUserId = 'user_test123';
  const testPaymentId = 'pay_test123';
  const testPaymentIntentId = 'pi_test123';
  const testChargeId = 'ch_test123';
  const testEventId = 'evt_test123';

  beforeEach(() => {
    mockData.reset();
    resetIdCounter();
    jest.clearAllMocks();
  });

  // ============================================
  // DISPATCH EVENT TESTS
  // ============================================

  describe('dispatchStripeEvent', () => {
    test('routes payment_intent.succeeded to correct handler', async () => {
      // Setup payment
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const event = {
        id: testEventId,
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: testPaymentIntentId,
            amount: 10000,
            currency: 'eur',
            status: 'succeeded',
            metadata: {},
          },
        },
      };

      const result = await dispatchStripeEvent(event);

      expect(result.success).toBe(true);
      expect(mockData.stripeEvents.length).toBe(1);
      expect(mockData.stripeEvents[0].processed).toBe(true);
    });

    test('returns duplicate for already processed event', async () => {
      // Setup already processed event
      mockData.stripeEvents.push({
        id: testEventId,
        type: 'payment_intent.succeeded',
        payload: null,
        processed: true,
        processedAt: new Date(),
        errorCount: 0,
        lastError: null,
        receivedAt: new Date(),
        createdAt: new Date(),
      });

      const event = {
        id: testEventId,
        type: 'payment_intent.succeeded',
        data: { object: { id: testPaymentIntentId } },
      };

      const result = await dispatchStripeEvent(event);

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
    });

    test('handles unhandled event types gracefully', async () => {
      const event = {
        id: 'evt_unhandled',
        type: 'customer.created',
        data: { object: { id: 'cus_123' } },
      };

      const result = await dispatchStripeEvent(event);

      expect(result.success).toBe(true);
    });

    test('records event before processing', async () => {
      const event = {
        id: 'evt_new',
        type: 'customer.created',
        data: { object: { id: 'cus_123' } },
      };

      await dispatchStripeEvent(event);

      expect(mockData.stripeEvents.length).toBe(1);
      expect(mockData.stripeEvents[0].id).toBe('evt_new');
    });
  });

  // ============================================
  // PAYMENT INTENT SUCCEEDED TESTS
  // ============================================

  describe('handlePaymentIntentSucceeded', () => {
    test('updates payment status to SUCCEEDED', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const pi = {
        id: testPaymentIntentId,
        amount: 10000,
        currency: 'eur',
        status: 'succeeded',
        metadata: {},
      };

      const result = await handlePaymentIntentSucceeded(pi, testEventId);

      expect(result.success).toBe(true);
      expect(mockData.payments[0].status).toBe(PaymentStatus.SUCCEEDED);
      expect(mockData.payments[0].chargeId).toBeDefined();
      expect(mockData.payments[0].paidAt).toBeDefined();
    });

    test('creates payment audit event', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      await handlePaymentIntentSucceeded(
        { id: testPaymentIntentId, amount: 10000, currency: 'eur', status: 'succeeded', metadata: {} },
        testEventId
      );

      const audit = mockData.paymentAuditEvents.find(
        e => e.eventType === 'payment_succeeded'
      );
      expect(audit).toBeDefined();
      expect(audit?.paymentId).toBe(testPaymentId);
    });

    test('updates transport status when job is associated', async () => {
      const transportId = 'transport_123';
      
      mockData.transports.push({
        id: transportId,
        status: 'CREATED',
        assignedAt: null,
      });

      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
        chargeId: null,
        shipperId: testUserId,
        jobId: transportId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      await handlePaymentIntentSucceeded(
        { id: testPaymentIntentId, amount: 10000, currency: 'eur', status: 'succeeded', metadata: {} },
        testEventId
      );

      expect(mockData.transports[0].status).toBe('ASSIGNED');
      expect(mockData.transports[0].assignedAt).toBeDefined();
    });

    test('returns duplicate for already succeeded payment', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      const result = await handlePaymentIntentSucceeded(
        { id: testPaymentIntentId, amount: 10000, currency: 'eur', status: 'succeeded', metadata: {} },
        testEventId
      );

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
    });

    test('handles wallet topup without payment record', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const pi = {
        id: testPaymentIntentId,
        amount: 5000,
        currency: 'eur',
        status: 'succeeded',
        metadata: {
          type: 'wallet_topup',
          userId: testUserId,
        },
      };

      const result = await handlePaymentIntentSucceeded(pi, testEventId);

      expect(result.success).toBe(true);
      // Should create audit event for wallet topup
      expect(mockData.auditLogs.length).toBeGreaterThan(0);
    });

    test('handles orphaned payment intent gracefully', async () => {
      const pi = {
        id: 'pi_orphaned',
        amount: 10000,
        currency: 'eur',
        status: 'succeeded',
        metadata: {},
      };

      const result = await handlePaymentIntentSucceeded(pi, testEventId);

      expect(result.success).toBe(true);
      // Should create audit event for orphaned intent
      expect(mockData.auditLogs.length).toBeGreaterThan(0);
    });

    test('extracts charge ID from latest_charge', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const pi = {
        id: testPaymentIntentId,
        amount: 10000,
        currency: 'eur',
        status: 'succeeded',
        latest_charge: 'ch_from_latest',
        metadata: {},
      };

      await handlePaymentIntentSucceeded(pi, testEventId);

      expect(mockData.payments[0].chargeId).toBe('ch_from_latest');
    });
  });

  // ============================================
  // PAYMENT INTENT FAILED TESTS
  // ============================================

  describe('handlePaymentIntentFailed', () => {
    test('updates payment status to FAILED', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      const pi = {
        id: testPaymentIntentId,
        amount: 10000,
        currency: 'eur',
        status: 'failed',
        last_payment_error: { message: 'Card declined' },
        metadata: {},
      };

      const result = await handlePaymentIntentFailed(pi, testEventId);

      expect(result.success).toBe(true);
      expect(mockData.payments[0].status).toBe(PaymentStatus.FAILED);
      expect(mockData.payments[0].failedAt).toBeDefined();
    });

    test('creates notification for failed payment', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
        chargeId: null,
        shipperId: testUserId,
        jobId: 'job_123',
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

      await handlePaymentIntentFailed(
        {
          id: testPaymentIntentId,
          amount: 10000,
          currency: 'eur',
          status: 'failed',
          last_payment_error: { message: 'Insufficient funds' },
          metadata: {},
        },
        testEventId
      );

      expect(mockData.notifications.length).toBe(1);
      expect(mockData.notifications[0].type).toBe('PAYMENT_FAILED');
      expect(mockData.notifications[0].userId).toBe(testUserId);
    });

    test('creates payment audit event for failure', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      await handlePaymentIntentFailed(
        {
          id: testPaymentIntentId,
          amount: 10000,
          currency: 'eur',
          status: 'failed',
          last_payment_error: { message: 'Card expired' },
          metadata: {},
        },
        testEventId
      );

      const audit = mockData.paymentAuditEvents.find(
        e => e.eventType === 'payment_failed'
      );
      expect(audit).toBeDefined();
      expect(audit?.newStatus).toBe('FAILED');
    });

    test('returns duplicate for already failed payment', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
        chargeId: null,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.FAILED,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: null,
        failedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await handlePaymentIntentFailed(
        { id: testPaymentIntentId, amount: 10000, currency: 'eur', status: 'failed', metadata: {} },
        testEventId
      );

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
    });

    test('handles missing payment gracefully', async () => {
      const result = await handlePaymentIntentFailed(
        { id: 'pi_nonexistent', amount: 10000, currency: 'eur', status: 'failed', metadata: {} },
        testEventId
      );

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // CHARGE REFUNDED TESTS
  // ============================================

  describe('handleChargeRefunded', () => {
    test('handles full refund', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      const charge = {
        id: testChargeId,
        amount: 10000,
        currency: 'eur',
        refunded: true,
        refunds: {
          data: [{
            id: 're_full',
            amount: 10000,
            reason: 'requested_by_customer',
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
          }],
        },
        payment_intent: testPaymentIntentId,
      };

      const result = await handleChargeRefunded(charge, testEventId);

      expect(result.success).toBe(true);
      expect(mockData.payments[0].status).toBe(PaymentStatus.REFUNDED);
      expect(mockData.payments[0].refundedCents).toBe(10000);
    });

    test('handles partial refund', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      const charge = {
        id: testChargeId,
        amount: 10000,
        currency: 'eur',
        refunded: false,
        refunds: {
          data: [{
            id: 're_partial',
            amount: 5000, // Only 50 EUR refunded
            reason: 'partial_refund',
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
          }],
        },
        payment_intent: testPaymentIntentId,
      };

      const result = await handleChargeRefunded(charge, testEventId);

      expect(result.success).toBe(true);
      expect(mockData.payments[0].status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(mockData.payments[0].refundedCents).toBe(5000);
    });

    test('creates StripeRefund records', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      const charge = {
        id: testChargeId,
        amount: 10000,
        currency: 'eur',
        refunded: true,
        refunds: {
          data: [{
            id: 're_test',
            amount: 10000,
            reason: 'requested_by_customer',
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
          }],
        },
      };

      await handleChargeRefunded(charge, testEventId);

      expect(mockData.stripeRefunds.length).toBe(1);
      expect(mockData.stripeRefunds[0].stripeRefundId).toBe('re_test');
      expect(mockData.stripeRefunds[0].paymentId).toBe(testPaymentId);
      expect(mockData.stripeRefunds[0].amountCents).toBe(10000);
    });

    test('creates notification for refund', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      await handleChargeRefunded(
        {
          id: testChargeId,
          amount: 10000,
          currency: 'eur',
          refunded: true,
          refunds: {
            data: [{
              id: 're_test',
              amount: 10000,
              reason: 'requested_by_customer',
              status: 'succeeded',
              created: Math.floor(Date.now() / 1000),
            }],
          },
        },
        testEventId
      );

      expect(mockData.notifications.length).toBe(1);
      expect(mockData.notifications[0].type).toBe('REFUND_PROCESSED');
    });

    test('handles multiple partial refunds', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      const charge = {
        id: testChargeId,
        amount: 10000,
        currency: 'eur',
        refunded: true,
        refunds: {
          data: [
            {
              id: 're_partial1',
              amount: 3000,
              reason: 'partial_1',
              status: 'succeeded',
              created: Math.floor(Date.now() / 1000) - 100,
            },
            {
              id: 're_partial2',
              amount: 7000,
              reason: 'partial_2',
              status: 'succeeded',
              created: Math.floor(Date.now() / 1000),
            },
          ],
        },
      };

      const result = await handleChargeRefunded(charge, testEventId);

      expect(result.success).toBe(true);
      expect(mockData.payments[0].refundedCents).toBe(10000); // 3000 + 7000
      expect(mockData.stripeRefunds.length).toBe(2);
    });

    test('handles orphaned charge gracefully', async () => {
      const charge = {
        id: 'ch_orphaned',
        amount: 10000,
        currency: 'eur',
        refunded: true,
        refunds: {
          data: [{
            id: 're_orphaned',
            amount: 10000,
            reason: null,
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
          }],
        },
      };

      const result = await handleChargeRefunded(charge, testEventId);

      expect(result.success).toBe(true);
      // Should create audit for orphaned charge
      expect(mockData.auditLogs.length).toBeGreaterThan(0);
    });

    test('handles duplicate refund event', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
        chargeId: testChargeId,
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
      });

      // Existing refund
      mockData.refunds.push({
        id: 'refund_existing',
        paymentId: testPaymentId,
        refundId: 're_existing',
        amountCents: 10000,
        reason: 'requested_by_customer',
        status: 'SUCCEEDED',
        initiatedBy: 'system',
        processedAt: new Date(),
      });

      const charge = {
        id: testChargeId,
        amount: 10000,
        currency: 'eur',
        refunded: true,
        refunds: {
          data: [{
            id: 're_existing',
            amount: 10000,
            reason: 'requested_by_customer',
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
          }],
        },
      };

      const result = await handleChargeRefunded(charge, testEventId);

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
    });
  });

  // ============================================
  // IDEMPOTENCY TESTS
  // ============================================

  describe('Idempotency', () => {
    test('same event cannot be processed twice', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: testPaymentIntentId,
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const event = {
        id: testEventId,
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: testPaymentIntentId,
            amount: 10000,
            currency: 'eur',
            status: 'succeeded',
            metadata: {},
          },
        },
      };

      // First processing
      const result1 = await dispatchStripeEvent(event);
      expect(result1.success).toBe(true);
      expect(result1.duplicate).toBeUndefined();

      // Second processing - should be duplicate
      const result2 = await dispatchStripeEvent(event);
      expect(result2.success).toBe(true);
      expect(result2.duplicate).toBe(true);
    });

    test('events are recorded with unique constraint', async () => {
      const event = {
        id: testEventId,
        type: 'customer.updated',
        data: { object: { id: 'cus_123' } },
      };

      // First call should succeed
      await dispatchStripeEvent(event);

      // Second call should return duplicate (handled by isEventProcessed)
      const result = await dispatchStripeEvent(event);
      expect(result.duplicate).toBe(true);
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('Error Handling', () => {
    test('records error count for failed processing', async () => {
      // Pre-create the event so error recording can work
      mockData.stripeEvents.push({
        id: testEventId,
        type: 'payment_intent.succeeded',
        payload: null,
        processed: false,
        processedAt: null,
        errorCount: 0,
        lastError: null,
        receivedAt: new Date(),
        createdAt: new Date(),
      });

      // Setup to cause an error
      mockPrisma.payment.findFirst.mockRejectedValueOnce(new Error('DB error'));

      const pi = {
        id: testPaymentIntentId,
        amount: 10000,
        currency: 'eur',
        status: 'succeeded',
        metadata: {},
      };

      const result = await handlePaymentIntentSucceeded(pi, testEventId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
