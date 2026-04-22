/**
 * CargoBit Admin Payment Detail API
 * 
 * GET /api/admin/payments/{id} - Get payment details with refund history, wallet transactions, audit trail
 * 
 * RBAC: Requires admin or finance role
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAdminAuth, AdminRole } from '@/lib/admin-rbac';

// ============================================
// HELPER: CENTS TO EUROS
// ============================================

function centsToEuros(cents: number): number {
  return cents / 100;
}

// ============================================
// GET: PAYMENT DETAIL
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(request, async (admin) => {
    const paymentId = params.id;
    
    // Get payment with relations
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        refunds: {
          orderBy: { createdAt: 'desc' },
        },
        walletTransactions: {
          include: {
            wallet: {
              select: {
                id: true,
                ownerUserId: true,
                ownerCompanyId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    // Get shipper
    const shipper = await prisma.user.findUnique({
      where: { id: payment.shipperId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    
    // Get transporter if exists
    const transporter = payment.transporterId 
      ? await prisma.user.findUnique({
          where: { id: payment.transporterId },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : null;
    
    // Get admin info for audit events
    const adminIds = payment.auditEvents
      .filter(a => a.adminId)
      .map(a => a.adminId!);
    
    const admins = adminIds.length > 0 
      ? await prisma.adminUser.findMany({
          where: { id: { in: adminIds } },
          select: { id: true, email: true },
        })
      : [];
    
    const adminMap = new Map(admins.map(a => [a.id, a]));
    
    // Calculate total refunded
    const totalRefundedCents = payment.refunds
      .filter(r => r.status === 'SUCCEEDED')
      .reduce((sum, r) => sum + r.amountCents, 0);
    
    // Format response
    const result = {
      // Basic info
      id: payment.id,
      paymentIntentId: payment.paymentIntentId,
      chargeId: payment.chargeId,
      jobId: payment.jobId,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      metadata: payment.metadata ? JSON.parse(payment.metadata) : null,
      
      // Amounts
      amountCents: payment.amountCents,
      amountEur: centsToEuros(payment.amountCents),
      platformFeeCents: payment.platformFeeCents,
      platformFeeEur: centsToEuros(payment.platformFeeCents),
      transporterAmountCents: payment.transporterAmountCents,
      transporterAmountEur: payment.transporterAmountCents ? centsToEuros(payment.transporterAmountCents) : null,
      refundedCents: totalRefundedCents,
      refundedEur: centsToEuros(totalRefundedCents),
      refundableCents: payment.amountCents - totalRefundedCents,
      refundableEur: centsToEuros(payment.amountCents - totalRefundedCents),
      
      // People
      shipper: shipper ? {
        id: shipper.id,
        name: `${shipper.firstName || ''} ${shipper.lastName || ''}`.trim() || shipper.email,
        email: shipper.email,
      } : { id: payment.shipperId, name: 'Unknown', email: 'N/A' },
      
      transporter: transporter ? {
        id: transporter.id,
        name: `${transporter.firstName || ''} ${transporter.lastName || ''}`.trim() || transporter.email,
        email: transporter.email,
      } : null,
      
      // Timestamps
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      cancelledAt: payment.cancelledAt,
      
      // Refunds
      refunds: payment.refunds.map(r => ({
        id: r.id,
        refundId: r.refundId,
        amountCents: r.amountCents,
        amountEur: centsToEuros(r.amountCents),
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
        processedAt: r.processedAt,
      })),
      
      // Wallet transactions
      walletTransactions: payment.walletTransactions.map(wt => {
        const ownerType = wt.wallet.ownerCompanyId 
          ? 'company' 
          : wt.wallet.ownerUserId === payment.transporterId 
            ? 'transporter' 
            : wt.wallet.ownerUserId === payment.shipperId 
              ? 'shipper' 
              : 'platform';
        
        return {
          id: wt.id,
          walletId: wt.walletId,
          walletOwnerType: ownerType,
          type: wt.type,
          amount: wt.amount,
          currency: wt.currency,
          description: wt.description,
          createdAt: wt.createdAt,
        };
      }),
      
      // Audit trail
      auditTrail: payment.auditEvents.map(a => {
        const admin = a.adminId ? adminMap.get(a.adminId) : null;
        return {
          id: a.id,
          eventType: a.eventType,
          oldStatus: a.oldStatus,
          newStatus: a.newStatus,
          admin: admin ? { id: admin.id, email: admin.email } : null,
          metadata: a.metadata ? JSON.parse(a.metadata) : null,
          createdAt: a.createdAt,
        };
      }),
    };
    
    return NextResponse.json(result);
  }, [AdminRole.ADMIN, AdminRole.FINANCE]);
}
