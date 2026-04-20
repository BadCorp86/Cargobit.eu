/**
 * CargoBit Admin - Dashboard Stats
 * 
 * GET /api/admin/stats
 * 
 * Returns aggregated statistics for the admin dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-rbac';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (admin) => {
    try {
      // Get payment stats
      const payments = await prisma.walletTransaction.groupBy({
        by: ['type'],
        _count: { id: true },
        _sum: { amount: true },
        where: {
          type: { in: ['PAYMENT_IN', 'REFUND'] },
        },
      });

      // Get user stats
      const userStats = await prisma.user.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      // Get transport stats
      const transportStats = await prisma.transport.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      // Get dispute count (from support tickets with specific category)
      const disputeCount = await prisma.supportTicket.count({
        where: { category: 'dispute' },
      });

      // Format response
      const stats = {
        payments: {
          total: payments.reduce((sum, p) => sum + p._count.id, 0),
          succeeded: payments.find(p => p.type === 'PAYMENT_IN')?._count.id || 0,
          pending: 0, // Would need separate tracking
          failed: 0, // Would need separate tracking
          totalAmountCents: payments.find(p => p.type === 'PAYMENT_IN')?._sum.amount || 0,
          refundedAmountCents: payments.find(p => p.type === 'REFUND')?._sum.amount || 0,
        },
        disputes: {
          open: disputeCount,
          inProgress: 0,
          resolved: 0,
          totalRefunded: 0,
        },
        users: {
          total: userStats.reduce((sum, u) => sum + u._count.id, 0),
          active: userStats.find(u => u.status === 'ACTIVE')?._count.id || 0,
          pending: userStats.find(u => u.status === 'PENDING')?._count.id || 0,
          blocked: userStats.find(u => u.status === 'BLOCKED')?._count.id || 0,
          newToday: 0, // Would need date filtering
        },
        jobs: {
          total: transportStats.reduce((sum, t) => sum + t._count.id, 0),
          active: transportStats.filter(t => ['ASSIGNED', 'IN_TRANSIT'].includes(t.status))
            .reduce((sum, t) => sum + t._count.id, 0),
          completed: transportStats.find(t => t.status === 'COMPLETED')?._count.id || 0,
          cancelled: transportStats.find(t => t.status === 'CANCELLED')?._count.id || 0,
        },
      };

      return NextResponse.json(stats);
    } catch (error) {
      console.error('[AdminStats] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }
  });
}
