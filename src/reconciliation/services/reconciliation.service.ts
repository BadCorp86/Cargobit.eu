import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

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
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Listet alle offenen Payouts mit Status-Differenzen
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
      where.created_at = {};
      if (filters?.fromDate) where.created_at.gte = filters.fromDate;
      if (filters?.toDate) where.created_at.lte = filters.toDate;
    }

    const payouts = await this.prisma.payout.findMany({
      where,
      take: filters?.limit || 100,
      orderBy: { created_at: 'desc' },
    });

    // Berechne Differenzen (Stub - in Produktion würde hier Stripe API verglichen)
    return payouts.map((p) => ({
      id: p.id,
      amount_cents: p.amountCents,
      currency: p.currency,
      status: p.status,
      diff: 0, // TODO: Tatsächliche Differenz berechnen
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      stripe_transfer_id: p.stripeTransferId,
      user_id: p.userId,
      company_id: p.companyId,
    }));
  }

  /**
   * Markiert einen Payout manuell
   */
  async markPayout(
    payoutId: string,
    payload: { status: 'resolved' | 'needs_review'; note?: string },
    actorId: string
  ): Promise<{ ok: boolean; payout: any; event: any }> {
    return await this.prisma.$transaction(async (tx) => {
      // Payout laden
      const payout = await tx.payout.findUnique({
        where: { id: payoutId },
      });

      if (!payout) {
        throw new Error(`Payout ${payoutId} not found`);
      }

      // Neuen Status bestimmen
      const newStatus = payload.status === 'resolved' ? 'paid' : payout.status;

      // Payout aktualisieren
      const updatedPayout = await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: newStatus,
          metadata: {
            ...(payout.metadata as any),
            manuallyMarked: true,
            markedBy: actorId,
            markedAt: new Date().toISOString(),
            markNote: payload.note,
          },
          updatedAt: new Date(),
        },
      });

      // Event erstellen
      const event = await tx.payoutEvent.create({
        data: {
          payoutId,
          type: 'manual_mark',
          payload: {
            previousStatus: payout.status,
            newStatus,
            markStatus: payload.status,
            note: payload.note,
            actorId,
          },
          createdAt: new Date(),
        },
      });

      // Audit Event
      await tx.auditEvent.create({
        data: {
          action: 'reconciliation.mark',
          entityType: 'payout',
          entityId: payoutId,
          actorId,
          metadata: payload,
          createdAt: new Date(),
        },
      });

      this.logger.log(
        `Payout ${payoutId} marked as ${payload.status} by ${actorId}`
      );

      return {
        ok: true,
        payout: {
          id: updatedPayout.id,
          status: updatedPayout.status,
          updated_at: updatedPayout.updatedAt,
        },
        event: {
          id: event.id,
          type: event.type,
          created_at: event.createdAt,
        },
      };
    });
  }

  /**
   * Führt Reconciliation durch und vergleicht mit Stripe
   */
  async runReconciliation(): Promise<{
    processed: number;
    diffs: ReconciliationDiff[];
    errors: string[];
  }> {
    this.logger.log('Starting reconciliation run...');

    const result = {
      processed: 0,
      diffs: [] as ReconciliationDiff[],
      errors: [] as string[],
    };

    try {
      // Offene Payouts laden
      const openPayouts = await this.listOpenPayouts({ limit: 1000 });
      result.processed = openPayouts.length;

      this.logger.log(`Found ${openPayouts.length} open payouts`);

      // TODO: Stripe API Vergleich
      // Für jeden Payout: Stripe Transfer Status abfragen und vergleichen
      // Bei Differenz: payout_event erstellen

      for (const payout of openPayouts) {
        // Stub: Hier würde der Stripe API Call stehen
        // const stripeTransfer = await stripe.transfers.retrieve(payout.stripe_transfer_id);
      }

      this.logger.log(
        `Reconciliation complete: ${result.processed} processed, ${result.diffs.length} diffs found`
      );
    } catch (error) {
      this.logger.error('Reconciliation failed:', error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Generiert Reconciliation Report
   */
  async generateReport(): Promise<{
    total_open: number;
    total_amount_cents: number;
    by_status: Record<string, number>;
    diffs_found: number;
    generated_at: Date;
  }> {
    const openPayouts = await this.listOpenPayouts();

    const byStatus: Record<string, number> = {};
    let totalAmount = 0;
    let diffsFound = 0;

    for (const payout of openPayouts) {
      byStatus[payout.status] = (byStatus[payout.status] || 0) + 1;
      totalAmount += payout.amount_cents;
      if (payout.diff !== 0) diffsFound++;
    }

    return {
      total_open: openPayouts.length,
      total_amount_cents: totalAmount,
      by_status: byStatus,
      diffs_found: diffsFound,
      generated_at: new Date(),
    };
  }

  /**
   * Cleanup beim Beenden
   */
  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
