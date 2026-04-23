// ============================================
// CARGOBIT SECURITY STATE MACHINES
// Version: 1.0 - Based on Mermaid Diagrams
// ============================================

// ============================================
// RISK STATE MACHINE
// Green → Yellow → Red → Override
// ============================================

/**
 * Risk State Machine States
 * 
 * @see Mermaid Diagram:
 * stateDiagram-v2
 *   [*] --> green : initial score < 30
 *   green --> green : low_risk_event
 *   green --> yellow : medium_risk_event
 *   green --> red : high_risk_event
 *   yellow --> yellow : repeated_medium_events
 *   yellow --> red : high_risk_event
 *   yellow --> green : risk_decay / manual_override
 *   red --> red : repeated_high_risk_events
 *   red --> yellow : manual_override
 *   red --> green : manual_override
 *   green --> green : manual_override
 */
export type RiskState = 'green' | 'yellow' | 'red';

/**
 * Risk State Sub-States
 * - green.stable: Normal, stable low-risk state
 * - yellow.monitoring: Elevated risk, under observation
 * - yellow.mitigation_required: Mitigation actions pending
 * - red.blocked: Action blocked due to high risk
 * - red.escalated: Support ticket created
 */
export type RiskSubState =
  | 'stable'
  | 'monitoring'
  | 'mitigation_required'
  | 'blocked'
  | 'escalated';

/**
 * Risk State Transitions
 */
export type RiskStateTransition =
  | 'initial_score'
  | 'low_risk_event'
  | 'medium_risk_event'
  | 'high_risk_event'
  | 'repeated_medium_events'
  | 'repeated_high_risk_events'
  | 'risk_decay'
  | 'manual_override';

/**
 * Risk State Machine Configuration
 */
export interface RiskStateMachineConfig {
  currentState: RiskState;
  subState?: RiskSubState;
  score: number;
  lastTransition?: RiskStateTransition;
  transitionedAt?: Date;
}

/**
 * Risk State Transition Result
 */
export interface RiskStateTransitionResult {
  previousState: RiskState;
  newState: RiskState;
  previousSubState?: RiskSubState;
  newSubState?: RiskSubState;
  transition: RiskStateTransition;
  scoreChange: number;
  triggeredRules: string[];
}

// ============================================
// MITIGATION STATE MACHINE
// Delay, 2FA, GPS-Check, Extra Logging
// ============================================

/**
 * Mitigation State Machine States
 * 
 * @see Mermaid Diagram:
 * stateDiagram-v2
 *   [*] --> pending : mitigation_created
 *   pending --> waiting_for_user : type=2fa
 *   pending --> waiting_for_user : type=gps_check
 *   pending --> scheduled : type=delay
 *   pending --> completed : type=extra_logging
 *   waiting_for_user --> completed : user_verified
 *   waiting_for_user --> failed : verification_failed
 *   waiting_for_user --> expired : timeout
 *   scheduled --> executing : delay_expired
 *   executing --> completed : action_executed
 *   executing --> failed : execution_error
 *   completed --> [*]
 *   failed --> [*]
 *   expired --> [*]
 */
export type MitigationState =
  | 'pending'
  | 'waiting_for_user'
  | 'scheduled'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'expired';

/**
 * Mitigation State Transitions
 */
export type MitigationStateTransition =
  | 'mitigation_created'
  | 'user_action_required'
  | 'delay_scheduled'
  | 'immediate_completion'
  | 'user_verified'
  | 'verification_failed'
  | 'timeout'
  | 'delay_expired'
  | 'action_executed'
  | 'execution_error';

/**
 * Mitigation State Machine Configuration
 */
export interface MitigationStateMachineConfig {
  mitigationId: string;
  mitigationType: 'delay' | '2fa' | 'gps_check' | 'extra_logging' | 'document_recheck' | 'manual_review' | 'amount_limit';
  currentState: MitigationState;
  previousState?: MitigationState;
  lastTransition?: MitigationStateTransition;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  expiresAt?: Date;
  executeAt?: Date;
}

/**
 * Mitigation State Transition Result
 */
export interface MitigationStateTransitionResult {
  previousState: MitigationState;
  newState: MitigationState;
  transition: MitigationStateTransition;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// SUPPORT TICKET STATE MACHINE
// High-Risk Cases Lifecycle
// ============================================

/**
 * Support Ticket State Machine States
 * 
 * @see Mermaid Diagram:
 * stateDiagram-v2
 *   [*] --> open : high_risk_detected
 *   open --> investigating : support_opens_ticket
 *   investigating --> waiting_for_user : request_verification
 *   investigating --> escalated : escalate_to_compliance
 *   investigating --> resolved : approve_and_override
 *   investigating --> blocked : block_user
 *   waiting_for_user --> investigating : user_submitted_documents
 *   waiting_for_user --> expired : no_response
 *   escalated --> resolved : compliance_approved
 *   escalated --> blocked : compliance_blocked
 *   resolved --> closed : notify_user
 *   blocked --> closed : notify_user
 *   expired --> closed
 *   closed --> [*]
 */
export type SupportTicketState =
  | 'open'
  | 'investigating'
  | 'waiting_for_user'
  | 'escalated'
  | 'resolved'
  | 'blocked'
  | 'expired'
  | 'closed';

/**
 * Support Ticket State Transitions
 */
export type SupportTicketStateTransition =
  | 'high_risk_detected'
  | 'support_opens_ticket'
  | 'request_verification'
  | 'escalate_to_compliance'
  | 'approve_and_override'
  | 'block_user'
  | 'user_submitted_documents'
  | 'no_response'
  | 'compliance_approved'
  | 'compliance_blocked'
  | 'notify_user';

/**
 * Support Ticket State Machine Configuration
 */
export interface SupportTicketStateMachineConfig {
  ticketId: string;
  currentState: SupportTicketState;
  previousState?: SupportTicketState;
  lastTransition?: SupportTicketStateTransition;
  userId: string;
  riskScore: number;
  riskLevel: RiskState;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
}

/**
 * Support Ticket State Transition Result
 */
export interface SupportTicketStateTransitionResult {
  previousState: SupportTicketState;
  newState: SupportTicketState;
  transition: SupportTicketStateTransition;
  timestamp: Date;
  actorId?: string;
  notes?: string;
}

// ============================================
// STATE MACHINE VALIDATORS
// ============================================

/**
 * Valid Risk State Transitions
 */
export const VALID_RISK_TRANSITIONS: Record<RiskState, RiskStateTransition[]> = {
  green: ['low_risk_event', 'medium_risk_event', 'high_risk_event', 'manual_override'],
  yellow: ['repeated_medium_events', 'high_risk_event', 'risk_decay', 'manual_override'],
  red: ['repeated_high_risk_events', 'manual_override'],
};

/**
 * Valid Mitigation State Transitions by Type
 */
export const VALID_MITIGATION_TRANSITIONS: Record<string, Record<MitigationState, MitigationStateTransition[]>> = {
  '2fa': {
    pending: ['user_action_required'],
    waiting_for_user: ['user_verified', 'verification_failed', 'timeout'],
    completed: [],
    failed: [],
    expired: [],
    scheduled: [],
    executing: [],
  },
  gps_check: {
    pending: ['user_action_required'],
    waiting_for_user: ['user_verified', 'verification_failed', 'timeout'],
    completed: [],
    failed: [],
    expired: [],
    scheduled: [],
    executing: [],
  },
  delay: {
    pending: ['delay_scheduled'],
    scheduled: ['delay_expired'],
    executing: ['action_executed', 'execution_error'],
    completed: [],
    failed: [],
    expired: [],
    waiting_for_user: [],
  },
  extra_logging: {
    pending: ['immediate_completion'],
    completed: [],
    failed: [],
    expired: [],
    scheduled: [],
    executing: [],
    waiting_for_user: [],
  },
  document_recheck: {
    pending: ['user_action_required'],
    waiting_for_user: ['user_verified', 'verification_failed', 'timeout'],
    completed: [],
    failed: [],
    expired: [],
    scheduled: [],
    executing: [],
  },
  manual_review: {
    pending: ['user_action_required'],
    waiting_for_user: ['user_verified', 'verification_failed', 'timeout'],
    completed: [],
    failed: [],
    expired: [],
    scheduled: [],
    executing: [],
  },
  amount_limit: {
    pending: ['immediate_completion'],
    completed: [],
    failed: [],
    expired: [],
    scheduled: [],
    executing: [],
    waiting_for_user: [],
  },
};

/**
 * Valid Support Ticket State Transitions
 */
export const VALID_TICKET_TRANSITIONS: Record<SupportTicketState, SupportTicketStateTransition[]> = {
  open: ['support_opens_ticket'],
  investigating: ['request_verification', 'escalate_to_compliance', 'approve_and_override', 'block_user'],
  waiting_for_user: ['user_submitted_documents', 'no_response'],
  escalated: ['compliance_approved', 'compliance_blocked'],
  resolved: ['notify_user'],
  blocked: ['notify_user'],
  expired: [],
  closed: [],
};

// ============================================
// STATE MACHINE RESULT TYPES
// ============================================

/**
 * Risk State Transition Mapping
 */
export const RISK_STATE_MAPPING: Record<RiskStateTransition, { from: RiskState[]; to: RiskState }> = {
  initial_score: { from: [], to: 'green' }, // From initial state
  low_risk_event: { from: ['green'], to: 'green' },
  medium_risk_event: { from: ['green'], to: 'yellow' },
  high_risk_event: { from: ['green', 'yellow'], to: 'red' },
  repeated_medium_events: { from: ['yellow'], to: 'yellow' },
  repeated_high_risk_events: { from: ['red'], to: 'red' },
  risk_decay: { from: ['yellow'], to: 'green' },
  manual_override: { from: ['green', 'yellow', 'red'], to: 'green' }, // Can go to any state
};

/**
 * Mitigation State Transition Mapping
 */
export const MITIGATION_STATE_MAPPING: Record<MitigationStateTransition, { from: MitigationState[]; to: MitigationState }> = {
  mitigation_created: { from: [], to: 'pending' },
  user_action_required: { from: ['pending'], to: 'waiting_for_user' },
  delay_scheduled: { from: ['pending'], to: 'scheduled' },
  immediate_completion: { from: ['pending'], to: 'completed' },
  user_verified: { from: ['waiting_for_user'], to: 'completed' },
  verification_failed: { from: ['waiting_for_user'], to: 'failed' },
  timeout: { from: ['waiting_for_user'], to: 'expired' },
  delay_expired: { from: ['scheduled'], to: 'executing' },
  action_executed: { from: ['executing'], to: 'completed' },
  execution_error: { from: ['executing'], to: 'failed' },
};

/**
 * Support Ticket State Transition Mapping
 */
export const TICKET_STATE_MAPPING: Record<SupportTicketStateTransition, { from: SupportTicketState[]; to: SupportTicketState }> = {
  high_risk_detected: { from: [], to: 'open' },
  support_opens_ticket: { from: ['open'], to: 'investigating' },
  request_verification: { from: ['investigating'], to: 'waiting_for_user' },
  escalate_to_compliance: { from: ['investigating'], to: 'escalated' },
  approve_and_override: { from: ['investigating'], to: 'resolved' },
  block_user: { from: ['investigating'], to: 'blocked' },
  user_submitted_documents: { from: ['waiting_for_user'], to: 'investigating' },
  no_response: { from: ['waiting_for_user'], to: 'expired' },
  compliance_approved: { from: ['escalated'], to: 'resolved' },
  compliance_blocked: { from: ['escalated'], to: 'blocked' },
  notify_user: { from: ['resolved', 'blocked'], to: 'closed' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a risk state transition is valid
 */
export function isValidRiskTransition(
  currentState: RiskState,
  transition: RiskStateTransition
): boolean {
  return VALID_RISK_TRANSITIONS[currentState]?.includes(transition) ?? false;
}

/**
 * Check if a mitigation state transition is valid
 */
export function isValidMitigationTransition(
  mitigationType: string,
  currentState: MitigationState,
  transition: MitigationStateTransition
): boolean {
  const typeTransitions = VALID_MITIGATION_TRANSITIONS[mitigationType];
  if (!typeTransitions) return false;
  return typeTransitions[currentState]?.includes(transition) ?? false;
}

/**
 * Check if a support ticket state transition is valid
 */
export function isValidTicketTransition(
  currentState: SupportTicketState,
  transition: SupportTicketStateTransition
): boolean {
  return VALID_TICKET_TRANSITIONS[currentState]?.includes(transition) ?? false;
}

/**
 * Get the next state for a risk transition
 */
export function getNextRiskState(
  currentState: RiskState,
  transition: RiskStateTransition,
  newLevel?: RiskState
): RiskState {
  if (transition === 'manual_override' && newLevel) {
    return newLevel;
  }
  const mapping = RISK_STATE_MAPPING[transition];
  if (mapping && mapping.from.includes(currentState)) {
    return mapping.to;
  }
  return currentState;
}

/**
 * Get the next state for a mitigation transition
 */
export function getNextMitigationState(
  currentState: MitigationState,
  transition: MitigationStateTransition
): MitigationState {
  const mapping = MITIGATION_STATE_MAPPING[transition];
  if (mapping && mapping.from.includes(currentState)) {
    return mapping.to;
  }
  return currentState;
}

/**
 * Get the next state for a support ticket transition
 */
export function getNextTicketState(
  currentState: SupportTicketState,
  transition: SupportTicketStateTransition
): SupportTicketState {
  const mapping = TICKET_STATE_MAPPING[transition];
  if (mapping && mapping.from.includes(currentState)) {
    return mapping.to;
  }
  return currentState;
}
