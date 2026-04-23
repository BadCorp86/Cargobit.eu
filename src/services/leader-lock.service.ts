// ============================================
// CARGOBIT LEADER LOCK SERVICE
// Multi-Instance Coordination for Cron Jobs
// ============================================

import { db } from '@/lib/db';

// ============================================
// INTERFACES
// ============================================

interface LockOptions {
  key: string;
  ttlSeconds?: number;
  hostname?: string;
}

interface LockResult {
  acquired: boolean;
  lockId?: string;
  expiresAt?: Date;
}

// ============================================
// LEADER LOCK SERVICE
// ============================================

/**
 * Leader Lock Service for distributed systems
 * 
 * Uses database-based locking for single-instance deployments.
 * For Redis-based locking in production, use RedLock or similar.
 * 
 * Usage:
 * ```typescript
 * const lock = new LeaderLockService();
 * const result = await lock.acquire('payouts:scheduler:lock', 300);
 * if (result.acquired) {
 *   try {
 *     // Do work
 *   } finally {
 *     await lock.release('payouts:scheduler:lock');
 *   }
 * }
 * ```
 */
export class LeaderLockService {
  private static instance: LeaderLockService;
  private locks: Map<string, string> = new Map();
  private hostname: string;

  private constructor() {
    this.hostname = process.env.HOSTNAME || 
                    process.env.VERCEL_URL || 
                    `node_${process.pid}`;
  }

  static getInstance(): LeaderLockService {
    if (!LeaderLockService.instance) {
      LeaderLockService.instance = new LeaderLockService();
    }
    return LeaderLockService.instance;
  }

  /**
   * Try to acquire a named lock
   */
  async acquire(key: string, ttlSeconds: number = 300): Promise<LockResult> {
    const lockId = `${this.hostname}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    try {
      // Use SystemSetting table as a lock store
      // In production, use Redis SET NX EX
      const existing = await db.systemSetting.findUnique({
        where: { key: `lock:${key}` },
      });

      if (existing) {
        const lockData = JSON.parse(existing.value);
        
        // Check if lock is expired
        if (new Date(lockData.expiresAt) > new Date()) {
          return { acquired: false };
        }

        // Lock expired, we can take over
        await db.systemSetting.update({
          where: { key: `lock:${key}` },
          data: {
            value: JSON.stringify({
              lockId,
              hostname: this.hostname,
              acquiredAt: new Date().toISOString(),
              expiresAt: expiresAt.toISOString(),
            }),
          },
        });
      } else {
        // No existing lock, create one
        await db.systemSetting.create({
          data: {
            key: `lock:${key}`,
            value: JSON.stringify({
              lockId,
              hostname: this.hostname,
              acquiredAt: new Date().toISOString(),
              expiresAt: expiresAt.toISOString(),
            }),
          },
        });
      }

      // Track locally
      this.locks.set(key, lockId);

      return {
        acquired: true,
        lockId,
        expiresAt,
      };

    } catch (error) {
      console.error(`[LeaderLock] Failed to acquire lock ${key}:`, error);
      return { acquired: false };
    }
  }

  /**
   * Release a lock
   */
  async release(key: string): Promise<boolean> {
    try {
      const existing = await db.systemSetting.findUnique({
        where: { key: `lock:${key}` },
      });

      if (!existing) {
        return true;
      }

      const lockData = JSON.parse(existing.value);

      // Only release if we own the lock
      if (lockData.hostname === this.hostname) {
        await db.systemSetting.delete({
          where: { key: `lock:${key}` },
        });
        this.locks.delete(key);
        return true;
      }

      return false;

    } catch (error) {
      console.error(`[LeaderLock] Failed to release lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Extend a lock's TTL
   */
  async extend(key: string, ttlSeconds: number = 300): Promise<boolean> {
    try {
      const existing = await db.systemSetting.findUnique({
        where: { key: `lock:${key}` },
      });

      if (!existing) {
        return false;
      }

      const lockData = JSON.parse(existing.value);

      // Only extend if we own the lock
      if (lockData.hostname !== this.hostname) {
        return false;
      }

      const newExpiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await db.systemSetting.update({
        where: { key: `lock:${key}` },
        data: {
          value: JSON.stringify({
            ...lockData,
            expiresAt: newExpiresAt.toISOString(),
          }),
        },
      });

      return true;

    } catch (error) {
      console.error(`[LeaderLock] Failed to extend lock ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a lock is currently held
   */
  async isHeld(key: string): Promise<boolean> {
    try {
      const existing = await db.systemSetting.findUnique({
        where: { key: `lock:${key}` },
      });

      if (!existing) {
        return false;
      }

      const lockData = JSON.parse(existing.value);
      return new Date(lockData.expiresAt) > new Date();

    } catch (error) {
      return false;
    }
  }

  /**
   * Get lock info
   */
  async getInfo(key: string): Promise<{
    held: boolean;
    hostname?: string;
    acquiredAt?: Date;
    expiresAt?: Date;
  } | null> {
    try {
      const existing = await db.systemSetting.findUnique({
        where: { key: `lock:${key}` },
      });

      if (!existing) {
        return { held: false };
      }

      const lockData = JSON.parse(existing.value);
      const expiresAt = new Date(lockData.expiresAt);

      if (expiresAt <= new Date()) {
        return { held: false };
      }

      return {
        held: true,
        hostname: lockData.hostname,
        acquiredAt: new Date(lockData.acquiredAt),
        expiresAt,
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Force release a lock (admin only)
   */
  async forceRelease(key: string): Promise<boolean> {
    try {
      await db.systemSetting.delete({
        where: { key: `lock:${key}` },
      });
      this.locks.delete(key);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton
export const leaderLock = LeaderLockService.getInstance();
