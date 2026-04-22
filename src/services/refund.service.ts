/**
 * CargoBit Refund Service
 * 
 * Service for refund-related operations with Stripe integration.
 * 
 * Features:
 * - Full and partial refunds
 * - Stripe API integration with idempotency
 * - Payment status updates
 * - Wallet sync via webhook (charge.refunded)
 */

import { prisma } from '@/lib/db';
import { PaymentStatus, RefundStatus } from '@prisma/client';
import * as crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export type RefundType = 'full' | 'partial' | 'platform_fee_only';

export interface RefundResult {
  success: boolean;
  refundId?: string;
  stripeRefundId?: string;
  amountCents?: number;
  amountEur?: number;
  currency?: string;
  status?: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  error?: string;
}

export interface RefundCalculation {
  totalPaidCents: number;
  platformFeeCents: number;
  transporterAmountCents: number;
  alreadyRefundedCents: number;
  maxRefundableCents: number;
  shipperRefundCents: number;
  platformFeeRefundCents: number;
  transporterDebitCents: number;
}

export interface ProcessRefundInput {
  jobId: string;
  type: RefundType;
  amountEur?: number | null;
  reason: string;
  initiatedBy: string;
}

// ============================================
// CONFIGURATION
// ============================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// ============================================
// STRIPE CLIENT (Minimal)
// ============================================

/**
 * Create a Stripe refund with idempotency key
 */
async function createStripeRefund(
  chargeId: string,
  amountCents: number,
  metadata: Record<string, string>,
  idempotencyKey: string
): Promise<{ id: string; status: string }> {
  // In production, use the actual Stripe SDK
  // For now, we'll simulate the API call
  
  if (!STRIPE_SECRET_KEY) {
    // Development mode - simulate successful refund
    console.log('[RefundService] Simulating Stripe refund (no API key)');
    return {
      id: `re_sim_${crypto.randomBytes(16).toString('hex')}`,
      status: 'succeeded',
    };
  }

  // Real Stripe API call
  const response = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': idempotencyKey,
      'Stripe-Version': '2023-10-16',
    },
    body: new URLSearchParams({
      charge: chargeId,
      amount: amountCents.toString(),
      metadata: JSON.stringify(metadata),
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Stripe refund failed');
  }

  return response.json();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate idempotency key for refund
 * Format: refund_{paymentId}_{amountCents}
 * This prevents duplicate refunds from:
 * - UI double-clicks
 * - Network retries
 * - Admin page reloads
 */
function generateIdempotencyKey(paymentId: string, amountCents: number): string {
  return `refund_${paymentId}_${amountCents}`;
}

/**
 * Calculate refund breakdown
 */
export function calculateRefundBreakdown(
  totalAmountCents: number,
  platformFeeCents: number,
  refundAmountCents: number,
  type: RefundType
): {
  shipperRefundCents: number;
  platformFeeRefundCents: number;
  transporterDebitCents: number;
} {
  let shipperRefundCents = refundAmountCents;
  let platformFeeRefundCents = 0;
  
  if (type === 'full') {
    // Full refund includes platform fee
    platformFeeRefundCents = platformFeeCents;
  } else if (type === 'platform_fee_only') {
    // Only refund platform fee
    shipperRefundCents = platformFeeCents;
    platformFeeRefundCents = platformFeeCents;
  } else {
    // Partial refund - proportional platform fee refund
    platformFeeRefundCents = Math.round((refundAmountCents / totalAmountCents) * platformFeeCents);
  }
  
  // Transporter gets debited for the refund minus platform fee
  const transporterDebitCents = refundAmountCents - platformFeeRefundCents;

  return {
    shipperRefundCents,
    platformFeeRefundCents,
    transporterDebitCents,
  };
}

// ============================================
// MAIN REFUND FUNCTION
// ============================================

/**
 * Process a refund for a job payment
 * 
 * Workflow:
 * 1. Verify payment exists and is refundable
 * 2. Calculate refund amounts
 * 3. Create Stripe refund with idempotency key
 * 4. Create local refund record
 * 5. Update payment status
 * 6. Create audit log
 * 
 * Note: Wallet corrections happen via Stripe webhook (charge.refunded)
 */
export async function processRefund(data: ProcessRefundInput): Promise<RefundResult> {
  try {
    // ============================================
    // 1. GET PAYMENT
    // ============================================
    
    const payment = await prisma.payment.findFirst({
      where: { 
        jobId: data.jobId, 
        status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED] }
      },
    });

    if (!payment) {
      return { success: false, error: 'No successful payment found for this job' };
    }

    if (!payment.chargeId) {
      return { success: false, error: 'Payment has no Stripe charge ID' };
    }

    // ============================================
    // 2. CALCULATE REFUND AMOUNT
    // ============================================
    
    let refundAmountCents: number;
    
    if (data.type === 'full') {
      // Get already refunded amount
      const existingRefunds = await prisma.refund.aggregate({
        where: { paymentId: payment.id, status: RefundStatus.SUCCEEDED },
        _sum: { amountCents: true },
      });
      const alreadyRefunded = existingRefunds._sum.amountCents || 0;
      refundAmountCents = payment.amountCents - alreadyRefunded;
      
      if (refundAmountCents <= 0) {
        return { success: false, error: 'Payment already fully refunded' };
      }
    } else if (data.type === 'platform_fee_only') {
      refundAmountCents = payment.platformFeeCents || 0;
      if (refundAmountCents <= 0) {
        return { success: false, error: 'No platform fee to refund' };
      }
    } else if (data.type === 'partial') {
      if (!data.amountEur || data.amountEur <= 0) {
        return { success: false, error: 'Amount is required for partial refunds' };
      }
      refundAmountCents = Math.round(data.amountEur * 100);
    } else {
      return { success: false, error: 'Invalid refund type' };
    }

    // ============================================
    // 3. VERIFY REFUNDABLE AMOUNT
    // ============================================
    
    const existingRefunds = await prisma.refund.aggregate({
      where: { paymentId: payment.id, status: { in: [RefundStatus.SUCCEEDED, RefundStatus.PENDING] } },
      _sum: { amountCents: true },
    });
    
    const alreadyRefunded = existingRefunds._sum.amountCents || 0;
    const maxRefundable = payment.amountCents - alreadyRefunded;

    if (refundAmountCents > maxRefundable) {
      return { 
        success: false, 
        error: `Refund amount (${(refundAmountCents/100).toFixed(2)} EUR) exceeds refundable amount (${(maxRefundable/100).toFixed(2)} EUR)` 
      };
    }

    // ============================================
    // 4. CREATE STRIPE REFUND WITH IDEMPOTENCY
    // ============================================
    
    const idempotencyKey = generateIdempotencyKey(payment.id, refundAmountCents);
    
    let stripeRefund: { id: string; status: string };
    
    try {
      stripeRefund = await createStripeRefund(
        payment.chargeId,
        refundAmountCents,
        {
          job_id: data.jobId,
          payment_id: payment.id,
          reason: data.reason.substring(0, 500), // Stripe metadata limit
          initiated_by: data.initiatedBy,
        },
        idempotencyKey
      );
    } catch (stripeError: any) {
      console.error('[RefundService] Stripe error:', stripeError);
      return { 
        success: false, 
        error: `Stripe error: ${stripeError.message}` 
      };
    }

    // ============================================
    // 5. CREATE LOCAL REFUND RECORD
    // ============================================
    
    const refund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        refundId: stripeRefund.id,
        amountCents: refundAmountCents,
        reason: data.reason,
        status: stripeRefund.status === 'succeeded' ? RefundStatus.SUCCEEDED : RefundStatus.PENDING,
        initiatedBy: data.initiatedBy,
        processedAt: stripeRefund.status === 'succeeded' ? new Date() : null,
      },
    });

    // ============================================
    // 6. UPDATE PAYMENT STATUS
    // ============================================
    
    const newTotalRefunded = alreadyRefunded + refundAmountCents;
    let newPaymentStatus: PaymentStatus;
    
    if (newTotalRefunded >= payment.amountCents) {
      newPaymentStatus = PaymentStatus.REFUNDED;
    } else if (newTotalRefunded > 0) {
      newPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
    } else {
      newPaymentStatus = payment.status;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: newPaymentStatus },
    });

    // ============================================
    // 7. CREATE AUDIT EVENT
    // ============================================
    
    await prisma.paymentAuditEvent.create({
      data: {
        paymentId: payment.id,
        eventType: 'refund_created',
        oldStatus: payment.status,
        newStatus: newPaymentStatus,
        adminId: data.initiatedBy,
        metadata: JSON.stringify({
          refundId: refund.id,
          stripeRefundId: stripeRefund.id,
          amountCents: refundAmountCents,
          type: data.type,
          reason: data.reason,
        }),
      },
    });

    return {
      success: true,
      refundId: refund.id,
      stripeRefundId: stripeRefund.id,
      amountCents: refundAmountCents,
      amountEur: refundAmountCents / 100,
      currency: payment.currency,
      status: refund.status,
    };
  } catch (error: any) {
    console.error('[RefundService] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process refund',
    };
  }
}

// ============================================
// REFUND CALCULATION (GET)
// ============================================

/**
 * Calculate refund amounts for a job
 */
export async function getRefundCalculation(jobId: string): Promise<RefundCalculation | null> {
  const payment = await prisma.payment.findFirst({
    where: { jobId, status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED] } },
  });

  if (!payment) {
    return null;
  }

  const existingRefunds = await prisma.refund.aggregate({
    where: { paymentId: payment.id, status: RefundStatus.SUCCEEDED },
    _sum: { amountCents: true },
  });

  const alreadyRefundedCents = existingRefunds._sum.amountCents || 0;
  const maxRefundableCents = payment.amountCents - alreadyRefundedCents;

  const breakdown = calculateRefundBreakdown(
    payment.amountCents,
    payment.platformFeeCents || 0,
    maxRefundableCents,
    'full'
  );

  return {
    totalPaidCents: payment.amountCents,
    platformFeeCents: payment.platformFeeCents || 0,
    transporterAmountCents: payment.transporterAmountCents || 0,
    alreadyRefundedCents,
    maxRefundableCents,
    ...breakdown,
  };
}

// Re-export for backwards compatibility
export { getRefundCalculation as calculateRefundAmounts };
