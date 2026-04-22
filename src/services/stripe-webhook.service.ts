/**
 * CargoBit Stripe Webhook Service
 * 
 * Idempotent webhook processing with:
 * - StripeEvent table for deduplication
 * - Transactional Payment + Job + Wallet updates
 * - Audit trail for all events
 * - Robust error handling and retry strategies
 * 
 * Events handled:
 * - payment_intent.succeeded → Payment success + Wallet credit
 * - payment_intent.payment_failed → Payment failure notification
 * - charge.refunded → Refund processing + Wallet reversal
 */

import { prisma } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';
import { creditWallet, reverseCredit } from './wallet.service';

// ============================================
// TYPES
// ============================================

export interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export interface PaymentIntentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  latest_charge?: string;
  charges?: {
    data: Array<{ id: string }>;
  };
  metadata: Record<string, any>;
}

export interface ChargeData {
  id: string;
  amount: number;
  currency: string;
  refunded: boolean;
  refunds?: {
    data: Array<{
      id: string;
      amount: number;
      reason: string | null;
      status: string;
      created?: number;
    }>;
  };
  payment_intent?: string;
  metadata?: Record<string, any>;
}

export interface WebhookResult {
  success: boolean;
  error?: string;
  duplicate?: boolean;
}

// ============================================
// CONFIGURATION
// ============================================

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
const MAX_ERROR_COUNT = 5;

// ============================================
// IDEMPOTENCY: EVENT TRACKING
// ============================================

/**
 * Check if event has been processed (idempotency check)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const event = await prisma.stripeEvent.findUnique({
    where: { id: eventId },
  });
  return event?.processed ?? false;
}

/**
 * Record event as received (start of processing)
 */
async function recordEventReceived(event: StripeEvent): Promise<void> {
  try {
    await prisma.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
        payload: JSON.stringify(event),
        processed: false,
      },
    });
  } catch (error: any) {
    // Unique constraint violation - event already exists
    if (error.code === 'P2002') {
      console.log('[WEBHOOK] Event already recorded:', event.id);
    } else {
      throw error;
    }
  }
}

/**
 * Mark event as processed (end of processing)
 */
async function markEventProcessed(eventId: string): Promise<void> {
  await prisma.stripeEvent.update({
    where: { id: eventId },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  });
}

/**
 * Record event error (for retry tracking)
 */
async function recordEventError(eventId: string, error: string): Promise<void> {
  await prisma.stripeEvent.update({
    where: { id: eventId },
    data: {
      errorCount: { increment: 1 },
      lastError: error,
    },
  });
}

// ============================================
// AUDIT HELPERS
// ============================================

async function recordAuditEvent(
  eventType: string,
  payload: Record<string, any>
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'stripe_webhook',
      entityId: payload.stripe_event_id || '',
      dataAfter: JSON.stringify({ event_type: eventType, ...payload }),
    },
  }).catch(err => console.error('[WEBHOOK] Failed to record audit:', err));
}

// ============================================
// HANDLER: payment_intent.succeeded
// ============================================

/**
 * Handle payment_intent.succeeded event.
 * Transactionally updates:
 * 1. Payment status → SUCCEEDED
 * 2. Job/Transport status → ASSIGNED
 * 3. Wallet credited with payment amount
 * 4. Audit events recorded
 */
export async function handlePaymentIntentSucceeded(
  pi: PaymentIntentData,
  stripeEventId: string
): Promise<WebhookResult> {
  console.log('[WEBHOOK] Processing payment_intent.succeeded:', {
    paymentIntentId: pi.id,
    amount: pi.amount,
    stripeEventId,
  });

  try {
    // Find payment by PaymentIntent ID
    const payment = await prisma.payment.findFirst({
      where: { paymentIntentId: pi.id },
    });

    if (!payment) {
      // Check if this is a wallet topup (legacy flow)
      if (pi.metadata?.type === 'wallet_topup' && pi.metadata?.userId) {
        const creditResult = await creditWallet({
          userId: pi.metadata.userId,
          amountCents: pi.amount,
          reference: pi.id,
          description: 'Guthaben aufgeladen via Stripe',
        });
        
        await recordAuditEvent('wallet_topup_succeeded', {
          payment_intent_id: pi.id,
          user_id: pi.metadata.userId,
          amount_cents: pi.amount,
          stripe_event_id: stripeEventId,
        });
        
        return { success: creditResult.success };
      }

      // Orphaned payment intent - log and return success (no retry)
      console.warn('[WEBHOOK] Orphaned PaymentIntent:', pi.id);
      await recordAuditEvent('orphaned_payment_intent', {
        payment_intent_id: pi.id,
        amount_cents: pi.amount,
        stripe_event_id: stripeEventId,
      });
      
      return { success: true }; // Return success to prevent retries
    }

    // Check if already processed (idempotency)
    if (payment.status === PaymentStatus.SUCCEEDED) {
      console.log('[WEBHOOK] Payment already succeeded:', payment.id);
      return { success: true, duplicate: true };
    }

    // Extract charge ID
    const chargeId = pi.latest_charge || pi.charges?.data?.[0]?.id;

    // Execute transactional update
    await prisma.$transaction(async (tx) => {
      // 1. Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          chargeId,
          paidAt: new Date(),
        },
      });

      // 2. Update Job/Transport status
      if (payment.jobId) {
        const transport = await tx.transport.findUnique({
          where: { id: payment.jobId! },
        });

        if (transport) {
          await tx.transport.update({
            where: { id: payment.jobId! },
            data: {
              status: 'ASSIGNED',
              assignedAt: new Date(),
            },
          });

          // Create status history
          await tx.transportStatusHistory.create({
            data: {
              transportId: payment.jobId!,
              status: 'ASSIGNED',
              note: 'Payment confirmed - job ready for assignment',
            },
          });
        }
      }

      // 3. Create payment audit event
      await tx.paymentAuditEvent.create({
        data: {
          paymentId: payment.id,
          eventType: 'payment_succeeded',
          oldStatus: payment.status,
          newStatus: 'SUCCEEDED',
          metadata: JSON.stringify({
            payment_intent_id: pi.id,
            charge_id: chargeId,
            amount_cents: pi.amount,
            stripe_event_id: stripeEventId,
          }),
        },
      });
    });

    // 4. Credit wallet (outside main transaction for idempotency)
    const creditResult = await creditWallet({
      userId: payment.shipperId,
      amountCents: payment.amountCents,
      reference: `payment_${payment.id}`,
      paymentId: payment.id,
      transportId: payment.jobId || undefined,
      description: `Zahlung für Job ${payment.jobId || 'N/A'}`,
    });

    console.log('[WEBHOOK] Payment succeeded:', {
      paymentId: payment.id,
      jobId: payment.jobId,
      amountCents: pi.amount,
      walletCredited: creditResult.success,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[WEBHOOK] Error processing payment_intent.succeeded:', error);
    await recordEventError(stripeEventId, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// HANDLER: payment_intent.payment_failed
// ============================================

/**
 * Handle payment_intent.payment_failed event.
 * Updates payment status and notifies shipper.
 */
export async function handlePaymentIntentFailed(
  pi: PaymentIntentData & { last_payment_error?: { message?: string } },
  stripeEventId: string
): Promise<WebhookResult> {
  console.log('[WEBHOOK] Processing payment_intent.payment_failed:', {
    paymentIntentId: pi.id,
    stripeEventId,
  });

  try {
    const payment = await prisma.payment.findFirst({
      where: { paymentIntentId: pi.id },
    });

    if (!payment) {
      console.log('[WEBHOOK] No payment found for failed intent:', pi.id);
      return { success: true }; // No retry needed
    }

    // Check if already processed (idempotency)
    if (payment.status === PaymentStatus.FAILED) {
      return { success: true, duplicate: true };
    }

    // Update payment status
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
        },
      });

      await tx.paymentAuditEvent.create({
        data: {
          paymentId: payment.id,
          eventType: 'payment_failed',
          oldStatus: payment.status,
          newStatus: 'FAILED',
          metadata: JSON.stringify({
            payment_intent_id: pi.id,
            failure_message: pi.last_payment_error?.message,
            stripe_event_id: stripeEventId,
          }),
        },
      });
    });

    // Create notification for shipper
    await prisma.notification.create({
      data: {
        userId: payment.shipperId,
        type: 'PAYMENT_FAILED',
        title: 'Zahlung fehlgeschlagen',
        message: `Ihre Zahlung für Job ${payment.jobId || 'N/A'} konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.`,
        data: JSON.stringify({
          jobId: payment.jobId,
          paymentId: payment.id,
        }),
      },
    }).catch(err => console.error('[WEBHOOK] Failed to create notification:', err));

    console.log('[WEBHOOK] Payment failed:', {
      paymentId: payment.id,
      jobId: payment.jobId,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[WEBHOOK] Error processing payment_intent.payment_failed:', error);
    await recordEventError(stripeEventId, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// HANDLER: charge.refunded
// ============================================

/**
 * Handle charge.refunded event.
 * Transactionally updates:
 * 1. Payment refunded_cents and status
 * 2. Creates/updates Refund record
 * 3. Wallet reversal for refunded amount
 * 4. Audit events recorded
 */
export async function handleChargeRefunded(
  charge: ChargeData,
  stripeEventId: string
): Promise<WebhookResult> {
  console.log('[WEBHOOK] Processing charge.refunded:', {
    chargeId: charge.id,
    stripeEventId,
  });

  try {
    // Find payment by charge ID
    const payment = await prisma.payment.findFirst({
      where: { chargeId: charge.id },
    });

    if (!payment) {
      console.warn('[WEBHOOK] No payment found for charge:', charge.id);
      await recordAuditEvent('orphaned_charge_refund', {
        charge_id: charge.id,
        stripe_event_id: stripeEventId,
      });
      return { success: true }; // No retry needed
    }

    // Calculate total refunded amount from all refunds
    const refunds = charge.refunds?.data || [];
    const totalRefundedCents = refunds.reduce((sum, r) => sum + r.amount, 0);

    // Check if refund already processed (idempotency)
    const existingRefund = await prisma.refund.findFirst({
      where: {
        paymentId: payment.id,
        status: 'SUCCEEDED',
      },
    });

    if (existingRefund && existingRefund.amountCents === totalRefundedCents) {
      console.log('[WEBHOOK] Refund already processed:', existingRefund.id);
      return { success: true, duplicate: true };
    }

    // Determine new payment status
    let newStatus = payment.status;
    if (totalRefundedCents >= payment.amountCents) {
      newStatus = PaymentStatus.REFUNDED;
    } else if (totalRefundedCents > 0) {
      newStatus = PaymentStatus.PARTIALLY_REFUNDED;
    }

    // Execute transactional update
    await prisma.$transaction(async (tx) => {
      // 1. Create/update refund records
      for (const refund of refunds) {
        await tx.refund.upsert({
          where: { refundId: refund.id },
          create: {
            paymentId: payment.id,
            refundId: refund.id,
            amountCents: refund.amount,
            reason: refund.reason || 'Requested by customer',
            status: 'SUCCEEDED',
            initiatedBy: 'system',
            processedAt: new Date(),
          },
          update: {
            status: 'SUCCEEDED',
            processedAt: new Date(),
          },
        });

        // Also create StripeRefund record for reconciliation
        await tx.stripeRefund.upsert({
          where: { stripeRefundId: refund.id },
          create: {
            stripeRefundId: refund.id,
            paymentId: payment.id,
            amountCents: refund.amount,
            reason: refund.reason,
            status: refund.status || 'succeeded',
            stripeCreatedAt: new Date(refund.created * 1000 || Date.now()),
          },
          update: {
            status: refund.status || 'succeeded',
          },
        });
      }

      // 2. Update payment status and refundedCents
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          refundedCents: totalRefundedCents,
          lastReconciledAt: new Date(),
          stripeRefundsJson: JSON.stringify(refunds),
        },
      });

      // 3. Create payment audit event
      await tx.paymentAuditEvent.create({
        data: {
          paymentId: payment.id,
          eventType: 'refund_succeeded',
          oldStatus: payment.status,
          newStatus: newStatus,
          metadata: JSON.stringify({
            charge_id: charge.id,
            total_refunded_cents: totalRefundedCents,
            refunds: refunds.map(r => ({
              id: r.id,
              amount: r.amount,
              reason: r.reason,
            })),
            stripe_event_id: stripeEventId,
          }),
        },
      });
    });

    // 4. Reverse wallet credit (outside main transaction for idempotency)
    if (totalRefundedCents > 0) {
      await reverseCredit({
        userId: payment.shipperId,
        amountCents: totalRefundedCents,
        originalReference: `payment_${payment.id}`,
        paymentId: payment.id,
        transportId: payment.jobId || undefined,
        description: `Rückerstattung für Job ${payment.jobId || 'N/A'}`,
      });
    }

    // Create notification for shipper
    await prisma.notification.create({
      data: {
        userId: payment.shipperId,
        type: 'REFUND_PROCESSED',
        title: 'Rückerstattung verarbeitet',
        message: `Ihre Rückerstattung über ${(totalRefundedCents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} wurde verarbeitet.`,
        data: JSON.stringify({
          paymentId: payment.id,
          amountCents: totalRefundedCents,
        }),
      },
    }).catch(err => console.error('[WEBHOOK] Failed to create notification:', err));

    console.log('[WEBHOOK] Refund processed:', {
      paymentId: payment.id,
      totalRefundedCents,
      newStatus,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[WEBHOOK] Error processing charge.refunded:', error);
    await recordEventError(stripeEventId, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// MAIN: DISPATCH EVENT
// ============================================

/**
 * Main event dispatcher.
 * Routes events to appropriate handlers with idempotency protection.
 */
export async function dispatchStripeEvent(event: StripeEvent): Promise<WebhookResult> {
  console.log('[WEBHOOK] Dispatching event:', event.type, '| ID:', event.id);

  // Check if already processed
  if (await isEventProcessed(event.id)) {
    console.log('[WEBHOOK] Event already processed:', event.id);
    return { success: true, duplicate: true };
  }

  // Record event as received
  await recordEventReceived(event);

  let result: WebhookResult;

  switch (event.type) {
    case 'payment_intent.succeeded':
      result = await handlePaymentIntentSucceeded(event.data.object, event.id);
      break;

    case 'payment_intent.payment_failed':
      result = await handlePaymentIntentFailed(event.data.object, event.id);
      break;

    case 'charge.refunded':
      result = await handleChargeRefunded(event.data.object, event.id);
      break;

    default:
      // Unhandled event type - log and return success
      console.log('[WEBHOOK] Unhandled event type:', event.type);
      await recordAuditEvent('unhandled_event', {
        event_id: event.id,
        event_type: event.type,
      });
      result = { success: true };
  }

  // Mark as processed if successful
  if (result.success) {
    await markEventProcessed(event.id);
  }

  return result;
}
