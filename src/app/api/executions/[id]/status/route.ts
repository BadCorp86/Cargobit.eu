/**
 * Execution Status API
 * POST /api/executions/[id]/status - Update execution status
 * GET /api/executions/[id]/status - Get status timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExecutionEngine, ExecutionStatus } from '@/services/execution-engine.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================
// GET - Status timeline
// ============================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const timeline = await ExecutionEngine.getStatusTimeline(id);

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error('[StatusAPI] Error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Update status
// ============================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const status = body.status as ExecutionStatus;
    const reason = body.reason;
    const actorType = body.actorType || 'carrier';
    const actorId = body.actorId;
    const location = body.location;

    // Validate status
    const validStatuses: ExecutionStatus[] = [
      'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 
      'POD_SUBMITTED', 'COMPLETED', 'CANCELLED', 'DISPUTED'
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          code: 'INVALID_STATUS', 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Special handling for common transitions
    let execution;
    
    switch (status) {
      case 'ACCEPTED':
        execution = await ExecutionEngine.acceptJob(id, actorId);
        break;
      
      case 'PICKED_UP':
        execution = await ExecutionEngine.confirmPickup(id, actorId, location);
        break;
      
      case 'DELIVERED':
        execution = await ExecutionEngine.confirmDelivery(id, actorId, location);
        break;
      
      default:
        execution = await ExecutionEngine.updateStatus({
          executionId: id,
          status,
          reason,
          actorType,
          actorId
        });
    }

    return NextResponse.json({ execution });
  } catch (error) {
    console.error('[StatusAPI] Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid status transition')) {
        return NextResponse.json(
          { code: 'INVALID_TRANSITION', message: error.message },
          { status: 400 }
        );
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { code: 'EXECUTION_NOT_FOUND', message: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
