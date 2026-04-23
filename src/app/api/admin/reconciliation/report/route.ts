import { NextRequest, NextResponse } from 'next/server';
import { ReconciliationService } from '@/reconciliation/services/reconciliation.service';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * GET /api/admin/reconciliation/report
 * Generiert einen Reconciliation Report
 */
export async function GET(request: NextRequest) {
  try {
    // Auth prüfen
    const auth = await verifyAdminAuth(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const service = new ReconciliationService();
    const report = await service.generateReport();

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating reconciliation report:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
