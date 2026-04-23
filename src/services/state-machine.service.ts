// ============================================
// CARGOBIT STATE MACHINE SERVICE
// Implements Risk, Mitigation, and Support Ticket State Machines
// Version: 1.0
// ============================================

import { db } from '@/lib/db';
import {
  RiskState,
  RiskSubState,
  RiskStateTransition,
  RiskStateMachineConfig,
  RiskStateTransitionResult,
  MitigationState,
  MitigationStateTransition,
  MitigationStateMachineConfig,
  MitigationStateTransitionResult,
  SupportTicketState,
  SupportTicketStateTransition,
  SupportTicketStateMachineConfig,
  SupportTicketStateTransitionResult,
  isValidRiskTransition,
  isValidMitigationTransition,
  isValidTicketTransition,
  getNextRiskState,
  getNextMitigationState,
  getNextTicketState,
  RISK_STATE_MAPPING,
  MITIGATION_STATE_MAPPING,
  TICKET_STATE_MAPPING,
} from '@/types/state-machines';
import { auditService } from '@/services/audit.service';

// ============================================
// RISK STATE MACHINE SERVICE
// ============================================

class RiskStateMachineService {
  /**
   * Get current risk state for an entity
   */
  async getState(entityType: string, entityId: string): Promise<RiskStateMachineConfig | null> {
    const riskScore = await db.riskScore.findUnique({
      where: {
        entityType_entityId: {
          entityType: entityType.toUpperCase() as any,
          entityId,
        },
      },
    });

    if (!riskScore) {
      return null;
    }

    const subState = this.determineSubState(riskScore.score, riskScore.riskLevel.toLowerCase() as RiskState);

    return {
      currentState: riskScore.riskLevel.toLowerCase() as RiskState,
      subState,
      score: riskScore.score,
      transitionedAt: riskScore.updatedAt,
    };
  }

  /**
   * Transition risk state
   */
  async transition(
    entityType: string,
    entityId: string,
    transition: RiskStateTransition,
    options?: {
      newLevel?: RiskState;
      newScore?: number;
      actorId?: string;
      reason?: string;
    }
  ): Promise<RiskStateTransitionResult> {
    // Get current state
    const currentState = await this.getState(entityType, entityId);
    const previousState = currentState?.currentState || 'green';
    const previousScore = currentState?.score || 0;

    // Validate transition
    if (!isValidRiskTransition(previousState, transition)) {
      throw new Error(`Invalid risk state transition: ${previousState} -> ${transition}`);
    }

    // Determine new state
    const newState = getNextRiskState(previousState, transition, options?.newLevel);
    const newScore = options?.newScore ?? this.calculateScoreForTransition(previousScore, transition, newState);
    const newSubState = this.determineSubState(newScore, newState);

    // Update database
    await db.riskScore.upsert({
      where: {
        entityType_entityId: {
          entityType: entityType.toUpperCase() as any,
          entityId,
        },
      },
      create: {
        entityType: entityType.toUpperCase() as any,
        entityId,
        score: newScore,
        riskLevel: newState.toUpperCase() as any,
        factorsCount: 0,
        lastEventAt: new Date(),
      },
      update: {
        score: newScore,
        riskLevel: newState.toUpperCase() as any,
        lastEventAt: new Date(),
      },
    });

    // Create history entry
    await db.riskHistory.create({
      data: {
        entityType: entityType.toUpperCase() as any,
        entityId,
        oldScore: previousScore,
        newScore,
        scoreChange: newScore - previousScore,
        oldLevel: previousState.toUpperCase(),
        newLevel: newState.toUpperCase(),
        reason: options?.reason || `State transition: ${transition}`,
      },
    });

    // Log to audit
    if (options?.actorId) {
      await auditService.log({
        actorType: 'USER',
        actorId: options.actorId,
        action: 'RISK_STATE_TRANSITION',
        decision: 'ALLOWED',
        entityType: entityType.toUpperCase() as any,
        entityId,
        riskScore: newScore,
        riskLevel: newState.toUpperCase() as any,
        metadata: {
          transition,
          previousState,
          newState,
          reason: options.reason,
        },
        sourceService: 'state-machine',
      });
    }

    return {
      previousState,
      newState,
      previousSubState: currentState?.subState,
      newSubState,
      transition,
      scoreChange: newScore - previousScore,
      triggeredRules: [],
    };
  }

  /**
   * Determine sub-state based on score and level
   */
  private determineSubState(score: number, level: RiskState): RiskSubState {
    switch (level) {
      case 'green':
        return 'stable';
      case 'yellow':
        return score >= 45 ? 'mitigation_required' : 'monitoring';
      case 'red':
        return score >= 85 ? 'escalated' : 'blocked';
    }
  }

  /**
   * Calculate score for a transition
   */
  private calculateScoreForTransition(
    previousScore: number,
    transition: RiskStateTransition,
    newState: RiskState
  ): number {
    switch (transition) {
      case 'low_risk_event':
        return Math.max(0, previousScore - 5);
      case 'medium_risk_event':
        return Math.min(60, previousScore + 15);
      case 'high_risk_event':
        return Math.min(100, previousScore + 30);
      case 'risk_decay':
        return Math.max(0, previousScore - 10);
      case 'manual_override':
        // Use the score corresponding to the new level
        return newState === 'green' ? 15 : newState === 'yellow' ? 45 : 75;
      default:
        return previousScore;
    }
  }
}

// ============================================
// MITIGATION STATE MACHINE SERVICE
// ============================================

class MitigationStateMachineService {
  /**
   * Get current mitigation state
   */
  async getState(mitigationId: string): Promise<MitigationStateMachineConfig | null> {
    const event = await db.mitigationEvent.findUnique({
      where: { id: mitigationId },
    });

    if (!event) {
      return null;
    }

    return {
      mitigationId: event.id,
      mitigationType: event.mitigationType as any,
      currentState: this.mapDbStatusToState(event.status),
      attempts: event.attempts,
      maxAttempts: event.maxAttempts,
      createdAt: event.createdAt,
      expiresAt: event.expiresAt || undefined,
    };
  }

  /**
   * Transition mitigation state
   */
  async transition(
    mitigationId: string,
    transition: MitigationStateTransition,
    options?: {
      metadata?: Record<string, unknown>;
    }
  ): Promise<MitigationStateTransitionResult> {
    // Get current state
    const currentState = await this.getState(mitigationId);
    if (!currentState) {
      throw new Error(`Mitigation not found: ${mitigationId}`);
    }

    const previousState = currentState.currentState;

    // Validate transition
    if (!isValidMitigationTransition(currentState.mitigationType, previousState, transition)) {
      throw new Error(
        `Invalid mitigation state transition for type ${currentState.mitigationType}: ${previousState} -> ${transition}`
      );
    }

    // Determine new state
    const newState = getNextMitigationState(previousState, transition);

    // Update database
    const updateData: any = {
      status: this.mapStateToDbStatus(newState),
    };

    if (newState === 'completed') {
      updateData.completedAt = new Date();
    }

    if (options?.metadata) {
      updateData.metadata = JSON.stringify(options.metadata);
    }

    await db.mitigationEvent.update({
      where: { id: mitigationId },
      data: updateData,
    });

    // If completed or failed/expired, deactivate the mitigation status
    if (['completed', 'failed', 'expired'].includes(newState)) {
      const event = await db.mitigationEvent.findUnique({
        where: { id: mitigationId },
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

    // Log to audit
    await auditService.log({
      actorType: 'SYSTEM',
      action: 'MITIGATION_STATE_TRANSITION',
      decision: newState === 'completed' ? 'ALLOWED' : 'MITIGATION',
      entityType: 'TRANSACTION',
      entityId: mitigationId,
      metadata: {
        transition,
        previousState,
        newState,
        mitigationType: currentState.mitigationType,
        ...options?.metadata,
      },
      sourceService: 'state-machine',
    });

    return {
      previousState,
      newState,
      transition,
      timestamp: new Date(),
      metadata: options?.metadata,
    };
  }

  /**
   * Map database status to state machine state
   */
  private mapDbStatusToState(status: string): MitigationState {
    const mapping: Record<string, MitigationState> = {
      PENDING: 'pending',
      IN_PROGRESS: 'waiting_for_user', // Most common for user-action states
      COMPLETED: 'completed',
      FAILED: 'failed',
      EXPIRED: 'expired',
    };
    return mapping[status] || 'pending';
  }

  /**
   * Map state machine state to database status
   */
  private mapStateToDbStatus(state: MitigationState): string {
    const mapping: Record<MitigationState, string> = {
      pending: 'PENDING',
      waiting_for_user: 'IN_PROGRESS',
      scheduled: 'IN_PROGRESS',
      executing: 'IN_PROGRESS',
      completed: 'COMPLETED',
      failed: 'FAILED',
      expired: 'EXPIRED',
    };
    return mapping[state];
  }
}

// ============================================
// SUPPORT TICKET STATE MACHINE SERVICE
// ============================================

class SupportTicketStateMachineService {
  /**
   * Get current ticket state
   */
  async getState(ticketId: string): Promise<SupportTicketStateMachineConfig | null> {
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return null;
    }

    return {
      ticketId: ticket.id,
      currentState: this.mapDbStatusToState(ticket.status),
      userId: ticket.userId,
      riskScore: ticket.priority === 'CRITICAL' ? 85 : ticket.priority === 'HIGH' ? 70 : 50,
      riskLevel: 'red',
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      assignedTo: ticket.assignedTo || undefined,
    };
  }

  /**
   * Transition ticket state
   */
  async transition(
    ticketId: string,
    transition: SupportTicketStateTransition,
    options?: {
      actorId?: string;
      notes?: string;
      assignedTo?: string;
    }
  ): Promise<SupportTicketStateTransitionResult> {
    // Get current state
    const currentState = await this.getState(ticketId);
    if (!currentState) {
      throw new Error(`Support ticket not found: ${ticketId}`);
    }

    const previousState = currentState.currentState;

    // Validate transition
    if (!isValidTicketTransition(previousState, transition)) {
      throw new Error(`Invalid ticket state transition: ${previousState} -> ${transition}`);
    }

    // Determine new state
    const newState = getNextTicketState(previousState, transition);

    // Update database
    await db.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: this.mapStateToDbStatus(newState),
        assignedTo: options?.assignedTo,
        updatedAt: new Date(),
      },
    });

    // Add note if provided
    if (options?.notes) {
      await db.supportTicketMessage.create({
        data: {
          ticketId,
          senderId: options.actorId || 'system',
          message: options.notes,
          isInternal: true,
        },
      });
    }

    // Log to audit
    await auditService.log({
      actorType: options?.actorId ? 'USER' : 'SYSTEM',
      actorId: options?.actorId,
      action: 'TICKET_STATE_TRANSITION',
      decision: 'ALLOWED',
      entityType: 'USER',
      entityId: ticketId,
      metadata: {
        transition,
        previousState,
        newState,
        notes: options?.notes,
      },
      sourceService: 'state-machine',
    });

    return {
      previousState,
      newState,
      transition,
      timestamp: new Date(),
      actorId: options?.actorId,
      notes: options?.notes,
    };
  }

  /**
   * Map database status to state machine state
   */
  private mapDbStatusToState(status: string): SupportTicketState {
    const mapping: Record<string, SupportTicketState> = {
      OPEN: 'open',
      IN_PROGRESS: 'investigating',
      WAITING_FOR_USER: 'waiting_for_user',
      ESCALATED: 'escalated',
      RESOLVED: 'resolved',
      BLOCKED: 'blocked',
      EXPIRED: 'expired',
      CLOSED: 'closed',
    };
    return mapping[status] || 'open';
  }

  /**
   * Map state machine state to database status
   */
  private mapStateToDbStatus(state: SupportTicketState): string {
    const mapping: Record<SupportTicketState, string> = {
      open: 'OPEN',
      investigating: 'IN_PROGRESS',
      waiting_for_user: 'WAITING_FOR_USER',
      escalated: 'ESCALATED',
      resolved: 'RESOLVED',
      blocked: 'BLOCKED',
      expired: 'EXPIRED',
      closed: 'CLOSED',
    };
    return mapping[state];
  }
}

// ============================================
// SINGLETON EXPORTS
// ============================================

export const riskStateMachine = new RiskStateMachineService();
export const mitigationStateMachine = new MitigationStateMachineService();
export const supportTicketStateMachine = new SupportTicketStateMachineService();

export default {
  risk: riskStateMachine,
  mitigation: mitigationStateMachine,
  supportTicket: supportTicketStateMachine,
};
