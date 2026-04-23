import { NextRequest, NextResponse } from 'next/server';
import { ReconciliationService } from '@/reconciliation/services/reconciliation.service';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * POST /api/admin/reconciliation/[id]/mark
 * Markiert einen Payout manuell als resolved oder needs_review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth prüfen
    const auth = await verifyAdminAuth(request);
    if (!auth.valid) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const payoutId = params.id;
    const body = await request.json();

    // Validierung
    const { status, note } = body;
    if (!['resolved', 'needs_review'].includes(status)) {
      return NextResponse.json(
        {
          error: 'Invalid status. Must be "resolved" or "needs_review"',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const service = new ReconciliationService();
    const result = await service.markPayout(payoutId, { status, note }, auth.userId || 'unknown');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error marking payout:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Payout not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
