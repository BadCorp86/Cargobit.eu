/**
 * CargoBit Disputes List API
 * GET /api/disputes - List disputes (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { disputeService } from '@/services/dispute.service';
import type { DisputeStatus } from '@prisma/client';

// ============================================
// GET /api/disputes
// ============================================

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as DisputeStatus | null;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const disputes = await disputeService.getDisputes({
      status: status || undefined,
      limit,
      offset,
    });
    
    return NextResponse.json({
      disputes,
      limit,
      offset,
      total: disputes.length,
    });
    
  } catch (error: any) {
    console.error('[API] GET /disputes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get disputes' },
      { status: 500 }
    );
  }
}
