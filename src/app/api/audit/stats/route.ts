// ============================================
// AUDIT API: GET /api/audit/stats
// Aggregierte Statistiken für Dashboard
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/audit.service';

export async function GET(request: NextRequest) {
  try {
    const stats = await auditService.getStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[AuditAPI] Error in GET /api/audit/stats:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve audit statistics',
      },
      { status: 500 }
    );
  }
}
