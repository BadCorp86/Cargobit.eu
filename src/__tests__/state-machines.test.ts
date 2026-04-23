// ============================================
// CARGOBIT STATE MACHINES - UNIT TESTS
// Version: 1.0
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RiskState,
  RiskStateTransition,
  MitigationState,
  MitigationStateTransition,
  SupportTicketState,
  SupportTicketStateTransition,
  isValidRiskTransition,
  isValidMitigationTransition,
  isValidTicketTransition,
  getNextRiskState,
  getNextMitigationState,
  getNextTicketState,
  VALID_RISK_TRANSITIONS,
  VALID_MITIGATION_TRANSITIONS,
  VALID_TICKET_TRANSITIONS,
  RISK_STATE_MAPPING,
  MITIGATION_STATE_MAPPING,
  TICKET_STATE_MAPPING,
} from '@/types/state-machines';

// ============================================
// RISK STATE MACHINE TESTS
// ============================================

describe('Risk State Machine', () => {
  describe('Valid Transitions', () => {
    it('should allow low_risk_event from green', () => {
      expect(isValidRiskTransition('green', 'low_risk_event')).toBe(true);
    });

    it('should allow medium_risk_event from green', () => {
      expect(isValidRiskTransition('green', 'medium_risk_event')).toBe(true);
    });

    it('should allow high_risk_event from green', () => {
      expect(isValidRiskTransition('green', 'high_risk_event')).toBe(true);
    });

    it('should allow manual_override from any state', () => {
      expect(isValidRiskTransition('green', 'manual_override')).toBe(true);
      expect(isValidRiskTransition('yellow', 'manual_override')).toBe(true);
      expect(isValidRiskTransition('red', 'manual_override')).toBe(true);
    });

    it('should allow risk_decay from yellow', () => {
      expect(isValidRiskTransition('yellow', 'risk_decay')).toBe(true);
    });

    it('should NOT allow low_risk_event from red', () => {
      expect(isValidRiskTransition('red', 'low_risk_event')).toBe(false);
    });

    it('should NOT allow risk_decay from green', () => {
      expect(isValidRiskTransition('green', 'risk_decay')).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should transition green -> yellow on medium_risk_event', () => {
      const newState = getNextRiskState('green', 'medium_risk_event');
      expect(newState).toBe('yellow');
    });

    it('should transition green -> red on high_risk_event', () => {
      const newState = getNextRiskState('green', 'high_risk_event');
      expect(newState).toBe('red');
    });

    it('should transition yellow -> green on risk_decay', () => {
      const newState = getNextRiskState('yellow', 'risk_decay');
      expect(newState).toBe('green');
    });

    it('should transition red -> green on manual_override with newLevel', () => {
      const newState = getNextRiskState('red', 'manual_override', 'green');
      expect(newState).toBe('green');
    });

    it('should transition red -> yellow on manual_override with newLevel', () => {
      const newState = getNextRiskState('red', 'manual_override', 'yellow');
      expect(newState).toBe('yellow');
    });

    it('should stay green on low_risk_event', () => {
      const newState = getNextRiskState('green', 'low_risk_event');
      expect(newState).toBe('green');
    });

    it('should stay yellow on repeated_medium_events', () => {
      const newState = getNextRiskState('yellow', 'repeated_medium_events');
      expect(newState).toBe('yellow');
    });
  });

  describe('Transition Mapping', () => {
    it('should have correct mapping for medium_risk_event', () => {
      const mapping = RISK_STATE_MAPPING['medium_risk_event'];
      expect(mapping.from).toContain('green');
      expect(mapping.to).toBe('yellow');
    });

    it('should have correct mapping for high_risk_event', () => {
      const mapping = RISK_STATE_MAPPING['high_risk_event'];
      expect(mapping.from).toContain('green');
      expect(mapping.from).toContain('yellow');
      expect(mapping.to).toBe('red');
    });

    it('should have correct mapping for manual_override', () => {
      const mapping = RISK_STATE_MAPPING['manual_override'];
      expect(mapping.from).toContain('green');
      expect(mapping.from).toContain('yellow');
      expect(mapping.from).toContain('red');
    });
  });

  describe('Complete State Machine Flow', () => {
    it('should follow GREEN flow: initial -> green -> allowed', () => {
      // Initial state is green
      let state: RiskState = 'green';

      // Low risk event - stay green
      expect(isValidRiskTransition(state, 'low_risk_event')).toBe(true);
      state = getNextRiskState(state, 'low_risk_event');
      expect(state).toBe('green');

      // Decision: allowed
      expect(state).toBe('green');
    });

    it('should follow YELLOW flow: green -> yellow -> mitigation', () => {
      let state: RiskState = 'green';

      // Medium risk event - transition to yellow
      expect(isValidRiskTransition(state, 'medium_risk_event')).toBe(true);
      state = getNextRiskState(state, 'medium_risk_event');
      expect(state).toBe('yellow');

      // Repeated medium events - stay yellow
      expect(isValidRiskTransition(state, 'repeated_medium_events')).toBe(true);
      state = getNextRiskState(state, 'repeated_medium_events');
      expect(state).toBe('yellow');

      // Risk decay - back to green
      expect(isValidRiskTransition(state, 'risk_decay')).toBe(true);
      state = getNextRiskState(state, 'risk_decay');
      expect(state).toBe('green');
    });

    it('should follow RED flow: green -> red -> blocked', () => {
      let state: RiskState = 'green';

      // High risk event - transition to red
      expect(isValidRiskTransition(state, 'high_risk_event')).toBe(true);
      state = getNextRiskState(state, 'high_risk_event');
      expect(state).toBe('red');

      // Decision: blocked
      expect(state).toBe('red');
    });

    it('should follow SUPPORT OVERRIDE flow: red -> green', () => {
      let state: RiskState = 'red';

      // Manual override by support/admin
      expect(isValidRiskTransition(state, 'manual_override')).toBe(true);
      state = getNextRiskState(state, 'manual_override', 'green');
      expect(state).toBe('green');
    });
  });
});

// ============================================
// MITIGATION STATE MACHINE TESTS
// ============================================

describe('Mitigation State Machine', () => {
  describe('2FA Mitigation', () => {
    it('should allow user_action_required from pending', () => {
      expect(isValidMitigationTransition('2fa', 'pending', 'user_action_required')).toBe(true);
    });

    it('should allow user_verified from waiting_for_user', () => {
      expect(isValidMitigationTransition('2fa', 'waiting_for_user', 'user_verified')).toBe(true);
    });

    it('should allow verification_failed from waiting_for_user', () => {
      expect(isValidMitigationTransition('2fa', 'waiting_for_user', 'verification_failed')).toBe(true);
    });

    it('should allow timeout from waiting_for_user', () => {
      expect(isValidMitigationTransition('2fa', 'waiting_for_user', 'timeout')).toBe(true);
    });

    it('should NOT allow delay_scheduled for 2fa', () => {
      expect(isValidMitigationTransition('2fa', 'pending', 'delay_scheduled')).toBe(false);
    });

    it('should transition pending -> waiting_for_user -> completed', () => {
      let state: MitigationState = 'pending';
      state = getNextMitigationState(state, 'user_action_required');
      expect(state).toBe('waiting_for_user');

      state = getNextMitigationState(state, 'user_verified');
      expect(state).toBe('completed');
    });
  });

  describe('Delay Mitigation', () => {
    it('should allow delay_scheduled from pending', () => {
      expect(isValidMitigationTransition('delay', 'pending', 'delay_scheduled')).toBe(true);
    });

    it('should allow delay_expired from scheduled', () => {
      expect(isValidMitigationTransition('delay', 'scheduled', 'delay_expired')).toBe(true);
    });

    it('should allow action_executed from executing', () => {
      expect(isValidMitigationTransition('delay', 'executing', 'action_executed')).toBe(true);
    });

    it('should allow execution_error from executing', () => {
      expect(isValidMitigationTransition('delay', 'executing', 'execution_error')).toBe(true);
    });

    it('should transition pending -> scheduled -> executing -> completed', () => {
      let state: MitigationState = 'pending';
      state = getNextMitigationState(state, 'delay_scheduled');
      expect(state).toBe('scheduled');

      state = getNextMitigationState(state, 'delay_expired');
      expect(state).toBe('executing');

      state = getNextMitigationState(state, 'action_executed');
      expect(state).toBe('completed');
    });
  });

  describe('Extra Logging Mitigation', () => {
    it('should allow immediate_completion from pending', () => {
      expect(isValidMitigationTransition('extra_logging', 'pending', 'immediate_completion')).toBe(true);
    });

    it('should transition pending -> completed immediately', () => {
      const state = getNextMitigationState('pending', 'immediate_completion');
      expect(state).toBe('completed');
    });
  });

  describe('GPS Check Mitigation', () => {
    it('should follow same flow as 2FA', () => {
      let state: MitigationState = 'pending';
      expect(isValidMitigationTransition('gps_check', state, 'user_action_required')).toBe(true);

      state = getNextMitigationState(state, 'user_action_required');
      expect(state).toBe('waiting_for_user');
      expect(isValidMitigationTransition('gps_check', state, 'user_verified')).toBe(true);

      state = getNextMitigationState(state, 'user_verified');
      expect(state).toBe('completed');
    });
  });

  describe('Amount Limit Mitigation', () => {
    it('should complete immediately like extra_logging', () => {
      expect(isValidMitigationTransition('amount_limit', 'pending', 'immediate_completion')).toBe(true);

      const state = getNextMitigationState('pending', 'immediate_completion');
      expect(state).toBe('completed');
    });
  });

  describe('Transition Mapping', () => {
    it('should have correct mapping for user_verified', () => {
      const mapping = MITIGATION_STATE_MAPPING['user_verified'];
      expect(mapping.from).toContain('waiting_for_user');
      expect(mapping.to).toBe('completed');
    });

    it('should have correct mapping for timeout', () => {
      const mapping = MITIGATION_STATE_MAPPING['timeout'];
      expect(mapping.from).toContain('waiting_for_user');
      expect(mapping.to).toBe('expired');
    });
  });
});

// ============================================
// SUPPORT TICKET STATE MACHINE TESTS
// ============================================

describe('Support Ticket State Machine', () => {
  describe('Valid Transitions', () => {
    it('should allow support_opens_ticket from open', () => {
      expect(isValidTicketTransition('open', 'support_opens_ticket')).toBe(true);
    });

    it('should allow request_verification from investigating', () => {
      expect(isValidTicketTransition('investigating', 'request_verification')).toBe(true);
    });

    it('should allow escalate_to_compliance from investigating', () => {
      expect(isValidTicketTransition('investigating', 'escalate_to_compliance')).toBe(true);
    });

    it('should allow approve_and_override from investigating', () => {
      expect(isValidTicketTransition('investigating', 'approve_and_override')).toBe(true);
    });

    it('should allow block_user from investigating', () => {
      expect(isValidTicketTransition('investigating', 'block_user')).toBe(true);
    });

    it('should allow user_submitted_documents from waiting_for_user', () => {
      expect(isValidTicketTransition('waiting_for_user', 'user_submitted_documents')).toBe(true);
    });

    it('should allow compliance_approved from escalated', () => {
      expect(isValidTicketTransition('escalated', 'compliance_approved')).toBe(true);
    });

    it('should NOT allow transitions from closed', () => {
      expect(isValidTicketTransition('closed', 'support_opens_ticket')).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should transition open -> investigating', () => {
      const state = getNextTicketState('open', 'support_opens_ticket');
      expect(state).toBe('investigating');
    });

    it('should transition investigating -> waiting_for_user', () => {
      const state = getNextTicketState('investigating', 'request_verification');
      expect(state).toBe('waiting_for_user');
    });

    it('should transition investigating -> escalated', () => {
      const state = getNextTicketState('investigating', 'escalate_to_compliance');
      expect(state).toBe('escalated');
    });

    it('should transition investigating -> resolved', () => {
      const state = getNextTicketState('investigating', 'approve_and_override');
      expect(state).toBe('resolved');
    });

    it('should transition investigating -> blocked', () => {
      const state = getNextTicketState('investigating', 'block_user');
      expect(state).toBe('blocked');
    });

    it('should transition waiting_for_user -> investigating', () => {
      const state = getNextTicketState('waiting_for_user', 'user_submitted_documents');
      expect(state).toBe('investigating');
    });

    it('should transition escalated -> resolved', () => {
      const state = getNextTicketState('escalated', 'compliance_approved');
      expect(state).toBe('resolved');
    });

    it('should transition resolved -> closed', () => {
      const state = getNextTicketState('resolved', 'notify_user');
      expect(state).toBe('closed');
    });
  });

  describe('Complete Ticket Flows', () => {
    it('should follow APPROVE flow: open -> investigating -> resolved -> closed', () => {
      let state: SupportTicketState = 'open';

      state = getNextTicketState(state, 'support_opens_ticket');
      expect(state).toBe('investigating');

      state = getNextTicketState(state, 'approve_and_override');
      expect(state).toBe('resolved');

      state = getNextTicketState(state, 'notify_user');
      expect(state).toBe('closed');
    });

    it('should follow BLOCK flow: open -> investigating -> blocked -> closed', () => {
      let state: SupportTicketState = 'open';

      state = getNextTicketState(state, 'support_opens_ticket');
      expect(state).toBe('investigating');

      state = getNextTicketState(state, 'block_user');
      expect(state).toBe('blocked');

      state = getNextTicketState(state, 'notify_user');
      expect(state).toBe('closed');
    });

    it('should follow ESCALATE flow: open -> investigating -> escalated -> resolved', () => {
      let state: SupportTicketState = 'open';

      state = getNextTicketState(state, 'support_opens_ticket');
      expect(state).toBe('investigating');

      state = getNextTicketState(state, 'escalate_to_compliance');
      expect(state).toBe('escalated');

      state = getNextTicketState(state, 'compliance_approved');
      expect(state).toBe('resolved');
    });

    it('should follow VERIFICATION flow: open -> investigating -> waiting -> investigating', () => {
      let state: SupportTicketState = 'open';

      state = getNextTicketState(state, 'support_opens_ticket');
      expect(state).toBe('investigating');

      state = getNextTicketState(state, 'request_verification');
      expect(state).toBe('waiting_for_user');

      state = getNextTicketState(state, 'user_submitted_documents');
      expect(state).toBe('investigating');
    });

    it('should follow EXPIRED flow: waiting_for_user -> expired', () => {
      let state: SupportTicketState = 'waiting_for_user';

      state = getNextTicketState(state, 'no_response');
      expect(state).toBe('expired');
    });
  });

  describe('Transition Mapping', () => {
    it('should have correct mapping for escalate_to_compliance', () => {
      const mapping = TICKET_STATE_MAPPING['escalate_to_compliance'];
      expect(mapping.from).toContain('investigating');
      expect(mapping.to).toBe('escalated');
    });

    it('should have correct mapping for compliance_blocked', () => {
      const mapping = TICKET_STATE_MAPPING['compliance_blocked'];
      expect(mapping.from).toContain('escalated');
      expect(mapping.to).toBe('blocked');
    });

    it('should have correct mapping for notify_user', () => {
      const mapping = TICKET_STATE_MAPPING['notify_user'];
      expect(mapping.from).toContain('resolved');
      expect(mapping.from).toContain('blocked');
      expect(mapping.to).toBe('closed');
    });
  });
});

// ============================================
// INTEGRATION TESTS - STATE MACHINE SERVICE
// ============================================

describe('State Machine Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Risk State Machine Service', () => {
    // Note: These would require DB mocking - testing the pure functions instead
    it('should validate risk transitions correctly', () => {
      const transitions: Array<{ from: RiskState; transition: RiskStateTransition; expected: boolean }> = [
        { from: 'green', transition: 'low_risk_event', expected: true },
        { from: 'green', transition: 'medium_risk_event', expected: true },
        { from: 'green', transition: 'high_risk_event', expected: true },
        { from: 'yellow', transition: 'risk_decay', expected: true },
        { from: 'yellow', transition: 'high_risk_event', expected: true },
        { from: 'red', transition: 'manual_override', expected: true },
        { from: 'red', transition: 'low_risk_event', expected: false },
        { from: 'green', transition: 'risk_decay', expected: false },
      ];

      transitions.forEach(({ from, transition, expected }) => {
        expect(isValidRiskTransition(from, transition)).toBe(expected);
      });
    });
  });

  describe('Mitigation State Machine Service', () => {
    it('should validate 2FA mitigation transitions correctly', () => {
      const transitions: Array<{ state: MitigationState; transition: MitigationStateTransition; expected: boolean }> = [
        { state: 'pending', transition: 'user_action_required', expected: true },
        { state: 'waiting_for_user', transition: 'user_verified', expected: true },
        { state: 'waiting_for_user', transition: 'verification_failed', expected: true },
        { state: 'waiting_for_user', transition: 'timeout', expected: true },
        { state: 'completed', transition: 'user_verified', expected: false },
        { state: 'pending', transition: 'delay_scheduled', expected: false },
      ];

      transitions.forEach(({ state, transition, expected }) => {
        expect(isValidMitigationTransition('2fa', state, transition)).toBe(expected);
      });
    });

    it('should validate delay mitigation transitions correctly', () => {
      const transitions: Array<{ state: MitigationState; transition: MitigationStateTransition; expected: boolean }> = [
        { state: 'pending', transition: 'delay_scheduled', expected: true },
        { state: 'scheduled', transition: 'delay_expired', expected: true },
        { state: 'executing', transition: 'action_executed', expected: true },
        { state: 'executing', transition: 'execution_error', expected: true },
        { state: 'pending', transition: 'user_action_required', expected: false },
      ];

      transitions.forEach(({ state, transition, expected }) => {
        expect(isValidMitigationTransition('delay', state, transition)).toBe(expected);
      });
    });
  });

  describe('Support Ticket State Machine Service', () => {
    it('should validate ticket transitions correctly', () => {
      const transitions: Array<{ state: SupportTicketState; transition: SupportTicketStateTransition; expected: boolean }> = [
        { state: 'open', transition: 'support_opens_ticket', expected: true },
        { state: 'investigating', transition: 'request_verification', expected: true },
        { state: 'investigating', transition: 'escalate_to_compliance', expected: true },
        { state: 'investigating', transition: 'approve_and_override', expected: true },
        { state: 'investigating', transition: 'block_user', expected: true },
        { state: 'waiting_for_user', transition: 'user_submitted_documents', expected: true },
        { state: 'escalated', transition: 'compliance_approved', expected: true },
        { state: 'escalated', transition: 'compliance_blocked', expected: true },
        { state: 'resolved', transition: 'notify_user', expected: true },
        { state: 'blocked', transition: 'notify_user', expected: true },
        { state: 'closed', transition: 'support_opens_ticket', expected: false },
        { state: 'open', transition: 'block_user', expected: false },
      ];

      transitions.forEach(({ state, transition, expected }) => {
        expect(isValidTicketTransition(state, transition)).toBe(expected);
      });
    });
  });
});

// ============================================
// EDGE CASES AND ERROR HANDLING
// ============================================

describe('State Machine Edge Cases', () => {
  describe('Risk State Machine', () => {
    it('should handle unknown transition gracefully', () => {
      // Invalid transition should return false
      expect(isValidRiskTransition('green', 'unknown_transition' as any)).toBe(false);
    });

    it('should maintain state on invalid transition', () => {
      const state = getNextRiskState('green', 'unknown_transition' as any);
      // Should return current state if transition not found
      expect(state).toBe('green');
    });
  });

  describe('Mitigation State Machine', () => {
    it('should handle unknown mitigation type gracefully', () => {
      expect(isValidMitigationTransition('unknown_type', 'pending', 'user_action_required')).toBe(false);
    });

    it('should handle unknown state gracefully', () => {
      expect(isValidMitigationTransition('2fa', 'unknown_state' as any, 'user_verified')).toBe(false);
    });
  });

  describe('Support Ticket State Machine', () => {
    it('should handle unknown transition gracefully', () => {
      expect(isValidTicketTransition('open', 'unknown_transition' as any)).toBe(false);
    });

    it('should maintain state on invalid transition', () => {
      const state = getNextTicketState('open', 'unknown_transition' as any);
      expect(state).toBe('open');
    });
  });
});

// ============================================
// CONSTANTS VALIDATION
// ============================================

describe('State Machine Constants', () => {
  it('should have all valid risk states defined', () => {
    const riskStates: RiskState[] = ['green', 'yellow', 'red'];
    riskStates.forEach((state) => {
      expect(VALID_RISK_TRANSITIONS[state]).toBeDefined();
    });
  });

  it('should have all mitigation states with transitions', () => {
    const mitigationTypes = ['2fa', 'gps_check', 'delay', 'extra_logging', 'document_recheck', 'manual_review', 'amount_limit'];
    mitigationTypes.forEach((type) => {
      expect(VALID_MITIGATION_TRANSITIONS[type]).toBeDefined();
    });
  });

  it('should have all support ticket states defined', () => {
    const ticketStates: SupportTicketState[] = ['open', 'investigating', 'waiting_for_user', 'escalated', 'resolved', 'blocked', 'expired', 'closed'];
    ticketStates.forEach((state) => {
      expect(VALID_TICKET_TRANSITIONS[state]).toBeDefined();
    });
  });

  it('should have complete transition mappings for risk', () => {
    const transitions: RiskStateTransition[] = [
      'initial_score', 'low_risk_event', 'medium_risk_event', 'high_risk_event',
      'repeated_medium_events', 'repeated_high_risk_events', 'risk_decay', 'manual_override'
    ];
    transitions.forEach((t) => {
      expect(RISK_STATE_MAPPING[t]).toBeDefined();
      expect(RISK_STATE_MAPPING[t].from).toBeDefined();
      expect(RISK_STATE_MAPPING[t].to).toBeDefined();
    });
  });

  it('should have complete transition mappings for mitigation', () => {
    const transitions: MitigationStateTransition[] = [
      'mitigation_created', 'user_action_required', 'delay_scheduled', 'immediate_completion',
      'user_verified', 'verification_failed', 'timeout', 'delay_expired', 'action_executed', 'execution_error'
    ];
    transitions.forEach((t) => {
      expect(MITIGATION_STATE_MAPPING[t]).toBeDefined();
      expect(MITIGATION_STATE_MAPPING[t].from).toBeDefined();
      expect(MITIGATION_STATE_MAPPING[t].to).toBeDefined();
    });
  });

  it('should have complete transition mappings for tickets', () => {
    const transitions: SupportTicketStateTransition[] = [
      'high_risk_detected', 'support_opens_ticket', 'request_verification', 'escalate_to_compliance',
      'approve_and_override', 'block_user', 'user_submitted_documents', 'no_response',
      'compliance_approved', 'compliance_blocked', 'notify_user'
    ];
    transitions.forEach((t) => {
      expect(TICKET_STATE_MAPPING[t]).toBeDefined();
      expect(TICKET_STATE_MAPPING[t].from).toBeDefined();
      expect(TICKET_STATE_MAPPING[t].to).toBeDefined();
    });
  });
});
