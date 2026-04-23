/**
 * CargoBit Dispatcher API - Reject Suggestion
 * ============================================
 * 
 * POST: Reject a matching suggestion
 * - Updates suggestion status
 * - Logs rejection reason
 * - Emits Kafka event
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    
    const { dispatcherId, reason, notes } = body;

    // In production:
    // 1. Validate suggestion exists and is pending
    // 2. Update status in database
    // 3. Log rejection for analytics
    // 4. Emit Kafka event: suggestion.decision-made

    // Validate reason
    const validReasons = [
      'CAPACITY_UNAVAILABLE',
      'TIME_CONFLICT',
      'ROUTE_INFEASIBLE',
      'CUSTOMER_REQUEST',
      'ECONOMIC_REASON',
      'OTHER',
    ];

    const rejectionReason = reason || 'OTHER';

    const result = {
      success: true,
      suggestionId: id,
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedBy: dispatcherId || 'dispatcher_unknown',
      reason: rejectionReason,
      notes: notes || null,
    };

    // Emit Kafka event (mock)
    console.log('[Kafka] Emitting suggestion.decision-made:', {
      suggestionId: id,
      decision: 'rejected',
      reason: rejectionReason,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error rejecting suggestion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject suggestion' },
      { status: 500 }
    );
  }
}
