// ============================================
// CARGOBIT MATCHING ENGINE TYPES
// Advanced Scoring Model with Explainability
// 
// IMPORTANT INTEGRATION RULE:
// Matching-Engine uses priceScore from Pricing-Service
// NEVER use raw bid_price_eur directly in scoring formula
// Raw price is only for UI & Reporting
// ============================================

import { calculatePriceScore } from '@/services/pricing-engine.service';

// ============================================
// SCORING MODEL TYPES
// ============================================

/**
 * Scoring weights for the matching algorithm
 * All weights should sum to 1.0
 */
export interface ScoringWeights {
  price: number;        // w_p = 0.25
  distance: number;     // w_d = 0.15
  reliability: number;  // w_r = 0.25
  capacity: number;     // w_k = 0.15
  risk: number;         // w_s = 0.20
}

/**
 * Default weights as specified
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  price: 0.25,
  distance: 0.15,
  reliability: 0.25,
  capacity: 0.15,
  risk: 0.20
};

/**
 * Individual score components (normalized 0-1)
 */
export interface ScoreComponents {
  priceScore: number;       // S_price: price attractiveness
  distanceScore: number;    // S_distance: proximity to route
  reliabilityScore: number; // S_reliability: historical performance
  capacityScore: number;    // S_capacity: capacity match
  riskScore: number;        // S_risk: risk engine score
}

/**
 * Raw features before normalization
 */
export interface MatchingFeatures {
  // Price features
  carrierPrice: number;
  medianMarketPrice: number;
  pricePercentile: number;  // Position in market (0-1)
  
  // Distance features
  distanceToPickupKm: number;
  detourKm: number;
  detourPercent: number;
  
  // Reliability features
  onTimeRate: number;       // 0-1
  cancelRate: number;       // 0-1
  disputeRate: number;      // 0-1
  avgRating: number;        // 0-5
  completedOrders: number;
  
  // Capacity features
  weightFit: number;        // 0-1, how well cargo fits
  volumeFit: number;        // 0-1
  featureMatch: number;     // 0-1, special features match
  
  // Risk features
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
  riskScore: number;        // 0-100 (lower = better)
}

// ============================================
// CARRIER DATA TYPES
// ============================================

export interface CarrierForMatching {
  driverId: string;
  vehicleId: string;
  
  // Basic info
  driverName: string;
  companyName?: string;
  
  // Stats
  stats: CarrierStatsData;
  
  // Capacity
  capacity: CarrierCapacityData;
  
  // Location
  currentLocation?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
  
  // Risk
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
  riskScore: number;
  
  // Offer (if available)
  offeredPrice?: number;
}

export interface CarrierStatsData {
  onTimeRate: number;
  cancelRate: number;
  disputeRate: number;
  completedOrders: number;
  avgRating: number;
  avgResponseTime: number;
  acceptanceRate: number;
  trendOnTime: number;
  trendRating: number;
}

export interface CarrierCapacityData {
  maxWeightKg: number;
  maxVolumeM3: number;
  vehicleType: string;
  hasAdr: boolean;
  hasCooling: boolean;
  hasLift: boolean;
  hasCrane: boolean;
  isAvailable: boolean;
  currentLoadWeight: number;
  currentLoadVolume: number;
}

// ============================================
// MATCHING REQUEST/RESPONSE TYPES
// ============================================

export interface MatchOrderRequest {
  orderId: string;
  
  // Order details
  pickupLocation: { lat: number; lng: number; country: string };
  deliveryLocation: { lat: number; lng: number; country: string };
  pickupDatetime: Date;
  deliveryDatetime?: Date;
  
  // Cargo details
  weightKg: number;
  volumeM3?: number;
  
  // Requirements
  vehicleRequirements?: VehicleRequirements;
  driverRequirements?: DriverRequirements;
  
  // Pricing
  shipperBudget?: number;
  
  // Options
  configName?: string;      // Use specific matching config
  autoAssign?: boolean;
  maxCandidates?: number;
}

export interface MatchOrderResponse {
  orderId: string;
  matchingId: string;
  
  // Results
  matches: MatchResult[];
  
  // Stats
  totalCandidates: number;
  filteredCandidates: number;
  qualifiedCandidates: number;
  
  // Timing
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  
  // Config used
  configUsed: string;
}

export interface MatchResult {
  rank: number;
  carrierId: string;
  driverId: string;
  vehicleId: string;
  
  // Scores
  totalScore: number;
  scores: ScoreComponents;
  
  // Price info
  offeredPrice?: number;
  priceComparison?: {
    vsMedian: number;       // Percent difference
    vsBudget: number;       // Percent difference
  };
  
  // Distance info
  distanceInfo?: {
    toPickupKm: number;
    detourKm: number;
    detourPercent: number;
  };
  
  // Reliability info
  reliabilityInfo?: {
    onTimeRate: number;
    cancelRate: number;
    rating: number;
    completedOrders: number;
  };
  
  // Explanation
  explanation: MatchExplanation;
  
  // Warnings
  warnings: string[];
  
  // Auto-match eligible
  autoMatchEligible: boolean;
}

// ============================================
// EXPLAINABILITY TYPES
// ============================================

export interface MatchExplanation {
  // Top 3 reasons (human-readable)
  topReasons: string[];
  
  // Detailed breakdown
  details: {
    price?: {
      summary: string;
      score: number;
      marketPosition: string;
    };
    distance?: {
      summary: string;
      score: number;
      detourNote: string;
    };
    reliability?: {
      summary: string;
      score: number;
      highlight: string;
    };
    capacity?: {
      summary: string;
      score: number;
      fitNote: string;
    };
    risk?: {
      summary: string;
      score: number;
      level: string;
    };
  };
}

/**
 * Generate explanation for a match
 */
export function explainMatch(
  scores: ScoreComponents,
  features: MatchingFeatures,
  weights: ScoringWeights
): MatchExplanation {
  const topReasons: string[] = [];
  const details: MatchExplanation['details'] = {};
  
  // Price explanation
  if (scores.priceScore > 0.8) {
    topReasons.push('Preis deutlich unter Marktpreis');
    details.price = {
      summary: `Preis ${Math.round((1 - features.pricePercentile) * 100)}% günstiger als Markt`,
      score: scores.priceScore,
      marketPosition: 'sehr attraktiv'
    };
  } else if (scores.priceScore > 0.6) {
    topReasons.push('Wettbewerbsfähiger Preis');
    details.price = {
      summary: 'Preis im guten Marktbereich',
      score: scores.priceScore,
      marketPosition: 'wettbewerbsfähig'
    };
  }
  
  // Reliability explanation
  if (scores.reliabilityScore > 0.8) {
    topReasons.push(`Sehr hohe Zuverlässigkeit (${Math.round(features.onTimeRate * 100)}% pünktlich)`);
    details.reliability = {
      summary: 'Exzellente Historie',
      score: scores.reliabilityScore,
      highlight: `${features.completedOrders} erfolgreiche Transporte`
    };
  } else if (scores.reliabilityScore > 0.6 && features.onTimeRate > 0.9) {
    topReasons.push('Hohe Pünktlichkeitsrate');
    details.reliability = {
      summary: 'Gute Zuverlässigkeit',
      score: scores.reliabilityScore,
      highlight: `${Math.round(features.onTimeRate * 100)}% pünktliche Lieferungen`
    };
  }
  
  // Distance explanation
  if (scores.distanceScore > 0.8) {
    topReasons.push('Optimale Routennähe');
    details.distance = {
      summary: 'Fahrer in direkter Nähe',
      score: scores.distanceScore,
      detourNote: 'Kein nennenswerter Umweg'
    };
  } else if (scores.distanceScore > 0.6) {
    details.distance = {
      summary: 'Akzeptable Entfernung',
      score: scores.distanceScore,
      detourNote: `${Math.round(features.detourPercent)}% Umweg`
    };
  }
  
  // Risk explanation
  if (scores.riskScore > 0.85 && features.riskLevel === 'GREEN') {
    topReasons.push('Geringes Risiko laut Risk-Engine');
    details.risk = {
      summary: 'Alle Sicherheitskriterien erfüllt',
      score: scores.riskScore,
      level: 'Green'
    };
  }
  
  // Capacity explanation
  if (scores.capacityScore > 0.8) {
    details.capacity = {
      summary: 'Perfekte Kapazitätsübereinstimmung',
      score: scores.capacityScore,
      fitNote: 'Fahrzeug optimal ausgelastet'
    };
  }
  
  // Ensure we have at least some reasons
  if (topReasons.length === 0) {
    if (features.avgRating >= 4.5) {
      topReasons.push('Top Bewertung');
    }
    if (features.completedOrders >= 100) {
      topReasons.push('Erfahrener Fahrer');
    }
  }
  
  return {
    topReasons: topReasons.slice(0, 3),
    details
  };
}

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================

/**
 * Normalize a value to 0-1 range using min-max scaling
 */
export function normalizeMinMax(
  value: number,
  min: number,
  max: number,
  invert: boolean = false
): number {
  if (max === min) return 0.5;
  let normalized = (value - min) / (max - min);
  normalized = Math.max(0, Math.min(1, normalized));
  return invert ? 1 - normalized : normalized;
}

/**
 * Normalize price score (lower price = higher score)
 * 
 * IMPORTANT: This function is provided for backward compatibility.
 * For new implementations, use calculatePriceScore from pricing-engine.service.ts
 * which properly integrates with the Pricing-Service.
 * 
 * Matching-Engine MUST use priceScore from Pricing-Service, never raw bid_price_eur
 */
export function normalizePriceScore(
  carrierPrice: number,
  medianPrice: number,
  minPrice: number,
  maxPrice: number
): number {
  // Price below median is good (high score)
  // Price above median is bad (low score)
  if (carrierPrice <= minPrice) return 1.0;
  if (carrierPrice >= maxPrice) return 0.0;
  
  // Use percentile-based scoring
  if (carrierPrice <= medianPrice) {
    // Below median: map to 0.6-1.0
    return 0.6 + 0.4 * ((medianPrice - carrierPrice) / (medianPrice - minPrice));
  } else {
    // Above median: map to 0.0-0.6
    return 0.6 * ((maxPrice - carrierPrice) / (maxPrice - medianPrice));
  }
}

/**
 * Get price score from Pricing-Service
 * This is the recommended way to calculate priceScore for Matching-Engine
 * 
 * IMPORTANT: Matching-Engine MUST use this priceScore, never raw bid_price_eur
 * 
 * @param bidPrice - The carrier's bid price
 * @param marketPrice - Market price for the order
 * @param minPrice - Minimum allowed price (adjustedMinPrice)
 * @param startPrice - Starting price (adjustedStartPrice)
 * @returns Normalized price score (0-1, higher = better)
 */
export function getPriceScoreFromPricingService(
  bidPrice: number,
  marketPrice: number,
  minPrice: number,
  startPrice: number
): number {
  return calculatePriceScore(bidPrice, marketPrice, minPrice, startPrice);
}

/**
 * Normalize distance score (closer = higher score)
 */
export function normalizeDistanceScore(
  distanceKm: number,
  detourPercent: number
): number {
  // Base score from distance (0-100km considered)
  const distanceScore = normalizeMinMax(distanceKm, 0, 100, true);
  
  // Penalty for detour
  const detourPenalty = Math.min(detourPercent / 100, 0.5);
  
  return Math.max(0, distanceScore - detourPenalty);
}

/**
 * Normalize reliability score
 */
export function normalizeReliabilityScore(
  onTimeRate: number,
  cancelRate: number,
  disputeRate: number,
  avgRating: number,
  completedOrders: number
): number {
  // Weight the components
  const onTimeScore = onTimeRate; // Already 0-1
  
  // Cancel rate: 0% = 1.0, 20%+ = 0.0
  const cancelScore = Math.max(0, 1 - cancelRate * 5);
  
  // Dispute rate: 0% = 1.0, 10%+ = 0.0
  const disputeScore = Math.max(0, 1 - disputeRate * 10);
  
  // Rating: 5.0 = 1.0, 3.0 = 0.0
  const ratingScore = normalizeMinMax(avgRating, 3, 5, false);
  
  // Experience bonus: more orders = more reliable
  const experienceBonus = Math.min(completedOrders / 100, 0.2);
  
  // Combine with weights
  const baseScore = (
    onTimeScore * 0.35 +
    cancelScore * 0.25 +
    disputeScore * 0.15 +
    ratingScore * 0.25
  );
  
  return Math.min(1, baseScore + experienceBonus);
}

/**
 * Normalize capacity score
 */
export function normalizeCapacityScore(
  weightKg: number,
  maxWeightKg: number,
  volumeM3: number,
  maxVolumeM3: number,
  featureMatch: boolean,
  vehicleTypeMatch: boolean
): number {
  // Weight fit (optimal around 70-90% capacity)
  const weightUtilization = weightKg / maxWeightKg;
  let weightFitScore: number;
  
  if (weightUtilization > 1) {
    weightFitScore = 0; // Cannot carry
  } else if (weightUtilization >= 0.7 && weightUtilization <= 0.9) {
    weightFitScore = 1.0; // Optimal
  } else if (weightUtilization >= 0.5) {
    weightFitScore = 0.8;
  } else {
    weightFitScore = weightUtilization; // Underutilized
  }
  
  // Volume fit
  const volumeUtilization = volumeM3 / maxVolumeM3;
  let volumeFitScore: number;
  
  if (volumeUtilization > 1) {
    volumeFitScore = 0;
  } else if (volumeUtilization >= 0.6) {
    volumeFitScore = 1.0;
  } else {
    volumeFitScore = volumeUtilization * 0.8;
  }
  
  // Combine
  let capacityScore = (weightFitScore + volumeFitScore) / 2;
  
  // Bonus for feature match
  if (featureMatch) {
    capacityScore = Math.min(1, capacityScore + 0.1);
  }
  
  // Penalty for vehicle type mismatch
  if (!vehicleTypeMatch) {
    capacityScore *= 0.7;
  }
  
  return capacityScore;
}

/**
 * Normalize risk score (from Risk Engine)
 * Higher score = lower risk = better match
 */
export function normalizeRiskScore(
  riskLevel: 'GREEN' | 'YELLOW' | 'RED',
  riskScore: number // 0-100, lower = better
): number {
  switch (riskLevel) {
    case 'GREEN':
      return 0.85 + (100 - riskScore) * 0.0015; // 0.85-1.0
    case 'YELLOW':
      return 0.5 + (100 - riskScore) * 0.003; // 0.5-0.85
    case 'RED':
      return Math.max(0, 0.3 + (100 - riskScore) * 0.003); // 0-0.3
    default:
      return 0.5;
  }
}

// ============================================
// MAIN SCORING FUNCTION
// ============================================

/**
 * Calculate total score using weighted formula
 * Score = w_p * S_price + w_d * S_distance + w_r * S_reliability + w_k * S_capacity + w_s * S_risk
 */
export function calculateTotalScore(
  scores: ScoreComponents,
  weights: ScoringWeights
): number {
  return (
    weights.price * scores.priceScore +
    weights.distance * scores.distanceScore +
    weights.reliability * scores.reliabilityScore +
    weights.capacity * scores.capacityScore +
    weights.risk * scores.riskScore
  );
}

// ============================================
// MATCHING CONFIG TYPE
// ============================================

export interface MatchingConfig {
  id: string;
  name: string;
  weights: ScoringWeights;
  minScore: number;
  autoMatchGap: number;
  enableAutoMatch: boolean;
  enableNewCarrierPenalty: boolean;
  newCarrierPenalty: number;
  riskRedCap: number;
  riskYellowPenalty: number;
}

// ============================================
// EXPORT ALL
// ============================================

export type {
  ScoringWeights,
  ScoreComponents,
  MatchingFeatures,
  CarrierForMatching,
  CarrierStatsData,
  CarrierCapacityData,
  MatchOrderRequest,
  MatchOrderResponse,
  MatchResult,
  MatchExplanation,
  MatchingConfig
};
