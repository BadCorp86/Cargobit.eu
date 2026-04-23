/**
 * Execution Tracking API
 * POST /api/executions/[id]/tracking - Update location
 * GET /api/executions/[id]/tracking - Get tracking info
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExecutionEngine, LocationUpdate } from '@/services/execution-engine.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================
// GET - Get tracking info
// ============================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const tracking = await ExecutionEngine.getTracking(id);

    return NextResponse.json({ tracking });
  } catch (error) {
    console.error('[TrackingAPI] Error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { code: 'EXECUTION_NOT_FOUND', message: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Update location
// ============================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate location data
    const location: LocationUpdate = {
      lat: body.lat,
      lng: body.lng,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      speed: body.speed,
      heading: body.heading,
      accuracy: body.accuracy
    };

    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return NextResponse.json(
        { code: 'INVALID_LOCATION', message: 'lat and lng are required and must be numbers' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (location.lat < -90 || location.lat > 90) {
      return NextResponse.json(
        { code: 'INVALID_LOCATION', message: 'lat must be between -90 and 90' },
        { status: 400 }
      );
    }

    if (location.lng < -180 || location.lng > 180) {
      return NextResponse.json(
        { code: 'INVALID_LOCATION', message: 'lng must be between -180 and 180' },
        { status: 400 }
      );
    }

    // Update location
    await ExecutionEngine.updateLocation(id, location);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TrackingAPI] Error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { code: 'EXECUTION_NOT_FOUND', message: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// WebSocket support (for real-time tracking)
// ============================================

export const runtime = 'nodejs';

/*
 * For real-time tracking, the client should connect via WebSocket:
 * 
 * const ws = new WebSocket('wss://api.cargobit.com/ws/tracking/{executionId}');
 * 
 * ws.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   // data: { type: 'location_update', location: {...}, eta: '...' }
 * };
 * 
 * // Send location updates
 * ws.send(JSON.stringify({ type: 'location', lat: 52.5, lng: 13.4 }));
 */
