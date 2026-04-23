/**
 * CargoBit ML Gateway Service
 * ============================
 * 
 * Unified gateway for ML operations:
 * - Scoring (single + batch)
 * - Feature retrieval
 * - Configuration management
 * - Health monitoring
 */

import express, { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import httpProxy from 'http-proxy';
import { v4 as uuidv4 } from 'uuid';

import {
  createMLGateway,
  MLRateLimiter,
  MLCircuitBreaker,
  MLMetricsCollector,
} from './middleware';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface GatewayConfig {
  port: number;
  redisUrl: string;
  scoringServiceUrl: string;
  configServiceUrl: string;
  featureStoreUrl: string;
  defaultProfile: string;
  canaryPercentage: number;
}

const config: GatewayConfig = {
  port: parseInt(process.env.PORT || '8082'),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379/5',
  scoringServiceUrl: process.env.SCORING_SERVICE_URL || 'http://localhost:8081',
  configServiceUrl: process.env.CONFIG_SERVICE_URL || 'http://localhost:8080',
  featureStoreUrl: process.env.FEATURE_STORE_URL || 'http://localhost:6566',
  defaultProfile: process.env.DEFAULT_PROFILE || 'revenue_focused',
  canaryPercentage: parseInt(process.env.CANARY_PERCENTAGE || '0'),
};

// =============================================================================
// INITIALIZE
// =============================================================================

const app = express();
const redis = new Redis(config.redisUrl);

const gateway = createMLGateway({
  redis,
  ...config,
});

// Proxy instances
const scoringProxy = httpProxy.createProxyServer({ target: config.scoringServiceUrl });
const configProxy = httpProxy.createProxyServer({ target: config.configServiceUrl });
const featureProxy = httpProxy.createProxyServer({ target: config.featureStoreUrl });

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(gateway.metrics);
app.use(gateway.auth);
app.use(gateway.rateLimit);
app.use(gateway.circuitBreaker);
app.use(gateway.transform);

// =============================================================================
// HEALTH ENDPOINTS
// =============================================================================

app.get('/health', async (req: Request, res: Response) => {
  const checks = {
    redis: false,
    scoring: false,
    config: false,
    features: false,
  };

  try {
    await redis.ping();
    checks.redis = true;
  } catch (e) {
    // Redis unavailable
  }

  // Check circuit breaker states
  const scoringState = await gateway.circuitBreakerState('ml-scoring-service');
  const configState = await gateway.circuitBreakerState('config-service');
  const featureState = await gateway.circuitBreakerState('feast-feature-server');

  const healthy = checks.redis && 
    scoringState?.state !== 'OPEN' && 
    configState?.state !== 'OPEN';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      redis: checks.redis,
      services: {
        scoring: scoringState?.state || 'UNKNOWN',
        config: configState?.state || 'UNKNOWN',
        features: featureState?.state || 'UNKNOWN',
      },
    },
    config: {
      canaryPercentage: config.canaryPercentage,
      defaultProfile: config.defaultProfile,
    },
  });
});

app.get('/ready', async (req: Request, res: Response) => {
  try {
    await redis.ping();
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not_ready' });
  }
});

// =============================================================================
// SCORING ENDPOINTS
// =============================================================================

app.post('/api/ml/score', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || uuidv4();

  try {
    // Get weights from config service
    const profileId = req.headers['x-profile-id'] as string || config.defaultProfile;
    const tenantId = req.headers['x-tenant-id'] as string;

    // Forward to scoring service
    scoringProxy.web(req, res, {
      target: config.scoringServiceUrl,
      headers: {
        'X-Request-ID': requestId,
        'X-Profile-ID': profileId,
        'X-Tenant-ID': tenantId || '',
        'X-Canary-Percentage': config.canaryPercentage.toString(),
      },
    });

  } catch (error: any) {
    // Fallback to heuristic scoring
    const fallbackScore = await calculateHeuristicScore(req.body);
    
    res.json({
      score: fallbackScore,
      source: 'heuristic',
      reason: 'ml_service_unavailable',
      requestId,
      latency: Date.now() - startTime,
    });
  }
});

app.post('/api/ml/batch', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { requests } = req.body;

  if (!Array.isArray(requests) || requests.length > 100) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'requests must be an array with max 100 items',
    });
  }

  // Forward to scoring service
  scoringProxy.web(req, res, {
    target: config.scoringServiceUrl,
  });
});

// =============================================================================
// FEATURE ENDPOINTS
// =============================================================================

app.post('/api/ml/features', async (req: Request, res: Response) => {
  try {
    featureProxy.web(req, res, {
      target: config.featureStoreUrl,
    });
  } catch (error) {
    res.status(503).json({
      error: 'FEATURE_STORE_UNAVAILABLE',
      message: 'Feature store is temporarily unavailable',
    });
  }
});

// =============================================================================
// CONFIG ENDPOINTS
// =============================================================================

app.get('/api/config/weights', async (req: Request, res: Response) => {
  configProxy.web(req, res, {
    target: `${config.configServiceUrl}/api/v1/config/weights`,
  });
});

app.put('/api/config/weights', async (req: Request, res: Response) => {
  configProxy.web(req, res, {
    target: `${config.configServiceUrl}/api/v1/config/weights`,
  });
});

app.get('/api/config/profiles', async (req: Request, res: Response) => {
  configProxy.web(req, res, {
    target: `${config.configServiceUrl}/api/v1/config/profiles`,
  });
});

// =============================================================================
// DISPATCHER ENDPOINTS (with ML integration)
// =============================================================================

app.get('/api/dispatcher/suggestions', async (req: Request, res: Response) => {
  const profileId = req.query.profile as string || config.defaultProfile;
  const tenantId = req.headers['x-tenant-id'] as string;

  // Get suggestions with ML-enhanced scoring
  try {
    // This would normally call matching-service which internally uses ML
    const response = await fetch(`${config.scoringServiceUrl}/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Profile-ID': profileId,
        'X-Tenant-ID': tenantId || '',
      },
      body: JSON.stringify({
        profile: profileId,
        tenant: tenantId,
      }),
    });

    const suggestions = await response.json();

    // Enrich with ML scores if enabled
    if (config.canaryPercentage > 0) {
      for (const suggestion of suggestions.suggestions || []) {
        if (Math.random() * 100 < config.canaryPercentage) {
          suggestion.mlEnabled = true;
          suggestion.mlScore = await getMLScore(suggestion);
        }
      }
    }

    res.json(suggestions);
  } catch (error) {
    res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Matching service temporarily unavailable',
    });
  }
});

app.post('/api/dispatcher/simulate', async (req: Request, res: Response) => {
  const { order, tour, profile = config.defaultProfile } = req.body;

  // Calculate heuristic score
  const heuristicScore = await calculateHeuristicScore({ order, tour });

  // Optionally get ML score
  let mlScore: number | null = null;
  let shapValues: Record<string, number> | null = null;

  if (config.canaryPercentage >= 100) {
    try {
      const mlResponse = await fetch(`${config.scoringServiceUrl}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, tour, includeShap: true }),
      });
      const mlData = await mlResponse.json();
      mlScore = mlData.score;
      shapValues = mlData.shapValues;
    } catch {
      // ML unavailable, use heuristic only
    }
  }

  // Calculate hybrid score
  const alpha = 0.8;
  const totalScore = mlScore !== null
    ? alpha * heuristicScore + (1 - alpha) * mlScore
    : heuristicScore;

  // Generate recommendations
  const recommendations = generateRecommendations(totalScore, { order, tour });

  res.json({
    totalScore,
    heuristicScore,
    mlScore,
    shapValues,
    recommendations,
    profile,
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// METRICS ENDPOINT
// =============================================================================

app.get('/metrics', async (req: Request, res: Response) => {
  const now = Date.now();
  const minute = Math.floor(now / 60000);

  // Gather metrics from Redis
  const [
    mlRequests,
    heuristicRequests,
    cacheRequests,
    fallbacks,
  ] = await Promise.all([
    redis.get(`cargobit_ml_gateway:requests:ml:${minute}`),
    redis.get(`cargobit_ml_gateway:requests:heuristic:${minute}`),
    redis.get(`cargobit_ml_gateway:requests:cache:${minute}`),
    redis.keys(`cargobit_ml_gateway:fallback:*:${minute}`),
  ]);

  const metrics = `
# HELP ml_gateway_requests_total Total ML requests by source
# TYPE ml_gateway_requests_total counter
ml_gateway_requests_total{source="ml"} ${mlRequests || 0}
ml_gateway_requests_total{source="heuristic"} ${heuristicRequests || 0}
ml_gateway_requests_total{source="cache"} ${cacheRequests || 0}

# HELP ml_gateway_fallbacks_total Total fallback events
# TYPE ml_gateway_fallbacks_total counter
${fallbacks.map((key: string) => {
    const match = key.match(/fallback:([^:]+):([^:]+):/);
    if (match) {
      return `ml_gateway_fallbacks_total{service="${match[1]}",type="${match[2]}"} ${redis.get(key) || 0}`;
    }
    return '';
  }).join('\n')}

# HELP ml_gateway_canary_percentage Current canary deployment percentage
# TYPE ml_gateway_canary_percentage gauge
ml_gateway_canary_percentage ${config.canaryPercentage}
`;

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function calculateHeuristicScore(data: { order: any; tour: any }): Promise<number> {
  const { order, tour } = data;

  // Revenue score
  const price = order?.price || 0;
  const detourKm = tour?.detourKm || 0;
  const revenueScore = Math.min(1, price / (detourKm + 1) / 10);

  // Capacity score
  const volumeM3 = order?.volumeM3 || 0;
  const freeCapacityM3 = tour?.freeCapacityM3 || 1;
  const capacityScore = Math.min(1, volumeM3 / freeCapacityM3);

  // Priority score
  const priorityMap: Record<string, number> = {
    PREMIUM: 1.0, HIGH: 0.8, NORMAL: 0.5, LOW: 0.2
  };
  const priorityScore = priorityMap[order?.priority] || 0.5;

  // Risk score
  const riskMap: Record<string, number> = {
    VERY_LOW: 1.0, LOW: 0.8, MEDIUM: 0.5, HIGH: 0.2, VERY_HIGH: 0.0
  };
  const riskScore = riskMap[order?.riskLevel] || 0.5;

  // Service level score
  const serviceMap: Record<string, number> = {
    SLA_CRITICAL: 1.0, SLA_HIGH: 0.7, STANDARD: 0.3
  };
  const serviceScore = serviceMap[order?.serviceLevel] || 0.3;

  // CO2 score
  const co2Score = Math.max(0, 1 - detourKm / 20);

  // Weighted sum
  return (
    0.35 * revenueScore +
    0.20 * capacityScore +
    0.10 * priorityScore +
    0.10 * riskScore +
    0.15 * serviceScore +
    0.10 * co2Score
  );
}

async function getMLScore(suggestion: any): Promise<number> {
  try {
    const response = await fetch(`${config.scoringServiceUrl}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestion),
    });
    const data = await response.json();
    return data.score;
  } catch {
    return suggestion.heuristicScore || 0.5;
  }
}

function generateRecommendations(score: number, data: any): string[] {
  const recommendations: string[] = [];

  if (score < 0.5) {
    recommendations.push('Score unter 0.5 - Vorschlag sollte abgelehnt werden');
  } else if (score >= 0.7) {
    recommendations.push('Hoher Score - Vorschlag empfohlen zur Annahme');
  }

  if (data.tour?.detourKm > 15) {
    recommendations.push('Großer Umweg - CO₂-Impact prüfen');
  }

  return recommendations;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('ML Gateway Error:', err);

  res.status(err.status || 500).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
    requestId: req.headers['x-request-id'],
  });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(config.port, () => {
  console.log(`ML Gateway running on port ${config.port}`);
  console.log(`Configuration:`);
  console.log(`  - Scoring Service: ${config.scoringServiceUrl}`);
  console.log(`  - Config Service: ${config.configServiceUrl}`);
  console.log(`  - Feature Store: ${config.featureStoreUrl}`);
  console.log(`  - Canary %: ${config.canaryPercentage}`);
  console.log(`  - Default Profile: ${config.defaultProfile}`);
});

export default app;
