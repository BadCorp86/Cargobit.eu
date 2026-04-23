// ============================================
// CARGOBIT ADMIN PAYOUTS RETRY API
// Task 3.1 Payouts - Retry Failed Payout
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext, logAuditEvent } from '@/lib/permissions';
import { PayoutStatus } from '@prisma/client';

// ============================================
// POST /api/admin/payouts/[id]/retry - Retry Failed Payout
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({
        error: 'UnauthorizedError',
        message: 'Authentifizierung erforderlich',
        code: 'AUTH_REQUIRED',
      }, { status: 401 });
    }

    const hasRole = authContext.roles.some(role => 
      ['ADMIN', 'SUPPORT'].includes(role)
    );

    if (!hasRole) {
      return NextResponse.json({
        error: 'ForbiddenError',
        message: 'Admin oder Support-Rolle erforderlich',
        code: 'INSUFFICIENT_ROLE',
      }, { status: 403 });
    }

    const { id } = await params;

    // Get the failed payout
    const failedPayout = await db.payout.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            wallet: {
              include: {
                payoutMethods: true,
              },
            },
            securityFlags: {
              where: { active: true },
            },
          },
        },
        walletTransactions: true,
      },
    });

    if (!failedPayout) {
      return NextResponse.json({
        error: 'NotFoundError',
        message: 'Auszahlung nicht gefunden',
        code: 'PAYOUT_NOT_FOUND',
      }, { status: 404 });
    }

    // Check if payout can be retried
    if (failedPayout.status !== 'FAILED') {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Nur fehlgeschlagene Auszahlungen können wiederholt werden',
        code: 'NOT_FAILED',
        currentStatus: failedPayout.status,
      }, { status: 400 });
    }

    // Check max retry count
    if (failedPayout.retryCount >= 3) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Maximale Anzahl an Wiederholungen erreicht (3)',
        code: 'MAX_RETRIES_EXCEEDED',
        retryCount: failedPayout.retryCount,
      }, { status: 400 });
    }

    // Check if user still has sufficient balance
    const user = failedPayout.user;
    if (!user.wallet) {
      return NextResponse.json({
        error: 'NotFoundError',
        message: 'Wallet nicht gefunden',
        code: 'WALLET_NOT_FOUND',
      }, { status: 404 });
    }

    const walletBalanceCents = Math.round(user.wallet.balance * 100);
    
    // For retry, we need to check if the funds were already reversed
    // If not, we need to debit again; if yes, we can proceed
    const originalDebit = failedPayout.walletTransactions.find(tx => tx.amount < 0);
    const wasReversed = await db.walletTransaction.findFirst({
      where: {
        payoutId: id,
        type: 'REFUND',
      },
    });

    // If not reversed and insufficient balance, fail
    if (!wasReversed && walletBalanceCents < failedPayout.amountCents) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Unzureichendes Guthaben für Wiederholung',
        code: 'INSUFFICIENT_BALANCE',
        available: user.wallet.balance,
        required: failedPayout.amountCents / 100,
      }, { status: 400 });
    }

    // Calculate risk score
    const criticalFlags = user.securityFlags.filter(f => f.severity === 'CRITICAL').length;
    const highFlags = user.securityFlags.filter(f => f.severity === 'HIGH').length;
    const riskScore = Math.min(100, (criticalFlags * 25) + (highFlags * 15));
    const riskLevel = riskScore >= 75 ? 'red' : riskScore >= 40 ? 'yellow' : 'green';

    // Block high risk
    if (riskLevel === 'red') {
      return NextResponse.json({
        error: 'RiskError',
        message: 'Auszahlung aufgrund von Sicherheitsmarkierungen blockiert',
        code: 'RISK_BLOCKED',
        riskScore,
        riskLevel,
      }, { status: 403 });
    }

    // Generate new idempotency key for retry
    const newIdempotencyKey = `retry_${id}_${Date.now()}`;

    // Execute retry
    const result = await db.$transaction(async (tx) => {
      // Update the failed payout with new status and retry info
      const updatedPayout = await tx.payout.update({
        where: { id },
        data: {
          status: PayoutStatus.PROCESSING,
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          failureReason: null, // Clear previous failure reason
          idempotencyKey: newIdempotencyKey,
          riskScore,
          riskLevel,
          processedBy: authContext.userId,
        },
      });

      // If the original debit was reversed, we need to debit again
      if (wasReversed) {
        await tx.walletTransaction.create({
          data: {
            walletId: user.wallet!.id,
            type: 'PAYOUT',
            amount: -failedPayout.amountCents / 100,
            currency: failedPayout.currency,
            payoutId: id,
            description: `Wiederholung Auszahlung ${id}`,
            processedAt: new Date(),
          },
        });

        await tx.wallet.update({
          where: { id: user.wallet!.id },
          data: {
            balance: { decrement: failedPayout.amountCents / 100 },
          },
        });
      }

      return updatedPayout;
    });

    // Log audit event
    await logAuditEvent({
      userId: authContext.userId,
      action: 'PAYOUT',
      entityType: 'payout',
      entityId: id,
      dataBefore: { 
        status: 'FAILED',
        retryCount: failedPayout.retryCount,
        failureReason: failedPayout.failureReason,
      },
      dataAfter: {
        status: 'PROCESSING',
        retryCount: result.retryCount,
        idempotencyKey: newIdempotencyKey,
      },
    });

    // In production: trigger Stripe transfer via webhook/queue
    // For now, simulate successful transfer
    const completedPayout = await db.payout.update({
      where: { id },
      data: {
        status: PayoutStatus.PAID,
        stripeTransferId: `tr_retry_${Date.now()}`,
        processedAt: new Date(),
      },
    });

    // Notify user
    await db.notification.create({
      data: {
        userId: failedPayout.userId,
        type: 'PAYOUT_RETRY',
        title: 'Auszahlung wiederholt',
        message: `Ihre Auszahlung über ${(failedPayout.amountCents / 100).toLocaleString('de-DE')} ${failedPayout.currency} wurde wiederholt und erfolgreich verarbeitet.`,
        data: JSON.stringify({
          payoutId: id,
          amount: failedPayout.amountCents,
          status: completedPayout.status,
          retryCount: result.retryCount,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Auszahlung erfolgreich wiederholt',
      payout: {
        id: completedPayout.id,
        status: completedPayout.status,
        amountCents: completedPayout.amountCents,
        currency: completedPayout.currency,
        stripeTransferId: completedPayout.stripeTransferId,
        retryCount: completedPayout.retryCount,
        processedAt: completedPayout.processedAt,
      },
    });

  } catch (error) {
    console.error('Retry payout error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Fehler beim Wiederholen der Auszahlung',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
