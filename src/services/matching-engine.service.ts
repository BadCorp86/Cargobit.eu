/**
 * CargoBit Matching Engine Service
 * Advanced Carrier Matching with Scoring Algorithm
 * 
 * Scoring Model:
 * Score = w_p * S_price + w_d * S_distance + w_r * S_reliability + w_k * S_capacity + w_s * S_risk
 * 
 * Weights: w_p=0.25, w_d=0.15, w_r=0.25, w_k=0.15, w_s=0.20
 * 
 * IMPORTANT INTEGRATION RULE:
 * Matching-Engine uses priceScore from Pricing-Service
 * NEVER use raw bid_price_eur directly in scoring formula
 * Raw price is only for UI & Reporting
 */

import { prisma } from '@/lib/db';
import {
  ScoringWeights,
  ScoreComponents,
  MatchingFeatures,
  CarrierForMatching,
  MatchResult,
  MatchExplanation,
  MatchingConfig,
  DEFAULT_WEIGHTS,
  calculateTotalScore,
  normalizeDistanceScore,
  normalizeReliabilityScore,
  normalizeCapacityScore,
  normalizeRiskScore,
  explainMatch,
  getPriceScoreFromPricingService
} from '@/types/matching-engine';
import {
  getOrderPricing,
  calculatePriceScore
} from '@/services/pricing-engine.service';
import { roundToCents } from '@/types/pricing-engine';

// ============================================
// MAIN MATCHING FUNCTION
// ============================================

export interface MatchCarriersInput {
  transportId: string;
  
  // Location data
  pickupLocation: { lat: number; lng: number; country: string };
  deliveryLocation: { lat: number; lng: number; country: string };
  
  // Cargo data
  weightKg: number;
  volumeM3?: number;
  
  // Requirements
  vehicleRequirements?: {
    vehicleTypes?: string[];
    minPayloadKg?: number;
    minVolumeM3?: number;
    adrRequired?: boolean;
    coolingRequired?: boolean;
    craneRequired?: boolean;
    liftRequired?: boolean;
  };
  driverRequirements?: {
    minRating?: number;
    minCompletedOrders?: number;
    adrLicenseRequired?: boolean;
    internationalExperience?: boolean;
    languages?: string[];
  };
  
  // Pricing
  shipperBudget?: number;
  
  // Options
  configName?: string;
  autoAssign?: boolean;
  maxCandidates?: number;
}

export interface MatchCarriersOutput {
  transportId: string;
  matchingId: string;
  matches: MatchResult[];
  totalCandidates: number;
  filteredCandidates: number;
  qualifiedCandidates: number;
  configUsed: MatchingConfig;
  durationMs: number;
}

/**
 * Main matching function - finds and scores carriers for a transport order
 */
export async function matchCarriers(input: MatchCarriersInput): Promise<MatchCarriersOutput> {
  const startTime = Date.now();
  
  console.log(`[MatchingEngine] Starting matching for transport ${input.transportId}`);
  
  // Step 1: Load matching configuration
  const config = await loadMatchingConfig(input.configName);
  console.log(`[MatchingEngine] Using config: ${config.name}`);
  
  // Step 2: Find candidate carriers
  const candidates = await findCandidateCarriers(input);
  console.log(`[MatchingEngine] Found ${candidates.length} candidate carriers`);
  
  const totalCandidates = candidates.length;
  
  // Step 3: Filter candidates (hard filters)
  const filteredCandidates = filterCandidates(candidates, input);
  console.log(`[MatchingEngine] After filtering: ${filteredCandidates.length} candidates`);
  
  // Step 4: Calculate market price data
  const marketData = await calculateMarketData(input);
  
  // Step 5: Score each candidate
  const scoredMatches: MatchResult[] = [];
  
  for (const candidate of filteredCandidates) {
    const matchResult = await scoreCandidate(candidate, input, marketData, config);
    if (matchResult && matchResult.totalScore >= config.minScore) {
      scoredMatches.push(matchResult);
    }
  }
  
  console.log(`[MatchingEngine] ${scoredMatches.length} candidates passed scoring threshold`);
  
  // Step 6: Sort by score
  scoredMatches.sort((a, b) => b.totalScore - a.totalScore);
  
  // Step 7: Assign ranks and check auto-match eligibility
  scoredMatches.forEach((match, index) => {
    match.rank = index + 1;
    
    // Check if eligible for auto-match
    if (config.enableAutoMatch && index === 0 && scoredMatches.length > 1) {
      const gapToSecond = match.totalScore - scoredMatches[1].totalScore;
      match.autoMatchEligible = gapToSecond >= config.autoMatchGap;
    } else {
      match.autoMatchEligible = false;
    }
  });
  
  // Step 8: Store results
  const matchingId = await storeMatchingResults(input.transportId, scoredMatches, config);
  
  const durationMs = Date.now() - startTime;
  
  return {
    transportId: input.transportId,
    matchingId,
    matches: scoredMatches.slice(0, input.maxCandidates || 20),
    totalCandidates,
    filteredCandidates: filteredCandidates.length,
    qualifiedCandidates: scoredMatches.length,
    configUsed: config,
    durationMs
  };
}

// ============================================
// CANDIDATE FINDING
// ============================================

async function findCandidateCarriers(input: MatchCarriersInput): Promise<CarrierForMatching[]> {
  // Build query for available drivers with vehicles
  const drivers = await prisma.driver.findMany({
    where: {
      isAvailable: true,
      // Additional filters can be added here
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      company: {
        select: {
          id: true,
          name: true
        }
      },
      driverVehicles: {
        include: {
          vehicle: true
        }
      },
      carrierStats: true,
      carrierCapacity: true
    }
  });
  
  // Get risk scores for all drivers
  const driverIds = drivers.map(d => d.id);
  const riskScores = await prisma.riskScore.findMany({
    where: {
      entityType: 'USER',
      entityId: { in: driverIds }
    }
  });
  
  const riskScoreMap = new Map(riskScores.map(r => [r.entityId, r]));
  
  // Transform to CarrierForMatching format
  const carriers: CarrierForMatching[] = [];
  
  for (const driver of drivers) {
    const primaryVehicle = driver.driverVehicles.find(dv => dv.isPrimary) || driver.driverVehicles[0];
    if (!primaryVehicle) continue;
    
    const vehicle = primaryVehicle.vehicle;
    const riskScore = riskScoreMap.get(driver.userId);
    
    // Parse current location if available
    let currentLocation: CarrierForMatching['currentLocation'];
    if (driver.currentLocation) {
      try {
        const loc = JSON.parse(driver.currentLocation);
        currentLocation = {
          lat: loc.lat,
          lng: loc.lng,
          timestamp: new Date(loc.timestamp)
        };
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    carriers.push({
      driverId: driver.id,
      vehicleId: vehicle.id,
      driverName: `${driver.user.firstName} ${driver.user.lastName}`,
      companyName: driver.company?.name,
      
      stats: {
        onTimeRate: driver.carrierStats?.onTimeRate ?? 0.8,
        cancelRate: driver.carrierStats?.cancelRate ?? 0.05,
        disputeRate: driver.carrierStats?.disputeRate ?? 0,
        completedOrders: driver.carrierStats?.completedOrders ?? driver.completedTransports,
        avgRating: driver.carrierStats?.avgRating ?? driver.ratingAvg,
        avgResponseTime: driver.carrierStats?.avgResponseTime ?? 30,
        acceptanceRate: driver.carrierStats?.acceptanceRate ?? 0.8,
        trendOnTime: driver.carrierStats?.trendOnTime ?? 0,
        trendRating: driver.carrierStats?.trendRating ?? 0
      },
      
      capacity: {
        maxWeightKg: vehicle.maxPayloadKg ?? driver.carrierCapacity?.maxWeightKg ?? 0,
        maxVolumeM3: vehicle.volumeM3 ?? driver.carrierCapacity?.maxVolumeM3 ?? 0,
        vehicleType: vehicle.type,
        hasAdr: vehicle.adrApproved || (driver.carrierCapacity?.hasAdr ?? false),
        hasCooling: vehicle.coolingAvailable || (driver.carrierCapacity?.hasCooling ?? false),
        hasLift: vehicle.hasLift || (driver.carrierCapacity?.hasLift ?? false),
        hasCrane: vehicle.hasCrane || (driver.carrierCapacity?.hasCrane ?? false),
        isAvailable: driver.carrierCapacity?.isAvailable ?? true,
        currentLoadWeight: driver.carrierCapacity?.currentLoadWeight ?? 0,
        currentLoadVolume: driver.carrierCapacity?.currentLoadVolume ?? 0
      },
      
      currentLocation,
      
      riskLevel: riskScore?.riskLevel ?? 'GREEN',
      riskScore: riskScore?.score ?? 0
    });
  }
  
  return carriers;
}

// ============================================
// FILTERING
// ============================================

function filterCandidates(
  carriers: CarrierForMatching[],
  input: MatchCarriersInput
): CarrierForMatching[] {
  return carriers.filter(carrier => {
    // 1. Capacity filter
    if (input.weightKg > carrier.capacity.maxWeightKg) {
      return false;
    }
    if (input.volumeM3 && input.volumeM3 > carrier.capacity.maxVolumeM3) {
      return false;
    }
    
    // 2. Vehicle requirements filter
    if (input.vehicleRequirements) {
      const req = input.vehicleRequirements;
      
      if (req.vehicleTypes?.length && !req.vehicleTypes.includes(carrier.capacity.vehicleType)) {
        return false;
      }
      if (req.adrRequired && !carrier.capacity.hasAdr) {
        return false;
      }
      if (req.coolingRequired && !carrier.capacity.hasCooling) {
        return false;
      }
      if (req.craneRequired && !carrier.capacity.hasCrane) {
        return false;
      }
      if (req.liftRequired && !carrier.capacity.hasLift) {
        return false;
      }
    }
    
    // 3. Driver requirements filter
    if (input.driverRequirements) {
      const req = input.driverRequirements;
      
      if (req.minRating && carrier.stats.avgRating < req.minRating) {
        return false;
      }
      if (req.minCompletedOrders && carrier.stats.completedOrders < req.minCompletedOrders) {
        return false;
      }
    }
    
    // 4. Availability filter
    if (!carrier.capacity.isAvailable) {
      return false;
    }
    
    // 5. Risk filter (red risk is excluded unless explicitly allowed)
    if (carrier.riskLevel === 'RED') {
      return false;
    }
    
    return true;
  });
}

// ============================================
// MARKET DATA
// ============================================

interface MarketData {
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
}

async function calculateMarketData(input: MatchCarriersInput): Promise<MarketData> {
  // In a real implementation, this would query historical data
  // For now, estimate based on distance and weight
  
  const distance = calculateDistance(
    input.pickupLocation.lat, input.pickupLocation.lng,
    input.deliveryLocation.lat, input.deliveryLocation.lng
  );
  
  // Simple pricing model: base + per km + per kg
  const basePrice = 50;
  const pricePerKm = 1.2;
  const pricePerKg = 0.05;
  
  const estimatedPrice = basePrice + (distance * pricePerKm) + (input.weightKg * pricePerKg);
  
  return {
    medianPrice: estimatedPrice,
    minPrice: estimatedPrice * 0.7,
    maxPrice: estimatedPrice * 1.5
  };
}

// ============================================
// SCORING
// ============================================

/**
 * Calculate priceScore from Pricing-Service
 * 
 * IMPORTANT: Matching-Engine MUST use priceScore from Pricing-Service
 * NEVER use raw bid_price_eur directly in the scoring formula
 * Raw price is only for UI & Reporting
 */
async function calculatePriceScoreFromPricingService(
  transportId: string,
  bidPrice: number
): Promise<{ priceScore: number; marketPrice: number; minPrice: number; startPrice: number } | null> {
  // Get pricing context from Pricing-Service
  const pricingContext = await getOrderPricing(transportId);
  
  if (!pricingContext) {
    console.warn(`[MatchingEngine] No pricing context found for transport ${transportId}`);
    return null;
  }
  
  // Calculate priceScore using Pricing-Service logic
  // This ensures consistency between bid validation and matching
  const priceScore = calculatePriceScore(
    bidPrice,
    pricingContext.marketPrice,
    pricingContext.adjustedMinPrice,
    pricingContext.adjustedStartPrice
  );
  
  return {
    priceScore: roundToCents(priceScore),
    marketPrice: pricingContext.marketPrice,
    minPrice: pricingContext.adjustedMinPrice,
    startPrice: pricingContext.adjustedStartPrice
  };
}

async function scoreCandidate(
  carrier: CarrierForMatching,
  input: MatchCarriersInput,
  marketData: MarketData,
  config: MatchingConfig
): Promise<MatchResult | null> {
  
  // Calculate distance features
  let distanceToPickup = 0;
  let detourPercent = 0;
  
  if (carrier.currentLocation) {
    distanceToPickup = calculateDistance(
      carrier.currentLocation.lat, carrier.currentLocation.lng,
      input.pickupLocation.lat, input.pickupLocation.lng
    );
    
    // Estimate detour (simplified)
    const directDistance = calculateDistance(
      input.pickupLocation.lat, input.pickupLocation.lng,
      input.deliveryLocation.lat, input.deliveryLocation.lng
    );
    detourPercent = Math.min((distanceToPickup / directDistance) * 20, 50);
  }
  
  // Calculate price (use offer if available, otherwise estimate)
  const carrierPrice = carrier.offeredPrice ?? marketData.medianPrice * 1.1;
  
  // ============================================
  // IMPORTANT: Get priceScore from Pricing-Service
  // NEVER use raw bid_price_eur directly in scoring formula
  // ============================================
  let priceScore: number;
  let pricingData: { marketPrice: number; minPrice: number; startPrice: number } | null = null;
  
  const pricingResult = await calculatePriceScoreFromPricingService(input.transportId, carrierPrice);
  
  if (pricingResult) {
    // Use priceScore from Pricing-Service (authoritative source)
    priceScore = pricingResult.priceScore;
    pricingData = {
      marketPrice: pricingResult.marketPrice,
      minPrice: pricingResult.minPrice,
      startPrice: pricingResult.startPrice
    };
  } else {
    // Fallback: use local calculation (should not happen in production)
    console.warn(`[MatchingEngine] Using fallback price calculation for transport ${input.transportId}`);
    priceScore = getPriceScoreFromPricingService(
      carrierPrice,
      marketData.medianPrice,
      marketData.minPrice,
      marketData.maxPrice
    );
  }
  
  // Build features (for explanation only, NOT for scoring)
  const features: MatchingFeatures = {
    carrierPrice,
    medianMarketPrice: pricingData?.marketPrice ?? marketData.medianPrice,
    pricePercentile: carrierPrice <= marketData.medianPrice 
      ? (carrierPrice - marketData.minPrice) / (marketData.medianPrice - marketData.minPrice)
      : 1 - ((carrierPrice - marketData.medianPrice) / (marketData.maxPrice - marketData.medianPrice)),
    
    distanceToPickupKm: distanceToPickup,
    detourKm: distanceToPickup * 0.2,
    detourPercent,
    
    onTimeRate: carrier.stats.onTimeRate,
    cancelRate: carrier.stats.cancelRate,
    disputeRate: carrier.stats.disputeRate,
    avgRating: carrier.stats.avgRating,
    completedOrders: carrier.stats.completedOrders,
    
    weightFit: input.weightKg / carrier.capacity.maxWeightKg,
    volumeFit: input.volumeM3 ? input.volumeM3 / carrier.capacity.maxVolumeM3 : 0.5,
    featureMatch: checkFeatureMatch(carrier, input),
    
    riskLevel: carrier.riskLevel,
    riskScore: carrier.riskScore
  };
  
  // Calculate individual scores
  // IMPORTANT: priceScore comes from Pricing-Service, NOT calculated here
  const scores: ScoreComponents = {
    priceScore,  // From Pricing-Service - NEVER use raw bid_price_eur directly
    
    distanceScore: normalizeDistanceScore(
      features.distanceToPickupKm,
      features.detourPercent
    ),
    
    reliabilityScore: normalizeReliabilityScore(
      features.onTimeRate,
      features.cancelRate,
      features.disputeRate,
      features.avgRating,
      features.completedOrders
    ),
    
    capacityScore: normalizeCapacityScore(
      input.weightKg,
      carrier.capacity.maxWeightKg,
      input.volumeM3 || 0,
      carrier.capacity.maxVolumeM3,
      features.featureMatch === 1,
      true // vehicle type already filtered
    ),
    
    riskScore: normalizeRiskScore(features.riskLevel, features.riskScore)
  };
  
  // Calculate total score
  let totalScore = calculateTotalScore(scores, config.weights);
  
  // Apply risk-based adjustments
  if (carrier.riskLevel === 'RED') {
    totalScore = Math.min(totalScore, config.riskRedCap);
  } else if (carrier.riskLevel === 'YELLOW') {
    totalScore -= config.riskYellowPenalty;
  }
  
  // Apply new carrier penalty
  if (config.enableNewCarrierPenalty && carrier.stats.completedOrders < 10) {
    totalScore = Math.min(totalScore, config.newCarrierPenalty);
  }
  
  // Generate explanation
  const explanation = explainMatch(scores, features, config.weights);
  
  // Build warnings
  const warnings: string[] = [];
  if (carrier.stats.cancelRate > 0.1) {
    warnings.push('Hohe Stornoquote in der Vergangenheit');
  }
  if (features.distanceToPickupKm > 100) {
    warnings.push('Fahrer befindet sich weiter von Abholort');
  }
  if (carrier.riskLevel === 'YELLOW') {
    warnings.push('Erhöhtes Risikolevel - zusätzliche Überprüfung empfohlen');
  }
  
  // Build price comparison
  const priceComparison = {
    vsMedian: ((carrierPrice - marketData.medianPrice) / marketData.medianPrice) * 100,
    vsBudget: input.shipperBudget 
      ? ((carrierPrice - input.shipperBudget) / input.shipperBudget) * 100
      : 0
  };
  
  return {
    rank: 0, // Will be set after sorting
    carrierId: carrier.driverId,
    driverId: carrier.driverId,
    vehicleId: carrier.vehicleId,
    
    totalScore,
    scores,
    
    offeredPrice: carrierPrice,
    priceComparison,
    
    distanceInfo: {
      toPickupKm: distanceToPickup,
      detourKm: features.detourKm,
      detourPercent
    },
    
    reliabilityInfo: {
      onTimeRate: carrier.stats.onTimeRate,
      cancelRate: carrier.stats.cancelRate,
      rating: carrier.stats.avgRating,
      completedOrders: carrier.stats.completedOrders
    },
    
    explanation,
    warnings,
    autoMatchEligible: false
  };
}

function checkFeatureMatch(carrier: CarrierForMatching, input: MatchCarriersInput): number {
  if (!input.vehicleRequirements) return 1;
  
  let matchCount = 0;
  let totalChecks = 0;
  
  if (input.vehicleRequirements.adrRequired) {
    totalChecks++;
    if (carrier.capacity.hasAdr) matchCount++;
  }
  if (input.vehicleRequirements.coolingRequired) {
    totalChecks++;
    if (carrier.capacity.hasCooling) matchCount++;
  }
  if (input.vehicleRequirements.craneRequired) {
    totalChecks++;
    if (carrier.capacity.hasCrane) matchCount++;
  }
  if (input.vehicleRequirements.liftRequired) {
    totalChecks++;
    if (carrier.capacity.hasLift) matchCount++;
  }
  
  return totalChecks > 0 ? matchCount / totalChecks : 1;
}

// ============================================
// CONFIG LOADING
// ============================================

async function loadMatchingConfig(configName?: string): Promise<MatchingConfig> {
  const name = configName || 'default';
  
  const config = await prisma.matchingConfig.findFirst({
    where: {
      OR: [
        { name, isActive: true },
        { isDefault: true, isActive: true }
      ]
    },
    orderBy: [
      { name: 'asc' },
      { isDefault: 'desc' }
    ]
  });
  
  if (config) {
    return {
      id: config.id,
      name: config.name,
      weights: {
        price: config.weightPrice,
        distance: config.weightDistance,
        reliability: config.weightReliability,
        capacity: config.weightCapacity,
        risk: config.weightRisk
      },
      minScore: config.minScore,
      autoMatchGap: config.autoMatchGap,
      enableAutoMatch: config.enableAutoMatch,
      enableNewCarrierPenalty: config.enableNewCarrierPenalty,
      newCarrierPenalty: config.newCarrierPenalty,
      riskRedCap: config.riskRedCap,
      riskYellowPenalty: config.riskYellowPenalty
    };
  }
  
  // Return default configuration
  return {
    id: 'default',
    name: 'default',
    weights: DEFAULT_WEIGHTS,
    minScore: 0.6,
    autoMatchGap: 0.1,
    enableAutoMatch: false,
    enableNewCarrierPenalty: true,
    newCarrierPenalty: 0.3,
    riskRedCap: 0.3,
    riskYellowPenalty: 0.1
  };
}

// ============================================
// STORAGE
// ============================================

async function storeMatchingResults(
  transportId: string,
  matches: MatchResult[],
  config: MatchingConfig
): Promise<string> {
  // Create matching session
  const session = await prisma.matchingSession.create({
    data: {
      transportId,
      status: 'COMPLETED',
      autoAssign: config.enableAutoMatch
    }
  });
  
  // Store candidates
  for (const match of matches.slice(0, 50)) {
    await prisma.matchingCandidate.create({
      data: {
        matchingSessionId: session.id,
        driverId: match.driverId,
        vehicleId: match.vehicleId,
        hardFilterPassed: true,
        softRulesPassed: true,
        fraudSafe: true,
        internationalAllowed: true,
        score: match.totalScore,
        scoreBreakdown: JSON.stringify(match.scores),
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });
    
    // Store explanation
    await prisma.matchingExplanation.create({
      data: {
        candidateId: match.driverId,
        topReasons: JSON.stringify(match.explanation.topReasons),
        priceDetails: JSON.stringify({
          score: match.scores.priceScore,
          marketComparison: match.priceComparison
        }),
        distanceDetails: JSON.stringify({
          score: match.scores.distanceScore,
          ...match.distanceInfo
        }),
        reliabilityDetails: JSON.stringify({
          score: match.scores.reliabilityScore,
          ...match.reliabilityInfo
        }),
        riskDetails: JSON.stringify({
          score: match.scores.riskScore,
          warnings: match.warnings
        }),
        warnings: JSON.stringify(match.warnings)
      }
    });
  }
  
  return session.id;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ============================================
// EXPORTS
// ============================================

export const matchingEngine = {
  matchCarriers,
  loadMatchingConfig,
  calculateDistance
};
