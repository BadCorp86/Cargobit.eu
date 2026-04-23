/**
 * CargoBit Payout Worker Endpoint - PRODUCTION READY
 * POST /api/payout-worker - Trigger automatic payout processing
 * 
 * Python equivalent:
 * def payout_worker(db: Session):
 *     jobs = db.query(Job).filter(
 *         Job.status == "completed",
 *         Job.payout_status == "pending"
 *     ).all()
 *     
 *     for job in jobs:
 *         try:
 *             process_payout_for_job(db, job.id)
 *         except Exception as e:
 *             log_error(job.id, str(e))
 * 
 * Can be triggered by:
 * - Cron job (recommended: every hour)
 * - Manual admin trigger
 */

import { NextRequest, NextResponse } from 'next/server';
import { payoutService } from '@/services/payout.service';

// ============================================
// POST /api/payout-worker
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify admin or cron secret
    const userRole = request.headers.get('x-user-role');
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedCronSecret = process.env.CRON_SECRET;
    
    const isAdmin = userRole === 'ADMIN';
    const isCron = cronSecret && cronSecret === expectedCronSecret;
    
    if (!isAdmin && !isCron) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Run payout worker
    const result = await payoutService.payoutWorker();
    
    return NextResponse.json({
      status: 'worker_complete',
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
    
  } catch (error: any) {
    console.error('[API] POST /payout-worker error:', error);
    return NextResponse.json(
      { error: error.message || 'Payout worker failed' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/payout-worker - Status check
// ============================================

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Payout worker endpoint is available',
    usage: {
      method: 'POST',
      headers: {
        'x-user-role': 'ADMIN (for manual trigger)',
        'x-cron-secret': 'CRON_SECRET (for automated trigger)',
      },
    },
  });
}
