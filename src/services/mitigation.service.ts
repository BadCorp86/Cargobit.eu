// ============================================
// CARGOBIT MITIGATION SERVICE
// Yellow Risk Mitigation System
// Version: 1.0.0
// ============================================

import { db } from '@/lib/db';
import {
  MitigationType,
  MitigationStatus,
  MitigationEntityType,
  ApplyMitigationRequest,
  ApplyMitigationResponse,
  Verify2FARequest,
  Verify2FAResponse,
  VerifyGPSRequest,
  VerifyGPSResponse,
  MitigationStatusResponse,
  MitigationStatusItem,
  MitigationContext,
  MitigationRuleConfig,
  DEFAULT_MITIGATION_CONFIGS,
  MITIGATION_ERROR_CODES,
  getMaxAttempts,
} from '@/types/mitigation';
import { notificationService } from '@/services/notification.service';
import { auditService } from '@/services/audit.service';

// ============================================
// 2FA CODE GENERATOR
// ============================================

function generate2FACode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

// ============================================
// GPS DISTANCE CALCULATOR (Haversine)
// ============================================

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================
// MITIGATION SERVICE CLASS
// ============================================

class MitigationService {
  // ============================================
  // CORE METHODS
  // ============================================

  /**
   * Apply a mitigation to an entity
   */
  async apply(request: ApplyMitigationRequest): Promise<ApplyMitigationResponse> {
    try {
      // 1. Check if mitigation already active
      const existingStatus = await db.mitigationStatus.findUnique({
        where: {
          entityType_entityId_mitigationType: {
            entityType: request.entityType as any,
            entityId: request.entityId,
            mitigationType: request.mitigationType as any,
          },
        },
      });

      if (existingStatus && existingStatus.active) {
        return {
          status: 'error',
          errorCode: MITIGATION_ERROR_CODES.MITIGATION_ALREADY_APPLIED.code,
          message: MITIGATION_ERROR_CODES.MITIGATION_ALREADY_APPLIED.message,
        };
      }

      // 2. Get or create default config
      const config = await this.getConfig(request.mitigationType, request.context);

      // 3. Create mitigation event
      const maxAttempts = getMaxAttempts(request.mitigationType);
      const event = await db.mitigationEvent.create({
        data: {
          entityType: request.entityType as any,
          entityId: request.entityId,
          action: request.action,
          mitigationType: request.mitigationType as any,
          status: MitigationStatus.PENDING,
          config: JSON.stringify(config),
          maxAttempts,
          expiresAt: this.calculateExpiry(request.mitigationType, config),
        },
      });

      // 4. Create mitigation status
      await db.mitigationStatus.create({
        data: {
          entityType: request.entityType as any,
          entityId: request.entityId,
          mitigationType: request.mitigationType as any,
          active: true,
          relatedEventId: event.id,
          expiresAt: event.expiresAt,
        },
      });

      // 5. Execute mitigation-specific logic
      const result = await this.executeMitigation(
        event.id,
        request.mitigationType,
        request.context,
        config
      );

      // 6. Log to audit
      await auditService.log({
        actorType: 'SYSTEM' as any,
        action: 'RISK_MITIGATION',
        decision: 'MITIGATION' as any,
        entityType: request.entityType as any,
        entityId: request.entityId,
        metadata: {
          mitigationType: request.mitigationType,
          mitigationId: event.id,
          action: request.action,
        },
        sourceService: 'mitigation-service',
      });

      return {
        status: result.status,
        mitigationId: event.id,
        message: result.message,
        executeAt: result.executeAt,
      };
    } catch (error) {
      console.error('[MitigationService] Error in apply:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute mitigation-specific logic
   */
  private async executeMitigation(
    eventId: string,
    type: MitigationType,
    context: MitigationContext,
    config: MitigationRuleConfig
  ): Promise<{ status: 'pending' | 'completed'; message: string; executeAt?: Date }> {
    switch (type) {
      case MitigationType.DELAY:
        return this.executeDelay(eventId, context, config);
      case MitigationType.TWO_FACTOR:
        return this.execute2FA(eventId, context, config);
      case MitigationType.GPS_CHECK:
        return this.executeGPSCheck(eventId, context, config);
      case MitigationType.EXTRA_LOGGING:
        return this.executeExtraLogging(eventId, context, config);
      case MitigationType.DOCUMENT_RECHECK:
        return this.executeDocumentRecheck(eventId, context, config);
      case MitigationType.MANUAL_REVIEW:
        return this.executeManualReview(eventId, context, config);
      case MitigationType.AMOUNT_LIMIT:
        return this.executeAmountLimit(eventId, context, config);
      default:
        throw new Error(`Unknown mitigation type: ${type}`);
    }
  }

  // ============================================
  // DELAY MITIGATION
  // ============================================

  /**
   * Execute DELAY Mitigation
   */
  private async executeDelay(
    eventId: string,
    context: MitigationContext,
    config: MitigationRuleConfig
  ): Promise<{ status: 'pending'; message: string; executeAt: Date }> {
    const delayMinutes = context.delayMinutes || config.delayMinutes || 1440;
    const executeAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    // Create queue item for delayed execution
    await db.mitigationQueueItem.create({
      data: {
        eventId,
        executeAt,
        callbackAction: context.callbackAction,
        callbackData: context.callbackData ? JSON.stringify(context.callbackData) : null,
      },
    });

    // Update event with queue reference
    await db.mitigationEvent.update({
      where: { id: eventId },
      data: { status: MitigationStatus.IN_PROGRESS },
    });

    return {
      status: 'pending',
      message: `Mitigation applied: delay of ${delayMinutes} minutes`,
      executeAt,
    };
  }

  /**
   * Execute 2FA Mitigation
   */
  private async execute2FA(
    eventId: string,
    context: MitigationContext,
    config: MitigationRuleConfig
  ): Promise<{ status: 'pending'; message: string }> {
    const codeLength = config.codeLength || 6;
    const code = generate2FACode(codeLength);

    // Store code in metadata (hashed in production)
    await db.mitigationEvent.update({
      where: { id: eventId },
      data: {
        status: MitigationStatus.IN_PROGRESS,
        metadata: JSON.stringify({
          code, // In production: hash this!
          codeGeneratedAt: new Date().toISOString(),
          userPhone: context.userPhone,
          userEmail: context.userEmail,
        }),
      },
    });

    // Send 2FA code via notification service
    if (context.userPhone) {
      await notificationService.send({
        eventType: 'USER_VERIFICATION_REQUIRED',
        entityType: MitigationEntityType.USER,
        entityId: context.userId || eventId,
        priority: 'HIGH' as any,
        channels: ['SMS'] as any,
        data: {
          code,
          action: context.callbackAction || 'verification',
        },
      });
    } else if (context.userEmail) {
      await notificationService.send({
        eventType: 'USER_VERIFICATION_REQUIRED',
        entityType: MitigationEntityType.USER,
        entityId: context.userId || eventId,
        priority: 'HIGH' as any,
        channels: ['EMAIL'] as any,
        data: {
          code,
          action: context.callbackAction || 'verification',
        },
      });
    }

    return {
      status: 'pending',
      message: 'Mitigation applied: 2FA code sent',
    };
  }

  /**
   * Execute GPS Check Mitigation
   */
  private async executeGPSCheck(
    eventId: string,
    context: MitigationContext,
    config: MitigationRuleConfig
  ): Promise<{ status: 'pending'; message: string }> {
    await db.mitigationEvent.update({
      where: { id: eventId },
      data: {
        status: MitigationStatus.IN_PROGRESS,
        metadata: JSON.stringify({
          expectedGps: context.expectedGps,
          maxDistanceMeters: config.maxDistanceMeters || 1000,
          allowedCountries: config.allowedCountries,
        }),
      },
    });

    return {
      status: 'pending',
      message: 'Mitigation applied: GPS check required',
    };
  }

  /**
   * Execute Extra Logging Mitigation
   */
  private async executeExtraLogging(
    eventId: string,
    context: MitigationContext,
    config: MitigationRuleConfig
  ): Promise<{ status: 'completed'; message: string }> {
    // Extra logging is immediately successful
    await db.mitigationEvent.update({
      where: { id: eventId },
      data: {
        status: MitigationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Deactivate mitigation status
    await this.deactivateMitigation(eventId);

    return {
      status: 'completed',
      message: 'Mitigation applied: extra logging enabled',
    };
  }

  /**
   * Execute Document Recheck Mitigation
   */
  private async executeDocumentRecheck(
    eventId: string,
    context: MitigationContext,
    config: MitigationRuleConfig
  ): Promise<{ status: 'pending'; message: string }> {
    await db.mitigationEvent.update({
      where: { id: eventId },
      data: {
        status: MitigationStatus.IN_PROGRESS,
        metadata: JSON.stringify({
          userId: context.userId,
          recheckRequested: true,
        }),
      },
    });

    // Notify user for document recheck
    if (context.userEmail) {
      await notificationService.send({
        eventType: 'USER_VERIFICATION_REQUIRED',
        entityType: MitigationEntityType.USER,
        entityId: context.userId || eventId,
        priority: 'MEDIUM' as any,
        channels: ['EMAIL'] as any,
        data: {
          reason: 'document_recheck',
        },
      });
    }

    return {
      status: 'pending',
      message: 'Mitigation applied: document recheck required',
    };
  }

  /**
   * Execute Manual Review Mitigation
   */
  private async executeManualReview(
    eventId: string,
    context: MitigationContext,
    config: MitigationRuleConfig
  ): Promise<{ status: 'pending'; message: string }> {
    await db.mitigationEvent.update({
      where: { id: eventId },
      data: {
        status: MitigationStatus.IN_PROGRESS,
      },
    });

    // Notify support team
    await notificationService.send({
      eventType: 'SUPPORT_TICKET_CREATED',
      entityType: MitigationEntityType.TRANSACTION,
      entityId: eventId,
      priority: 'HIGH' as any,
      channels: ['SLACK', 'EMAIL'] as any,
      data: {
        reason: 'Manual review required',
        mitigationId: eventId,
        context,
      },
    });

    return {
      status: 'pending',
      message: 'Mitigation applied: manual review requested',
    };
  }

  /**
   * Execute Amount Limit Mitigation
   */
  private async executeAmountLimit(
    eventId: string,
    context: MitigationContext,
    config: MitigationRuleConfig
  ): Promise<{ status: 'completed'; message: string }> {
    const maxAmount = config.maxAmount || 50000;
    const amount = context.amount || 0;

    await db.mitigationEvent.update({
      where: { id: eventId },
      data: {
        status: MitigationStatus.COMPLETED,
        completedAt: new Date(),
        metadata: JSON.stringify({
          originalAmount: amount,
          maxAmount,
          limited: amount > maxAmount,
        }),
      },
    });

    await this.deactivateMitigation(eventId);

    return {
      status: 'completed',
      message: amount > maxAmount 
        ? `Mitigation applied: amount limited to ${maxAmount} ${config.currency || 'EUR'}`
        : 'Mitigation applied: amount within limits',
    };
  }

  // ============================================
  // VERIFICATION METHODS
  // ============================================

  /**
   * Verify 2FA code
   */
  async verify2FA(request: Verify2FARequest): Promise<Verify2FAResponse> {
    try {
      const event = await db.mitigationEvent.findUnique({
        where: { id: request.mitigationId },
      });

      if (!event) {
        return {
          status: 'error',
          message: MITIGATION_ERROR_CODES.MITIGATION_NOT_FOUND.message,
        };
      }

      if (event.mitigationType !== 'TWO_FACTOR' as any) {
        return {
          status: 'error',
          message: 'This mitigation is not a 2FA verification',
        };
      }

      if (event.status !== MitigationStatus.IN_PROGRESS) {
        return {
          status: 'error',
          message: MITIGATION_ERROR_CODES.MITIGATION_NOT_ACTIVE.message,
        };
      }

      const metadata = event.metadata ? JSON.parse(event.metadata) : {};
      const storedCode = metadata.code;

      // Check attempts
      if (event.attempts >= event.maxAttempts) {
        await db.mitigationEvent.update({
          where: { id: request.mitigationId },
          data: { status: MitigationStatus.FAILED },
        });
        await this.deactivateMitigation(request.mitigationId);
        return {
          status: 'failed',
          message: MITIGATION_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED.message,
        };
      }

      // Increment attempts
      await db.mitigationEvent.update({
        where: { id: request.mitigationId },
        data: { attempts: { increment: 1 } },
      });

      // Verify code
      if (request.code === storedCode) {
        await db.mitigationEvent.update({
          where: { id: request.mitigationId },
          data: {
            status: MitigationStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
        await this.deactivateMitigation(request.mitigationId);

        // Audit log
        await auditService.log({
          actorType: 'USER' as any,
          actorId: metadata.userId,
          action: 'RISK_MITIGATION',
          decision: 'ALLOWED' as any,
          entityType: event.entityType,
          entityId: event.entityId,
          metadata: {
            mitigationType: 'TWO_FACTOR',
            mitigationId: request.mitigationId,
            verified: true,
          },
          sourceService: 'mitigation-service',
        });

        return {
          status: 'completed',
          message: '2FA verification successful',
        };
      }

      return {
        status: 'failed',
        message: MITIGATION_ERROR_CODES.INVALID_2FA_CODE.message,
        remainingAttempts: event.maxAttempts - event.attempts - 1,
      };
    } catch (error) {
      console.error('[MitigationService] Error in verify2FA:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify GPS location
   */
  async verifyGPS(request: VerifyGPSRequest): Promise<VerifyGPSResponse> {
    try {
      const event = await db.mitigationEvent.findUnique({
        where: { id: request.mitigationId },
      });

      if (!event) {
        return {
          status: 'error',
          message: MITIGATION_ERROR_CODES.MITIGATION_NOT_FOUND.message,
        };
      }

      if (event.mitigationType !== 'GPS_CHECK' as any) {
        return {
          status: 'error',
          message: 'This mitigation is not a GPS check',
        };
      }

      if (event.status !== MitigationStatus.IN_PROGRESS) {
        return {
          status: 'error',
          message: MITIGATION_ERROR_CODES.MITIGATION_NOT_ACTIVE.message,
        };
      }

      const metadata = event.metadata ? JSON.parse(event.metadata) : {};
      const expectedGps = metadata.expectedGps;
      const maxDistance = metadata.maxDistanceMeters || 1000;

      // Check attempts
      if (event.attempts >= event.maxAttempts) {
        await db.mitigationEvent.update({
          where: { id: request.mitigationId },
          data: { status: MitigationStatus.FAILED },
        });
        await this.deactivateMitigation(request.mitigationId);
        return {
          status: 'failed',
          message: MITIGATION_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED.message,
        };
      }

      // Increment attempts
      await db.mitigationEvent.update({
        where: { id: request.mitigationId },
        data: {
          attempts: { increment: 1 },
          metadata: JSON.stringify({
            ...metadata,
            lastGpsAttempt: request.gps,
            lastAttemptAt: new Date().toISOString(),
          }),
        },
      });

      // Calculate distance
      let distance = 0;
      if (expectedGps) {
        distance = calculateDistance(
          expectedGps.lat,
          expectedGps.lng,
          request.gps.lat,
          request.gps.lng
        );
      }

      // Check if within range
      if (distance <= maxDistance) {
        await db.mitigationEvent.update({
          where: { id: request.mitigationId },
          data: {
            status: MitigationStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
        await this.deactivateMitigation(request.mitigationId);

        // Audit log
        await auditService.log({
          actorType: 'USER' as any,
          action: 'RISK_MITIGATION',
          decision: 'ALLOWED' as any,
          entityType: event.entityType,
          entityId: event.entityId,
          metadata: {
            mitigationType: 'GPS_CHECK',
            mitigationId: request.mitigationId,
            distance,
            verified: true,
          },
          sourceService: 'mitigation-service',
        });

        return {
          status: 'completed',
          message: 'GPS location verified',
          distance,
        };
      }

      return {
        status: 'failed',
        message: `${MITIGATION_ERROR_CODES.GPS_OUT_OF_RANGE.message} (${Math.round(distance)}m > ${maxDistance}m)`,
        distance,
        remainingAttempts: event.maxAttempts - event.attempts - 1,
      };
    } catch (error) {
      console.error('[MitigationService] Error in verifyGPS:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================
  // STATUS METHODS
  // ============================================

  /**
   * Get active mitigations for an entity
   */
  async getStatus(
    entityType: MitigationEntityType,
    entityId: string
  ): Promise<MitigationStatusResponse> {
    const statuses = await db.mitigationStatus.findMany({
      where: {
        entityType: entityType as any,
        entityId,
        active: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        relatedEvent: true,
      },
    });

    const mitigations: MitigationStatusItem[] = statuses
      .filter(s => s.relatedEvent)
      .map(s => ({
        id: s.relatedEvent!.id,
        mitigationType: s.mitigationType as MitigationType,
        status: s.relatedEvent!.status as MitigationStatus,
        action: s.relatedEvent!.action,
        createdAt: s.relatedEvent!.createdAt,
        expiresAt: s.expiresAt || undefined,
        completedAt: s.relatedEvent!.completedAt || undefined,
        attempts: s.relatedEvent!.attempts,
        maxAttempts: s.relatedEvent!.maxAttempts,
      }));

    return {
      entityType,
      entityId,
      mitigations,
    };
  }

  /**
   * Get pending queue items for processing
   */
  async getPendingQueueItems(limit: number = 100): Promise<string[]> {
    const items = await db.mitigationQueueItem.findMany({
      where: {
        executeAt: { lte: new Date() },
        event: { status: MitigationStatus.IN_PROGRESS },
      },
      orderBy: { executeAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    return items.map(item => item.id);
  }

  /**
   * Process a queue item (for DELAY mitigations)
   */
  async processQueueItem(queueItemId: string): Promise<boolean> {
    const queueItem = await db.mitigationQueueItem.findUnique({
      where: { id: queueItemId },
      include: { event: true },
    });

    if (!queueItem || !queueItem.event) {
      return false;
    }

    // Update event status
    await db.mitigationEvent.update({
      where: { id: queueItem.eventId },
      data: {
        status: MitigationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Deactivate mitigation status
    await this.deactivateMitigation(queueItem.eventId);

    // Remove queue item
    await db.mitigationQueueItem.delete({
      where: { id: queueItemId },
    });

    // Audit log
    await auditService.log({
      actorType: 'SYSTEM' as any,
      action: 'RISK_MITIGATION',
      decision: 'ALLOWED' as any,
      entityType: queueItem.event.entityType,
      entityId: queueItem.event.entityId,
      metadata: {
        mitigationType: queueItem.event.mitigationType,
        mitigationId: queueItem.eventId,
        delayCompleted: true,
        callbackAction: queueItem.callbackAction,
      },
      sourceService: 'mitigation-service',
    });

    return true;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get configuration for mitigation type
   */
  private async getConfig(
    type: MitigationType,
    context: MitigationContext
  ): Promise<MitigationRuleConfig> {
    const rule = await db.mitigationRule.findFirst({
      where: {
        mitigationType: type as any,
        active: true,
      },
    });

    if (rule && rule.config) {
      return { ...DEFAULT_MITIGATION_CONFIGS[type], ...JSON.parse(rule.config) };
    }

    return DEFAULT_MITIGATION_CONFIGS[type];
  }

  /**
   * Calculate expiry date for mitigation
   */
  private calculateExpiry(
    type: MitigationType,
    config: MitigationRuleConfig
  ): Date | null {
    switch (type) {
      case MitigationType.DELAY:
        const delayMinutes = config.delayMinutes || 1440;
        return new Date(Date.now() + delayMinutes * 60 * 1000);
      case MitigationType.TWO_FACTOR:
        const expiryMinutes = config.codeExpiryMinutes || 10;
        return new Date(Date.now() + expiryMinutes * 60 * 1000);
      case MitigationType.GPS_CHECK:
        return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      default:
        return null;
    }
  }

  /**
   * Deactivate mitigation status
   */
  private async deactivateMitigation(eventId: string): Promise<void> {
    const event = await db.mitigationEvent.findUnique({
      where: { id: eventId },
    });

    if (event) {
      await db.mitigationStatus.updateMany({
        where: {
          entityType: event.entityType,
          entityId: event.entityId,
          mitigationType: event.mitigationType,
          active: true,
        },
        data: { active: false },
      });
    }
  }

  // ============================================
  // RULE MANAGEMENT
  // ============================================

  /**
   * Create or update mitigation rule
   */
  async upsertRule(params: {
    mitigationType: MitigationType;
    description?: string;
    config?: MitigationRuleConfig;
    conditions?: Record<string, unknown>;
    active?: boolean;
    priority?: number;
  }): Promise<{ id: string; mitigationType: string }> {
    const rule = await db.mitigationRule.upsert({
      where: { mitigationType: params.mitigationType as any },
      create: {
        mitigationType: params.mitigationType as any,
        description: params.description,
        config: params.config ? JSON.stringify(params.config) : null,
        conditions: params.conditions ? JSON.stringify(params.conditions) : null,
        active: params.active ?? true,
        priority: params.priority || 0,
      },
      update: {
        description: params.description,
        config: params.config ? JSON.stringify(params.config) : null,
        conditions: params.conditions ? JSON.stringify(params.conditions) : null,
        active: params.active ?? true,
        priority: params.priority,
      },
    });

    return { id: rule.id, mitigationType: rule.mitigationType };
  }

  /**
   * Get all active rules
   */
  async getRules(): Promise<Array<{
    id: string;
    mitigationType: string;
    description?: string;
    config?: MitigationRuleConfig;
    conditions?: Record<string, unknown>;
    active: boolean;
    priority: number;
  }>> {
    const rules = await db.mitigationRule.findMany({
      where: { active: true },
      orderBy: { priority: 'desc' },
    });

    return rules.map(r => ({
      id: r.id,
      mitigationType: r.mitigationType,
      description: r.description || undefined,
      config: r.config ? JSON.parse(r.config) : undefined,
      conditions: r.conditions ? JSON.parse(r.conditions) : undefined,
      active: r.active,
      priority: r.priority,
    }));
  }

  // ============================================
  // DETERMINE MITIGATIONS (for Hybrid Layer)
  // ============================================

  /**
   * Determine which mitigations to apply based on action and risk
   */
  async determineMitigations(params: {
    action: string;
    riskScore: number;
    entityType: MitigationEntityType;
    entityId: string;
    context: MitigationContext;
  }): Promise<MitigationType[]> {
    const mitigations: MitigationType[] = [];

    // Always add extra logging for yellow risk
    mitigations.push(MitigationType.EXTRA_LOGGING);

    // Determine based on action type
    switch (params.action) {
      case 'INITIATE_PAYOUT':
        // Payouts get delay for yellow risk
        if (params.riskScore >= 40) {
          mitigations.push(MitigationType.DELAY);
        }
        // High amounts require extra checks
        if ((params.context.amount || 0) > 50000) {
          mitigations.push(MitigationType.AMOUNT_LIMIT);
        }
        break;

      case 'ACCEPT_OFFER':
      case 'ACCEPT_JOB':
        // High value transports need 2FA
        if (params.riskScore >= 50 && (params.context.amount || 0) > 10000) {
          mitigations.push(MitigationType.TWO_FACTOR);
        }
        // GPS check for drivers
        if (params.action === 'ACCEPT_JOB') {
          mitigations.push(MitigationType.GPS_CHECK);
        }
        break;

      case 'UPDATE_STATUS':
        // GPS check for status updates from drivers
        mitigations.push(MitigationType.GPS_CHECK);
        break;

      case 'ASSIGN_DRIVER':
        // Manual review for sensitive assignments
        if (params.riskScore >= 55) {
          mitigations.push(MitigationType.MANUAL_REVIEW);
        }
        break;
    }

    // Check for specific risk factors
    if (params.context.triggeredRules?.includes?.('user_new_iban')) {
      if (!mitigations.includes(MitigationType.TWO_FACTOR)) {
        mitigations.push(MitigationType.TWO_FACTOR);
      }
    }

    if (params.context.triggeredRules?.includes?.('geo_mismatch')) {
      if (!mitigations.includes(MitigationType.GPS_CHECK)) {
        mitigations.push(MitigationType.GPS_CHECK);
      }
    }

    if (params.context.triggeredRules?.includes?.('document_expired')) {
      mitigations.push(MitigationType.DOCUMENT_RECHECK);
    }

    return [...new Set(mitigations)]; // Remove duplicates
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const mitigationService = new MitigationService();
export default mitigationService;
