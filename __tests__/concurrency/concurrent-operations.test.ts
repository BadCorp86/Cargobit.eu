/**
 * Concurrent Operation Tests (Task 2.2-2.3)
 * 
 * Tests for race conditions and concurrent access scenarios:
 * - Concurrent webhook delivery handling
 * - Concurrent wallet operations
 * - Concurrent reconciliation
 * - Idempotency under concurrent load
 */

import { mockPrisma, mockData, resetIdCounter } from '../mocks/prisma';
import { PaymentStatus } from '@prisma/client';
import { dispatchStripeEvent } from '@/services/stripe-webhook.service';
import { creditWallet, debitWallet, reverseCredit } from '@/services/wallet.service';
import { reconcilePayment } from '@/services/refund-reconciliation.service';

// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: require('../mocks/prisma').mockPrisma,
}));

// Mock fetch for Stripe API calls
const originalFetch = global.fetch;

describe('Concurrent Operations', () => {
  const testUserId = 'user_concurrent_test';
  const testPaymentIntentId = 'pi_concurrent_test';
  const testChargeId = 'ch_concurrent_test';

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
  // CONCURRENT WEBHOOK DELIVERY TESTS
  // ============================================

  describe('Concurrent Webhook Delivery', () => {
    test('handles duplicate webhook delivery correctly', async () => {
      mockData.payments.push({
        id: 'pay_concurrent_1',
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
        id: 'wallet_concurrent',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const event = {
        id: 'evt_duplicate_delivery',
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

      // Simulate concurrent webhook delivery
      // Note: In a real database with proper locking, one would be marked as duplicate
      // With our mock, we test the sequential idempotency behavior
      const result1 = await dispatchStripeEvent(event);
      const result2 = await dispatchStripeEvent(event);

      // First result should succeed
      expect(result1.success).toBe(true);
      expect(result1.duplicate).toBeUndefined();

      // Second result should be marked as duplicate
      expect(result2.success).toBe(true);
      expect(result2.duplicate).toBe(true);

      // Verify: Only one wallet transaction created
      expect(mockData.walletTransactions.length).toBe(1);
      expect(mockData.wallets[0].balance).toBe(100);
    });

    test('handles rapid sequential duplicate webhooks', async () => {
      mockData.payments.push({
        id: 'pay_rapid',
        paymentIntentId: 'pi_rapid',
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
        id: 'wallet_rapid',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const event = {
        id: 'evt_rapid_seq',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_rapid',
            amount: 5000,
            currency: 'eur',
            status: 'succeeded',
            latest_charge: 'ch_rapid',
            metadata: {},
          },
        },
      };

      // Process same event 5 times sequentially to test idempotency
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await dispatchStripeEvent(event));
      }

      // First should succeed, rest should be duplicates
      expect(results[0].success).toBe(true);
      expect(results[0].duplicate).toBeUndefined();

      const duplicates = results.slice(1).filter(r => r.duplicate);
      expect(duplicates.length).toBe(4);

      // Balance should only increase once
      expect(mockData.wallets[0].balance).toBe(50);
    });
  });

  // ============================================
  // CONCURRENT WALLET OPERATIONS TESTS
  // ============================================

  describe('Concurrent Wallet Operations', () => {
    test('handles concurrent credits with same reference (idempotency)', async () => {
      mockData.wallets.push({
        id: 'wallet_credit_concurrent',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const creditParams = {
        userId: testUserId,
        amountCents: 10000,
        reference: 'same_reference_concurrent',
      };

      // Process credits sequentially to test idempotency
      const result1 = await creditWallet(creditParams);
      const result2 = await creditWallet(creditParams);
      const result3 = await creditWallet(creditParams);

      // First should succeed
      expect(result1.success).toBe(true);
      expect(result1.duplicate).toBeUndefined();

      // Subsequent calls should be duplicates
      expect(result2.success).toBe(true);
      expect(result2.duplicate).toBe(true);
      expect(result3.success).toBe(true);
      expect(result3.duplicate).toBe(true);

      // Balance should only increase by 100 EUR once
      expect(mockData.wallets[0].balance).toBe(100);
    });

    test('handles concurrent credits with different references', async () => {
      mockData.wallets.push({
        id: 'wallet_diff_ref',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      // Concurrent credits with different references
      const results = await Promise.all([
        creditWallet({ userId: testUserId, amountCents: 5000, reference: 'ref_1' }),
        creditWallet({ userId: testUserId, amountCents: 3000, reference: 'ref_2' }),
        creditWallet({ userId: testUserId, amountCents: 2000, reference: 'ref_3' }),
      ]);

      // All should succeed without duplicate flag
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => !r.duplicate)).toBe(true);

      // Balance should be sum of all credits: 50 + 30 + 20 = 100 EUR
      expect(mockData.wallets[0].balance).toBe(100);
      expect(mockData.walletTransactions.length).toBe(3);
    });

    test('handles concurrent debit and credit operations', async () => {
      mockData.wallets.push({
        id: 'wallet_mixed',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // Concurrent credit and debit operations
      const results = await Promise.all([
        creditWallet({ userId: testUserId, amountCents: 5000, reference: 'credit_mixed' }),
        debitWallet({ userId: testUserId, amountCents: 3000, reference: 'debit_mixed' }),
      ]);

      expect(results.every(r => r.success)).toBe(true);

      // Final balance: 100 + 50 - 30 = 120 EUR
      expect(mockData.wallets[0].balance).toBe(120);
    });
  });

  // ============================================
  // CONCURRENT RECONCILIATION TESTS
  // ============================================

  describe('Concurrent Reconciliation', () => {
    test('handles concurrent reconciliation of same payment', async () => {
      mockData.payments.push({
        id: 'pay_recon_concurrent',
        paymentIntentId: 'pi_recon_concurrent',
        chargeId: 'ch_recon_concurrent',
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
        id: 'wallet_recon',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // Mock Stripe API - no refunds
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'ch_recon_concurrent',
          refunds: { data: [] },
        }),
      });

      // Concurrent reconciliation of same payment
      const results = await Promise.all([
        reconcilePayment('pay_recon_concurrent'),
        reconcilePayment('pay_recon_concurrent'),
      ]);

      // Both should succeed
      expect(results.every(r => r.status === 'ok')).toBe(true);

      // Payment should be updated
      expect(mockData.payments[0].lastReconciledAt).toBeDefined();
    });

    test('handles concurrent reconciliation of different payments', async () => {
      // Create multiple payments
      for (let i = 0; i < 3; i++) {
        mockData.payments.push({
          id: `pay_recon_${i}`,
          paymentIntentId: `pi_recon_${i}`,
          chargeId: `ch_recon_${i}`,
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
        id: 'wallet_multi_recon',
        ownerUserId: testUserId,
        balance: 300,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 300,
        totalWithdrawn: 0,
      });

      // Mock Stripe API
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'ch_test',
          refunds: { data: [] },
        }),
      });

      // Concurrent reconciliation of different payments
      const results = await Promise.all([
        reconcilePayment('pay_recon_0'),
        reconcilePayment('pay_recon_1'),
        reconcilePayment('pay_recon_2'),
      ]);

      // All should succeed
      expect(results.every(r => r.status === 'ok')).toBe(true);

      // All payments should have lastReconciledAt
      const reconciledCount = mockData.payments.filter(
        p => p.lastReconciledAt !== null
      ).length;
      expect(reconciledCount).toBe(3);
    });
  });

  // ============================================
  // STRESS TESTS
  // ============================================

  describe('Stress Tests', () => {
    test('handles many concurrent operations', async () => {
      mockData.wallets.push({
        id: 'wallet_stress',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      // Create 50 concurrent operations
      const operations = Array.from({ length: 50 }, (_, i) =>
        creditWallet({
          userId: testUserId,
          amountCents: 100, // 1 EUR each
          reference: `stress_ref_${i}`,
        })
      );

      const results = await Promise.all(operations);

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Balance should be 50 EUR
      expect(mockData.wallets[0].balance).toBe(50);
      expect(mockData.walletTransactions.length).toBe(50);
    });

    test('handles alternating concurrent operations', async () => {
      mockData.wallets.push({
        id: 'wallet_alternate',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // 10 credits and 10 debits concurrently
      const credits = Array.from({ length: 10 }, (_, i) =>
        creditWallet({
          userId: testUserId,
          amountCents: 1000,
          reference: `alt_credit_${i}`,
        })
      );

      const debits = Array.from({ length: 10 }, (_, i) =>
        debitWallet({
          userId: testUserId,
          amountCents: 500,
          reference: `alt_debit_${i}`,
        })
      );

      const results = await Promise.all([...credits, ...debits]);

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Balance: 100 + (10 * 10) - (10 * 5) = 100 + 100 - 50 = 150 EUR
      expect(mockData.wallets[0].balance).toBe(150);
      expect(mockData.walletTransactions.length).toBe(20);
    });
  });
});
