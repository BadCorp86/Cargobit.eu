import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { ReconciliationMetrics, getReconciliationMetrics } from '../metrics/reconciliation.metrics';

// Types
export interface OpenPayout {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  diff: number;
  created_at: Date;
  updated_at: Date;
  stripe_transfer_id: string | null;
  user_id: string;
  company_id: string | null;
}

export interface ReconciliationDiff {
  payout_id: string;
  local_status: string;
  remote_status: string | null;
  local_amount: number;
  remote_amount: number | null;
  diff_amount: number;
  action_taken: string;
}

export interface ReconcileResult {
  processed: number;
  diffs: ReconciliationDiff[];
  errors: string[];
  auto_resolved: number;
  needs_review: number;
}

/**
 * Erweiterte ReconciliationService mit Stripe API Integration
 *
 * Vergleicht lokale Payout-Daten mit Stripe Transfers und:
 * - Erkennt Status-Differenzen
 * - Aktualisiert veraltete lokale Status
 * - Erstellt Audit-Events
 * - Sammelt Prometheus Metrics
 */
@Injectable()
export class StripeReconciliationService {
  private readonly logger = new Logger(StripeReconciliationService.name);
  private prisma: PrismaClient;
  private stripe: Stripe | null = null;
  private metrics: ReconciliationMetrics;

  constructor() {
    this.prisma = new PrismaClient();

    // Initialize Stripe client if key available
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2023-10-16',
        typescript: true,
      });
      this.logger.log('Stripe client initialized');
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set - Stripe reconciliation disabled');
    }

    this.metrics = getReconciliationMetrics();
  }

  /**
   * Haupt-Reconciliation: Vergleiche alle offenen Payouts mit Stripe
   */
  async runFullReconciliation(): Promise<ReconcileResult> {
    const result: ReconcileResult = {
      processed: 0,
      diffs: [],
      errors: [],
      auto_resolved: 0,
      needs_review: 0,
    };

    const endTimer = this.metrics.startTimer();

    try {
      // Lade offene Payouts
      const openPayouts = await this.listOpenPayouts({ limit: 1000 });
      result.processed = openPayouts.length;

      this.logger.log(`Starting reconciliation for ${openPayouts.length} open payouts`);
      this.metrics.setOpenPayouts(openPayouts.length, 'total');

      if (!this.stripe) {
        this.logger.warn('Stripe not configured - skipping external reconciliation');
        return result;
      }

      // Verarbeite jeden Payout
      for (const payout of openPayouts) {
        try {
          const diff = await this.reconcileOne(payout);
          if (diff) {
            result.diffs.push(diff);

            if (diff.action_taken === 'auto_resolved') {
              result.auto_resolved++;
            } else if (diff.action_taken === 'needs_review') {
              result.needs_review++;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to reconcile payout ${payout.id}:`, error);
          result.errors.push(`${payout.id}: ${error.message}`);
          this.metrics.reconciliationErrors.inc({ error_type: 'reconcile_failed' });
        }
      }

      // Update metrics
      this.metrics.setDiffs(result.diffs.length, 'status_mismatch');

      const duration = endTimer();
      this.metrics.recordSuccess(duration);

      this.logger.log(
        `Reconciliation complete: ${result.processed} processed, ` +
        `${result.diffs.length} diffs, ` +
        `${result.auto_resolved} auto-resolved, ` +
        `${result.needs_review} need review, ` +
        `${result.errors.length} errors`
      );

      return result;
    } catch (error) {
      const duration = endTimer();
      this.metrics.recordFailure(duration, 'general_error');
      result.errors.push(error.message);
      this.logger.error('Reconciliation failed:', error);
      return result;
    }
  }

  /**
   * Reconcile einen einzelnen Payout gegen Stripe
   */
  async reconcileOne(payout: OpenPayout): Promise<ReconciliationDiff | null> {
    const diff: ReconciliationDiff = {
      payout_id: payout.id,
      local_status: payout.status,
      remote_status: null,
      local_amount: payout.amount_cents,
      remote_amount: null,
      diff_amount: 0,
      action_taken: 'none',
    };

    // Keine Stripe Transfer ID
    if (!payout.stripe_transfer_id) {
      await this.createPayoutEvent(payout.id, 'reconcile_missing_external', {
        reason: 'No stripe_transfer_id',
      });
      diff.action_taken = 'needs_review';
      return diff;
    }

    // Hole Stripe Transfer
    const stripeStart = Date.now();
    let transfer: Stripe.Transfer | null = null;

    try {
      transfer = await this.stripe!.transfers.retrieve(payout.stripe_transfer_id);
      const stripeDuration = Date.now() - stripeStart;
      this.metrics.recordStripeLatency('retrieve_transfer', stripeDuration);
    } catch (error) {
      if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
        // Transfer existiert nicht mehr
        await this.handleMissingTransfer(payout);
        diff.action_taken = 'needs_review';
        return diff;
      }

      this.metrics.reconciliationErrors.inc({ error_type: 'stripe_api_error' });
      throw error;
    }

    if (!transfer) {
      diff.action_taken = 'needs_review';
      return diff;
    }

    // Vergleiche Status und Betrag
    diff.remote_status = transfer.status;
    diff.remote_amount = transfer.amount;
    diff.diff_amount = Math.abs(payout.amount_cents - transfer.amount);

    // Status-Vergleich
    const stripeStatusMap: Record<string, string> = {
      'paid': 'paid',
      'pending': 'processing',
      'in_transit': 'processing',
      'canceled': 'failed',
      'failed': 'failed',
    };

    const expectedLocalStatus = stripeStatusMap[transfer.status] || payout.status;

    // Automatische Auflösung: Stripe sagt "paid", lokal nicht
    if (transfer.status === 'paid' && payout.status !== 'paid') {
      await this.autoResolvePayout(payout, transfer);
      diff.action_taken = 'auto_resolved';
      this.metrics.recordProcessedPayout(payout.status, 'paid');
      return diff;
    }

    // Betrags-Differenz
    if (diff.diff_amount > 0) {
      await this.createPayoutEvent(payout.id, 'amount_mismatch', {
        local_amount: payout.amount_cents,
        remote_amount: transfer.amount,
        diff: diff.diff_amount,
      });
      diff.action_taken = 'needs_review';
      return diff;
    }

    // Status-Differenz erfordert Review
    if (expectedLocalStatus !== payout.status) {
      await this.createPayoutEvent(payout.id, 'status_mismatch', {
        local_status: payout.status,
        remote_status: transfer.status,
        expected_local: expectedLocalStatus,
      });
      diff.action_taken = 'needs_review';
      return diff;
    }

    // Keine Aktion nötig
    await this.createPayoutEvent(payout.id, 'reconciled_no_change', {
      local_status: payout.status,
      remote_status: transfer.status,
    });

    return null; // Keine Differenz
  }

  /**
   * Automatische Auflösung: Markiere Payout als bezahlt
   */
  private async autoResolvePayout(payout: OpenPayout, transfer: Stripe.Transfer): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Update Payout Status
      const updated = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            autoResolved: true,
            resolvedAt: new Date().toISOString(),
            stripeTransferStatus: transfer.status,
          },
        },
      });

      // Erstelle Payout Event
      await tx.payoutEvent.create({
        data: {
          payoutId: payout.id,
          type: 'auto_resolved_paid',
          payload: {
            previous_status: payout.status,
            new_status: 'paid',
            stripe_transfer_id: payout.stripe_transfer_id,
            stripe_amount: transfer.amount,
            auto_resolved: true,
          },
          createdAt: new Date(),
        },
      });

      // Erstelle Audit Event
      await tx.auditEvent.create({
        data: {
          action: 'reconciliation.auto_resolve',
          entityType: 'payout',
          entityId: payout.id,
          actorId: 'system:reconciliation',
          metadata: {
            stripe_transfer_id: payout.stripe_transfer_id,
            amount: transfer.amount,
          },
          createdAt: new Date(),
        },
      });

      // Optional: Erstelle Wallet Transaction falls nötig
      // Dies würde normalerweise in einem separaten Step passieren

      this.logger.log(`Auto-resolved payout ${payout.id} to paid status`);
    });
  }

  /**
   * Behandle fehlende Stripe Transfers
   */
  private async handleMissingTransfer(payout: OpenPayout): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Markiere als needs_review
      await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'needs_review',
          updatedAt: new Date(),
          metadata: {
            reconciliationIssue: 'stripe_transfer_missing',
            flaggedAt: new Date().toISOString(),
          },
        },
      });

      // Erstelle Event
      await tx.payoutEvent.create({
        data: {
          payoutId: payout.id,
          type: 'stripe_transfer_missing',
          payload: {
            stripe_transfer_id: payout.stripe_transfer_id,
            issue: 'Transfer not found in Stripe',
          },
          createdAt: new Date(),
        },
      });

      // Audit Event
      await tx.auditEvent.create({
        data: {
          action: 'reconciliation.transfer_missing',
          entityType: 'payout',
          entityId: payout.id,
          actorId: 'system:reconciliation',
          metadata: {
            stripe_transfer_id: payout.stripe_transfer_id,
          },
          createdAt: new Date(),
        },
      });

      this.logger.warn(`Payout ${payout.id} flagged: Stripe transfer ${payout.stripe_transfer_id} missing`);
    });
  }

  /**
   * Erstelle Payout Event
   */
  private async createPayoutEvent(
    payoutId: string,
    type: string,
    payload: Record<string, any>
  ): Promise<void> {
    try {
      await this.prisma.payoutEvent.create({
        data: {
          payoutId,
          type,
          payload,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create payout event: ${error.message}`);
    }
  }

  /**
   * Liste offene Payouts
   */
  async listOpenPayouts(filters?: {
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<OpenPayout[]> {
    const where: any = {
      OR: [
        { status: 'pending' },
        { status: 'processing' },
        { status: 'failed' },
      ],
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters?.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters?.toDate) where.createdAt.lte = filters.toDate;
    }

    const payouts = await this.prisma.payout.findMany({
      where,
      take: filters?.limit || 100,
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map((p) => ({
      id: p.id,
      amount_cents: p.amountCents,
      currency: p.currency,
      status: p.status,
      diff: 0,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      stripe_transfer_id: p.stripeTransferId,
      user_id: p.userId,
      company_id: p.companyId,
    }));
  }

  /**
   * Cleanup
   */
  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
