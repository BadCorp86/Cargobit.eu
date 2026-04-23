/**
 * CargoBit Dispatcher API - Accept Suggestion
 * ============================================
 * 
 * POST: Accept a matching suggestion
 * - Updates suggestion status
 * - Creates assignment
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
    
    const { dispatcherId, notes } = body;

    // In production:
    // 1. Validate suggestion exists and is pending
    // 2. Update status in database
    // 3. Create assignment record
    // 4. Emit Kafka event: suggestion.decision-made
    // 5. Update capacity tracking

    // Mock response
    const result = {
      success: true,
      suggestionId: id,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
      acceptedBy: dispatcherId || 'dispatcher_unknown',
      notes: notes || null,
      
      // Assignment details
      assignment: {
        id: `assign_${Date.now()}`,
        tourId: 'tour_DE_HH_01',
        orderId: 'order_789',
        estimatedDeparture: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
      
      // Revenue impact
      revenue: {
        additional: 187.50,
        currency: 'EUR',
      },
      
      // CO2 impact
      sustainability: {
        co2SavedKg: 4.2,
        detourKm: 12,
      },
    };

    // Emit Kafka event (mock)
    console.log('[Kafka] Emitting suggestion.decision-made:', {
      suggestionId: id,
      decision: 'accepted',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error accepting suggestion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to accept suggestion' },
      { status: 500 }
    );
  }
}
