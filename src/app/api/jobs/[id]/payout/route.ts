/**
 * CargoBit Admin Payout Endpoint - PRODUCTION READY
 * POST /api/jobs/[id]/payout - Trigger payout for completed job
 * 
 * Python equivalent:
 * @router.post("/{job_id}/payout")
 * def trigger_payout(
 *     job_id: str,
 *     db: Session = Depends(get_db),
 *     user_id: str = Depends(require_admin)
 * ):
 *     payout_ref = process_payout_for_job(db, job_id)
 *     return {"status": "payout_processed", "payout_ref": payout_ref}
 */

import { NextRequest, NextResponse } from 'next/server';
import { payoutService } from '@/services/payout.service';

// ============================================
// POST /api/jobs/[id]/payout
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Python: user_id: str = Depends(require_admin)
    const userRole = request.headers.get('x-user-role');
    
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const { id: jobId } = await params;
    
    // Python: payout_ref = process_payout_for_job(db, job_id)
    const result = await payoutService.processPayoutForJob(jobId);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          status: 'payout_failed', 
          error: result.error,
          amount: result.amount,
        },
        { status: 400 }
      );
    }
    
    // Python: return {"status": "payout_processed", "payout_ref": payout_ref}
    return NextResponse.json({
      status: 'payout_processed',
      payout_ref: result.payoutReference,
      amount: result.amount,
      fee: result.fee,
      net_amount: result.netAmount,
    });
    
  } catch (error: any) {
    console.error('[API] POST /jobs/[id]/payout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payout' },
      { status: 500 }
    );
  }
}
