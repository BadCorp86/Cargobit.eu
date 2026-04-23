/**
 * Execution API Routes
 * OpenAPI Spec: /download/openapi-execution-service.yaml
 * 
 * POST /api/executions - Create execution
 * GET /api/executions - List executions
 * GET /api/executions?carrierId=xxx&status=active - Get carrier active executions
 * GET /api/executions?orderId=xxx - Get execution by order ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExecutionEngine, CreateExecutionInput } from '@/services/execution-engine.service';

// ============================================
// GET /api/executions - List executions
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carrierId = searchParams.get('carrierId');
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get by order ID
    if (orderId) {
      const execution = await ExecutionEngine.getByOrderId(orderId);
      if (!execution) {
        return NextResponse.json(
          { code: 'EXECUTION_NOT_FOUND', message: 'Execution not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ execution });
    }

    // Get carrier's active executions
    if (carrierId && status === 'active') {
      const executions = await ExecutionEngine.getCarrierActiveExecutions(carrierId);
      return NextResponse.json({ executions, total: executions.length });
    }

    // Get carrier history
    if (carrierId && status === 'completed') {
      const result = await ExecutionEngine.getCarrierHistory(carrierId, limit, offset);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { code: 'INVALID_REQUEST', message: 'Missing required parameters (carrierId or orderId)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[ExecutionsAPI] Error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/executions - Create execution
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const input: CreateExecutionInput = {
      orderId: body.orderId,
      carrierId: body.carrierId,
      vehicleId: body.vehicleId,
      pickupTimePlanned: body.pickupTimePlanned ? new Date(body.pickupTimePlanned) : undefined,
      deliveryTimePlanned: body.deliveryTimePlanned ? new Date(body.deliveryTimePlanned) : undefined,
      plannedDistanceKm: body.plannedDistanceKm
    };

    if (!input.orderId || !input.carrierId) {
      return NextResponse.json(
        { code: 'INVALID_REQUEST', message: 'orderId and carrierId are required' },
        { status: 400 }
      );
    }

    // Create execution
    const execution = await ExecutionEngine.createExecution(input);

    // Publish execution.created event
    const { EventPublisher } = await import('@/services/event-bus.service');
    await EventPublisher.publishExecutionCreated({
      executionId: execution.id,
      orderId: input.orderId,
      transportId: execution.transportId,
      carrierId: input.carrierId || '',
      driverId: input.carrierId || '', // Would be actual driver
      vehicleId: input.vehicleId || '',
      status: 'CREATED',
      agreedPrice: execution.agreedPrice || 0,
      currency: 'EUR',
      scheduledPickup: execution.pickupTimePlanned?.toISOString() || '',
      trackingEnabled: true,
    } as any);

    return NextResponse.json(execution, { status: 201 });
  } catch (error) {
    console.error('[ExecutionsAPI] Error:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { code: 'EXECUTION_EXISTS', message: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
