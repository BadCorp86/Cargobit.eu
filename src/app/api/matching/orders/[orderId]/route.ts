/**
 * CargoBit Matching Engine API
 * POST /api/matching/orders/[orderId] - Calculate matches for an order
 * GET /api/matching/orders/[orderId] - Get existing matches for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { matchCarriers, MatchCarriersInput } from '@/services/matching-engine.service';

interface RouteParams {
  params: { orderId: string };
}

/**
 * GET /api/matching/orders/[orderId]
 * Get existing matches for an order
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = params;
    
    // Get matching session
    const session = await prisma.matchingSession.findFirst({
      where: { transportId: orderId },
      include: {
        candidates: {
          include: {
            driver: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            vehicle: true
          },
          orderBy: { score: 'desc' },
          take: 20
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!session) {
      return NextResponse.json({
        orderId,
        matches: [],
        status: 'no_matches'
      });
    }
    
    // Get explanations for candidates
    const candidateIds = session.candidates.map(c => c.driverId);
    const explanations = await prisma.matchingExplanation.findMany({
      where: {
        candidateId: { in: candidateIds }
      }
    });
    
    const explanationMap = new Map(explanations.map(e => [e.candidateId, e]));
    
    // Transform to response format
    const matches = session.candidates.map((candidate, index) => {
      const explanation = explanationMap.get(candidate.driverId);
      const scores = candidate.scoreBreakdown ? JSON.parse(candidate.scoreBreakdown) : {};
      
      return {
        rank: index + 1,
        carrierId: candidate.driverId,
        driverId: candidate.driverId,
        vehicleId: candidate.vehicleId,
        driverName: `${candidate.driver.user.firstName} ${candidate.driver.user.lastName}`,
        vehicleType: candidate.vehicle.type,
        
        totalScore: candidate.score,
        scores: {
          priceScore: scores.priceScore ?? 0,
          distanceScore: scores.distanceScore ?? 0,
          reliabilityScore: scores.reliabilityScore ?? 0,
          capacityScore: scores.capacityScore ?? 0,
          riskScore: scores.riskScore ?? 0
        },
        
        explanation: explanation ? {
          topReasons: JSON.parse(explanation.topReasons),
          details: {
            price: explanation.priceDetails ? JSON.parse(explanation.priceDetails) : undefined,
            distance: explanation.distanceDetails ? JSON.parse(explanation.distanceDetails) : undefined,
            reliability: explanation.reliabilityDetails ? JSON.parse(explanation.reliabilityDetails) : undefined,
            risk: explanation.riskDetails ? JSON.parse(explanation.riskDetails) : undefined
          }
        } : { topReasons: [], details: {} },
        
        warnings: explanation?.warnings ? JSON.parse(explanation.warnings) : [],
        status: candidate.status,
        expiresAt: candidate.expiresAt
      };
    });
    
    return NextResponse.json({
      orderId,
      matchingId: session.id,
      status: session.status.toLowerCase(),
      matches,
      totalMatches: matches.length,
      createdAt: session.createdAt,
      completedAt: session.completedAt
    });
    
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matching/orders/[orderId]
 * Calculate new matches for an order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = params;
    
    // Get transport details
    const transport = await prisma.transport.findUnique({
      where: { id: orderId },
      include: {
        pickupAddress: true,
        deliveryAddress: true,
        transportDetail: true
      }
    });
    
    if (!transport) {
      return NextResponse.json(
        { error: 'Transport not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // Parse request body for options
    let options = {};
    try {
      options = await request.json();
    } catch {
      // Use defaults if no body
    }
    
    // Build matching input
    const matchingInput: MatchCarriersInput = {
      transportId: orderId,
      
      pickupLocation: {
        lat: transport.pickupAddress.latitude ?? 0,
        lng: transport.pickupAddress.longitude ?? 0,
        country: transport.pickupAddress.country
      },
      deliveryLocation: {
        lat: transport.deliveryAddress.latitude ?? 0,
        lng: transport.deliveryAddress.longitude ?? 0,
        country: transport.deliveryAddress.country
      },
      
      weightKg: transport.transportDetail?.weightKg ?? 0,
      volumeM3: transport.transportDetail?.volumeM3 ?? undefined,
      
      vehicleRequirements: transport.transportDetail?.vehicleRequirements 
        ? JSON.parse(transport.transportDetail.vehicleRequirements)
        : undefined,
      driverRequirements: transport.transportDetail?.driverRequirements
        ? JSON.parse(transport.transportDetail.driverRequirements)
        : undefined,
      
      shipperBudget: transport.shipperBudget ?? undefined,
      
      ...options
    };
    
    // Run matching
    const result = await matchCarriers(matchingInput);
    
    // Transform response
    const response = {
      orderId: result.transportId,
      matchingId: result.matchingId,
      
      matches: result.matches.map(match => ({
        ...match,
        driverName: undefined, // Would be populated from DB in real implementation
        vehicleType: undefined
      })),
      
      stats: {
        totalCandidates: result.totalCandidates,
        filteredCandidates: result.filteredCandidates,
        qualifiedCandidates: result.qualifiedCandidates
      },
      
      config: {
        name: result.configUsed.name,
        weights: result.configUsed.weights,
        minScore: result.configUsed.minScore
      },
      
      durationMs: result.durationMs,
      
      // Auto-match info
      autoMatchCandidate: result.matches.find(m => m.autoMatchEligible) || null,
      
      // Scoring formula explanation
      scoringFormula: {
        formula: 'Score = w_p × S_price + w_d × S_distance + w_r × S_reliability + w_k × S_capacity + w_s × S_risk',
        weights: result.configUsed.weights,
        description: 'Alle Teil-Scores werden auf 0-1 normalisiert und gewichtet summiert.'
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error calculating matches:', error);
    return NextResponse.json(
      { error: 'Failed to calculate matches', message: (error as Error).message },
      { status: 500 }
    );
  }
}
