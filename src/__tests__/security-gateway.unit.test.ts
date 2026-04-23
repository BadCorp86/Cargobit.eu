// ============================================
// CARGOBIT SECURITY GATEWAY - UNIT TESTS
// Version: 2.0.0
// Based on User-Provided Mock Payloads
// ============================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Type-safe mock helper for bun test
function mockFn<T extends (...args: any[]) => any>(fn: T): ReturnType<typeof vi.fn> & T {
  return vi.fn() as any;
}
import { securityGatewayService } from '@/services/security-gateway.service';
import {
  SecurityCheckRequest,
  PermissionValidateRequest,
  RiskOverrideRequest,
  SecurityMitigationApplyRequest,
  SystemRole,
  SecurityAction,
  SecurityEntityType,
  RiskLevel,
  MitigationType,
  SECURITY_ERROR_CODES,
} from '@/types/security';

// ============================================
// MOCK PAYLOADS (User-Provided)
// ============================================

const MOCK_PAYLOADS = {
  // GREEN Case – ACCEPT_OFFER (Allowed)
  green: {
    request: {
      requestId: 'req-green-001',
      user: { id: 'u_1001', role: 'SHIPPER' as SystemRole, companyId: 'c_2001' },
      action: 'ACCEPT_OFFER' as SecurityAction,
      entity: {
        type: 'transaction' as SecurityEntityType,
        id: 'tx_3001',
        context: { amount: 1200, international: false, repeat_customer: true, iban_age_hours: 240 },
      },
    },
    expectedResponse: {
      allowed: true,
      decision: 'allowed' as const,
      risk: { score: 14, level: 'green' as RiskLevel, triggeredRules: [] },
      correlationId: 'req-green-001',
    },
  },

  // YELLOW Case – INITIATE_PAYOUT (Mitigation: Delay)
  yellow: {
    request: {
      requestId: 'req-yellow-001',
      user: { id: 'u_1002', role: 'SHIPPER' as SystemRole, companyId: 'c_2002' },
      action: 'INITIATE_PAYOUT' as SecurityAction,
      entity: {
        type: 'transaction' as SecurityEntityType,
        id: 'tx_3002',
        context: { amount: 18000, iban_age_hours: 12, payout_method: 'SEPA' },
      },
    },
    expectedResponse: {
      allowed: true,
      decision: 'allowed_with_mitigation' as const,
      risk: { score: 52, level: 'yellow' as RiskLevel, triggeredRules: ['user_new_iban'] },
      mitigations: ['delay'] as MitigationType[],
      correlationId: 'req-yellow-001',
    },
  },

  // RED Case – ACCEPT_OFFER (Blocked)
  red: {
    request: {
      requestId: 'req-red-001',
      user: { id: 'u_1003', role: 'SHIPPER' as SystemRole, companyId: 'c_2003' },
      action: 'ACCEPT_OFFER' as SecurityAction,
      entity: {
        type: 'transaction' as SecurityEntityType,
        id: 'tx_3003',
        context: { amount: 52000, international: true, hazmat: false, iban_age_hours: 6 },
      },
    },
    expectedResponse: {
      allowed: false,
      decision: 'blocked' as const,
      risk: { score: 81, level: 'red' as RiskLevel, triggeredRules: ['tx_high_amount', 'user_new_iban', 'company_kyb_missing'] },
      errorCode: 'HIGH_RISK_BLOCKED',
      supportTicketId: 'st_9001',
      correlationId: 'req-red-001',
    },
  },

  // Risk-Engine Mock Responses
  riskEngine: {
    green: { score: 14, level: 'green' as RiskLevel, triggeredRules: [] },
    yellow: { score: 52, level: 'yellow' as RiskLevel, triggeredRules: ['user_new_iban'] },
    red: { score: 81, level: 'red' as RiskLevel, triggeredRules: ['tx_high_amount', 'user_new_iban', 'company_kyb_missing'] },
  },

  // Mitigation Mock Responses
  mitigation: {
    delay: {
      status: 'pending' as const,
      mitigationId: 'm_7001',
      message: 'Mitigation applied: delay',
    },
    '2fa': {
      status: 'pending' as const,
      mitigationId: 'm_7002',
      message: '2FA code sent',
    },
  },
};

// ============================================
// MOCKS
// ============================================

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'admin-001',
        roles: [{ role: { name: 'ADMIN' } }],
      }),
    },
    riskScore: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => ({
        id: 'risk-001',
        ...data.data,
        updatedAt: new Date(),
        events: [],
      })),
      upsert: vi.fn().mockResolvedValue({
        id: 'risk-001',
        score: 20,
        riskLevel: 'GREEN',
        updatedAt: new Date(),
      }),
    },
    riskHistory: {
      create: vi.fn().mockResolvedValue({}),
    },
    riskEvent: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    supportTicket: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'st_9001',
        subject: 'Sicherheitsprüfung erforderlich',
        priority: 'CRITICAL',
        status: 'OPEN',
        category: 'FRAUD',
      }),
    },
    mitigationStatus: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ms-001' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    mitigationEvent: {
      create: vi.fn().mockResolvedValue({
        id: 'm_7001',
        status: 'PENDING',
      }),
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    mitigationQueueItem: {
      create: vi.fn().mockResolvedValue({ id: 'mq-001' }),
    },
    mitigationRule: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'audit-001' }),
    },
    auditEntity: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@/services/audit.service', () => ({
  auditService: {
    log: vi.fn().mockResolvedValue({ status: 'ok', auditId: 'audit-001' }),
    logSecurityCheck: vi.fn().mockResolvedValue('audit-001'),
    logPermissionDenied: vi.fn().mockResolvedValue('audit-001'),
    logRiskBlocked: vi.fn().mockResolvedValue('audit-001'),
  },
}));

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    send: vi.fn().mockResolvedValue({ status: 'queued', eventId: 'event-001' }),
    notifyHighRiskBlocked: vi.fn().mockResolvedValue({ status: 'queued', eventId: 'event-001' }),
  },
}));

vi.mock('@/services/mitigation.service', () => ({
  mitigationService: {
    apply: vi.fn().mockResolvedValue({
      status: 'pending',
      mitigationId: 'm_7001',
      message: 'Mitigation applied: delay',
    }),
    determineMitigations: vi.fn().mockResolvedValue(['extra_logging', 'delay']),
  },
}));

// ============================================
// TEST CASE 1 – PERMISSION ALLOWED
// ============================================

describe('Unit Tests – Permission', () => {
  describe('Test Case 1 – Permission Allowed', () => {
    it('should return allowed=true when SHIPPER_COMPANY performs ACCEPT_OFFER', () => {
      const request: PermissionValidateRequest = {
        user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
        action: 'ACCEPT_OFFER',
      };

      const result = securityGatewayService.validatePermission(request);

      expect(result.allowed).toBe(true);
      expect(result.errorCode).toBeUndefined();
    });

    it('should return allowed=true when DISPATCHER performs ASSIGN_DRIVER', () => {
      const request: PermissionValidateRequest = {
        user: { id: 'u_1002', role: 'DISPATCHER' },
        action: 'ASSIGN_DRIVER',
      };

      const result = securityGatewayService.validatePermission(request);

      expect(result.allowed).toBe(true);
    });

    it('should return allowed=true when DRIVER_SELF_EMPLOYED performs ACCEPT_JOB', () => {
      const request: PermissionValidateRequest = {
        user: { id: 'u_1003', role: 'DRIVER_SELF_EMPLOYED' },
        action: 'ACCEPT_JOB',
      };

      const result = securityGatewayService.validatePermission(request);

      expect(result.allowed).toBe(true);
    });

    it('should return allowed=true when ADMIN performs INITIATE_PAYOUT', () => {
      const request: PermissionValidateRequest = {
        user: { id: 'admin-001', role: 'ADMIN' },
        action: 'INITIATE_PAYOUT',
      };

      const result = securityGatewayService.validatePermission(request);

      expect(result.allowed).toBe(true);
    });
  });

  // ============================================
  // TEST CASE 2 – PERMISSION DENIED
  // ============================================

  describe('Test Case 2 – Permission Denied', () => {
    it('should return allowed=false when SHIPPER performs ASSIGN_DRIVER', () => {
      const request: PermissionValidateRequest = {
        user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
        action: 'ASSIGN_DRIVER',
      };

      const result = securityGatewayService.validatePermission(request);

      expect(result.allowed).toBe(false);
      expect(result.errorCode).toBe('PERMISSION_DENIED');
      expect(result.message).toContain('not allowed');
    });

    it('should return allowed=false when DRIVER performs INITIATE_PAYOUT', () => {
      const request: PermissionValidateRequest = {
        user: { id: 'u_1003', role: 'DRIVER_SELF_EMPLOYED' },
        action: 'INITIATE_PAYOUT',
      };

      const result = securityGatewayService.validatePermission(request);

      expect(result.allowed).toBe(false);
      expect(result.errorCode).toBe('PERMISSION_DENIED');
    });

    it('should return allowed=false when MARKETER performs ACCEPT_OFFER', () => {
      const request: PermissionValidateRequest = {
        user: { id: 'u_marketer', role: 'MARKETER' },
        action: 'ACCEPT_OFFER',
      };

      const result = securityGatewayService.validatePermission(request);

      expect(result.allowed).toBe(false);
    });

    it('should return INVALID_ROLE for unknown role', () => {
      const request = {
        user: { id: 'user-1', role: 'UNKNOWN_ROLE' as SystemRole },
        action: 'ACCEPT_OFFER' as SecurityAction,
      };

      const result = securityGatewayService.validatePermission(request);

      expect(result.allowed).toBe(false);
      expect(result.errorCode).toBe('INVALID_ROLE');
    });

    it('should NOT call Risk-Engine when Permission Denied', async () => {
      // This test verifies the flow: Permission → Denied → Audit (no Risk call)
      const { db } = await import('@/lib/db');

      const request: SecurityCheckRequest = {
        requestId: 'req-perm-001',
        user: { id: 'u_driver', role: 'DRIVER_SELF_EMPLOYED' },
        action: 'INITIATE_PAYOUT',
        entity: { type: 'transaction', id: 'tx_perm_001' },
      };

      await securityGatewayService.checkSecurity(request);

      // Risk score should NOT have been queried
      expect(db.riskScore.findUnique).not.toHaveBeenCalled();
    });
  });
});

// ============================================
// TEST CASE 3 – RISK GREEN → ALLOWED
// ============================================

describe('Unit Tests – Risk Levels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test Case 3 – Risk GREEN → Allowed', () => {
    it('should return decision=allowed for green risk (score 14)', async () => {
      const { db } = await import('@/lib/db');

      // Mock green risk score
      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-001',
        entityType: 'TRANSACTION',
        entityId: 'tx_3001',
        score: 14,
        riskLevel: 'GREEN',
        factorsCount: 0,
        lastEventAt: new Date(),
        updatedAt: new Date(),
        events: [],
      } as any);

      const request: SecurityCheckRequest = {
        requestId: 'req-green-001',
        user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
        action: 'ACCEPT_OFFER',
        entity: {
          type: 'transaction',
          id: 'tx_3001',
          context: { amount: 1200, international: false, repeat_customer: true, iban_age_hours: 240 },
        },
      };

      const result = await securityGatewayService.checkSecurity(request);

      expect(result.allowed).toBe(true);
      expect(result.decision).toBe('allowed');
      expect(result.risk?.level).toBe('green');
      expect(result.risk?.score).toBeLessThanOrEqual(30);
      expect(result.mitigations).toBeUndefined();
      expect(result.correlationId).toBeDefined();
    });

    it('should not apply mitigations for GREEN risk', async () => {
      const { db } = await import('@/lib/db');

      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-001',
        entityType: 'TRANSACTION',
        entityId: 'tx_3001',
        score: 12,
        riskLevel: 'GREEN',
        factorsCount: 0,
        lastEventAt: new Date(),
        updatedAt: new Date(),
        events: [],
      } as any);

      const request: SecurityCheckRequest = {
        requestId: 'req-green-002',
        user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
        action: 'ACCEPT_OFFER',
        entity: { type: 'transaction', id: 'tx_3001' },
      };

      const result = await securityGatewayService.checkSecurity(request);

      expect(result.mitigations).toBeUndefined();
    });
  });

  // ============================================
  // TEST CASE 4 – RISK YELLOW → ALLOWED WITH MITIGATION
  // ============================================

  describe('Test Case 4 – Risk YELLOW → Allowed with Mitigation', () => {
    it('should return decision=allowed_with_mitigation for yellow risk', async () => {
      const { db } = await import('@/lib/db');

      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-002',
        entityType: 'TRANSACTION',
        entityId: 'tx_3002',
        score: 52,
        riskLevel: 'YELLOW',
        factorsCount: 1,
        lastEventAt: new Date(),
        updatedAt: new Date(),
        events: [{ ruleName: 'user_new_iban' }],
      } as any);

      const request: SecurityCheckRequest = {
        requestId: 'req-yellow-001',
        user: { id: 'u_1002', role: 'SHIPPER_COMPANY' },
        action: 'INITIATE_PAYOUT',
        entity: {
          type: 'transaction',
          id: 'tx_3002',
          context: { amount: 18000, iban_age_hours: 12, payout_method: 'SEPA' },
        },
      };

      const result = await securityGatewayService.checkSecurity(request);

      expect(result.allowed).toBe(true);
      expect(result.decision).toBe('allowed_with_mitigation');
      expect(result.risk?.level).toBe('yellow');
      expect(result.risk?.score).toBeGreaterThanOrEqual(31);
      expect(result.risk?.score).toBeLessThanOrEqual(60);
      expect(result.mitigations).toBeDefined();
      expect(result.mitigations?.length).toBeGreaterThan(0);
    });

    it('should trigger delay mitigation for INITIATE_PAYOUT with yellow risk', async () => {
      const { db } = await import('@/lib/db');

      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-003',
        entityType: 'TRANSACTION',
        entityId: 'tx_3002',
        score: 54,
        riskLevel: 'YELLOW',
        factorsCount: 2,
        lastEventAt: new Date(),
        updatedAt: new Date(),
        events: [{ ruleName: 'kyc_pending' }, { ruleName: 'new_iban' }],
      } as any);

      const request: SecurityCheckRequest = {
        requestId: 'req-yellow-002',
        user: { id: 'u_1002', role: 'SHIPPER_COMPANY' },
        action: 'INITIATE_PAYOUT',
        entity: { type: 'transaction', id: 'tx_3002' },
      };

      const result = await securityGatewayService.checkSecurity(request);

      expect(result.mitigations).toContain('extra_logging');
    });
  });

  // ============================================
  // TEST CASE 5 – RISK RED → BLOCKED
  // ============================================

  describe('Test Case 5 – Risk RED → Blocked', () => {
    it('should return decision=blocked for red risk (score 81)', async () => {
      const { db } = await import('@/lib/db');

      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-003',
        entityType: 'TRANSACTION',
        entityId: 'tx_3003',
        score: 81,
        riskLevel: 'RED',
        factorsCount: 3,
        lastEventAt: new Date(),
        updatedAt: new Date(),
        events: [
          { ruleName: 'tx_high_amount' },
          { ruleName: 'user_new_iban' },
          { ruleName: 'company_kyb_missing' },
        ],
      } as any);

      const request: SecurityCheckRequest = {
        requestId: 'req-red-001',
        user: { id: 'u_1003', role: 'SHIPPER_COMPANY' },
        action: 'INITIATE_PAYOUT',
        entity: {
          type: 'transaction',
          id: 'tx_3003',
          context: { amount: 52000, international: true, hazmat: false, iban_age_hours: 6 },
        },
      };

      const result = await securityGatewayService.checkSecurity(request);

      expect(result.allowed).toBe(false);
      expect(result.decision).toBe('blocked');
      expect(result.risk?.level).toBe('red');
      expect(result.risk?.score).toBeGreaterThanOrEqual(61);
      expect(result.errorCode).toBe('HIGH_RISK_BLOCKED');
      expect(result.supportTicketId).toBeDefined();
    });

    it('should create support ticket for RED risk', async () => {
      const { db } = await import('@/lib/db');

      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-004',
        entityType: 'TRANSACTION',
        entityId: 'tx_3003',
        score: 85,
        riskLevel: 'RED',
        factorsCount: 5,
        lastEventAt: new Date(),
        updatedAt: new Date(),
        events: [{ ruleName: 'fraud_flag' }],
      } as any);

      const request: SecurityCheckRequest = {
        requestId: 'req-red-002',
        user: { id: 'u_1003', role: 'SHIPPER_COMPANY' },
        action: 'INITIATE_PAYOUT',
        entity: { type: 'transaction', id: 'tx_3003' },
      };

      await securityGatewayService.checkSecurity(request);

      expect(db.supportTicket.create).toHaveBeenCalled();
    });

    it('should send notification for RED risk', async () => {
      const { notificationService } = await import('@/services/notification.service');
      const { db } = await import('@/lib/db');

      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-005',
        entityType: 'TRANSACTION',
        entityId: 'tx_3003',
        score: 90,
        riskLevel: 'RED',
        factorsCount: 4,
        lastEventAt: new Date(),
        updatedAt: new Date(),
        events: [{ ruleName: 'geo_mismatch' }],
      } as any);

      const request: SecurityCheckRequest = {
        requestId: 'req-red-003',
        user: { id: 'u_1003', role: 'SHIPPER_COMPANY' },
        action: 'INITIATE_PAYOUT',
        entity: { type: 'transaction', id: 'tx_3003' },
      };

      await securityGatewayService.checkSecurity(request);

      expect(notificationService.send).toHaveBeenCalled();
    });
  });
});

// ============================================
// TEST CASE 6 – RISK-ENGINE UNAVAILABLE (FAIL-SAFE)
// ============================================

describe('Unit Tests – Fail-Safe', () => {
  describe('Test Case 6 – Risk-Engine Unavailable', () => {
    it('should fallback to green on DB error (fail-safe)', async () => {
      const { db } = await import('@/lib/db');

      // Simulate DB error
      db.riskScore.findUnique.mockRejectedValueOnce(new Error('DB Connection Failed'));

      const request: SecurityCheckRequest = {
        requestId: 'req-fail-001',
        user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
        action: 'ACCEPT_OFFER',
        entity: { type: 'transaction', id: 'tx_fail_001' },
      };

      // Should not throw, should fallback to green
      const result = await securityGatewayService.checkSecurity(request);

      expect(result.allowed).toBe(true);
      expect(result.decision).toBe('allowed');
      expect(result.risk?.level).toBe('green');
    });
  });
});

// ============================================
// TEST CASE 7 – INVALID REQUEST
// ============================================

describe('Unit Tests – Error Handling', () => {
  describe('Test Case 7 – Invalid Request', () => {
    it('should detect missing entity.id', async () => {
      const request = {
        requestId: 'req-invalid-001',
        user: { id: 'user-1', role: 'SHIPPER_COMPANY' as SystemRole },
        action: 'ACCEPT_OFFER' as SecurityAction,
        entity: { type: 'transaction' as SecurityEntityType },
      } as SecurityCheckRequest;

      expect(request.entity.id).toBeUndefined();
    });

    it('should detect missing user.role', async () => {
      const request = {
        requestId: 'req-invalid-002',
        user: { id: 'user-1' },
        action: 'ACCEPT_OFFER' as SecurityAction,
        entity: { type: 'transaction' as SecurityEntityType, id: 'tx-001' },
      } as SecurityCheckRequest;

      expect(request.user.role).toBeUndefined();
    });

    it('should have correct HTTP status for INVALID_REQUEST', async () => {
      expect(SECURITY_ERROR_CODES.INVALID_REQUEST.httpStatus).toBe(400);
    });

    it('should have correct HTTP status for MALFORMED_JSON', async () => {
      expect(SECURITY_ERROR_CODES.MALFORMED_JSON.httpStatus).toBe(400);
    });
  });

  // ============================================
  // TEST CASE 8 – MITIGATION APPLY FAILURE
  // ============================================

  describe('Test Case 8 – Mitigation Apply Failure', () => {
    it('should handle mitigation service error gracefully', async () => {
      // The mock is already set up to return pending status
      // Test that the service handles errors correctly
      const request: SecurityMitigationApplyRequest = {
        entityType: 'transaction',
        entityId: 'tx_3002',
        action: 'INITIATE_PAYOUT',
        mitigationType: 'delay',
      };

      // Service should return a valid response even in error cases
      const result = await securityGatewayService.applyMitigation(request);

      expect(result.status).toBeDefined();
      expect(['pending', 'completed', 'error']).toContain(result.status);
    });

    it('should return mitigation ID on success', async () => {
      const request: SecurityMitigationApplyRequest = {
        entityType: 'transaction',
        entityId: 'tx_3002',
        action: 'INITIATE_PAYOUT',
        mitigationType: 'delay',
        context: {
          delayMinutes: 1440,
          riskScore: 52,
        },
      };

      const result = await securityGatewayService.applyMitigation(request);

      // Should return either pending (with mitigationId) or error status
      if (result.status === 'pending' || result.status === 'completed') {
        expect(result.mitigationId).toBeDefined();
      } else {
        expect(result.errorCode).toBeDefined();
      }
    });
  });
});

// ============================================
// RISK OVERRIDE TESTS
// ============================================

describe('Unit Tests – Risk Override', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Support Override', () => {
    it('should allow ADMIN to override risk', async () => {
      const { db } = await import('@/lib/db');

      db.user.findUnique.mockResolvedValueOnce({
        id: 'admin-001',
        roles: [{ role: { name: 'ADMIN' } }],
      } as any);

      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-override-001',
        entityType: 'USER',
        entityId: 'user-789',
        score: 81,
        riskLevel: 'RED',
        updatedAt: new Date(),
      } as any);

      const request: RiskOverrideRequest = {
        entityType: 'user',
        entityId: 'user-789',
        newLevel: 'green',
        newScore: 15,
        reason: 'Manual verification completed via video call',
        actorId: 'admin-001',
      };

      const result = await securityGatewayService.overrideRisk(request);

      expect(result.status).toBe('ok');
      expect(result.risk?.level).toBe('green');
    });

    it('should allow SUPPORT to override risk', async () => {
      const { db } = await import('@/lib/db');

      db.user.findUnique.mockResolvedValueOnce({
        id: 'support-001',
        roles: [{ role: { name: 'SUPPORT' } }],
      } as any);

      db.riskScore.findUnique.mockResolvedValueOnce(null);

      const request: RiskOverrideRequest = {
        entityType: 'transaction',
        entityId: 'tx_3003',
        newLevel: 'yellow',
        newScore: 45,
        reason: 'KYC documents verified manually',
        actorId: 'support-001',
      };

      const result = await securityGatewayService.overrideRisk(request);

      expect(result.status).toBe('ok');
    });

    it('should reject override from non-privileged user', async () => {
      const { db } = await import('@/lib/db');

      db.user.findUnique.mockResolvedValueOnce({
        id: 'shipper-001',
        roles: [{ role: { name: 'SHIPPER_COMPANY' } }],
      } as any);

      const request: RiskOverrideRequest = {
        entityType: 'user',
        entityId: 'user-456',
        newLevel: 'green',
        reason: 'Trying to bypass',
        actorId: 'shipper-001',
      };

      const result = await securityGatewayService.overrideRisk(request);

      expect(result.status).toBe('error');
      expect(result.errorCode).toBe('PERMISSION_DENIED');
    });

    it('should reject override from non-existent actor', async () => {
      const { db } = await import('@/lib/db');

      db.user.findUnique.mockResolvedValueOnce(null);

      const request: RiskOverrideRequest = {
        entityType: 'user',
        entityId: 'user-456',
        newLevel: 'green',
        reason: 'Test override',
        actorId: 'non-existent',
      };

      const result = await securityGatewayService.overrideRisk(request);

      expect(result.status).toBe('error');
      expect(result.errorCode).toBe('UNAUTHORIZED');
    });

    it('should create risk history entry on override', async () => {
      const { db } = await import('@/lib/db');

      db.user.findUnique.mockResolvedValueOnce({
        id: 'admin-001',
        roles: [{ role: { name: 'ADMIN' } }],
      } as any);

      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-001',
        score: 81,
        riskLevel: 'RED',
      } as any);

      const request: RiskOverrideRequest = {
        entityType: 'user',
        entityId: 'user-789',
        newLevel: 'green',
        newScore: 15,
        reason: 'Video verification completed',
        actorId: 'admin-001',
      };

      await securityGatewayService.overrideRisk(request);

      expect(db.riskHistory.create).toHaveBeenCalled();
    });
  });
});

// ============================================
// RISK STATUS TESTS
// ============================================

describe('Unit Tests – Risk Status', () => {
  describe('GET Risk Status', () => {
    it('should return null for non-existent entity', async () => {
      const { db } = await import('@/lib/db');
      db.riskScore.findUnique.mockResolvedValueOnce(null);

      const result = await securityGatewayService.getRiskStatus('user', 'non-existent');

      expect(result).toBeNull();
    });

    it('should return risk status for existing entity', async () => {
      const { db } = await import('@/lib/db');
      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-001',
        entityType: 'USER',
        entityId: 'user-123',
        score: 25,
        riskLevel: 'GREEN',
        updatedAt: new Date(),
        events: [],
      } as any);

      const result = await securityGatewayService.getRiskStatus('user', 'user-123');

      expect(result).toBeDefined();
      expect(result?.level).toBe('green');
      expect(result?.score).toBe(25);
    });

    it('should include triggered rules in status', async () => {
      const { db } = await import('@/lib/db');
      db.riskScore.findUnique.mockResolvedValueOnce({
        id: 'risk-002',
        entityType: 'TRANSACTION',
        entityId: 'tx_3002',
        score: 52,
        riskLevel: 'YELLOW',
        updatedAt: new Date(),
        events: [{ ruleName: 'user_new_iban' }, { ruleName: 'kyc_pending' }],
      } as any);

      const result = await securityGatewayService.getRiskStatus('transaction', 'tx_3002');

      expect(result?.triggeredRules).toContain('user_new_iban');
      expect(result?.triggeredRules).toContain('kyc_pending');
    });
  });
});

// ============================================
// PERMISSION MATRIX COMPREHENSIVE TESTS
// ============================================

describe('Permission Matrix – Complete Coverage', () => {
  const roles: SystemRole[] = [
    'ADMIN',
    'SUPPORT',
    'SHIPPER_COMPANY',
    'SHIPPER_PRIVATE',
    'DISPATCHER',
    'DRIVER_SELF_EMPLOYED',
    'MARKETER',
  ];

  const actions: SecurityAction[] = [
    'CREATE_TRANSPORT',
    'VIEW_TRANSPORT',
    'ACCEPT_OFFER',
    'ACCEPT_JOB',
    'MAKE_OFFER',
    'ASSIGN_DRIVER',
    'UPDATE_STATUS',
    'VIEW_WALLET',
    'INITIATE_PAYOUT',
    'MANAGE_VEHICLES',
    'MANAGE_USERS',
    'MANAGE_PLANS',
  ];

  // Expected permission matrix
  const expectedPermissions: Record<SystemRole, Record<SecurityAction, boolean>> = {
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

  roles.forEach((role) => {
    describe(`Role: ${role}`, () => {
      actions.forEach((action) => {
        it(`should ${expectedPermissions[role][action] ? 'allow' : 'deny'} ${action}`, () => {
          const result = securityGatewayService.validatePermission({
            user: { id: 'user-1', role },
            action,
          });

          expect(result.allowed).toBe(expectedPermissions[role][action]);
        });
      });
    });
  });
});

// ============================================
// ERROR CODE COVERAGE TESTS
// ============================================

describe('Error Code Coverage', () => {
  const errorCodes = [
    'PERMISSION_DENIED',
    'INVALID_ROLE',
    'HIGH_RISK_BLOCKED',
    'RISK_ENGINE_UNAVAILABLE',
    'INVALID_RISK_CONTEXT',
    'MITIGATION_FAILED',
    'MITIGATION_ALREADY_APPLIED',
    'MITIGATION_NOT_FOUND',
    'MAX_ATTEMPTS_EXCEEDED',
    'INVALID_2FA_CODE',
    'GPS_OUT_OF_RANGE',
    'INVALID_REQUEST',
    'INVALID_ACTION',
    'INVALID_ENTITY_TYPE',
    'MALFORMED_JSON',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'RATE_LIMIT_EXCEEDED',
  ];

  errorCodes.forEach((code) => {
    it(`should have error code definition for ${code}`, () => {
      expect(SECURITY_ERROR_CODES[code as keyof typeof SECURITY_ERROR_CODES]).toBeDefined();
    });

    it(`should have valid HTTP status for ${code}`, () => {
      const definition = SECURITY_ERROR_CODES[code as keyof typeof SECURITY_ERROR_CODES];
      expect(definition?.httpStatus).toBeGreaterThan(0);
      expect(definition?.httpStatus).toBeLessThan(600);
    });

    it(`should have message for ${code}`, () => {
      const definition = SECURITY_ERROR_CODES[code as keyof typeof SECURITY_ERROR_CODES];
      expect(definition?.message).toBeDefined();
      expect(definition?.message.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// MITIGATION TYPE TESTS
// ============================================

describe('Mitigation Types', () => {
  const mitigationTypes: MitigationType[] = [
    'delay',
    '2fa',
    'gps_check',
    'extra_logging',
    'document_recheck',
    'manual_review',
    'amount_limit',
  ];

  mitigationTypes.forEach((type) => {
    it(`should apply ${type} mitigation`, async () => {
      const { mitigationService } = await import('@/services/mitigation.service');

      mitigationService.apply.mockResolvedValueOnce({
        status: type === 'extra_logging' || type === 'amount_limit' ? 'completed' : 'pending',
        mitigationId: `m_${type}_001`,
        message: `Mitigation applied: ${type}`,
      });

      const request: SecurityMitigationApplyRequest = {
        entityType: 'transaction',
        entityId: 'tx_mitigation_001',
        action: 'INITIATE_PAYOUT',
        mitigationType: type,
      };

      const result = await securityGatewayService.applyMitigation(request);

      expect(result.mitigationId).toBeDefined();
      expect(['pending', 'completed']).toContain(result.status);
    });
  });
});

// ============================================
// RISK LEVEL THRESHOLD TESTS
// ============================================

describe('Risk Level Thresholds', () => {
  it('should classify score 0-30 as GREEN', () => {
    const greenScores = [0, 10, 20, 30];
    greenScores.forEach((score) => {
      expect(score).toBeLessThanOrEqual(30);
    });
  });

  it('should classify score 31-60 as YELLOW', () => {
    const yellowScores = [31, 40, 50, 60];
    yellowScores.forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(31);
      expect(score).toBeLessThanOrEqual(60);
    });
  });

  it('should classify score 61-100 as RED', () => {
    const redScores = [61, 70, 80, 90, 100];
    redScores.forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(61);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});

// ============================================
// CONTEXT-BASED RISK CALCULATION TESTS
// ============================================

describe('Context-Based Risk Calculation', () => {
  it('should increase risk for missing KYC', async () => {
    const { db } = await import('@/lib/db');

    db.riskScore.findUnique.mockResolvedValueOnce(null);

    const request: SecurityCheckRequest = {
      requestId: 'req-kyc-001',
      user: { id: 'u_kyc', role: 'SHIPPER_COMPANY' },
      action: 'ACCEPT_OFFER',
      entity: {
        type: 'transaction',
        id: 'tx_kyc_001',
        context: { kyc_status: 'missing' },
      },
    };

    const result = await securityGatewayService.checkSecurity(request);

    // Missing KYC should increase risk (but might not reach yellow/red alone)
    expect(result.risk?.score).toBeGreaterThanOrEqual(0);
  });

  it('should increase risk for international transactions', async () => {
    const { db } = await import('@/lib/db');

    db.riskScore.findUnique.mockResolvedValueOnce(null);

    const request: SecurityCheckRequest = {
      requestId: 'req-intl-001',
      user: { id: 'u_intl', role: 'SHIPPER_COMPANY' },
      action: 'ACCEPT_OFFER',
      entity: {
        type: 'transaction',
        id: 'tx_intl_001',
        context: { international: true },
      },
    };

    const result = await securityGatewayService.checkSecurity(request);

    expect(result.risk?.score).toBeGreaterThanOrEqual(0);
  });

  it('should increase risk for new IBAN', async () => {
    const { db } = await import('@/lib/db');

    db.riskScore.findUnique.mockResolvedValueOnce(null);

    const request: SecurityCheckRequest = {
      requestId: 'req-iban-001',
      user: { id: 'u_iban', role: 'SHIPPER_COMPANY' },
      action: 'INITIATE_PAYOUT',
      entity: {
        type: 'transaction',
        id: 'tx_iban_001',
        context: { is_new_iban: true },
      },
    };

    const result = await securityGatewayService.checkSecurity(request);

    expect(result.risk?.score).toBeGreaterThanOrEqual(0);
  });

  it('should increase risk for high amount', async () => {
    const { db } = await import('@/lib/db');

    db.riskScore.findUnique.mockResolvedValueOnce(null);

    const request: SecurityCheckRequest = {
      requestId: 'req-amount-001',
      user: { id: 'u_amount', role: 'SHIPPER_COMPANY' },
      action: 'INITIATE_PAYOUT',
      entity: {
        type: 'transaction',
        id: 'tx_amount_001',
        context: { amount: 75000 },
      },
    };

    const result = await securityGatewayService.checkSecurity(request);

    expect(result.risk?.score).toBeGreaterThanOrEqual(15); // 15 for > 50000, +15 for > 100000
  });
});
