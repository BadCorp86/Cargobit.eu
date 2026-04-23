// ============================================
// CARGOBIT ADMIN PAYOUTS DETAIL API
// Task 3.1 Payouts - Detail View
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/permissions';

// ============================================
// GET /api/admin/payouts/[id] - Get Payout Detail
// ============================================

export async function GET(
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

    // Get payout with all related data
    const payout = await db.payout.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            securityFlags: {
              where: { active: true },
              select: {
                id: true,
                type: true,
                severity: true,
                notes: true,
                createdAt: true,
              },
            },
          },
        },
        walletTransactions: {
          include: {
            wallet: {
              select: {
                id: true,
                balance: true,
                currency: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json({
        error: 'NotFoundError',
        message: 'Auszahlung nicht gefunden',
        code: 'PAYOUT_NOT_FOUND',
      }, { status: 404 });
    }

    // Get audit trail for this payout
    const auditTrail = await db.auditLog.findMany({
      where: {
        entityType: 'payout',
        entityId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Format response
    const response = {
      payout: {
        id: payout.id,
        amountCents: payout.amountCents,
        amountEur: payout.amountCents / 100,
        currency: payout.currency,
        status: payout.status,
        createdAt: payout.createdAt,
        updatedAt: payout.updatedAt,
        
        // Stripe info
        stripeTransferId: payout.stripeTransferId,
        stripeAccountId: payout.stripeAccountId,
        
        // Error info
        failureReason: payout.failureReason,
        retryCount: payout.retryCount,
        lastRetryAt: payout.lastRetryAt,
        
        // Idempotency
        idempotencyKey: payout.idempotencyKey,
        
        // Payout method
        payoutMethodId: payout.payoutMethodId,
        ibanLast4: payout.ibanLast4,
        
        // Risk assessment
        riskScore: payout.riskScore,
        riskLevel: payout.riskLevel,
        riskFactors: payout.riskFactors ? JSON.parse(payout.riskFactors) : [],
        
        // Delay
        delayedUntil: payout.delayedUntil,
        delayReason: payout.delayReason,
        
        // Processing
        createdBy: payout.createdBy,
        processedBy: payout.processedBy,
        processedAt: payout.processedAt,
      },
      user: {
        id: payout.user.id,
        email: payout.user.email,
        name: payout.user.firstName && payout.user.lastName 
          ? `${payout.user.firstName} ${payout.user.lastName}` 
          : null,
        phone: payout.user.phone,
        status: payout.user.status,
        activeSecurityFlags: payout.user.securityFlags.length,
        securityFlags: payout.user.securityFlags,
      },
      walletTransactions: payout.walletTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        amountEur: Math.abs(tx.amount),
        currency: tx.currency,
        description: tx.description,
        reference: tx.reference,
        processedAt: tx.processedAt,
        failedAt: tx.failedAt,
        failureReason: tx.failureReason,
        wallet: tx.wallet,
      })),
      auditTrail: auditTrail.map(log => ({
        id: log.id,
        action: log.action,
        createdAt: log.createdAt,
        dataBefore: log.dataBefore ? JSON.parse(log.dataBefore) : null,
        dataAfter: log.dataAfter ? JSON.parse(log.dataAfter) : null,
        ipAddress: log.ipAddress,
      })),
    };

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error('Get payout detail error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Fehler beim Abrufen der Auszahlung',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

// ============================================
// DELETE /api/admin/payouts/[id] - Cancel Payout
// ============================================

export async function DELETE(
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

    const hasRole = authContext.roles.some(role => role === 'ADMIN');

    if (!hasRole) {
      return NextResponse.json({
        error: 'ForbiddenError',
        message: 'Admin-Rolle erforderlich',
        code: 'INSUFFICIENT_ROLE',
      }, { status: 403 });
    }

    const { id } = await params;

    // Get payout
    const payout = await db.payout.findUnique({
      where: { id },
      include: {
        walletTransactions: true,
      },
    });

    if (!payout) {
      return NextResponse.json({
        error: 'NotFoundError',
        message: 'Auszahlung nicht gefunden',
        code: 'PAYOUT_NOT_FOUND',
      }, { status: 404 });
    }

    // Check if payout can be cancelled
    if (!['PENDING', 'PROCESSING', 'FAILED'].includes(payout.status)) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Nur ausstehende, in Bearbeitung befindliche oder fehlgeschlagene Auszahlungen können storniert werden',
        code: 'CANNOT_CANCEL',
      }, { status: 400 });
    }

    // Cancel payout and reverse wallet transaction
    const result = await db.$transaction(async (tx) => {
      // Update payout status
      const updatedPayout = await tx.payout.update({
        where: { id },
        data: {
          status: 'CANCELLED' as any,
          failureReason: 'Manuell storniert',
        },
      });

      // Reverse the wallet debit if payout was not yet paid
      if (payout.status !== 'PAID') {
        const walletTx = payout.walletTransactions[0];
        if (walletTx) {
          // Create reversal transaction
          await tx.walletTransaction.create({
            data: {
              walletId: walletTx.walletId,
              type: 'REFUND',
              amount: Math.abs(walletTx.amount), // Positive amount (credit)
              currency: walletTx.currency,
              payoutId: id,
              description: `Stornierung Auszahlung ${id}`,
              processedAt: new Date(),
            },
          });

          // Restore wallet balance
          await tx.wallet.update({
            where: { id: walletTx.walletId },
            data: {
              balance: { increment: Math.abs(walletTx.amount) },
              totalWithdrawn: { decrement: Math.abs(walletTx.amount) },
            },
          });
        }
      }

      return updatedPayout;
    });

    // Log audit event
    await db.auditLog.create({
      data: {
        userId: authContext.userId,
        action: 'PAYOUT',
        entityType: 'payout',
        entityId: id,
        dataBefore: JSON.stringify({ status: payout.status }),
        dataAfter: JSON.stringify({ status: 'CANCELLED', reason: 'Manually cancelled by admin' }),
      },
    });

    // Notify user
    await db.notification.create({
      data: {
        userId: payout.userId,
        type: 'PAYOUT_CANCELLED',
        title: 'Auszahlung storniert',
        message: `Ihre Auszahlung über ${(payout.amountCents / 100).toLocaleString('de-DE')} ${payout.currency} wurde storniert.`,
        data: JSON.stringify({
          payoutId: id,
          amount: payout.amountCents,
          reason: 'Manuell storniert',
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Auszahlung erfolgreich storniert',
      payout: {
        id: result.id,
        status: result.status,
      },
    });

  } catch (error) {
    console.error('Cancel payout error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Fehler beim Stornieren der Auszahlung',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
