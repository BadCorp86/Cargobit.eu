import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { StopMatchingRequest, StopMatchingResponse, ApiErrorResponse } from '@/types/matching';

// POST /api/matching/stop - Stop matching session
export async function POST(request: NextRequest) {
  try {
    const body: StopMatchingRequest = await request.json();

    if (!body.transportId) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required field: transportId',
        code: 'MISSING_TRANSPORT_ID'
      }, { status: 400 });
    }

    // Get active matching session
    const session = await db.matchingSession.findFirst({
      where: {
        transportId: body.transportId,
        status: { in: ['STARTED', 'RUNNING'] }
      }
    });

    if (!session) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'No active matching session found',
        code: 'NO_ACTIVE_SESSION'
      }, { status: 404 });
    }

    // Update session status
    await db.matchingSession.update({
      where: { id: session.id },
      data: {
        status: 'STOPPED',
        updatedAt: new Date()
      }
    });

    // Mark pending candidates as expired
    await db.matchingCandidate.updateMany({
      where: {
        matchingSessionId: session.id,
        status: 'PENDING'
      },
      data: { status: 'EXPIRED' }
    });

    return NextResponse.json<StopMatchingResponse>({
      matchingId: session.id,
      status: 'stopped',
      stoppedAt: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Stop matching error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to stop matching',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
