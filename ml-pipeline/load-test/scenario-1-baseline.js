/**
 * CargoBit ML Service - Baseline Scoring Load Test
 * ================================================
 * 
 * Focus: /score endpoint latency and throughput
 * Target: P95 < 50ms, P99 < 100ms at 400 RPS
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.ML_SERVICE_URL || 'http://localhost:8080';

const errorRate = new Rate('errors');
const scoreLatency = new Trend('score_latency');

export const options = {
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Warm up
        { duration: '3m', target: 200 },  // Medium load
        { duration: '5m', target: 400 },  // Peak load
        { duration: '2m', target: 0 },    // Cool down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(50)<20', 'p(90)<40', 'p(95)<50', 'p(99)<100'],
    'errors': ['rate<0.005'],  // < 0.5% error rate
    'score_latency': ['p(95)<50', 'p(99)<100'],
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
    }
  });
}

export default function() {
  const payload = generatePayload();
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  };
  
  const res = http.post(`${BASE_URL}/score`, payload, params);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has scoreMl': (r) => r.json('scoreMl') !== undefined,
    'scoreMl in range': (r) => {
      const score = r.json('scoreMl');
      return score >= 0 && score <= 1;
    },
    'has modelVersion': (r) => r.json('modelVersion') !== undefined,
    'latency < 50ms': (r) => r.timings.duration < 50,
    'latency < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(!success);
  scoreLatency.add(res.timings.duration);
  
  sleep(0.05);  // ~20 RPS per VU
}
