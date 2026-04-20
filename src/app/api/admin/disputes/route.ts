/**
 * CargoBit Admin Disputes API
 * 
 * GET /api/admin/disputes - List all disputes
 * 
 * RBAC: ADMIN, FINANCE, SUPPORT roles
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build filter
    const where: any = {};
    
    if (status) {
      where.status = status.toUpperCase();
    }
    
    // Query disputes
    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    
    // Get total count
    const total = await prisma.dispute.count({ where });
    
    // Format response
    const items = disputes.map(d => ({
      id: d.id,
      job_id: d.jobId,
      created_by: d.createdById,
      reason: d.reason,
      status: d.status,
      created_at: d.createdAt,
    }));
    
    return NextResponse.json({
      items,
      total,
    });
  }, [AdminRole.ADMIN, AdminRole.FINANCE, AdminRole.SUPPORT]);
}
