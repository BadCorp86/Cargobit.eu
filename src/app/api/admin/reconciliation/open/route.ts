import { NextRequest, NextResponse } from 'next/server';
import { ReconciliationService } from '@/reconciliation/services/reconciliation.service';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * GET /api/admin/reconciliation/open
 * Listet alle offenen Payouts mit Status-Differenzen
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

    // Query Parameter
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const limit = searchParams.get('limit');

    const service = new ReconciliationService();
    const openPayouts = await service.listOpenPayouts({
      status,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
    });

    return NextResponse.json({
      success: true,
      data: openPayouts,
      count: openPayouts.length,
    });
  } catch (error) {
    console.error('Error listing open payouts:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
