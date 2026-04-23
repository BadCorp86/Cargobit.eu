/**
 * CargoBit Job Matches API - PRODUCTION READY
 * GET /api/jobs/[id]/matches
 * 
 * Python equivalent:
 * @router.get("/{job_id}/matches")
 * def get_matches(job_id: str, db: Session = Depends(get_db)):
 *     job = get_job(db, job_id)
 *     if not job:
 *         raise HTTPException(404, "Job not found")
 *     
 *     candidates = get_candidate_transporters(db, job)
 *     ranked = rank_transporters(job, candidates)
 *     
 *     return [transporter_to_dto(t, score) for t, score in ranked[:10]]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  getJob,
  getCandidateTransporters,
  rankTransporters,
  transporterToDto,
  type Job,
} from '@/services/matching-ml.service';

// ============================================
// GET /api/jobs/[id]/matches
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    
    // Python: job = get_job(db, job_id)
    const transport = await getJob(jobId);
    
    // Python: if not job: raise HTTPException(404, "Job not found")
    if (!transport) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Build Job object for matching
    const job: Job = {
      id: transport.id,
      originRegion: transport.pickupAddress.country,
      destinationRegion: transport.deliveryAddress.country,
      weightKg: transport.transportDetail?.weightKg ?? 0,
      distanceKm: transport.distanceKm ?? undefined,
    };
    
    // Python: candidates = get_candidate_transporters(db, job)
    const candidates = await getCandidateTransporters(job, transport.shipperUserId);
    
    // Python: ranked = rank_transporters(job, candidates)
    const ranked = await rankTransporters(job, candidates);
    
    // Python: return [transporter_to_dto(t, score) for t, score in ranked[:10]]
    const matches = ranked.slice(0, 10).map(({ transporter, score }) => 
      transporterToDto(transporter, score)
    );
    
    return NextResponse.json(matches);
    
  } catch (error: any) {
    console.error('[API] GET /jobs/[id]/matches error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
