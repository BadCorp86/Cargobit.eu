// ============================================
// CARGOBIT ADMIN PAYOUTS API
// Task 3.1 Payouts - Create / List
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext, logAuditEvent } from '@/lib/permissions';
import { PayoutStatus } from '@prisma/client';

// ============================================
// INTERFACES
// ============================================

interface PayoutCreateRequest {
  userId: string;
  amountCents: number;
  currency?: string;
  idempotencyKey?: string;
  payoutMethodId?: string;
  description?: string;
}

interface PayoutSummaryResponse {
  id: string;
  userId: string;
  userName?: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: Date;
  stripeTransferId?: string;
  ibanLast4?: string;
}

// ============================================
// GET /api/admin/payouts - List Payouts
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Auth check - require admin or finance role
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PayoutStatus | null;
    const userId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (userId) {
      where.userId = userId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Execute query
    const [payouts, total] = await Promise.all([
      db.payout.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.payout.count({ where }),
    ]);

    // Format response
    const response: PayoutSummaryResponse[] = payouts.map(p => ({
      id: p.id,
      userId: p.userId,
      userName: p.user.firstName && p.user.lastName 
        ? `${p.user.firstName} ${p.user.lastName}` 
        : p.user.email,
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt,
      stripeTransferId: p.stripeTransferId || undefined,
      ibanLast4: p.ibanLast4 || undefined,
    }));

    return NextResponse.json({
      success: true,
      data: response,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('List payouts error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Fehler beim Abrufen der Auszahlungen',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

// ============================================
// POST /api/admin/payouts - Create Payout
// ============================================

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: PayoutCreateRequest = await request.json();

    // Validate required fields
    if (!body.userId) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'userId ist erforderlich',
        code: 'MISSING_USER_ID',
      }, { status: 400 });
    }

    if (!body.amountCents || body.amountCents < 100) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Mindestbetrag ist 1,00 € (100 cents)',
        code: 'INVALID_AMOUNT',
      }, { status: 400 });
    }

    // Max amount check (100,000 €)
    if (body.amountCents > 10000000) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Höchstbetrag ist 100.000 €',
        code: 'AMOUNT_TOO_HIGH',
      }, { status: 400 });
    }

    // Idempotency check
    if (body.idempotencyKey) {
      const existingPayout = await db.payout.findUnique({
        where: { idempotencyKey: body.idempotencyKey },
      });

      if (existingPayout) {
        // Return existing payout (idempotent response)
        return NextResponse.json({
          success: true,
          payout: {
            id: existingPayout.id,
            status: existingPayout.status,
            stripeTransferId: existingPayout.stripeTransferId,
            message: 'Auszahlung bereits vorhanden (Idempotency)',
          },
        });
      }
    }

    // Get user with wallet
    const user = await db.user.findUnique({
      where: { id: body.userId },
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
    });

    if (!user) {
      return NextResponse.json({
        error: 'NotFoundError',
        message: 'Benutzer nicht gefunden',
        code: 'USER_NOT_FOUND',
      }, { status: 404 });
    }

    if (!user.wallet) {
      return NextResponse.json({
        error: 'NotFoundError',
        message: 'Wallet nicht gefunden',
        code: 'WALLET_NOT_FOUND',
      }, { status: 404 });
    }

    // Check wallet balance (amount is in cents, wallet.balance is in EUR)
    const walletBalanceCents = Math.round(user.wallet.balance * 100);
    if (walletBalanceCents < body.amountCents) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Unzureichendes Guthaben',
        code: 'INSUFFICIENT_BALANCE',
        available: user.wallet.balance,
        requested: body.amountCents / 100,
      }, { status: 400 });
    }

    // Determine payout method
    let payoutMethod = null;
    if (body.payoutMethodId) {
      payoutMethod = user.wallet.payoutMethods.find(pm => pm.id === body.payoutMethodId);
      if (!payoutMethod) {
        return NextResponse.json({
          error: 'NotFoundError',
          message: 'Auszahlungsmethode nicht gefunden',
          code: 'PAYOUT_METHOD_NOT_FOUND',
        }, { status: 404 });
      }
    } else {
      // Use default payout method
      payoutMethod = user.wallet.payoutMethods.find(pm => pm.isDefault) || user.wallet.payoutMethods[0];
    }

    // Calculate risk score
    const criticalFlags = user.securityFlags.filter(f => f.severity === 'CRITICAL').length;
    const highFlags = user.securityFlags.filter(f => f.severity === 'HIGH').length;
    const riskScore = Math.min(100, (criticalFlags * 25) + (highFlags * 15));
    const riskLevel = riskScore >= 75 ? 'red' : riskScore >= 40 ? 'yellow' : 'green';

    // For high risk, require additional approval
    if (riskLevel === 'red') {
      return NextResponse.json({
        error: 'RiskError',
        message: 'Auszahlung aufgrund von Sicherheitsmarkierungen blockiert. Bitte Support kontaktieren.',
        code: 'RISK_BLOCKED',
        riskScore,
        riskLevel,
      }, { status: 403 });
    }

    // Create payout with transaction
    const payout = await db.$transaction(async (tx) => {
      // Create payout record
      const newPayout = await tx.payout.create({
        data: {
          userId: body.userId,
          amountCents: body.amountCents,
          currency: body.currency || 'EUR',
          status: PayoutStatus.PROCESSING,
          idempotencyKey: body.idempotencyKey,
          payoutMethodId: payoutMethod?.id,
          ibanLast4: payoutMethod?.iban.slice(-4),
          riskScore,
          riskLevel,
          createdBy: authContext.userId,
        },
      });

      // Create wallet transaction to reserve/debit funds
      await tx.walletTransaction.create({
        data: {
          walletId: user.wallet!.id,
          type: 'PAYOUT',
          amount: -body.amountCents / 100, // Negative for debit
          currency: body.currency || 'EUR',
          payoutId: newPayout.id,
          description: body.description || `Auszahlung ${newPayout.id}`,
          processedAt: new Date(),
        },
      });

      // Update wallet balance
      await tx.wallet.update({
        where: { id: user.wallet!.id },
        data: {
          balance: { decrement: body.amountCents / 100 },
          totalWithdrawn: { increment: body.amountCents / 100 },
        },
      });

      return newPayout;
    });

    // Log audit event
    await logAuditEvent({
      userId: authContext.userId,
      action: 'PAYOUT',
      entityType: 'payout',
      entityId: payout.id,
      dataBefore: { walletBalance: user.wallet.balance },
      dataAfter: {
        payoutId: payout.id,
        amount: body.amountCents / 100,
        status: payout.status,
        riskScore,
        riskLevel,
      },
    });

    // Create notification for user
    await db.notification.create({
      data: {
        userId: body.userId,
        type: 'PAYOUT_INITIATED',
        title: 'Auszahlung eingeleitet',
        message: `Ihre Auszahlung von ${(body.amountCents / 100).toLocaleString('de-DE')} ${body.currency || 'EUR'} wurde eingeleitet.`,
        data: JSON.stringify({
          payoutId: payout.id,
          amount: body.amountCents,
          status: payout.status,
        }),
      },
    });

    // In production: trigger Stripe transfer via webhook/queue
    // For now, simulate successful transfer
    const updatedPayout = await db.payout.update({
      where: { id: payout.id },
      data: {
        status: PayoutStatus.PAID,
        stripeTransferId: `tr_mock_${Date.now()}`,
        processedAt: new Date(),
        processedBy: authContext.userId,
      },
    });

    return NextResponse.json({
      success: true,
      payout: {
        id: updatedPayout.id,
        status: updatedPayout.status,
        amountCents: updatedPayout.amountCents,
        currency: updatedPayout.currency,
        stripeTransferId: updatedPayout.stripeTransferId,
        createdAt: updatedPayout.createdAt,
        processedAt: updatedPayout.processedAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Create payout error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Fehler beim Erstellen der Auszahlung',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
