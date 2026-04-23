/**
 * CargoBit Dispute API - Create Dispute
 * POST /api/jobs/[id]/disputes - Create dispute for a job
 * 
 * Python equivalent:
 * @router.post("/jobs/{job_id}/disputes")
 */

import { NextRequest, NextResponse } from 'next/server';
import { disputeService } from '@/services/dispute.service';

// ============================================
// POST /api/jobs/[id]/disputes
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: jobId } = await params;
    const body = await request.json();
    
    // Validate request
    const { reason, description, evidence } = body as {
      reason: string;
      description?: string;
      evidence?: string[];
    };
    
    if (!reason) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      );
    }
    
    // Python: create_dispute(...)
    const result = await disputeService.createDispute(jobId, userId, {
      reason,
      description,
      evidence,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    // Python: return {"status": "open", "dispute_id": str(dispute.id)}
    return NextResponse.json({
      status: result.status,
      dispute_id: result.disputeId,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[API] POST /jobs/[id]/disputes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create dispute' },
      { status: 500 }
    );
  }
}
