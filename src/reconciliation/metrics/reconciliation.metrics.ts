import { Injectable, Logger } from '@nestjs/common';
import client from 'prom-client';

/**
 * Prometheus Metrics für Reconciliation
 *
 * Metriken:
 * - reconciliation_runs_total: Counter für Runs mit Result-Labels
 * - reconciliation_open_payouts_gauge: Aktuelle Anzahl offener Payouts
 * - reconciliation_duration_seconds: Histogram für Laufzeit
 * - reconciliation_diffs_found: Gauge für gefundene Differenzen
 * - reconciliation_errors_total: Counter für Fehler
 */
@Injectable()
export class ReconciliationMetrics {
  private readonly logger = new Logger(ReconciliationMetrics.name);

  // Counter: Gesamtanzahl der Reconciliation Runs
  reconciliationRuns = new client.Counter({
    name: 'reconciliation_runs_total',
    help: 'Total number of reconciliation runs',
    labelNames: ['result', 'namespace'],
  });

  // Gauge: Anzahl offener Payouts
  reconciliationOpen = new client.Gauge({
    name: 'reconciliation_open_payouts_gauge',
    help: 'Number of open payouts pending reconciliation',
    labelNames: ['status', 'namespace'],
  });

  // Histogram: Dauer der Reconciliation
  reconciliationDuration = new client.Histogram({
    name: 'reconciliation_duration_seconds',
    help: 'Duration of reconciliation runs in seconds',
    labelNames: ['namespace'],
    buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300],
  });

  // Gauge: Gefundene Differenzen
  reconciliationDiffs = new client.Gauge({
    name: 'reconciliation_diffs_found',
    help: 'Number of discrepancies found during reconciliation',
    labelNames: ['type', 'namespace'],
  });

  // Counter: Fehler beim Reconcile
  reconciliationErrors = new client.Counter({
    name: 'reconciliation_errors_total',
    help: 'Total number of reconciliation errors',
    labelNames: ['error_type', 'namespace'],
  });

  // Counter: Manuell markierte Payouts
  manualMarks = new client.Counter({
    name: 'reconciliation_manual_marks_total',
    help: 'Total number of manually marked payouts',
    labelNames: ['status', 'actor', 'namespace'],
  });

  // Gauge: Stripe API Latenz
  stripeApiLatency = new client.Gauge({
    name: 'reconciliation_stripe_api_latency_seconds',
    help: 'Stripe API latency during reconciliation',
    labelNames: ['operation', 'namespace'],
  });

  // Counter: Verarbeitete Payouts
  processedPayouts = new client.Counter({
    name: 'reconciliation_processed_payouts_total',
    help: 'Total number of processed payouts',
    labelNames: ['status_before', 'status_after', 'namespace'],
  });

  private namespace: string;

  constructor() {
    this.namespace = process.env.NAMESPACE || process.env.KUBERNETES_NAMESPACE || 'default';

    // Registriere default Metrics
    try {
      client.collectDefaultMetrics({
        register: client.register,
        prefix: 'cargobit_',
      });
      this.logger.log('Prometheus metrics initialized');
    } catch (error) {
      this.logger.warn('Metrics already registered or error:', error.message);
    }
  }

  /**
   * Record einen erfolgreichen Run
   */
  recordSuccess(durationMs: number): void {
    this.reconciliationRuns.inc({ result: 'success', namespace: this.namespace });
    this.reconciliationDuration.observe({ namespace: this.namespace }, durationMs / 1000);
  }

  /**
   * Record einen fehlgeschlagenen Run
   */
  recordFailure(durationMs: number, errorType: string): void {
    this.reconciliationRuns.inc({ result: 'failure', namespace: this.namespace });
    this.reconciliationErrors.inc({ error_type: errorType, namespace: this.namespace });
    this.reconciliationDuration.observe({ namespace: this.namespace }, durationMs / 1000);
  }

  /**
   * Record einen übersprungenen Run (bereits laufend)
   */
  recordSkipped(): void {
    this.reconciliationRuns.inc({ result: 'skipped', namespace: this.namespace });
  }

  /**
   * Update offene Payouts Gauge
   */
  setOpenPayouts(count: number, status: string): void {
    this.reconciliationOpen.set({ status, namespace: this.namespace }, count);
  }

  /**
   * Update Differenzen Gauge
   */
  setDiffs(count: number, type: string = 'status_mismatch'): void {
    this.reconciliationDiffs.set({ type, namespace: this.namespace }, count);
  }

  /**
   * Record manuelles Markieren
   */
  recordManualMark(status: 'resolved' | 'needs_review', actorId: string): void {
    this.manualMarks.inc({ status, actor: actorId.substring(0, 20), namespace: this.namespace });
  }

  /**
   * Record Stripe API Latenz
   */
  recordStripeLatency(operation: string, durationMs: number): void {
    this.stripeApiLatency.set({ operation, namespace: this.namespace }, durationMs / 1000);
  }

  /**
   * Record verarbeiteten Payout
   */
  recordProcessedPayout(statusBefore: string, statusAfter: string): void {
    this.processedPayouts.inc({
      status_before: statusBefore,
      status_after: statusAfter,
      namespace: this.namespace
    });
  }

  /**
   * Start Timer für Duration Histogram
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.reconciliationDuration.observe({ namespace: this.namespace }, duration / 1000);
      return duration;
    };
  }

  /**
   * Get Metrics Output für /metrics Endpoint
   */
  async getMetrics(): Promise<string> {
    return client.register.metrics();
  }

  /**
   * Get Content Type für HTTP Response
   */
  getContentType(): string {
    return client.register.contentType;
  }
}

// Singleton für Non-NestJS Nutzung (z.B. im Scheduler Script)
let metricsInstance: ReconciliationMetrics | null = null;

export function getReconciliationMetrics(): ReconciliationMetrics {
  if (!metricsInstance) {
    metricsInstance = new ReconciliationMetrics();
  }
  return metricsInstance;
}
