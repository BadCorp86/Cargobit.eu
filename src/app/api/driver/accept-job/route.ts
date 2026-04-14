// ============================================
// CARGOBIT DRIVER ACCEPT-JOB API
// Beispiel: Fahrer will internationalen Gefahrgut-Transport annehmen
// Demonstriert RED-Flag Scenario
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  performHybridSecurityCheck,
  SecurityContext,
  ActionContext,
  SecurityAction,
} from '@/lib/hybrid-security';
import { logAuditEvent } from '@/lib/permissions';

// ============================================
// INTERFACES
// ============================================

interface AcceptJobRequest {
  transportId: string;
  driverId: string;
  vehicleId: string;
}

interface AcceptJobResponse {
  success: boolean;
  message: string;
  assignmentId?: string;
  riskAnalysis?: {
    score: number;
    level: string;
    userScore: number;
    companyScore: number;
    transactionScore: number;
    factors: string[];
  };
}

// ============================================
// POST /api/driver/accept-job
// 
// Beispiel-Szenario aus Spec:
// Fahrer will internationalen Gefahrgut-Transport annehmen
// - ADR abgelaufen → +20
// - International + Tunnelcode kritisch → +20  
// - GPS 300km entfernt → +10
// - CombinedRiskScore = 65 → ROT → Block
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: AcceptJobRequest = await request.json();

    // Auth validation
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({
        error: 'UnauthorizedError',
        message: 'Authentifizierung erforderlich',
        code: 'AUTH_REQUIRED',
      }, { status: 401 });
    }

    // Get driver and transport details
    const driver = await db.driver.findUnique({
      where: { id: body.driverId },
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
            securityFlags: { where: { active: true } },
          },
        },
        driverVehicles: { include: { vehicle: true } },
      },
    });

    const transport = await db.transport.findUnique({
      where: { id: body.transportId },
      include: {
        transportDetail: true,
        pickupAddress: true,
        deliveryAddress: true,
      },
    });

    if (!driver || !transport) {
      return NextResponse.json({
        error: 'NotFoundError',
        message: 'Fahrer oder Transport nicht gefunden',
        code: 'NOT_FOUND',
      }, { status: 404 });
    }

    // Verify driver is the current user
    if (driver.userId !== userId) {
      return NextResponse.json({
        error: 'ForbiddenError',
        message: 'Sie können nur Aufträge für sich selbst annehmen',
        code: 'NOT_YOUR_DRIVER_PROFILE',
      }, { status: 403 });
    }

    // ============================================
    // BUILD SECURITY CONTEXT
    // ============================================
    const securityContext: SecurityContext = {
      userId: driver.user.id,
      email: driver.user.email,
      roles: driver.user.roles.map(ur => ur.role.name as any),
      companyId: driver.companyId || undefined,
      isVerified: driver.user.status === 'ACTIVE',
      riskScore: driver.user.securityFlags.filter(f => f.severity === 'CRITICAL').length * 25 +
                 driver.user.securityFlags.filter(f => f.severity === 'HIGH').length * 15,
      activeSecurityFlags: driver.user.securityFlags.length,
    };

    // ============================================
    // BUILD ACTION CONTEXT WITH RISK FACTORS
    // ============================================
    
    // Check ADR status
    const adrExpired = driver.adrExpiry ? new Date(driver.adrExpiry) < new Date() : false;
    
    // Parse tunnel codes from transport
    const tunnelCodes = transport.transportDetail?.detailsJson 
      ? JSON.parse(transport.transportDetail.detailsJson as string).tunnelCodes || []
      : [];
    
    // Critical tunnel codes: C/D, D, E
    const criticalTunnelCodes = ['C/D', 'D', 'E'];
    const hasCriticalTunnelCode = tunnelCodes.some((code: string) => criticalTunnelCodes.includes(code));

    // Check GPS distance (simplified - would normally use actual GPS)
    const driverLocation = driver.currentLocation 
      ? JSON.parse(driver.currentLocation)
      : null;
    
    // For demo: simulate 300km distance if driver location exists
    const gpsDistanceKm = driverLocation ? 300 : 0;

    const actionContext: ActionContext = {
      action: 'ACCEPT_JOB' as SecurityAction,
      resourceType: 'transport',
      resourceId: body.transportId,
      transactionContext: {
        amount: transport.agreedPrice || transport.shipperBudget || 0,
        currency: transport.currency,
        isInternational: transport.isInternational,
        isHazmat: transport.transportDetail?.isHazmat || false,
        tunnelCodes,
        adrExpired,
      },
    };

    // ============================================
    // HYBRID SECURITY CHECK
    // ============================================
    const securityResult = await performHybridSecurityCheck(securityContext, actionContext);

    // Log the attempt
    console.log('[ACCEPT_JOB] Security Check Result:', {
      action: 'ACCEPT_JOB',
      userId: securityContext.userId,
      riskScore: securityResult.riskCheck?.score,
      riskLevel: securityResult.riskCheck?.level,
      factors: securityResult.riskCheck?.factors,
      allowed: securityResult.permissionCheck.allowed,
    });

    // ============================================
    // HANDLE RED BLOCK
    // ============================================
    if (!securityResult.permissionCheck.allowed) {
      // Build user-friendly message
      let userMessage = 'Der Transport kann aktuell nicht angenommen werden.';
      
      if (adrExpired) {
        userMessage = 'Ihre ADR-Zertifizierung ist abgelaufen. Bitte erneuern Sie diese für Gefahrgut-Transporte.';
      } else if (hasCriticalTunnelCode && !driver.adrLicense) {
        userMessage = 'Für diesen Transport ist eine ADR-Zertifizierung erforderlich.';
      } else if (transport.isInternational && !driver.internationalExperience) {
        userMessage = 'Ihre Qualifikationen reichen für diesen internationalen Transport aktuell nicht aus.';
      }

      return NextResponse.json<AcceptJobResponse>({
        success: false,
        message: userMessage,
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
    // HANDLE YELLOW MITIGATIONS
    // ============================================
    if (securityResult.riskCheck?.level === 'YELLOW' && securityResult.mitigations) {
      // Check if mitigations require client actions
      if (securityResult.mitigations.requires2FA) {
        return NextResponse.json({
          success: false,
          message: 'Zusätzliche Verifizierung erforderlich',
          code: 'REQUIRES_2FA',
          mitigations: securityResult.mitigations.requiredActions,
        }, { status: 202 }); // 202 Accepted, but needs action
      }

      if (securityResult.mitigations.requiresGPSVerification) {
        return NextResponse.json({
          success: false,
          message: 'GPS-Verifizierung erforderlich',
          code: 'REQUIRES_GPS',
          mitigations: securityResult.mitigations.requiredActions,
        }, { status: 202 });
      }
    }

    // ============================================
    // PROCESS JOB ACCEPTANCE (GREEN or YELLOW with mitigations satisfied)
    // ============================================

    // Create assignment
    const assignment = await db.assignment.create({
      data: {
        transportId: body.transportId,
        driverId: body.driverId,
        vehicleId: body.vehicleId,
        assignedBy: userId,
      },
    });

    // Update transport status
    await db.transport.update({
      where: { id: body.transportId },
      data: {
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
    });

    // Update driver stats
    await db.driver.update({
      where: { id: body.driverId },
      data: {
        isAvailable: false,
      },
    });

    // Log successful action
    await logAuditEvent({
      userId,
      action: 'ACCEPT_JOB',
      entityType: 'transport',
      entityId: body.transportId,
      dataBefore: { status: transport.status },
      dataAfter: {
        status: 'ASSIGNED',
        assignmentId: assignment.id,
        riskScore: securityResult.riskCheck?.score,
        riskLevel: securityResult.riskCheck?.level,
      },
    });

    // Build response
    const response: AcceptJobResponse = {
      success: true,
      message: 'Transport erfolgreich angenommen',
      assignmentId: assignment.id,
      riskAnalysis: securityResult.riskCheck ? {
        score: securityResult.riskCheck.score,
        level: securityResult.riskCheck.level,
        userScore: securityResult.riskCheck.userScore,
        companyScore: securityResult.riskCheck.companyScore,
        transactionScore: securityResult.riskCheck.transactionScore,
        factors: securityResult.riskCheck.factors,
      } : undefined,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Accept job error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Fehler beim Annehmen des Auftrags',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}
