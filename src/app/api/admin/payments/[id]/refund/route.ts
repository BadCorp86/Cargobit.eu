/**
 * CargoBit Admin - Create Refund
 * 
 * POST /api/admin/payments/[id]/refund
 * 
 * Creates a refund for a payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, checkPermission } from '@/lib/admin-rbac';
import { prisma } from '@/lib/db';

interface RefundRequest {
  amountCents: number;
  reason: string;
  isFullRefund: boolean;
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
      const body: RefundRequest = await request.json();
      const { amountCents, reason, isFullRefund } = body;

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

      // Get the payment/wallet transaction
      const transaction = await prisma.walletTransaction.findUnique({
        where: { id: params.id },
        include: { wallet: true },
      });

      if (!transaction) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }

      // Check if already refunded
      if (transaction.type === 'REFUND') {
        return NextResponse.json(
          { error: 'This payment has already been refunded' },
          { status: 400 }
        );
      }

      // Create refund transaction
      const refund = await prisma.walletTransaction.create({
        data: {
          walletId: transaction.walletId,
          type: 'REFUND',
          amount: amountCents,
          currency: transaction.currency,
          relatedTransportId: transaction.relatedTransportId,
          description: `Refund: ${reason}`,
          reference: `refund_${params.id}`,
        },
      });

      // Update wallet balance
      await prisma.wallet.update({
        where: { id: transaction.walletId },
        data: {
          balance: { decrement: amountCents },
        },
      });

      // Create audit log
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'refund',
          entityType: 'payment',
          entityId: params.id,
          dataAfter: JSON.stringify({
            amountCents,
            reason,
            isFullRefund,
            refundId: refund.id,
          }),
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        },
      });

      return NextResponse.json({
        success: true,
        refund: {
          id: refund.id,
          amountCents: refund.amount,
          currency: refund.currency,
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
  }, ['ADMIN', 'FINANCE']); // Only ADMIN and FINANCE can refund
}
