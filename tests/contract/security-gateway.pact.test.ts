// ============================================
// CARGOBIT SECURITY GATEWAY - CONTRACT TESTS
// Version: 2.0 - Pact Consumer-Driven Contracts
// ============================================

import { Verifier } from '@pact-foundation/pact';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

const { eachLike, like, term, timestamp, boolean, integer, string } = MatchersV3;

// ============================================
// PACT CONFIGURATION
// ============================================

const providerName = 'SecurityGatewayProvider';
const consumerName = 'CargoBitDomainService';

const pact = new PactV3({
  consumer: consumerName,
  provider: providerName,
  dir: './pacts',
  logLevel: 'info',
});

// ============================================
// TEST DATA
// ============================================

const TEST_USERS = {
  green: { id: 'u_1001', role: 'SHIPPER_COMPANY', companyId: 'c_2001' },
  yellow: { id: 'u_1002', role: 'SHIPPER_COMPANY', companyId: 'c_2002' },
  red: { id: 'u_1003', role: 'SHIPPER_COMPANY', companyId: 'c_2003' },
  admin: { id: 'admin-001', role: 'ADMIN' },
  support: { id: 'support-001', role: 'SUPPORT' },
};

const TEST_ENTITIES = {
  transaction: {
    type: 'transaction',
    id: 'tx_3001',
    context: { amount: 1200, international: false },
  },
};

// ============================================
// CONTRACT: SECURITY CHECK ENDPOINT
// ============================================

describe('Security Gateway - Security Check Contract', () => {
  describe('POST /api/security/check - Green Case', () => {
    it('should return allowed decision for green risk user', async () => {
      await pact
        .addInteraction({
          states: [{ description: 'user u_1001 has green risk level' }],
          uponReceiving: 'a security check request for green user',
          withRequest: {
            method: 'POST',
            path: '/api/security/check',
            headers: {
              'Content-Type': 'application/json',
              Authorization: like('Bearer test-api-key'),
            },
            body: {
              requestId: like('req-abc123'),
              user: like(TEST_USERS.green),
              action: 'ACCEPT_OFFER',
              entity: like(TEST_ENTITIES.transaction),
            },
          },
          willRespondWith: {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              correlationId: like('corr-xyz789'),
              decision: 'allowed',
              riskLevel: 'green',
              riskScore: integer(14),
              processingTimeMs: integer(45),
              auditId: like('audit-123'),
            },
          },
        })
        .executeTest(async (mockServer) => {
          // Simulate consumer calling the provider
          const response = await fetch(`${mockServer.url}/api/security/check`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer test-api-key',
            },
            body: JSON.stringify({
              requestId: 'req-test-001',
              user: TEST_USERS.green,
              action: 'ACCEPT_OFFER',
              entity: TEST_ENTITIES.transaction,
            }),
          });

          const body = await response.json();
          expect(response.status).toBe(200);
          expect(body.decision).toBe('allowed');
          expect(body.riskLevel).toBe('green');
        });
    });
  });

  describe('POST /api/security/check - Yellow Case', () => {
    it('should return allowed_with_mitigation decision for yellow risk user', async () => {
      await pact
        .addInteraction({
          states: [{ description: 'user u_1002 has yellow risk level' }],
          uponReceiving: 'a security check request for yellow user',
          withRequest: {
            method: 'POST',
            path: '/api/security/check',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              requestId: like('req-abc123'),
              user: like(TEST_USERS.yellow),
              action: 'INITIATE_PAYOUT',
              entity: {
                type: 'transaction',
                id: 'tx_3002',
                context: like({ amount: 18000, iban_age_hours: 12 }),
              },
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              correlationId: like('corr-xyz789'),
              decision: 'allowed_with_mitigation',
              riskLevel: 'yellow',
              riskScore: integer(52),
              processingTimeMs: integer(65),
              auditId: like('audit-456'),
              mitigations: eachLike({
                type: 'delay',
                id: like('m_7001'),
                status: 'pending',
                params: {
                  delayMinutes: integer(1440),
                },
              }),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/security/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId: 'req-test-002',
              user: TEST_USERS.yellow,
              action: 'INITIATE_PAYOUT',
              entity: { type: 'transaction', id: 'tx_3002', context: { amount: 18000 } },
            }),
          });

          const body = await response.json();
          expect(response.status).toBe(200);
          expect(body.decision).toBe('allowed_with_mitigation');
          expect(body.mitigations).toBeDefined();
          expect(body.mitigations.length).toBeGreaterThan(0);
        });
    });
  });

  describe('POST /api/security/check - Red Case', () => {
    it('should return blocked decision for red risk user', async () => {
      await pact
        .addInteraction({
          states: [{ description: 'user u_1003 has red risk level' }],
          uponReceiving: 'a security check request for red user',
          withRequest: {
            method: 'POST',
            path: '/api/security/check',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              requestId: like('req-abc123'),
              user: like(TEST_USERS.red),
              action: 'INITIATE_PAYOUT',
              entity: {
                type: 'transaction',
                id: 'tx_3003',
                context: like({ amount: 52000, international: true }),
              },
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              correlationId: like('corr-xyz789'),
              decision: 'blocked',
              riskLevel: 'red',
              riskScore: integer(81),
              processingTimeMs: integer(85),
              auditId: like('audit-789'),
              blockReason: like('High risk score: 81'),
              supportTicketId: like('st_9001'),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/security/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId: 'req-test-003',
              user: TEST_USERS.red,
              action: 'INITIATE_PAYOUT',
              entity: { type: 'transaction', id: 'tx_3003', context: { amount: 52000 } },
            }),
          });

          const body = await response.json();
          expect(response.status).toBe(200);
          expect(body.decision).toBe('blocked');
          expect(body.blockReason).toBeDefined();
        });
    });
  });

  describe('POST /api/security/check - Permission Denied', () => {
    it('should return permission_denied for unauthorized action', async () => {
      await pact
        .addInteraction({
          states: [{ description: 'user driver-001 has role DRIVER_SELF_EMPLOYED' }],
          uponReceiving: 'a payout request from driver (unauthorized)',
          withRequest: {
            method: 'POST',
            path: '/api/security/check',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              requestId: like('req-abc123'),
              user: { id: 'driver-001', role: 'DRIVER_SELF_EMPLOYED' },
              action: 'INITIATE_PAYOUT',
              entity: like(TEST_ENTITIES.transaction),
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              correlationId: like('corr-xyz789'),
              decision: 'permission_denied',
              processingTimeMs: integer(15),
              auditId: like('audit-999'),
              deniedReason: 'DRIVER_SELF_EMPLOYED cannot perform INITIATE_PAYOUT',
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/security/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId: 'req-test-004',
              user: { id: 'driver-001', role: 'DRIVER_SELF_EMPLOYED' },
              action: 'INITIATE_PAYOUT',
              entity: TEST_ENTITIES.transaction,
            }),
          });

          const body = await response.json();
          expect(response.status).toBe(200);
          expect(body.decision).toBe('permission_denied');
        });
    });
  });
});

// ============================================
// CONTRACT: RISK OVERRIDE ENDPOINT
// ============================================

describe('Security Gateway - Risk Override Contract', () => {
  describe('POST /api/security/risk/override', () => {
    it('should allow admin to override risk level', async () => {
      await pact
        .addInteraction({
          states: [
            { description: 'user u_1003 has red risk level' },
            { description: 'actor admin-001 has ADMIN role' },
          ],
          uponReceiving: 'a risk override request from admin',
          withRequest: {
            method: 'POST',
            path: '/api/security/risk/override',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              entityType: 'user',
              entityId: 'u_1003',
              newLevel: 'green',
              newScore: integer(15),
              reason: like('Manual override after KYC verification'),
              actorId: 'admin-001',
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              success: boolean(true),
              previousLevel: 'red',
              newLevel: 'green',
              previousScore: integer(81),
              newScore: integer(15),
              overriddenAt: timestamp('YYYY-MM-DDTHH:mm:ss.SSSZ'),
              auditId: like('audit-override-001'),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/security/risk/override`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: 'user',
              entityId: 'u_1003',
              newLevel: 'green',
              newScore: 15,
              reason: 'Manual override after KYC verification',
              actorId: 'admin-001',
            }),
          });

          const body = await response.json();
          expect(response.status).toBe(200);
          expect(body.success).toBe(true);
          expect(body.newLevel).toBe('green');
        });
    });
  });
});

// ============================================
// CONTRACT: MITIGATION APPLY ENDPOINT
// ============================================

describe('Security Gateway - Mitigation Apply Contract', () => {
  describe('POST /api/security/mitigation/apply', () => {
    it('should apply delay mitigation successfully', async () => {
      await pact
        .addInteraction({
          states: [{ description: 'transaction tx_3002 exists and is yellow' }],
          uponReceiving: 'a mitigation apply request for delay',
          withRequest: {
            method: 'POST',
            path: '/api/security/mitigation/apply',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              entityType: 'transaction',
              entityId: 'tx_3002',
              action: 'INITIATE_PAYOUT',
              mitigationType: 'delay',
              context: {
                delayMinutes: integer(1440),
                userId: 'u_1002',
              },
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              success: boolean(true),
              mitigation: {
                id: like('m_7001'),
                type: 'delay',
                status: 'pending',
                entityType: 'transaction',
                entityId: 'tx_3002',
                createdAt: timestamp('YYYY-MM-DDTHH:mm:ss.SSSZ'),
                scheduledAt: timestamp('YYYY-MM-DDTHH:mm:ss.SSSZ'),
                params: {
                  delayMinutes: integer(1440),
                },
              },
              auditId: like('audit-mitigation-001'),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/security/mitigation/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: 'transaction',
              entityId: 'tx_3002',
              action: 'INITIATE_PAYOUT',
              mitigationType: 'delay',
              context: { delayMinutes: 1440, userId: 'u_1002' },
            }),
          });

          const body = await response.json();
          expect(response.status).toBe(200);
          expect(body.success).toBe(true);
          expect(body.mitigation.type).toBe('delay');
          expect(body.mitigation.status).toBe('pending');
        });
    });
  });
});

// ============================================
// CONTRACT: GET RISK STATUS ENDPOINT
// ============================================

describe('Security Gateway - Get Risk Status Contract', () => {
  describe('GET /api/security/risk/{entityType}/{entityId}', () => {
    it('should return risk status for user', async () => {
      await pact
        .addInteraction({
          states: [{ description: 'user u_1001 has green risk level' }],
          uponReceiving: 'a risk status query for user',
          withRequest: {
            method: 'GET',
            path: '/api/security/risk/user/u_1001',
            headers: {
              Accept: 'application/json',
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              entityType: 'user',
              entityId: 'u_1001',
              level: 'green',
              score: integer(14),
              lastEvaluatedAt: timestamp('YYYY-MM-DDTHH:mm:ss.SSSZ'),
              factors: eachLike({
                factor: like('iban_age_hours'),
                impact: integer(-5),
                description: like('IBAN registered for 240 hours'),
              }),
              history: eachLike({
                level: 'green',
                score: integer(12),
                evaluatedAt: timestamp('YYYY-MM-DDTHH:mm:ss.SSSZ'),
              }),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/security/risk/user/u_1001`, {
            headers: { Accept: 'application/json' },
          });

          const body = await response.json();
          expect(response.status).toBe(200);
          expect(body.level).toBe('green');
          expect(body.score).toBeLessThan(30);
        });
    });
  });
});

// ============================================
// PROVIDER VERIFICATION (for CI/CD)
// ============================================

describe('Pact Provider Verification', () => {
  it('should verify provider against published contracts', async () => {
    const opts = {
      providerBaseUrl: process.env.PROVIDER_BASE_URL || 'http://localhost:3004',
      pactUrls: ['./pacts/'],
      providerVersion: process.env.GIT_COMMIT || '1.0.0',
      providerVersionTags: [process.env.CI_COMMIT_REF_NAME || 'main'],
      publishVerificationResult: process.env.CI === 'true',
      stateHandlers: {
        'user u_1001 has green risk level': () => {
          // Setup state in provider
          return Promise.resolve();
        },
        'user u_1002 has yellow risk level': () => {
          return Promise.resolve();
        },
        'user u_1003 has red risk level': () => {
          return Promise.resolve();
        },
        'user driver-001 has role DRIVER_SELF_EMPLOYED': () => {
          return Promise.resolve();
        },
        'actor admin-001 has ADMIN role': () => {
          return Promise.resolve();
        },
        'transaction tx_3002 exists and is yellow': () => {
          return Promise.resolve();
        },
      },
    };

    // Only run verification in CI with running provider
    if (process.env.RUN_PROVIDER_VERIFICATION === 'true') {
      await new Verifier(opts).verifyProvider();
    }
  });
});
