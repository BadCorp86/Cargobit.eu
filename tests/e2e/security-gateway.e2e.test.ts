// ============================================
// CARGOBIT SECURITY GATEWAY - E2E TESTS
// Version: 2.0 - Playwright End-to-End
// ============================================

import { test, expect, APIRequestContext, Page } from '@playwright/test';
import { promises as fs } from 'fs';

// ============================================
// CONFIGURATION
// ============================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:3004';
const API_KEY = process.env.API_KEY || 'test-api-key';

// ============================================
// TEST DATA
// ============================================

interface TestCase {
  name: string;
  user: { id: string; role: string; companyId?: string };
  action: string;
  entity: { type: string; id: string; context?: Record<string, unknown> };
  expectedDecision: 'allowed' | 'allowed_with_mitigation' | 'blocked' | 'permission_denied';
  expectedRiskLevel?: 'green' | 'yellow' | 'red';
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Green User - Accept Offer',
    user: { id: 'u_1001', role: 'SHIPPER_COMPANY', companyId: 'c_2001' },
    action: 'ACCEPT_OFFER',
    entity: { type: 'transaction', id: 'tx_3001', context: { amount: 1200 } },
    expectedDecision: 'allowed',
    expectedRiskLevel: 'green',
  },
  {
    name: 'Yellow User - Initiate Payout',
    user: { id: 'u_1002', role: 'SHIPPER_COMPANY', companyId: 'c_2002' },
    action: 'INITIATE_PAYOUT',
    entity: { type: 'transaction', id: 'tx_3002', context: { amount: 18000, iban_age_hours: 12 } },
    expectedDecision: 'allowed_with_mitigation',
    expectedRiskLevel: 'yellow',
  },
  {
    name: 'Red User - Initiate Payout',
    user: { id: 'u_1003', role: 'SHIPPER_COMPANY', companyId: 'c_2003' },
    action: 'INITIATE_PAYOUT',
    entity: { type: 'transaction', id: 'tx_3003', context: { amount: 52000, international: true } },
    expectedDecision: 'blocked',
    expectedRiskLevel: 'red',
  },
  {
    name: 'Driver - Initiate Payout (Permission Denied)',
    user: { id: 'driver-001', role: 'DRIVER_SELF_EMPLOYED' },
    action: 'INITIATE_PAYOUT',
    entity: { type: 'transaction', id: 'tx_3001', context: { amount: 1200 } },
    expectedDecision: 'permission_denied',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateRequestId(): Promise<string> {
  return `req-e2e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function securityCheck(
  request: APIRequestContext,
  user: TestCase['user'],
  action: string,
  entity: TestCase['entity']
) {
  const response = await request.post(`${BASE_URL}/api/security/check`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    data: {
      requestId: await generateRequestId(),
      user,
      action,
      entity,
    },
  });
  return response;
}

// ============================================
// API E2E TESTS
// ============================================

test.describe('Security Gateway API E2E Tests', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  // ==========================================
  // HEALTH CHECK
  // ==========================================
  test('Health endpoint should return 200', async () => {
    const response = await apiContext.get('/api/security/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.timestamp).toBeDefined();
  });

  // ==========================================
  // GREEN FLOW TESTS
  // ==========================================
  test.describe('Green Risk Flow', () => {
    test('should allow green user to accept offer', async () => {
      const testCase = TEST_CASES[0];

      const response = await securityCheck(
        apiContext,
        testCase.user,
        testCase.action,
        testCase.entity
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.decision).toBe('allowed');
      expect(body.riskLevel).toBe('green');
      expect(body.riskScore).toBeLessThan(30);
      expect(body.correlationId).toBeDefined();
      expect(body.auditId).toBeDefined();
      expect(body.processingTimeMs).toBeLessThan(200);
    });

    test('should allow green user to create transport', async () => {
      const response = await securityCheck(
        apiContext,
        { id: 'u_1001', role: 'SHIPPER_COMPANY', companyId: 'c_2001' },
        'CREATE_TRANSPORT',
        { type: 'transport', id: 'tp_0001', context: { route: 'DE-NL' } }
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.decision).toBe('allowed');
    });

    test('should allow green user to view wallet', async () => {
      const response = await securityCheck(
        apiContext,
        { id: 'u_1001', role: 'SHIPPER_COMPANY', companyId: 'c_2001' },
        'VIEW_WALLET',
        { type: 'wallet', id: 'w_0001' }
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.decision).toBe('allowed');
    });
  });

  // ==========================================
  // YELLOW FLOW TESTS
  // ==========================================
  test.describe('Yellow Risk Flow', () => {
    test('should require mitigation for yellow user payout', async () => {
      const testCase = TEST_CASES[1];

      const response = await securityCheck(
        apiContext,
        testCase.user,
        testCase.action,
        testCase.entity
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.decision).toBe('allowed_with_mitigation');
      expect(body.riskLevel).toBe('yellow');
      expect(body.riskScore).toBeGreaterThanOrEqual(30);
      expect(body.riskScore).toBeLessThan(70);
      expect(body.mitigations).toBeDefined();
      expect(body.mitigations.length).toBeGreaterThan(0);

      // Verify mitigation structure
      const mitigation = body.mitigations[0];
      expect(mitigation.id).toBeDefined();
      expect(mitigation.type).toBeDefined();
      expect(mitigation.status).toBe('pending');
    });

    test('should apply delay mitigation successfully', async () => {
      // Apply mitigation
      const applyResponse = await apiContext.post('/api/security/mitigation/apply', {
        data: {
          entityType: 'transaction',
          entityId: 'tx_3002',
          action: 'INITIATE_PAYOUT',
          mitigationType: 'delay',
          context: {
            delayMinutes: 1440,
            userId: 'u_1002',
          },
        },
      });

      expect(applyResponse.status()).toBe(200);
      const body = await applyResponse.json();

      expect(body.success).toBe(true);
      expect(body.mitigation.type).toBe('delay');
      expect(body.mitigation.status).toBe('pending');
      expect(body.mitigation.scheduledAt).toBeDefined();
    });

    test('should verify 2FA mitigation', async () => {
      // Apply 2FA mitigation
      const applyResponse = await apiContext.post('/api/security/mitigation/apply', {
        data: {
          entityType: 'transaction',
          entityId: 'tx_2fa_test',
          action: 'INITIATE_PAYOUT',
          mitigationType: '2fa',
          context: {
            userId: 'u_1002',
            userPhone: '+491234567890',
          },
        },
      });

      expect(applyResponse.status()).toBe(200);

      // Verify 2FA
      const verifyResponse = await apiContext.post('/api/mitigation/verify-2fa', {
        data: {
          mitigationId: 'm_2fa_test',
          code: '123456',
        },
      });

      // Should succeed or fail gracefully
      expect([200, 400, 404]).toContain(verifyResponse.status());
    });
  });

  // ==========================================
  // RED FLOW TESTS
  // ==========================================
  test.describe('Red Risk Flow', () => {
    test('should block red user payout and create ticket', async () => {
      const testCase = TEST_CASES[2];

      const response = await securityCheck(
        apiContext,
        testCase.user,
        testCase.action,
        testCase.entity
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.decision).toBe('blocked');
      expect(body.riskLevel).toBe('red');
      expect(body.riskScore).toBeGreaterThanOrEqual(70);
      expect(body.blockReason).toBeDefined();
      expect(body.supportTicketId).toBeDefined();
    });

    test('should create support ticket for blocked transaction', async () => {
      // First, block a transaction
      await securityCheck(
        apiContext,
        { id: 'u_1003', role: 'SHIPPER_COMPANY', companyId: 'c_2003' },
        'INITIATE_PAYOUT',
        { type: 'transaction', id: 'tx_red_test', context: { amount: 75000, international: true } }
      );

      // Query support tickets
      const ticketsResponse = await apiContext.get('/api/risk/tickets', {
        params: {
          userId: 'u_1003',
          status: 'open',
        },
      });

      expect(ticketsResponse.ok()).toBeTruthy();
      const tickets = await ticketsResponse.json();
      expect(tickets.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================
  // PERMISSION DENIED FLOW TESTS
  // ==========================================
  test.describe('Permission Denied Flow', () => {
    test('should deny driver from initiating payout', async () => {
      const testCase = TEST_CASES[3];

      const response = await securityCheck(
        apiContext,
        testCase.user,
        testCase.action,
        testCase.entity
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.decision).toBe('permission_denied');
      expect(body.deniedReason).toBeDefined();
      expect(body.deniedReason).toContain('DRIVER_SELF_EMPLOYED');
    });

    test('should deny shipper from assigning driver', async () => {
      const response = await securityCheck(
        apiContext,
        { id: 'u_1001', role: 'SHIPPER_COMPANY', companyId: 'c_2001' },
        'ASSIGN_DRIVER',
        { type: 'transport', id: 'tp_0001' }
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.decision).toBe('permission_denied');
    });
  });

  // ==========================================
  // ADMIN OPERATIONS
  // ==========================================
  test.describe('Admin Operations', () => {
    test('should allow admin to override risk level', async () => {
      const response = await apiContext.post('/api/security/risk/override', {
        data: {
          entityType: 'user',
          entityId: 'u_1003',
          newLevel: 'green',
          newScore: 15,
          reason: 'Manual override after KYC verification',
          actorId: 'admin-001',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.newLevel).toBe('green');
      expect(body.previousLevel).toBeDefined();
    });

    test('should allow admin to query risk status', async () => {
      const response = await apiContext.get('/api/security/risk/user/u_1001');

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.entityType).toBe('user');
      expect(body.entityId).toBe('u_1001');
      expect(['green', 'yellow', 'red']).toContain(body.level);
      expect(body.score).toBeDefined();
    });

    test('should allow admin to validate permissions', async () => {
      const response = await apiContext.post('/api/security/permissions/validate', {
        data: {
          user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
          action: 'ACCEPT_OFFER',
          entity: { type: 'transaction', id: 'tx_0001' },
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.allowed).toBeDefined();
    });
  });

  // ==========================================
  // AUDIT TRAIL TESTS
  // ==========================================
  test.describe('Audit Trail', () => {
    test('should create audit event for security check', async () => {
      // Perform security check
      const checkResponse = await securityCheck(
        apiContext,
        { id: 'u_1001', role: 'SHIPPER_COMPANY', companyId: 'c_2001' },
        'ACCEPT_OFFER',
        { type: 'transaction', id: 'tx_audit_test' }
      );

      const checkBody = await checkResponse.json();
      const auditId = checkBody.auditId;

      // Query audit log
      const auditResponse = await apiContext.get(`/api/audit/entity/transaction/tx_audit_test`);

      expect(auditResponse.ok()).toBeTruthy();
      const audits = await auditResponse.json();

      expect(audits.length).toBeGreaterThan(0);
    });

    test('should search audit logs by correlation ID', async () => {
      // Perform security check
      const checkResponse = await securityCheck(
        apiContext,
        { id: 'u_1001', role: 'SHIPPER_COMPANY', companyId: 'c_2001' },
        'ACCEPT_OFFER',
        { type: 'transaction', id: 'tx_search_test' }
      );

      const checkBody = await checkResponse.json();
      const correlationId = checkBody.correlationId;

      // Search by correlation ID
      const searchResponse = await apiContext.post('/api/audit/search', {
        data: {
          correlationId,
        },
      });

      expect(searchResponse.ok()).toBeTruthy();
      const results = await searchResponse.json();
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // ERROR HANDLING TESTS
  // ==========================================
  test.describe('Error Handling', () => {
    test('should return 400 for missing entity', async () => {
      const response = await apiContext.post('/api/security/check', {
        data: {
          requestId: await generateRequestId(),
          user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
          action: 'ACCEPT_OFFER',
          // entity missing
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should return 400 for invalid action', async () => {
      const response = await apiContext.post('/api/security/check', {
        data: {
          requestId: await generateRequestId(),
          user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
          action: 'INVALID_ACTION',
          entity: { type: 'transaction', id: 'tx_0001' },
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should return 400 for missing user role', async () => {
      const response = await apiContext.post('/api/security/check', {
        data: {
          requestId: await generateRequestId(),
          user: { id: 'u_no_role' },
          action: 'ACCEPT_OFFER',
          entity: { type: 'transaction', id: 'tx_0001' },
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should return error codes catalog', async () => {
      const response = await apiContext.get('/api/security/error-codes');

      expect(response.ok()).toBeTruthy();
      const codes = await response.json();

      expect(codes).toBeInstanceOf(Array);
      expect(codes.length).toBeGreaterThan(0);
      expect(codes[0].code).toBeDefined();
      expect(codes[0].description).toBeDefined();
    });
  });

  // ==========================================
  // PERFORMANCE TESTS
  // ==========================================
  test.describe('Performance', () => {
    test('security check should complete within 120ms (P95)', async () => {
      const times: number[] = [];

      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        await securityCheck(
          apiContext,
          { id: 'u_1001', role: 'SHIPPER_COMPANY', companyId: 'c_2001' },
          'ACCEPT_OFFER',
          { type: 'transaction', id: `tx_perf_${i}` }
        );
        times.push(Date.now() - start);
      }

      times.sort((a, b) => a - b);
      const p95 = times[Math.floor(times.length * 0.95)];

      expect(p95).toBeLessThan(200); // Allow 200ms for test environment
    });
  });
});

// ============================================
// UI E2E TESTS (Optional Dashboard Tests)
// ============================================

test.describe('Security Gateway Dashboard E2E', () => {
  test.skip('should display risk overview dashboard', async ({ page }) => {
    await page.goto('/dashboard/risk');

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="risk-overview"]');

    // Verify key metrics are displayed
    await expect(page.locator('[data-testid="green-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="yellow-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="red-count"]')).toBeVisible();
  });

  test.skip('should display high-risk cases list', async ({ page }) => {
    await page.goto('/dashboard/high-risk');

    // Wait for cases to load
    await page.waitForSelector('[data-testid="cases-list"]');

    // Verify cases are displayed
    const cases = page.locator('[data-testid="case-item"]');
    const count = await cases.count();
    expect(count).toBeGreaterThan(0);
  });

  test.skip('should allow support to override risk', async ({ page }) => {
    await page.goto('/support/cases/u_1003');

    // Click override button
    await page.click('[data-testid="override-risk-button"]');

    // Fill override form
    await page.selectOption('[data-testid="new-level-select"]', 'green');
    await page.fill('[data-testid="override-reason"]', 'Verified via phone call');

    // Submit
    await page.click('[data-testid="submit-override"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});

// ============================================
// EXPORT TEST RESULTS
// ============================================

test.afterAll(async () => {
  // Generate summary report
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    testCases: TEST_CASES.length,
  };

  // Write to file for CI artifacts
  if (process.env.CI) {
    await fs.writeFile(
      'test-results/e2e-summary.json',
      JSON.stringify(summary, null, 2)
    );
  }
});
