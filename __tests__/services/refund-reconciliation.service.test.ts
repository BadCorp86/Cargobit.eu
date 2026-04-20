/**
 * Unit Tests for Refund Reconciliation Service (Task 2.3)
 * 
 * Tests cover:
 * - reconcilePayment: Single payment reconciliation
 * - reconcileAllRecent: Batch reconciliation
 * - findDiscrepancies: Finding potential mismatches
 * - getReconciliationStats: Statistics
 * - Partial refund handling
 */

import {
  reconcilePayment,
  reconcileAllRecent,
  findDiscrepancies,
  getReconciliationStats,
} from '@/services/refund-reconciliation.service';
import { mockPrisma, mockData, resetIdCounter } from '../mocks/prisma';
import { PaymentStatus } from '@prisma/client';

// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: require('../mocks/prisma').mockPrisma,
}));

// Mock wallet service
jest.mock('@/services/wallet.service', () => ({
  reverseCredit: jest.fn(async () => ({ success: true })),
  getWalletBalance: jest.fn(async () => 100),
}));

// Mock fetch for Stripe API calls
const originalFetch = global.fetch;

describe('Refund Reconciliation Service', () => {
  const testUserId = 'user_test123';
  const testPaymentId = 'pay_test123';
  const testChargeId = 'ch_test123';
  const testRefundId = 're_test123';

  beforeEach(() => {
    mockData.reset();
    resetIdCounter();
    jest.clearAllMocks();
    
    // Mock Stripe API response
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ============================================
  // RECONCILE PAYMENT TESTS
  // ============================================

  describe('reconcilePayment', () => {
    test('returns error for non-existent payment', async () => {
      const result = await reconcilePayment('nonexistent_payment');

      expect(result.status).toBe('error');
      expect(result.error).toBe('Payment not found');
    });

    test('returns no_charge for payment without charge ID', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: null,
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

      const result = await reconcilePayment(testPaymentId);

      expect(result.status).toBe('no_charge');
    });

    test('returns ok when already in sync', async () => {
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // Mock Stripe API - no refunds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: testChargeId,
          refunds: { data: [] },
        }),
      });

      const result = await reconcilePayment(testPaymentId);

      expect(result.status).toBe('ok');
      expect(result.oldRefundedCents).toBe(0);
      expect(result.newRefundedCents).toBe(0);
    });

    test('reconciles full refund from Stripe', async () => {
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // Mock Stripe API - full refund
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: testChargeId,
          refunds: {
            data: [{
              id: testRefundId,
              amount: 10000,
              status: 'succeeded',
              reason: 'requested_by_customer',
              created: Math.floor(Date.now() / 1000),
            }],
          },
        }),
      });

      const result = await reconcilePayment(testPaymentId);

      expect(result.status).toBe('reconciled');
      expect(result.oldRefundedCents).toBe(0);
      expect(result.newRefundedCents).toBe(10000);
      expect(result.appliedRefunds).toHaveLength(1);
      expect(result.appliedRefunds?.[0].id).toBe(testRefundId);

      // Verify payment status updated
      expect(mockData.payments[0].status).toBe(PaymentStatus.REFUNDED);
      expect(mockData.payments[0].refundedCents).toBe(10000);
    });

    test('reconciles partial refund from Stripe', async () => {
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // Mock Stripe API - partial refund
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: testChargeId,
          refunds: {
            data: [{
              id: testRefundId,
              amount: 5000, // Only 50 EUR
              status: 'succeeded',
              reason: 'partial',
              created: Math.floor(Date.now() / 1000),
            }],
          },
        }),
      });

      const result = await reconcilePayment(testPaymentId);

      expect(result.status).toBe('reconciled');
      expect(result.newRefundedCents).toBe(5000);

      // Verify payment status is PARTIALLY_REFUNDED
      expect(mockData.payments[0].status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    });

    test('creates StripeRefund record for new refund', async () => {
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: testChargeId,
          refunds: {
            data: [{
              id: 're_new_refund',
              amount: 10000,
              status: 'succeeded',
              reason: 'requested_by_customer',
              created: Math.floor(Date.now() / 1000),
            }],
          },
        }),
      });

      await reconcilePayment(testPaymentId);

      expect(mockData.stripeRefunds.length).toBe(1);
      expect(mockData.stripeRefunds[0].stripeRefundId).toBe('re_new_refund');
      expect(mockData.stripeRefunds[0].paymentId).toBe(testPaymentId);
    });

    test('skips already recorded Stripe refunds', async () => {
      mockData.payments.push({
        id: testPaymentId,
        paymentIntentId: 'pi_test',
        chargeId: testChargeId,
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 10000,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      // Already recorded refund
      mockData.stripeRefunds.push({
        id: 'sr_test',
        stripeRefundId: testRefundId,
        paymentId: testPaymentId,
        amountCents: 10000,
        reason: 'requested_by_customer',
        status: 'succeeded',
        stripeCreatedAt: new Date(),
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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: testChargeId,
          refunds: {
            data: [{
              id: testRefundId,
              amount: 10000,
              status: 'succeeded',
              reason: 'requested_by_customer',
              created: Math.floor(Date.now() / 1000),
            }],
          },
        }),
      });

      const result = await reconcilePayment(testPaymentId);

      expect(result.status).toBe('ok');
      // Should not create duplicate StripeRefund
      expect(mockData.stripeRefunds.length).toBe(1);
    });

    test('creates notification for applied refund', async () => {
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: testChargeId,
          refunds: {
            data: [{
              id: testRefundId,
              amount: 10000,
              status: 'succeeded',
              reason: 'requested_by_customer',
              created: Math.floor(Date.now() / 1000),
            }],
          },
        }),
      });

      await reconcilePayment(testPaymentId);

      expect(mockData.notifications.length).toBe(1);
      expect(mockData.notifications[0].type).toBe('REFUND_APPLIED');
    });

    test('handles Stripe API error', async () => {
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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      });

      const result = await reconcilePayment(testPaymentId);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid API key');
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: testChargeId,
          refunds: {
            data: [{
              id: testRefundId,
              amount: 10000,
              status: 'succeeded',
              reason: 'requested_by_customer',
              created: Math.floor(Date.now() / 1000),
            }],
          },
        }),
      });

      await reconcilePayment(testPaymentId);

      const audit = mockData.paymentAuditEvents.find(
        e => e.eventType === 'reconcile.applied'
      );
      expect(audit).toBeDefined();
    });
  });

  // ============================================
  // BATCH RECONCILIATION TESTS
  // ============================================

  describe('reconcileAllRecent', () => {
    test('reconciles multiple payments', async () => {
      // Create multiple payments
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
          createdAt: new Date(Date.now() - i * 1000),
        });
      }

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 300,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 300,
        totalWithdrawn: 0,
      });

      // Mock Stripe API responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'ch_test',
          refunds: { data: [] },
        }),
      });

      const result = await reconcileAllRecent(10);

      expect(result.total).toBe(3);
      expect(result.ok).toBe(3);
      expect(result.reconciled).toBe(0);
    });

    test('respects limit parameter', async () => {
      // Create 10 payments
      for (let i = 0; i < 10; i++) {
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 1000,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 1000,
        totalWithdrawn: 0,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'ch_test',
          refunds: { data: [] },
        }),
      });

      const result = await reconcileAllRecent(5);

      expect(result.total).toBe(5);
    });

    test('filters by payment status', async () => {
      // PENDING payment (should be excluded)
      mockData.payments.push({
        id: 'pay_pending',
        paymentIntentId: 'pi_pending',
        chargeId: 'ch_pending',
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

      // SUCCEEDED payment (should be included)
      mockData.payments.push({
        id: 'pay_succeeded',
        paymentIntentId: 'pi_succeeded',
        chargeId: 'ch_succeeded',
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

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'ch_test',
          refunds: { data: [] },
        }),
      });

      const result = await reconcileAllRecent(10);

      expect(result.total).toBe(1); // Only SUCCEEDED payment
    });

    test('handles errors gracefully', async () => {
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'API error' } }),
      });

      const result = await reconcileAllRecent(10);

      expect(result.errors).toBe(1);
    });

    test('counts reconciled correctly', async () => {
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // Mock with refund
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: testChargeId,
          refunds: {
            data: [{
              id: 're_test',
              amount: 10000,
              status: 'succeeded',
              reason: 'requested_by_customer',
              created: Math.floor(Date.now() / 1000),
            }],
          },
        }),
      });

      const result = await reconcileAllRecent(10);

      expect(result.reconciled).toBe(1);
    });
  });

  // ============================================
  // FIND DISCREPANCIES TESTS
  // ============================================

  describe('findDiscrepancies', () => {
    test('finds payments not recently reconciled', async () => {
      // Not reconciled
      mockData.payments.push({
        id: 'pay_not_reconciled',
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
      });

      // Recently reconciled (should be excluded)
      mockData.payments.push({
        id: 'pay_recent',
        paymentIntentId: 'pi_2',
        chargeId: 'ch_2',
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0,
        lastReconciledAt: new Date(), // Just reconciled
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      const discrepancies = await findDiscrepancies(10);

      expect(discrepancies.length).toBe(1);
      expect(discrepancies[0].paymentId).toBe('pay_not_reconciled');
    });

    test('respects limit parameter', async () => {
      for (let i = 0; i < 20; i++) {
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

      const discrepancies = await findDiscrepancies(10);

      expect(discrepancies.length).toBe(10);
    });

    test('excludes payments without charge ID', async () => {
      mockData.payments.push({
        id: 'pay_no_charge',
        paymentIntentId: 'pi_no_charge',
        chargeId: null,
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

      const discrepancies = await findDiscrepancies(10);

      expect(discrepancies.length).toBe(0);
    });
  });

  // ============================================
  // RECONCILIATION STATS TESTS
  // ============================================

  describe('getReconciliationStats', () => {
    test('returns correct statistics', async () => {
      // Create various payments
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
        },
        {
          id: 'pay_4',
          paymentIntentId: 'pi_4',
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
        }
      );

      const stats = await getReconciliationStats();

      expect(stats.totalPayments).toBe(4);
      expect(stats.succeededPayments).toBe(1);
      expect(stats.partialRefundedPayments).toBe(1);
      expect(stats.refundedPayments).toBe(1);
      expect(stats.lastReconciliationRun).toBeDefined();
      expect(stats.pendingReconciliation).toBe(0); // All SUCCEEDED/PARTIALLY_REFUNDED have lastReconciledAt set
    });

    test('handles empty database', async () => {
      const stats = await getReconciliationStats();

      expect(stats.totalPayments).toBe(0);
      expect(stats.succeededPayments).toBe(0);
      expect(stats.refundedPayments).toBe(0);
      expect(stats.partialRefundedPayments).toBe(0);
      expect(stats.lastReconciliationRun).toBeNull();
      expect(stats.pendingReconciliation).toBe(0);
    });
  });

  // ============================================
  // WALLET INTEGRATION TESTS
  // ============================================

  describe('Wallet Integration', () => {
    test('creates wallet transaction for refund reversal', async () => {
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

      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: testChargeId,
          refunds: {
            data: [{
              id: testRefundId,
              amount: 10000,
              status: 'succeeded',
              reason: 'requested_by_customer',
              created: Math.floor(Date.now() / 1000),
            }],
          },
        }),
      });

      await reconcilePayment(testPaymentId);

      // Should create wallet transaction
      const walletTx = mockData.walletTransactions.find(
        t => t.reference === `refund_${testRefundId}`
      );
      expect(walletTx).toBeDefined();
      expect(walletTx?.type).toBe('REFUND');
      expect(walletTx?.amount).toBe(-100);
    });
  });
});
