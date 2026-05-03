/**
 * Rate Limiting Library Tests
 * CargoBit Payment System
 *
 * Comprehensive unit tests for RedisRateLimitStore and RateLimiter classes.
 * Uses ioredis-mock for isolated testing without real Redis instance.
 */

import { Redis } from 'ioredis';
import {
  RedisRateLimitStore,
  RateLimiter,
  createRateLimiter,
  RATE_LIMIT_PRESETS,
  extractClientIp,
  createRateLimitKey,
  RateLimitConfig,
  RateLimitResult,
} from '../src/lib/rateLimit';

// =============================================================================
// MOCKS
// =============================================================================

// Mock Redis with in-memory store
class MockRedis {
  private store: Map<string, { score: number; value: string }[]> = new Map();
  private ttls: Map<string, number> = new Map();

  async eval(script: string, numKeys: number, ...args: (string | Buffer)[]): Promise<[number, number]> {
    const key = String(args[0]);
    const now = parseInt(String(args[1]));
    const windowStart = parseInt(String(args[2]));
    const windowMs = parseInt(String(args[3]));

    // Get or create sorted set
    if (!this.store.has(key)) {
      this.store.set(key, []);
    }

    const entries = this.store.get(key)!;

    // Remove expired entries (ZREMRANGEBYSCORE)
    const filtered = entries.filter(e => e.score > windowStart);
    this.store.set(key, filtered);

    // Count current entries (ZCARD)
    const current = filtered.length;

    // Add current request (ZADD)
    const newValue = `${now}-${Math.random()}`;
    filtered.push({ score: now, value: newValue });
    this.store.set(key, filtered);

    // Set expiry (PEXPIRE)
    this.ttls.set(key, windowMs);

    // Return [count, ttl]
    return [current + 1, windowMs];
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    this.ttls.delete(key);
    return existed ? 1 : 0;
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const entries = this.store.get(key) || [];
    return entries.slice(start, stop === -1 ? undefined : stop + 1).map(e => e.value);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    const entries = this.store.get(key) || [];
    const before = entries.length;
    const filtered = entries.filter(e => !members.includes(e.value));
    this.store.set(key, filtered);
    return before - filtered.length;
  }

  // For testing
  getStore(): Map<string, { score: number; value: string }[]> {
    return this.store;
  }

  reset(): void {
    this.store.clear();
    this.ttls.clear();
  }
}

// =============================================================================
// TEST SUITE: RedisRateLimitStore
// =============================================================================

describe('RedisRateLimitStore', () => {
  let redis: MockRedis;
  let store: RedisRateLimitStore;
  const windowMs = 60000; // 1 minute

  beforeEach(() => {
    redis = new MockRedis();
    store = new RedisRateLimitStore(redis as unknown as Redis, windowMs, 'test:');
  });

  afterEach(() => {
    redis.reset();
  });

  describe('increment()', () => {
    it('should return current count of 1 on first increment', async () => {
      const result = await store.increment('user:123');

      expect(result.current).toBe(1);
      expect(result.ttl).toBeGreaterThan(0);
    });

    it('should increment count on subsequent calls', async () => {
      await store.increment('user:123');
      const result = await store.increment('user:123');

      expect(result.current).toBe(2);
    });

    it('should use different keys for different identifiers', async () => {
      const result1 = await store.increment('user:123');
      const result2 = await store.increment('user:456');

      expect(result1.current).toBe(1);
      expect(result2.current).toBe(1);
    });

    it('should apply key prefix correctly', async () => {
      await store.increment('user:123');

      // Verify the key is prefixed
      const storeMap = redis.getStore();
      expect(storeMap.has('test:user:123')).toBe(true);
    });

    it('should return TTL in seconds', async () => {
      const result = await store.increment('user:123');

      // TTL should be windowMs / 1000 (rounded up)
      expect(result.ttl).toBe(Math.ceil(windowMs / 1000));
    });
  });

  describe('reset()', () => {
    it('should clear all entries for a key', async () => {
      await store.increment('user:123');
      await store.increment('user:123');
      await store.reset('user:123');

      const result = await store.increment('user:123');
      expect(result.current).toBe(1);
    });

    it('should not affect other keys', async () => {
      await store.increment('user:123');
      await store.increment('user:456');
      await store.reset('user:123');

      const result = await store.increment('user:456');
      expect(result.current).toBe(2);
    });
  });

  describe('decrement()', () => {
    it('should remove oldest entry', async () => {
      await store.increment('user:123');
      await store.increment('user:123');
      await store.decrement('user:123');

      const result = await store.increment('user:123');
      expect(result.current).toBe(2);
    });
  });
});

// =============================================================================
// TEST SUITE: RateLimiter
// =============================================================================

describe('RateLimiter', () => {
  let redis: MockRedis;
  let store: RedisRateLimitStore;
  let limiter: RateLimiter;
  const config: RateLimitConfig = {
    limit: 5,
    windowMs: 60000,
    keyPrefix: 'limit:',
  };

  beforeEach(() => {
    redis = new MockRedis();
    store = new RedisRateLimitStore(redis as unknown as Redis, config.windowMs, config.keyPrefix);
    limiter = new RateLimiter(store, config);
  });

  afterEach(() => {
    redis.reset();
  });

  describe('checkLimit()', () => {
    it('should allow requests within limit', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await limiter.checkLimit('user:123');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests exceeding limit', async () => {
      // Use all 5 requests
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit('user:123');
      }

      // 6th request should be blocked
      const result = await limiter.checkLimit('user:123');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should return correct metadata', async () => {
      const result = await limiter.checkLimit('user:123');

      expect(result.current).toBe(1);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should return retryAfter when blocked', async () => {
      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit('user:123');
      }

      const result = await limiter.checkLimit('user:123');
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should not return retryAfter when allowed', async () => {
      const result = await limiter.checkLimit('user:123');
      expect(result.retryAfter).toBeUndefined();
    });
  });

  describe('resetLimit()', () => {
    it('should reset the rate limit', async () => {
      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit('user:123');
      }

      // Reset
      await limiter.resetLimit('user:123');

      // Should be allowed again
      const result = await limiter.checkLimit('user:123');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
    });
  });
});

// =============================================================================
// TEST SUITE: Factory Functions
// =============================================================================

describe('createRateLimiter()', () => {
  let redis: MockRedis;

  beforeEach(() => {
    redis = new MockRedis();
  });

  afterEach(() => {
    redis.reset();
  });

  it('should create limiter with preset name', async () => {
    const limiter = createRateLimiter(redis as unknown as Redis, 'publicApi');
    const result = await limiter.checkLimit('user:123');

    expect(result.limit).toBe(RATE_LIMIT_PRESETS.publicApi.limit);
  });

  it('should create limiter with custom config', async () => {
    const customConfig: RateLimitConfig = {
      limit: 42,
      windowMs: 30000,
      keyPrefix: 'custom:',
    };

    const limiter = createRateLimiter(redis as unknown as Redis, customConfig);
    const result = await limiter.checkLimit('user:123');

    expect(result.limit).toBe(42);
  });
});

// =============================================================================
// TEST SUITE: Presets
// =============================================================================

describe('RATE_LIMIT_PRESETS', () => {
  it('should have publicApi preset', () => {
    expect(RATE_LIMIT_PRESETS.publicApi).toEqual({
      limit: 100,
      windowMs: 60000,
      keyPrefix: 'public:',
    });
  });

  it('should have authenticatedApi preset', () => {
    expect(RATE_LIMIT_PRESETS.authenticatedApi.limit).toBe(1000);
  });

  it('should have webhooks preset', () => {
    expect(RATE_LIMIT_PRESETS.webhooks.limit).toBe(500);
  });

  it('should have adminApi preset', () => {
    expect(RATE_LIMIT_PRESETS.adminApi.limit).toBe(5000);
  });

  it('should have paymentCreate preset with low limit', () => {
    expect(RATE_LIMIT_PRESETS.paymentCreate.limit).toBe(10);
  });

  it('should have authAttempts preset with very low limit', () => {
    expect(RATE_LIMIT_PRESETS.authAttempts.limit).toBe(5);
  });
});

// =============================================================================
// TEST SUITE: Utilities
// =============================================================================

describe('extractClientIp()', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const req = {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
    };

    const ip = extractClientIp(req as any);
    expect(ip).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header', () => {
    const req = {
      headers: {
        'x-real-ip': '192.168.1.2',
      },
    };

    const ip = extractClientIp(req as any);
    expect(ip).toBe('192.168.1.2');
  });

  it('should use direct IP if no headers', () => {
    const req = {
      ip: '192.168.1.3',
      headers: {},
    };

    const ip = extractClientIp(req as any);
    expect(ip).toBe('192.168.1.3');
  });

  it('should return "unknown" if no IP available', () => {
    const req = {
      headers: {},
    };

    const ip = extractClientIp(req as any);
    expect(ip).toBe('unknown');
  });

  it('should prioritize x-forwarded-for over x-real-ip', () => {
    const req = {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
      },
    };

    const ip = extractClientIp(req as any);
    expect(ip).toBe('192.168.1.1');
  });
});

describe('createRateLimitKey()', () => {
  it('should join parts with colon', () => {
    const key = createRateLimitKey('user', '123', 'action');
    expect(key).toBe('user:123:action');
  });

  it('should filter undefined values', () => {
    const key = createRateLimitKey('user', undefined, '123');
    expect(key).toBe('user:123');
  });

  it('should filter null values', () => {
    const key = createRateLimitKey('user', null as any, '123');
    expect(key).toBe('user:123');
  });

  it('should handle numbers', () => {
    const key = createRateLimitKey('user', 456);
    expect(key).toBe('user:456');
  });

  it('should sanitize special characters', () => {
    const key = createRateLimitKey('user', 'test@example.com', 'action');
    expect(key).toBe('user:testexamplecom:action');
  });

  it('should preserve allowed characters (colon, underscore, hyphen)', () => {
    const key = createRateLimitKey('user_123', 'action-test');
    expect(key).toBe('user_123:action-test');
  });

  it('should return empty string for no valid parts', () => {
    const key = createRateLimitKey();
    expect(key).toBe('');
  });
});

// =============================================================================
// TEST SUITE: Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  let redis: MockRedis;
  let store: RedisRateLimitStore;
  let limiter: RateLimiter;

  beforeEach(() => {
    redis = new MockRedis();
    store = new RedisRateLimitStore(redis as unknown as Redis, 60000, 'edge:');
    limiter = new RateLimiter(store, { limit: 3, windowMs: 60000 });
  });

  afterEach(() => {
    redis.reset();
  });

  it('should handle concurrent increments', async () => {
    const promises = Array(10).fill(null).map(() =>
      limiter.checkLimit('concurrent-user')
    );

    const results = await Promise.all(promises);

    // First 3 should be allowed, rest blocked
    const allowed = results.filter(r => r.allowed).length;
    expect(allowed).toBe(3);
  });

  it('should handle empty identifier', async () => {
    const result = await limiter.checkLimit('');
    expect(result.allowed).toBe(true);
  });

  it('should handle very long identifiers', async () => {
    const longId = 'a'.repeat(1000);
    const result = await limiter.checkLimit(longId);
    expect(result.allowed).toBe(true);
  });

  it('should handle unicode identifiers', async () => {
    const result = await limiter.checkLimit('用户:测试');
    expect(result.allowed).toBe(true);
  });
});

// =============================================================================
// TEST SUITE: Integration Scenarios
// =============================================================================

describe('Integration Scenarios', () => {
  let redis: MockRedis;

  beforeEach(() => {
    redis = new MockRedis();
  });

  afterEach(() => {
    redis.reset();
  });

  it('should simulate realistic API rate limiting', async () => {
    const limiter = createRateLimiter(redis as unknown as Redis, 'publicApi');

    // Simulate 100 requests (should all pass)
    for (let i = 0; i < 100; i++) {
      const result = await limiter.checkLimit('api-user');
      expect(result.allowed).toBe(true);
    }

    // 101st request should be blocked
    const blocked = await limiter.checkLimit('api-user');
    expect(blocked.allowed).toBe(false);
  });

  it('should simulate payment rate limiting with strict limit', async () => {
    const limiter = createRateLimiter(redis as unknown as Redis, 'paymentCreate');

    // Simulate 10 payment attempts
    for (let i = 0; i < 10; i++) {
      const result = await limiter.checkLimit('payment-user');
      expect(result.allowed).toBe(true);
    }

    // 11th should be blocked
    const blocked = await limiter.checkLimit('payment-user');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeDefined();
  });

  it('should simulate auth brute-force protection', async () => {
    const limiter = createRateLimiter(redis as unknown as Redis, 'authAttempts');

    // Simulate 5 failed auth attempts
    for (let i = 0; i < 5; i++) {
      const result = await limiter.checkLimit('auth-attempter');
      expect(result.allowed).toBe(true);
    }

    // 6th should be blocked
    const blocked = await limiter.checkLimit('auth-attempter');
    expect(blocked.allowed).toBe(false);
  });

  it('should handle multiple users independently', async () => {
    const limiter = createRateLimiter(redis as unknown as Redis, 'publicApi');

    // User 1 uses 50 requests
    for (let i = 0; i < 50; i++) {
      await limiter.checkLimit('user-1');
    }

    // User 2 should still have full limit
    const result = await limiter.checkLimit('user-2');
    expect(result.remaining).toBe(99); // 100 - 1

    // User 1 should have 50 remaining
    const result1 = await limiter.checkLimit('user-1');
    expect(result1.remaining).toBe(49); // 100 - 50 - 1
  });
});
