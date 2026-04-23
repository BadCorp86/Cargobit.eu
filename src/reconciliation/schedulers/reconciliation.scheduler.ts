import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReconciliationService } from '../services/reconciliation.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ReconciliationScheduler {
  private readonly logger = new Logger(ReconciliationScheduler.name);
  private prisma: PrismaClient;
  private isRunning = false;

  constructor(private readonly reconciliationService: ReconciliationService) {
    this.prisma = new PrismaClient();
  }

  /**
   * Reconciliation alle 6 Stunden
   * Verwendet Leader-Lock für verteilte Systeme
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleReconciliation() {
    if (this.isRunning) {
      this.logger.warn('Reconciliation already running, skipping');
      return;
    }

    const lockKey = 'reconciliation:leader';
    const lockTTL = 3600; // 1 Stunde

    try {
      // Leader Lock erwerben
      const acquired = await this.acquireLock(lockKey, lockTTL);

      if (!acquired) {
        this.logger.log('Not leader, skipping reconciliation run');
        return;
      }

      this.isRunning = true;
      this.logger.log('Starting scheduled reconciliation run');

      const startTime = Date.now();
      const result = await this.reconciliationService.runReconciliation();
      const duration = Date.now() - startTime;

      this.logger.log(
        `Reconciliation completed in ${duration}ms: ` +
          `${result.processed} processed, ` +
          `${result.diffs.length} diffs, ` +
          `${result.errors.length} errors`
      );

      // Metrics schreiben
      await this.recordMetrics(result, duration);
    } catch (error) {
      this.logger.error('Reconciliation run failed:', error);
    } finally {
      this.isRunning = false;
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Manueller Trigger für Reconciliation
   */
  async triggerManually(): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      this.logger.log('Manual reconciliation triggered');
      const result = await this.reconciliationService.runReconciliation();
      return { success: true, result };
    } catch (error) {
      this.logger.error('Manual reconciliation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leader Lock erwerben
   */
  private async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      const result = await this.prisma.leaderLock.upsert({
        where: { key },
        create: {
          key,
          holderId: process.env.HOSTNAME || 'local',
          expiresAt,
        },
        update: {
          holderId: process.env.HOSTNAME || 'local',
          expiresAt,
        },
      });

      return result.holderId === (process.env.HOSTNAME || 'local');
    } catch (error) {
      this.logger.error('Failed to acquire lock:', error);
      return false;
    }
  }

  /**
   * Leader Lock freigeben
   */
  private async releaseLock(key: string): Promise<void> {
    try {
      await this.prisma.leaderLock.deleteMany({
        where: {
          key,
          holderId: process.env.HOSTNAME || 'local',
        },
      });
    } catch (error) {
      this.logger.error('Failed to release lock:', error);
    }
  }

  /**
   * Metrics für Monitoring aufzeichnen
   */
  private async recordMetrics(
    result: { processed: number; diffs: any[]; errors: string[] },
    durationMs: number
  ): Promise<void> {
    try {
      // In Produktion: Prometheus Metrics oder ähnliches
      this.logger.log({
        event: 'reconciliation_metrics',
        processed: result.processed,
        diffs: result.diffs.length,
        errors: result.errors.length,
        duration_ms: durationMs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to record metrics:', error);
    }
  }
}
