/**
 * CargoBit Rate Limiting Middleware
 * 
 * Redis-based Token Bucket rate limiting for API Gateway and services.
 * Protects public endpoints from abuse and DoS attacks.
 * 
 * @module @cargobit/rate-limit
 * @version 1.0.0
 */

// =============================================================================
// RATE LIMIT TYPES
// =============================================================================

/**
 * Rate limit configuration for an endpoint.
 */
export interface RateLimitConfig {
  /** Maximum requests allowed per window */
  maxRequests: number;
  
  /** Window size in milliseconds */
  windowMs: number;
  
  /** Key prefix for Redis */
  keyPrefix: string;
  
  /** Skip rate limiting for certain conditions */
  skip?: (req: RateLimitRequest) => boolean | Promise<boolean>;
  
  /** Custom key generator */
  keyGenerator?: (req: RateLimitRequest) => string | Promise<string>;
  
  /** Handler when rate limit is exceeded */
  handler?: (req: RateLimitRequest, res: RateLimitResponse) => void | Promise<void>;
  
  /** Enable trust proxy (X-Forwarded-For header) */
  trustProxy?: boolean;
  
  /** Number of proxies to trust */
  proxyCount?: number;
}

/**
 * Simplified request interface (framework-agnostic).
 */
export interface RateLimitRequest {
  /** Client IP address */
  ip: string;
  
  /** HTTP method */
  method: string;
  
  /** Request path */
  path: string;
  
  /** Headers */
  headers: Record<string, string | undefined>;
  
  /** Authenticated user ID (if any) */
  userId?: string;
  
  /** API key (if any) */
  apiKey?: string;
  
  /** Carrier ID (if carrier request) */
  carrierId?: string;
  
  /** Shipper ID (if shipper request) */
  shipperId?: string;
}

/**
 * Simplified response interface.
 */
export interface RateLimitResponse {
  /** Set status code */
  status: (code: number) => RateLimitResponse;
  
  /** Set JSON body */
  json: (body: unknown) => void;
  
  /** Set header */
  setHeader: (name: string, value: string) => void;
}

/**
 * Rate limit result.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  
  /** Maximum requests allowed */
  limit: number;
  
  /** Remaining requests in current window */
  remaining: number;
  
  /** Unix timestamp when the window resets */
  resetTime: number;
  
  /** Seconds until retry (if blocked) */
  retryAfter?: number;
}

// =============================================================================
// DEFAULT RATE LIMITS BY ENDPOINT
// =============================================================================

/**
 * Default rate limit configurations for CargoBit endpoints.
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Order endpoints
  'POST /orders': {
    maxRequests: 60,
    windowMs: 60000, // 60/min per Shipper
    keyPrefix: 'order:create',
  },
  'GET /orders': {
    maxRequests: 200,
    windowMs: 60000, // 200/min per User
    keyPrefix: 'order:list',
  },
  
  // Bidding endpoints
  'POST /bids': {
    maxRequests: 120,
    windowMs: 60000, // 120/min per Carrier
    keyPrefix: 'bid:create',
  },
  'POST /pricing/:orderId/bid/validate': {
    maxRequests: 300,
    windowMs: 60000, // 300/min per Carrier (live feedback)
    keyPrefix: 'bid:validate',
  },
  
  // Execution endpoints
  'POST /executions/:id/status': {
    maxRequests: 60,
    windowMs: 60000, // 60/min per Carrier
    keyPrefix: 'execution:status',
  },
  'POST /executions/:id/pod': {
    maxRequests: 10,
    windowMs: 60000, // 10/min per Carrier
    keyPrefix: 'execution:pod',
  },
  
  // Global limits
  'GLOBAL': {
    maxRequests: 10000,
    windowMs: 60000, // 10000/min per IP
    keyPrefix: 'global',
  },
};

// =============================================================================
// REDIS STORE INTERFACE
// =============================================================================

/**
 * Interface for Redis store implementations.
 */
export interface IRedisStore {
  /**
   * Get a value from Redis.
   */
  get(key: string): Promise<string | null>;
  
  /**
   * Set a value with optional TTL.
   */
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  
  /**
   * Increment a value.
   */
  incr(key: string): Promise<number>;
  
  /**
   * Set TTL on a key.
   */
  expire(key: string, ttlMs: number): Promise<void>;
  
  /**
   * Get TTL of a key.
   */
  ttl(key: string): Promise<number>;
  
  /**
   * Delete a key.
   */
  del(key: string): Promise<void>;
  
  /**
   * Execute multiple commands atomically.
   */
  multi(commands: string[][]): Promise<unknown[]>;
}

// =============================================================================
// IN-MEMORY REDIS STORE (Development/Testing)
// =============================================================================

/**
 * In-memory implementation of Redis store for development.
 */
export class InMemoryRedisStore implements IRedisStore {
  private store: Map<string, { value: string; expiresAt?: number }>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.store = new Map();
    this.startCleanup();
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) {
      this.store.set(key, { value: '1' });
      return 1;
    }
    
    const newValue = parseInt(entry.value, 10) + 1;
    entry.value = newValue.toString();
    return newValue;
  }

  async expire(key: string, ttlMs: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + ttlMs;
    }
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || !entry.expiresAt) return -1;
    
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : -2;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async multi(commands: string[][]): Promise<unknown[]> {
    // Simplified multi for rate limiting
    const results: unknown[] = [];
    
    for (const cmd of commands) {
      const [command, ...args] = cmd;
      
      switch (command.toUpperCase()) {
        case 'GET':
          results.push(await this.get(args[0] as string));
          break;
        case 'SET':
          await this.set(args[0] as string, args[1] as string, args[2] as number | undefined);
          results.push('OK');
          break;
        case 'INCR':
          results.push(await this.incr(args[0] as string));
          break;
        case 'EXPIRE':
          await this.expire(args[0] as string, (args[1] as number) * 1000);
          results.push(1);
          break;
        case 'TTL':
          results.push(await this.ttl(args[0] as string));
          break;
        default:
          results.push(null);
      }
    }
    
    return results;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.store.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// =============================================================================
// TOKEN BUCKET IMPLEMENTATION
// =============================================================================

/**
 * Token Bucket rate limiter using Redis.
 * 
 * Allows burst traffic up to bucket capacity while maintaining
 * average rate over time.
 */
export class TokenBucketRateLimiter {
  private store: IRedisStore;
  private maxTokens: number;
  private refillRate: number; // Tokens per second
  private keyPrefix: string;

  constructor(
    store: IRedisStore,
    maxTokens: number,
    refillRatePerSecond: number,
    keyPrefix: string = 'ratelimit'
  ) {
    this.store = store;
    this.maxTokens = maxTokens;
    this.refillRate = refillRatePerSecond;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Check and consume a token.
   * Returns result with remaining tokens or retry-after if exhausted.
   */
  async consume(key: string): Promise<RateLimitResult> {
    const fullKey = `${this.keyPrefix}:${key}`;
    const now = Date.now();

    // Get current bucket state
    const bucketData = await this.store.get(fullKey);
    
    let tokens: number;
    let lastRefill: number;

    if (!bucketData) {
      // New bucket - start full
      tokens = this.maxTokens - 1; // Consume one token
      lastRefill = now;
      
      await this.store.set(
        fullKey,
        JSON.stringify({ tokens, lastRefill }),
        3600000 // 1 hour TTL
      );

      return {
        allowed: true,
        limit: this.maxTokens,
        remaining: tokens,
        resetTime: now + Math.ceil((this.maxTokens - tokens) / this.refillRate) * 1000,
      };
    }

    // Parse existing bucket
    const bucket = JSON.parse(bucketData);
    lastRefill = bucket.lastRefill;
    tokens = bucket.tokens;

    // Calculate refilled tokens
    const elapsedMs = now - lastRefill;
    const refilledTokens = (elapsedMs / 1000) * this.refillRate;
    tokens = Math.min(this.maxTokens, tokens + refilledTokens);

    // Check if we have tokens
    if (tokens < 1) {
      const tokensNeeded = 1 - tokens;
      const waitMs = (tokensNeeded / this.refillRate) * 1000;
      
      return {
        allowed: false,
        limit: this.maxTokens,
        remaining: 0,
        resetTime: now + Math.ceil(waitMs),
        retryAfter: Math.ceil(waitMs / 1000),
      };
    }

    // Consume token
    tokens -= 1;

    await this.store.set(
      fullKey,
      JSON.stringify({ tokens, lastRefill: now }),
      3600000
    );

    return {
      allowed: true,
      limit: this.maxTokens,
      remaining: Math.floor(tokens),
      resetTime: now + Math.ceil((this.maxTokens - tokens) / this.refillRate) * 1000,
    };
  }

  /**
   * Get current bucket state without consuming.
   */
  async peek(key: string): Promise<Omit<RateLimitResult, 'allowed' | 'retryAfter'>> {
    const fullKey = `${this.keyPrefix}:${key}`;
    const now = Date.now();

    const bucketData = await this.store.get(fullKey);
    
    if (!bucketData) {
      return {
        limit: this.maxTokens,
        remaining: this.maxTokens,
        resetTime: now,
      };
    }

    const bucket = JSON.parse(bucketData);
    const elapsedMs = now - bucket.lastRefill;
    const refilledTokens = (elapsedMs / 1000) * this.refillRate;
    const tokens = Math.min(this.maxTokens, bucket.tokens + refilledTokens);

    return {
      limit: this.maxTokens,
      remaining: Math.floor(tokens),
      resetTime: now + Math.ceil((this.maxTokens - tokens) / this.refillRate) * 1000,
    };
  }
}

// =============================================================================
// SLIDING WINDOW RATE LIMITER
// =============================================================================

/**
 * Sliding Window rate limiter using Redis.
 * More accurate than fixed window but requires more memory.
 */
export class SlidingWindowRateLimiter {
  private store: IRedisStore;
  private maxRequests: number;
  private windowMs: number;
  private keyPrefix: string;

  constructor(
    store: IRedisStore,
    maxRequests: number,
    windowMs: number,
    keyPrefix: string = 'ratelimit'
  ) {
    this.store = store;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Check and record a request.
   */
  async check(key: string): Promise<RateLimitResult> {
    const fullKey = `${this.keyPrefix}:${key}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Use Redis sorted set for sliding window
    // For simplicity, we'll use a simpler approach with keys
    
    const windowKey = `${fullKey}:${Math.floor(now / this.windowMs)}`;
    const count = await this.store.incr(windowKey);
    
    // Set TTL on first request
    if (count === 1) {
      await this.store.expire(windowKey, Math.ceil(this.windowMs / 1000) + 1);
    }

    const remaining = Math.max(0, this.maxRequests - count);
    const resetTime = Math.ceil(now / this.windowMs) * this.windowMs + this.windowMs;

    if (count > this.maxRequests) {
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
      };
    }

    return {
      allowed: true,
      limit: this.maxRequests,
      remaining,
      resetTime,
    };
  }
}

// =============================================================================
// RATE LIMIT MIDDLEWARE
// =============================================================================

/**
 * Main rate limiting middleware factory.
 * 
 * @example
 * ```typescript
 * const store = new InMemoryRedisStore();
 * const rateLimiter = createRateLimiter(store, {
 *   maxRequests: 60,
 *   windowMs: 60000,
 *   keyPrefix: 'api',
 * });
 * 
 * // In request handler
 * const result = await rateLimiter(req, res);
 * if (!result.allowed) {
 *   // Return 429 Too Many Requests
 *   res.status(429).json({ error: 'Rate limit exceeded' });
 *   return;
 * }
 * ```
 */
export function createRateLimiter(
  store: IRedisStore,
  config: RateLimitConfig
): (req: RateLimitRequest, res: RateLimitResponse) => Promise<RateLimitResult> {
  const limiter = new SlidingWindowRateLimiter(
    store,
    config.maxRequests,
    config.windowMs,
    config.keyPrefix
  );

  return async (req: RateLimitRequest, res: RateLimitResponse): Promise<RateLimitResult> => {
    // Check skip condition
    if (config.skip && await config.skip(req)) {
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
      };
    }

    // Generate key
    let key: string;
    if (config.keyGenerator) {
      key = await config.keyGenerator(req);
    } else {
      key = getDefaultKey(req, config);
    }

    // Check rate limit
    const result = await limiter.check(key);

    // Set headers
    res.setHeader('X-RateLimit-Limit', result.limit.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.floor(result.resetTime / 1000).toString());

    // Handle rate limit exceeded
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter?.toString() ?? '60');

      if (config.handler) {
        await config.handler(req, res);
      } else {
        defaultHandler(req, res, result);
      }
    }

    return result;
  };
}

/**
 * Get default key for rate limiting.
 */
function getDefaultKey(req: RateLimitRequest, config: RateLimitConfig): string {
  // Priority: Carrier ID > Shipper ID > User ID > API Key > IP
  if (req.carrierId) {
    return `carrier:${req.carrierId}`;
  }
  if (req.shipperId) {
    return `shipper:${req.shipperId}`;
  }
  if (req.userId) {
    return `user:${req.userId}`;
  }
  if (req.apiKey) {
    return `apikey:${req.apiKey}`;
  }
  
  // Fall back to IP
  let ip = req.ip;
  
  // Handle trust proxy
  if (config.trustProxy && req.headers['x-forwarded-for']) {
    const forwardedFor = req.headers['x-forwarded-for'].split(',');
    const proxyCount = config.proxyCount ?? 1;
    
    if (forwardedFor.length >= proxyCount) {
      ip = forwardedFor[forwardedFor.length - proxyCount].trim();
    }
  }
  
  return `ip:${ip}`;
}

/**
 * Default handler for rate limit exceeded.
 */
function defaultHandler(
  req: RateLimitRequest,
  res: RateLimitResponse,
  result: RateLimitResult
): void {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. Please retry after ${result.retryAfter} seconds.`,
      details: {
        limit: result.limit,
        window: '60s',
        retryAfter: result.retryAfter,
      },
    },
  });
}

// =============================================================================
// RATE LIMIT MIDDLEWARE FACTORY (Express-like)
// =============================================================================

/**
 * Create a complete rate limiting middleware with multiple configurations.
 * 
 * @example
 * ```typescript
 * const store = new RedisStore(redisClient);
 * const middleware = createRateLimitMiddleware(store, DEFAULT_RATE_LIMITS);
 * 
 * // Use in Express
 * app.use(middleware.middleware());
 * ```
 */
export function createRateLimitMiddleware(
  store: IRedisStore,
  configs: Record<string, RateLimitConfig>
) {
  const limiters: Map<string, ReturnType<typeof createRateLimiter>> = new Map();

  // Create limiters for each config
  for (const [name, config] of Object.entries(configs)) {
    limiters.set(name, createRateLimiter(store, config));
  }

  return {
    /**
     * Get the middleware function.
     */
    middleware: () => {
      return async (req: RateLimitRequest, res: RateLimitResponse, next: () => void) => {
        // Find matching config
        const routeKey = `${req.method} ${req.path}`;
        const limiter = limiters.get(routeKey) ?? limiters.get('GLOBAL');

        if (!limiter) {
          next();
          return;
        }

        const result = await limiter(req, res);

        if (result.allowed) {
          next();
        }
        // If not allowed, response already sent by handler
      };
    },

    /**
     * Get a specific limiter by name.
     */
    getLimiter(name: string): ReturnType<typeof createRateLimiter> | undefined {
      return limiters.get(name);
    },

    /**
     * Check rate limit for a specific endpoint.
     */
    async checkEndpoint(
      endpoint: string,
      req: RateLimitRequest,
      res: RateLimitResponse
    ): Promise<RateLimitResult> {
      const limiter = limiters.get(endpoint) ?? limiters.get('GLOBAL')!;
      return limiter(req, res);
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  TokenBucketRateLimiter,
  SlidingWindowRateLimiter,
  InMemoryRedisStore,
  createRateLimiter,
  createRateLimitMiddleware,
  DEFAULT_RATE_LIMITS,
};
