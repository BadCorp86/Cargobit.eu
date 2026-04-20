/**
 * CargoBit Refund Service
 * 
 * Service for refund-related operations.
 */

import { prisma } from '@/lib/db';
import { PaymentStatus, RefundStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export type RefundType = 'full' | 'partial';

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface RefundCalculation {
  shipperRefundCents: number;
  platformFeeRefundCents: number;
  transporterDebitCents: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function calculateRefundAmounts(
  totalAmountCents: number,
  platformFeeCents: number,
  refundAmountCents: number,
  type: RefundType
): RefundCalculation {
  const shipperRefundCents = refundAmountCents;
  
  // Proportional platform fee refund
  const platformFeeRefundCents = type === 'full'
    ? platformFeeCents
    : Math.round((refundAmountCents / totalAmountCents) * platformFeeCents);
  
  // Transporter gets debited proportionally
  const transporterDebitCents = refundAmountCents - platformFeeRefundCents;

  return {
    shipperRefundCents,
    platformFeeRefundCents,
    transporterDebitCents,
  };
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

export async function processRefund(data: {
  jobId: string;
  type: RefundType;
  amountEur?: number | null;
  reason: string;
  initiatedBy: string;
}): Promise<RefundResult> {
  try {
    // Get payment for the job
    const payment = await prisma.payment.findFirst({
      where: { jobId: data.jobId, status: PaymentStatus.SUCCEEDED },
    });

    if (!payment) {
      return { success: false, error: 'No successful payment found for this job' };
    }

    // Calculate refund amount
    let refundAmountCents: number;
    if (data.type === 'full') {
      refundAmountCents = payment.amountCents;
    } else if (data.amountEur) {
      refundAmountCents = Math.round(data.amountEur * 100);
    } else {
      return { success: false, error: 'Amount is required for partial refunds' };
    }

    // Check if refund is valid
    const existingRefunds = await prisma.refund.aggregate({
      where: { paymentId: payment.id, status: RefundStatus.SUCCEEDED },
      _sum: { amountCents: true },
    });
    
    const alreadyRefunded = existingRefunds._sum.amountCents || 0;
    const refundableAmount = payment.amountCents - alreadyRefunded;

    if (refundAmountCents > refundableAmount) {
      return { 
        success: false, 
        error: `Refund amount exceeds refundable amount: ${refundableAmount / 100} EUR` 
      };
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        amountCents: refundAmountCents,
        reason: data.reason,
        status: RefundStatus.PENDING,
        initiatedBy: data.initiatedBy,
      },
    });

    // Update payment status
    const newStatus = refundAmountCents === refundableAmount 
      ? PaymentStatus.REFUNDED 
      : PaymentStatus.PARTIALLY_REFUNDED;

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: newStatus },
    });

    // Create audit event
    await prisma.paymentAuditEvent.create({
      data: {
        paymentId: payment.id,
        eventType: 'refund_initiated',
        oldStatus: PaymentStatus.SUCCEEDED,
        newStatus: newStatus,
        adminId: data.initiatedBy,
        metadata: JSON.stringify({
          refundId: refund.id,
          amountCents: refundAmountCents,
          reason: data.reason,
        }),
      },
    });

    return {
      success: true,
      refundId: refund.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to process refund',
    };
  }
}
