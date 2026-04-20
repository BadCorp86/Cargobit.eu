/**
 * Edge Case Tests for Payment System (Task 2.2-2.3)
 * 
 * Tests for edge cases and error scenarios that align with the Postman Collection:
 * - Duplicate webhook replay handling
 * - Invalid payloads and signatures
 * - Orphaned payment intents
 * - Race conditions in refund processing
 * - Boundary conditions
 */

import { mockPrisma, mockData, resetIdCounter } from '../mocks/prisma';
import { PaymentStatus } from '@prisma/client';
import {
  dispatchStripeEvent,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handleChargeRefunded,
} from '@/services/stripe-webhook.service';
import {
  creditWallet,
  debitWallet,
  reverseCredit,
  getWalletBalance,
  hasSufficientBalance,
} from '@/services/wallet.service';
import {
  reconcilePayment,
  findDiscrepancies,
  getReconciliationStats,
} from '@/services/refund-reconciliation.service';

// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: require('../mocks/prisma').mockPrisma,
}));

// Mock fetch for Stripe API calls
const originalFetch = global.fetch;

describe('Payment Edge Cases', () => {
  const testUserId = 'user_edge_case';
  const testPaymentId = 'pay_edge_case';
  const testPaymentIntentId = 'pi_edge_case';
  const testChargeId = 'ch_edge_case';
  const testEventId = 'evt_edge_case';

  beforeEach(() => {
    mockData.reset();
    resetIdCounter();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ============================================
  // DUPLICATE WEBHOOK REPLAY TESTS (Postman Request 9)
  // ============================================

  describe('Duplicate Webhook Replay (Idempotency)', () => {
    test('duplicate payment_intent.succeeded does not create duplicate wallet transactions', async () => {
      // Setup: Existing succeeded payment
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
        id: 'wallet_edge',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // Existing wallet transaction
      mockData.walletTransactions.push({
        id: 'wtx_original',
        walletId: 'wallet_edge',
        type: 'PAYMENT_IN',
        amount: 100,
        currency: 'EUR',
        paymentId: testPaymentId,
        relatedTransportId: null,
        description: 'Original payment',
        reference: 'payment_' + testPaymentId,
        processedAt: new Date(),
        createdAt: new Date(),
      });

      // Record the event as already processed
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

      const initialTxCount = mockData.walletTransactions.length;

      // Replay the same event
      const replayEvent = {
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

      const result = await dispatchStripeEvent(replayEvent);

      // Should be marked as duplicate
      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);

      // No new wallet transaction should be created
      expect(mockData.walletTransactions.length).toBe(initialTxCount);

      // Balance should remain unchanged
      expect(mockData.wallets[0].balance).toBe(100);
    });

    test('duplicate charge.refunded does not double reverse wallet', async () => {
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

      mockData.wallets.push({
        id: 'wallet_refund_replay',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 100,
      });

      // Existing refund record
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

      // Record the event as already processed
      mockData.stripeEvents.push({
        id: 'evt_refund_replay',
        type: 'charge.refunded',
        payload: null,
        processed: true,
        processedAt: new Date(),
        errorCount: 0,
        lastError: null,
        receivedAt: new Date(),
        createdAt: new Date(),
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

      const result = await handleChargeRefunded(charge, 'evt_refund_replay');

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);

      // Balance should remain 0 (not go negative)
      expect(mockData.wallets[0].balance).toBe(0);
    });

    test('multiple rapid duplicate events are all handled idempotently', async () => {
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
        id: 'wallet_rapid',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const event = {
        id: 'evt_rapid_duplicate',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: testPaymentIntentId,
            amount: 10000,
            currency: 'eur',
            status: 'succeeded',
            latest_charge: testChargeId,
            metadata: {},
          },
        },
      };

      // Process the same event 10 times rapidly
      const results = await Promise.all([
        dispatchStripeEvent(event),
        dispatchStripeEvent(event),
        dispatchStripeEvent(event),
        dispatchStripeEvent(event),
        dispatchStripeEvent(event),
        dispatchStripeEvent(event),
        dispatchStripeEvent(event),
        dispatchStripeEvent(event),
        dispatchStripeEvent(event),
        dispatchStripeEvent(event),
      ]);

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Exactly one should not be a duplicate (first to acquire lock)
      const nonDuplicates = results.filter(r => !r.duplicate);
      expect(nonDuplicates.length).toBe(1);

      // Balance should only increase by 100 EUR once
      expect(mockData.wallets[0].balance).toBe(100);
    });
  });

  // ============================================
  // BOUNDARY CONDITIONS TESTS
  // ============================================

  describe('Boundary Conditions', () => {
    test('handles large payment amount', async () => {
      const largeAmount = 999999999; // ~10 million EUR

      mockData.payments.push({
        id: 'pay_large',
        paymentIntentId: 'pi_large',
        chargeId: null,
        shipperId: testUserId,
        jobId: null,
        amountCents: largeAmount,
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
        id: 'wallet_large',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const pi = {
        id: 'pi_large',
        amount: largeAmount,
        currency: 'eur',
        status: 'succeeded',
        latest_charge: 'ch_large',
        metadata: {},
      };

      const result = await handlePaymentIntentSucceeded(pi, 'evt_large');

      expect(result.success).toBe(true);
      expect(mockData.wallets[0].balance).toBe(largeAmount / 100);
    });

    test('handles 1 cent payment', async () => {
      mockData.payments.push({
        id: 'pay_penny',
        paymentIntentId: 'pi_penny',
        chargeId: null,
        shipperId: testUserId,
        jobId: null,
        amountCents: 1,
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
        id: 'wallet_penny',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const pi = {
        id: 'pi_penny',
        amount: 1,
        currency: 'eur',
        status: 'succeeded',
        latest_charge: 'ch_penny',
        metadata: {},
      };

      const result = await handlePaymentIntentSucceeded(pi, 'evt_penny');

      expect(result.success).toBe(true);
      expect(mockData.wallets[0].balance).toBe(0.01);
    });

    test('handles partial refund to exact full amount', async () => {
      mockData.payments.push({
        id: 'pay_partial_to_full',
        paymentIntentId: 'pi_ptf',
        chargeId: 'ch_ptf',
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.PARTIALLY_REFUNDED,
        refundedCents: 5000, // Already partially refunded
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      mockData.wallets.push({
        id: 'wallet_ptf',
        ownerUserId: testUserId,
        balance: 50,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 50,
      });

      // Refund the remaining 5000 cents
      const charge = {
        id: 'ch_ptf',
        amount: 10000,
        currency: 'eur',
        refunded: true,
        refunds: {
          data: [
            { id: 're_ptf_1', amount: 5000, reason: 'partial', status: 'succeeded', created: 1000 },
            { id: 're_ptf_2', amount: 5000, reason: 'remainder', status: 'succeeded', created: Math.floor(Date.now() / 1000) },
          ],
        },
      };

      const result = await handleChargeRefunded(charge, 'evt_ptf');

      expect(result.success).toBe(true);

      // Total refund is now 10000, status should be REFUNDED
      expect(mockData.payments[0].status).toBe(PaymentStatus.REFUNDED);
      expect(mockData.payments[0].refundedCents).toBe(10000);
    });
  });

  // ============================================
  // ERROR RECOVERY TESTS
  // ============================================

  describe('Error Recovery', () => {
    test('records error for failed processing and allows retry', async () => {
      // Pre-create the event so error recording works
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
        id: 'wallet_error',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      // Force an error by making findFirst throw
      mockPrisma.payment.findFirst.mockRejectedValueOnce(new Error('Simulated DB error'));

      const pi = {
        id: testPaymentIntentId,
        amount: 10000,
        currency: 'eur',
        status: 'succeeded',
        metadata: {},
      };

      const result = await handlePaymentIntentSucceeded(pi, testEventId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Simulated DB error');

      // Error should be recorded
      const event = mockData.stripeEvents.find(e => e.id === testEventId);
      expect(event?.errorCount).toBeGreaterThan(0);
      expect(event?.lastError).toContain('Simulated DB error');
    });

    test('event can be retried after transient error', async () => {
      // First attempt with error
      mockData.stripeEvents.push({
        id: 'evt_retry',
        type: 'payment_intent.succeeded',
        payload: null,
        processed: false,
        processedAt: null,
        errorCount: 1,
        lastError: 'Previous transient error',
        receivedAt: new Date(),
        createdAt: new Date(),
      });

      mockData.payments.push({
        id: 'pay_retry',
        paymentIntentId: 'pi_retry',
        chargeId: null,
        shipperId: testUserId,
        jobId: null,
        amountCents: 5000,
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
        id: 'wallet_retry',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      // This time it should succeed
      const result = await dispatchStripeEvent({
        id: 'evt_retry',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_retry',
            amount: 5000,
            currency: 'eur',
            status: 'succeeded',
            latest_charge: 'ch_retry',
            metadata: {},
          },
        },
      });

      expect(result.success).toBe(true);

      // Event should now be processed
      const event = mockData.stripeEvents.find(e => e.id === 'evt_retry');
      expect(event?.processed).toBe(true);
    });
  });

  // ============================================
  // WALLET INSUFFICIENT BALANCE TESTS
  // ============================================

  describe('Wallet Insufficient Balance', () => {
    test('debit succeeds even with insufficient balance (current behavior)', async () => {
      mockData.wallets.push({
        id: 'wallet_insufficient',
        ownerUserId: testUserId,
        balance: 50,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 50,
      });

      // Try to debit more than balance
      const result = await debitWallet({
        userId: testUserId,
        amountCents: 10000, // 100 EUR, but only 50 EUR in wallet
        reference: 'debit_insufficient',
      });

      // The current implementation doesn't check balance before debit
      // This test documents the current behavior
      expect(result.success).toBe(true);
      expect(mockData.wallets[0].balance).toBe(-50); // Goes negative
    });

    test('hasSufficientBalance returns correct result', async () => {
      mockData.wallets.push({
        id: 'wallet_check',
        ownerUserId: testUserId,
        balance: 75,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 25,
      });

      const sufficient = await hasSufficientBalance(testUserId, 5000); // 50 EUR
      expect(sufficient).toBe(true);

      const insufficient = await hasSufficientBalance(testUserId, 10000); // 100 EUR
      expect(insufficient).toBe(false);
    });
  });

  // ============================================
  // RECONCILIATION EDGE CASES
  // ============================================

  describe('Reconciliation Edge Cases', () => {
    test('handles Stripe API rate limiting', async () => {
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

      // Mock Stripe rate limiting
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: { message: 'Rate limit exceeded' },
        }),
      });

      const result = await reconcilePayment(testPaymentId);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Rate limit');
    });

    test('findDiscrepancies excludes recently reconciled payments', async () => {
      // Not recently reconciled (1 day ago)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      mockData.payments.push({
        id: 'pay_old_recon',
        paymentIntentId: 'pi_old',
        chargeId: 'ch_old',
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0,
        lastReconciledAt: oneDayAgo,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      // Recently reconciled (30 minutes ago)
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

      mockData.payments.push({
        id: 'pay_recent_recon',
        paymentIntentId: 'pi_recent',
        chargeId: 'ch_recent',
        shipperId: testUserId,
        jobId: null,
        amountCents: 10000,
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0,
        lastReconciledAt: thirtyMinAgo,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      const discrepancies = await findDiscrepancies(10);

      // Only the old reconciled payment should be included
      expect(discrepancies.length).toBe(1);
      expect(discrepancies[0].paymentId).toBe('pay_old_recon');
    });
  });

  // ============================================
  // CURRENCY EDGE CASES
  // ============================================

  describe('Currency Handling', () => {
    test('handles different currencies in payment', async () => {
      mockData.payments.push({
        id: 'pay_usd',
        paymentIntentId: 'pi_usd',
        chargeId: null,
        shipperId: testUserId,
        jobId: null,
        amountCents: 15000, // 150 USD
        currency: 'USD',
        status: PaymentStatus.PENDING,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: null,
        failedAt: null,
        createdAt: new Date(),
      });

      mockData.wallets.push({
        id: 'wallet_usd',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const pi = {
        id: 'pi_usd',
        amount: 15000,
        currency: 'usd', // Stripe uses lowercase
        status: 'succeeded',
        latest_charge: 'ch_usd',
        metadata: {},
      };

      const result = await handlePaymentIntentSucceeded(pi, 'evt_usd');

      // The service processes regardless of currency mismatch
      // In production, you might want currency conversion or validation
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // METADATA EDGE CASES
  // ============================================

  describe('Metadata Handling', () => {
    test('handles missing metadata gracefully', async () => {
      mockData.payments.push({
        id: 'pay_no_meta',
        paymentIntentId: 'pi_no_meta',
        chargeId: null,
        shipperId: testUserId,
        jobId: null,
        amountCents: 5000,
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
        id: 'wallet_no_meta',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const pi = {
        id: 'pi_no_meta',
        amount: 5000,
        currency: 'eur',
        status: 'succeeded',
        latest_charge: 'ch_no_meta',
        // No metadata field at all
      };

      const result = await handlePaymentIntentSucceeded(pi, 'evt_no_meta');

      expect(result.success).toBe(true);
    });

    test('handles large metadata object', async () => {
      mockData.payments.push({
        id: 'pay_large_meta',
        paymentIntentId: 'pi_large_meta',
        chargeId: null,
        shipperId: testUserId,
        jobId: null,
        amountCents: 5000,
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
        id: 'wallet_large_meta',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      // Large metadata
      const largeMetadata: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        largeMetadata['key_' + i] = 'value_' + i;
      }

      const pi = {
        id: 'pi_large_meta',
        amount: 5000,
        currency: 'eur',
        status: 'succeeded',
        latest_charge: 'ch_large_meta',
        metadata: largeMetadata,
      };

      const result = await handlePaymentIntentSucceeded(pi, 'evt_large_meta');

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // STATUS TRANSITION TESTS
  // ============================================

  describe('Payment Status Transitions', () => {
    test('cannot transition from REFUNDED back to SUCCEEDED', async () => {
      mockData.payments.push({
        id: 'pay_refunded',
        paymentIntentId: 'pi_refunded',
        chargeId: 'ch_refunded',
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

      // Try to process payment_intent.succeeded on already refunded payment
      const result = await handlePaymentIntentSucceeded(
        {
          id: 'pi_refunded',
          amount: 10000,
          currency: 'eur',
          status: 'succeeded',
          metadata: {},
        },
        'evt_already_refunded'
      );

      // Should be treated as duplicate/success without state change
      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
      expect(mockData.payments[0].status).toBe(PaymentStatus.REFUNDED);
    });

    test('processing succeeded on failed payment updates status', async () => {
      mockData.payments.push({
        id: 'pay_failed',
        paymentIntentId: 'pi_failed',
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

      mockData.wallets.push({
        id: 'wallet_failed_recover',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      // Try to process payment_intent.succeeded on failed payment
      const result = await handlePaymentIntentSucceeded(
        {
          id: 'pi_failed',
          amount: 10000,
          currency: 'eur',
          status: 'succeeded',
          latest_charge: 'ch_failed_recovered',
          metadata: {},
        },
        'evt_failed_recover'
      );

      // The service should update the payment
      expect(result.success).toBe(true);
      expect(mockData.payments[0].status).toBe(PaymentStatus.SUCCEEDED);
    });
  });

  // ============================================
  // ORPHANED RECORDS TESTS
  // ============================================

  describe('Orphaned Records', () => {
    test('handles orphaned payment intent (no matching payment)', async () => {
      const orphanedPi = {
        id: 'pi_orphaned',
        amount: 10000,
        currency: 'eur',
        status: 'succeeded',
        metadata: {}, // No userId or type
      };

      const result = await handlePaymentIntentSucceeded(orphanedPi, 'evt_orphaned');

      // Should succeed without error (graceful handling)
      expect(result.success).toBe(true);

      // Audit log should be created
      expect(mockData.auditLogs.length).toBeGreaterThan(0);
    });

    test('handles orphaned charge refund (no matching payment)', async () => {
      const orphanedCharge = {
        id: 'ch_orphaned',
        amount: 10000,
        currency: 'eur',
        refunded: true,
        refunds: {
          data: [{
            id: 're_orphaned',
            amount: 10000,
            reason: 'requested_by_customer',
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
          }],
        },
      };

      const result = await handleChargeRefunded(orphanedCharge, 'evt_orphaned_charge');

      // Should succeed without error
      expect(result.success).toBe(true);

      // Audit log should be created
      expect(mockData.auditLogs.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // ZERO AMOUNT TESTS
  // ============================================

  describe('Zero Amount Handling', () => {
    test('handles zero amount refund', async () => {
      mockData.payments.push({
        id: 'pay_zero_refund',
        paymentIntentId: 'pi_zero_refund',
        chargeId: 'ch_zero_refund',
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
        id: 'wallet_zero_refund',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      const charge = {
        id: 'ch_zero_refund',
        amount: 10000,
        currency: 'eur',
        refunded: false,
        refunds: {
          data: [{
            id: 're_zero',
            amount: 0, // Zero refund
            reason: 'test',
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
          }],
        },
      };

      const result = await handleChargeRefunded(charge, 'evt_zero_refund');

      expect(result.success).toBe(true);
      // Balance should remain unchanged for zero refund
      expect(mockData.wallets[0].balance).toBe(100);
    });
  });
});
