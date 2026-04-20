/**
 * CargoBit Admin Payments API
 * 
 * GET /api/admin/payments - List all payments with filters
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
// GET: LIST PAYMENTS
// ============================================

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (admin) => {    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const shipperId = searchParams.get('shipperId');
    const jobId = searchParams.get('jobId');
    const search = searchParams.get('search');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build filter
    const where: any = {};
    
    if (status) {
      where.status = status.toUpperCase();
    }
    
    if (shipperId) {
      where.shipperId = shipperId;
    }
    
    if (jobId) {
      where.jobId = jobId;
    }
    
    if (search) {
      where.OR = [
        { paymentIntentId: { contains: search } },
        { chargeId: { contains: search } },
        { shipperId: { contains: search } },
        { jobId: { contains: search } },
      ];
    }
    
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }
    
    // Query payments
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    
    // Get shipper and transporter names
    const shipperIds = [...new Set(payments.map(p => p.shipperId))];
    const transporterIds = [...new Set(payments.filter(p => p.transporterId).map(p => p.transporterId!))];
    
    const [shippers, transporters] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: shipperIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      prisma.user.findMany({
        where: { id: { in: transporterIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);
    
    const shipperMap = new Map(shippers.map(s => [s.id, s]));
    const transporterMap = new Map(transporters.map(t => [t.id, t]));
    
    // Get refund amounts
    const paymentIds = payments.map(p => p.id);
    const refunds = await prisma.refund.groupBy({
      by: ['paymentId'],
      where: { 
        paymentId: { in: paymentIds },
        status: 'SUCCEEDED',
      },
      _sum: { amountCents: true },
    });
    
    const refundMap = new Map(refunds.map(r => [r.paymentId, r._sum.amountCents || 0]));
    
    // Format response
    const items = payments.map(p => {
      const shipper = shipperMap.get(p.shipperId);
      const transporter = p.transporterId ? transporterMap.get(p.transporterId) : null;
      const refundedCents = refundMap.get(p.id) || 0;
      
      return {
        id: p.id,
        paymentIntentId: p.paymentIntentId,
        chargeId: p.chargeId,
        jobId: p.jobId,
        shipperId: p.shipperId,
        shipperName: shipper 
          ? `${shipper.firstName || ''} ${shipper.lastName || ''}`.trim() || shipper.email
          : 'Unknown',
        shipperEmail: shipper?.email || 'N/A',
        transporterId: p.transporterId,
        transporterName: transporter
          ? `${transporter.firstName || ''} ${transporter.lastName || ''}`.trim() || transporter.email
          : 'N/A',
        amountCents: p.amountCents,
        amountEur: centsToEuros(p.amountCents),
        currency: p.currency,
        platformFeeCents: p.platformFeeCents,
        platformFeeEur: centsToEuros(p.platformFeeCents),
        transporterAmountCents: p.transporterAmountCents,
        transporterAmountEur: p.transporterAmountCents ? centsToEuros(p.transporterAmountCents) : null,
        refundedCents,
        refundedEur: centsToEuros(refundedCents),
        status: p.status,
        description: p.description,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
        failedAt: p.failedAt,
      };
    });
    
    // Get total count
    const total = await prisma.payment.count({ where });
    
    return NextResponse.json({
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    });
  }, [AdminRole.ADMIN, AdminRole.FINANCE]);
}
