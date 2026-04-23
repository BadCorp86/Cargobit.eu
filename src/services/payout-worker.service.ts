// ============================================
// CARGOBIT PAYOUT WORKER SERVICE
// Async Stripe Transfer Processing
// ============================================

import { db } from '@/lib/db';
import { PayoutStatus } from '@prisma/client';

// ============================================
// INTERFACES
// ============================================

interface PayoutJob {
  payoutId: string;
  attemptNumber: number;
}

interface PayoutJobResult {
  success: boolean;
  payoutId: string;
  transferId?: string;
  error?: string;
}

// ============================================
// STRIPE MOCK (Replace with real Stripe in production)
// ============================================

const mockStripe = {
  transfers: {
    create: async (params: any, options?: any) => ({
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      amount: params.amount,
      currency: params.currency,
      destination: params.destination,
      metadata: params.metadata,
      created: Math.floor(Date.now() / 1000),
    }),
  },
};

// ============================================
// PAYOUT WORKER
// ============================================

/**
 * Payout Worker Service
 * 
 * In production, this would be backed by BullMQ/Redis.
 * For Next.js, we process synchronously but log attempts.
 * 
 * To enable async processing:
 * 1. Install bullmq: npm install bullmq
 * 2. Set up Redis connection
 * 3. Create a separate worker process
 */

export class PayoutWorkerService {
  private static instance: PayoutWorkerService;
  private processing: Set<string> = new Set();

  private constructor() {}

  static getInstance(): PayoutWorkerService {
    if (!PayoutWorkerService.instance) {
      PayoutWorkerService.instance = new PayoutWorkerService();
    }
    return PayoutWorkerService.instance;
  }

  /**
   * Process a payout job
   */
  async processJob(job: PayoutJob): Promise<PayoutJobResult> {
    const { payoutId } = job;

    // Prevent double processing
    if (this.processing.has(payoutId)) {
      return {
        success: false,
        payoutId,
        error: 'Payout already being processed',
      };
    }

    this.processing.add(payoutId);

    try {
      // Get payout
      const payout = await db.payout.findUnique({
        where: { id: payoutId },
        include: {
          user: {
            include: {
              wallet: true,
            },
          },
        },
      });

      if (!payout) {
        await this.logAttempt(payoutId, 'failed', null, 'Payout not found');
        return { success: false, payoutId, error: 'Payout not found' };
      }

      // Check if already paid
      if (payout.status === 'PAID') {
        await this.logAttempt(payoutId, 'skipped', null, 'Already paid');
        return { success: true, payoutId, transferId: payout.stripeTransferId || undefined };
      }

      // Update status to processing
      await db.payout.update({
        where: { id: payoutId },
        data: { status: PayoutStatus.PROCESSING },
      });

      // Generate idempotency key
      const idempotencyKey = payout.idempotencyKey || 
        `payout_user_${payout.userId}_payout_${payout.id}_v${payout.retryCount + 1}`;

      // Get Stripe account for user
      const stripeAccountId = await this.getStripeAccountForUser(payout.userId);

      try {
        // Create Stripe transfer
        const transfer = await mockStripe.transfers.create({
          amount: payout.amountCents,
          currency: payout.currency.toLowerCase(),
          destination: stripeAccountId,
          metadata: {
            payout_id: payout.id,
            user_id: payout.userId,
          },
        }, { idempotencyKey });

        // Update payout with transfer ID
        const updatedPayout = await db.payout.update({
          where: { id: payoutId },
          data: {
            stripeTransferId: transfer.id,
            stripeAccountId,
            status: PayoutStatus.PAID,
            processedAt: new Date(),
          },
        });

        // Log successful attempt
        await this.logAttempt(payoutId, 'transfer_created', transfer, null);

        // Create notification
        await db.notification.create({
          data: {
            userId: payout.userId,
            type: 'PAYOUT_COMPLETED',
            title: 'Auszahlung abgeschlossen',
            message: `Ihre Auszahlung von ${(payout.amountCents / 100).toLocaleString('de-DE')} ${payout.currency} wurde erfolgreich verarbeitet.`,
            data: JSON.stringify({
              payoutId,
              transferId: transfer.id,
              amount: payout.amountCents,
            }),
          },
        });

        return {
          success: true,
          payoutId,
          transferId: transfer.id,
        };

      } catch (stripeError: any) {
        // Handle Stripe error
        const errorMessage = stripeError.message || 'Unknown Stripe error';

        // Update payout as failed
        await db.payout.update({
          where: { id: payoutId },
          data: {
            status: PayoutStatus.FAILED,
            failureReason: errorMessage,
            retryCount: { increment: 1 },
            lastRetryAt: new Date(),
          },
        });

        // Log failed attempt
        await this.logAttempt(payoutId, 'transfer_failed', null, errorMessage);

        // Reverse wallet debit
        const walletTx = await db.walletTransaction.findFirst({
          where: { payoutId, type: 'PAYOUT' },
        });

        if (walletTx) {
          await db.walletTransaction.create({
            data: {
              walletId: walletTx.walletId,
              type: 'REFUND',
              amount: Math.abs(walletTx.amount),
              currency: walletTx.currency,
              payoutId,
              description: `Rückbuchung fehlgeschlagene Auszahlung ${payoutId}`,
              processedAt: new Date(),
            },
          });

          await db.wallet.update({
            where: { id: walletTx.walletId },
            data: {
              balance: { increment: Math.abs(walletTx.amount) },
            },
          });
        }

        // Create notification
        await db.notification.create({
          data: {
            userId: payout.userId,
            type: 'PAYOUT_FAILED',
            title: 'Auszahlung fehlgeschlagen',
            message: `Ihre Auszahlung über ${(payout.amountCents / 100).toLocaleString('de-DE')} ${payout.currency} konnte nicht verarbeitet werden. Bitte kontaktieren Sie den Support.`,
            data: JSON.stringify({
              payoutId,
              error: errorMessage,
            }),
          },
        });

        return {
          success: false,
          payoutId,
          error: errorMessage,
        };
      }

    } finally {
      this.processing.delete(payoutId);
    }
  }

  /**
   * Log a payout attempt
   */
  private async logAttempt(
    payoutId: string,
    status: string,
    stripeResponse: any,
    error: string | null
  ): Promise<void> {
    try {
      await db.payoutAttempt.create({
        data: {
          payoutId,
          status,
          stripeResponse: stripeResponse ? JSON.stringify(stripeResponse) : null,
          error,
        },
      });
    } catch (logError) {
      console.error('Failed to log payout attempt:', logError);
    }
  }

  /**
   * Get Stripe account ID for user
   * In production: query user's connected Stripe account
   */
  private async getStripeAccountForUser(userId: string): Promise<string> {
    // TODO: Query from user record or Stripe Connect
    return process.env.DEFAULT_STRIPE_ACCOUNT_ID || 'acct_test_placeholder';
  }

  /**
   * Process pending payouts (called by scheduler)
   */
  async processPendingPayouts(limit: number = 100): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    const pendingPayouts = await db.payout.findMany({
      where: {
        status: PayoutStatus.PENDING,
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const payout of pendingPayouts) {
      const result = await this.processJob({ payoutId: payout.id, attemptNumber: 1 });
      processed++;
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return { processed, successful, failed };
  }

  /**
   * Retry failed payouts (called by scheduler)
   */
  async retryFailedPayouts(limit: number = 50): Promise<{
    retried: number;
    successful: number;
    failed: number;
  }> {
    const failedPayouts = await db.payout.findMany({
      where: {
        status: PayoutStatus.FAILED,
        retryCount: { lt: 3 }, // Max 3 retries
      },
      take: limit,
      orderBy: { lastRetryAt: 'asc' },
    });

    let retried = 0;
    let successful = 0;
    let failed = 0;

    for (const payout of failedPayouts) {
      const result = await this.processJob({ 
        payoutId: payout.id, 
        attemptNumber: payout.retryCount + 1 
      });
      retried++;
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return { retried, successful, failed };
  }
}

// Export singleton
export const payoutWorker = PayoutWorkerService.getInstance();
