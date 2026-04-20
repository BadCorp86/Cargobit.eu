/**
 * CargoBit Payment Service
 * 
 * Service for payment-related operations.
 */

import { prisma } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface PaymentResult {
  success: boolean;
  payment?: {
    id: string;
    paymentIntentId: string | null;
    amountCents: number;
    status: PaymentStatus;
  };
  error?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function centsToEuros(cents: number): number {
  return cents / 100;
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

export async function getPaymentByJobId(jobId: string) {
  return prisma.payment.findFirst({
    where: { jobId },
    include: {
      refunds: true,
    },
  });
}

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      refunds: true,
      walletTransactions: true,
    },
  });
}

export async function createPayment(data: {
  jobId: string;
  shipperId: string;
  transporterId?: string;
  amountCents: number;
  currency?: string;
  description?: string;
}): Promise<PaymentResult> {
  try {
    const platformFeeCents = Math.round(data.amountCents * 0.035); // 3.5%
    
    const payment = await prisma.payment.create({
      data: {
        jobId: data.jobId,
        shipperId: data.shipperId,
        transporterId: data.transporterId,
        amountCents: data.amountCents,
        currency: data.currency || 'EUR',
        platformFeeCents,
        transporterAmountCents: data.amountCents - platformFeeCents,
        status: PaymentStatus.PENDING,
        description: data.description,
      },
    });

    return {
      success: true,
      payment: {
        id: payment.id,
        paymentIntentId: payment.paymentIntentId,
        amountCents: payment.amountCents,
        status: payment.status,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create payment',
    };
  }
}

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  stripeData?: { paymentIntentId?: string; chargeId?: string }
): Promise<PaymentResult> {
  try {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        paymentIntentId: stripeData?.paymentIntentId,
        chargeId: stripeData?.chargeId,
        paidAt: status === PaymentStatus.SUCCEEDED ? new Date() : undefined,
      },
    });

    return {
      success: true,
      payment: {
        id: payment.id,
        paymentIntentId: payment.paymentIntentId,
        amountCents: payment.amountCents,
        status: payment.status,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update payment',
    };
  }
}
