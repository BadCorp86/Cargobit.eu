// ============================================
// CARGOBIT PAYOUT METRICS SERVICE
// Prometheus-style Observability
// ============================================

import { db } from '@/lib/db';
import { PayoutStatus } from '@prisma/client';

// ============================================
// INTERFACES
// ============================================

export interface PayoutMetrics {
  // Counters
  payoutsCreatedTotal: number;
  payoutsPaidTotal: number;
  payoutsFailedTotal: number;
  payoutsCancelledTotal: number;
  
  // Gauges
  payoutsPendingCount: number;
  payoutsProcessingCount: number;
  payoutsFailedCount: number;
  
  // Histograms (simplified as averages)
  averageProcessingTimeMs: number;
  averagePayoutAmountCents: number;
  totalPayoutAmountCents: number;
  
  // Queue metrics
  queueWaitingCount: number;
  queueActiveCount: number;
  queueFailedCount: number;
  
  // Reconciliation metrics
  reconciliationLastRun: Date | null;
  reconciliationDiffsCount: number;
  
  // Timestamp
  timestamp: Date;
}

export interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number | { buckets: Record<string, number>; sum: number; count: number };
  labels?: Record<string, string>;
}

// ============================================
// PAYOUT METRICS SERVICE
// ============================================

/**
 * Payout Metrics Service
 * 
 * Provides Prometheus-compatible metrics for monitoring.
 * Can be scraped by Prometheus or used for dashboards.
 * 
 * Usage:
 * ```typescript
 * const metrics = await PayoutMetricsService.getMetrics();
 * console.log(metrics);
 * 
 * // Or get Prometheus format
 * const prometheus = await PayoutMetricsService.getPrometheusMetrics();
 * ```
 */
export class PayoutMetricsService {
  private static instance: PayoutMetricsService;
  private metricsCache: PayoutMetrics | null = null;
  private lastCacheUpdate: Date | null = null;
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): PayoutMetricsService {
    if (!PayoutMetricsService.instance) {
      PayoutMetricsService.instance = new PayoutMetricsService();
    }
    return PayoutMetricsService.instance;
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<PayoutMetrics> {
    // Check cache
    if (this.metricsCache && this.lastCacheUpdate) {
      const cacheAge = Date.now() - this.lastCacheUpdate.getTime();
      if (cacheAge < this.CACHE_TTL_MS) {
        return this.metricsCache;
      }
    }

    // Fetch fresh metrics
    const metrics = await this.fetchMetrics();
    this.metricsCache = metrics;
    this.lastCacheUpdate = new Date();
    return metrics;
  }

  /**
   * Fetch metrics from database
   */
  private async fetchMetrics(): Promise<PayoutMetrics> {
    const timestamp = new Date();

    // Get counts by status
    const statusCounts = await db.payout.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amountCents: true },
    });

    // Map status counts
    const statusMap = new Map<string, { count: number; sum: number }>();
    for (const row of statusCounts) {
      statusMap.set(row.status, {
        count: row._count.id,
        sum: row._sum.amountCents || 0,
      });
    }

    // Get total counts for different time periods
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Created today
    const createdToday = await db.payout.count({
      where: { createdAt: { gte: today } },
    });

    // Paid today
    const paidToday = await db.payout.count({
      where: {
        status: PayoutStatus.PAID,
        processedAt: { gte: today },
      },
    });

    // Failed today
    const failedToday = await db.payout.count({
      where: {
        status: PayoutStatus.FAILED,
        updatedAt: { gte: today },
      },
    });

    // Average processing time
    const processedPayouts = await db.payout.findMany({
      where: {
        status: PayoutStatus.PAID,
        processedAt: { not: null },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
      select: {
        createdAt: true,
        processedAt: true,
        amountCents: true,
      },
    });

    let totalProcessingTime = 0;
    let totalAmount = 0;
    for (const payout of processedPayouts) {
      if (payout.processedAt) {
        totalProcessingTime += payout.processedAt.getTime() - payout.createdAt.getTime();
      }
      totalAmount += payout.amountCents;
    }

    const averageProcessingTimeMs = processedPayouts.length > 0
      ? totalProcessingTime / processedPayouts.length
      : 0;

    const averagePayoutAmountCents = processedPayouts.length > 0
      ? totalAmount / processedPayouts.length
      : 0;

    // Get reconciliation metrics
    const lastReconciliation = await db.systemSetting.findUnique({
      where: { key: 'metrics:payouts:last_run' },
    });

    let reconciliationDiffsCount = 0;
    if (lastReconciliation) {
      try {
        const data = JSON.parse(lastReconciliation.value);
        reconciliationDiffsCount = data.reconciliation?.diffs?.length || 0;
      } catch {}
    }

    return {
      // Counters
      payoutsCreatedTotal: createdToday,
      payoutsPaidTotal: paidToday,
      payoutsFailedTotal: failedToday,
      payoutsCancelledTotal: statusMap.get('CANCELLED')?.count || 0,

      // Gauges
      payoutsPendingCount: statusMap.get('PENDING')?.count || 0,
      payoutsProcessingCount: statusMap.get('PROCESSING')?.count || 0,
      payoutsFailedCount: statusMap.get('FAILED')?.count || 0,

      // Histograms
      averageProcessingTimeMs,
      averagePayoutAmountCents,
      totalPayoutAmountCents: totalAmount,

      // Queue metrics (placeholder - would need BullMQ integration)
      queueWaitingCount: 0,
      queueActiveCount: 0,
      queueFailedCount: 0,

      // Reconciliation
      reconciliationLastRun: lastReconciliation ? new Date(JSON.parse(lastReconciliation.value).timestamp) : null,
      reconciliationDiffsCount,

      timestamp,
    };
  }

  /**
   * Get metrics in Prometheus format
   */
  async getPrometheusMetrics(): Promise<string> {
    const metrics = await this.getMetrics();
    const lines: string[] = [];

    // Helper to add metric
    const addMetric = (
      name: string,
      help: string,
      type: 'counter' | 'gauge',
      value: number,
      labels?: Record<string, string>
    ) => {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${type}`);
      const labelStr = labels
        ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
        : '';
      lines.push(`${name}${labelStr} ${value}`);
    };

    // Counters
    addMetric(
      'cargobit_payouts_created_total',
      'Total number of payouts created today',
      'counter',
      metrics.payoutsCreatedTotal
    );

    addMetric(
      'cargobit_payouts_paid_total',
      'Total number of payouts paid today',
      'counter',
      metrics.payoutsPaidTotal
    );

    addMetric(
      'cargobit_payouts_failed_total',
      'Total number of payouts failed today',
      'counter',
      metrics.payoutsFailedTotal
    );

    // Gauges
    addMetric(
      'cargobit_payouts_pending_count',
      'Current number of pending payouts',
      'gauge',
      metrics.payoutsPendingCount
    );

    addMetric(
      'cargobit_payouts_processing_count',
      'Current number of processing payouts',
      'gauge',
      metrics.payoutsProcessingCount
    );

    addMetric(
      'cargobit_payouts_failed_count',
      'Current number of failed payouts',
      'gauge',
      metrics.payoutsFailedCount
    );

    addMetric(
      'cargobit_payout_average_processing_time_ms',
      'Average payout processing time in milliseconds',
      'gauge',
      metrics.averageProcessingTimeMs
    );

    addMetric(
      'cargobit_payout_average_amount_cents',
      'Average payout amount in cents',
      'gauge',
      metrics.averagePayoutAmountCents
    );

    addMetric(
      'cargobit_payout_total_amount_cents',
      'Total payout amount in cents (last 7 days)',
      'gauge',
      metrics.totalPayoutAmountCents
    );

    // Queue metrics
    addMetric(
      'cargobit_payout_queue_waiting_count',
      'Number of payouts waiting in queue',
      'gauge',
      metrics.queueWaitingCount
    );

    addMetric(
      'cargobit_payout_queue_active_count',
      'Number of payouts being processed',
      'gauge',
      metrics.queueActiveCount
    );

    // Reconciliation
    addMetric(
      'cargobit_payout_reconciliation_diffs_count',
      'Number of reconciliation differences found',
      'gauge',
      metrics.reconciliationDiffsCount
    );

    // Timestamp
    lines.push(`# HELP cargobit_payout_metrics_timestamp Unix timestamp of metrics collection`);
    lines.push(`# TYPE cargobit_payout_metrics_timestamp gauge`);
    lines.push(`cargobit_payout_metrics_timestamp ${metrics.timestamp.getTime()}`);

    return lines.join('\n');
  }

  /**
   * Record a payout event for metrics
   */
  async recordEvent(event: {
    type: 'created' | 'paid' | 'failed' | 'cancelled';
    payoutId: string;
    amountCents: number;
    processingTimeMs?: number;
  }): Promise<void> {
    // Store event for time-series analysis
    try {
      await db.systemSetting.create({
        data: {
          key: `payout_event:${Date.now()}:${event.payoutId}`,
          value: JSON.stringify({
            type: event.type,
            payoutId: event.payoutId,
            amountCents: event.amountCents,
            processingTimeMs: event.processingTimeMs,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (error) {
      console.error('[PayoutMetrics] Failed to record event:', error);
    }

    // Invalidate cache
    this.metricsCache = null;
    this.lastCacheUpdate = null;
  }

  /**
   * Get metrics summary for dashboard
   */
  async getDashboardMetrics(): Promise<{
    today: { created: number; paid: number; failed: number; amount: number };
    pending: { count: number; amount: number };
    failed: { count: number; amount: number };
    averageProcessingTime: string;
  }> {
    const metrics = await this.getMetrics();

    return {
      today: {
        created: metrics.payoutsCreatedTotal,
        paid: metrics.payoutsPaidTotal,
        failed: metrics.payoutsFailedTotal,
        amount: metrics.totalPayoutAmountCents / 100,
      },
      pending: {
        count: metrics.payoutsPendingCount + metrics.payoutsProcessingCount,
        amount: metrics.averagePayoutAmountCents * (metrics.payoutsPendingCount + metrics.payoutsProcessingCount) / 100,
      },
      failed: {
        count: metrics.payoutsFailedCount,
        amount: metrics.averagePayoutAmountCents * metrics.payoutsFailedCount / 100,
      },
      averageProcessingTime: formatDuration(metrics.averageProcessingTimeMs),
    };
  }

  /**
   * Health check for metrics
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    lastUpdate: Date | null;
    cacheAge: number;
  }> {
    const healthy = this.metricsCache !== null;
    const cacheAge = this.lastCacheUpdate
      ? Date.now() - this.lastCacheUpdate.getTime()
      : Infinity;

    return {
      healthy: healthy && cacheAge < 60000, // Cache should be less than 1 minute old
      lastUpdate: this.lastCacheUpdate,
      cacheAge,
    };
  }
}

// Helper function
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

// Export singleton
export const payoutMetrics = PayoutMetricsService.getInstance();
