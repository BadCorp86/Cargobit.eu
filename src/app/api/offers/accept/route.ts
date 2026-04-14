// ============================================
// CARGOBIT OFFER ACCEPT API
// Demonstrates Hybrid Security Layer
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  SecurityContext,
  ActionContext,
  performHybridSecurityCheck,
} from '@/lib/hybrid-security';
import { logAuditEvent } from '@/lib/permissions';

// ============================================
// INTERFACES
// ============================================

interface AcceptOfferRequest {
  offerId: string;
  transportId: string;
}

interface AcceptOfferResponse {
  success: boolean;
  message: string;
  transportId?: string;
  assignmentId?: string;
  riskLevel?: string;
  securityFlags?: string[];
}

interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  riskScore?: number;
  riskLevel?: string;
  factors?: string[];
}

// ============================================
// POST /api/offers/accept
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: AcceptOfferRequest = await request.json();

    // Validate request
    if (!body.offerId || !body.transportId) {
      return NextResponse.json<ErrorResponse>({
        error: 'ValidationError',
        message: 'offerId und transportId sind erforderlich',
        code: 'MISSING_FIELDS',
      }, { status: 400 });
    }

    // Get auth context from request headers
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json<ErrorResponse>({
        error: 'UnauthorizedError',
        message: 'Authentifizierung erforderlich',
        code: 'AUTH_REQUIRED',
      }, { status: 401 });
    }

    // Build security context
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        companyUsers: { include: { company: true } },
        securityFlags: { where: { active: true } },
      },
    });

    if (!user) {
      return NextResponse.json<ErrorResponse>({
        error: 'UnauthorizedError',
        message: 'Benutzer nicht gefunden',
        code: 'USER_NOT_FOUND',
      }, { status: 401 });
    }

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

    // Get offer and transport details
    const offer = await db.offer.findUnique({
      where: { id: body.offerId },
      include: {
        transport: {
          include: {
            pickupAddress: true,
            deliveryAddress: true,
            transportDetail: true,
          },
        },
        driver: true,
        vehicle: true,
      },
    });

    if (!offer) {
      return NextResponse.json<ErrorResponse>({
        error: 'NotFoundError',
        message: 'Angebot nicht gefunden',
        code: 'OFFER_NOT_FOUND',
      }, { status: 404 });
    }

    // Verify transport ownership
    if (offer.transportId !== body.transportId) {
      return NextResponse.json<ErrorResponse>({
        error: 'ValidationError',
        message: 'Angebot gehört nicht zum angegebenen Transport',
        code: 'OFFER_TRANSPORT_MISMATCH',
      }, { status: 400 });
    }

    // Verify user is shipper of this transport
    if (offer.transport.shipperUserId !== userId) {
      return NextResponse.json<ErrorResponse>({
        error: 'ForbiddenError',
        message: 'Sie sind nicht berechtigt, Angebote für diesen Transport anzunehmen',
        code: 'NOT_YOUR_TRANSPORT',
      }, { status: 403 });
    }

    // Build action context for hybrid security check
    const actionContext: ActionContext = {
      action: 'ACCEPT_OFFER',
      resourceType: 'offer',
      resourceId: body.offerId,
      transactionContext: {
        amount: offer.price,
        currency: offer.currency,
        isInternational: offer.transport.isInternational,
        isHazmat: offer.transport.transportDetail?.isHazmat || false,
      },
    };

    // ============================================
    // HYBRID SECURITY CHECK
    // Step 1: Permission Check (hard, binary)
    // Step 2: Risk Scoring (dynamic, context-sensitive)
    // ============================================

    const securityResult = await performHybridSecurityCheck(securityContext, actionContext);

    // Handle blocked request
    if (!securityResult.permissionCheck.allowed) {
      // Log blocked attempt
      await logAuditEvent({
        userId: user.id,
        action: 'OFFER_ACCEPT_BLOCKED',
        entityType: 'offer',
        entityId: body.offerId,
        dataBefore: { offerId: body.offerId, transportId: body.transportId },
        dataAfter: securityResult,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json<ErrorResponse>({
        error: 'ForbiddenError',
        message: securityResult.permissionCheck.reason || 'Aktion blockiert',
        code: securityResult.permissionCheck.code,
        riskScore: securityResult.permissionCheck.riskScore,
        riskLevel: securityResult.permissionCheck.riskLevel,
        factors: securityResult.permissionCheck.riskFactors,
      }, { status: 403 });
    }

    // Yellow flag: Log warning but proceed
    if (securityResult.riskCheck?.level === 'YELLOW') {
      console.log(`[SECURITY] Yellow flag for offer ${body.offerId} by user ${userId}:`, {
        score: securityResult.riskCheck.score,
        factors: securityResult.riskCheck.factors,
      });
    }

    // ============================================
    // PROCESS OFFER ACCEPTANCE
    // ============================================

    // Check if transport can accept offers
    if (!['CREATED', 'PUBLISHED'].includes(offer.transport.status)) {
      return NextResponse.json<ErrorResponse>({
        error: 'ValidationError',
        message: 'Transport kann keine Angebote mehr annehmen',
        code: 'TRANSPORT_NOT_ACCEPTING',
      }, { status: 400 });
    }

    // Check if offer is still valid
    if (offer.status !== 'PENDING') {
      return NextResponse.json<ErrorResponse>({
        error: 'ValidationError',
        message: `Angebot ist bereits ${offer.status.toLowerCase()}`,
        code: 'OFFER_NOT_PENDING',
      }, { status: 400 });
    }

    // Create assignment
    const assignment = await db.assignment.create({
      data: {
        transportId: offer.transportId,
        driverId: offer.driverId,
        vehicleId: offer.vehicleId,
        assignedBy: userId,
      },
    });

    // Update offer status
    await db.offer.update({
      where: { id: body.offerId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    // Update transport status
    await db.transport.update({
      where: { id: body.transportId },
      data: {
        status: 'ASSIGNED',
        assignedAt: new Date(),
        agreedPrice: offer.price,
      },
    });

    // Reject other pending offers for this transport
    await db.offer.updateMany({
      where: {
        transportId: body.transportId,
        status: 'PENDING',
        id: { not: body.offerId },
      },
      data: {
        status: 'REJECTED',
        rejectionReason: 'Anderes Angebot angenommen',
        rejectedAt: new Date(),
      },
    });

    // Reserve funds from shipper wallet
    const shipperWallet = await db.wallet.findFirst({
      where: { ownerUserId: userId },
    });

    if (shipperWallet && offer.price) {
      // Create escrow transaction
      await db.walletTransaction.create({
        data: {
          walletId: shipperWallet.id,
          type: 'PAYMENT_OUT',
          amount: offer.price,
          currency: offer.currency,
          relatedTransportId: offer.transportId,
          description: `Escrow für Transport ${offer.transportId}`,
        },
      });

      // Update wallet balance
      await db.wallet.update({
        where: { id: shipperWallet.id },
        data: {
          balance: { decrement: offer.price },
        },
      });
    }

    // Log successful action
    await logAuditEvent({
      userId: user.id,
      action: 'OFFER_ACCEPT',
      entityType: 'offer',
      entityId: body.offerId,
      dataBefore: { offerStatus: offer.status },
      dataAfter: { 
        assignmentId: assignment.id,
        transportStatus: 'ASSIGNED',
        riskScore: securityResult.riskCheck?.score,
        riskLevel: securityResult.riskCheck?.level,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Create notification for driver
    await db.notification.create({
      data: {
        userId: offer.driver.userId,
        type: 'OFFER_ACCEPTED',
        title: 'Angebot angenommen!',
        message: `Ihr Angebot für Transport ${offer.transportId} wurde angenommen.`,
        data: JSON.stringify({ 
          transportId: offer.transportId, 
          assignmentId: assignment.id,
          price: offer.price,
        }),
      },
    });

    // Build response
    const response: AcceptOfferResponse = {
      success: true,
      message: 'Angebot erfolgreich angenommen',
      transportId: offer.transportId,
      assignmentId: assignment.id,
      riskLevel: securityResult.riskCheck?.level,
    };

    // Add warning header for yellow flag
    const headers: Record<string, string> = {};
    if (securityResult.riskCheck?.level === 'YELLOW') {
      headers['X-Security-Warning'] = 'elevated_risk';
      headers['X-Risk-Score'] = String(securityResult.riskCheck.score);
      response.securityFlags = securityResult.riskCheck.factors;
    }

    return NextResponse.json(response, { 
      status: 200,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

  } catch (error) {
    console.error('Offer accept error:', error);
    return NextResponse.json<ErrorResponse>({
      error: 'InternalServerError',
      message: 'Fehler beim Annehmen des Angebots',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
