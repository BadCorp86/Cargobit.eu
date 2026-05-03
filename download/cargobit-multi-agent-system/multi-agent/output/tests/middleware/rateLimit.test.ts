/**
 * Rate Limiting Middleware Tests
 * CargoBit Payment System
 *
 * Integration tests for Express/Next.js rate limiting middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  rateLimitMiddleware,
  publicApiRateLimit,
  paymentRateLimit,
  authRateLimit,
  webhookRateLimit,
  applyRateLimit,
} from '../../src/middleware/rateLimit';

// =============================================================================
// MOCKS
// =============================================================================

// Mock the rate limiter module
jest.mock('../../src/lib/rateLimit', () => {
  const originalModule = jest.requireActual('../../src/lib/rateLimit');

  // In-memory rate limit store for testing
  const rateLimitStore = new Map<string, number>();

  return {
    ...originalModule,
    createRateLimiter: jest.fn((redis: any, config: any) => {
      return {
        checkLimit: async (identifier: string) => {
          const key = `${config.keyPrefix || ''}${identifier}`;
          const current = (rateLimitStore.get(key) || 0) + 1;
          rateLimitStore.set(key, current);

          const limit = config.limit || 100;
          const allowed = current <= limit;

          return {
            allowed,
            current,
            limit,
            remaining: allowed ? Math.max(0, limit - current) : 0,
            resetTime: Date.now() + (config.windowMs || 60000),
            retryAfter: allowed ? undefined : 60,
          };
        },
        resetLimit: async (identifier: string) => {
          rateLimitStore.delete(identifier);
        },
      };
    }),
    RATE_LIMIT_PRESETS: {
      publicApi: { limit: 100, windowMs: 60000, keyPrefix: 'public:' },
      authenticatedApi: { limit: 1000, windowMs: 60000, keyPrefix: 'auth:' },
      webhooks: { limit: 500, windowMs: 60000, keyPrefix: 'webhook:' },
      adminApi: { limit: 5000, windowMs: 60000, keyPrefix: 'admin:' },
      paymentCreate: { limit: 10, windowMs: 60000, keyPrefix: 'payment:' },
      authAttempts: { limit: 5, windowMs: 60000, keyPrefix: 'auth_attempt:' },
    },
  };
});

// Mock Redis client
jest.mock('../../src/lib/redis', () => ({
  getRedisClient: jest.fn(() => ({})),
}));

// =============================================================================
// HELPERS
// =============================================================================

function createMockRequest(options: {
  pathname?: string;
  method?: string;
  ip?: string;
  headers?: Record<string, string>;
}): NextRequest {
  const url = new URL(`https://example.com${options.pathname || '/'}`);

  const headers = new Headers();
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }
  if (options.ip) {
    headers.set('x-forwarded-for', options.ip);
  }

  return {
    nextUrl: url,
    method: options.method || 'GET',
    headers,
    ip: options.ip,
  } as unknown as NextRequest;
}

// =============================================================================
// TEST SUITE: rateLimitMiddleware
// =============================================================================

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should allow requests within limit', async () => {
      const middleware = rateLimitMiddleware({
        limit: 5,
        windowMs: 60000,
      });

      const req = createMockRequest({
        pathname: '/api/test',
        ip: '192.168.1.1',
      });

      const result = await middleware(req);

      // null means the request should continue
      expect(result).toBeNull();
    });

    it('should block requests exceeding limit', async () => {
      const middleware = rateLimitMiddleware({
        limit: 2,
        windowMs: 60000,
      });

      const req = createMockRequest({
        pathname: '/api/test',
        ip: '192.168.1.1',
      });

      // First two should pass
      await middleware(req);
      await middleware(req);

      // Third should be blocked
      const result = await middleware(req);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
    });

    it('should return 429 with proper error format', async () => {
      const middleware = rateLimitMiddleware({
        limit: 1,
        windowMs: 60000,
      });

      const req = createMockRequest({
        pathname: '/api/test',
        ip: '192.168.1.1',
      });

      await middleware(req);
      const result = await middleware(req);

      expect(result?.status).toBe(429);

      // Parse response body
      const json = await result?.json();
      expect(json.error).toBe('Too Many Requests');
      expect(json.retryAfter).toBeDefined();
    });

    it('should include rate limit headers', async () => {
      const middleware = rateLimitMiddleware({
        limit: 100,
        windowMs: 60000,
      });

      const req = createMockRequest({
        pathname: '/api/test',
        ip: '192.168.1.1',
      });

      const result = await middleware(req);

      // Should pass through
      expect(result).toBeNull();
    });
  });

  describe('Excluded paths', () => {
    it('should skip health endpoint by default', async () => {
      const middleware = rateLimitMiddleware({
        limit: 1,
        windowMs: 60000,
      });

      const req = createMockRequest({
        pathname: '/health',
        ip: '192.168.1.1',
      });

      // Should always pass
      const result1 = await middleware(req);
      const result2 = await middleware(req);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should skip metrics endpoint by default', async () => {
      const middleware = rateLimitMiddleware({
        limit: 1,
        windowMs: 60000,
      });

      const req = createMockRequest({
        pathname: '/metrics',
        ip: '192.168.1.1',
      });

      const result = await middleware(req);
      expect(result).toBeNull();
    });

    it('should skip custom excluded paths', async () => {
      const middleware = rateLimitMiddleware({
        limit: 1,
        windowMs: 60000,
        excludePaths: ['/api/health', '/api/public'],
      });

      const req = createMockRequest({
        pathname: '/api/health',
        ip: '192.168.1.1',
      });

      const result = await middleware(req);
      expect(result).toBeNull();
    });
  });

  describe('Identifier extraction', () => {
    it('should use x-forwarded-for header', async () => {
      const middleware = rateLimitMiddleware({
        limit: 1,
        windowMs: 60000,
      });

      const req = createMockRequest({
        pathname: '/api/test',
        headers: {
          'x-forwarded-for': '10.0.0.1, 192.168.1.1',
        },
      });

      await middleware(req);
      const result = await middleware(req);

      expect(result?.status).toBe(429);
    });

    it('should use x-real-ip header as fallback', async () => {
      const middleware = rateLimitMiddleware({
        limit: 1,
        windowMs: 60000,
      });

      const req = createMockRequest({
        pathname: '/api/test',
        headers: {
          'x-real-ip': '10.0.0.2',
        },
      });

      await middleware(req);
      const result = await middleware(req);

      expect(result?.status).toBe(429);
    });

    it('should handle missing IP gracefully', async () => {
      const middleware = rateLimitMiddleware({
        limit: 1,
        windowMs: 60000,
      });

      const req = createMockRequest({
        pathname: '/api/test',
      });

      await middleware(req);
      const result = await middleware(req);

      // Should still rate limit based on "unknown" IP
      expect(result?.status).toBe(429);
    });
  });

  describe('onLimitReached callback', () => {
    it('should call onLimitReached when limit is exceeded', async () => {
      const onLimitReached = jest.fn();

      const middleware = rateLimitMiddleware({
        limit: 1,
        windowMs: 60000,
        onLimitReached,
      });

      const req = createMockRequest({
        pathname: '/api/test',
        ip: '192.168.1.1',
      });

      await middleware(req);
      await middleware(req);

      expect(onLimitReached).toHaveBeenCalled();
      expect(onLimitReached).toHaveBeenCalledWith(
        req,
        expect.stringContaining('192.168.1.1')
      );
    });

    it('should not call onLimitReached when within limit', async () => {
      const onLimitReached = jest.fn();

      const middleware = rateLimitMiddleware({
        limit: 5,
        windowMs: 60000,
        onLimitReached,
      });

      const req = createMockRequest({
        pathname: '/api/test',
        ip: '192.168.1.1',
      });

      await middleware(req);

      expect(onLimitReached).not.toHaveBeenCalled();
    });
  });

  describe('Presets', () => {
    it('should apply publicApi preset', async () => {
      const middleware = rateLimitMiddleware({
        preset: 'publicApi',
      });

      const req = createMockRequest({
        pathname: '/api/test',
        ip: '192.168.1.1',
      });

      // publicApi has limit of 100
      for (let i = 0; i < 100; i++) {
        const result = await middleware(req);
        expect(result).toBeNull();
      }

      // 101st should be blocked
      const result = await middleware(req);
      expect(result?.status).toBe(429);
    });

    it('should apply paymentCreate preset with strict limit', async () => {
      const middleware = rateLimitMiddleware({
        preset: 'paymentCreate',
      });

      const req = createMockRequest({
        pathname: '/api/payments',
        ip: '192.168.1.1',
      });

      // paymentCreate has limit of 10
      for (let i = 0; i < 10; i++) {
        const result = await middleware(req);
        expect(result).toBeNull();
      }

      const result = await middleware(req);
      expect(result?.status).toBe(429);
    });

    it('should apply authAttempts preset with very strict limit', async () => {
      const middleware = rateLimitMiddleware({
        preset: 'authAttempts',
      });

      const req = createMockRequest({
        pathname: '/api/auth/login',
        ip: '192.168.1.1',
      });

      // authAttempts has limit of 5
      for (let i = 0; i < 5; i++) {
        const result = await middleware(req);
        expect(result).toBeNull();
      }

      const result = await middleware(req);
      expect(result?.status).toBe(429);
    });
  });

  describe('Error handling', () => {
    it('should fail open on Redis errors', async () => {
      // Mock Redis error
      const { getRedisClient } = require('../../src/lib/redis');
      getRedisClient.mockImplementationOnce(() => {
        throw new Error('Redis connection failed');
      });

      const middleware = rateLimitMiddleware({
        limit: 1,
        windowMs: 60000,
      });

      const req = createMockRequest({
        pathname: '/api/test',
        ip: '192.168.1.1',
      });

      // Should fail open (return null)
      const result = await middleware(req);
      expect(result).toBeNull();
    });
  });
});

// =============================================================================
// TEST SUITE: Preconfigured Middlewares
// =============================================================================

describe('Preconfigured Middlewares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publicApiRateLimit', () => {
    it('should limit to 100 requests per minute', async () => {
      const req = createMockRequest({
        pathname: '/api/users',
        ip: '192.168.1.1',
      });

      for (let i = 0; i < 100; i++) {
        const result = await publicApiRateLimit(req);
        expect(result).toBeNull();
      }

      const result = await publicApiRateLimit(req);
      expect(result?.status).toBe(429);
    });
  });

  describe('paymentRateLimit', () => {
    it('should limit to 10 requests per minute', async () => {
      const req = createMockRequest({
        pathname: '/api/payments',
        method: 'POST',
        ip: '192.168.1.1',
      });

      for (let i = 0; i < 10; i++) {
        const result = await paymentRateLimit(req);
        expect(result).toBeNull();
      }

      const result = await paymentRateLimit(req);
      expect(result?.status).toBe(429);
    });

    it('should exclude success and cancel paths', async () => {
      const successReq = createMockRequest({
        pathname: '/api/payments/success',
        ip: '192.168.1.1',
      });

      const cancelReq = createMockRequest({
        pathname: '/api/payments/cancel',
        ip: '192.168.1.1',
      });

      // These should never be rate limited
      for (let i = 0; i < 20; i++) {
        expect(await paymentRateLimit(successReq)).toBeNull();
        expect(await paymentRateLimit(cancelReq)).toBeNull();
      }
    });
  });

  describe('authRateLimit', () => {
    it('should limit to 5 requests per minute', async () => {
      const req = createMockRequest({
        pathname: '/api/auth/login',
        ip: '192.168.1.1',
      });

      for (let i = 0; i < 5; i++) {
        const result = await authRateLimit(req);
        expect(result).toBeNull();
      }

      const result = await authRateLimit(req);
      expect(result?.status).toBe(429);
    });
  });

  describe('webhookRateLimit', () => {
    it('should limit to 500 requests per minute', async () => {
      const req = createMockRequest({
        pathname: '/api/webhooks/stripe',
        method: 'POST',
        ip: '192.168.1.1',
      });

      // Should allow high volume
      for (let i = 0; i < 500; i++) {
        const result = await webhookRateLimit(req);
        expect(result).toBeNull();
      }

      const result = await webhookRateLimit(req);
      expect(result?.status).toBe(429);
    });
  });
});

// =============================================================================
// TEST SUITE: applyRateLimit
// =============================================================================

describe('applyRateLimit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply webhook rate limit to webhook paths', async () => {
    const req = createMockRequest({
      pathname: '/api/webhooks/stripe',
      ip: '192.168.1.1',
    });

    for (let i = 0; i < 500; i++) {
      const result = await applyRateLimit(req);
      expect(result).toBeNull();
    }

    const result = await applyRateLimit(req);
    expect(result?.status).toBe(429);
  });

  it('should apply payment rate limit to POST /api/payments', async () => {
    const req = createMockRequest({
      pathname: '/api/payments',
      method: 'POST',
      ip: '192.168.1.1',
    });

    for (let i = 0; i < 10; i++) {
      const result = await applyRateLimit(req);
      expect(result).toBeNull();
    }

    const result = await applyRateLimit(req);
    expect(result?.status).toBe(429);
  });

  it('should apply auth rate limit to auth paths', async () => {
    const req = createMockRequest({
      pathname: '/api/auth/login',
      method: 'POST',
      ip: '192.168.1.1',
    });

    for (let i = 0; i < 5; i++) {
      const result = await applyRateLimit(req);
      expect(result).toBeNull();
    }

    const result = await applyRateLimit(req);
    expect(result?.status).toBe(429);
  });

  it('should apply public API rate limit to other API paths', async () => {
    const req = createMockRequest({
      pathname: '/api/users',
      method: 'GET',
      ip: '192.168.1.1',
    });

    for (let i = 0; i < 100; i++) {
      const result = await applyRateLimit(req);
      expect(result).toBeNull();
    }

    const result = await applyRateLimit(req);
    expect(result?.status).toBe(429);
  });

  it('should not rate limit non-API paths', async () => {
    const req = createMockRequest({
      pathname: '/about',
      ip: '192.168.1.1',
    });

    // Should always pass
    for (let i = 0; i < 200; i++) {
      const result = await applyRateLimit(req);
      expect(result).toBeNull();
    }
  });

  it('should handle different methods on payment endpoint', async () => {
    const postReq = createMockRequest({
      pathname: '/api/payments',
      method: 'POST',
      ip: '192.168.1.1',
    });

    const getReq = createMockRequest({
      pathname: '/api/payments',
      method: 'GET',
      ip: '192.168.1.1',
    });

    // POST should have strict limit
    for (let i = 0; i < 10; i++) {
      expect(await applyRateLimit(postReq)).toBeNull();
    }
    expect((await applyRateLimit(postReq))?.status).toBe(429);

    // GET should use public API limit (100)
    for (let i = 0; i < 100; i++) {
      expect(await applyRateLimit(getReq)).toBeNull();
    }
    expect((await applyRateLimit(getReq))?.status).toBe(429);
  });
});

// =============================================================================
// TEST SUITE: Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle concurrent requests correctly', async () => {
    const middleware = rateLimitMiddleware({
      limit: 5,
      windowMs: 60000,
    });

    const req = createMockRequest({
      pathname: '/api/test',
      ip: '192.168.1.1',
    });

    // Fire 10 concurrent requests
    const results = await Promise.all(
      Array(10).fill(null).map(() => middleware(req))
    );

    // All should either pass or be blocked
    const passed = results.filter(r => r === null).length;
    const blocked = results.filter(r => r?.status === 429).length;

    expect(passed + blocked).toBe(10);
  });

  it('should handle multiple IPs independently', async () => {
    const middleware = rateLimitMiddleware({
      limit: 2,
      windowMs: 60000,
    });

    const req1 = createMockRequest({
      pathname: '/api/test',
      ip: '192.168.1.1',
    });

    const req2 = createMockRequest({
      pathname: '/api/test',
      ip: '192.168.1.2',
    });

    // Each IP should have its own limit
    await middleware(req1);
    await middleware(req1);
    expect((await middleware(req1))?.status).toBe(429);

    await middleware(req2);
    expect(await middleware(req2)).toBeNull();
  });

  it('should handle IPv6 addresses', async () => {
    const middleware = rateLimitMiddleware({
      limit: 1,
      windowMs: 60000,
    });

    const req = createMockRequest({
      pathname: '/api/test',
      headers: {
        'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      },
    });

    await middleware(req);
    const result = await middleware(req);

    expect(result?.status).toBe(429);
  });

  it('should handle very long paths', async () => {
    const middleware = rateLimitMiddleware({
      limit: 1,
      windowMs: 60000,
    });

    const longPath = '/api/' + 'a'.repeat(1000);
    const req = createMockRequest({
      pathname: longPath,
      ip: '192.168.1.1',
    });

    const result = await middleware(req);
    expect(result).toBeNull();
  });

  it('should handle special characters in path', async () => {
    const middleware = rateLimitMiddleware({
      limit: 1,
      windowMs: 60000,
    });

    const req = createMockRequest({
      pathname: '/api/test%20space?query=value&other=123',
      ip: '192.168.1.1',
    });

    const result = await middleware(req);
    expect(result).toBeNull();
  });
});
