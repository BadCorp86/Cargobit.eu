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

// ============================================
// TYPES
// ============================================

interface ResolveDisputeRequest {
  action: 'REFUND_FULL' | 'REFUND_PARTIAL' | 'REJECT' | 'COMPENSATION' | 'RESEND';
  resolutionText: string;
  refundAmountCents?: number | null;
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
    
    const { action, resolutionText, refundAmountCents } = body;
    
    // Validate input
    if (!action || !resolutionText) {
      return NextResponse.json(
        { error: 'Missing required fields: action, resolutionText' },
        { status: 400 }
      );
    }
    
    const validActions = ['REFUND_FULL', 'REFUND_PARTIAL', 'REJECT', 'COMPENSATION', 'RESEND'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check permission for refund actions
    if (action.startsWith('REFUND_')) {
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
    
    if (!['OPEN', 'IN_PROGRESS', 'AWAITING_INFO'].includes(dispute.status)) {
      return NextResponse.json(
        { error: `Cannot resolve dispute with status: ${dispute.status}` },
        { status: 400 }
      );
    }
    
    // Calculate refund amount
    let finalRefundAmountCents: number | null = null;
    
    if (action === 'REFUND_FULL') {
      // Get payment for this job
      const payment = await prisma.payment.findFirst({
        where: { jobId: dispute.jobId, status: 'SUCCEEDED' },
      });
      
      if (!payment) {
        return NextResponse.json(
          { error: 'No successful payment found for this job' },
          { status: 400 }
        );
      }
      
      // Calculate refundable amount (total - already refunded)
      const existingRefunds = await prisma.refund.aggregate({
        where: { paymentId: payment.id, status: 'SUCCEEDED' },
        _sum: { amountCents: true },
      });
      
      const alreadyRefunded = existingRefunds._sum.amountCents || 0;
      finalRefundAmountCents = payment.amountCents - alreadyRefunded;
      
      if (finalRefundAmountCents <= 0) {
        return NextResponse.json(
          { error: 'No refundable amount remaining' },
          { status: 400 }
        );
      }
      
      // Create refund record
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amountCents: finalRefundAmountCents,
          reason: `Dispute resolution: ${resolutionText}`,
          status: 'PENDING',
          initiatedBy: admin.id,
        },
      });
      
    } else if (action === 'REFUND_PARTIAL') {
      if (!refundAmountCents || refundAmountCents <= 0) {
        return NextResponse.json(
          { error: 'refundAmountCents is required for partial refund' },
          { status: 400 }
        );
      }
      
      // Get payment for this job
      const payment = await prisma.payment.findFirst({
        where: { jobId: dispute.jobId, status: 'SUCCEEDED' },
      });
      
      if (!payment) {
        return NextResponse.json(
          { error: 'No successful payment found for this job' },
          { status: 400 }
        );
      }
      
      // Calculate refundable amount
      const existingRefunds = await prisma.refund.aggregate({
        where: { paymentId: payment.id, status: 'SUCCEEDED' },
        _sum: { amountCents: true },
      });
      
      const alreadyRefunded = existingRefunds._sum.amountCents || 0;
      const refundableAmount = payment.amountCents - alreadyRefunded;
      
      if (refundAmountCents > refundableAmount) {
        return NextResponse.json(
          { error: `Refund amount exceeds refundable amount: ${refundableAmount / 100} EUR` },
          { status: 400 }
        );
      }
      
      finalRefundAmountCents = refundAmountCents;
      
      // Create refund record
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amountCents: finalRefundAmountCents,
          reason: `Dispute resolution: ${resolutionText}`,
          status: 'PENDING',
          initiatedBy: admin.id,
        },
      });
    }
    
    // Update dispute
    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolution: action as any,
        resolutionText,
        refundAmountCents: finalRefundAmountCents,
        resolvedById: admin.id,
        resolvedAt: new Date(),
      },
    });
    
    // Create audit event
    await prisma.disputeAuditEvent.create({
      data: {
        disputeId,
        eventType: 'resolved',
        oldStatus: dispute.status,
        newStatus: 'RESOLVED',
        adminId: admin.id,
        metadata: JSON.stringify({
          action,
          resolutionText,
          refundAmountCents: finalRefundAmountCents,
        }),
      },
    });
    
    // Create admin audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'dispute_resolved',
        entityType: 'dispute',
        entityId: disputeId,
        dataAfter: JSON.stringify({
          action,
          resolutionText,
          refundAmountCents: finalRefundAmountCents,
        }),
      },
    });
    
    return NextResponse.json({
      id: updatedDispute.id,
      jobId: updatedDispute.jobId,
      status: updatedDispute.status,
      resolution: updatedDispute.resolution,
      resolutionText: updatedDispute.resolutionText,
      refundAmountCents: updatedDispute.refundAmountCents,
      refundAmountEur: updatedDispute.refundAmountCents ? updatedDispute.refundAmountCents / 100 : null,
      resolvedAt: updatedDispute.resolvedAt,
    });
  }, [AdminRole.ADMIN, AdminRole.FINANCE, AdminRole.SUPPORT]);
}
