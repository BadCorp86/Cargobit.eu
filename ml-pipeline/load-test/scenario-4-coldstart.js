/**
 * CargoBit ML Service - Cold Start / Model Reload Test
 * =====================================================
 * 
 * Tests behavior when:
 * 1. Service starts with no cached model
 * 2. Model version changes under load
 * 3. Cache eviction occurs
 * 
 * Target: First request < 500ms, subsequent < 50ms
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.ML_SERVICE_URL || 'http://localhost:8080';

const errorRate = new Rate('errors');
const coldStartLatency = new Trend('cold_start_latency');
const warmLatency = new Trend('warm_latency');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

export const options = {
  scenarios: {
    // Phase 1: Cold start simulation
    cold_start: {
      executor: 'per-vu-iterations',
      exec: 'coldStartTest',
      vus: 10,
      iterations: 1,
      startTime: '0s',
    },
    
    // Phase 2: Warm cache under load
    warm_load: {
      executor: 'ramping-vus',
      exec: 'warmLoadTest',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      startTime: '30s',  // Start after cold start phase
    },
    
    // Phase 3: Model reload under load
    model_reload: {
      executor: 'per-vu-iterations',
      exec: 'modelReloadTest',
      vus: 5,
      iterations: 3,
      startTime: '4m',
    },
  },
  
  thresholds: {
    'cold_start_latency': ['p(95)<500', 'p(99)<1000'],
    'warm_latency': ['p(95)<50', 'p(99)<100'],
    'errors': ['rate<0.02'],
  },
};

function generatePayload() {
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
      customer_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
      driver_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
    }
  });
}

const params = {
  headers: { 'Content-Type': 'application/json' },
  timeout: '15s',
};

/**
 * Test 1: Cold Start
 * First request should be slower (model loading)
 */
export function coldStartTest() {
  console.log('Testing cold start...');
  
  // Clear any potential cache via health check
  http.get(`${BASE_URL}/health`);
  sleep(1);
  
  // First request (potentially cold)
  const payload = generatePayload();
  const res = http.post(`${BASE_URL}/score`, payload, params);
  
  const latency = res.timings.duration;
  const isColdStart = latency > 50;
  
  const success = check(res, {
    'cold start: status 200': (r) => r.status === 200,
    'cold start: has scoreMl': (r) => r.json('scoreMl') !== undefined,
    'cold start: latency acceptable': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  coldStartLatency.add(latency);
  
  if (isColdStart) {
    console.log(`Cold start detected: ${latency.toFixed(2)}ms`);
    cacheMisses.add(1);
  } else {
    console.log(`Warm start: ${latency.toFixed(2)}ms`);
    cacheHits.add(1);
  }
  
  sleep(2);
  
  // Second request should be warm
  const res2 = http.post(`${BASE_URL}/score`, payload, params);
  const latency2 = res2.timings.duration;
  
  check(res2, {
    'warm follow-up: status 200': (r) => r.status === 200,
    'warm follow-up: latency < 50ms': (r) => r.timings.duration < 50,
  });
  
  warmLatency.add(latency2);
  console.log(`Warm follow-up: ${latency2.toFixed(2)}ms`);
}

/**
 * Test 2: Warm Cache Under Load
 * Requests should be fast with cached model
 */
export function warmLoadTest() {
  const payload = generatePayload();
  const res = http.post(`${BASE_URL}/score`, payload, params);
  
  const success = check(res, {
    'warm: status 200': (r) => r.status === 200,
    'warm: latency < 50ms': (r) => r.timings.duration < 50,
    'warm: latency < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
  warmLatency.add(res.timings.duration);
  
  sleep(0.1);
}

/**
 * Test 3: Model Reload
 * Simulate model version change during load
 */
export function modelReloadTest() {
  console.log('Testing model reload...');
  
  // Get current model info
  const infoRes = http.get(`${BASE_URL}/model/info`);
  
  if (infoRes.status === 200) {
    const currentVersion = infoRes.json('modelVersion');
    console.log(`Current model: ${currentVersion}`);
  }
  
  sleep(1);
  
  // Send requests with specific version (triggers cache lookup)
  const payload = generatePayload();
  const specificPayload = JSON.stringify({
    ...JSON.parse(payload),
    modelVersion: 'v20260419_test',  // May trigger cache miss
  });
  
  const res = http.post(`${BASE_URL}/score`, specificPayload, params);
  
  const success = check(res, {
    'reload: handled gracefully': (r) => r.status === 200 || r.status === 400,
  });
  
  // If 400 (model not found), try with latest
  if (res.status === 400) {
    console.log('Model version not found, falling back to latest');
    const fallbackRes = http.post(`${BASE_URL}/score`, payload, params);
    
    check(fallbackRes, {
      'fallback: status 200': (r) => r.status === 200,
    });
  }
  
  errorRate.add(!success);
  sleep(2);
}

export function handleSummary(data) {
  const coldP95 = data.metrics.cold_start_latency ? data.metrics.cold_start_latency.values['p(95)'] : 0;
  const warmP95 = data.metrics.warm_latency ? data.metrics.warm_latency.values['p(95)'] : 0;
  
  console.log(`\n===== Cold Start Test Summary =====`);
  console.log(`Cold start P95 latency: ${coldP95.toFixed(2)}ms`);
  console.log(`Warm cache P95 latency: ${warmP95.toFixed(2)}ms`);
  console.log(`Speedup factor: ${(coldP95 / warmP95).toFixed(2)}x`);
  
  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify(data, null, 2),
  };
}
