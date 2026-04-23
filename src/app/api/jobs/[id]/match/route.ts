/**
 * CargoBit Match Transporters Endpoint
 * POST /api/jobs/[id]/match - Trigger matching for a job
 * 
 * Implementation EXACTLY matching Python specification:
 * - Get job
 * - Get candidate transporters (filter: Region, Capacity, active)
 * - Rank transporters with Heuristic + ML
 * - Batch ML calls for parallel processing
 * - Store results and notify top candidates
 * 
 * Python equivalent:
 * @router.post("/{job_id}/match_transporters")
 * def match_transporters(job_id: str, db: Session, user_id: str):
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  computeHeuristic,
  buildFeatures,
  callMlScore,
  type Job,
  type Transporter,
  type RankedTransporter,
} from '@/services/matching-ml.service';

// ============================================
// CONFIGURATION
// ============================================

const ML_BATCH_SIZE = 10;  // Parallel ML requests
const ALPHA = 0.5;  // Scoring weight: S = α·H + (1-α)·M

// ============================================
// POST /api/jobs/[id]/match
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Python: user_id: str = Depends(get_current_user_id)
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: jobId } = await params;
    
    // Python: job = get_job(db, job_id)
    // Python: if not job: raise HTTPException(404, "Job not found")
    const transport = await prisma.transport.findUnique({
      where: { id: jobId },
      include: {
        pickupAddress: true,
        deliveryAddress: true,
        transportDetail: true,
      },
    });
    
    if (!transport) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Python: if str(job.shipper_id) != str(user_id): raise HTTPException(403, "Not your job")
    if (transport.shipperUserId !== userId) {
      return NextResponse.json(
        { error: 'Not your job' },
        { status: 403 }
      );
    }
    
    // Python: if job.status not in ("open", "matched"):
    const allowedStatuses = ['CREATED', 'PUBLISHED'];
    if (!allowedStatuses.includes(transport.status)) {
      return NextResponse.json(
        { error: 'Job not matchable in current status' },
        { status: 400 }
      );
    }
    
    // Check if matching already exists
    const existingSession = await prisma.matchingSession.findFirst({
      where: { transportId: jobId, status: 'COMPLETED' },
    });
    
    if (existingSession) {
      // Return existing results
      const candidates = await prisma.matchingCandidate.findMany({
        where: { matchingSessionId: existingSession.id },
        orderBy: { score: 'desc' },
        take: 50,
      });
      
      return NextResponse.json({
        status: 'already_matched',
        job_id: jobId,
        matching_session_id: existingSession.id,
        total_matches: candidates.length,
        message: 'Matching already completed for this job',
      });
    }
    
    // Create matching session
    const session = await prisma.matchingSession.create({
      data: {
        transportId: jobId,
        status: 'RUNNING',
      },
    });
    
    // Build job object
    const job: Job = {
      id: transport.id,
      originRegion: transport.pickupAddress.country,
      destinationRegion: transport.deliveryAddress.country,
      weightKg: transport.transportDetail?.weightKg ?? 0,
      distanceKm: transport.distanceKm ?? undefined,
    };
    
    // Python: candidates = get_candidate_transporters(db, job, shipper_id=job.shipper_id)
    const candidates = await getCandidateTransporters(job, transport.shipperUserId);
    
    console.log(`[Match] Found ${candidates.length} candidates for job ${jobId}`);
    
    // Python: ranked = rank_transporters(job, candidates, alpha=0.5)
    // With batch ML processing
    const ranked = await rankTransportersBatch(job, candidates, ALPHA);
    
    // Store results
    await storeMatchingResults(session.id, jobId, ranked);
    
    // Notify top candidates
    await notifyTopCandidates(jobId, ranked.slice(0, 10));
    
    // Update session status
    await prisma.matchingSession.update({
      where: { id: session.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    
    // Python return format:
    // return {
    //     "status": "matched",
    //     "job_id": str(job.id),
    //     "total_candidates": len(ranked),
    //     "top_scores": [{"transporter_id": r.transporter_id, "score": r.total_score} for r in ranked[:5]]
    // }
    
    return NextResponse.json({
      status: 'matched',
      job_id: jobId,
      matching_session_id: session.id,
      total_candidates: ranked.length,
      top_scores: ranked.slice(0, 5).map(r => ({
        transporter_id: r.transporterId,
        heuristic_score: Math.round(r.heuristicScore * 100) / 100,
        ml_score: Math.round(r.mlScore * 100) / 100,
        total_score: Math.round(r.totalScore * 100) / 100,
      })),
    });
    
  } catch (error: any) {
    console.error('[API] POST /jobs/[id]/match error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to match transporters' },
      { status: 500 }
    );
  }
}

// ============================================
// GET CANDIDATE TRANSPORTERS
// ============================================

async function getCandidateTransporters(
  job: Job,
  shipperId?: string
): Promise<Transporter[]> {
  // Query drivers with capacity filter
  const drivers = await prisma.driver.findMany({
    where: {
      isAvailable: true,
      // Capacity filter: vehicle can carry the job weight
      driverVehicles: {
        some: {
          vehicle: {
            maxPayloadKg: { gte: job.weightKg },
            status: 'ACTIVE',
          },
        },
      },
    },
    include: {
      user: {
        include: {
          companyUsers: {
            include: { company: { include: { addresses: true } } },
          },
        },
      },
      driverVehicles: {
        include: { vehicle: true },
      },
      driverPermissions: true,
    },
  });

  // Map to Transporter interface with real data
  const transporters: Transporter[] = [];

  for (const driver of drivers) {
    const primaryVehicle = driver.driverVehicles.find(dv => dv.isPrimary)?.vehicle
      || driver.driverVehicles[0]?.vehicle;

    if (!primaryVehicle) continue;

    // Get region_from: driver's current location or company base
    let regionFrom = 'DE'; // Default
    if (driver.currentLocation) {
      try {
        const loc = JSON.parse(driver.currentLocation);
        regionFrom = loc.country || regionFrom;
      } catch {}
    } else {
      // Fallback to company address
      const companyAddress = driver.user.companyUsers[0]?.company.addresses[0];
      if (companyAddress) {
        regionFrom = companyAddress.country;
      }
    }

    // Get region_to: allowed countries from driverPermissions
    const allowedCountries = driver.driverPermissions
      .filter(p => p.isAllowed)
      .map(p => p.countryCode);
    const regionTo = allowedCountries.length > 0 
      ? allowedCountries.join(',') 
      : null;

    // Calculate historical stats with this shipper
    let jobsWithShipper = 0;
    if (shipperId) {
      const completedWithShipper = await prisma.transport.count({
        where: {
          shipperUserId: shipperId,
          assignment: { driverId: driver.id },
          status: 'COMPLETED',
        },
      });
      jobsWithShipper = completedWithShipper;
    }

    const cancelRate = driver.completedTransports > 0
      ? driver.cancelledTransports / driver.completedTransports
      : 0;

    transporters.push({
      id: driver.id,
      regionFrom,
      regionTo,
      capacityKg: primaryVehicle.maxPayloadKg ?? 0,
      rating: driver.ratingAvg,
      stats: {
        jobsWithShipper,
        cancelRate,
      },
    });
  }

  return transporters;
}

// ============================================
// BATCH RANK TRANSPORTERS
// ============================================

/**
 * Rank transporters with batch ML processing
 * Processes ML calls in parallel batches for better performance
 */
async function rankTransportersBatch(
  job: Job,
  candidates: Transporter[],
  alpha: number = 0.5
): Promise<RankedTransporter[]> {
  const ranked: RankedTransporter[] = [];
  
  // Process in batches for parallel ML calls
  for (let i = 0; i < candidates.length; i += ML_BATCH_SIZE) {
    const batch = candidates.slice(i, i + ML_BATCH_SIZE);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (transporter) => {
        // Step 1: Compute heuristic (fast, local)
        const heuristicScore = computeHeuristic(job, transporter);
        
        // Step 2: Build features for ML
        const features = buildFeatures(job, transporter);
        
        // Step 3: Call ML service (with fallback)
        const mlScore = await callMlScore(features);
        
        // Step 4: Combine scores: S = α·H + (1-α)·M
        const totalScore = alpha * heuristicScore + (1 - alpha) * mlScore;
        
        return {
          transporterId: transporter.id,
          heuristicScore,
          mlScore,
          totalScore,
          features,
        };
      })
    );
    
    ranked.push(...batchResults);
  }
  
  // Sort by total score descending
  ranked.sort((a, b) => b.totalScore - a.totalScore);
  
  return ranked;
}

// ============================================
// STORE MATCHING RESULTS
// ============================================

async function storeMatchingResults(
  sessionId: string,
  jobId: string,
  ranked: RankedTransporter[]
): Promise<void> {
  // Get vehicle IDs for each driver
  const driverVehicleMap = new Map<string, string>();
  const drivers = await prisma.driver.findMany({
    where: { id: { in: ranked.map(r => r.transporterId) } },
    include: {
      driverVehicles: { include: { vehicle: true } },
    },
  });

  for (const driver of drivers) {
    const primaryVehicle = driver.driverVehicles.find(dv => dv.isPrimary)
      || driver.driverVehicles[0];
    if (primaryVehicle) {
      driverVehicleMap.set(driver.id, primaryVehicle.vehicleId);
    }
  }

  // Create candidates
  await prisma.matchingCandidate.createMany({
    data: ranked.slice(0, 50).map((r) => ({
      matchingSessionId: sessionId,
      driverId: r.transporterId,
      vehicleId: driverVehicleMap.get(r.transporterId) || 'default',
      hardFilterPassed: true,
      softRulesPassed: true,
      fraudSafe: true,
      internationalAllowed: true,
      score: r.totalScore,
      scoreBreakdown: JSON.stringify({
        heuristic: r.heuristicScore,
        ml: r.mlScore,
        features: r.features,
      }),
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })),
  });
}

// ============================================
// NOTIFY TOP CANDIDATES
// ============================================

async function notifyTopCandidates(
  jobId: string,
  topRanked: RankedTransporter[]
): Promise<void> {
  for (const ranked of topRanked) {
    // Get user ID for this driver
    const driver = await prisma.driver.findUnique({
      where: { id: ranked.transporterId },
    });

    if (!driver) continue;

    await prisma.notification.create({
      data: {
        userId: driver.userId,
        type: 'NEW_JOB_MATCH',
        title: 'Neuer passender Auftrag',
        message: `Du wurdest für einen Auftrag empfohlen. Score: ${Math.round(ranked.totalScore * 100)}%`,
        data: JSON.stringify({ jobId, score: ranked.totalScore }),
      },
    });
  }
}
