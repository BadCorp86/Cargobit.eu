/**
 * CargoBit Admin Resolve Dispute API
 * 
 * POST /api/admin/disputes/{disputeId}/resolve - Resolve a dispute
 * 
 * RBAC: ADMIN, FINANCE (for refunds), SUPPORT (for reject only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAdminAuth, checkPermission, AdminRole } from '@/lib/admin-rbac';
import { processRefund } from '@/services/refund.service';
import { getPaymentByJobId } from '@/services/payment.service';

// ============================================
// TYPES
// ============================================

interface ResolveDisputeRequest {
  action: 'refund_full' | 'refund_partial' | 'reject';
  resolution: string;
  refund_amount_eur?: number | null;
}

// ============================================
// POST: RESOLVE DISPUTE
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: { disputeId: string } }
) {
  return withAdminAuth(request, async (admin) => {
    const disputeId = params.disputeId;
    
    // Parse request
    let body: ResolveDisputeRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { action, resolution, refund_amount_eur } = body;
    
    // Validate input
    if (!action || !resolution) {
      return NextResponse.json(
        { error: 'Missing required fields: action, resolution' },
        { status: 400 }
      );
    }
    
    if (!['refund_full', 'refund_partial', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: refund_full, refund_partial, or reject' },
        { status: 400 }
      );
    }
    
    // Check permission for refund actions
    if (action.startsWith('refund_')) {
      if (!checkPermission(admin, 'refunds:create')) {
        return NextResponse.json(
          { error: 'Forbidden - No permission to create refunds' },
          { status: 403 }
        );
      }
    }
    
    // Get dispute
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });
    
    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }
    
    if (!['OPEN', 'IN_PROGRESS'].includes(dispute.status)) {
      return NextResponse.json(
        { error: `Cannot resolve dispute with status: ${dispute.status}` },
        { status: 400 }
      );
    }
    
    // Process based on action
    let refundResult = null;
    
    if (action === 'refund_full' || action === 'refund_partial') {
      // Check for payment
      const payment = await getPaymentByJobId(dispute.jobId);
      
      if (!payment) {
        return NextResponse.json(
          { error: 'No payment found for this job' },
          { status: 400 }
        );
      }
      
      // Process refund
      const refundType = action === 'refund_full' ? 'full' : 'partial';
      
      refundResult = await processRefund({
        jobId: dispute.jobId,
        type: refundType,
        amountEur: refund_amount_eur,
        reason: `Dispute resolution: ${resolution}`,
        initiatedBy: admin.id,
      });
      
      if (!refundResult.success) {
        return NextResponse.json(
          { error: refundResult.error || 'Refund failed' },
          { status: 400 }
        );
      }
    }
    
    // Update dispute
    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolution,
        resolvedAt: new Date(),
        reviewedById: admin.id,
        refundAmount: refund_amount_eur || (action === 'refund_full' ? dispute.job.agreedPrice : null),
      },
    });
    
    // Create audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'dispute_resolved',
        entityType: 'dispute',
        entityId: disputeId,
        dataAfter: JSON.stringify({
          action,
          resolution,
          refund_amount_eur,
          refund_id: refundResult?.refundId,
        }),
      },
    });
    
    return NextResponse.json({
      id: updatedDispute.id,
      job_id: updatedDispute.jobId,
      created_by: updatedDispute.createdById,
      reason: updatedDispute.reason,
      status: updatedDispute.status,
      resolution: updatedDispute.resolution,
      refund_amount_cents: updatedDispute.refundAmount ? Math.round(updatedDispute.refundAmount * 100) : null,
      created_at: updatedDispute.createdAt,
      resolved_at: updatedDispute.resolvedAt,
      messages: [],
      refund_initiated: refundResult?.success ?? false,
      refund_id: refundResult?.refundId,
    });
  }, [AdminRole.ADMIN, AdminRole.FINANCE, AdminRole.SUPPORT]);
}
