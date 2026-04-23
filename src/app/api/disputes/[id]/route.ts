/**
 * CargoBit Dispute Resolution API
 * POST /api/disputes/[id]/resolve - Admin resolves dispute
 * GET /api/disputes/[id] - Get dispute details
 * 
 * Python equivalent:
 * @router.post("/disputes/{dispute_id}/resolve")
 */

import { NextRequest, NextResponse } from 'next/server';
import { disputeService } from '@/services/dispute.service';
import type { DisputeAction } from '@prisma/client';

// ============================================
// POST /api/disputes/[id]/resolve
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId || userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const { id: disputeId } = await params;
    const body = await request.json();
    
    // Validate request
    const { action, resolution, refundAmountCents } = body as {
      action: DisputeAction;
      resolution: string;
      refundAmountCents?: number;
    };
    
    if (!action || !resolution) {
      return NextResponse.json(
        { error: 'action and resolution are required' },
        { status: 400 }
      );
    }
    
    // Python: resolve_dispute(...)
    const result = await disputeService.resolveDispute(disputeId, userId, {
      action,
      resolution,
      refundAmountCents,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    // Python: return {"status": d.status}
    return NextResponse.json({
      status: result.status,
      dispute_id: disputeId,
    });
    
  } catch (error: any) {
    console.error('[API] POST /disputes/[id]/resolve error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve dispute' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/disputes/[id]
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: disputeId } = await params;
    
    const dispute = await disputeService.getDisputeById(disputeId);
    
    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(dispute);
    
  } catch (error: any) {
    console.error('[API] GET /disputes/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get dispute' },
      { status: 500 }
    );
  }
}
