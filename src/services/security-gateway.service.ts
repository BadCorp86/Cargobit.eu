// ============================================
// CARGOBIT SECURITY GATEWAY SERVICE
// Orchestrates Permission + Risk + Mitigation
// Version: 2.0
// ============================================

import { db } from '@/lib/db';
import {
  SecurityCheckRequest,
  SecurityCheckResponse,
  PermissionValidateRequest,
  PermissionValidateResponse,
  RiskOverrideRequest,
  RiskOverrideResponse,
  SecurityMitigationApplyRequest,
  SecurityMitigationApplyResponse,
  RiskStatusResponse,
  SecurityErrorCode,
  SecurityAction,
  SystemRole,
  RiskLevel,
  MitigationType,
  SecurityEntityType,
  SECURITY_ERROR_CODES,
} from '@/types/security';
import { auditService } from '@/services/audit.service';
import { mitigationService } from '@/services/mitigation.service';
import { notificationService } from '@/services/notification.service';
import { AuditEntityType, AuditDecision, AuditRiskLevel } from '@/types/audit';
import { MitigationType as DbMitigationType, MitigationEntityType } from '@/types/mitigation';

// ============================================
// PERMISSION MATRIX
// ============================================

const PERMISSION_MATRIX: Record<SystemRole, Record<SecurityAction, boolean>> = {
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
};

// ============================================
// RISK LEVEL THRESHOLDS
// ============================================

const RISK_THRESHOLDS = {
  green: { min: 0, max: 30 },
  yellow: { min: 31, max: 60 },
  red: { min: 61, max: 100 },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function mapEntityTypeToAudit(type: SecurityEntityType): AuditEntityType {
  const mapping: Record<SecurityEntityType, AuditEntityType> = {
    user: AuditEntityType.USER,
    company: AuditEntityType.COMPANY,
    transaction: AuditEntityType.TRANSACTION,
    transport: AuditEntityType.TRANSPORT,
    wallet: AuditEntityType.WALLET,
    vehicle: AuditEntityType.VEHICLE,
    offer: AuditEntityType.OFFER,
  };
  return mapping[type] || AuditEntityType.TRANSACTION;
}

function mapRiskLevelToAudit(level: RiskLevel): AuditRiskLevel {
  const mapping: Record<RiskLevel, AuditRiskLevel> = {
    green: AuditRiskLevel.GREEN,
    yellow: AuditRiskLevel.YELLOW,
    red: AuditRiskLevel.RED,
  };
  return mapping[level];
}

function mapMitigationType(type: MitigationType): DbMitigationType {
  const mapping: Record<MitigationType, DbMitigationType> = {
    delay: DbMitigationType.DELAY,
    '2fa': DbMitigationType.TWO_FACTOR,
    gps_check: DbMitigationType.GPS_CHECK,
    extra_logging: DbMitigationType.EXTRA_LOGGING,
    document_recheck: DbMitigationType.DOCUMENT_RECHECK,
    manual_review: DbMitigationType.MANUAL_REVIEW,
    amount_limit: DbMitigationType.AMOUNT_LIMIT,
  };
  return mapping[type];
}

function mapEntityTypeToMitigation(type: SecurityEntityType): MitigationEntityType {
  const mapping: Record<SecurityEntityType, MitigationEntityType> = {
    user: MitigationEntityType.USER,
    company: MitigationEntityType.COMPANY,
    transaction: MitigationEntityType.TRANSACTION,
    transport: MitigationEntityType.TRANSPORT,
    wallet: MitigationEntityType.WALLET,
    vehicle: MitigationEntityType.VEHICLE,
    offer: MitigationEntityType.OFFER,
  };
  return mapping[type] || MitigationEntityType.TRANSACTION;
}

// ============================================
// SECURITY GATEWAY SERVICE CLASS
// ============================================

class SecurityGatewayService {
  // ============================================
  // MAIN SECURITY CHECK
  // ============================================

  async checkSecurity(request: SecurityCheckRequest): Promise<SecurityCheckResponse> {
    const correlationId = request.requestId || generateCorrelationId();

    // Step 1: Permission Check
    const permissionResult = this.validatePermission({
      user: request.user,
      action: request.action,
    });

    if (!permissionResult.allowed) {
      await this.logSecurityEvent({
        actorId: request.user.id,
        action: request.action,
        entityType: request.entity.type,
        entityId: request.entity.id,
        decision: 'DENIED',
        errorCode: permissionResult.errorCode,
        message: permissionResult.message,
        correlationId,
      });

      return {
        allowed: false,
        decision: 'permission_denied',
        errorCode: permissionResult.errorCode,
        message: permissionResult.message,
        correlationId,
      };
    }

    // Step 2: Risk Evaluation
    const riskResult = await this.evaluateRisk(
      request.entity.type,
      request.entity.id,
      request.entity.context || {}
    );

    // Step 3: Decision based on risk level
    if (riskResult.level === 'red') {
      // Block + Create Support Ticket
      const ticketId = await this.createSupportTicket(
        request.user.id,
        request.action,
        riskResult.score,
        riskResult.level,
        riskResult.triggeredRules
      );

      // Notify support team
      await this.notifySupportForBlock(request, riskResult, ticketId);

      await this.logSecurityEvent({
        actorId: request.user.id,
        action: request.action,
        entityType: request.entity.type,
        entityId: request.entity.id,
        decision: 'BLOCKED',
        riskScore: riskResult.score,
        riskLevel: riskResult.level,
        riskFactors: riskResult.triggeredRules,
        supportTicketId: ticketId,
        correlationId,
      });

      return {
        allowed: false,
        decision: 'blocked',
        risk: {
          score: riskResult.score,
          level: riskResult.level,
          triggeredRules: riskResult.triggeredRules,
        },
        errorCode: 'HIGH_RISK_BLOCKED',
        message: SECURITY_ERROR_CODES.HIGH_RISK_BLOCKED.message,
        supportTicketId: ticketId,
        correlationId,
      };
    }

    if (riskResult.level === 'yellow') {
      // Allow + Mitigations
      const mitigations = await this.determineMitigations(
        request.action,
        riskResult.score,
        request.entity.type,
        request.entity.id,
        request.entity.context
      );

      await this.logSecurityEvent({
        actorId: request.user.id,
        action: request.action,
        entityType: request.entity.type,
        entityId: request.entity.id,
        decision: 'MITIGATION',
        riskScore: riskResult.score,
        riskLevel: riskResult.level,
        riskFactors: riskResult.triggeredRules,
        mitigations: mitigations.map(m => m.type),
        correlationId,
      });

      return {
        allowed: true,
        decision: 'allowed_with_mitigation',
        risk: {
          score: riskResult.score,
          level: riskResult.level,
          triggeredRules: riskResult.triggeredRules,
        },
        mitigations: mitigations.map(m => m.type),
        correlationId,
      };
    }

    // Green - Allow
    await this.logSecurityEvent({
      actorId: request.user.id,
      action: request.action,
      entityType: request.entity.type,
      entityId: request.entity.id,
      decision: 'ALLOWED',
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
      correlationId,
    });

    return {
      allowed: true,
      decision: 'allowed',
      risk: {
        score: riskResult.score,
        level: riskResult.level,
        triggeredRules: riskResult.triggeredRules,
      },
      correlationId,
    };
  }

  // ============================================
  // PERMISSION VALIDATION
  // ============================================

  validatePermission(request: PermissionValidateRequest): PermissionValidateResponse {
    const { role } = request.user;
    const { action } = request;

    // Check if role exists in matrix
    if (!PERMISSION_MATRIX[role]) {
      return {
        allowed: false,
        errorCode: 'INVALID_ROLE',
        message: `Unknown role: ${role}`,
      };
    }

    // Check if action is allowed for this role
    if (!PERMISSION_MATRIX[role][action]) {
      return {
        allowed: false,
        errorCode: 'PERMISSION_DENIED',
        message: `Role '${role}' is not allowed to perform action '${action}'.`,
      };
    }

    return { allowed: true };
  }

  // ============================================
  // RISK OVERRIDE
  // ============================================

  async overrideRisk(request: RiskOverrideRequest): Promise<RiskOverrideResponse> {
    try {
      // Check if actor has permission (SUPPORT or ADMIN only)
      const allowedRoles: SystemRole[] = ['ADMIN', 'SUPPORT'];

      // Get actor's roles from database
      const actor = await db.user.findUnique({
        where: { id: request.actorId },
        include: { roles: { include: { role: true } } },
      });

      if (!actor) {
        return {
          status: 'error',
          errorCode: 'UNAUTHORIZED',
          message: 'Actor not found',
        };
      }

      const actorRoles = actor.roles.map(r => r.role.name as SystemRole);
      const hasPermission = actorRoles.some(r => allowedRoles.includes(r));

      if (!hasPermission) {
        return {
          status: 'error',
          errorCode: 'PERMISSION_DENIED',
          message: 'Only SUPPORT or ADMIN can override risk levels',
        };
      }

      // Create or update risk override
      const existingScore = await db.riskScore.findUnique({
        where: {
          entityType_entityId: {
            entityType: request.entityType.toUpperCase() as any,
            entityId: request.entityId,
          },
        },
      });

      const oldScore = existingScore?.score || 0;
      const oldLevel = (existingScore?.riskLevel?.toLowerCase() as RiskLevel) || 'green';

      const newScore = request.newScore ?? this.getScoreForLevel(request.newLevel);

      // Upsert risk score with override
      const riskScore = await db.riskScore.upsert({
        where: {
          entityType_entityId: {
            entityType: request.entityType.toUpperCase() as any,
            entityId: request.entityId,
          },
        },
        create: {
          entityType: request.entityType.toUpperCase() as any,
          entityId: request.entityId,
          score: newScore,
          riskLevel: request.newLevel.toUpperCase() as any,
          factorsCount: 0,
          lastEventAt: new Date(),
        },
        update: {
          score: newScore,
          riskLevel: request.newLevel.toUpperCase() as any,
          lastEventAt: new Date(),
        },
      });

      // Create history entry
      await db.riskHistory.create({
        data: {
          entityType: request.entityType.toUpperCase() as any,
          entityId: request.entityId,
          oldScore,
          newScore,
          scoreChange: newScore - oldScore,
          oldLevel: oldLevel.toUpperCase(),
          newLevel: request.newLevel.toUpperCase(),
          reason: `Manual override by ${request.actorId}: ${request.reason}`,
          riskScoreId: riskScore.id,
        },
      });

      // Log to audit
      await auditService.log({
        actorType: 'USER',
        actorId: request.actorId,
        action: 'RISK_OVERRIDE',
        decision: AuditDecision.ALLOWED,
        entityType: mapEntityTypeToAudit(request.entityType),
        entityId: request.entityId,
        riskScore: newScore,
        riskLevel: mapRiskLevelToAudit(request.newLevel),
        metadata: {
          reason: request.reason,
          oldScore,
          oldLevel,
          expiresAt: request.expiresAt,
        },
        sourceService: 'security-gateway',
      });

      // Send notification
      await notificationService.send({
        eventType: 'RISK_OVERRIDE',
        entityType: MitigationEntityType.USER,
        entityId: request.entityId,
        priority: 'HIGH',
        channels: ['SLACK', 'EMAIL'],
        data: {
          entityType: request.entityType,
          entityId: request.entityId,
          newLevel: request.newLevel,
          newScore,
          reason: request.reason,
          actorId: request.actorId,
        },
      });

      return {
        status: 'ok',
        message: 'Risk level overridden successfully',
        risk: {
          score: newScore,
          level: request.newLevel,
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('[SecurityGateway] Error in overrideRisk:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'MITIGATION_FAILED',
      };
    }
  }

  // ============================================
  // MITIGATION APPLY
  // ============================================

  async applyMitigation(request: SecurityMitigationApplyRequest): Promise<SecurityMitigationApplyResponse> {
    try {
      const result = await mitigationService.apply({
        entityType: mapEntityTypeToMitigation(request.entityType),
        entityId: request.entityId,
        action: request.action,
        mitigationType: mapMitigationType(request.mitigationType),
        context: {
          userId: request.context?.userId,
          userEmail: request.context?.userEmail,
          userPhone: request.context?.userPhone,
          amount: request.context?.amount,
          currency: request.context?.currency,
          expectedGps: request.context?.expectedGps,
          delayMinutes: request.context?.delayMinutes,
          callbackAction: request.context?.callbackAction,
          callbackData: request.context?.callbackData,
          triggeredRules: request.context?.triggeredRules,
        },
      });

      return {
        status: result.status === 'error' ? 'error' : result.status,
        mitigationId: result.mitigationId,
        message: result.message,
        executeAt: result.executeAt?.toISOString(),
        errorCode: result.errorCode as SecurityErrorCode | undefined,
      };
    } catch (error) {
      console.error('[SecurityGateway] Error in applyMitigation:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'MITIGATION_FAILED',
      };
    }
  }

  // ============================================
  // GET RISK STATUS
  // ============================================

  async getRiskStatus(entityType: SecurityEntityType, entityId: string): Promise<RiskStatusResponse | null> {
    const riskScore = await db.riskScore.findUnique({
      where: {
        entityType_entityId: {
          entityType: entityType.toUpperCase() as any,
          entityId,
        },
      },
      include: {
        events: {
          where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!riskScore) {
      return null;
    }

    const triggeredRules = riskScore.events.map(e => e.ruleName);

    return {
      entityType,
      entityId,
      score: riskScore.score,
      level: riskScore.riskLevel.toLowerCase() as RiskLevel,
      lastUpdated: riskScore.updatedAt.toISOString(),
      triggeredRules: [...new Set(triggeredRules)],
    };
  }

  // ============================================
  // RISK EVALUATION (Internal)
  // ============================================

  private async evaluateRisk(
    entityType: SecurityEntityType,
    entityId: string,
    context: Record<string, unknown>
  ): Promise<{
    score: number;
    level: RiskLevel;
    triggeredRules: string[];
  }> {
    try {
      // Get or calculate risk score from database
      let riskScore = await db.riskScore.findUnique({
        where: {
          entityType_entityId: {
            entityType: entityType.toUpperCase() as any,
            entityId,
          },
        },
        include: {
          events: {
            where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          },
        },
      });

      if (!riskScore) {
        // Calculate new risk score based on context
        const score = this.calculateRiskFromContext(context);
        const level = this.determineRiskLevel(score);

        riskScore = await db.riskScore.create({
          data: {
            entityType: entityType.toUpperCase() as any,
            entityId,
            score,
            riskLevel: level.toUpperCase() as any,
            factorsCount: 0,
            lastEventAt: new Date(),
          },
          include: { events: true },
        });
      }

      const level = this.determineRiskLevel(riskScore.score);
      const triggeredRules = riskScore.events.map(e => e.ruleName);

      return {
        score: riskScore.score,
        level,
        triggeredRules: [...new Set(triggeredRules)],
      };
    } catch (error) {
      console.error('[SecurityGateway] Error evaluating risk:', error);
      // Fallback to green on error
      return {
        score: 0,
        level: 'green',
        triggeredRules: [],
      };
    }
  }

  private calculateRiskFromContext(context: Record<string, unknown>): number {
    let score = 0;

    // User-based factors
    if (context.kyc_status === 'missing') score += 15;
    if (context.kyc_status === 'pending') score += 5;
    if (context.account_age_days && (context.account_age_days as number) < 7) score += 10;
    if (context.failed_logins_7d && (context.failed_logins_7d as number) > 3) score += 10;
    if (context.active_security_flags && (context.active_security_flags as number) > 0) score += 15;

    // Company-based factors
    if (context.kyb_status === 'missing') score += 20;
    if (context.company_age_years && (context.company_age_years as number) < 1) score += 10;
    if (context.open_fraud_tickets && (context.open_fraud_tickets as number) > 0) score += 25;

    // Transaction-based factors
    if (context.amount && (context.amount as number) > 50000) score += 15;
    if (context.amount && (context.amount as number) > 100000) score += 15;
    if (context.is_new_iban) score += 10;
    if (context.international) score += 5;
    if (context.hazmat) score += 10;

    return Math.min(100, score);
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score <= RISK_THRESHOLDS.green.max) return 'green';
    if (score <= RISK_THRESHOLDS.yellow.max) return 'yellow';
    return 'red';
  }

  private getScoreForLevel(level: RiskLevel): number {
    switch (level) {
      case 'green':
        return 15;
      case 'yellow':
        return 45;
      case 'red':
        return 75;
    }
  }

  // ============================================
  // MITIGATION DETERMINATION (Internal)
  // ============================================

  private async determineMitigations(
    action: SecurityAction,
    riskScore: number,
    entityType: SecurityEntityType,
    entityId: string,
    context?: Record<string, unknown>
  ): Promise<Array<{ type: MitigationType; reason: string }>> {
    const mitigations: Array<{ type: MitigationType; reason: string }> = [];

    // Always add extra logging for yellow risk
    mitigations.push({ type: 'extra_logging', reason: 'Elevated risk level' });

    // Action-specific mitigations
    switch (action) {
      case 'INITIATE_PAYOUT':
        if (riskScore >= 40) {
          mitigations.push({ type: 'delay', reason: 'Payout delay for elevated risk' });
        }
        if ((context?.amount as number) > 50000) {
          mitigations.push({ type: 'amount_limit', reason: 'High value transaction' });
        }
        break;

      case 'ACCEPT_OFFER':
      case 'ACCEPT_JOB':
        if (riskScore >= 50 && (context?.amount as number) > 10000) {
          mitigations.push({ type: '2fa', reason: 'High value transport requires verification' });
        }
        if (action === 'ACCEPT_JOB') {
          mitigations.push({ type: 'gps_check', reason: 'Driver location verification' });
        }
        break;

      case 'UPDATE_STATUS':
        mitigations.push({ type: 'gps_check', reason: 'Location verification for status update' });
        break;

      case 'ASSIGN_DRIVER':
        if (riskScore >= 55) {
          mitigations.push({ type: 'manual_review', reason: 'Sensitive assignment requires review' });
        }
        break;
    }

    return mitigations;
  }

  // ============================================
  // SUPPORT TICKET CREATION
  // ============================================

  private async createSupportTicket(
    userId: string,
    action: string,
    riskScore: number,
    riskLevel: string,
    triggeredRules: string[]
  ): Promise<string> {
    const existingTicket = await db.supportTicket.findFirst({
      where: {
        userId,
        category: 'FRAUD',
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    if (existingTicket) {
      return existingTicket.id;
    }

    const ticket = await db.supportTicket.create({
      data: {
        userId,
        subject: `Sicherheitsprüfung erforderlich: ${action}`,
        description: `
Automatisch erstellt durch Security Gateway.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 RISIKO-ANALYSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Action: ${action}
Risk Score: ${riskScore}/100
Risk Level: ${riskLevel.toUpperCase()}
Triggered Rules: ${triggeredRules.join(', ') || 'None'}

Bitte prüfen und ggf. Maßnahmen ergreifen.
        `.trim(),
        priority: riskScore >= 85 ? 'CRITICAL' : 'HIGH',
        status: 'OPEN',
        category: 'FRAUD',
      },
    });

    return ticket.id;
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  private async notifySupportForBlock(
    request: SecurityCheckRequest,
    risk: { score: number; level: RiskLevel; triggeredRules: string[] },
    ticketId: string
  ): Promise<void> {
    await notificationService.send({
      eventType: 'HIGH_RISK_BLOCKED',
      entityType: MitigationEntityType.USER,
      entityId: request.entity.id,
      priority: risk.score >= 85 ? 'CRITICAL' : 'HIGH',
      channels: ['SLACK', 'EMAIL'],
      data: {
        userId: request.user.id,
        userEmail: request.user.email,
        action: request.action,
        entityType: request.entity.type,
        entityId: request.entity.id,
        riskScore: risk.score,
        riskLevel: risk.level,
        triggeredRules: risk.triggeredRules,
        ticketId,
      },
    });
  }

  // ============================================
  // AUDIT LOGGING
  // ============================================

  private async logSecurityEvent(params: {
    actorId: string;
    action: string;
    entityType: SecurityEntityType;
    entityId: string;
    decision: AuditDecision;
    errorCode?: SecurityErrorCode;
    message?: string;
    riskScore?: number;
    riskLevel?: RiskLevel;
    riskFactors?: string[];
    mitigations?: MitigationType[];
    supportTicketId?: string;
    correlationId: string;
  }): Promise<void> {
    try {
      await auditService.log({
        actorType: 'USER',
        actorId: params.actorId,
        action: params.errorCode || 'SECURITY_CHECK',
        decision: params.decision,
        entityType: mapEntityTypeToAudit(params.entityType),
        entityId: params.entityId,
        riskScore: params.riskScore,
        riskLevel: params.riskLevel ? mapRiskLevelToAudit(params.riskLevel) : undefined,
        metadata: {
          action: params.action,
          message: params.message,
          riskFactors: params.riskFactors,
          mitigations: params.mitigations,
          supportTicketId: params.supportTicketId,
          correlationId: params.correlationId,
        },
        sourceService: 'security-gateway',
      });
    } catch (error) {
      console.error('[SecurityGateway] Error logging security event:', error);
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const securityGatewayService = new SecurityGatewayService();
export default securityGatewayService;
