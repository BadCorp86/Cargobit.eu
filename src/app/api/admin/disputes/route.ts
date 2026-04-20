/**
 * CargoBit Admin Disputes API
 * 
 * GET /api/admin/disputes - List all disputes with filters
 * 
 * RBAC: ADMIN, SUPPORT roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAdminAuth, AdminRole } from '@/lib/admin-rbac';

// ============================================
// GET: LIST DISPUTES
// ============================================

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (admin) => {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const reason = searchParams.get('reason');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build filter
    const where: any = {};
    
    if (status) {
      where.status = status.toUpperCase();
    }
    
    if (reason) {
      where.reason = reason.toUpperCase();
    }
    
    // Query disputes
    const disputes = await prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    
    // Get creators
    const creatorIds = [...new Set(disputes.map(d => d.createdById))];
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const creatorMap = new Map(creators.map(c => [c.id, c]));
    
    // Get assigned admins
    const assignedIds = [...new Set(disputes.filter(d => d.assignedToId).map(d => d.assignedToId!))];
    const assignedAdmins = assignedIds.length > 0 
      ? await prisma.adminUser.findMany({
          where: { id: { in: assignedIds } },
          select: { id: true, email: true },
        })
      : [];
    const adminMap = new Map(assignedAdmins.map(a => [a.id, a]));
    
    // Get total count
    const total = await prisma.dispute.count({ where });
    
    // Format response
    const items = disputes.map(d => {
      const creator = creatorMap.get(d.createdById);
      const assignedTo = d.assignedToId ? adminMap.get(d.assignedToId) : null;
      
      return {
        id: d.id,
        jobId: d.jobId,
        createdById: d.createdById,
        createdBy: creator 
          ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.email
          : 'Unknown',
        reason: d.reason,
        subject: d.subject,
        description: d.description.substring(0, 100) + (d.description.length > 100 ? '...' : ''),
        disputedAmountCents: d.disputedAmountCents,
        disputedAmountEur: d.disputedAmountCents ? d.disputedAmountCents / 100 : null,
        status: d.status,
        assignedTo: assignedTo ? { id: assignedTo.id, email: assignedTo.email } : null,
        createdAt: d.createdAt,
        resolvedAt: d.resolvedAt,
      };
    });
    
    return NextResponse.json({
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    });
  }, [AdminRole.ADMIN, AdminRole.SUPPORT]);
}
