import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReconciliationService } from './services/reconciliation.service';
import { ReconciliationScheduler } from './schedulers/reconciliation.scheduler';
import { ReconciliationMetrics } from './metrics/reconciliation.metrics';

/**
 * ReconciliationModule - NestJS Module für Payout Reconciliation
 *
 * Features:
 * - Automatische Reconciliation alle 6 Stunden via CronJob
 * - Leader-Lock für verteilte Systeme
 * - Stripe Transfer Vergleich
 * - Prometheus Metrics
 * - Admin API Endpoints
 *
 * Endpoints:
 * - GET  /api/admin/reconciliation/open     - Offene Payouts auflisten
 * - GET  /api/admin/reconciliation/report   - Reconciliation Report
 * - POST /api/admin/reconciliation/trigger  - Manuell auslösen
 * - POST /api/admin/reconciliation/:id/mark - Payout markieren
 *
 * Konfiguration via Environment:
 * - STRIPE_SECRET_KEY        - Stripe API Key
 * - DATABASE_URL             - PostgreSQL Connection
 * - NAMESPACE                - Kubernetes Namespace (für Metrics)
 * - RECONCILIATION_SCHEDULE  - Cron Schedule (default: alle 6h)
 */
@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [
    ReconciliationService,
    ReconciliationScheduler,
    ReconciliationMetrics,
  ],
  exports: [
    ReconciliationService,
    ReconciliationMetrics,
  ],
})
export class ReconciliationModule {
  constructor() {
    console.log('[ReconciliationModule] Initialized');
  }
}

// Export types
export * from './services/reconciliation.service';
export * from './dto/mark-payout.dto';
export * from './metrics/reconciliation.metrics';
