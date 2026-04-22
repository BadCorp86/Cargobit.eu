// ============================================
// CARGOBIT CRON: RECONCILIATION JOB
// GET /api/cron/reconcile
// ============================================
// 
// Automated reconciliation job triggered by cron scheduler.
// 
// Security: Requires CRON_SECRET header for authentication
// 
// Schedule: Every 15 minutes (recommended)
// 
// Features:
// - Leader lock to prevent concurrent runs
// - Batch reconciliation of recent payments
// - Metrics and alerts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reconcileAllRecent, getReconciliationStats } from '@/services/refund-reconciliation.service';

// ============================================
// CONFIGURATION
// ============================================

const CRON_SECRET = process.env.CRON_SECRET || 'cron-secret-dev';
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// ============================================
// HELPER: LEADER LOCK
// ============================================

interface LockResult {
  acquired: boolean;
  lockId?: string;
}

async function acquireLock(): Promise<LockResult> {
  const lockId = `reconcile-${Date.now()}`;
  
  try {
    // Try to acquire lock using SystemSetting table
    const existing = await prisma.systemSetting.findUnique({
      where: { key: 'reconciliation_lock' },
    });

    if (existing) {
      const lockData = JSON.parse(existing.value);
      const lockAge = Date.now() - new Date(lockData.timestamp).getTime();

      // If lock is still valid, don't acquire
      if (lockAge < LOCK_TIMEOUT_MS) {
        return { acquired: false };
      }
    }

    // Acquire or update lock
    await prisma.systemSetting.upsert({
      where: { key: 'reconciliation_lock' },
      create: {
        key: 'reconciliation_lock',
        value: JSON.stringify({
          lockId,
          timestamp: new Date().toISOString(),
        }),
      },
      update: {
        value: JSON.stringify({
          lockId,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return { acquired: true, lockId };
  } catch (error) {
    console.error('[CRON] Lock acquisition error:', error);
    return { acquired: false };
  }
}

async function releaseLock(): Promise<void> {
  try {
    await prisma.systemSetting.delete({
      where: { key: 'reconciliation_lock' },
    }).catch(() => {}); // Ignore if doesn't exist
  } catch (error) {
    console.error('[CRON] Lock release error:', error);
  }
}

// ============================================
// METRICS HELPER
// ============================================

async function recordMetrics(result: {
  total: number;
  reconciled: number;
  errors: number;
}): Promise<void> {
  try {
    // Store metrics in SystemSetting
    await prisma.systemSetting.upsert({
      where: { key: 'reconciliation_last_run' },
      create: {
        key: 'reconciliation_last_run',
        value: JSON.stringify({
          timestamp: new Date().toISOString(),
          ...result,
        }),
      },
      update: {
        value: JSON.stringify({
          timestamp: new Date().toISOString(),
          ...result,
        }),
      },
    });
  } catch (error) {
    console.error('[CRON] Failed to record metrics:', error);
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (providedSecret !== CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid cron secret' },
      { status: 401 }
    );
  }

  console.log('[CRON] Reconciliation job started');

  try {
    // Acquire leader lock
    const lock = await acquireLock();
    
    if (!lock.acquired) {
      console.log('[CRON] Another instance is already running, skipping');
      return NextResponse.json({
        success: true,
        message: 'Skipped - another instance is running',
      });
    }

    // Run reconciliation
    const result = await reconcileAllRecent(200);

    // Record metrics
    await recordMetrics(result);

    // Release lock
    await releaseLock();

    const duration = Date.now() - startTime;

    console.log('[CRON] Reconciliation job completed:', {
      ...result,
      durationMs: duration,
    });

    // Alert on errors
    if (result.errors > 5) {
      console.error('[CRON] ALERT: High error count in reconciliation:', result.errors);
      // In production: Send alert to monitoring system
    }

    return NextResponse.json({
      success: true,
      duration: duration,
      ...result,
    });
  } catch (error: any) {
    console.error('[CRON] Reconciliation job failed:', error);

    // Release lock on error
    await releaseLock();

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Support POST as well (some cron services use POST)
export const POST = GET;
