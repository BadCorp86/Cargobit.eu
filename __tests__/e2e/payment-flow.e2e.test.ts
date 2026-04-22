/**
 * E2E Tests for Complete Payment Flow (Task 2.2-2.3)
 * 
 * Tests the full end-to-end payment lifecycle:
 * 1. Job Creation → PaymentIntent Creation
 * 2. PaymentIntent Succeeded → Webhook → Payment + Wallet Credit
 * 3. Charge Refunded → Webhook → Payment Status + Wallet Reversal
 * 4. Reconciliation → Stripe State Sync
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
  getWalletTransactions,
} from '@/services/wallet.service';
import {
  reconcilePayment,
  reconcileAllRecent,
  getReconciliationStats,
} from '@/services/refund-reconciliation.service';

// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: require('../mocks/prisma').mockPrisma,
}));

// Mock fetch for Stripe API calls
const originalFetch = global.fetch;

describe('E2E: Payment Flow', () => {
  const testShipperId = 'shipper_test123';
  const testTransportId = 'transport_test123';
  const testPaymentIntentId = 'pi_e2e_test';
  const testChargeId = 'ch_e2e_test';

  beforeEach(() => {
    mockData.reset();
    resetIdCounter();
    jest.clearAllMocks();

    // Mock Stripe API
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ============================================
  // E2E: COMPLETE PAYMENT LIFECYCLE
  // ============================================

  describe('Complete Payment Lifecycle', () => {
    test('E2E: Payment → Success → Wallet Credit', async () => {
      // Step 1: Create initial state (Job + Payment pending)
      mockData.transports.push({
        id: testTransportId,
        status: 'CREATED',
        assignedAt: null,
      });

      mockData.payments.push({
        id: 'pay_e2e_1',
        paymentIntentId: testPaymentIntentId,
        chargeId: null,
        shipperId: testShipperId,
        jobId: testTransportId,
        amountCents: 15000, // 150 EUR
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
        id: 'wallet_e2e',
        ownerUserId: testShipperId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      // Step 2: Simulate payment_intent.succeeded webhook
      const event = {
        id: 'evt_e2e_success',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: testPaymentIntentId,
            amount: 15000,
            currency: 'eur',
            status: 'succeeded',
            latest_charge: testChargeId,
            metadata: {},
          },
        },
      };

      const result = await dispatchStripeEvent(event);

      // Verify: Payment succeeded
      expect(result.success).toBe(true);
      expect(mockData.payments[0].status).toBe(PaymentStatus.SUCCEEDED);
      expect(mockData.payments[0].chargeId).toBe(testChargeId);
      expect(mockData.payments[0].paidAt).toBeDefined();

      // Verify: Transport status updated
      expect(mockData.transports[0].status).toBe('ASSIGNED');
      expect(mockData.transports[0].assignedAt).toBeDefined();

      // Verify: Wallet credited
      expect(mockData.wallets[0].balance).toBe(150);

      // Verify: Wallet transaction created
      const walletTx = mockData.walletTransactions.find(
        t => t.reference === `payment_pay_e2e_1`
      );
      expect(walletTx).toBeDefined();
      expect(walletTx?.type).toBe('PAYMENT_IN');
      expect(walletTx?.amount).toBe(150);

      // Verify: Audit trail
      const auditEvent = mockData.paymentAuditEvents.find(
        e => e.eventType === 'payment_succeeded'
      );
      expect(auditEvent).toBeDefined();
    });

    test('E2E: Payment → Success → Full Refund → Wallet Reversal', async () => {
      // Setup: Already succeeded payment
      mockData.transports.push({
        id: testTransportId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      });

      mockData.payments.push({
        id: 'pay_e2e_2',
        paymentIntentId: testPaymentIntentId,
        chargeId: testChargeId,
        shipperId: testShipperId,
        jobId: testTransportId,
        amountCents: 20000, // 200 EUR
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
        id: 'wallet_e2e',
        ownerUserId: testShipperId,
        balance: 200,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 200,
        totalWithdrawn: 0,
      });

      // Simulate charge.refunded webhook (full refund)
      const refundEvent = {
        id: 'evt_e2e_refund',
        type: 'charge.refunded',
        data: {
          object: {
            id: testChargeId,
            amount: 20000,
            currency: 'eur',
            refunded: true,
            refunds: {
              data: [{
                id: 're_e2e_full',
                amount: 20000,
                reason: 'requested_by_customer',
                status: 'succeeded',
                created: Math.floor(Date.now() / 1000),
              }],
            },
          },
        },
      };

      const result = await dispatchStripeEvent(refundEvent);

      // Verify: Payment refunded
      expect(result.success).toBe(true);
      expect(mockData.payments[0].status).toBe(PaymentStatus.REFUNDED);
      expect(mockData.payments[0].refundedCents).toBe(20000);

      // Verify: Wallet reversed (balance decreased)
      expect(mockData.wallets[0].balance).toBe(0);

      // Verify: Wallet reversal transaction
      const reversalTx = mockData.walletTransactions.find(
        t => t.type === 'REFUND' && t.amount < 0
      );
      expect(reversalTx).toBeDefined();
      expect(reversalTx?.amount).toBe(-200);

      // Verify: Notification created
      const notification = mockData.notifications.find(
        n => n.type === 'REFUND_PROCESSED'
      );
      expect(notification).toBeDefined();
      expect(notification?.userId).toBe(testShipperId);
    });

    test('E2E: Payment → Success → Partial Refund → Partial Wallet Reversal', async () => {
      mockData.payments.push({
        id: 'pay_e2e_3',
        paymentIntentId: testPaymentIntentId,
        chargeId: testChargeId,
        shipperId: testShipperId,
        jobId: null,
        amountCents: 10000, // 100 EUR
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
        id: 'wallet_e2e',
        ownerUserId: testShipperId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // Partial refund (30 EUR)
      const partialRefundEvent = {
        id: 'evt_e2e_partial',
        type: 'charge.refunded',
        data: {
          object: {
            id: testChargeId,
            amount: 10000,
            currency: 'eur',
            refunded: false, // Not fully refunded
            refunds: {
              data: [{
                id: 're_e2e_partial',
                amount: 3000, // 30 EUR
                reason: 'partial_refund',
                status: 'succeeded',
                created: Math.floor(Date.now() / 1000),
              }],
            },
          },
        },
      };

      await dispatchStripeEvent(partialRefundEvent);

      // Verify: Payment partially refunded
      expect(mockData.payments[0].status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(mockData.payments[0].refundedCents).toBe(3000);

      // Verify: Wallet partially reversed
      expect(mockData.wallets[0].balance).toBe(70); // 100 - 30
    });

    test('E2E: Payment → Failure → Notification', async () => {
      mockData.payments.push({
        id: 'pay_e2e_4',
        paymentIntentId: testPaymentIntentId,
        chargeId: null,
        shipperId: testShipperId,
        jobId: testTransportId,
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

      // Payment failure
      const failEvent = {
        id: 'evt_e2e_fail',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: testPaymentIntentId,
            amount: 5000,
            currency: 'eur',
            status: 'failed',
            last_payment_error: { message: 'Card declined - insufficient funds' },
            metadata: {},
          },
        },
      };

      const result = await dispatchStripeEvent(failEvent);

      expect(result.success).toBe(true);
      expect(mockData.payments[0].status).toBe(PaymentStatus.FAILED);
      expect(mockData.payments[0].failedAt).toBeDefined();

      // Verify notification
      const notification = mockData.notifications.find(
        n => n.type === 'PAYMENT_FAILED'
      );
      expect(notification).toBeDefined();
      expect(notification?.userId).toBe(testShipperId);
    });
  });

  // ============================================
  // E2E: MULTIPLE PAYMENTS AND AGGREGATION
  // ============================================

  describe('Multiple Payments Aggregation', () => {
    test('E2E: Multiple payments accumulate wallet balance', async () => {
      mockData.wallets.push({
        id: 'wallet_multi',
        ownerUserId: testShipperId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      // Process 3 payments
      for (let i = 1; i <= 3; i++) {
        mockData.payments.push({
          id: `pay_multi_${i}`,
          paymentIntentId: `pi_multi_${i}`,
          chargeId: `ch_multi_${i}`,
          shipperId: testShipperId,
          jobId: null,
          amountCents: 10000 * i, // 100, 200, 300 EUR
          currency: 'EUR',
          status: PaymentStatus.PENDING,
          refundedCents: 0,
          lastReconciledAt: null,
          stripeRefundsJson: null,
          paidAt: null,
          failedAt: null,
          createdAt: new Date(),
        });

        await dispatchStripeEvent({
          id: `evt_multi_${i}`,
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: `pi_multi_${i}`,
              amount: 10000 * i,
              currency: 'eur',
              status: 'succeeded',
              latest_charge: `ch_multi_${i}`,
              metadata: {},
            },
          },
        });
      }

      // Verify: Total balance = 100 + 200 + 300 = 600 EUR
      expect(mockData.wallets[0].balance).toBe(600);
      expect(mockData.wallets[0].totalDeposited).toBe(600);

      // Verify: 3 transactions created
      expect(mockData.walletTransactions.length).toBe(3);
    });

    test('E2E: Multiple partial refunds tracked correctly', async () => {
      mockData.payments.push({
        id: 'pay_multi_refund',
        paymentIntentId: 'pi_mr',
        chargeId: 'ch_mr',
        shipperId: testShipperId,
        jobId: null,
        amountCents: 10000, // 100 EUR
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
        id: 'wallet_mr',
        ownerUserId: testShipperId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // First partial refund (20 EUR)
      await dispatchStripeEvent({
        id: 'evt_mr_1',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_mr',
            amount: 10000,
            currency: 'eur',
            refunded: false,
            refunds: {
              data: [{
                id: 're_mr_1',
                amount: 2000,
                reason: 'partial_1',
                status: 'succeeded',
                created: Math.floor(Date.now() / 1000) - 100,
              }],
            },
          },
        },
      });

      expect(mockData.payments[0].status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(mockData.payments[0].refundedCents).toBe(2000);
      expect(mockData.wallets[0].balance).toBe(80);

      // Second partial refund (30 EUR)
      await dispatchStripeEvent({
        id: 'evt_mr_2',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_mr',
            amount: 10000,
            currency: 'eur',
            refunded: false,
            refunds: {
              data: [
                {
                  id: 're_mr_1',
                  amount: 2000,
                  reason: 'partial_1',
                  status: 'succeeded',
                  created: Math.floor(Date.now() / 1000) - 100,
                },
                {
                  id: 're_mr_2',
                  amount: 3000,
                  reason: 'partial_2',
                  status: 'succeeded',
                  created: Math.floor(Date.now() / 1000),
                },
              ],
            },
          },
        },
      });

      // Total refunded: 20 + 30 = 50 EUR
      // Note: The service reverses the TOTAL refund amount, not the delta
      // After first webhook: 100 - 20 = 80 EUR
      // After second webhook: 80 - 50 = 30 EUR (reverses total of all refunds)
      expect(mockData.payments[0].refundedCents).toBe(5000);
      expect(mockData.wallets[0].balance).toBe(50);
    });
  });

  // ============================================
  // E2E: RECONCILIATION FLOW
  // ============================================

  describe('Reconciliation Flow', () => {
    test('E2E: Reconciliation detects and applies missing refund', async () => {
      mockData.payments.push({
        id: 'pay_reconcile',
        paymentIntentId: 'pi_rec',
        chargeId: 'ch_rec',
        shipperId: testShipperId,
        jobId: null,
        amountCents: 50000, // 500 EUR
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        refundedCents: 0, // Local state shows no refund
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: new Date(),
        failedAt: null,
        createdAt: new Date(),
      });

      mockData.wallets.push({
        id: 'wallet_rec',
        ownerUserId: testShipperId,
        balance: 500,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 500,
        totalWithdrawn: 0,
      });

      // Mock Stripe API with refund that's missing locally
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'ch_rec',
          refunds: {
            data: [{
              id: 're_stripe_only',
              amount: 25000, // 250 EUR refunded on Stripe
              status: 'succeeded',
              reason: 'requested_by_customer',
              created: Math.floor(Date.now() / 1000),
            }],
          },
        }),
      });

      const result = await reconcilePayment('pay_reconcile');

      // Verify: Reconciliation detected and applied
      expect(result.status).toBe('reconciled');
      expect(result.oldRefundedCents).toBe(0);
      expect(result.newRefundedCents).toBe(25000);
      expect(result.appliedRefunds).toHaveLength(1);

      // Verify: Payment status updated
      expect(mockData.payments[0].status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(mockData.payments[0].refundedCents).toBe(25000);

      // Verify: Wallet updated
      expect(mockData.wallets[0].balance).toBe(250);

      // Verify: StripeRefund record created
      expect(mockData.stripeRefunds.length).toBe(1);
    });

    test('E2E: Batch reconciliation processes multiple payments', async () => {
      // Create 5 payments needing reconciliation
      for (let i = 0; i < 5; i++) {
        mockData.payments.push({
          id: `pay_batch_${i}`,
          paymentIntentId: `pi_batch_${i}`,
          chargeId: `ch_batch_${i}`,
          shipperId: testShipperId,
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
        id: 'wallet_batch',
        ownerUserId: testShipperId,
        balance: 500,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 500,
        totalWithdrawn: 0,
      });

      // Mock Stripe API - all payments in sync
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'ch_batch',
          refunds: { data: [] },
        }),
      });

      const result = await reconcileAllRecent(100);

      expect(result.total).toBe(5);
      expect(result.ok).toBe(5);
      expect(result.reconciled).toBe(0);
      expect(result.errors).toBe(0);

      // All payments should have lastReconciledAt updated
      const reconciledCount = mockData.payments.filter(
        p => p.lastReconciledAt !== null
      ).length;
      expect(reconciledCount).toBe(5);
    });
  });

  // ============================================
  // E2E: IDEMPOTENCY VERIFICATION
  // ============================================

  describe('Idempotency Verification', () => {
    test('E2E: Duplicate webhook events are handled idempotently', async () => {
      mockData.payments.push({
        id: 'pay_idem',
        paymentIntentId: 'pi_idem',
        chargeId: null,
        shipperId: testShipperId,
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
        id: 'wallet_idem',
        ownerUserId: testShipperId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const event = {
        id: 'evt_idem_duplicate',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_idem',
            amount: 10000,
            currency: 'eur',
            status: 'succeeded',
            latest_charge: 'ch_idem',
            metadata: {},
          },
        },
      };

      // First processing
      const result1 = await dispatchStripeEvent(event);
      expect(result1.success).toBe(true);
      expect(result1.duplicate).toBeUndefined();

      // Second processing (duplicate)
      const result2 = await dispatchStripeEvent(event);
      expect(result2.success).toBe(true);
      expect(result2.duplicate).toBe(true);

      // Verify: Only one wallet transaction
      expect(mockData.walletTransactions.length).toBe(1);
      expect(mockData.wallets[0].balance).toBe(100);
    });

    test('E2E: Duplicate wallet credit operations are idempotent', async () => {
      mockData.wallets.push({
        id: 'wallet_idem_credit',
        ownerUserId: testShipperId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const creditParams = {
        userId: testShipperId,
        amountCents: 5000,
        reference: 'unique_ref_id_123',
      };

      // First credit
      const result1 = await creditWallet(creditParams);
      expect(result1.success).toBe(true);
      expect(result1.duplicate).toBeUndefined();
      expect(result1.walletBalance).toBe(50);

      // Second credit (same reference)
      const result2 = await creditWallet(creditParams);
      expect(result2.success).toBe(true);
      expect(result2.duplicate).toBe(true);

      // Balance should not change
      expect(mockData.wallets[0].balance).toBe(50);
      expect(mockData.walletTransactions.length).toBe(1);
    });
  });

  // ============================================
  // E2E: AUDIT TRAIL COMPLETENESS
  // ============================================

  describe('Audit Trail Completeness', () => {
    test('E2E: Complete audit trail for payment lifecycle', async () => {
      mockData.payments.push({
        id: 'pay_audit',
        paymentIntentId: 'pi_audit',
        chargeId: null,
        shipperId: testShipperId,
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
        id: 'wallet_audit',
        ownerUserId: testShipperId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      // Payment succeeded
      await dispatchStripeEvent({
        id: 'evt_audit_success',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_audit',
            amount: 10000,
            currency: 'eur',
            status: 'succeeded',
            latest_charge: 'ch_audit',
            metadata: {},
          },
        },
      });

      // Refund
      await dispatchStripeEvent({
        id: 'evt_audit_refund',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_audit',
            amount: 10000,
            currency: 'eur',
            refunded: true,
            refunds: {
              data: [{
                id: 're_audit',
                amount: 10000,
                reason: 'requested_by_customer',
                status: 'succeeded',
                created: Math.floor(Date.now() / 1000),
              }],
            },
          },
        },
      });

      // Verify audit events
      const successAudit = mockData.paymentAuditEvents.find(
        e => e.eventType === 'payment_succeeded'
      );
      expect(successAudit).toBeDefined();
      expect(successAudit?.paymentId).toBe('pay_audit');

      const refundAudit = mockData.paymentAuditEvents.find(
        e => e.eventType === 'refund_succeeded'
      );
      expect(refundAudit).toBeDefined();

      // Verify StripeEvent records
      expect(mockData.stripeEvents.length).toBe(2);
      expect(mockData.stripeEvents.every(e => e.processed)).toBe(true);
    });
  });
});
