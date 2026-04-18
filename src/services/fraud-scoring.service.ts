/**
 * CargoBit Fraud Scoring Service
 * 
 * Config-driven Fraud Detection mit Event-Emission.
 * Liest alle Parameter aus security-config.yaml.
 * 
 * FORMELN:
 * 
 * Carrier-Fraud-Score (Fc ∈ [0,1]):
 * Fc = w1·Ccancel + w2·Cdispute + w3·CnoShow + w4·Cpattern
 * 
 * Bid-Fraud-Score (Fb ∈ [0,1]):
 * Fb = v1·Bdumping + v2·Bspam + v3·Bcoordination
 * 
 * Total Fraud Score:
 * Ftotal = α·Fc + (1-α)·Fb
 * 
 * Matching Penalty:
 * Score' = Score · (1 - β·Ftotal)
 * 
 * @module @cargobit/fraud-scoring
 * @version 2.0.0 - Config-driven
 */

import { SecurityConfigService, FraudConfig } from './security-config.service';
import {
  CORE_TOPICS,
  BaseEvent,
  FraudSuspectedPayload,
  FraudFlaggedPayload,
  FraudSuspectedEvent,
  FraudFlaggedEvent,
} from '@/types/events';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface CarrierStats {
  carrierId: string;
  
  // Raw stats (rates as percentages 0-100)
  cancelRatePercent: number;
  disputeRatePercent: number;
  noShowRatePercent: number;
  
  // Pattern scores (0-1)
  winsJustAboveFloorRate: number;
  rotationPatternScore: number;
  sameRegionWinRate: number;
  avgMarginOverFloor: number;
  
  // Time window
  periodDays: number;
}

export interface BidContext {
  bidId: string;
  orderId: string;
  carrierId: string;
  
  // Pricing context
  bidPrice: number;
  startPrice: number;
  minPrice: number;
  marketPrice: number;
  
  // Spam context
  bidsLastMinute: number;
  bidsLastHour: number;
  bidsLastDay: number;
  
  // Coordination context
  similarBidsCount: number;
  similarBidsTimeWindow: Date[];
  priceVariance: number;
  uniqueCarriersWithSimilarBids: number;
}

export interface FraudAnalysisResult {
  // Scores
  carrierFraudScore: number;   // Fc
  bidFraudScore: number;       // Fb
  totalFraudScore: number;     // Ftotal
  
  // Level
  fraudLevel: FraudLevel;
  fraudSuspected: boolean;
  
  // Breakdown
  breakdown: {
    carrier: {
      cancelRate: number;
      disputeRate: number;
      noShowRate: number;
      patternScore: number;
    };
    bid: {
      dumpingScore: number;
      spamScore: number;
      coordinationScore: number;
    };
  };
  
  // Matching integration
  penalty: {
    factor: number;
    applied: number;
    percent: number;
  };
  
  // Recommendations
  recommendations: string[];
  
  // Config
  configVersion: string;
  
  // Event data
  shouldEmitFraudSuspected: boolean;
  shouldEmitFraudFlagged: boolean;
}

export type FraudLevel = 'unauffaellig' | 'beobachten' | 'fraud_suspected';

// =============================================================================
// FRAUD SCORING SERVICE
// =============================================================================

/**
 * Config-driven Fraud Scoring Service
 * 
 * Liest alle Parameter aus security-config.yaml via SecurityConfigService.
 * Berechnet Fc, Fb, Ftotal und wendet Matching-Penalty an.
 * Emittiert fraud.suspected und fraud.flagged Events.
 */
export class FraudScoringService {
  private configService: SecurityConfigService;
  private eventPublisher: ((event: FraudSuspectedEvent | FraudFlaggedEvent) => Promise<void>) | null = null;
  
  constructor(configService?: SecurityConfigService) {
    this.configService = configService ?? SecurityConfigService.getInstance();
  }
  
  /**
   * Set event publisher for fraud events
   */
  setEventPublisher(
    publisher: (event: FraudSuspectedEvent | FraudFlaggedEvent) => Promise<void>
  ): void {
    this.eventPublisher = publisher;
  }
  
  // ===========================================================================
  // MAIN ANALYSIS METHOD
  // ===========================================================================
  
  /**
   * Vollständige Fraud-Analyse für einen Bid
   */
  async analyzeBidFraud(
    carrierStats: CarrierStats,
    bidContext: BidContext,
    correlationId: string
  ): Promise<FraudAnalysisResult> {
    const config = this.configService.getFraudConfig();
    const configVersion = this.configService.getConfigVersion();
    
    // Step 1: Calculate Carrier Fraud Score (Fc)
    const carrierFactors = this.calculateCarrierFactors(carrierStats, config);
    const carrierFraudScore = this.computeCarrierFraudScore(carrierFactors, config);
    
    // Step 2: Calculate Bid Fraud Score (Fb)
    const bidFactors = this.calculateBidFactors(bidContext, config);
    const bidFraudScore = this.computeBidFraudScore(bidFactors, config);
    
    // Step 3: Calculate Total Fraud Score
    const totalFraudScore = this.computeTotalFraudScore(
      carrierFraudScore,
      bidFraudScore,
      config
    );
    
    // Step 4: Determine level
    const fraudLevel = this.determineLevel(totalFraudScore, config);
    const fraudSuspected = totalFraudScore >= config.carrierScore.thresholds.suspect;
    
    // Step 5: Calculate penalty
    const penalty = this.calculatePenalty(totalFraudScore, config);
    
    // Step 6: Generate recommendations
    const recommendations = this.generateRecommendations(
      carrierFraudScore,
      bidFraudScore,
      totalFraudScore,
      carrierFactors,
      bidFactors,
      config
    );
    
    // Step 7: Determine if events should be emitted
    const shouldEmitFraudSuspected = fraudSuspected && config.events.emitFraudSuspected;
    const shouldEmitFraudFlagged = 
      fraudLevel === 'beobachten' && config.events.emitFraudFlagged;
    
    // Step 8: Emit events if needed
    if (shouldEmitFraudSuspected && this.eventPublisher) {
      await this.emitFraudSuspectedEvent(
        carrierStats,
        bidContext,
        carrierFraudScore,
        bidFraudScore,
        totalFraudScore,
        fraudLevel,
        carrierFactors,
        bidFactors,
        recommendations,
        configVersion,
        correlationId
      );
    }
    
    if (shouldEmitFraudFlagged && this.eventPublisher) {
      await this.emitFraudFlaggedEvent(
        carrierStats,
        bidContext,
        totalFraudScore,
        fraudLevel,
        recommendations,
        configVersion,
        correlationId
      );
    }
    
    // Step 9: Log to audit if configured
    if (config.events.auditAllScores) {
      this.logToAudit(
        carrierStats.carrierId,
        bidContext.bidId,
        totalFraudScore,
        fraudLevel,
        configVersion,
        correlationId
      );
    }
    
    return {
      carrierFraudScore,
      bidFraudScore,
      totalFraudScore,
      fraudLevel,
      fraudSuspected,
      breakdown: {
        carrier: carrierFactors,
        bid: bidFactors,
      },
      penalty,
      recommendations,
      configVersion,
      shouldEmitFraudSuspected,
      shouldEmitFraudFlagged,
    };
  }
  
  // ===========================================================================
  // CARRIER FRAUD SCORE (Fc)
  // ===========================================================================
  
  /**
   * Calculate carrier fraud factors from raw stats
   */
  private calculateCarrierFactors(
    stats: CarrierStats,
    config: FraudConfig
  ): { cancelRate: number; disputeRate: number; noShowRate: number; patternScore: number } {
    const { normalization } = config.carrierScore;
    
    // Normalize rates to [0, 1]
    const cancelRate = Math.min(
      stats.cancelRatePercent / 100 / normalization.cancelRateMax,
      1
    );
    
    const disputeRate = Math.min(
      stats.disputeRatePercent / 100 / normalization.disputeRateMax,
      1
    );
    
    const noShowRate = Math.min(
      stats.noShowRatePercent / 100 / normalization.noShowRateMax,
      1
    );
    
    // Calculate pattern score
    const patternScore = this.calculatePatternScore(stats);
    
    return { cancelRate, disputeRate, noShowRate, patternScore };
  }
  
  /**
   * Calculate pattern score for carrier behavior analysis
   */
  private calculatePatternScore(stats: CarrierStats): number {
    let score = 0;
    
    // Wins just above floor (price manipulation indicator)
    if (stats.winsJustAboveFloorRate > 0.3) {
      score += stats.winsJustAboveFloorRate * 0.4;
    }
    
    // Rotation pattern (collusion indicator)
    score += stats.rotationPatternScore * 0.3;
    
    // Regional concentration (market manipulation indicator)
    if (stats.sameRegionWinRate > 0.5) {
      score += (stats.sameRegionWinRate - 0.5) * 0.2;
    }
    
    // Low margin over floor (dumping indicator)
    if (stats.avgMarginOverFloor < 0.05) {
      score += 0.3;
    } else if (stats.avgMarginOverFloor < 0.10) {
      score += 0.15;
    }
    
    return Math.min(score, 1);
  }
  
  /**
   * Compute Carrier Fraud Score (Fc)
   * 
   * Formula: Fc = w1·Ccancel + w2·Cdispute + w3·CnoShow + w4·Cpattern
   */
  private computeCarrierFraudScore(
    factors: { cancelRate: number; disputeRate: number; noShowRate: number; patternScore: number },
    config: FraudConfig
  ): number {
    const { weights } = config.carrierScore;
    
    const Fc =
      weights.cancelRate * factors.cancelRate +
      weights.disputeRate * factors.disputeRate +
      weights.noShowRate * factors.noShowRate +
      weights.patternScore * factors.patternScore;
    
    return Math.min(Math.max(Fc, 0), 1);
  }
  
  // ===========================================================================
  // BID FRAUD SCORE (Fb)
  // ===========================================================================
  
  /**
   * Calculate bid fraud factors from bid context
   */
  private calculateBidFactors(
    bid: BidContext,
    config: FraudConfig
  ): { dumpingScore: number; spamScore: number; coordinationScore: number } {
    const dumpingScore = this.calculateDumpingScore(bid, config);
    const spamScore = this.calculateSpamScore(bid, config);
    const coordinationScore = this.calculateCoordinationScore(bid, config);
    
    return { dumpingScore, spamScore, coordinationScore };
  }
  
  /**
   * Calculate dumping score
   * 
   * Higher score = more suspicious (bid very close to floor)
   */
  private calculateDumpingScore(bid: BidContext, config: FraudConfig): number {
    const { maxDiscountVsMarket } = config.bidScore.dumping;
    
    // Edge case: no price range
    if (bid.startPrice <= bid.minPrice) {
      return 0;
    }
    
    // Calculate discount vs market price
    const discountVsMarket = bid.marketPrice > 0
      ? (bid.marketPrice - bid.bidPrice) / bid.marketPrice
      : 0;
    
    // If discount exceeds max, high dumping score
    if (discountVsMarket > maxDiscountVsMarket) {
      return 1;
    }
    
    // Calculate position in price range
    const range = bid.startPrice - bid.minPrice;
    const position = bid.bidPrice - bid.minPrice;
    const normalizedPosition = range > 0 ? position / range : 0.5;
    
    // Dumping score is inverse (closer to floor = higher score)
    // Also factor in discount vs market
    const positionScore = 1 - normalizedPosition;
    const discountScore = discountVsMarket / maxDiscountVsMarket;
    
    return Math.min((positionScore + discountScore) / 2, 1);
  }
  
  /**
   * Calculate spam score based on bid frequency
   */
  private calculateSpamScore(bid: BidContext, config: FraudConfig): number {
    const { maxBidsPerOrderPerHour, maxBidsPerMinuteGlobal, maxBidsPerCarrierPerDay } = 
      config.bidScore.spam;
    
    // Calculate rates
    const minuteRate = bid.bidsLastMinute / maxBidsPerMinuteGlobal;
    const hourRate = bid.bidsLastHour / maxBidsPerOrderPerHour;
    const dayRate = bid.bidsLastDay / maxBidsPerCarrierPerDay;
    
    // Take the highest rate
    const maxRate = Math.max(minuteRate, hourRate, dayRate);
    
    // Apply scoring thresholds
    if (maxRate <= 0.5) return 0;
    if (maxRate <= 0.75) return 0.2;
    if (maxRate <= 0.9) return 0.5;
    if (maxRate <= 1.0) return 0.8;
    return 1.0; // Over limit
  }
  
  /**
   * Calculate coordination score for collusion detection
   */
  private calculateCoordinationScore(bid: BidContext, config: FraudConfig): number {
    const { similarityThreshold, minCarriersForCollusion, bidSpreadThreshold } = 
      config.bidScore.coordination;
    
    let score = 0;
    
    // Multiple carriers with very similar bids
    if (bid.similarBidsCount >= 3 && bid.uniqueCarriersWithSimilarBids >= minCarriersForCollusion) {
      score += 0.3;
    }
    if (bid.similarBidsCount >= 5) {
      score += 0.2;
    }
    
    // Very low price variance (bids almost identical)
    if (bid.priceVariance < bidSpreadThreshold) {
      score += 0.3;
    } else if (bid.priceVariance < bidSpreadThreshold * 2) {
      score += 0.15;
    }
    
    // Many similar bids in short time window
    const recentSimilarBids = bid.similarBidsTimeWindow.filter(
      t => Date.now() - t.getTime() < 5 * 60 * 1000 // 5 minutes
    ).length;
    
    if (recentSimilarBids >= 3) {
      score += 0.2;
    }
    
    return Math.min(score, 1);
  }
  
  /**
   * Compute Bid Fraud Score (Fb)
   * 
   * Formula: Fb = v1·Bdumping + v2·Bspam + v3·Bcoordination
   */
  private computeBidFraudScore(
    factors: { dumpingScore: number; spamScore: number; coordinationScore: number },
    config: FraudConfig
  ): number {
    const { weights } = config.bidScore;
    
    const Fb =
      weights.dumping * factors.dumpingScore +
      weights.spam * factors.spamScore +
      weights.coordination * factors.coordinationScore;
    
    return Math.min(Math.max(Fb, 0), 1);
  }
  
  // ===========================================================================
  // TOTAL FRAUD SCORE (Ftotal)
  // ===========================================================================
  
  /**
   * Compute Total Fraud Score
   * 
   * Formula: Ftotal = α·Fc + (1-α)·Fb
   */
  private computeTotalFraudScore(
    carrierScore: number,
    bidScore: number,
    config: FraudConfig
  ): number {
    const alpha = config.totalScore.alphaCarrier;
    
    const Ftotal = alpha * carrierScore + (1 - alpha) * bidScore;
    
    return Math.min(Math.max(Ftotal, 0), 1);
  }
  
  // ===========================================================================
  // PENALTY CALCULATION
  // ===========================================================================
  
  /**
   * Calculate matching penalty
   * 
   * Formula: Penalty = β·Ftotal
   */
  private calculatePenalty(
    fraudScore: number,
    config: FraudConfig
  ): { factor: number; applied: number; percent: number } {
    const beta = config.totalScore.penaltyFactor;
    const applied = beta * fraudScore;
    
    return {
      factor: beta,
      applied,
      percent: applied * 100,
    };
  }
  
  /**
   * Apply fraud penalty to matching score
   * 
   * Formula: Score' = Score · (1 - β·Ftotal)
   */
  applyFraudPenalty(
    originalScore: number,
    fraudScore: number
  ): { adjustedScore: number; penaltyApplied: number; penaltyPercent: number } {
    const config = this.configService.getFraudConfig();
    const beta = config.totalScore.penaltyFactor;
    
    const penalty = beta * Math.min(Math.max(fraudScore, 0), 1);
    const adjustedScore = originalScore * (1 - penalty);
    
    return {
      adjustedScore: Math.max(0, adjustedScore),
      penaltyApplied: penalty,
      penaltyPercent: penalty * 100,
    };
  }
  
  // ===========================================================================
  // LEVEL DETERMINATION
  // ===========================================================================
  
  /**
   * Determine fraud level based on total score
   */
  private determineLevel(
    totalScore: number,
    config: FraudConfig
  ): FraudLevel {
    const { observe, suspect } = config.carrierScore.thresholds;
    
    if (totalScore < observe) {
      return 'unauffaellig';
    }
    if (totalScore < suspect) {
      return 'beobachten';
    }
    return 'fraud_suspected';
  }
  
  // ===========================================================================
  // RECOMMENDATIONS
  // ===========================================================================
  
  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    carrierScore: number,
    bidScore: number,
    totalScore: number,
    carrierFactors: { cancelRate: number; disputeRate: number; noShowRate: number; patternScore: number },
    bidFactors: { dumpingScore: number; spamScore: number; coordinationScore: number },
    config: FraudConfig
  ): string[] {
    const recommendations: string[] = [];
    
    // Carrier-related recommendations
    if (carrierScore > 0.5) {
      if (carrierFactors.cancelRate > 0.3) {
        recommendations.push('Carrier hat hohe Stornoquote - prüfe letzte Stornos');
      }
      if (carrierFactors.disputeRate > 0.2) {
        recommendations.push('Carrier hat erhöhte Dispute-Quote - prüfe Streitfälle');
      }
      if (carrierFactors.patternScore > 0.5) {
        recommendations.push('Verdächtiges Bidding-Pattern erkannt - analysiere Bid-Historie');
      }
    }
    
    // Bid-related recommendations
    if (bidScore > 0.5) {
      if (bidFactors.dumpingScore > 0.7) {
        recommendations.push('Bid erscheint als Price-Dumping - Bid sehr nah am Floor');
      }
      if (bidFactors.spamScore > 0.7) {
        recommendations.push('Bid-Spam erkannt - Carrier submitted zu viele Bids');
      }
      if (bidFactors.coordinationScore > 0.5) {
        recommendations.push('Mögliche Koordination mit anderen Carriern - untersuchen');
      }
    }
    
    // Level-based actions
    if (totalScore >= config.carrierScore.thresholds.suspect) {
      recommendations.push('FRAUD SUSPECTED - Kein Auto-Match');
      recommendations.push('In Manual-Review-Queue aufnehmen');
      recommendations.push('Risk-Level erhöhen');
      recommendations.push('Im Audit-Log markieren');
    } else if (totalScore >= config.carrierScore.thresholds.observe) {
      recommendations.push('Für Monitoring flaggen');
      recommendations.push('Fraud-Penalty auf Matching-Score anwenden');
    }
    
    return recommendations;
  }
  
  // ===========================================================================
  // EVENT EMISSION
  // ===========================================================================
  
  /**
   * Emit fraud.suspected event
   */
  private async emitFraudSuspectedEvent(
    carrierStats: CarrierStats,
    bidContext: BidContext,
    carrierFraudScore: number,
    bidFraudScore: number,
    totalFraudScore: number,
    fraudLevel: FraudLevel,
    carrierFactors: { cancelRate: number; disputeRate: number; noShowRate: number; patternScore: number },
    bidFactors: { dumpingScore: number; spamScore: number; coordinationScore: number },
    recommendations: string[],
    configVersion: string,
    correlationId: string
  ): Promise<void> {
    if (!this.eventPublisher) return;
    
    const payload: FraudSuspectedPayload = {
      entityId: bidContext.bidId,
      entityType: 'bid',
      carrierId: carrierStats.carrierId,
      bidId: bidContext.bidId,
      orderId: bidContext.orderId,
      carrierFraudScore,
      bidFraudScore,
      totalFraudScore,
      fraudLevel,
      breakdown: {
        carrier: carrierFactors,
        bid: bidFactors,
      },
      recommendations,
      configVersion,
      detectedAt: new Date().toISOString(),
      correlationId,
    };
    
    const event: FraudSuspectedEvent = {
      id: this.generateEventId(),
      topic: CORE_TOPICS.FRAUD_SUSPECTED,
      payload,
      timestamp: new Date().toISOString(),
      correlationId,
      source: 'fraud-scoring-service',
      version: '1.0.0',
    };
    
    await this.eventPublisher(event);
  }
  
  /**
   * Emit fraud.flagged event
   */
  private async emitFraudFlaggedEvent(
    carrierStats: CarrierStats,
    bidContext: BidContext,
    totalFraudScore: number,
    fraudLevel: FraudLevel,
    recommendations: string[],
    configVersion: string,
    correlationId: string
  ): Promise<void> {
    if (!this.eventPublisher) return;
    
    const payload: FraudFlaggedPayload = {
      entityId: bidContext.bidId,
      entityType: 'bid',
      carrierId: carrierStats.carrierId,
      totalFraudScore,
      fraudLevel,
      flagReason: `Fraud score ${totalFraudScore.toFixed(2)} exceeds observe threshold`,
      requiresManualReview: false, // Observe level doesn't require immediate review
      actionsTaken: ['Fraud penalty applied to matching score', 'Added to monitoring'],
      configVersion,
      flaggedAt: new Date().toISOString(),
      correlationId,
    };
    
    const event: FraudFlaggedEvent = {
      id: this.generateEventId(),
      topic: CORE_TOPICS.FRAUD_FLAGGED,
      payload,
      timestamp: new Date().toISOString(),
      correlationId,
      source: 'fraud-scoring-service',
      version: '1.0.0',
    };
    
    await this.eventPublisher(event);
  }
  
  // ===========================================================================
  // AUDIT LOGGING
  // ===========================================================================
  
  /**
   * Log fraud decision to audit
   */
  private logToAudit(
    carrierId: string,
    bidId: string,
    totalFraudScore: number,
    fraudLevel: FraudLevel,
    configVersion: string,
    correlationId: string
  ): void {
    // In production, this would write to the audit service
    console.log('[FraudScoring]', {
      timestamp: new Date().toISOString(),
      carrierId,
      bidId,
      totalFraudScore,
      fraudLevel,
      configVersion,
      correlationId,
    });
  }
  
  // ===========================================================================
  // HELPERS
  // ===========================================================================
  
  private generateEventId(): string {
    const timestamp = Date.now().toString(36).padStart(10, '0');
    const random = Math.random().toString(36).substring(2, 12);
    return `evt_${timestamp}${random}`;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const fraudScoringService = new FraudScoringService();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick fraud analysis for a bid
 */
export async function analyzeBidFraud(
  carrierStats: CarrierStats,
  bidContext: BidContext,
  correlationId: string
): Promise<FraudAnalysisResult> {
  return fraudScoringService.analyzeBidFraud(carrierStats, bidContext, correlationId);
}

/**
 * Quick fraud penalty application
 */
export function applyFraudPenalty(
  originalScore: number,
  fraudScore: number
): { adjustedScore: number; penaltyApplied: number; penaltyPercent: number } {
  return fraudScoringService.applyFraudPenalty(originalScore, fraudScore);
}
