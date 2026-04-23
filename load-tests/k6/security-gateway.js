// ============================================
// CARGOBIT SECURITY GATEWAY - K6 LOAD TESTS
// Version: 1.0 - Production-Ready
// ============================================

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================
// CUSTOM METRICS
// ============================================

const errorRate = new Rate('errors');
const latencyTrend = new Trend('latency');
const greenCounter = new Counter('green_decisions');
const yellowCounter = new Counter('yellow_decisions');
const redCounter = new Counter('red_decisions');
const permissionDeniedCounter = new Counter('permission_denied');

// ============================================
// CONFIGURATION
// ============================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3004';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test Data
const TEST_USERS = {
  green: { id: 'u_1001', role: 'SHIPPER_COMPANY', companyId: 'c_2001' },
  yellow: { id: 'u_1002', role: 'SHIPPER_COMPANY', companyId: 'c_2002' },
  red: { id: 'u_1003', role: 'SHIPPER_COMPANY', companyId: 'c_2003' },
  admin: { id: 'admin-001', role: 'ADMIN', companyId: null },
  support: { id: 'support-001', role: 'SUPPORT', companyId: null },
};

const TEST_ENTITIES = {
  green: { type: 'transaction', id: 'tx_3001', context: { amount: 1200, international: false, iban_age_hours: 240 } },
  yellow: { type: 'transaction', id: 'tx_3002', context: { amount: 18000, iban_age_hours: 12, payout_method: 'SEPA' } },
  red: { type: 'transaction', id: 'tx_3003', context: { amount: 52000, international: true, hazmat: false, iban_age_hours: 6 } },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateRequestId() {
  return `req-${__VU}-${__ITER}-${Date.now()}`;
}

function buildPayload(riskCase = 'green', action = 'ACCEPT_OFFER') {
  const user = TEST_USERS[riskCase] || TEST_USERS.green;
  const entity = TEST_ENTITIES[riskCase] || TEST_ENTITIES.green;
  
  return JSON.stringify({
    requestId: generateRequestId(),
    user,
    action,
    entity,
  });
}

function makeRequest(payload, tags = {}) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    tags,
  };

  const response = http.post(`${BASE_URL}/api/security/check`, payload, params);
  
  // Record metrics
  latencyTrend.add(response.timings.duration);
  
  // Check response
  const success = check(response, {
    'status is 200 or 403': (r) => r.status === 200 || r.status === 403,
    'has correlationId': (r) => {
      try {
        const body = r.json();
        return body.correlationId !== undefined;
      } catch {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!success) {
    errorRate.add(1);
  }

  // Track decisions
  try {
    const body = response.json();
    if (body.decision === 'allowed') greenCounter.add(1);
    if (body.decision === 'allowed_with_mitigation') yellowCounter.add(1);
    if (body.decision === 'blocked') redCounter.add(1);
    if (body.decision === 'permission_denied') permissionDeniedCounter.add(1);
  } catch {
    // Ignore JSON parse errors
  }

  return response;
}

// ============================================
// SCENARIO 1: RAMP-UP TEST (BASELINE)
// ============================================

export const rampUpOptions = {
  stages: [
    { duration: '2m', target: 50 },   // Warm up
    { duration: '3m', target: 150 },  // Ramp up
    { duration: '5m', target: 200 },  // Peak
    { duration: '2m', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<120', 'p(99)<250'],
    http_req_failed: ['rate<0.005'],
    errors: ['rate<0.01'],
  },
};

export function rampUp() {
  const payload = buildPayload('green');
  makeRequest(payload, { scenario: 'ramp-up' });
  sleep(1);
}

// ============================================
// SCENARIO 2: SPIKE TEST (FRAUD WAVE)
// ============================================

export const spikeOptions = {
  stages: [
    { duration: '5s', target: 1000 },   // Spike up
    { duration: '30s', target: 1000 },  // Hold
    { duration: '10s', target: 50 },    // Drop
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.03'],
  },
};

export function spike() {
  // Mix of green, yellow, red cases during spike
  const cases = ['green', 'green', 'green', 'yellow', 'red'];
  const riskCase = cases[Math.floor(Math.random() * cases.length)];
  
  const payload = buildPayload(riskCase);
  makeRequest(payload, { scenario: 'spike', riskCase });
  sleep(0.1); // Minimal sleep for high throughput
}

// ============================================
// SCENARIO 3: SOAK TEST (LONG DURATION)
// ============================================

export const soakOptions = {
  stages: [
    { duration: '10m', target: 150 },   // Ramp up
    { duration: '2h40m', target: 150 }, // Soak (3h total)
    { duration: '10m', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<300'],
    http_req_failed: ['rate<0.005'],
    errors: ['rate<0.01'],
  },
};

export function soak() {
  // Realistic distribution: 70% green, 20% yellow, 10% red
  const rand = Math.random();
  let riskCase;
  if (rand < 0.7) riskCase = 'green';
  else if (rand < 0.9) riskCase = 'yellow';
  else riskCase = 'red';
  
  const payload = buildPayload(riskCase);
  makeRequest(payload, { scenario: 'soak', riskCase });
  sleep(1);
}

// ============================================
// SCENARIO 4: STRESS TEST (CAPACITY LIMITS)
// ============================================

export const stressOptions = {
  stages: [
    { duration: '2m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '2m', target: 400 },
    { duration: '2m', target: 500 },
    { duration: '2m', target: 600 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

export function stress() {
  const payload = buildPayload('green');
  makeRequest(payload, { scenario: 'stress' });
  sleep(0.5);
}

// ============================================
// SCENARIO 5: CHAOS TEST (RISK ENGINE DOWN)
// ============================================

export const chaosOptions = {
  vus: 200,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.1'],
  },
};

export function chaos() {
  // Intentionally malformed/incomplete payloads
  const scenarios = [
    // Missing entity
    JSON.stringify({
      requestId: generateRequestId(),
      user: TEST_USERS.green,
      action: 'ACCEPT_OFFER',
    }),
    // Missing user role
    JSON.stringify({
      requestId: generateRequestId(),
      user: { id: 'u_chaos' },
      action: 'ACCEPT_OFFER',
      entity: TEST_ENTITIES.green,
    }),
    // Invalid action
    JSON.stringify({
      requestId: generateRequestId(),
      user: TEST_USERS.green,
      action: 'INVALID_ACTION',
      entity: TEST_ENTITIES.green,
    }),
    // Valid payload (for comparison)
    buildPayload('green'),
  ];
  
  const payload = scenarios[Math.floor(Math.random() * scenarios.length)];
  makeRequest(payload, { scenario: 'chaos' });
  sleep(0.5);
}

// ============================================
// SCENARIO 6: PERMISSION DENIED FLOW
// ============================================

export const permissionDeniedOptions = {
  vus: 50,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<50'],
    http_req_failed: ['rate<0.01'],
  },
};

export function permissionDenied() {
  // DRIVER trying to INITIATE_PAYOUT (not allowed)
  const payload = JSON.stringify({
    requestId: generateRequestId(),
    user: { id: 'driver-001', role: 'DRIVER_SELF_EMPLOYED' },
    action: 'INITIATE_PAYOUT',
    entity: TEST_ENTITIES.green,
  });
  
  makeRequest(payload, { scenario: 'permission-denied' });
  sleep(1);
}

// ============================================
// SCENARIO 7: RISK OVERRIDE FLOW
// ============================================

export const riskOverrideOptions = {
  vus: 20,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export function riskOverride() {
  const payload = JSON.stringify({
    entityType: 'user',
    entityId: 'u_1003',
    newLevel: 'green',
    newScore: 15,
    reason: 'Load test override',
    actorId: 'admin-001',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    tags: { scenario: 'risk-override' },
  };

  http.post(`${BASE_URL}/api/security/risk/override`, payload, params);
  sleep(2);
}

// ============================================
// SCENARIO 8: MITIGATION APPLY
// ============================================

export const mitigationApplyOptions = {
  vus: 30,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<150'],
    http_req_failed: ['rate<0.01'],
  },
};

export function mitigationApply() {
  const mitigationTypes = ['delay', '2fa', 'gps_check', 'extra_logging'];
  const mitigationType = mitigationTypes[Math.floor(Math.random() * mitigationTypes.length)];
  
  const payload = JSON.stringify({
    entityType: 'transaction',
    entityId: `tx_mit_${__VU}_${__ITER}`,
    action: 'INITIATE_PAYOUT',
    mitigationType,
    context: {
      delayMinutes: 1440,
      userId: 'u_1002',
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    tags: { scenario: 'mitigation-apply', mitigationType },
  };

  http.post(`${BASE_URL}/api/security/mitigation/apply`, payload, params);
  sleep(1);
}

// ============================================
// MAIN EXPORT - SCENARIO SELECTION
// ============================================

// Select scenario based on environment variable
const SCENARIO = __ENV.SCENARIO || 'ramp-up';

let options, defaultFn;

switch (SCENARIO) {
  case 'spike':
    options = spikeOptions;
    defaultFn = spike;
    break;
  case 'soak':
    options = soakOptions;
    defaultFn = soak;
    break;
  case 'stress':
    options = stressOptions;
    defaultFn = stress;
    break;
  case 'chaos':
    options = chaosOptions;
    defaultFn = chaos;
    break;
  case 'permission-denied':
    options = permissionDeniedOptions;
    defaultFn = permissionDenied;
    break;
  case 'risk-override':
    options = riskOverrideOptions;
    defaultFn = riskOverride;
    break;
  case 'mitigation-apply':
    options = mitigationApplyOptions;
    defaultFn = mitigationApply;
    break;
  default:
    options = rampUpOptions;
    defaultFn = rampUp;
}

export { options };
export default defaultFn;
