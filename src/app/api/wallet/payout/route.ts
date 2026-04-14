// ============================================
// CARGOBIT WALLET PAYOUT API
// Beispiel: Shipper will 50.000€ auszahlen lassen
// Demonstriert YELLOW-Flag Scenario mit Mitigations
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  performHybridSecurityCheck,
  SecurityContext,
  ActionContext,
} from '@/lib/hybrid-security';
import { logAuditEvent } from '@/lib/permissions';

// ============================================
// INTERFACES
// ============================================

interface PayoutRequest {
  amount: number;
  currency: string;
  payoutMethodId: string;
  description?: string;
}

interface PayoutResponse {
  success: boolean;
  message: string;
  payoutId?: string;
  status?: 'PENDING' | 'DELAYED' | 'PROCESSING' | 'COMPLETED' | 'BLOCKED';
  availableAt?: Date; // For delayed payouts
  riskAnalysis?: {
    score: number;
    level: string;
    userScore: number;
    companyScore: number;
    transactionScore: number;
    factors: string[];
  };
  mitigations?: string[];
}

// ============================================
// POST /api/wallet/payout
//
// Beispiel-Szenario aus Spec:
// Shipper akzeptiert Angebot über 50.000€
// - KYB fehlt → +20
// - Hoher Betrag → +20
// - Neue IBAN → +15
// - CombinedRiskScore = 55 → GELB → Allow mit 24h Delay + Logging
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: PayoutRequest = await request.json();

    // Validate amount
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Ungültiger Auszahlungsbetrag',
        code: 'INVALID_AMOUNT',
      }, { status: 400 });
    }

    // Auth validation
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({
        error: 'UnauthorizedError',
        message: 'Authentifizierung erforderlich',
        code: 'AUTH_REQUIRED',
      }, { status: 401 });
    }

    // Get user with wallet and payout method
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        companyUsers: { include: { company: true } },
        securityFlags: { where: { active: true } },
        wallet: {
          include: {
            payoutMethods: true,
            transactions: {
              where: {
                type: 'DEPOSIT',
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!user || !user.wallet) {
      return NextResponse.json({
        error: 'NotFoundError',
        message: 'Wallet nicht gefunden',
        code: 'WALLET_NOT_FOUND',
      }, { status: 404 });
    }

    // Check wallet balance
    if (user.wallet.balance < body.amount) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Unzureichendes Guthaben',
        code: 'INSUFFICIENT_BALANCE',
        available: user.wallet.balance,
      }, { status: 400 });
    }

    // Get payout method
    const payoutMethod = user.wallet.payoutMethods.find(pm => pm.id === body.payoutMethodId);
    if (!payoutMethod) {
      return NextResponse.json({
        error: 'NotFoundError',
        message: 'Auszahlungsmethode nicht gefunden',
        code: 'PAYOUT_METHOD_NOT_FOUND',
      }, { status: 404 });
    }

    // ============================================
    // BUILD SECURITY CONTEXT
    // ============================================
    const securityContext: SecurityContext = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map(ur => ur.role.name as any),
      companyId: user.companyUsers[0]?.companyId,
      companyRole: user.companyUsers[0]?.roleInCompany as any,
      isVerified: user.status === 'ACTIVE',
      riskScore: user.securityFlags.filter(f => f.severity === 'CRITICAL').length * 25 +
                 user.securityFlags.filter(f => f.severity === 'HIGH').length * 15,
      activeSecurityFlags: user.securityFlags.length,
    };

    // ============================================
    // BUILD ACTION CONTEXT WITH RISK FACTORS
    // ============================================
    
    // Check if IBAN is new (< 48h)
    const ibanAge = Date.now() - payoutMethod.createdAt.getTime();
    const isNewIban = ibanAge < 48 * 60 * 60 * 1000;

    // Check for recent deposit (rapid payout)
    const hasRecentDeposit = user.wallet.transactions.some(t => 
      t.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    // Check KYB status for companies
    let kybMissing = false;
    if (securityContext.companyId) {
      const kyb = await db.verification.findFirst({
        where: {
          type: 'KYB',
          status: 'APPROVED',
        },
      });
      kybMissing = !kyb;
    }

    const actionContext: ActionContext = {
      action: 'INITIATE_PAYOUT',
      resourceType: 'wallet',
      resourceId: user.wallet.id,
      transactionContext: {
        amount: body.amount,
        currency: body.currency || 'EUR',
        isNewIban,
      },
    };

    // ============================================
    // HYBRID SECURITY CHECK
    // ============================================
    const securityResult = await performHybridSecurityCheck(securityContext, actionContext);

    // Log the attempt
    console.log('[PAYOUT] Security Check Result:', {
      action: 'INITIATE_PAYOUT',
      userId: securityContext.userId,
      amount: body.amount,
      isNewIban,
      kybMissing,
      riskScore: securityResult.riskCheck?.score,
      riskLevel: securityResult.riskCheck?.level,
      factors: securityResult.riskCheck?.factors,
      allowed: securityResult.permissionCheck.allowed,
    });

    // ============================================
    // HANDLE RED BLOCK
    // ============================================
    if (!securityResult.permissionCheck.allowed) {
      return NextResponse.json<PayoutResponse>({
        success: false,
        message: 'Auszahlung vorübergehend gesperrt. Bitte kontaktieren Sie den Support.',
        status: 'BLOCKED',
        riskAnalysis: {
          score: securityResult.riskCheck?.score || 0,
          level: securityResult.riskCheck?.level || 'RED',
          userScore: securityResult.riskCheck?.userScore || 0,
          companyScore: securityResult.riskCheck?.companyScore || 0,
          transactionScore: securityResult.riskCheck?.transactionScore || 0,
          factors: securityResult.riskCheck?.factors || [],
        },
      }, { status: 403 });
    }

    // ============================================
    // HANDLE YELLOW WITH MITIGATIONS
    // ============================================
    let status: PayoutResponse['status'] = 'PENDING';
    let availableAt: Date | undefined;
    let mitigations: string[] = [];

    if (securityResult.riskCheck?.level === 'YELLOW' && securityResult.mitigations) {
      status = 'DELAYED';
      mitigations = securityResult.mitigations.requiredActions;
      
      // Apply 24h delay
      if (securityResult.mitigations.delayUntil) {
        availableAt = securityResult.mitigations.delayUntil;
      } else {
        availableAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      // Check if 2FA is required
      if (securityResult.mitigations.requires2FA) {
        return NextResponse.json({
          success: false,
          message: '2FA-Verifizierung erforderlich',
          code: 'REQUIRES_2FA',
          mitigations,
        }, { status: 202 });
      }
    }

    // ============================================
    // CREATE PAYOUT TRANSACTION
    // ============================================
    const payoutTransaction = await db.walletTransaction.create({
      data: {
        walletId: user.wallet.id,
        type: 'PAYOUT',
        amount: -body.amount,
        currency: body.currency || 'EUR',
        description: body.description || 'Auszahlung',
        processedAt: status === 'DELAYED' ? null : new Date(),
      },
    });

    // Update wallet balance
    await db.wallet.update({
      where: { id: user.wallet.id },
      data: {
        balance: { decrement: body.amount },
        totalWithdrawn: { increment: body.amount },
      },
    });

    // Create delayed payout record if applicable
    if (status === 'DELAYED' && availableAt) {
      await db.$executeRaw`
        INSERT INTO delayed_payouts (
          transaction_id, 
          user_id, 
          amount, 
          currency, 
          payout_method_id,
          available_at, 
          status, 
          created_at
        ) VALUES (
          ${payoutTransaction.id},
          ${userId},
          ${body.amount},
          ${body.currency || 'EUR'},
          ${body.payoutMethodId},
          ${availableAt},
          'PENDING',
          ${new Date()}
        )
      `;
    }

    // Log successful action
    await logAuditEvent({
      userId,
      action: 'PAYOUT',
      entityType: 'wallet',
      entityId: user.wallet.id,
      dataBefore: { balance: user.wallet.balance },
      dataAfter: {
        payoutAmount: body.amount,
        status,
        availableAt,
        riskScore: securityResult.riskCheck?.score,
        riskLevel: securityResult.riskCheck?.level,
        mitigations,
      },
    });

    // Notify user
    await db.notification.create({
      data: {
        userId,
        type: 'PAYOUT_INITIATED',
        title: status === 'DELAYED' 
          ? 'Auszahlung verzögert' 
          : 'Auszahlung eingeleitet',
        message: status === 'DELAYED'
          ? `Ihre Auszahlung von ${body.amount.toLocaleString()} ${body.currency || 'EUR'} wird am ${availableAt?.toLocaleDateString('de-DE')} bearbeitet.`
          : `Ihre Auszahlung von ${body.amount.toLocaleString()} ${body.currency || 'EUR'} wurde eingeleitet.`,
        data: JSON.stringify({
          payoutId: payoutTransaction.id,
          amount: body.amount,
          status,
          availableAt,
        }),
      },
    });

    // ============================================
    // BUILD RESPONSE
    // ============================================
    const response: PayoutResponse = {
      success: true,
      message: status === 'DELAYED'
        ? `Auszahlung wird am ${availableAt?.toLocaleDateString('de-DE')} bearbeitet.`
        : 'Auszahlung erfolgreich eingeleitet.',
      payoutId: payoutTransaction.id,
      status,
      availableAt,
      riskAnalysis: securityResult.riskCheck ? {
        score: securityResult.riskCheck.score,
        level: securityResult.riskCheck.level,
        userScore: securityResult.riskCheck.userScore,
        companyScore: securityResult.riskCheck.companyScore,
        transactionScore: securityResult.riskCheck.transactionScore,
        factors: securityResult.riskCheck.factors,
      } : undefined,
      mitigations,
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: status === 'DELAYED' ? {
        'X-Payout-Status': 'DELAYED',
        'X-Available-At': availableAt?.toISOString() || '',
        'X-Mitigations': mitigations.join('; '),
      } : undefined,
    });

  } catch (error) {
    console.error('Payout error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Fehler bei der Auszahlung',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
