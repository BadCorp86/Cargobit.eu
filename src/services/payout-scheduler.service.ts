// ============================================
// CARGOBIT PAYOUT SCHEDULER SERVICE
// Daily Reconciliation and Processing
// ============================================

import { db } from '@/lib/db';
import { PayoutStatus } from '@prisma/client';
import { leaderLock } from './leader-lock.service';
import { payoutWorker } from './payout-worker.service';

// ============================================
// INTERFACES
// ============================================

interface ReconciliationResult {
  timestamp: Date;
  duration: number;
  pendingPayouts: number;
  processedPayouts: number;
  failedPayouts: number;
  reconciledPayouts: number;
  diffs: ReconciliationDiff[];
}

interface ReconciliationDiff {
  type: 'missing_transfer' | 'status_mismatch' | 'orphaned_transfer' | 'duplicate_wallet_tx';
  payoutId: string;
  details: string;
}

interface SchedulerStats {
  lastRun: Date | null;
  nextRun: Date | null;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
}

// ============================================
// PAYOUT SCHEDULER SERVICE
// ============================================

/**
 * Payout Scheduler Service
 * 
 * Handles:
 * 1. Processing pending payouts
 * 2. Retrying failed payouts (with backoff)
 * 3. Reconciliation with Stripe
 * 4. Health checks and alerting
 * 
 * For Next.js API Routes, call runScheduledPayouts() from a cron job.
 * 
 * Cron Schedule Options:
 * - Vercel Cron: vercel.json
 * - External: cron-job.org, EasyCron
 * - Self-hosted: node-cron package
 */
export class PayoutSchedulerService {
  private static instance: PayoutSchedulerService;
  private readonly lockKey = 'payouts:scheduler:lock';
  private readonly lockTtl = 600; // 10 minutes
  private stats: SchedulerStats = {
    lastRun: null,
    nextRun: null,
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
  };

  private constructor() {}

  static getInstance(): PayoutSchedulerService {
    if (!PayoutSchedulerService.instance) {
      PayoutSchedulerService.instance = new PayoutSchedulerService();
    }
    return PayoutSchedulerService.instance;
  }

  /**
   * Main scheduler entry point
   * Called by cron job or manual trigger
   */
  async runScheduledPayouts(): Promise<ReconciliationResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    // Try to acquire lock
    const lock = await leaderLock.acquire(this.lockKey, this.lockTtl);
    if (!lock.acquired) {
      console.log('[PayoutScheduler] Another instance holds the lock, skipping');
      return {
        timestamp,
        duration: 0,
        pendingPayouts: 0,
        processedPayouts: 0,
        failedPayouts: 0,
        reconciledPayouts: 0,
        diffs: [],
      };
    }

    try {
      console.log('[PayoutScheduler] Starting scheduled payout run...');

      // 1. Process pending payouts
      const pendingResult = await payoutWorker.processPendingPayouts(100);

      // 2. Retry failed payouts
      const retryResult = await payoutWorker.retryFailedPayouts(50);

      // 3. Run reconciliation
      const reconciliation = await this.runReconciliation();

      // 4. Update stats
      this.stats.lastRun = timestamp;
      this.stats.nextRun = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000); // Next day
      this.stats.totalRuns++;
      this.stats.successfulRuns++;

      const duration = Date.now() - startTime;
      console.log(`[PayoutScheduler] Completed in ${duration}ms`, {
        pending: pendingResult,
        retries: retryResult,
        reconciliation: reconciliation.diffs.length,
      });

      // 5. Record metrics
      await this.recordMetrics({
        timestamp,
        duration,
        pendingResult,
        retryResult,
        reconciliation,
      });

      return {
        timestamp,
        duration,
        pendingPayouts: pendingResult.processed,
        processedPayouts: pendingResult.successful,
        failedPayouts: pendingResult.failed + retryResult.failed,
        reconciledPayouts: reconciliation.reconciled,
        diffs: reconciliation.diffs,
      };

    } catch (error) {
      console.error('[PayoutScheduler] Error during scheduled run:', error);
      this.stats.failedRuns++;

      return {
        timestamp,
        duration: Date.now() - startTime,
        pendingPayouts: 0,
        processedPayouts: 0,
        failedPayouts: 0,
        reconciledPayouts: 0,
        diffs: [],
      };

    } finally {
      await leaderLock.release(this.lockKey);
    }
  }

  /**
   * Run reconciliation between local DB and Stripe
   */
  async runReconciliation(): Promise<{
    reconciled: number;
    diffs: ReconciliationDiff[];
  }> {
    const diffs: ReconciliationDiff[] = [];
    let reconciled = 0;

    // 1. Find payouts marked as PROCESSING for > 24h
    const stuckPayouts = await db.payout.findMany({
      where: {
        status: PayoutStatus.PROCESSING,
        updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    for (const payout of stuckPayouts) {
      if (!payout.stripeTransferId) {
        diffs.push({
          type: 'missing_transfer',
          payoutId: payout.id,
          details: 'Payout stuck in PROCESSING without Stripe transfer ID',
        });
      }
    }

    // 2. Find failed payouts without wallet reversal
    const failedPayouts = await db.payout.findMany({
      where: { status: PayoutStatus.FAILED },
      include: {
        walletTransactions: true,
      },
    });

    for (const payout of failedPayouts) {
      const debitTx = payout.walletTransactions.find(tx => tx.type === 'PAYOUT');
      const creditTx = payout.walletTransactions.find(tx => tx.type === 'REFUND');

      if (debitTx && !creditTx) {
        diffs.push({
          type: 'duplicate_wallet_tx',
          payoutId: payout.id,
          details: 'Failed payout without wallet reversal',
        });

        // Auto-reconcile: create reversal
        await db.walletTransaction.create({
          data: {
            walletId: debitTx.walletId,
            type: 'REFUND',
            amount: Math.abs(debitTx.amount),
            currency: debitTx.currency,
            payoutId: payout.id,
            description: `Reconciliation reversal for ${payout.id}`,
            processedAt: new Date(),
          },
        });

        await db.wallet.update({
          where: { id: debitTx.walletId },
          data: { balance: { increment: Math.abs(debitTx.amount) } },
        });

        reconciled++;
      }
    }

    // 3. Find duplicate wallet transactions
    const duplicateTxs = await db.$queryRaw<any[]>`
      SELECT payout_id, COUNT(*) as count
      FROM wallet_transactions
      WHERE payout_id IS NOT NULL AND type = 'PAYOUT'
      GROUP BY payout_id
      HAVING COUNT(*) > 1
    `;

    for (const row of duplicateTxs) {
      diffs.push({
        type: 'duplicate_wallet_tx',
        payoutId: row.payout_id,
        details: `Found ${row.count} debit transactions for same payout`,
      });
    }

    // 4. Store reconciliation result
    if (diffs.length > 0) {
      await db.systemSetting.create({
        data: {
          key: `reconciliation:${Date.now()}`,
          value: JSON.stringify({
            timestamp: new Date().toISOString(),
            diffs,
            reconciled,
          }),
        },
      });
    }

    return { reconciled, diffs };
  }

  /**
   * Record metrics for monitoring
   */
  private async recordMetrics(data: {
    timestamp: Date;
    duration: number;
    pendingResult: any;
    retryResult: any;
    reconciliation: any;
  }): Promise<void> {
    try {
      // Store metrics in system settings for Grafana/Prometheus scraping
      await db.systemSetting.upsert({
        where: { key: 'metrics:payouts:last_run' },
        create: {
          key: 'metrics:payouts:last_run',
          value: JSON.stringify(data),
        },
        update: {
          value: JSON.stringify(data),
        },
      });
    } catch (error) {
      console.error('[PayoutScheduler] Failed to record metrics:', error);
    }
  }

  /**
   * Get scheduler stats
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    lastRun: Date | null;
    pendingPayouts: number;
    failedPayouts: number;
    lockStatus: any;
  }> {
    const [pending, failed, lockStatus] = await Promise.all([
      db.payout.count({ where: { status: PayoutStatus.PENDING } }),
      db.payout.count({ where: { status: PayoutStatus.FAILED } }),
      leaderLock.getInfo(this.lockKey),
    ]);

    // Healthy if last run was within last 48h
    const healthy = this.stats.lastRun
      ? Date.now() - this.stats.lastRun.getTime() < 48 * 60 * 60 * 1000
      : false;

    return {
      healthy,
      lastRun: this.stats.lastRun,
      pendingPayouts: pending,
      failedPayouts: failed,
      lockStatus,
    };
  }
}

// Export singleton
export const payoutScheduler = PayoutSchedulerService.getInstance();
