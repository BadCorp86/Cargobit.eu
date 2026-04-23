/**
 * CargoBit Job Detail API Routes
 * GET   /api/jobs/[id]  - Get job details
 * PATCH /api/jobs/[id]  - Update job status
 * DELETE /api/jobs/[id] - Cancel job
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobsService, type JobStatus } from '@/services/jobs.service';

// ============================================
// GET /api/jobs/[id] - Get job details
// ============================================

export async function GET(
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
    
    const { id } = await params;
    const job = await jobsService.getJob(id, userId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ job });
    
  } catch (error: any) {
    console.error('[API] GET /jobs/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/jobs/[id] - Update job status
// ============================================

export async function PATCH(
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
    
    const { id } = await params;
    const body = await request.json();
    
    const newStatus = body.status as JobStatus;
    const note = body.note;
    
    if (!newStatus) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      );
    }
    
    const validStatuses: JobStatus[] = [
      'open', 'matched', 'booked', 'in_progress', 'completed', 'canceled'
    ];
    
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Valid values: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    
    const result = await jobsService.updateJobStatus(id, newStatus, userId, note);
    
    return NextResponse.json({
      success: result.success,
      newStatus: result.newStatus,
    });
    
  } catch (error: any) {
    console.error('[API] PATCH /jobs/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update job' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/jobs/[id] - Cancel job
// ============================================

export async function DELETE(
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
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'Canceled by user';
    
    const result = await jobsService.cancelJob(id, userId, reason);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('[API] DELETE /jobs/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
