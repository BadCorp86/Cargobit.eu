/**
 * CargoBit Job Status API
 * POST /api/jobs/[id]/status - Update job status
 * 
 * Python equivalent:
 * @router.post("/jobs/{job_id}/status")
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackingService } from '@/services/tracking.service';
import type { TransportStatus, JobEventType } from '@prisma/client';

// ============================================
// POST /api/jobs/[id]/status
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: jobId } = await params;
    const body = await request.json();
    
    // Validate request
    const { status, eventType, description, latitude, longitude } = body as {
      status: TransportStatus;
      eventType?: JobEventType;
      description?: string;
      latitude?: number;
      longitude?: number;
    };
    
    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      );
    }
    
    // Python: update_status(...)
    const result = await trackingService.updateJobStatus(jobId, userId, {
      status,
      eventType,
      description,
      latitude,
      longitude,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    // Python: return {"status": job.status}
    return NextResponse.json({
      status: result.status,
      job_id: jobId,
      event_type: eventType,
    });
    
  } catch (error: any) {
    console.error('[API] POST /jobs/[id]/status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update status' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/jobs/[id]/status - Get timeline
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    
    const timeline = await trackingService.getJobTimeline(jobId);
    
    return NextResponse.json(timeline);
    
  } catch (error: any) {
    console.error('[API] GET /jobs/[id]/status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get timeline' },
      { status: 500 }
    );
  }
}
