/**
 * CargoBit Refund Reconciliation Service
 * 
 * Handles reconciliation between Stripe refund state and local database.
 * 
 * Features:
 * - Single payment reconciliation with Stripe API
 * - Batch reconciliation for recent payments
 * - Partial refund tracking via StripeRefund table
 * - Wallet reversal for applied refunds
 * - Audit trail for all reconciliation actions
 * - Idempotent processing
 */

import { prisma } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';
import { reverseCredit, getWalletBalance } from './wallet.service';

// ============================================
// TYPES
// ============================================

export interface ReconciliationResult {
  status: 'ok' | 'reconciled' | 'no_charge' | 'error' | 'discrepancy';
  paymentId: string;
  oldRefundedCents?: number;
  newRefundedCents?: number;
  appliedRefunds?: StripeRefundData[];
  error?: string;
}

export interface StripeRefundData {
  id: string;
  amount: number;
  status: string;
  reason: string | null;
  created: number;
}

export interface BatchReconciliationResult {
  total: number;
  reconciled: number;
  ok: number;
  errors: number;
  results: Array<{
    paymentId: string;
    status: string;
    error?: string;
  }>;
}

// ============================================
// CONFIGURATION
// ============================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_API_BASE = 'https://api.stripe.com/v1';

// ============================================
// STRIPE API HELPERS
// ============================================

/**
 * Retrieve charge from Stripe API
 */
async function retrieveCharge(chargeId: string): Promise<{
  data?: {
    id: string;
    refunds?: {
      data: StripeRefundData[];
    };
  };
  error?: string;
}> {
  if (!STRIPE_SECRET_KEY) {
    // Development mode - return mock data
    console.log('[RECONCILE] Simulating Stripe charge retrieval (no API key)');
    return {
      data: {
        id: chargeId,
        refunds: { data: [] },
      },
    };
  }

  try {
    const response = await fetch(`${STRIPE_API_BASE}/charges/${chargeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Stripe-Version': '2023-10-16',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.error?.message || 'Failed to retrieve charge' };
    }

    return { data: await response.json() };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================
// MAIN: RECONCILE SINGLE PAYMENT
// ============================================

/**
 * Reconcile a single payment with Stripe state.
 * 
 * Flow:
 * 1. Fetch payment from DB
 * 2. Retrieve charge from Stripe
 * 3. Compare Stripe refunds with local state
 * 4. Apply missing refunds transactionally
 * 5. Update payment status and refunded amount
 * 6. Create audit events
 */
export async function reconcilePayment(paymentId: string): Promise<ReconciliationResult> {
  console.log('[RECONCILE] Starting reconciliation for payment:', paymentId);

  try {
    // 1. Fetch payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        stripeRefunds: true,
      },
    });

    if (!payment) {
      return {
        status: 'error',
        paymentId,
        error: 'Payment not found',
      };
    }

    // 2. Check if payment has charge ID
    if (!payment.chargeId) {
      await recordReconciliationAudit(payment.id, 'reconcile.no_charge', {
        message: 'Payment has no charge ID',
      });

      return {
        status: 'no_charge',
        paymentId: payment.id,
      };
    }

    // 3. Retrieve charge from Stripe
    const chargeResult = await retrieveCharge(payment.chargeId);

    if (chargeResult.error || !chargeResult.data) {
      await recordReconciliationAudit(payment.id, 'reconcile.stripe_error', {
        error: chargeResult.error,
        charge_id: payment.chargeId,
      });

      return {
        status: 'error',
        paymentId: payment.id,
        error: chargeResult.error || 'Failed to retrieve charge from Stripe',
      };
    }

    const stripeRefunds: StripeRefundData[] = chargeResult.data.refunds?.data || [];
    const stripeRefundedCents = stripeRefunds.reduce((sum, r) => sum + r.amount, 0);

    // 4. Get local refunded amount
    const localRefundedCents = payment.refundedCents;

    console.log('[RECONCILE] Comparison:', {
      paymentId: payment.id,
      stripeRefundedCents,
      localRefundedCents,
      stripeRefundCount: stripeRefunds.length,
    });

    // 5. Check if already in sync
    if (localRefundedCents === stripeRefundedCents) {
      // Update reconciliation timestamp
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          lastReconciledAt: new Date(),
          stripeRefundsJson: JSON.stringify(stripeRefunds),
        },
      });

      await recordReconciliationAudit(payment.id, 'reconcile.no_diff', {
        refunded_cents: localRefundedCents,
      });

      return {
        status: 'ok',
        paymentId: payment.id,
        oldRefundedCents: localRefundedCents,
        newRefundedCents: stripeRefundedCents,
      };
    }

    // 6. Apply reconciliation in transaction
    const appliedRefunds: StripeRefundData[] = [];

    await prisma.$transaction(async (tx) => {
      // Re-read payment with lock
      const lockedPayment = await tx.payment.findUnique({
        where: { id: payment.id },
        include: { stripeRefunds: true },
      });

      if (!lockedPayment) throw new Error('Payment disappeared');

      // Get existing Stripe refund IDs
      const existingStripeRefundIds = new Set(
        lockedPayment.stripeRefunds.map(sr => sr.stripeRefundId)
      );

      // Apply new refunds from Stripe
      for (const refund of stripeRefunds) {
        if (!existingStripeRefundIds.has(refund.id)) {
          // Create StripeRefund record
          await tx.stripeRefund.create({
            data: {
              stripeRefundId: refund.id,
              paymentId: lockedPayment.id,
              amountCents: refund.amount,
              reason: refund.reason,
              status: refund.status,
              stripeCreatedAt: new Date(refund.created * 1000),
            },
          });

          // Create wallet reversal transaction
          await tx.walletTransaction.create({
            data: {
              walletId: (await getWalletForUser(lockedPayment.shipperId))?.id || '',
              type: 'REFUND',
              amount: -refund.amount / 100, // Negative for reversal
              currency: lockedPayment.currency,
              paymentId: lockedPayment.id,
              relatedTransportId: lockedPayment.jobId || undefined,
              description: `Rückerstattung via Reconciliation - Stripe Refund ${refund.id}`,
              reference: `refund_${refund.id}`,
              processedAt: new Date(),
            },
          });

          // Update wallet balance
          await tx.wallet.update({
            where: { ownerUserId: lockedPayment.shipperId },
            data: {
              balance: { decrement: refund.amount / 100 },
            },
          });

          appliedRefunds.push(refund);
        }
      }

      // Determine new payment status
      let newStatus = lockedPayment.status;
      if (stripeRefundedCents >= lockedPayment.amountCents) {
        newStatus = PaymentStatus.REFUNDED;
      } else if (stripeRefundedCents > 0) {
        newStatus = PaymentStatus.PARTIALLY_REFUNDED;
      }

      // Update payment
      await tx.payment.update({
        where: { id: lockedPayment.id },
        data: {
          refundedCents: stripeRefundedCents,
          status: newStatus,
          lastReconciledAt: new Date(),
          stripeRefundsJson: JSON.stringify(stripeRefunds),
        },
      });

      // Create audit event
      await tx.paymentAuditEvent.create({
        data: {
          paymentId: lockedPayment.id,
          eventType: 'reconcile.applied',
          oldStatus: lockedPayment.status,
          newStatus: newStatus,
          metadata: JSON.stringify({
            old_refunded_cents: localRefundedCents,
            new_refunded_cents: stripeRefundedCents,
            applied_refunds: appliedRefunds.map(r => ({
              id: r.id,
              amount: r.amount,
            })),
          }),
        },
      });
    });

    console.log('[RECONCILE] Reconciliation applied:', {
      paymentId: payment.id,
      oldRefundedCents: localRefundedCents,
      newRefundedCents: stripeRefundedCents,
      appliedCount: appliedRefunds.length,
    });

    // Create notification for shipper if refunds were applied
    if (appliedRefunds.length > 0) {
      const totalApplied = appliedRefunds.reduce((sum, r) => sum + r.amount, 0);
      await prisma.notification.create({
        data: {
          userId: payment.shipperId,
          type: 'REFUND_APPLIED',
          title: 'Rückerstattung verarbeitet',
          message: `Eine Rückerstattung über ${(totalApplied / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} wurde verarbeitet.`,
          data: JSON.stringify({
            paymentId: payment.id,
            amountCents: totalApplied,
          }),
        },
      }).catch(err => console.error('[RECONCILE] Failed to create notification:', err));
    }

    return {
      status: 'reconciled',
      paymentId: payment.id,
      oldRefundedCents: localRefundedCents,
      newRefundedCents: stripeRefundedCents,
      appliedRefunds,
    };
  } catch (error: any) {
    console.error('[RECONCILE] Error:', error);

    await recordReconciliationAudit(paymentId, 'reconcile.error', {
      error: error.message,
    });

    return {
      status: 'error',
      paymentId,
      error: error.message,
    };
  }
}

// ============================================
// BATCH RECONCILIATION
// ============================================

/**
 * Reconcile all recent payments that may have refunds.
 * 
 * @param limit - Maximum number of payments to process
 * @returns Summary of reconciliation results
 */
export async function reconcileAllRecent(limit = 100): Promise<BatchReconciliationResult> {
  console.log('[RECONCILE] Starting batch reconciliation, limit:', limit);

  const results: BatchReconciliationResult = {
    total: 0,
    reconciled: 0,
    ok: 0,
    errors: 0,
    results: [],
  };

  try {
    // Get payments that could have refunds
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { status: PaymentStatus.SUCCEEDED },
          { status: PaymentStatus.PARTIALLY_REFUNDED },
          { status: PaymentStatus.REFUNDED },
        ],
        chargeId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    results.total = payments.length;

    for (const payment of payments) {
      try {
        const result = await reconcilePayment(payment.id);

        results.results.push({
          paymentId: payment.id,
          status: result.status,
          error: result.error,
        });

        if (result.status === 'reconciled') {
          results.reconciled++;
        } else if (result.status === 'ok' || result.status === 'no_charge') {
          results.ok++;
        } else {
          results.errors++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err: any) {
        results.errors++;
        results.results.push({
          paymentId: payment.id,
          status: 'error',
          error: err.message,
        });
      }
    }

    console.log('[RECONCILE] Batch complete:', {
      total: results.total,
      reconciled: results.reconciled,
      ok: results.ok,
      errors: results.errors,
    });

    return results;
  } catch (error: any) {
    console.error('[RECONCILE] Batch error:', error);
    return {
      ...results,
      errors: results.errors + 1,
    };
  }
}

// ============================================
// DISCREPANCY DETECTION
// ============================================

/**
 * Find payments with potential discrepancies.
 * Returns payments where local refunded_cents may not match Stripe.
 */
export async function findDiscrepancies(limit = 50): Promise<Array<{
  paymentId: string;
  localRefundedCents: number;
  chargeId: string | null;
  lastReconciledAt: Date | null;
}>> {
  // Find payments that haven't been reconciled recently
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        { status: PaymentStatus.SUCCEEDED },
        { status: PaymentStatus.PARTIALLY_REFUNDED },
      ],
      chargeId: { not: null },
      OR: [
        { lastReconciledAt: null },
        { lastReconciledAt: { lt: oneHourAgo } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      refundedCents: true,
      chargeId: true,
      lastReconciledAt: true,
    },
  });

  return payments.map(p => ({
    paymentId: p.id,
    localRefundedCents: p.refundedCents,
    chargeId: p.chargeId,
    lastReconciledAt: p.lastReconciledAt,
  }));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function recordReconciliationAudit(
  paymentId: string,
  eventType: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    await prisma.paymentAuditEvent.create({
      data: {
        paymentId,
        eventType,
        newStatus: eventType.includes('error') ? 'ERROR' : 'OK',
        metadata: JSON.stringify(metadata),
      },
    });
  } catch (err) {
    console.error('[RECONCILE] Failed to record audit:', err);
  }
}

async function getWalletForUser(userId: string) {
  return prisma.wallet.findFirst({
    where: { ownerUserId: userId },
  });
}

// ============================================
// RECONCILIATION STATS
// ============================================

export async function getReconciliationStats(): Promise<{
  totalPayments: number;
  succeededPayments: number;
  refundedPayments: number;
  partialRefundedPayments: number;
  lastReconciliationRun: Date | null;
  pendingReconciliation: number;
}> {
  const [total, succeeded, refunded, partial, recentRun, pending] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.count({ where: { status: PaymentStatus.SUCCEEDED } }),
    prisma.payment.count({ where: { status: PaymentStatus.REFUNDED } }),
    prisma.payment.count({ where: { status: PaymentStatus.PARTIALLY_REFUNDED } }),
    prisma.payment.findFirst({
      where: { lastReconciledAt: { not: null } },
      orderBy: { lastReconciledAt: 'desc' },
      select: { lastReconciledAt: true },
    }),
    prisma.payment.count({
      where: {
        OR: [{ status: PaymentStatus.SUCCEEDED }, { status: PaymentStatus.PARTIALLY_REFUNDED }],
        lastReconciledAt: null,
      },
    }),
  ]);

  return {
    totalPayments: total,
    succeededPayments: succeeded,
    refundedPayments: refunded,
    partialRefundedPayments: partial,
    lastReconciliationRun: recentRun?.lastReconciledAt || null,
    pendingReconciliation: pending,
  };
}
