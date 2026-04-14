// ============================================
// CARGOBIT HYBRID SECURITY LAYER
// Combines Permission Matrix + Risk Scoring
// Version: 2.0 - Full Mitigation Support
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  SystemRole, 
  Permission, 
} from '@/types/permissions';
import { 
  calculateCombinedRiskScore,
  RiskScore,
  RiskLevel,
  CombinedRiskScore,
  TransactionRiskContext,
} from '@/lib/risk-scoring';
import { db } from '@/lib/db';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface SecurityContext {
  userId: string;
  email: string;
  roles: SystemRole[];
  companyId?: string;
  companyRole?: 'owner' | 'admin' | 'member';
  isVerified: boolean;
  riskScore: number;
  activeSecurityFlags: number;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  code: 'PERMISSION_DENIED' | 'RISK_TOO_HIGH' | 'VERIFICATION_REQUIRED' | 'ACCOUNT_RESTRICTED' | 'ALLOWED' | 'DELAYED' | 'REQUIRES_2FA';
  requiredPermission?: Permission;
  missingVerifications?: string[];
  riskScore?: number;
  riskLevel?: RiskLevel;
  riskFactors?: string[];
  mitigations?: MitigationAction[];
}

export interface HybridSecurityResult {
  permissionCheck: PermissionCheckResult;
  riskCheck?: {
    passed: boolean;
    score: number;
    level: RiskLevel;
    recommendation: string;
    factors: string[];
    userScore: number;
    companyScore: number;
    transactionScore: number;
  };
  auditId?: string;
  mitigations?: MitigationResult;
}

// ============================================
// MITIGATION TYPES
// ============================================

export type MitigationType = 
  | 'DELAY_24H'
  | 'EXTRA_LOGGING'
  | 'GPS_VERIFICATION'
  | 'TWO_FACTOR_CHALLENGE'
  | 'DOCUMENT_RECHECK'
  | 'SUPPORT_NOTIFICATION'
  | 'AMOUNT_LIMIT'
  | 'MANUAL_REVIEW_REQUIRED';

export interface MitigationAction {
  type: MitigationType;
  reason: string;
  applied: boolean;
  metadata?: Record<string, unknown>;
}

export interface MitigationResult {
  applied: MitigationAction[];
  requiredActions: string[];
  delayUntil?: Date;
  requires2FA: boolean;
  requiresGPSVerification: boolean;
}

// ============================================
// COMPACT PERMISSION MATRIX
// Based on user specification
// ============================================

export const COMPACT_PERMISSION_MATRIX = {
  ACTIONS: {
    CREATE_TRANSPORT: 'transport:create',
    VIEW_TRANSPORT: 'transport:read',
    ACCEPT_OFFER: 'offer:accept',
    ACCEPT_JOB: 'offer:accept', // Alias for DRIVER
    MAKE_OFFER: 'offer:create',
    ASSIGN_DRIVER: 'transport:assign_driver',
    UPDATE_STATUS: 'transport:update_status',
    VIEW_WALLET: 'wallet:read',
    INITIATE_PAYOUT: 'wallet:withdraw',
    MANAGE_VEHICLES: 'vehicle:write',
    MANAGE_USERS: 'user:write',
    MANAGE_PLANS: 'system:manage_plans',
  } as const,

  MATRIX: {
    ADMIN: {
      CREATE_TRANSPORT: false,
      VIEW_TRANSPORT: true,
      ACCEPT_OFFER: false,
      ACCEPT_JOB: false,
      MAKE_OFFER: false,
      ASSIGN_DRIVER: false,
      UPDATE_STATUS: false,
      VIEW_WALLET: true,
      INITIATE_PAYOUT: true,
      MANAGE_VEHICLES: false,
      MANAGE_USERS: true,
      MANAGE_PLANS: true,
    },
    SUPPORT: {
      CREATE_TRANSPORT: false,
      VIEW_TRANSPORT: true,
      ACCEPT_OFFER: false,
      ACCEPT_JOB: false,
      MAKE_OFFER: false,
      ASSIGN_DRIVER: false,
      UPDATE_STATUS: false,
      VIEW_WALLET: true,
      INITIATE_PAYOUT: false,
      MANAGE_VEHICLES: false,
      MANAGE_USERS: false,
      MANAGE_PLANS: false,
    },
    SHIPPER_COMPANY: {
      CREATE_TRANSPORT: true,
      VIEW_TRANSPORT: true,
      ACCEPT_OFFER: true,
      ACCEPT_JOB: false,
      MAKE_OFFER: false,
      ASSIGN_DRIVER: false,
      UPDATE_STATUS: false,
      VIEW_WALLET: true,
      INITIATE_PAYOUT: true,
      MANAGE_VEHICLES: false,
      MANAGE_USERS: false,
      MANAGE_PLANS: false,
    },
    SHIPPER_PRIVATE: {
      CREATE_TRANSPORT: true,
      VIEW_TRANSPORT: true,
      ACCEPT_OFFER: true,
      ACCEPT_JOB: false,
      MAKE_OFFER: false,
      ASSIGN_DRIVER: false,
      UPDATE_STATUS: false,
      VIEW_WALLET: true,
      INITIATE_PAYOUT: true,
      MANAGE_VEHICLES: false,
      MANAGE_USERS: false,
      MANAGE_PLANS: false,
    },
    DISPATCHER: {
      CREATE_TRANSPORT: false,
      VIEW_TRANSPORT: true,
      ACCEPT_OFFER: false,
      ACCEPT_JOB: false,
      MAKE_OFFER: true,
      ASSIGN_DRIVER: true,
      UPDATE_STATUS: true,
      VIEW_WALLET: true,
      INITIATE_PAYOUT: false,
      MANAGE_VEHICLES: true,
      MANAGE_USERS: false,
      MANAGE_PLANS: false,
    },
    DRIVER_SELF_EMPLOYED: {
      CREATE_TRANSPORT: false,
      VIEW_TRANSPORT: true,
      ACCEPT_OFFER: false,
      ACCEPT_JOB: true,
      MAKE_OFFER: true,
      ASSIGN_DRIVER: false,
      UPDATE_STATUS: true,
      VIEW_WALLET: false,
      INITIATE_PAYOUT: false,
      MANAGE_VEHICLES: false,
      MANAGE_USERS: false,
      MANAGE_PLANS: false,
    },
    MARKETER: {
      CREATE_TRANSPORT: false,
      VIEW_TRANSPORT: false,
      ACCEPT_OFFER: false,
      ACCEPT_JOB: false,
      MAKE_OFFER: false,
      ASSIGN_DRIVER: false,
      UPDATE_STATUS: false,
      VIEW_WALLET: false,
      INITIATE_PAYOUT: false,
      MANAGE_VEHICLES: false,
      MANAGE_USERS: false,
      MANAGE_PLANS: false,
    },
  } as const,
} as const;

// ============================================
// ACTION TYPE DEFINITIONS
// ============================================

export type SecurityAction = keyof typeof COMPACT_PERMISSION_MATRIX.ACTIONS;

export interface ActionContext {
  action: SecurityAction;
  resourceType: 'transport' | 'offer' | 'wallet' | 'vehicle' | 'user' | 'driver';
  resourceId?: string;
  transactionContext?: Partial<TransactionRiskContext>;
}

// ============================================
// MITIGATION SERVICE
// ============================================

class MitigationService {
  /**
   * Apply mitigations for YELLOW risk level
   */
  async applyMitigations(
    securityContext: SecurityContext,
    actionContext: ActionContext,
    riskScore: number,
    factors: string[]
  ): Promise<MitigationResult> {
    const applied: MitigationAction[] = [];
    const requiredActions: string[] = [];
    let delayUntil: Date | undefined;
    let requires2FA = false;
    let requiresGPSVerification = false;

    // 1. DELAY for payouts and high-value transactions
    if (actionContext.action === 'INITIATE_PAYOUT' || 
        (actionContext.transactionContext?.amount || 0) > 10000) {
      delayUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h delay
      
      applied.push({
        type: 'DELAY_24H',
        reason: '24h Wartezeit bei erhöhtem Risiko',
        applied: true,
        metadata: { delayUntil },
      });
      requiredActions.push('24h_Delay aktiviert');
    }

    // 2. EXTRA_LOGGING always applied for YELLOW
    applied.push({
      type: 'EXTRA_LOGGING',
      reason: 'Erweitertes Logging aktiviert',
      applied: true,
      metadata: { riskScore, factors },
    });

    // 3. GPS_VERIFICATION for transport actions
    if (['ACCEPT_JOB', 'UPDATE_STATUS', 'ASSIGN_DRIVER'].includes(actionContext.action)) {
      requiresGPSVerification = true;
      applied.push({
        type: 'GPS_VERIFICATION',
        reason: 'GPS-Verifikation erforderlich',
        applied: false, // Needs to be verified by client
      });
      requiredActions.push('GPS-Verifikation erforderlich');
    }

    // 4. TWO_FACTOR_CHALLENGE for sensitive actions
    if (['INITIATE_PAYOUT', 'ACCEPT_OFFER'].includes(actionContext.action) && riskScore > 40) {
      requires2FA = true;
      applied.push({
        type: 'TWO_FACTOR_CHALLENGE',
        reason: '2FA-Challenge erforderlich bei erhöhtem Risiko',
        applied: false, // Needs to be verified by client
      });
      requiredActions.push('2FA-Verifizierung erforderlich');
    }

    // 5. DOCUMENT_RECHECK for international/hazmat
    if (actionContext.transactionContext?.isInternational || 
        actionContext.transactionContext?.isHazmat) {
      applied.push({
        type: 'DOCUMENT_RECHECK',
        reason: 'Dokumente werden erneut geprüft',
        applied: true,
      });
      requiredActions.push('Dokumenten-Check durchgeführt');
    }

    // 6. SUPPORT_NOTIFICATION always for YELLOW
    applied.push({
      type: 'SUPPORT_NOTIFICATION',
      reason: 'Support-Team benachrichtigt',
      applied: true,
    });

    await this.notifySupportTeam(securityContext, actionContext, riskScore, factors);

    return {
      applied,
      requiredActions,
      delayUntil,
      requires2FA,
      requiresGPSVerification,
    };
  }

  /**
   * Notify support team about elevated risk
   */
  private async notifySupportTeam(
    securityContext: SecurityContext,
    actionContext: ActionContext,
    riskScore: number,
    factors: string[]
  ): Promise<void> {
    // Get support users
    const supportUsers = await db.user.findMany({
      where: {
        roles: {
          some: {
            role: { name: { in: ['SUPPORT', 'ADMIN'] } },
          },
        },
      },
    });

    // Create notification for each support user
    for (const supporter of supportUsers) {
      await db.notification.create({
        data: {
          userId: supporter.id,
          type: 'SECURITY_ALERT',
          title: `Risiko-Warnung: ${actionContext.action}`,
          message: `User ${securityContext.email} hat Risk-Score ${riskScore}. Faktoren: ${factors.join(', ')}`,
          data: JSON.stringify({
            userId: securityContext.userId,
            action: actionContext.action,
            riskScore,
            factors,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }
  }
}

const mitigationService = new MitigationService();

// ============================================
// STEP 1: PERMISSION CHECK (Binary, Hard)
// ============================================

export function checkPermission(
  roles: SystemRole[],
  action: SecurityAction
): PermissionCheckResult {
  // Check each role - if any role allows the action, grant access
  for (const role of roles) {
    const rolePermissions = COMPACT_PERMISSION_MATRIX.MATRIX[role as keyof typeof COMPACT_PERMISSION_MATRIX.MATRIX];
    
    if (rolePermissions && (rolePermissions as Record<string, boolean>)[action] === true) {
      return {
        allowed: true,
        code: 'ALLOWED',
      };
    }
  }

  // No role allows this action
  return {
    allowed: false,
    reason: `Keine der Rollen [${roles.join(', ')}] hat Berechtigung für ${action}`,
    code: 'PERMISSION_DENIED',
    requiredPermission: COMPACT_PERMISSION_MATRIX.ACTIONS[action] as Permission,
  };
}

// ============================================
// STEP 2: RISK ENGINE (Dynamic)
// ============================================

export async function performRiskCheck(
  securityContext: SecurityContext,
  actionContext: ActionContext
): Promise<{
  passed: boolean;
  score: number;
  level: RiskLevel;
  recommendation: string;
  factors: string[];
  userScore: number;
  companyScore: number;
  transactionScore: number;
  combinedScore?: CombinedRiskScore;
}> {
  // Build transaction context
  const transactionContext: TransactionRiskContext = {
    transactionType: mapActionToTransactionType(actionContext.action),
    amount: actionContext.transactionContext?.amount || 0,
    currency: actionContext.transactionContext?.currency || 'EUR',
    isNewIban: actionContext.transactionContext?.isNewIban || false,
    isInternational: actionContext.transactionContext?.isInternational || false,
    isHazmat: actionContext.transactionContext?.isHazmat || false,
    isRecurringPartner: actionContext.transactionContext?.isRecurringPartner || false,
    hasEscrow: actionContext.transactionContext?.hasEscrow || false,
    hasInsurance: actionContext.transactionContext?.hasInsurance || false,
    tunnelCodes: actionContext.transactionContext?.tunnelCodes,
    adrExpired: actionContext.transactionContext?.adrExpired,
  };

  // Calculate combined risk score
  const combinedScore = await calculateCombinedRiskScore(
    securityContext.userId,
    securityContext.companyId || null,
    transactionContext
  );

  // Determine if action passes risk check
  const passed = combinedScore.level !== 'RED';
  
  let recommendation = '';
  switch (combinedScore.level) {
    case 'GREEN':
      recommendation = 'Aktion normal durchlassen';
      break;
    case 'YELLOW':
      recommendation = 'Aktion erlauben, aber mit Mitigations';
      break;
    case 'RED':
      recommendation = 'Aktion blockieren, manuelle Prüfung erforderlich';
      break;
  }

  return {
    passed,
    score: combinedScore.score,
    level: combinedScore.level,
    recommendation,
    factors: combinedScore.factors.map(f => `${f.name} (${f.impact > 0 ? '+' : ''}${f.impact})`),
    userScore: combinedScore.userScore?.score || 0,
    companyScore: combinedScore.companyScore?.score || 0,
    transactionScore: combinedScore.transactionScore?.score || 0,
    combinedScore,
  };
}

function mapActionToTransactionType(action: SecurityAction): TransactionRiskContext['transactionType'] {
  switch (action) {
    case 'INITIATE_PAYOUT':
      return 'PAYOUT';
    case 'ACCEPT_OFFER':
    case 'ACCEPT_JOB':
      return 'TRANSPORT_ACCEPT';
    case 'CREATE_TRANSPORT':
      return 'HIGH_VALUE_TRANSPORT';
    default:
      return 'TRANSPORT_ACCEPT';
  }
}

// ============================================
// MAIN HYBRID SECURITY CHECK
// ============================================

export async function performHybridSecurityCheck(
  securityContext: SecurityContext,
  actionContext: ActionContext
): Promise<HybridSecurityResult> {
  // ============================================
  // STEP 1: Permission Check (hard, binary)
  // ============================================
  const permissionResult = checkPermission(securityContext.roles, actionContext.action);
  
  if (!permissionResult.allowed) {
    // Log denied permission attempt
    const auditId = await logSecurityEvent({
      userId: securityContext.userId,
      action: actionContext.action,
      result: 'permission_denied',
      reason: permissionResult.reason || 'Permission denied',
      riskScore: 0,
    });

    return {
      permissionCheck: permissionResult,
      auditId,
    };
  }

  // ============================================
  // STEP 2: Risk Scoring (dynamic, context-sensitive)
  // ============================================
  const riskCheck = await performRiskCheck(securityContext, actionContext);

  // ============================================
  // STEP 3: Decision based on thresholds
  // ============================================
  let finalAllowed = true;
  let finalReason: string | undefined;
  let finalCode: PermissionCheckResult['code'] = 'ALLOWED';
  let mitigations: MitigationResult | undefined;

  if (riskCheck.score <= 30) {
    // 🟢 GREEN (0-30): Allow Action
    finalAllowed = true;
    finalCode = 'ALLOWED';
    
    await logSecurityEvent({
      userId: securityContext.userId,
      action: actionContext.action,
      result: 'allowed',
      riskScore: riskCheck.score,
      riskLevel: 'GREEN',
    });

  } else if (riskCheck.score <= 60) {
    // 🟡 YELLOW (31-60): Allow + Mitigations
    finalAllowed = true;
    finalReason = 'Aktion erlaubt mit Sicherheitsmaßnahmen';
    finalCode = 'ALLOWED';
    
    // Apply mitigations
    mitigations = await mitigationService.applyMitigations(
      securityContext,
      actionContext,
      riskCheck.score,
      riskCheck.factors
    );

    await logSecurityEvent({
      userId: securityContext.userId,
      action: actionContext.action,
      result: 'allowed_with_warning',
      riskScore: riskCheck.score,
      riskLevel: 'YELLOW',
      mitigations: mitigations.requiredActions,
    });

  } else {
    // 🔴 RED (61-100): Block + Review
    finalAllowed = false;
    finalReason = 'Aktion vorübergehend für Sicherheitsprüfung gesperrt';
    finalCode = 'RISK_TOO_HIGH';

    // Create support ticket
    await createManualReviewTicket(securityContext, actionContext, riskCheck);
    
    // Notify support
    await notifySupportTeamForBlock(securityContext, actionContext, riskCheck);

    await logSecurityEvent({
      userId: securityContext.userId,
      action: actionContext.action,
      result: 'blocked',
      riskScore: riskCheck.score,
      riskLevel: 'RED',
    });
  }

  const auditId = await logSecurityEvent({
    userId: securityContext.userId,
    action: actionContext.action,
    result: finalAllowed ? 'allowed' : 'blocked',
    reason: finalReason,
    riskScore: riskCheck.score,
    riskLevel: riskCheck.level,
    riskFactors: riskCheck.factors,
    resourceId: actionContext.resourceId,
    resourceType: actionContext.resourceType,
  });

  return {
    permissionCheck: {
      allowed: finalAllowed,
      reason: finalReason,
      code: finalCode,
      riskScore: riskCheck.score,
      riskLevel: riskCheck.level,
      riskFactors: riskCheck.factors,
      mitigations: mitigations?.applied,
    },
    riskCheck: {
      passed: riskCheck.passed,
      score: riskCheck.score,
      level: riskCheck.level,
      recommendation: riskCheck.recommendation,
      factors: riskCheck.factors,
      userScore: riskCheck.userScore,
      companyScore: riskCheck.companyScore,
      transactionScore: riskCheck.transactionScore,
    },
    auditId,
    mitigations,
  };
}

// ============================================
// SECURITY EVENT LOGGING
// ============================================

async function logSecurityEvent(params: {
  userId: string;
  action: string;
  result: 'permission_denied' | 'allowed' | 'allowed_with_warning' | 'blocked';
  reason?: string;
  riskScore: number;
  riskLevel?: string;
  riskFactors?: string[];
  mitigations?: string[];
  resourceId?: string;
  resourceType?: string;
}): Promise<string> {
  const auditLog = await db.auditLog.create({
    data: {
      userId: params.userId,
      action: 'FRAUD_ALERT',
      entityType: params.resourceType || 'security_check',
      entityId: params.resourceId,
      dataBefore: JSON.stringify({
        action: params.action,
        result: params.result,
        reason: params.reason,
        riskScore: params.riskScore,
        riskLevel: params.riskLevel,
        riskFactors: params.riskFactors,
        mitigations: params.mitigations,
        timestamp: new Date().toISOString(),
      }),
      dataAfter: null,
    },
  });

  return auditLog.id;
}

// ============================================
// MANUAL REVIEW & NOTIFICATIONS
// ============================================

async function createManualReviewTicket(
  securityContext: SecurityContext,
  actionContext: ActionContext,
  riskCheck: { score: number; level: RiskLevel; factors: string[] }
): Promise<void> {
  // Check for existing open ticket
  const existingTicket = await db.supportTicket.findFirst({
    where: {
      userId: securityContext.userId,
      category: 'FRAUD',
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    },
  });

  if (existingTicket) return;

  await db.supportTicket.create({
    data: {
      userId: securityContext.userId,
      subject: `Sicherheitsprüfung erforderlich: ${actionContext.action}`,
      description: `
Automatisch erstellt durch Hybrid Security Layer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RISIKO-ANALYSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Action: ${actionContext.action}
Risk Score: ${riskCheck.score}/100
Risk Level: ${riskCheck.level}
Factors: ${riskCheck.factors.join(', ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 USER INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User ID: ${securityContext.userId}
Email: ${securityContext.email}
Rollen: ${securityContext.roles.join(', ')}
Company: ${securityContext.companyId || 'N/A'}

Bitte prüfen und ggf. Maßnahmen ergreifen.
      `.trim(),
      priority: 'HIGH',
      status: 'OPEN',
      category: 'FRAUD',
    },
  });
}

async function notifySupportTeamForBlock(
  securityContext: SecurityContext,
  actionContext: ActionContext,
  riskCheck: { score: number; level: RiskLevel; factors: string[] }
): Promise<void> {
  const supportUsers = await db.user.findMany({
    where: {
      roles: {
        some: {
          role: { name: { in: ['SUPPORT', 'ADMIN'] } },
        },
      },
    },
  });

  for (const supporter of supportUsers) {
    await db.notification.create({
      data: {
        userId: supporter.id,
        type: 'SECURITY_BLOCK',
        title: `🚨 Aktion blockiert: ${actionContext.action}`,
        message: `User ${securityContext.email} wurde blockiert (Score: ${riskCheck.score})`,
        data: JSON.stringify({
          userId: securityContext.userId,
          action: actionContext.action,
          riskScore: riskCheck.score,
          factors: riskCheck.factors,
        }),
      },
    });
  }
}

// ============================================
// MIDDLEWARE FACTORY
// ============================================

export function withHybridSecurity(
  action: SecurityAction,
  options: {
    resourceType: ActionContext['resourceType'];
    getResourceId?: (request: NextRequest) => string | Promise<string>;
    getTransactionContext?: (request: NextRequest) => Partial<TransactionRiskContext> | Promise<Partial<TransactionRiskContext>>;
  } = { resourceType: 'transport' }
) {
  return async (
    request: NextRequest,
    handler: (req: NextRequest, context: SecurityContext, securityResult: HybridSecurityResult) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const securityContext = await extractSecurityContext(request);
    
    if (!securityContext) {
      return NextResponse.json({
        error: 'UnauthorizedError',
        message: 'Authentifizierung erforderlich',
        code: 'AUTH_REQUIRED',
      }, { status: 401 });
    }

    const actionContext: ActionContext = {
      action,
      resourceType: options.resourceType,
    };

    if (options.getResourceId) {
      actionContext.resourceId = await options.getResourceId(request);
    }

    if (options.getTransactionContext) {
      actionContext.transactionContext = await options.getTransactionContext(request);
    }

    const securityResult = await performHybridSecurityCheck(securityContext, actionContext);

    if (!securityResult.permissionCheck.allowed) {
      return NextResponse.json({
        error: 'ForbiddenError',
        message: securityResult.permissionCheck.reason || 'Aktion nicht erlaubt',
        code: securityResult.permissionCheck.code,
        riskScore: securityResult.permissionCheck.riskScore,
        riskLevel: securityResult.permissionCheck.riskLevel,
        factors: securityResult.permissionCheck.riskFactors,
      }, { status: 403 });
    }

    const response = await handler(request, securityContext, securityResult);
    
    // Add security headers
    if (securityResult.riskCheck?.level === 'YELLOW') {
      response.headers.set('X-Security-Warning', 'elevated_risk');
      response.headers.set('X-Risk-Score', String(securityResult.riskCheck.score));
      
      if (securityResult.mitigations) {
        response.headers.set('X-Mitigations', securityResult.mitigations.requiredActions.join('; '));
        if (securityResult.mitigations.delayUntil) {
          response.headers.set('X-Delay-Until', securityResult.mitigations.delayUntil.toISOString());
        }
        if (securityResult.mitigations.requires2FA) {
          response.headers.set('X-Requires-2FA', 'true');
        }
        if (securityResult.mitigations.requiresGPSVerification) {
          response.headers.set('X-Requires-GPS', 'true');
        }
      }
    }

    return response;
  };
}

// ============================================
// SECURITY CONTEXT EXTRACTION
// ============================================

async function extractSecurityContext(request: NextRequest): Promise<SecurityContext | null> {
  const userId = request.headers.get('x-user-id');
  
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: { include: { role: true } },
      companyUsers: { include: { company: true } },
      securityFlags: { where: { active: true } },
    },
  });

  if (!user) return null;

  const roles = user.roles.map(ur => ur.role.name as SystemRole);
  const companyUser = user.companyUsers[0];

  const criticalFlags = user.securityFlags.filter(f => f.severity === 'CRITICAL').length;
  const highFlags = user.securityFlags.filter(f => f.severity === 'HIGH').length;
  const mediumFlags = user.securityFlags.filter(f => f.severity === 'MEDIUM').length;

  const quickRiskScore = Math.min(100, 
    (criticalFlags * 25) + (highFlags * 15) + (mediumFlags * 5)
  );

  return {
    userId: user.id,
    email: user.email,
    roles,
    companyId: companyUser?.companyId,
    companyRole: companyUser?.roleInCompany as 'owner' | 'admin' | 'member',
    isVerified: user.status === 'ACTIVE',
    riskScore: quickRiskScore,
    activeSecurityFlags: user.securityFlags.length,
  };
}

// ============================================
// EXPORTS
// ============================================

export type {
  SecurityContext,
  PermissionCheckResult,
  HybridSecurityResult,
  ActionContext,
  SecurityAction,
  MitigationAction,
  MitigationResult,
};

export {
  COMPACT_PERMISSION_MATRIX,
  checkPermission,
  performRiskCheck,
  performHybridSecurityCheck,
  withHybridSecurity,
  mitigationService,
};
