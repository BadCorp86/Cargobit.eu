/**
 * CargoBit Admin Dispute Detail API
 * 
 * GET /api/admin/disputes/{disputeId} - Get dispute details
 * 
 * RBAC: ADMIN, FINANCE, SUPPORT roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAdminAuth, AdminRole } from '@/lib/admin-rbac';

// ============================================
// GET: DISPUTE DETAIL
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { disputeId: string } }
) {
  return withAdminAuth(request, async (admin) => {
    const disputeId = params.disputeId;
    
    // Get dispute with relations
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        job: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
    
    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }
    
    // Get dispute messages (if stored separately)
    // For now, return basic info
    
    const result = {
      id: dispute.id,
      job_id: dispute.jobId,
      created_by: dispute.createdById,
      reason: dispute.reason,
      status: dispute.status,
      resolution: dispute.resolution,
      refund_amount_cents: dispute.refundAmount ? Math.round(dispute.refundAmount * 100) : null,
      created_at: dispute.createdAt,
      resolved_at: dispute.resolvedAt,
      messages: [], // Would be populated from DisputeMessage table if exists
    };
    
    return NextResponse.json(result);
  }, [AdminRole.ADMIN, AdminRole.FINANCE, AdminRole.SUPPORT]);
}
