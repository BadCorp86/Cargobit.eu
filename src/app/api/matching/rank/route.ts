import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RankCandidatesRequest, RankCandidatesResponse, RankedCandidate, RankingWeights, ApiErrorResponse } from '@/types/matching';

// Default ranking weights
const DEFAULT_WEIGHTS: RankingWeights = {
  distance: 0.2,
  reputation: 0.2,
  price: 0.15,
  experience: 0.15,
  language: 0.1,
  returnLoad: 0.1,
  history: 0.1
};

// POST /api/matching/rank - Rank candidates with scoring algorithm
export async function POST(request: NextRequest) {
  try {
    const body: RankCandidatesRequest = await request.json();

    if (!body.transportId || !body.candidates?.length) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required fields: transportId, candidates',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    // Get transport details
    const transport = await db.transport.findUnique({
      where: { id: body.transportId },
      include: {
        pickupAddress: true,
        deliveryAddress: true,
        transportDetail: true
      }
    });

    if (!transport) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'Transport not found',
        code: 'TRANSPORT_NOT_FOUND'
      }, { status: 404 });
    }

    // Merge weights
    const weights = { ...DEFAULT_WEIGHTS, ...body.rankingWeights };

    // Normalize weights to sum to 1
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
    Object.keys(weights).forEach(key => {
      weights[key as keyof RankingWeights] = (weights[key as keyof RankingWeights] || 0) / totalWeight;
    });

    const rankedCandidates: RankedCandidate[] = [];

    // Process each candidate
    for (const candidate of body.candidates) {
      // Get driver and vehicle details
      const driver = await db.driver.findUnique({
        where: { id: candidate.driverId },
        include: {
          user: true,
          driverVehicles: {
            where: { vehicleId: candidate.vehicleId },
            include: { vehicle: true }
          }
        }
      });

      if (!driver || !driver.driverVehicles.length) continue;

      const vehicle = driver.driverVehicles[0].vehicle;

      // Calculate individual scores (0-100)
      const distanceScore = await calculateDistanceScore(driver, transport);
      const reputationScore = calculateReputationScore(driver);
      const priceScore = await calculatePriceScore(driver, transport, vehicle);
      const experienceScore = calculateExperienceScore(driver);
      const languageScore = calculateLanguageScore(driver, transport);
      const returnLoadScore = calculateReturnLoadScore(driver, transport);
      const historyScore = calculateHistoryScore(driver, transport);

      // Calculate weighted total score
      const totalScore = Math.round(
        distanceScore * (weights.distance || 0) * 100 +
        reputationScore * (weights.reputation || 0) * 100 +
        priceScore * (weights.price || 0) * 100 +
        experienceScore * (weights.experience || 0) * 100 +
        languageScore * (weights.language || 0) * 100 +
        returnLoadScore * (weights.returnLoad || 0) * 100 +
        historyScore * (weights.history || 0) * 100
      );

      // Build match reasons
      const matchReasons: string[] = [];
      if (reputationScore >= 80) matchReasons.push('Exzellente Bewertung');
      if (experienceScore >= 80) matchReasons.push('Sehr erfahren');
      if (distanceScore >= 80) matchReasons.push('Nahe am Abholort');
      if (languageScore >= 80) matchReasons.push('Sprachkenntnisse passend');
      if (returnLoadScore >= 80) matchReasons.push('Rückladepotenzial');

      rankedCandidates.push({
        driverId: candidate.driverId,
        vehicleId: candidate.vehicleId,
        score: Math.min(100, totalScore),
        rank: 0, // Will be set after sorting
        scoreBreakdown: {
          distanceScore,
          reputationScore,
          priceScore,
          experienceScore,
          languageScore,
          returnLoadScore,
          historyScore
        },
        matchReasons,
        price: transport.shipperBudget ? transport.shipperBudget * 0.95 : undefined,
        estimatedArrival: new Date(Date.now() + 3600000).toISOString()
      });
    }

    // Sort by score and assign ranks
    rankedCandidates.sort((a, b) => b.score - a.score);
    rankedCandidates.forEach((candidate, index) => {
      candidate.rank = index + 1;
    });

    // Update matching candidates in database if there's a session
    const activeSession = await db.matchingSession.findFirst({
      where: {
        transportId: body.transportId,
        status: { in: ['STARTED', 'RUNNING'] }
      }
    });

    if (activeSession) {
      for (const candidate of rankedCandidates.slice(0, 20)) {
        await db.matchingCandidate.updateMany({
          where: {
            matchingSessionId: activeSession.id,
            driverId: candidate.driverId,
            vehicleId: candidate.vehicleId
          },
          data: {
            score: candidate.score,
            scoreBreakdown: JSON.stringify(candidate.scoreBreakdown)
          }
        }).catch(() => {});
      }
    }

    return NextResponse.json<RankCandidatesResponse>({
      transportId: body.transportId,
      rankedCandidates: rankedCandidates.slice(0, 50),
      rankingMethod: 'weighted_multi_factor'
    }, { status: 200 });

  } catch (error) {
    console.error('Rank candidates error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to rank candidates',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// ========== SCORING FUNCTIONS ==========

async function calculateDistanceScore(driver: any, transport: any): Promise<number> {
  // Check if driver has current location
  if (!driver.currentLocation) {
    return 50; // Default middle score
  }

  try {
    const driverLocation = JSON.parse(driver.currentLocation);
    const pickupLat = transport.pickupAddress.latitude;
    const pickupLng = transport.pickupAddress.longitude;

    if (!pickupLat || !pickupLng || !driverLocation.lat || !driverLocation.lng) {
      return 50;
    }

    // Calculate distance using Haversine formula
    const distance = calculateHaversineDistance(
      driverLocation.lat, driverLocation.lng,
      pickupLat, pickupLng
    );

    // Score based on distance: 100 for <50km, decreasing to 0 at >500km
    if (distance < 50) return 100;
    if (distance < 100) return 85;
    if (distance < 200) return 70;
    if (distance < 300) return 55;
    if (distance < 500) return 30;
    return 10;
  } catch {
    return 50;
  }
}

function calculateReputationScore(driver: any): number {
  // Based on rating (0-5 scale to 0-100)
  const ratingScore = driver.ratingAvg * 20;
  
  // Boost for high number of reviews
  const reviewBoost = Math.min(10, driver.ratingCount / 10);
  
  return Math.min(100, ratingScore + reviewBoost);
}

async function calculatePriceScore(driver: any, transport: any, vehicle: any): Promise<number> {
  // If shipper has a budget, estimate driver's price competitiveness
  if (!transport.shipperBudget) {
    return 70; // Default middle score
  }

  // Simple estimation based on vehicle type and driver history
  // In production, this would use actual driver pricing history
  const priceScore = 75 + (driver.completedTransports > 100 ? 10 : 0);
  
  return Math.min(100, priceScore);
}

function calculateExperienceScore(driver: any): number {
  // Based on completed transports
  const completedScore = Math.min(50, driver.completedTransports / 2);
  
  // Based on years of experience
  const yearsScore = Math.min(30, (driver.yearsExperience || 0) * 5);
  
  // International experience bonus
  const internationalBonus = driver.internationalExperience ? 20 : 0;
  
  return Math.min(100, completedScore + yearsScore + internationalBonus);
}

function calculateLanguageScore(driver: any, transport: any): number {
  const spokenLanguages = driver.spokenLanguages ? JSON.parse(driver.spokenLanguages) : [];
  const pickupCountry = transport.pickupAddress?.country;
  const deliveryCountry = transport.deliveryAddress?.country;

  if (!spokenLanguages.length) return 30;

  // Map countries to common languages
  const countryLanguages: Record<string, string[]> = {
    'DE': ['de'],
    'AT': ['de'],
    'CH': ['de'],
    'PL': ['pl'],
    'CZ': ['cz', 'cs'],
    'RO': ['ro'],
    'SI': ['sl'],
    'SK': ['sk'],
    'TR': ['tr'],
    'GR': ['el'],
    'FR': ['fr'],
    'EN': ['en']
  };

  const pickupLangs = countryLanguages[pickupCountry] || [];
  const deliveryLangs = countryLanguages[deliveryCountry] || [];
  const requiredLangs = [...new Set([...pickupLangs, ...deliveryLangs, 'en'])];

  const matchedLangs = requiredLangs.filter(lang => spokenLanguages.includes(lang));
  
  return Math.min(100, (matchedLangs.length / requiredLangs.length) * 100);
}

function calculateReturnLoadScore(driver: any, transport: any): number {
  // Check if driver's route has potential for return loads
  // This would use route optimization in production
  
  if (!driver.currentLocation) return 50;
  
  // Simple heuristic: if delivery is near driver's common routes
  const countryExperience = driver.countryExperience ? JSON.parse(driver.countryExperience) : [];
  const deliveryCountry = transport.deliveryAddress?.country;
  
  if (countryExperience.includes(deliveryCountry)) {
    return 80;
  }
  
  return 50;
}

function calculateHistoryScore(driver: any, transport: any): number {
  // Based on previous work with this shipper
  let score = 50;

  // Completed transports with low cancellation rate
  const cancellationRate = driver.completedTransports > 0 
    ? driver.cancelledTransports / driver.completedTransports 
    : 0;
  
  if (cancellationRate < 0.05) score += 30;
  else if (cancellationRate < 0.1) score += 15;
  else if (cancellationRate > 0.2) score -= 20;

  // Damage history
  if (driver.damageCount === 0) score += 10;
  else if (driver.damageCount > 3) score -= 15;

  // International experience
  if (driver.internationalExperience) score += 10;

  return Math.max(0, Math.min(100, score));
}

// Haversine distance calculation
function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
