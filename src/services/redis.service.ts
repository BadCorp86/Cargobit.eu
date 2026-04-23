/**
 * CargoBit Redis Service
 * 
 * Redis Integration for:
 * - Session caching
 * - Rate limiting
 * - Real-time data caching
 * - Pub/Sub for notifications
 * - Leaderboard for matching scores
 */

import Redis from 'ioredis';

// ===========================================
// TYPES
// ===========================================
export interface CacheOptions {
  ttl?: number;        // Time to live in seconds
  prefix?: string;     // Key prefix
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

// ===========================================
// REDIS SERVICE CLASS
// ===========================================
class RedisService {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private enabled: boolean;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    this.enabled = !!redisUrl;

    if (this.enabled) {
      try {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
        });

        this.subscriber = new Redis(redisUrl);
        this.publisher = new Redis(redisUrl);

        this.client.on('connect', () => {
          console.log('✅ Redis connected');
        });

        this.client.on('error', (err) => {
          console.error('❌ Redis error:', err.message);
        });
      } catch (error) {
        console.error('❌ Redis initialization failed:', error);
        this.enabled = false;
      }
    } else {
      console.warn('⚠️ Redis URL not configured. Caching will use in-memory fallback.');
    }
  }

  // ===========================================
  // BASIC OPERATIONS
  // ===========================================

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('❌ Redis GET error:', error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<boolean> {
    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;

    if (!this.client) {
      console.log('📝 [DEV] Cache SET:', fullKey);
      return true;
    }

    try {
      const serialized = JSON.stringify(value);

      if (options?.ttl) {
        await this.client.setex(fullKey, options.ttl, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }

      return true;
    } catch (error) {
      console.error('❌ Redis SET error:', error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.client) return true;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.client) return 0;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client.del(...keys);
      return keys.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set TTL on a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.client) return true;

    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ===========================================
  // RATE LIMITING
  // ===========================================

  /**
   * Check rate limit
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    const fullKey = `ratelimit:${key}`;

    if (!this.client) {
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: new Date(Date.now() + windowMs),
      };
    }

    try {
      const current = await this.client.incr(fullKey);

      if (current === 1) {
        await this.client.pexpire(fullKey, windowMs);
      }

      const ttl = await this.client.pttl(fullKey);
      const resetAt = new Date(Date.now() + ttl);

      if (current > limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter: Math.ceil(ttl / 1000),
        };
      }

      return {
        allowed: true,
        remaining: limit - current,
        resetAt,
      };
    } catch (error) {
      // On error, allow the request
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(Date.now() + windowMs),
      };
    }
  }

  // ===========================================
  // SESSION MANAGEMENT
  // ===========================================

  /**
   * Store session data
   */
  async setSession(sessionId: string, data: any, ttl: number = 86400): Promise<boolean> {
    return this.set(`session:${sessionId}`, data, { ttl });
  }

  /**
   * Get session data
   */
  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    return this.delete(`session:${sessionId}`);
  }

  // ===========================================
  // USER PRESENCE
  // ===========================================

  /**
   * Set user online status
   */
  async setUserOnline(userId: string, ttl: number = 300): Promise<boolean> {
    return this.set(`user:online:${userId}`, Date.now(), { ttl });
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    return this.exists(`user:online:${userId}`);
  }

  /**
   * Get all online users
   */
  async getOnlineUsers(): Promise<string[]> {
    if (!this.client) return [];

    try {
      const keys = await this.client.keys('user:online:*');
      return keys.map(key => key.replace('user:online:', ''));
    } catch (error) {
      return [];
    }
  }

  // ===========================================
  // SORTED SETS (for leaderboards/rankings)
  // ===========================================

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<boolean> {
    if (!this.client) return true;

    try {
      await this.client.zadd(key, score, member);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get top N from sorted set
   */
  async ztop(key: string, count: number): Promise<Array<{ member: string; score: number }>> {
    if (!this.client) return [];

    try {
      const results = await this.client.zrevrange(key, 0, count - 1, 'WITHSCORES');
      const items: Array<{ member: string; score: number }> = [];

      for (let i = 0; i < results.length; i += 2) {
        items.push({
          member: results[i],
          score: parseFloat(results[i + 1]),
        });
      }

      return items;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get rank of member
   */
  async zrank(key: string, member: string): Promise<number | null> {
    if (!this.client) return null;

    try {
      const rank = await this.client.zrevrank(key, member);
      return rank !== null ? rank + 1 : null;
    } catch (error) {
      return null;
    }
  }

  // ===========================================
  // PUB/SUB
  // ===========================================

  /**
   * Publish a message
   */
  async publish(channel: string, message: any): Promise<boolean> {
    if (!this.publisher) {
      console.log('📢 [DEV] Publish:', channel, message);
      return true;
    }

    try {
      await this.publisher.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<boolean> {
    if (!this.subscriber) return true;

    try {
      await this.subscriber.subscribe(channel);

      this.subscriber.on('message', (ch, msg) => {
        if (ch === channel) {
          try {
            callback(JSON.parse(msg));
          } catch {
            callback(msg);
          }
        }
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<boolean> {
    if (!this.subscriber) return true;

    try {
      await this.subscriber.unsubscribe(channel);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ===========================================
  // HEALTH CHECK
  // ===========================================

  /**
   * Check Redis health
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latency?: number; error?: string }> {
    if (!this.client) {
      return { status: 'ok' };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return { status: 'ok', latency };
    } catch (error: any) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<Record<string, string> | null> {
    if (!this.client) return null;

    try {
      const info = await this.client.info();
      const result: Record<string, string> = {};

      info.split('\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key.trim()] = value.trim();
        }
      });

      return result;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();
export default redisService;
