// ============================================
// CARGOBIT CRON API - PAYOUTS SCHEDULER
// Called by Vercel Cron or external scheduler
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { payoutScheduler } from '@/services/payout-scheduler.service';

// ============================================
// POST /api/cron/payouts
// 
// Triggered by:
// - Vercel Cron: Add to vercel.json
// - External: cron-job.org, EasyCron
// - Manual: Admin Dashboard
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        error: 'UnauthorizedError',
        message: 'Invalid cron secret',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    // Run the scheduler
    const result = await payoutScheduler.runScheduledPayouts();

    // Check for reconciliation issues
    const hasIssues = result.diffs.length > 0;

    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      duration: result.duration,
      summary: {
        pendingProcessed: result.pendingPayouts,
        successful: result.processedPayouts,
        failed: result.failedPayouts,
        reconciled: result.reconciledPayouts,
      },
      warnings: hasIssues ? result.diffs : undefined,
    }, { 
      status: 200,
      headers: {
        'X-Scheduler-Run': result.timestamp.toISOString(),
        'X-Duration-Ms': result.duration.toString(),
        'X-Has-Issues': hasIssues ? 'true' : 'false',
      },
    });

  } catch (error) {
    console.error('Cron payouts error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Scheduler run failed',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

// ============================================
// GET /api/cron/payouts - Health Check
// ============================================

export async function GET(request: NextRequest) {
  try {
    const health = await payoutScheduler.healthCheck();
    const stats = payoutScheduler.getStats();

    return NextResponse.json({
      healthy: health.healthy,
      lastRun: health.lastRun,
      nextRun: stats.nextRun,
      stats: {
        totalRuns: stats.totalRuns,
        successfulRuns: stats.successfulRuns,
        failedRuns: stats.failedRuns,
      },
      queue: {
        pendingPayouts: health.pendingPayouts,
        failedPayouts: health.failedPayouts,
      },
      lock: health.lockStatus,
    });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      healthy: false,
      error: 'Health check failed',
    }, { status: 500 });
  }
}
