/**
 * CargoBit Admin - Create Refund
 * 
 * POST /api/admin/payments/[id]/refund
 * 
 * Creates a refund for a payment.
 * RBAC: ADMIN, FINANCE only
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, checkPermission, AdminRole } from '@/lib/admin-rbac';
import { prisma } from '@/lib/db';

interface RefundRequest {
  amountCents: number;
  reason?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(request, async (admin) => {
    // Check permission
    if (!checkPermission(admin, 'refunds:create')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    try {
      const body = await request.json();
      const { amountCents, reason } = body;

      // Validate
      if (!amountCents || amountCents <= 0) {
        return NextResponse.json(
          { error: 'Invalid refund amount' },
          { status: 400 }
        );
      }

      if (!reason || reason.trim() === '') {
        return NextResponse.json(
          { error: 'Refund reason is required' },
          { status: 400 }
        );
      }

      // Get the payment
      const payment = await prisma.payment.findUnique({
        where: { id: params.id },
        include: { refunds: true },
      });

      if (!payment) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }

      // Check status
      if (payment.status !== 'SUCCEEDED') {
        return NextResponse.json(
          { error: 'Can only refund successful payments' },
          { status: 400 }
        );
      }

      // Calculate already refunded
      const alreadyRefunded = payment.refunds
        .filter(r => r.status === 'SUCCEEDED')
        .reduce((sum, r) => sum + r.amountCents, 0);

      const maxRefundable = payment.amountCents - alreadyRefunded;

      if (amountCents > maxRefundable) {
        return NextResponse.json(
          { error: `Refund amount exceeds refundable amount: ${maxRefundable / 100} EUR` },
          { status: 400 }
        );
      }

      // Create refund record
      const refund = await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amountCents,
          reason,
          status: 'PENDING',
          initiatedBy: admin.id,
        },
      });

      // Update payment status if fully refunded
      if (amountCents === maxRefundable) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' },
        });
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'PARTIALLY_REFUNDED' },
        });
      }

      // Create payment audit event
      await prisma.paymentAuditEvent.create({
        data: {
          paymentId: payment.id,
          eventType: 'refund_initiated',
          oldStatus: payment.status,
          newStatus: amountCents === maxRefundable ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          adminId: admin.id,
          metadata: JSON.stringify({
            refundId: refund.id,
            amountCents,
            reason,
          }),
        },
      });

      // Create admin audit log
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'refund',
          entityType: 'payment',
          entityId: payment.id,
          dataAfter: JSON.stringify({
            refundId: refund.id,
            amountCents,
            reason,
          }),
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        },
      });

      return NextResponse.json({
        success: true,
        refund: {
          id: refund.id,
          amountCents: refund.amountCents,
          amountEur: refund.amountCents / 100,
          status: refund.status,
          createdAt: refund.createdAt,
        },
      });
    } catch (error) {
      console.error('[AdminRefund] Error:', error);
      return NextResponse.json(
        { error: 'Failed to create refund' },
        { status: 500 }
      );
    }
  }, ['ADMIN', 'FINANCE'] as any);
}
