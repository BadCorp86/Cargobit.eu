/**
 * CargoBit ML Gateway Middleware
 * =================================
 * 
 * Express/Fastify middleware for ML endpoints:
 * - Rate limiting
 * - Circuit breaker
 * - Authentication
 * - Request transformation
 * - Metrics collection
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES
// =============================================================================

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  key: string;
  burstLimit?: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenRequests: number;
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastStateChange: number;
}

interface MLScoreRequest {
  order: {
    orderId: string;
    price: number;
    volumeM3: number;
    priority: string;
    riskLevel: string;
    serviceLevel: string;
  };
  tour: {
    tourId: string;
    freeCapacityM3: number;
    detourKm: number;
  };
  profileId?: string;
  tenantId?: string;
}

interface MLScoreResponse {
  score: number;
  source: 'ml' | 'heuristic' | 'cache';
  modelVersion?: string;
  shapValues?: Record<string, number>;
  latency: number;
}

interface MLGatewayConfig {
  redis: Redis;
  scoringServiceUrl: string;
  configServiceUrl: string;
  featureStoreUrl: string;
  defaultProfile: string;
  canaryPercentage: number;
}

// =============================================================================
// RATE LIMITER
// =============================================================================

export class MLRateLimiter {
  private redis: Redis;
  private config: Map<string, RateLimitConfig>;

  constructor(redis: Redis) {
    this.redis = redis;
    this.config = new Map([
      ['POST /api/ml/score', { limit: 600, windowSeconds: 60, key: 'sub' }],
      ['POST /api/ml/batch', { limit: 30, windowSeconds: 60, key: 'sub' }],
      ['POST /api/ml/features', { limit: 1200, windowSeconds: 60, key: 'sub' }],
      ['GET /api/config/**', { limit: 300, windowSeconds: 60, key: 'sub' }],
      ['PUT /api/config/**', { limit: 10, windowSeconds: 60, key: 'sub' }],
      ['GET /api/dispatcher/suggestions', { limit: 120, windowSeconds: 60, key: 'sub' }],
      ['POST /api/dispatcher/simulate', { limit: 60, windowSeconds: 60, key: 'sub' }],
    ]);
  }

  async checkLimit(
    route: string,
    identifier: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const config = this.config.get(route);
    if (!config) {
      return { allowed: true, remaining: Infinity, resetAt: Date.now() + 60000 };
    }

    const key = `ratelimit:${route}:${identifier}`;
    const now = Date.now();
    const windowStart = now - (config.windowSeconds * 1000);

    // Use sliding window with Redis
    const multi = this.redis.multi();
    
    // Remove old entries
    multi.zremrangebyscore(key, '-inf', windowStart);
    
    // Count current entries
    multi.zcard(key);
    
    // Add current request
    multi.zadd(key, now, `${now}:${uuidv4()}`);
    
    // Set expiry
    multi.expire(key, config.windowSeconds + 1);

    const results = await multi.exec();
    const count = results?.[1]?.[1] as number || 0;

    const allowed = count < config.limit;
    const remaining = Math.max(0, config.limit - count - 1);
    const resetAt = now + (config.windowSeconds * 1000);

    return { allowed, remaining, resetAt };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const route = `${req.method} ${req.route?.path || req.path}`;
      const identifier = (req as any).user?.sub || req.ip;

      const result = await this.checkLimit(route, identifier);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.get(route)?.limit || 0);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt);

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
        return res.status(429).json({
          error: 'ML_RATE_LIMITED',
          message: 'ML service rate limit exceeded',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        });
      }

      next();
    };
  }
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export class MLCircuitBreaker {
  private redis: Redis;
  private states: Map<string, CircuitBreakerState>;
  private config: Map<string, CircuitBreakerConfig>;

  constructor(redis: Redis) {
    this.redis = redis;
    this.states = new Map();
    this.config = new Map([
      ['ml-scoring-service', {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 30000,
        halfOpenRequests: 5,
      }],
      ['feast-feature-server', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 60000,
        halfOpenRequests: 3,
      }],
      ['config-service', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 60000,
        halfOpenRequests: 3,
      }],
    ]);
  }

  async getState(service: string): Promise<CircuitBreakerState> {
    // Try to get from Redis first (for distributed state)
    const cached = await this.redis.get(`circuit:${service}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to local state
    if (!this.states.has(service)) {
      this.states.set(service, {
        state: 'CLOSED',
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        lastStateChange: Date.now(),
      });
    }

    return this.states.get(service)!;
  }

  async updateState(service: string, state: CircuitBreakerState): Promise<void> {
    this.states.set(service, state);
    await this.redis.setex(
      `circuit:${service}`,
      300, // 5 minute TTL
      JSON.stringify(state)
    );
  }

  async canRequest(service: string): Promise<boolean> {
    const state = await this.getState(service);
    const config = this.config.get(service);

    if (!config) return true;

    switch (state.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if timeout has passed
        if (Date.now() - state.lastStateChange >= config.timeout) {
          // Transition to HALF_OPEN
          await this.updateState(service, {
            ...state,
            state: 'HALF_OPEN',
            successes: 0,
            lastStateChange: Date.now(),
          });
          return true;
        }
        return false;

      case 'HALF_OPEN':
        // Allow limited requests in HALF_OPEN
        return state.successes < config.halfOpenRequests;

      default:
        return false;
    }
  }

  async recordSuccess(service: string): Promise<void> {
    const state = await this.getState(service);
    const config = this.config.get(service);

    if (!config) return;

    if (state.state === 'HALF_OPEN') {
      state.successes++;
      if (state.successes >= config.successThreshold) {
        state.state = 'CLOSED';
        state.failures = 0;
        state.lastStateChange = Date.now();
      }
    } else if (state.state === 'CLOSED') {
      state.failures = 0; // Reset failures on success
    }

    await this.updateState(service, state);
  }

  async recordFailure(service: string): Promise<void> {
    const state = await this.getState(service);
    const config = this.config.get(service);

    if (!config) return;

    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN goes back to OPEN
      state.state = 'OPEN';
      state.lastStateChange = Date.now();
    } else if (state.state === 'CLOSED' && state.failures >= config.failureThreshold) {
      state.state = 'OPEN';
      state.lastStateChange = Date.now();
    }

    await this.updateState(service, state);
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const service = this.getServiceFromRequest(req);
      if (!service) {
        return next();
      }

      const canProceed = await this.canRequest(service);

      if (!canProceed) {
        // Record metrics
        this.recordFallback(service, 'circuit_open');

        // Return fallback response or error
        return res.status(503).json({
          error: 'ML_SERVICE_UNAVAILABLE',
          message: `${service} is temporarily unavailable`,
          fallback: this.getFallbackResponse(service),
        });
      }

      // Attach circuit breaker to request for later recording
      (req as any).circuitBreaker = { service };

      next();
    };
  }

  private getServiceFromRequest(req: Request): string | null {
    if (req.path.startsWith('/api/ml/')) return 'ml-scoring-service';
    if (req.path.startsWith('/api/features/')) return 'feast-feature-server';
    if (req.path.startsWith('/api/config/')) return 'config-service';
    return null;
  }

  private getFallbackResponse(service: string): any {
    switch (service) {
      case 'ml-scoring-service':
        return {
          source: 'heuristic',
          message: 'Using heuristic scoring as fallback',
        };
      case 'config-service':
        return {
          source: 'cache',
          message: 'Using cached configuration',
        };
      default:
        return null;
    }
  }

  private async recordFallback(service: string, reason: string): Promise<void> {
    await this.redis.incr(`fallback:${service}:${reason}`);
  }
}

// =============================================================================
// ML AUTH MIDDLEWARE
// =============================================================================

export class MLAuthMiddleware {
  private allowedRoles: Map<string, string[]>;

  constructor() {
    this.allowedRoles = new Map([
      ['/api/ml/score', ['ADMIN', 'DISPATCHER', 'SYSTEM']],
      ['/api/ml/batch', ['ADMIN', 'SYSTEM']],
      ['/api/ml/features', ['ADMIN', 'DISPATCHER', 'SYSTEM']],
      ['/api/config/weights', ['ADMIN']],
      ['/api/config/profiles', ['ADMIN', 'DISPATCHER']],
      ['/api/dispatcher/suggestions', ['DISPATCHER', 'ADMIN']],
      ['/api/dispatcher/simulate', ['DISPATCHER', 'ADMIN']],
    ]);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication required for ML endpoints',
        });
      }

      // Find matching route
      let allowedRoles: string[] | undefined;
      for (const [route, roles] of this.allowedRoles) {
        if (req.path.startsWith(route)) {
          allowedRoles = roles;
          break;
        }
      }

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `Role '${user.role}' not allowed for ${req.path}`,
          requiredRoles: allowedRoles,
        });
      }

      // Add tenant context
      (req as any).tenantId = user.companyId || 'default';
      (req as any).profileId = user.profileId || 'revenue_focused';

      next();
    };
  }
}

// =============================================================================
// REQUEST TRANSFORMATION
// =============================================================================

export class MLRequestTransformer {
  transformRequest(req: Request): void {
    const user = (req as any).user;

    // Add standard headers
    req.headers['x-request-id'] = uuidv4();
    req.headers['x-tenant-id'] = (req as any).tenantId || 'default';
    req.headers['x-profile-id'] = (req as any).profileId || 'revenue_focused';
    req.headers['x-timestamp'] = new Date().toISOString();

    // Add user context
    if (user) {
      req.headers['x-user-id'] = user.sub;
      req.headers['x-user-role'] = user.role;
    }
  }

  transformResponse(req: Request, res: Response, body: any): any {
    // Add response headers
    res.setHeader('X-Model-Version', body.modelVersion || 'unknown');
    res.setHeader('X-Score-Source', body.source || 'unknown');
    res.setHeader('X-Request-Id', req.headers['x-request-id'] || '');

    return body;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      this.transformRequest(req);

      // Capture original send
      const originalSend = res.send.bind(res);

      res.send = (body: any) => {
        try {
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          const transformed = this.transformResponse(req, res, parsed);
          return originalSend(JSON.stringify(transformed));
        } catch {
          return originalSend(body);
        }
      };

      next();
    };
  }
}

// =============================================================================
// ML METRICS COLLECTOR
// =============================================================================

export class MLMetricsCollector {
  private redis: Redis;
  private prefix: string;

  constructor(redis: Redis, prefix = 'cargobit_ml_gateway') {
    this.redis = redis;
    this.prefix = prefix;
  }

  async recordScoringRequest(
    source: 'ml' | 'heuristic' | 'cache',
    profile: string,
    tenant: string,
    latencyMs: number,
    score: number
  ): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);

    // Increment counters
    await Promise.all([
      this.redis.incr(`${this.prefix}:requests:${source}:${minute}`),
      this.redis.incr(`${this.prefix}:requests:profile:${profile}:${minute}`),
      this.redis.incr(`${this.prefix}:requests:tenant:${tenant}:${minute}`),
      
      // Record latency (using Redis sorted set for histogram)
      this.redis.zadd(`${this.prefix}:latency:${source}:${minute}`, latencyMs, `${uuidv4()}`),
      
      // Record score distribution
      this.redis.zadd(`${this.prefix}:score:${source}:${minute}`, Math.round(score * 100), `${uuidv4()}`),
    ]);

    // Set expiry for old data
    await this.redis.expire(`${this.prefix}:requests:${source}:${minute}`, 3600);
    await this.redis.expire(`${this.prefix}:latency:${source}:${minute}`, 3600);
    await this.redis.expire(`${this.prefix}:score:${source}:${minute}`, 3600);
  }

  async recordFallback(service: string, type: string): Promise<void> {
    await this.redis.incr(`${this.prefix}:fallback:${service}:${type}:${Date.now()}`);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on('finish', () => {
        const latencyMs = Date.now() - start;
        const body = (res as any).body;

        if (req.path.startsWith('/api/ml/') || req.path.startsWith('/api/dispatcher/')) {
          this.recordScoringRequest(
            body?.source || 'unknown',
            (req as any).profileId || 'default',
            (req as any).tenantId || 'default',
            latencyMs,
            body?.score || 0
          ).catch(console.error);
        }
      });

      next();
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export function createMLGateway(config: MLGatewayConfig) {
  const rateLimiter = new MLRateLimiter(config.redis);
  const circuitBreaker = new MLCircuitBreaker(config.redis);
  const authMiddleware = new MLAuthMiddleware();
  const requestTransformer = new MLRequestTransformer();
  const metricsCollector = new MLMetricsCollector(config.redis);

  return {
    rateLimit: rateLimiter.middleware(),
    circuitBreaker: circuitBreaker.middleware(),
    auth: authMiddleware.middleware(),
    transform: requestTransformer.middleware(),
    metrics: metricsCollector.middleware(),

    // Expose for health checks
    circuitBreakerState: circuitBreaker.getState.bind(circuitBreaker),
    
    // Expose for testing
    rateLimiter,
    circuitBreaker,
    metricsCollector,
  };
}
