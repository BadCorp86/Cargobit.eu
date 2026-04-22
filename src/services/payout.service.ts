/**
 * CargoBit Payout Service
 * 
 * Handles payout creation, processing, and management.
 * Integrates with Stripe Connect for transfers and wallet for fund reservation.
 * 
 * Flow:
 * 1. Create payout → Reserve funds in wallet
 * 2. Process payout → Stripe transfer
 * 3. On success → Mark paid
 * 4. On failure → Reverse wallet debit
 * 
 * All operations are idempotent and include audit trail.
 */

import { prisma } from '@/lib/db';
import { PayoutStatus, TransactionType } from '@prisma/client';
import {
  PayoutCreateDto,
  PayoutSummaryDto,
  PayoutDetailDto,
  PayoutListQueryDto,
  PayoutListResultDto,
  PayoutCreateResultDto,
  PayoutRetryResultDto,
  toPayoutSummaryDto,
  toPayoutDetailDto,
} from '@/dto/payout.dto';
import { getOrCreateWallet, getWalletBalance, centsToEuros } from './wallet.service';

// ============================================
// TYPES
// ============================================

interface StripeTransferResult {
  success: boolean;
  transferId?: string;
  error?: string;
}

// ============================================
// CONSTANTS
// ============================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const DEFAULT_STRIPE_ACCOUNT = process.env.DEFAULT_STRIPE_ACCOUNT_ID || '';

// ============================================
// HELPER: GET STRIPE ACCOUNT FOR USER
// ============================================

/**
 * Get the Stripe Connect account ID for a user.
 * In production, this should query the users table for stripe_account_id.
 */
async function getStripeAccountForUser(userId: string): Promise<string | null> {
  // TODO: Implement actual lookup from users table
  // Example: const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeAccountId: true } });
  // return user?.stripeAccountId;
  
  console.log('[PAYOUT] Looking up Stripe account for user:', userId);
  
  // For now, return the default platform account
  // In production, each transporter should have their own connected Stripe account
  return DEFAULT_STRIPE_ACCOUNT || null;
}

// ============================================
// HELPER: CREATE STRIPE TRANSFER
// ============================================

/**
 * Create a Stripe transfer to a connected account.
 * This is a placeholder - in production, use the Stripe SDK.
 */
async function createStripeTransfer(
  amountCents: number,
  currency: string,
  destinationAccountId: string,
  payoutId: string,
  userId: string,
  idempotencyKey: string
): Promise<StripeTransferResult> {
  console.log('[PAYOUT] Creating Stripe transfer:', {
    amountCents,
    currency,
    destinationAccountId,
    payoutId,
    idempotencyKey,
  });

  // Production implementation would be:
  // const stripe = require('stripe')(STRIPE_SECRET_KEY);
  // const transfer = await stripe.transfers.create({
  //   amount: amountCents,
  //   currency: currency.toLowerCase(),
  //   destination: destinationAccountId,
  //   metadata: { payout_id: payoutId, user_id: userId },
  // }, { idempotencyKey });

  // For development/testing, simulate a successful transfer
  if (!STRIPE_SECRET_KEY) {
    console.log('[PAYOUT] No Stripe key configured, simulating transfer');
    return {
      success: true,
      transferId: `tr_simulated_${payoutId}_${Date.now()}`,
    };
  }

  try {
    // Dynamic import for Stripe (only when key is available)
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });
    
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      destination: destinationAccountId,
      metadata: { payout_id: payoutId, user_id: userId },
    }, { idempotencyKey });

    console.log('[PAYOUT] Stripe transfer created:', transfer.id);
    return {
      success: true,
      transferId: transfer.id,
    };
  } catch (error: any) {
    console.error('[PAYOUT] Stripe transfer failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown Stripe error',
    };
  }
}

// ============================================
// HELPER: CREATE AUDIT EVENT
// ============================================

async function createAuditEvent(
  payoutId: string,
  eventType: string,
  oldStatus: PayoutStatus | null,
  newStatus: PayoutStatus,
  adminId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.payoutAuditEvent.create({
    data: {
      payoutId,
      eventType,
      oldStatus,
      newStatus,
      adminId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

// ============================================
// SERVICE: CREATE PAYOUT
// ============================================

/**
 * Create a new payout with wallet reservation.
 * 
 * Flow:
 * 1. Check idempotency - return existing if duplicate
 * 2. Check wallet balance
 * 3. Create payout record (PENDING)
 * 4. Debit wallet
 * 5. Create Stripe transfer
 * 6. Update status (PROCESSING/FAILED)
 * 7. On failure, reverse wallet debit
 */
export async function createPayout(
  dto: PayoutCreateDto,
  adminId: string
): Promise<PayoutCreateResultDto> {
  const { userId, amountCents, currency = 'EUR', idempotencyKey, description } = dto;

  console.log('[PAYOUT] Creating payout:', {
    userId,
    amountCents,
    currency,
    idempotencyKey,
    adminId,
  });

  try {
    // 1. Check idempotency
    if (idempotencyKey) {
      const existing = await prisma.payout.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        console.log('[PAYOUT] Duplicate payout by idempotency key:', idempotencyKey);
        return {
          success: true,
          payout: toPayoutSummaryDto(existing),
          duplicate: true,
        };
      }
    }

    // 2. Check wallet balance
    const balance = await getWalletBalance(userId);
    if (balance < centsToEuros(amountCents)) {
      return {
        success: false,
        error: 'Insufficient wallet balance',
      };
    }

    // 3. Get Stripe account for destination
    const stripeAccountId = await getStripeAccountForUser(userId);
    if (!stripeAccountId) {
      return {
        success: false,
        error: 'No Stripe account configured for user',
      };
    }

    // 4. Create payout in transaction with wallet debit
    const payout = await prisma.$transaction(async (tx) => {
      // Create payout record
      const newPayout = await tx.payout.create({
        data: {
          userId,
          amountCents,
          currency,
          status: PayoutStatus.PENDING,
          idempotencyKey,
          stripeAccountId,
          initiatedBy: adminId,
        },
      });

      // Get or create wallet
      const wallet = await getOrCreateWallet(userId);

      // Debit wallet
      const walletTx = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.PAYOUT,
          amount: -centsToEuros(amountCents), // Negative for debit
          currency,
          reference: `payout_${newPayout.id}`,
          description: description || `Auszahlung angefordert`,
          processedAt: new Date(),
        },
      });

      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: centsToEuros(amountCents) },
          totalWithdrawn: { increment: centsToEuros(amountCents) },
        },
      });

      // Link wallet transaction to payout
      await tx.payout.update({
        where: { id: newPayout.id },
        data: { walletTransactionId: walletTx.id },
      });

      // Create audit event
      await tx.payoutAuditEvent.create({
        data: {
          payoutId: newPayout.id,
          eventType: 'created',
          oldStatus: null,
          newStatus: PayoutStatus.PENDING,
          adminId,
          metadata: JSON.stringify({ amountCents, currency }),
        },
      });

      return newPayout;
    });

    console.log('[PAYOUT] Payout created:', payout.id);

    // 5. Create Stripe transfer (outside DB transaction for resilience)
    const stripeIdempotencyKey = `payout_${payout.id}_${Date.now()}`;
    const transferResult = await createStripeTransfer(
      amountCents,
      currency,
      stripeAccountId,
      payout.id,
      userId,
      stripeIdempotencyKey
    );

    // 6. Update payout status based on transfer result
    if (transferResult.success && transferResult.transferId) {
      const updatedPayout = await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.PROCESSING,
          stripeTransferId: transferResult.transferId,
          processedBy: adminId,
          processedAt: new Date(),
        },
      });

      await createAuditEvent(
        payout.id,
        'processing',
        PayoutStatus.PENDING,
        PayoutStatus.PROCESSING,
        adminId,
        { stripeTransferId: transferResult.transferId }
      );

      console.log('[PAYOUT] Payout processing:', updatedPayout.id);

      return {
        success: true,
        payout: toPayoutSummaryDto(updatedPayout),
      };
    } else {
      // 7. Transfer failed - reverse wallet debit and mark as failed
      console.error('[PAYOUT] Stripe transfer failed, reversing:', transferResult.error);

      await prisma.$transaction(async (tx) => {
        // Update payout status
        await tx.payout.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.FAILED,
            failureReason: transferResult.error,
            failedAt: new Date(),
          },
        });

        // Reverse wallet debit (credit back)
        const wallet = await getOrCreateWallet(userId);
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: TransactionType.REFUND,
            amount: centsToEuros(amountCents), // Positive for credit
            currency,
            reference: `payout_reversal_${payout.id}`,
            description: `Auszahlung fehlgeschlagen - Rückbuchung`,
            processedAt: new Date(),
          },
        });

        // Update wallet balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: centsToEuros(amountCents) },
            totalWithdrawn: { decrement: centsToEuros(amountCents) },
          },
        });

        // Create audit event
        await tx.payoutAuditEvent.create({
          data: {
            payoutId: payout.id,
            eventType: 'failed',
            oldStatus: PayoutStatus.PENDING,
            newStatus: PayoutStatus.FAILED,
            adminId,
            metadata: JSON.stringify({ error: transferResult.error }),
          },
        });
      });

      return {
        success: false,
        error: `Stripe transfer failed: ${transferResult.error}`,
      };
    }
  } catch (error: any) {
    console.error('[PAYOUT] Error creating payout:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payout',
    };
  }
}

// ============================================
// SERVICE: LIST PAYOUTS
// ============================================

/**
 * List payouts with optional filters.
 */
export async function listPayouts(query: PayoutListQueryDto): Promise<PayoutListResultDto> {
  const { status, userId, limit = 100, offset = 0, order = 'desc' } = query;

  console.log('[PAYOUT] Listing payouts:', { status, userId, limit, offset, order });

  const where: any = {};
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      orderBy: { createdAt: order },
      take: limit,
      skip: offset,
    }),
    prisma.payout.count({ where }),
  ]);

  return {
    payouts: payouts.map(toPayoutSummaryDto),
    total,
    limit,
    offset,
  };
}

// ============================================
// SERVICE: GET PAYOUT DETAIL
// ============================================

/**
 * Get detailed payout information including wallet transactions and audit trail.
 */
export async function getPayout(payoutId: string): Promise<PayoutDetailDto | null> {
  console.log('[PAYOUT] Getting payout detail:', payoutId);

  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: {
      auditEvents: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!payout) {
    return null;
  }

  // Get related wallet transactions
  let walletTransactions: any[] = [];
  if (payout.walletTransactionId) {
    walletTransactions = await prisma.walletTransaction.findMany({
      where: {
        OR: [
          { id: payout.walletTransactionId },
          { reference: `payout_${payout.id}` },
          { reference: `payout_reversal_${payout.id}` },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  return toPayoutDetailDto(payout, walletTransactions);
}

// ============================================
// SERVICE: RETRY PAYOUT
// ============================================

/**
 * Retry a failed payout.
 * Only payouts in FAILED status can be retried.
 */
export async function retryPayout(
  payoutId: string,
  adminId: string
): Promise<PayoutRetryResultDto> {
  console.log('[PAYOUT] Retrying payout:', { payoutId, adminId });

  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    return {
      success: false,
      error: 'Payout not found',
    };
  }

  if (payout.status !== PayoutStatus.FAILED) {
    return {
      success: false,
      error: 'Only failed payouts can be retried',
    };
  }

  // Create new payout with same parameters
  const retryIdempotencyKey = payout.idempotencyKey || `retry_${payout.id}_${Date.now()}`;

  const result = await createPayout(
    {
      userId: payout.userId,
      amountCents: payout.amountCents,
      currency: payout.currency,
      idempotencyKey: retryIdempotencyKey,
      description: `Retry of payout ${payout.id}`,
    },
    adminId
  );

  if (result.success && result.payout) {
    // Create audit event for retry
    await createAuditEvent(
      payout.id,
      'retried',
      PayoutStatus.FAILED,
      PayoutStatus.FAILED, // Original stays failed
      adminId,
      { newPayoutId: result.payout.id }
    );

    return {
      success: true,
      payout: result.payout,
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

// ============================================
// SERVICE: CANCEL PAYOUT
// ============================================

/**
 * Cancel a pending payout.
 * Only payouts in PENDING status can be cancelled.
 */
export async function cancelPayout(
  payoutId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[PAYOUT] Cancelling payout:', { payoutId, adminId });

  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    return { success: false, error: 'Payout not found' };
  }

  if (payout.status !== PayoutStatus.PENDING) {
    return { success: false, error: 'Only pending payouts can be cancelled' };
  }

  // Cancel and reverse wallet debit
  await prisma.$transaction(async (tx) => {
    // Update payout status
    await tx.payout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    // Reverse wallet debit if exists
    if (payout.walletTransactionId) {
      const wallet = await getOrCreateWallet(payout.userId);
      
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.REFUND,
          amount: centsToEuros(payout.amountCents),
          currency: payout.currency,
          reference: `payout_cancel_${payoutId}`,
          description: 'Auszahlung storniert - Rückbuchung',
          processedAt: new Date(),
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: centsToEuros(payout.amountCents) },
          totalWithdrawn: { decrement: centsToEuros(payout.amountCents) },
        },
      });
    }

    // Create audit event
    await tx.payoutAuditEvent.create({
      data: {
        payoutId,
        eventType: 'cancelled',
        oldStatus: PayoutStatus.PENDING,
        newStatus: PayoutStatus.CANCELLED,
        adminId,
      },
    });
  });

  return { success: true };
}

// ============================================
// SERVICE: MARK PAYOUT AS PAID (Webhook)
// ============================================

/**
 * Mark a payout as paid.
 * Called by Stripe webhook when transfer.paid event is received.
 */
export async function markPayoutPaid(
  stripeTransferId: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  console.log('[PAYOUT] Marking payout paid:', stripeTransferId);

  const payout = await prisma.payout.findUnique({
    where: { stripeTransferId },
  });

  if (!payout) {
    return { success: false, error: 'Payout not found for transfer ID' };
  }

  if (payout.status === PayoutStatus.PAID) {
    return { success: true }; // Already paid, idempotent
  }

  await prisma.payout.update({
    where: { id: payout.id },
    data: {
      status: PayoutStatus.PAID,
      processedAt: new Date(),
    },
  });

  await createAuditEvent(
    payout.id,
    'paid',
    payout.status,
    PayoutStatus.PAID,
    undefined,
    metadata
  );

  return { success: true };
}

// ============================================
// SERVICE: MARK PAYOUT FAILED (Webhook)
// ============================================

/**
 * Mark a payout as failed.
 * Called by Stripe webhook when transfer.failed event is received.
 */
export async function markPayoutFailed(
  stripeTransferId: string,
  failureReason: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  console.log('[PAYOUT] Marking payout failed:', { stripeTransferId, failureReason });

  const payout = await prisma.payout.findUnique({
    where: { stripeTransferId },
  });

  if (!payout) {
    return { success: false, error: 'Payout not found for transfer ID' };
  }

  if (payout.status === PayoutStatus.FAILED) {
    return { success: true }; // Already failed, idempotent
  }

  // Mark as failed and reverse wallet
  await prisma.$transaction(async (tx) => {
    await tx.payout.update({
      where: { id: payout.id },
      data: {
        status: PayoutStatus.FAILED,
        failureReason,
        failedAt: new Date(),
      },
    });

    // Reverse wallet if not already reversed
    if (payout.status !== PayoutStatus.FAILED) {
      const wallet = await getOrCreateWallet(payout.userId);
      
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.REFUND,
          amount: centsToEuros(payout.amountCents),
          currency: payout.currency,
          reference: `payout_failed_${payout.id}`,
          description: `Auszahlung fehlgeschlagen - Rückbuchung: ${failureReason}`,
          processedAt: new Date(),
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: centsToEuros(payout.amountCents) },
          totalWithdrawn: { decrement: centsToEuros(payout.amountCents) },
        },
      });
    }

    await tx.payoutAuditEvent.create({
      data: {
        payoutId: payout.id,
        eventType: 'failed',
        oldStatus: payout.status,
        newStatus: PayoutStatus.FAILED,
        metadata: JSON.stringify({ failureReason, ...metadata }),
      },
    });
  });

  return { success: true };
}
