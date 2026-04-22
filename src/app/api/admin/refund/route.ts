/**
 * CargoBit Admin Refund API
 * 
 * POST /api/admin/refund - Process a refund
 * GET /api/admin/refund - Get refund calculation for a job
 * 
 * RBAC: 
 * - POST: Requires admin or finance role (refunds:create permission)
 * - GET: Requires admin or finance role (payments:read permission)
 * 
 * Python equivalent:
 * ```python
 * @router.post("/admin/jobs/{job_id}/refund")
 * def refund_job(
 *     job_id: str,
 *     req: RefundRequest,
 *     admin = Depends(require_role("admin", "finance")),
 * ):
 *     refund_id = process_refund_for_job(db, job_id, req.amount_cents)
 *     return {"status": "refund_initiated", "refund_id": refund_id}
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAdminAuth, checkPermission, AdminRole } from '@/lib/admin-rbac';
import { processRefund, getRefundCalculation, RefundType } from '@/services/refund.service';
import { getPaymentByJobId, centsToEuros } from '@/services/payment.service';

// ============================================
// TYPES
// ============================================

interface RefundRequestBody {
  jobId: string;
  type: RefundType;
  amountEur?: number;
  reason: string;
}

// ============================================
// POST: PROCESS REFUND
// ============================================

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (admin) => {
    // Check permission
    if (!checkPermission(admin, 'refunds:create')) {
      return NextResponse.json(
        { error: 'Forbidden - No permission to create refunds' },
        { status: 403 }
      );
    }
    
    // Parse request body
    let body: RefundRequestBody;
    
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { jobId, type, amountEur, reason } = body;
    
    // Validate input
    if (!jobId || !type || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: jobId, type, reason' },
        { status: 400 }
      );
    }
    
    if (!['full', 'partial', 'platform_fee_only'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid refund type. Must be: full, partial, or platform_fee_only' },
        { status: 400 }
      );
    }
    
    if (type === 'partial' && (!amountEur || amountEur <= 0)) {
      return NextResponse.json(
        { error: 'Partial refund requires amountEur > 0' },
        { status: 400 }
      );
    }
    
    // Verify job exists
    const job = await prisma.transport.findUnique({
      where: { id: jobId },
    });
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Check for valid payment
    const payment = await getPaymentByJobId(jobId);
    
    if (!payment) {
      return NextResponse.json(
        { error: 'No payment found for this job' },
        { status: 400 }
      );
    }
    
    if (!['SUCCEEDED', 'PARTIAL_REFUNDED'].includes(payment.status)) {
      return NextResponse.json(
        { error: `Cannot refund payment with status: ${payment.status}` },
        { status: 400 }
      );
    }
    
    // Process refund
    const result = await processRefund({
      jobId,
      type,
      amountEur,
      reason,
      initiatedBy: admin.id,
    });
    
    // Return result
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Refund failed' },
        { status: 400 }
      );
    }
    
    // Create audit log
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'refund_created',
        entityType: 'refund',
        entityId: result.refundId || 'unknown',
        dataAfter: JSON.stringify({
          jobId,
          type,
          amountCents: result.amountCents,
          stripeRefundId: result.stripeRefundId,
          reason,
        }),
      },
    });
    
    return NextResponse.json({
      status: 'refund_initiated',
      refundId: result.refundId,
      stripeRefundId: result.stripeRefundId,
      amountCents: result.amountCents,
      amountEur: result.amountEur,
      currency: result.currency,
      refundStatus: result.status,
      processedBy: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });
  }, [AdminRole.ADMIN, AdminRole.FINANCE]); // Only admin and finance
}

// ============================================
// GET: REFUND CALCULATION
// ============================================

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (admin) => {
    // Check permission
    if (!checkPermission(admin, 'payments:read')) {
      return NextResponse.json(
        { error: 'Forbidden - No permission to view payments' },
        { status: 403 }
      );
    }
    
    // Get jobId from query
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }
    
    // Get refund calculations
    const calculations = await getRefundCalculation(jobId);
    
    if (!calculations) {
      return NextResponse.json(
        { error: 'No payment found for this job' },
        { status: 404 }
      );
    }
    
    // Get payment details
    const payment = await getPaymentByJobId(jobId);
    
    // Return calculations
    return NextResponse.json({
      jobId,
      paymentStatus: payment?.status,
      totalPaidEur: centsToEuros(calculations.totalPaidCents),
      platformFeeEur: centsToEuros(calculations.platformFeeCents),
      transporterAmountEur: centsToEuros(calculations.transporterAmountCents),
      alreadyRefundedEur: centsToEuros(calculations.alreadyRefundedCents),
      maxRefundableEur: centsToEuros(calculations.maxRefundableCents),
      breakdownCents: calculations,
    });
  }, [AdminRole.ADMIN, AdminRole.FINANCE]);
}
