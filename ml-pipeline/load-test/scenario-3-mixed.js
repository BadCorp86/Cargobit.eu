/**
 * CargoBit ML Service - Mixed Traffic Load Test
 * =============================================
 * 
 * Simulates realistic production traffic:
 * - 80% /score requests (fast)
 * - 20% /explain requests (heavier)
 * 
 * Target: P95 < 60ms overall
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.ML_SERVICE_URL || 'http://localhost:8080';

const errorRate = new Rate('errors');
const scoreLatency = new Trend('score_latency');
const explainLatency = new Trend('explain_latency');
const scoreCount = new Counter('score_requests');
const explainCount = new Counter('explain_requests');

export const options = {
  scenarios: {
    mixed_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 300 },
        { duration: '5m', target: 500 },  // Peak: 500 VUs
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(50)<30', 'p(90)<50', 'p(95)<60', 'p(99)<100'],
    'errors': ['rate<0.01'],
    'score_latency': ['p(95)<50'],
    'explain_latency': ['p(95)<100'],
  },
};

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
      customer_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
      driver_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
    }
  });
}

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
      customer_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
      driver_acceptance_rate_30d: Math.random() * 0.4 + 0.5,
    },
    topK: 5
  });
}

export default function() {
  const rand = Math.random();
  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  };
  
  if (rand < 0.8) {
    // 80% - Score requests
    const payload = generateScorePayload();
    const res = http.post(`${BASE_URL}/score`, payload, params);
    
    const success = check(res, {
      'score: status 200': (r) => r.status === 200,
      'score: has scoreMl': (r) => r.json('scoreMl') !== undefined,
      'score: latency < 50ms': (r) => r.timings.duration < 50,
    });
    
    errorRate.add(!success);
    scoreLatency.add(res.timings.duration);
    scoreCount.add(1);
    
  } else {
    // 20% - Explain requests
    const payload = generateExplainPayload();
    params.timeout = '15s';
    const res = http.post(`${BASE_URL}/explain`, payload, params);
    
    const success = check(res, {
      'explain: status 200': (r) => r.status === 200,
      'explain: has topContributors': (r) => {
        const c = r.json('topContributors');
        return c && Array.isArray(c);
      },
      'explain: latency < 100ms': (r) => r.timings.duration < 100,
    });
    
    errorRate.add(!success);
    explainLatency.add(res.timings.duration);
    explainCount.add(1);
  }
  
  sleep(0.1);  // ~10 RPS per VU
}

export function handleSummary(data) {
  const scoreTotal = data.metrics.score_requests ? data.metrics.score_requests.count : 0;
  const explainTotal = data.metrics.explain_requests ? data.metrics.explain_requests.count : 0;
  
  console.log(`\n===== Mixed Traffic Summary =====`);
  console.log(`Score requests: ${scoreTotal}`);
  console.log(`Explain requests: ${explainTotal}`);
  console.log(`Ratio: ${(scoreTotal / (scoreTotal + explainTotal) * 100).toFixed(1)}% / ${(explainTotal / (scoreTotal + explainTotal) * 100).toFixed(1)}%`);
  
  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify(data, null, 2),
  };
}
