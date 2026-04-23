/**
 * CargoBit ML Service - Explainability Load Test
 * ==============================================
 * 
 * Focus: /explain endpoint with SHAP computation
 * Target: P95 < 100ms, P99 < 200ms at 50 RPS
 * 
 * Note: Explainability is computationally heavier than scoring
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.ML_SERVICE_URL || 'http://localhost:8080';

const errorRate = new Rate('errors');
const explainLatency = new Trend('explain_latency');

export const options = {
  scenarios: {
    explainability: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },   // Warm up (low load)
        { duration: '3m', target: 30 },   // Medium load
        { duration: '5m', target: 50 },   // Peak load (50 VUs = ~50 RPS)
        { duration: '2m', target: 0 },    // Cool down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(50)<50', 'p(90)<80', 'p(95)<100', 'p(99)<200'],
    'errors': ['rate<0.01'],  // < 1% error rate
    'explain_latency': ['p(95)<100', 'p(99)<200'],
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
      eta_to_pickup_minutes: Math.random() * 60 + 15,
      free_volume_m3: Math.random() * 30 + 10,
      tour_progress_pct: Math.random() * 0.8 + 0.1,
      customer_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
      driver_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
    },
    topK: 5
  });
}

export default function() {
  const payload = generatePayload();
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '15s',  // Longer timeout for SHAP
  };
  
  const res = http.post(`${BASE_URL}/explain`, payload, params);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has mlScore': (r) => r.json('mlScore') !== undefined,
    'has topContributors': (r) => {
      const contributors = r.json('topContributors');
      return contributors && Array.isArray(contributors);
    },
    'topContributors has 5 items': (r) => {
      const contributors = r.json('topContributors');
      return contributors && contributors.length === 5;
    },
    'contributors have valid structure': (r) => {
      const contributors = r.json('topContributors');
      if (!contributors || contributors.length === 0) return false;
      const c = contributors[0];
      return c.feature && c.impact !== undefined && c.direction;
    },
    'explanationMethod is shap': (r) => r.json('explanationMethod') === 'shap',
    'latency < 100ms': (r) => r.timings.duration < 100,
    'latency < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
  explainLatency.add(res.timings.duration);
  
  sleep(1);  // 1 request per second per VU
}
