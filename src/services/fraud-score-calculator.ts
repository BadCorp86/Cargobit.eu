// ============================================
// CARGOBIT FRAUD SCORE CALCULATOR
// Carrier & Bid Fraud Detection Formulas
// ============================================

/**
 * Fraud Score System nach User-Spezifikation:
 * 
 * CARRIER-FRAUD-SCORE (Fc ∈ [0,1]):
 * Fc = w1·Ccancel + w2·Cdispute + w3·CnoShow + w4·Cpattern
 * 
 * BID-FRAUD-SCORE (Fb ∈ [0,1]):
 * Fb = v1·Bdumping + v2·Bspam + v3·Bcoordination
 * 
 * TOTAL FRAUD SCORE:
 * Ftotal = α·Fc + (1-α)·Fb
 * 
 * MATCHING INTEGRATION:
 * Score' = Score · (1 - β·Ftotal)
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CarrierFraudFactors {
  /** Normalisierte Stornoquote (0-1) */
  cancelRate: number;
  
  /** Normalisierte Dispute-Quote (0-1) */
  disputeRate: number;
  
  /** Anteil "No-Show" (0-1) */
  noShowRate: number;
  
  /** Pattern-Score (Collusion, immer knapp über Min-Preis) (0-1) */
  patternScore: number;
}

export interface BidFraudFactors {
  /** Dumping-Score - wie stark versucht das Bid, Mindestpreis zu "touch'en" (0-1) */
  dumpingScore: number;
  
  /** Spam-Score - viele Bids in kurzer Zeit (0-1) */
  spamScore: number;
  
  /** Coordination-Score - mehrere Carrier mit extrem ähnlichen Bids (0-1) */
  coordinationScore: number;
}

export interface FraudScoreWeights {
  /** Carrier weights (default: 0.3, 0.3, 0.2, 0.2) */
  carrier: {
    w1_cancel: number;
    w2_dispute: number;
    w3_noShow: number;
    w4_pattern: number;
  };
  
  /** Bid weights (default: 0.5, 0.3, 0.2) */
  bid: {
    v1_dumping: number;
    v2_spam: number;
    v3_coordination: number;
  };
  
  /** Total score alpha (default: 0.6) */
  alpha: number;
  
  /** Matching penalty beta (default: 0.5) */
  beta: number;
}

export interface FraudScoreResult {
  /** Carrier Fraud Score (0-1) */
  carrierScore: number;
  
  /** Bid Fraud Score (0-1) */
  bidScore: number;
  
  /** Total Fraud Score (0-1) */
  totalScore: number;
  
  /** Risk level based on total score */
  level: FraudRiskLevel;
  
  /** Flag for fraud suspected */
  fraudSuspected: boolean;
  
  /** Breakdown of contributing factors */
  breakdown: {
    carrier: CarrierFraudFactors;
    bid: BidFraudFactors;
  };
  
  /** Recommendations */
  recommendations: string[];
}

export type FraudRiskLevel = 'unauffaellig' | 'beobachten' | 'fraud_suspected';

// ============================================
// DEFAULT WEIGHTS (as per User Spec)
// ============================================

export const DEFAULT_FRAUD_WEIGHTS: FraudScoreWeights = {
  carrier: {
    w1_cancel: 0.3,
    w2_dispute: 0.3,
    w3_noShow: 0.2,
    w4_pattern: 0.2,
  },
  bid: {
    v1_dumping: 0.5,
    v2_spam: 0.3,
    v3_coordination: 0.2,
  },
  alpha: 0.6,    // Carrier-Historie wiegt stärker als einzelnes Bid
  beta: 0.5,     // Bei Ftotal=0.8 wird Score um 40% reduziert
};

// ============================================
// FRAUD THRESHOLDS
// ============================================

export const FRAUD_THRESHOLDS = {
  /** Ftotal < 0.3: unauffällig */
  LOW: 0.3,
  /** 0.3 ≤ Ftotal < 0.6: beobachten / flaggen */
  MEDIUM: 0.6,
  /** Ftotal ≥ 0.6: fraud_suspected = true */
  HIGH: 0.6,
};

// ============================================
// FRAUD SCORE CALCULATOR CLASS
// ============================================

export class FraudScoreCalculator {
  private weights: FraudScoreWeights;
  
  constructor(weights: Partial<FraudScoreWeights> = {}) {
    this.weights = {
      carrier: { ...DEFAULT_FRAUD_WEIGHTS.carrier, ...weights.carrier },
      bid: { ...DEFAULT_FRAUD_WEIGHTS.bid, ...weights.bid },
      alpha: weights.alpha ?? DEFAULT_FRAUD_WEIGHTS.alpha,
      beta: weights.beta ?? DEFAULT_FRAUD_WEIGHTS.beta,
    };
  }
  
  // ============================================
  // CARRIER FRAUD SCORE (Fc)
  // ============================================
  
  /**
   * Calculate Carrier Fraud Score (Fc)
   * 
   * Formula: Fc = w1·Ccancel + w2·Cdispute + w3·CnoShow + w4·Cpattern
   * 
   * @param factors - Carrier fraud factors
   * @returns Carrier fraud score (0-1)
   */
  calculateCarrierScore(factors: CarrierFraudFactors): number {
    const { w1_cancel, w2_dispute, w3_noShow, w4_pattern } = this.weights.carrier;
    
    // Ensure factors are clamped to [0, 1]
    const Ccancel = this.clamp(factors.cancelRate);
    const Cdispute = this.clamp(factors.disputeRate);
    const CnoShow = this.clamp(factors.noShowRate);
    const Cpattern = this.clamp(factors.patternScore);
    
    // Calculate weighted score
    const Fc = w1_cancel * Ccancel + 
               w2_dispute * Cdispute + 
               w3_noShow * CnoShow + 
               w4_pattern * Cpattern;
    
    return this.clamp(Fc);
  }
  
  // ============================================
  // BID FRAUD SCORE (Fb)
  // ============================================
  
  /**
   * Calculate Bid Fraud Score (Fb)
   * 
   * Formula: Fb = v1·Bdumping + v2·Bspam + v3·Bcoordination
   * 
   * @param factors - Bid fraud factors
   * @returns Bid fraud score (0-1)
   */
  calculateBidScore(factors: BidFraudFactors): number {
    const { v1_dumping, v2_spam, v3_coordination } = this.weights.bid;
    
    // Ensure factors are clamped to [0, 1]
    const Bdumping = this.clamp(factors.dumpingScore);
    const Bspam = this.clamp(factors.spamScore);
    const Bcoordination = this.clamp(factors.coordinationScore);
    
    // Calculate weighted score
    const Fb = v1_dumping * Bdumping + 
               v2_spam * Bspam + 
               v3_coordination * Bcoordination;
    
    return this.clamp(Fb);
  }
  
  // ============================================
  // TOTAL FRAUD SCORE (Ftotal)
  // ============================================
  
  /**
   * Calculate Total Fraud Score
   * 
   * Formula: Ftotal = α·Fc + (1-α)·Fb
   * 
   * @param carrierScore - Carrier fraud score (Fc)
   * @param bidScore - Bid fraud score (Fb)
   * @returns Total fraud score (0-1)
   */
  calculateTotalScore(carrierScore: number, bidScore: number): number {
    const { alpha } = this.weights;
    
    const Ftotal = alpha * carrierScore + (1 - alpha) * bidScore;
    
    return this.clamp(Ftotal);
  }
  
  // ============================================
  // FULL FRAUD ANALYSIS
  // ============================================
  
  /**
   * Perform full fraud analysis for a bid
   */
  analyzeFraud(
    carrierFactors: CarrierFraudFactors,
    bidFactors: BidFraudFactors
  ): FraudScoreResult {
    // Calculate individual scores
    const carrierScore = this.calculateCarrierScore(carrierFactors);
    const bidScore = this.calculateBidScore(bidFactors);
    const totalScore = this.calculateTotalScore(carrierScore, bidScore);
    
    // Determine level and flags
    const level = this.determineLevel(totalScore);
    const fraudSuspected = totalScore >= FRAUD_THRESHOLDS.HIGH;
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      carrierScore,
      bidScore,
      totalScore,
      carrierFactors,
      bidFactors
    );
    
    return {
      carrierScore,
      bidScore,
      totalScore,
      level,
      fraudSuspected,
      breakdown: {
        carrier: carrierFactors,
        bid: bidFactors,
      },
      recommendations,
    };
  }
  
  // ============================================
  // MATCHING INTEGRATION
  // ============================================
  
  /**
   * Apply fraud penalty to matching score
   * 
   * Formula: Score' = Score · (1 - β·Ftotal)
   * 
   * @param originalScore - Original matching score
   * @param fraudScore - Total fraud score
   * @returns Adjusted matching score
   */
  applyFraudPenalty(originalScore: number, fraudScore: number): {
    adjustedScore: number;
    penaltyApplied: number;
    penaltyPercent: number;
  } {
    const { beta } = this.weights;
    
    // Calculate penalty
    const penalty = beta * this.clamp(fraudScore);
    const adjustedScore = originalScore * (1 - penalty);
    
    return {
      adjustedScore: Math.max(0, adjustedScore),
      penaltyApplied: penalty,
      penaltyPercent: penalty * 100,
    };
  }
  
  // ============================================
  // BID DUMPING DETECTOR
  // ============================================
  
  /**
   * Calculate dumping score for a bid
   * 
   * Formula: Bdumping = 1 - (bidPrice - minPrice) / (startPrice - minPrice)
   * 
   * When bidPrice = minPrice → Bdumping = 1 (maximum dumping)
   * When bidPrice = startPrice → Bdumping = 0 (no dumping)
   */
  calculateDumpingScore(params: {
    bidPrice: number;
    minPrice: number;
    startPrice: number;
  }): number {
    const { bidPrice, minPrice, startPrice } = params;
    
    // Edge case: if startPrice == minPrice, no range to evaluate
    if (startPrice <= minPrice) {
      return 0;
    }
    
    // Calculate how close to the floor the bid is
    const range = startPrice - minPrice;
    const position = bidPrice - minPrice;
    
    // Normalized position (0 = at floor, 1 = at start)
    const normalizedPosition = position / range;
    
    // Dumping score is inverse (closer to floor = higher score)
    const Bdumping = 1 - normalizedPosition;
    
    return this.clamp(Bdumping);
  }
  
  // ============================================
  // SPAM DETECTOR
  // ============================================
  
  /**
   * Calculate spam score based on bid frequency
   */
  calculateSpamScore(params: {
    bidsLastMinute: number;
    bidsLastHour: number;
    maxBidsPerMinute: number;
    maxBidsPerHour: number;
  }): number {
    const { bidsLastMinute, bidsLastHour, maxBidsPerMinute, maxBidsPerHour } = params;
    
    // Score based on minute rate
    const minuteRate = bidsLastMinute / maxBidsPerMinute;
    const hourRate = bidsLastHour / maxBidsPerHour;
    
    // Take the higher rate and apply exponential penalty
    const maxRate = Math.max(minuteRate, hourRate);
    
    if (maxRate <= 0.5) return 0;
    if (maxRate <= 0.75) return 0.2;
    if (maxRate <= 0.9) return 0.5;
    if (maxRate <= 1.0) return 0.8;
    return 1.0; // Over limit
  }
  
  // ============================================
  // COORDINATION DETECTOR
  // ============================================
  
  /**
   * Calculate coordination score for collusion detection
   */
  calculateCoordinationScore(params: {
    similarBidCount: number;      // How many similar bids from other carriers
    timeWindowMinutes: number;    // Time window for similar bids
    priceVariance: number;        // Variance in prices (lower = more suspicious)
    uniqueCarriers: number;       // Number of unique carriers with similar bids
  }): number {
    const { similarBidCount, priceVariance, uniqueCarriers } = params;
    
    let score = 0;
    
    // High number of similar bids
    if (similarBidCount >= 3) {
      score += 0.3;
    }
    if (similarBidCount >= 5) {
      score += 0.2;
    }
    
    // Very low price variance (bids are almost identical)
    if (priceVariance < 0.01) {
      score += 0.3;
    } else if (priceVariance < 0.03) {
      score += 0.15;
    }
    
    // Multiple unique carriers with similar bids
    if (uniqueCarriers >= 2 && uniqueCarriers <= 5) {
      // 2-5 carriers rotating = suspicious
      score += 0.2;
    }
    
    return this.clamp(score);
  }
  
  // ============================================
  // CARRIER PATTERN SCORE
  // ============================================
  
  /**
   * Calculate pattern score for carrier behavior analysis
   */
  calculatePatternScore(params: {
    winsJustAboveFloor: number;   // How often wins just above floor (ratio)
    rotationPattern: number;      // Rotation pattern score (0-1)
    sameRegionWins: number;       // Same carrier wins in region (ratio)
    avgMarginOverFloor: number;   // Average margin over floor (%)
  }): number {
    const { winsJustAboveFloor, rotationPattern, sameRegionWins, avgMarginOverFloor } = params;
    
    let score = 0;
    
    // Often wins just above floor
    if (winsJustAboveFloor > 0.3) {
      score += winsJustAboveFloor * 0.4;
    }
    
    // Rotation pattern detected
    score += rotationPattern * 0.3;
    
    // High regional concentration
    if (sameRegionWins > 0.5) {
      score += (sameRegionWins - 0.5) * 0.2;
    }
    
    // Very low margin
    if (avgMarginOverFloor < 0.05) {
      score += 0.3;
    } else if (avgMarginOverFloor < 0.10) {
      score += 0.15;
    }
    
    return this.clamp(score);
  }
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  private determineLevel(totalScore: number): FraudRiskLevel {
    if (totalScore < FRAUD_THRESHOLDS.LOW) {
      return 'unauffaellig';
    }
    if (totalScore < FRAUD_THRESHOLDS.MEDIUM) {
      return 'beobachten';
    }
    return 'fraud_suspected';
  }
  
  private generateRecommendations(
    carrierScore: number,
    bidScore: number,
    totalScore: number,
    carrierFactors: CarrierFraudFactors,
    bidFactors: BidFraudFactors
  ): string[] {
    const recommendations: string[] = [];
    
    // High carrier score
    if (carrierScore > 0.5) {
      if (carrierFactors.cancelRate > 0.3) {
        recommendations.push('Carrier has high cancellation rate - review recent cancellations');
      }
      if (carrierFactors.disputeRate > 0.2) {
        recommendations.push('Carrier has elevated dispute rate - check dispute reasons');
      }
      if (carrierFactors.patternScore > 0.5) {
        recommendations.push('Suspicious bidding pattern detected - analyze bid history');
      }
    }
    
    // High bid score
    if (bidScore > 0.5) {
      if (bidFactors.dumpingScore > 0.7) {
        recommendations.push('Bid appears to be price dumping - bid very close to floor');
      }
      if (bidFactors.spamScore > 0.7) {
        recommendations.push('Bid spam detected - carrier submitting too many bids');
      }
      if (bidFactors.coordinationScore > 0.5) {
        recommendations.push('Possible coordination with other carriers - investigate');
      }
    }
    
    // Total score actions
    if (totalScore >= FRAUD_THRESHOLDS.HIGH) {
      recommendations.push('FRAUD SUSPECTED - Do not auto-match');
      recommendations.push('Add to manual review queue');
      recommendations.push('Increase risk level');
      recommendations.push('Mark in audit log');
    } else if (totalScore >= FRAUD_THRESHOLDS.LOW) {
      recommendations.push('Flag for monitoring');
      recommendations.push('Apply fraud penalty to matching score');
    }
    
    return recommendations;
  }
  
  private clamp(value: number, min = 0, max = 1): number {
    return Math.min(Math.max(value, min), max);
  }
  
  // ============================================
  // GETTERS
  // ============================================
  
  getWeights(): FraudScoreWeights {
    return { ...this.weights };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const fraudScoreCalculator = new FraudScoreCalculator();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick fraud check for a bid
 */
export function checkBidFraud(params: {
  carrierId: string;
  bidPrice: number;
  minPrice: number;
  startPrice: number;
  carrierStats: {
    cancelRate: number;
    disputeRate: number;
    noShowRate: number;
  };
  recentBidStats: {
    bidsLastMinute: number;
    bidsLastHour: number;
    similarBidCount: number;
    uniqueCarriers: number;
    priceVariance: number;
  };
}): FraudScoreResult {
  const calculator = new FraudScoreCalculator();
  
  // Calculate carrier factors
  const carrierFactors: CarrierFraudFactors = {
    cancelRate: params.carrierStats.cancelRate,
    disputeRate: params.carrierStats.disputeRate,
    noShowRate: params.carrierStats.noShowRate,
    patternScore: 0, // Would be calculated from historical data
  };
  
  // Calculate bid factors
  const bidFactors: BidFraudFactors = {
    dumpingScore: calculator.calculateDumpingScore({
      bidPrice: params.bidPrice,
      minPrice: params.minPrice,
      startPrice: params.startPrice,
    }),
    spamScore: calculator.calculateSpamScore({
      bidsLastMinute: params.recentBidStats.bidsLastMinute,
      bidsLastHour: params.recentBidStats.bidsLastHour,
      maxBidsPerMinute: 10,
      maxBidsPerHour: 100,
    }),
    coordinationScore: calculator.calculateCoordinationScore({
      similarBidCount: params.recentBidStats.similarBidCount,
      timeWindowMinutes: 60,
      priceVariance: params.recentBidStats.priceVariance,
      uniqueCarriers: params.recentBidStats.uniqueCarriers,
    }),
  };
  
  return calculator.analyzeFraud(carrierFactors, bidFactors);
}

// ============================================
// EXPORTS
// ============================================

export type {
  CarrierFraudFactors,
  BidFraudFactors,
  FraudScoreWeights,
  FraudScoreResult,
  FraudRiskLevel,
};
