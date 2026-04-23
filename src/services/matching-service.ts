// ============================================
// CARGOBIT EVENT-DRIVEN MATCHING SERVICE
// Implements the Matching-Engine with Event Sourcing
// 
// Architecture:
// Input: Kafka/NATS Consumer on:
//   - bid.validated
//   - pricing.calculated
//   - order.created
//   - carrier.stats.updated (optional)
//
// State:
//   - Order data (from Order-Service)
//   - Pricing context (from Pricing-Service / Cache)
//   - Bids (from Bids-DB)
//   - Carrier stats (from DB)
//
// Output:
//   - matching.completed
//   - matching.failed (optional)
// ============================================

import { prisma } from '@/lib/db';
import { getEventBus, EventPublisher } from '@/services/event-bus.service';
import {
  CORE_TOPICS,
  CargoBitEvent,
  BidValidatedEvent,
  PricingCalculatedEvent,
  CarrierMatch,
  MatchingCompletedEvent,
  generateCorrelationId,
} from '@/types/events';
import {
  ScoreComponents,
  MatchingConfig,
  DEFAULT_WEIGHTS,
  calculateTotalScore,
  normalizeDistanceScore,
  normalizeReliabilityScore,
  normalizeCapacityScore,
  normalizeRiskScore,
} from '@/types/matching-engine';

// ============================================
// MATCHING SERVICE CLASS
// ============================================

interface OrderContext {
  orderId: string;
  shipperId: string;
  route: { origin: string; destination: string };
  distanceKm: number;
  weightKg: number;
  volumeM3?: number;
  vehicleRequirements?: {
    vehicleTypes?: string[];
    minPayloadKg?: number;
    adrRequired?: boolean;
    coolingRequired?: boolean;
  };
  driverRequirements?: {
    minRating?: number;
    minCompletedOrders?: number;
  };
}

interface PricingContext {
  orderId: string;
  marketPrice: number;
  startPrice: number;
  minPrice: number;
  currency: string;
  riskLevel: 'green' | 'yellow' | 'red';
  costBreakdown?: {
    baseCost: number;
    fuelCost: number;
    tollCost: number;
    laborCost: number;
    riskCost: number;
    total: number;
  };
}

interface CarrierStats {
  carrierId: string;
  driverId: string;
  cancel_rate: number;
  dispute_rate: number;
  onTimeRate: number;
  avgRating: number;
  completedOrders: number;
  homeBaseLocation?: { lat: number; lng: number };
  capacity: {
    maxWeightKg: number;
    maxVolumeM3: number;
    vehicleType: string;
    isAvailable: boolean;
  };
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
}

interface ValidBid {
  bidId: string;
  orderId: string;
  carrierId: string;
  driverId: string;
  vehicleId: string;
  bidPrice: number;
  priceScore: number;
  submittedAt: Date;
}

export class MatchingService {
  // In-memory state (in production, use Redis or DB)
  private orderCache: Map<string, OrderContext> = new Map();
  private pricingCache: Map<string, PricingContext> = new Map();
  private bidCache: Map<string, ValidBid[]> = new Map(); // orderId -> bids
  
  // Pending matching triggers
  private pendingMatches: Map<string, { hasPricing: boolean; hasBid: boolean }> = new Map();

  constructor(
    private readonly config?: MatchingConfig
  ) {
    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    const eventBus = getEventBus();

    // Listen for pricing.calculated
    eventBus.subscribe(CORE_TOPICS.PRICING_CALCULATED, async (event) => {
      await this.onPricingCalculated(event as unknown as PricingCalculatedEvent);
    });

    // Listen for bid.validated
    eventBus.subscribe(CORE_TOPICS.BID_VALIDATED, async (event) => {
      await this.onBidValidated(event as unknown as BidValidatedEvent);
    });

    console.log('[MatchingService] Event listeners initialized');
  }

  /**
   * Handle bid.validated event
   */
  async onBidValidated(event: BidValidatedEvent): Promise<void> {
    console.log(`[MatchingService] Processing bid.validated: ${event.data.bidId}`);

    const { orderId, bidId, carrierId, driverId, valid, priceScore, reason } = event.data;

    if (!valid) {
      console.log(`[MatchingService] Bid ${bidId} not valid: ${reason}`);
      return;
    }

    // Store bid in cache
    const bid: ValidBid = {
      bidId,
      orderId,
      carrierId,
      driverId,
      vehicleId: event.data.driverId, // Will be replaced with actual vehicle
      bidPrice: event.data.details?.bidPrice || 0,
      priceScore: priceScore || 0,
      submittedAt: new Date(event.timestamp),
    };

    if (!this.bidCache.has(orderId)) {
      this.bidCache.set(orderId, []);
    }
    this.bidCache.get(orderId)!.push(bid);

    // Check if we can trigger matching
    await this.checkAndTriggerMatching(orderId, event.metadata.correlationId);
  }

  /**
   * Handle pricing.calculated event
   */
  async onPricingCalculated(event: PricingCalculatedEvent): Promise<void> {
    console.log(`[MatchingService] Processing pricing.calculated: ${event.data.orderId}`);

    const { orderId, marketPrice, startPrice, minPrice, currency, riskLevel, costBreakdown } = event.data;

    // Store pricing context
    this.pricingCache.set(orderId, {
      orderId,
      marketPrice,
      startPrice,
      minPrice,
      currency,
      riskLevel,
      costBreakdown,
    });

    // Check if we can trigger matching
    await this.checkAndTriggerMatching(orderId, event.metadata.correlationId);
  }

  /**
   * Check if matching can be triggered and do so if ready
   */
  private async checkAndTriggerMatching(orderId: string, correlationId: string): Promise<void> {
    const hasPricing = this.pricingCache.has(orderId);
    const bids = this.bidCache.get(orderId) || [];
    const hasBids = bids.length > 0;

    // Update pending state
    const pending = this.pendingMatches.get(orderId) || { hasPricing: false, hasBid: false };
    pending.hasPricing = hasPricing;
    pending.hasBid = hasBids;
    this.pendingMatches.set(orderId, pending);

    // Trigger matching if both pricing and bids are available
    if (hasPricing && hasBids) {
      console.log(`[MatchingService] Triggering matching for order ${orderId}`);
      await this.executeMatching(orderId, correlationId);
    }
  }

  /**
   * Execute matching for an order
   */
  async executeMatching(orderId: string, correlationId?: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Get order context
      const order = await this.getOrderContext(orderId);
      if (!order) {
        console.error(`[MatchingService] Order not found: ${orderId}`);
        return;
      }

      // Get pricing context
      const pricing = this.pricingCache.get(orderId);
      if (!pricing) {
        console.error(`[MatchingService] Pricing not found for order: ${orderId}`);
        return;
      }

      // Get valid bids
      const bids = this.bidCache.get(orderId) || [];
      if (bids.length === 0) {
        console.log(`[MatchingService] No bids for order: ${orderId}`);
        return;
      }

      // Get carrier stats for all bidders
      const carrierIds = [...new Set(bids.map(b => b.carrierId))];
      const carrierStats = await this.getCarrierStats(carrierIds);

      // Score each bid
      const matches: CarrierMatch[] = bids.map(bid => {
        const stats = carrierStats[bid.carrierId];
        const scores = this.computeScores(order, bid, pricing, stats);
        const totalScore = this.computeTotalScore(scores);

        return {
          carrierId: bid.carrierId,
          driverId: bid.driverId,
          vehicleId: bid.vehicleId,
          score: totalScore,
          priceScore: scores.priceScore,
          reliabilityScore: scores.reliabilityScore,
          capacityScore: scores.capacityScore,
          distanceScore: scores.distanceScore,
          riskScore: scores.riskScore,
          bidPrice: bid.bidPrice,
          currency: pricing.currency,
          explanation: this.buildExplanation(scores, stats),
          warnings: this.buildWarnings(scores, stats),
          autoMatchEligible: totalScore >= 0.85,
        };
      });

      // Filter by minimum score threshold
      const filtered = matches.filter(m => m.score >= 0.6);
      
      // Sort by score descending
      filtered.sort((a, b) => b.score - a.score);

      // Check for auto-match eligibility
      let autoMatched = false;
      let autoMatchCarrierId: string | undefined;
      
      const config = this.config || {
        enableAutoMatch: false,
        autoMatchGap: 0.15,
      };

      if (config.enableAutoMatch && filtered.length > 1) {
        const gap = filtered[0].score - filtered[1].score;
        if (gap >= config.autoMatchGap && filtered[0].autoMatchEligible) {
          autoMatched = true;
          autoMatchCarrierId = filtered[0].carrierId;
        }
      }

      const durationMs = Date.now() - startTime;

      // Publish matching.completed event
      await EventPublisher.publishMatchingCompleted(
        {
          orderId,
          matchingSessionId: `match_${orderId}_${Date.now()}`,
          matches: filtered,
          matchingConfig: this.config?.name || 'default',
          totalCandidates: bids.length,
          filteredCandidates: bids.length,
          qualifiedCandidates: filtered.length,
          durationMs,
          autoMatched,
          autoMatchCarrierId,
        } as any,
        correlationId
      );

      console.log(`[MatchingService] Matching completed for ${orderId}: ${filtered.length} matches in ${durationMs}ms`);

    } catch (error) {
      console.error(`[MatchingService] Matching failed for ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Compute individual scores
   */
  private computeScores(
    order: OrderContext,
    bid: ValidBid,
    pricing: PricingContext,
    stats?: CarrierStats
  ): ScoreComponents {
    // Price score from bid validation
    const priceScore = bid.priceScore;

    // Reliability score
    const reliabilityScore = stats
      ? this.computeReliabilityScore(stats)
      : 0.5; // Default for new carriers

    // Capacity score
    const capacityScore = stats
      ? this.computeCapacityScore(order, stats)
      : 0.5;

    // Distance score
    const distanceScore = stats
      ? this.computeDistanceScore(order, stats)
      : 0.5;

    // Risk score
    const riskScore = stats
      ? this.computeRiskScore(stats)
      : 0.5;

    return {
      priceScore,
      reliabilityScore,
      capacityScore,
      distanceScore,
      riskScore,
    };
  }

  /**
   * Compute reliability score
   * Formula: 1 - (cancel_rate * 0.5 + dispute_rate * 0.5)
   */
  private computeReliabilityScore(stats: CarrierStats): number {
    const cancelRate = stats.cancel_rate ?? 0;
    const disputeRate = stats.dispute_rate ?? 0;
    
    return 1 - Math.min(1, cancelRate * 0.5 + disputeRate * 0.5);
  }

  /**
   * Check if carrier has capacity for the order
   */
  private capacityOK(stats: CarrierStats, order: OrderContext): boolean {
    if (!stats.capacity?.isAvailable) return false;
    if (order.weightKg > (stats.capacity.maxWeightKg || 0)) return false;
    if (order.volumeM3 && order.volumeM3 > (stats.capacity.maxVolumeM3 || 0)) return false;
    return true;
  }

  /**
   * Compute capacity score
   */
  private computeCapacityScore(order: OrderContext, stats: CarrierStats): number {
    return this.capacityOK(stats, order) ? 1 : 0;
  }

  /**
   * Compute distance score
   */
  private computeDistanceScore(order: OrderContext, stats: CarrierStats): number {
    if (!stats.homeBaseLocation) return 0.5;

    // Simplified distance calculation
    const distance = this.estimateDistance(
      stats.homeBaseLocation,
      { lat: 0, lng: 0 } // Would use actual origin coords
    );

    return normalizeDistanceScore(distance, 0);
  }

  /**
   * Compute risk score
   */
  private computeRiskScore(stats: CarrierStats): number {
    return normalizeRiskScore(stats.riskLevel, 0);
  }

  /**
   * Compute total score with weights
   * Score = w_p·S_price + w_r·S_reliability + w_k·S_capacity + w_d·S_distance + w_s·S_risk
   */
  private computeTotalScore(scores: ScoreComponents): number {
    const weights = this.config?.weights || DEFAULT_WEIGHTS;

    return (
      0.25 * scores.priceScore +
      0.25 * scores.reliabilityScore +
      0.20 * scores.capacityScore +
      0.15 * scores.distanceScore +
      0.15 * scores.riskScore
    );
  }

  /**
   * Build human-readable explanation
   */
  private buildExplanation(scores: ScoreComponents, stats?: CarrierStats): string[] {
    const reasons: string[] = [];

    if (scores.reliabilityScore > 0.9) {
      reasons.push('Sehr hohe Zuverlässigkeit');
    }

    if (scores.priceScore > 0.7) {
      reasons.push('Preis im attraktiven Bereich');
    }

    if (scores.riskScore > 0.8) {
      reasons.push('Geringes Risiko laut Risk-Engine');
    }

    if (scores.capacityScore === 1) {
      reasons.push('Kapazität vollständig passend');
    }

    if (scores.reliabilityScore > 0.8 && stats?.avgRating && stats.avgRating > 4.5) {
      reasons.push('Top Bewertung');
    }

    return reasons.slice(0, 3);
  }

  /**
   * Build warnings
   */
  private buildWarnings(scores: ScoreComponents, stats?: CarrierStats): string[] {
    const warnings: string[] = [];

    if (stats && stats.cancel_rate > 0.1) {
      warnings.push('Erhöhte Stornoquote in der Vergangenheit');
    }

    if (scores.distanceScore < 0.5) {
      warnings.push('Fahrer befindet sich weiter vom Abholort');
    }

    if (stats?.riskLevel === 'YELLOW') {
      warnings.push('Erhöhtes Risikolevel - zusätzliche Überprüfung empfohlen');
    }

    return warnings;
  }

  /**
   * Get order context from DB
   */
  private async getOrderContext(orderId: string): Promise<OrderContext | null> {
    const transport = await prisma.transport.findUnique({
      where: { id: orderId },
      include: {
        pickupAddress: true,
        deliveryAddress: true,
        transportDetail: true,
      },
    });

    if (!transport) return null;

    return {
      orderId: transport.id,
      shipperId: transport.shipperUserId,
      route: {
        origin: transport.pickupAddress.country,
        destination: transport.deliveryAddress.country,
      },
      distanceKm: transport.distanceKm || 0,
      weightKg: transport.transportDetail?.weightKg || 0,
      volumeM3: transport.transportDetail?.volumeM3 || undefined,
    };
  }

  /**
   * Get carrier stats from DB
   */
  private async getCarrierStats(carrierIds: string[]): Promise<Record<string, CarrierStats>> {
    const result: Record<string, CarrierStats> = {};

    const drivers = await prisma.driver.findMany({
      where: { id: { in: carrierIds } },
      include: {
        carrierStats: true,
        carrierCapacity: true,
      },
    });

    for (const driver of drivers) {
      const stats = driver.carrierStats;
      const capacity = driver.carrierCapacity;

      result[driver.id] = {
        carrierId: driver.id,
        driverId: driver.id,
        cancel_rate: stats?.cancelRate ?? 0,
        dispute_rate: stats?.disputeRate ?? 0,
        onTimeRate: stats?.onTimeRate ?? 0.8,
        avgRating: stats?.avgRating ?? driver.ratingAvg ?? 0,
        completedOrders: stats?.completedOrders ?? driver.completedTransports ?? 0,
        capacity: {
          maxWeightKg: capacity?.maxWeightKg ?? 0,
          maxVolumeM3: capacity?.maxVolumeM3 ?? 0,
          vehicleType: 'SPRINTER', // Default
          isAvailable: capacity?.currentAvailability ? true : driver.isAvailable,
        },
        riskLevel: 'GREEN', // Would fetch from risk score
      };
    }

    return result;
  }

  /**
   * Estimate distance between two points (simplified)
   */
  private estimateDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(to.lat - from.lat);
    const dLng = this.toRad(to.lng - from.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.lat)) * Math.cos(this.toRad(to.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let matchingServiceInstance: MatchingService | null = null;

/**
 * Get matching service instance
 */
export function getMatchingService(): MatchingService {
  if (!matchingServiceInstance) {
    matchingServiceInstance = new MatchingService();
  }
  return matchingServiceInstance;
}

/**
 * Initialize matching service with config
 */
export function initializeMatchingService(config: MatchingConfig): MatchingService {
  matchingServiceInstance = new MatchingService(config);
  return matchingServiceInstance;
}

// Export class
export default MatchingService;
