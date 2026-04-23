/**
 * CargoBit Job Bids API
 * GET /api/jobs/[id]/bids - Get all bids for a job
 */

import { NextRequest, NextResponse } from 'next/server';
import { bidsService } from '@/services/bids.service';

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
    
    const { id: jobId } = await params;
    const bids = await bidsService.getBidsForJob(jobId, userId);
    
    return NextResponse.json({
      jobId,
      bids,
      total: bids.length,
    });
    
  } catch (error: any) {
    console.error('[API] GET /jobs/[id]/bids error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bids' },
      { status: 500 }
    );
  }
}
