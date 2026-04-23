/**
 * CargoBit ML Service Load Test
 * ==============================
 * 
 * k6 Load Test Script für ML Inference Service.
 * 
 * Szenarien:
 * 1. Baseline Scoring - /score endpoint with realistic payloads
 * 2. Explainability Load - /explain endpoint with SHAP
 * 3. Mixed Traffic - 80% /score, 20% /explain
 * 4. Cold Start / Model Reload - Model version switch under load
 * 
 * Usage:
 *   k6 run load-test.js
 *   k6 run --vus 100 --duration 5m load-test.js
 *   k6 run --stage "1m:50,3m:200,1m:0" load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = __ENV.ML_SERVICE_URL || 'http://localhost:8080';

// Custom Metrics
const errorRate = new Rate('errors');
const scoreLatency = new Trend('score_latency');
const explainLatency = new Trend('explain_latency');
const requestsTotal = new Counter('requests_total');

// =============================================================================
// TEST SCENARIOS
// =============================================================================

export const options = {
  // Default: Baseline Scoring Scenario
  scenarios: {
    baseline_scoring: {
      executor: 'ramping-vus',
      exec: 'scoreScenario',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 VUs
        { duration: '3m', target: 200 },  // Ramp up to 200 VUs
        { duration: '5m', target: 400 },  // Ramp up to 400 VUs (peak)
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  
  // Alternative scenarios (uncomment to use)
  // scenarios: {
  //   explainability: {
  //     executor: 'ramping-vus',
  //     exec: 'explainScenario',
  //     startVUs: 0,
  //     stages: [
  //       { duration: '2m', target: 20 },
  //       { duration: '5m', target: 50 },
  //       { duration: '2m', target: 0 },
  //     ],
  //   },
  // },
  
  // scenarios: {
  //   mixed_traffic: {
  //     executor: 'ramping-vus',
  //     exec: 'mixedScenario',
  //     startVUs: 0,
  //     stages: [
  //       { duration: '2m', target: 100 },
  //       { duration: '5m', target: 300 },
  //       { duration: '2m', target: 0 },
  //     ],
  //   },
  // },
  
  // Thresholds
  thresholds: {
    'http_req_duration': ['p(50)<20', 'p(90)<40', 'p(95)<50', 'p(99)<100'],
    'errors': ['rate<0.01'],  // < 1% error rate
    'score_latency': ['p(95)<50', 'p(99)<100'],
    'explain_latency': ['p(95)<100', 'p(99)<200'],
  },
};

// =============================================================================
// TEST DATA
// =============================================================================

// Realistic feature payload for scoring
function generateScorePayload() {
  return JSON.stringify({
    modelVersion: 'latest',
    features: {
      revenue_score: Math.random() * 0.5 + 0.3,
      capacity_utilization_score: Math.random() * 0.4 + 0.4,
      priority_score: Math.random() * 0.3 + 0.3,
      risk_score: Math.random() * 0.3,
      service_level_score: Math.random() * 0.3 + 0.5,
      co2_score: Math.random() * 0.4 + 0.4,
      distance_pickup_to_route_km: Math.random() * 50 + 5,
      eta_to_pickup_minutes: Math.random() * 60 + 15,
      free_volume_m3: Math.random() * 30 + 10,
      tour_progress_pct: Math.random() * 0.8 + 0.1,
      customer_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
      driver_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
      lane_realized_margin_avg_90d: Math.random() * 0.2,
    }
  });
}

// Realistic feature payload for explainability
function generateExplainPayload() {
  return JSON.stringify({
    modelVersion: 'latest',
    features: {
      revenue_score: Math.random() * 0.5 + 0.3,
      capacity_utilization_score: Math.random() * 0.4 + 0.4,
      priority_score: Math.random() * 0.3 + 0.3,
      risk_score: Math.random() * 0.3,
      service_level_score: Math.random() * 0.3 + 0.5,
      co2_score: Math.random() * 0.4 + 0.4,
      distance_pickup_to_route_km: Math.random() * 50 + 5,
      eta_to_pickup_minutes: Math.random() * 60 + 15,
      customer_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
      driver_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
    },
    topK: 5
  });
}

// HTTP headers
const params = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: '10s',
};

// =============================================================================
// SCENARIOS
// =============================================================================

/**
 * Scenario 1: Baseline Scoring
 * Focus: /score endpoint latency and throughput
 */
export function scoreScenario() {
  const payload = generateScorePayload();
  
  const res = http.post(`${BASE_URL}/score`, payload, params);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has scoreMl': (r) => r.json('scoreMl') !== undefined,
    'latency < 50ms': (r) => r.timings.duration < 50,
    'latency < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
  scoreLatency.add(res.timings.duration);
  requestsTotal.add(1);
  
  if (!success) {
    console.log(`Score failed: ${res.status} - ${res.body}`);
  }
  
  sleep(0.1);  // 100ms between requests
}

/**
 * Scenario 2: Explainability Load
 * Focus: /explain endpoint with SHAP computation
 */
export function explainScenario() {
  const payload = generateExplainPayload();
  
  const res = http.post(`${BASE_URL}/explain`, payload, params);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has mlScore': (r) => r.json('mlScore') !== undefined,
    'has topContributors': (r) => {
      const contributors = r.json('topContributors');
      return contributors && contributors.length > 0;
    },
    'latency < 100ms': (r) => r.timings.duration < 100,
    'latency < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
  explainLatency.add(res.timings.duration);
  requestsTotal.add(1);
  
  if (!success) {
    console.log(`Explain failed: ${res.status} - ${res.body}`);
  }
  
  sleep(0.2);  // 200ms between requests (explain is heavier)
}

/**
 * Scenario 3: Mixed Traffic
 * 80% /score, 20% /explain
 */
export function mixedScenario() {
  const rand = Math.random();
  
  if (rand < 0.8) {
    scoreScenario();
  } else {
    explainScenario();
  }
}

/**
 * Scenario 4: Cold Start / Model Reload
 * Tests behavior when model version changes under load
 */
export function coldStartScenario() {
  // First, trigger model reload via health check
  const healthRes = http.get(`${BASE_URL}/health`);
  
  check(healthRes, {
    'health check OK': (r) => r.status === 200,
    'model loaded': (r) => r.json('modelLoaded') === true,
  });
  
  sleep(0.5);
  
  // Then send scoring requests
  for (let i = 0; i < 10; i++) {
    scoreScenario();
  }
}

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  
  // Verify service is available
  const healthRes = http.get(`${BASE_URL}/health`);
  
  if (healthRes.status !== 200) {
    throw new Error(`Service health check failed: ${healthRes.status}`);
  }
  
  console.log('Service health check passed');
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
  
  // Final health check
  const healthRes = http.get(`${BASE_URL}/health`);
  console.log(`Final health: ${healthRes.status} - ${healthRes.body}`);
}
