import { NextRequest, NextResponse } from 'next/server';
import { ReconciliationScheduler } from '@/reconciliation/schedulers/reconciliation.scheduler';
import { ReconciliationService } from '@/reconciliation/services/reconciliation.service';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * POST /api/admin/reconciliation/trigger
 * Löst eine manuelle Reconciliation aus
 */
export async function POST(request: NextRequest) {
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
    const scheduler = new ReconciliationScheduler(service);

    const result = await scheduler.triggerManually();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Reconciliation triggered successfully',
        result: result.result,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Reconciliation failed',
          code: 'RECONCILIATION_FAILED',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error triggering reconciliation:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
