/**
 * CargoBit Anti-Fraud Service
 * 
 * Multi-layer fraud detection for Pricing, Bidding, and Matching.
 * Pattern detection, carrier fraud scoring, and real-time flagging.
 * 
 * @module @cargobit/anti-fraud-service
 * @version 1.0.0
 */

import {
  IEventBus,
  Topic,
  CargoBitEvent,
  CORE_TOPICS,
  BidValidatedPayload,
  MatchingCompletedPayload,
  ExecutionStatusChangedPayload,
} from '../types/events';

// =============================================================================
// FRAUD SCORE TYPES
// =============================================================================

/**
 * Carrier fraud score and contributing factors.
 */
export interface CarrierFraudScore {
  carrierId: string;
  
  /** Overall fraud score (0-1, higher = more suspicious) */
  score: number;
  
  /** Risk level based on score */
  level: FraudRiskLevel;
  
  /** Individual factor scores */
  factors: FraudFactorScores;
  
  /** Recent flags */
  flags: FraudFlag[];
  
  /** Score history */
  trend: 'improving' | 'stable' | 'declining';
  
  /** Last updated */
  updatedAt: string;
  
  /** Next review date */
  nextReviewAt?: string;
}

export type FraudRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FraudFactorScores {
  /** Cancellation rate score (0-1) */
  cancelRate: number;
  
  /** Dispute frequency score (0-1) */
  disputeRate: number;
  
  /** No-show incidence score (0-1) */
  noShowRate: number;
  
  /** Price anomaly history score (0-1) */
  priceAnomaly: number;
  
  /** Collusion suspicion score (0-1) */
  collusion: number;
  
  /** Bidding pattern anomaly score (0-1) */
  biddingPattern: number;
}

export interface FraudFlag {
  id: string;
  carrierId: string;
  type: FraudFlagType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: Record<string, unknown>;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export type FraudFlagType =
  | 'UNUSUAL_CANCEL_PATTERN'
  | 'HIGH_DISPUTE_RATE'
  | 'NO_SHOW_INCIDENT'
  | 'PRICE_ANOMALY'
  | 'COLLUSION_SUSPECTED'
  | 'BID_FLOOD'
  | 'IDENTICAL_BIDS'
  | 'ROTATION_PATTERN'
  | 'GEOGRAPHIC_ANOMALY';

// =============================================================================
// BID VALIDATION (Pricing Layer)
// =============================================================================

export interface BidValidationConfig {
  /** Minimum price factor vs market price */
  minPriceFactor: number;
  
  /** Absolute minimum price in EUR */
  hardFloorEur: number;
  
  /** Maximum allowed discount from market price (%) */
  maxDiscountPct: number;
  
  /** Warn if discount exceeds this threshold */
  warnDiscountPct: number;
}

export const DEFAULT_BID_VALIDATION_CONFIG: BidValidationConfig = {
  minPriceFactor: 0.85,
  hardFloorEur: 20,
  maxDiscountPct: 35,
  warnDiscountPct: 25,
};

export interface BidValidationResult {
  valid: boolean;
  reason: BidValidationReason;
  priceScore: number;
  warnings: string[];
  flags?: FraudFlagType[];
}

export type BidValidationReason =
  | 'VALID'
  | 'BELOW_MIN_FACTOR'
  | 'BELOW_HARD_FLOOR'
  | 'EXCEEDS_MAX_DISCOUNT'
  | 'RISK_BLOCKED'
  | 'FRAUD_BLOCKED';

/**
 * Bid validator for Pricing-Service layer.
 * 
 * @example
 * ```typescript
 * const validator = new BidValidator(config, fraudService);
 * 
 * const result = await validator.validate({
 *   carrierId: 'car_123',
 *   orderId: 'order_456',
 *   bidPrice: 450,
 *   marketPrice: 500,
 *   minPrice: 400,
 *   riskLevel: 'green',
 * });
 * ```
 */
export class BidValidator {
  private config: BidValidationConfig;
  private fraudService: AntiFraudService;

  constructor(config: BidValidationConfig, fraudService: AntiFraudService) {
    this.config = config;
    this.fraudService = fraudService;
  }

  async validate(params: {
    carrierId: string;
    orderId: string;
    bidPrice: number;
    marketPrice: number;
    minPrice: number;
    riskLevel: 'green' | 'yellow' | 'red';
    currency?: string;
  }): Promise<BidValidationResult> {
    const warnings: string[] = [];
    const flags: FraudFlagType[] = [];

    // Check carrier fraud score
    const fraudScore = await this.fraudService.getCarrierFraudScore(params.carrierId);
    if (fraudScore && fraudScore.level === 'critical') {
      return {
        valid: false,
        reason: 'FRAUD_BLOCKED',
        priceScore: 0,
        warnings: ['Carrier is blocked due to fraud concerns'],
        flags: ['UNUSUAL_CANCEL_PATTERN'],
      };
    }

    // Check hard floor
    if (params.bidPrice < this.config.hardFloorEur) {
      flags.push('PRICE_ANOMALY');
      return {
        valid: false,
        reason: 'BELOW_HARD_FLOOR',
        priceScore: 0,
        warnings: [`Bid is below absolute minimum of ${this.config.hardFloorEur} EUR`],
        flags,
      };
    }

    // Check minimum price factor
    const minAllowedPrice = params.minPrice * this.config.minPriceFactor;
    if (params.bidPrice < minAllowedPrice) {
      flags.push('PRICE_ANOMALY');
      return {
        valid: false,
        reason: 'BELOW_MIN_FACTOR',
        priceScore: 0,
        warnings: [`Bid is below minimum price factor`],
        flags,
      };
    }

    // Check max discount
    const discountPct = ((params.marketPrice - params.bidPrice) / params.marketPrice) * 100;
    if (discountPct > this.config.maxDiscountPct) {
      flags.push('PRICE_ANOMALY');
      return {
        valid: false,
        reason: 'EXCEEDS_MAX_DISCOUNT',
        priceScore: 0,
        warnings: [`Discount of ${discountPct.toFixed(1)}% exceeds maximum of ${this.config.maxDiscountPct}%`],
        flags,
      };
    }

    // Warning for high discount
    if (discountPct > this.config.warnDiscountPct) {
      warnings.push(`High discount of ${discountPct.toFixed(1)}% - flagged for review`);
    }

    // Risk level check
    if (params.riskLevel === 'red') {
      return {
        valid: false,
        reason: 'RISK_BLOCKED',
        priceScore: 0,
        warnings: ['Route has high risk level'],
        flags,
      };
    }

    // Calculate price score (0-1, higher is better)
    const priceScore = this.calculatePriceScore(
      params.bidPrice,
      params.marketPrice,
      params.minPrice
    );

    // Flag if fraud score is elevated
    if (fraudScore && fraudScore.level !== 'low') {
      warnings.push(`Carrier has elevated fraud risk level: ${fraudScore.level}`);
    }

    // Create fraud flags if any
    if (flags.length > 0) {
      for (const flagType of flags) {
        await this.fraudService.createFlag({
          carrierId: params.carrierId,
          type: flagType,
          severity: 'medium',
          description: `Bid validation triggered flag: ${flagType}`,
          evidence: {
            orderId: params.orderId,
            bidPrice: params.bidPrice,
            marketPrice: params.marketPrice,
          },
        });
      }
    }

    return {
      valid: true,
      reason: 'VALID',
      priceScore,
      warnings,
      flags: flags.length > 0 ? flags : undefined,
    };
  }

  private calculatePriceScore(
    bidPrice: number,
    marketPrice: number,
    minPrice: number
  ): number {
    // Score of 1.0 = at or below market price
    // Score of 0.5 = halfway between market and min
    // Score of 0.0 = at minimum price
    if (bidPrice <= marketPrice) return 1.0;
    if (bidPrice <= minPrice) return 0.0;

    const range = marketPrice - minPrice;
    const position = bidPrice - minPrice;
    return 1 - (position / range);
  }
}

// =============================================================================
// BIDDING PATTERN DETECTOR
// =============================================================================

export interface BiddingPatternConfig {
  /** Max bids per hour per order per carrier */
  maxBidsPerHourPerOrder: number;
  
  /** Max bids per minute globally (flood detection) */
  maxBidsPerMinuteGlobal: number;
  
  /** Time window for identical bid detection (seconds) */
  identicalBidWindowSec: number;
}

export const DEFAULT_BIDDING_PATTERN_CONFIG: BiddingPatternConfig = {
  maxBidsPerHourPerOrder: 10,
  maxBidsPerMinuteGlobal: 100,
  identicalBidWindowSec: 60,
};

/**
 * Bidding pattern detector for Bidding-Service layer.
 */
export class BiddingPatternDetector {
  private config: BiddingPatternPatternConfig;
  private fraudService: AntiFraudService;
  private bidHistory: Map<string, { timestamp: number; price: number; carrierId: string }[]>;
  private globalBidCount: { timestamp: number; count: number }[];

  constructor(config: BiddingPatternConfig, fraudService: AntiFraudService) {
    this.config = config;
    this.fraudService = fraudService;
    this.bidHistory = new Map();
    this.globalBidCount = [];
  }

  /**
   * Check if a bid should be rate-limited.
   */
  checkRateLimit(carrierId: string, orderId: string): { allowed: boolean; retryAfter?: number } {
    const key = `${carrierId}:${orderId}`;
    const now = Date.now();
    const hourAgo = now - 3600000;

    // Get recent bids for this carrier/order
    const history = this.bidHistory.get(key) ?? [];
    const recentBids = history.filter((b) => b.timestamp > hourAgo);

    if (recentBids.length >= this.config.maxBidsPerHourPerOrder) {
      const oldestBid = recentBids[0].timestamp;
      const retryAfter = Math.ceil((oldestBid + 3600000 - now) / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  /**
   * Check for bid flood globally.
   */
  checkBidFlood(): { flood: boolean; count: number } {
    const now = Date.now();
    const minuteAgo = now - 60000;

    // Clean old entries
    this.globalBidCount = this.globalBidCount.filter((e) => e.timestamp > minuteAgo);

    // Sum recent count
    const count = this.globalBidCount.reduce((sum, e) => sum + e.count, 0);

    return {
      flood: count >= this.config.maxBidsPerMinuteGlobal,
      count,
    };
  }

  /**
   * Check for identical bids from different carriers.
   */
  async checkIdenticalBids(
    orderId: string,
    carrierId: string,
    bidPrice: number
  ): Promise<{ identical: boolean; carriers: string[] }> {
    const now = Date.now();
    const windowStart = now - this.config.identicalBidWindowSec * 1000;

    // Get recent bids for this order
    const orderKey = `order:${orderId}`;
    const history = this.bidHistory.get(orderKey) ?? [];
    const recentBids = history.filter((b) => b.timestamp > windowStart);

    // Find identical bids
    const identical = recentBids.filter((b) => b.price === bidPrice && b.carrierId !== carrierId);
    const carriers = [...new Set(identical.map((b) => b.carrierId))];

    if (identical.length > 0) {
      // Flag for potential collusion
      await this.fraudService.createFlag({
        carrierId,
        type: 'IDENTICAL_BIDS',
        severity: 'high',
        description: `Identical bid price (${bidPrice}) with ${carriers.length} other carrier(s)`,
        evidence: {
          orderId,
          bidPrice,
          otherCarriers: carriers,
        },
      });

      // Also flag other carriers
      for (const otherCarrier of carriers) {
        await this.fraudService.createFlag({
          carrierId: otherCarrier,
          type: 'IDENTICAL_BIDS',
          severity: 'high',
          description: `Identical bid price (${bidPrice}) with other carrier(s)`,
          evidence: {
            orderId,
            bidPrice,
            linkedCarrier: carrierId,
          },
        });
      }
    }

    return {
      identical: identical.length > 0,
      carriers,
    };
  }

  /**
   * Record a bid for pattern tracking.
   */
  recordBid(carrierId: string, orderId: string, bidPrice: number): void {
    const now = Date.now();

    // Record for carrier/order rate limiting
    const key = `${carrierId}:${orderId}`;
    const history = this.bidHistory.get(key) ?? [];
    history.push({ timestamp: now, price: bidPrice, carrierId });
    this.bidHistory.set(key, history);

    // Record for order-level identical bid detection
    const orderKey = `order:${orderId}`;
    const orderHistory = this.bidHistory.get(orderKey) ?? [];
    orderHistory.push({ timestamp: now, price: bidPrice, carrierId });
    this.bidHistory.set(orderKey, orderHistory);

    // Record for global flood detection
    this.globalBidCount.push({ timestamp: now, count: 1 });
  }

  /**
   * Clean old entries (call periodically).
   */
  cleanup(): void {
    const hourAgo = Date.now() - 3600000;
    
    for (const [key, history] of this.bidHistory) {
      const filtered = history.filter((b) => b.timestamp > hourAgo);
      if (filtered.length === 0) {
        this.bidHistory.delete(key);
      } else {
        this.bidHistory.set(key, filtered);
      }
    }

    this.globalBidCount = this.globalBidCount.filter((e) => e.timestamp > hourAgo);
  }
}

// Fix typo
type BiddingPatternPatternConfig = BiddingPatternConfig;

// =============================================================================
// COLLUSION DETECTOR (Matching Layer)
// =============================================================================

export interface CollusionPatternConfig {
  /** Threshold for same carrier group winning (ratio) */
  sameGroupThreshold: number;
  
  /** Threshold for bid spread being suspicious (ratio) */
  bidSpreadThreshold: number;
  
  /** Threshold for bids just above floor */
  justAboveFloorThreshold: number;
  
  /** Time window for rotation pattern detection (days) */
  rotationWindowDays: number;
}

export const DEFAULT_COLLUSION_CONFIG: CollusionPatternConfig = {
  sameGroupThreshold: 0.8,
  bidSpreadThreshold: 0.02,
  justAboveFloorThreshold: 0.05,
  rotationWindowDays: 30,
};

/**
 * Collusion pattern detector for Matching-Service layer.
 * Runs asynchronously after matching completes.
 */
export class CollusionDetector {
  private config: CollusionPatternConfig;
  private fraudService: AntiFraudService;
  private matchingHistory: Map<string, MatchingRecord[]>;

  constructor(config: CollusionPatternConfig, fraudService: AntiFraudService) {
    this.config = config;
    this.fraudService = fraudService;
    this.matchingHistory = new Map();
  }

  /**
   * Analyze matching result for collusion patterns.
   */
  async analyzeMatching(params: {
    orderId: string;
    region: string;
    winner: { carrierId: string; bidPrice: number; score: number };
    candidates: Array<{ carrierId: string; bidPrice: number; score: number }>;
    minPrice: number;
    marketPrice: number;
  }): Promise<CollusionAnalysisResult> {
    const flags: FraudFlagType[] = [];
    const warnings: string[] = [];

    // Pattern 1: Same carrier group wins too often
    const groupPattern = await this.checkSameGroupPattern(params.region, params.winner.carrierId);
    if (groupPattern.suspicious) {
      flags.push('ROTATION_PATTERN');
      warnings.push(`Carrier group wins ${groupPattern.winRate.toFixed(1)}% in region`);
    }

    // Pattern 2: Bids extremely close together
    const spreadPattern = this.checkBidSpreadPattern(params.candidates);
    if (spreadPattern.suspicious) {
      flags.push('COLLUSION_SUSPECTED');
      warnings.push(`Bid spread is suspiciously small: ${spreadPattern.spread.toFixed(2)}%`);
    }

    // Pattern 3: Bids just above floor
    const floorPattern = this.checkJustAboveFloorPattern(params.winner, params.minPrice, params.marketPrice);
    if (floorPattern.suspicious) {
      flags.push('PRICE_ANOMALY');
      warnings.push(`Winning bid is only ${floorPattern.aboveFloor.toFixed(1)}% above floor`);
    }

    // Pattern 4: Rotation pattern
    const rotationPattern = await this.checkRotationPattern(params.region, params.winner.carrierId);
    if (rotationPattern.suspicious) {
      flags.push('ROTATION_PATTERN');
      warnings.push(`Possible rotation pattern detected with carriers: ${rotationPattern.carriers.join(', ')}`);
    }

    // Create flags
    for (const flagType of flags) {
      await this.fraudService.createFlag({
        carrierId: params.winner.carrierId,
        type: flagType,
        severity: 'high',
        description: `Collusion detection triggered: ${flagType}`,
        evidence: {
          orderId: params.orderId,
          region: params.region,
          bidPrice: params.winner.bidPrice,
          minPrice: params.minPrice,
          marketPrice: params.marketPrice,
        },
      });
    }

    // Record for future analysis
    this.recordMatching(params.region, params.winner);

    return {
      suspicious: flags.length > 0,
      flags,
      warnings,
      details: {
        groupPattern,
        spreadPattern,
        floorPattern,
        rotationPattern,
      },
    };
  }

  private async checkSameGroupPattern(
    region: string,
    carrierId: string
  ): Promise<{ suspicious: boolean; winRate: number }> {
    const history = this.matchingHistory.get(region) ?? [];
    if (history.length < 10) {
      return { suspicious: false, winRate: 0 };
    }

    const wins = history.filter((h) => h.carrierId === carrierId).length;
    const winRate = (wins / history.length) * 100;

    return {
      suspicious: winRate >= this.config.sameGroupThreshold * 100,
      winRate,
    };
  }

  private checkBidSpreadPattern(
    candidates: Array<{ carrierId: string; bidPrice: number; score: number }>
  ): { suspicious: boolean; spread: number } {
    if (candidates.length < 2) {
      return { suspicious: false, spread: 0 };
    }

    const prices = candidates.map((c) => c.bidPrice).sort((a, b) => a - b);
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    const spread = ((maxPrice - minPrice) / minPrice) * 100;

    return {
      suspicious: spread <= this.config.bidSpreadThreshold * 100,
      spread,
    };
  }

  private checkJustAboveFloorPattern(
    winner: { bidPrice: number },
    minPrice: number,
    marketPrice: number
  ): { suspicious: boolean; aboveFloor: number } {
    const aboveFloor = ((winner.bidPrice - minPrice) / minPrice) * 100;

    return {
      suspicious: aboveFloor <= this.config.justAboveFloorThreshold * 100,
      aboveFloor,
    };
  }

  private async checkRotationPattern(
    region: string,
    winnerId: string
  ): Promise<{ suspicious: boolean; carriers: string[] }> {
    const history = this.matchingHistory.get(region) ?? [];
    if (history.length < 20) {
      return { suspicious: false, carriers: [] };
    }

    // Check if carriers take turns winning
    const recentWinners = history.slice(-20).map((h) => h.carrierId);
    const uniqueWinners = [...new Set(recentWinners)];

    // If 3-5 carriers rotate regularly, flag
    if (uniqueWinners.length >= 3 && uniqueWinners.length <= 5) {
      // Check if each wins roughly equally
      const counts = new Map<string, number>();
      for (const w of recentWinners) {
        counts.set(w, (counts.get(w) ?? 0) + 1);
      }

      const values = Array.from(counts.values());
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;

      // Low variance = suspiciously equal distribution
      if (variance < 2) {
        return {
          suspicious: true,
          carriers: uniqueWinners,
        };
      }
    }

    return { suspicious: false, carriers: [] };
  }

  private recordMatching(region: string, winner: { carrierId: string }): void {
    const history = this.matchingHistory.get(region) ?? [];
    history.push({
      carrierId: winner.carrierId,
      timestamp: Date.now(),
    });

    // Keep last 100 records per region
    if (history.length > 100) {
      history.shift();
    }

    this.matchingHistory.set(region, history);
  }
}

interface MatchingRecord {
  carrierId: string;
  timestamp: number;
}

interface CollusionAnalysisResult {
  suspicious: boolean;
  flags: FraudFlagType[];
  warnings: string[];
  details: {
    groupPattern: { suspicious: boolean; winRate: number };
    spreadPattern: { suspicious: boolean; spread: number };
    floorPattern: { suspicious: boolean; aboveFloor: number };
    rotationPattern: { suspicious: boolean; carriers: string[] };
  };
}

// =============================================================================
// ANTI-FRAUD SERVICE (Main Orchestrator)
// =============================================================================

/**
 * Main Anti-Fraud Service.
 * 
 * Coordinates bid validation, pattern detection, and fraud scoring.
 * Subscribes to events and updates fraud scores in real-time.
 * 
 * @example
 * ```typescript
 * const fraudService = new AntiFraudService(eventBus);
 * await fraudService.start();
 * 
 * // Get carrier fraud score
 * const score = await fraudService.getCarrierFraudScore('car_123');
 * console.log(score.level); // 'low' | 'medium' | 'high' | 'critical'
 * ```
 */
export class AntiFraudService {
  private eventBus: IEventBus;
  private carrierScores: Map<string, CarrierFraudScore>;
  private flags: FraudFlag[];
  private bidValidator: BidValidator;
  private patternDetector: BiddingPatternDetector;
  private collusionDetector: CollusionDetector;
  private running: boolean = false;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
    this.carrierScores = new Map();
    this.flags = [];

    this.bidValidator = new BidValidator(DEFAULT_BID_VALIDATION_CONFIG, this);
    this.patternDetector = new BiddingPatternDetector(DEFAULT_BIDDING_PATTERN_CONFIG, this);
    this.collusionDetector = new CollusionDetector(DEFAULT_COLLUSION_CONFIG, this);
  }

  /**
   * Start the anti-fraud service.
   */
  async start(): Promise<void> {
    if (this.running) return;

    // Subscribe to events
    this.eventBus.subscribe(CORE_TOPICS.BID_VALIDATED, this.handleBidValidated.bind(this));
    this.eventBus.subscribe(CORE_TOPICS.MATCHING_COMPLETED, this.handleMatchingCompleted.bind(this));
    this.eventBus.subscribe(CORE_TOPICS.EXECUTION_STATUS_CHANGED, this.handleExecutionStatusChanged.bind(this));

    this.running = true;
    console.log('AntiFraudService started');
  }

  /**
   * Stop the service.
   */
  async stop(): Promise<void> {
    this.running = false;
  }

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  private async handleBidValidated(event: CargoBitEvent): Promise<void> {
    const payload = event.payload as BidValidatedPayload;
    
    // Check bidding patterns
    await this.patternDetector.checkIdenticalBids(
      payload.orderId,
      payload.carrierId,
      payload.bidPrice
    );
  }

  private async handleMatchingCompleted(event: CargoBitEvent): Promise<void> {
    const payload = event.payload as MatchingCompletedPayload;

    // Analyze for collusion patterns
    await this.collusionDetector.analyzeMatching({
      orderId: payload.orderId,
      region: 'default', // Should extract from order
      winner: payload.winner,
      candidates: payload.allCandidates,
      minPrice: payload.winner.bidPrice * 0.8, // Should get from pricing
      marketPrice: payload.winner.bidPrice * 1.1,
    });
  }

  private async handleExecutionStatusChanged(event: CargoBitEvent): Promise<void> {
    const payload = event.payload as ExecutionStatusChangedPayload;

    // Track cancellations and no-shows
    if (payload.newStatus === 'CANCELLED') {
      await this.updateFraudScoreFactor(payload.carrierId, 'cancelRate', 0.1);
    }

    // No-show: ACCEPTED but never PICKED_UP within expected time
    if (payload.oldStatus === 'ACCEPTED' && payload.newStatus === 'CANCELLED') {
      // Check if this looks like a no-show
      await this.updateFraudScoreFactor(payload.carrierId, 'noShowRate', 0.15);
      await this.createFlag({
        carrierId: payload.carrierId,
        type: 'NO_SHOW_INCIDENT',
        severity: 'high',
        description: 'Carrier cancelled after accepting order',
        evidence: {
          executionId: payload.executionId,
          orderId: payload.orderId,
        },
      });
    }
  }

  // =========================================================================
  // FRAUD SCORE MANAGEMENT
  // =========================================================================

  /**
   * Get fraud score for a carrier.
   */
  async getCarrierFraudScore(carrierId: string): Promise<CarrierFraudScore | null> {
    return this.carrierScores.get(carrierId) ?? null;
  }

  /**
   * Calculate fraud score from factors.
   */
  async calculateFraudScore(carrierId: string): Promise<CarrierFraudScore> {
    // Get or create score
    let score = this.carrierScores.get(carrierId);

    if (!score) {
      score = {
        carrierId,
        score: 0,
        level: 'low',
        factors: {
          cancelRate: 0,
          disputeRate: 0,
          noShowRate: 0,
          priceAnomaly: 0,
          collusion: 0,
          biddingPattern: 0,
        },
        flags: [],
        trend: 'stable',
        updatedAt: new Date().toISOString(),
      };
    }

    // Calculate weighted score
    const weights = {
      cancelRate: 0.25,
      disputeRate: 0.20,
      noShowRate: 0.20,
      priceAnomaly: 0.15,
      collusion: 0.10,
      biddingPattern: 0.10,
    };

    score.score =
      score.factors.cancelRate * weights.cancelRate +
      score.factors.disputeRate * weights.disputeRate +
      score.factors.noShowRate * weights.noShowRate +
      score.factors.priceAnomaly * weights.priceAnomaly +
      score.factors.collusion * weights.collusion +
      score.factors.biddingPattern * weights.biddingPattern;

    // Determine level
    score.level = this.scoreToLevel(score.score);
    score.updatedAt = new Date().toISOString();

    // Get relevant flags
    score.flags = this.flags.filter((f) => f.carrierId === carrierId && !f.resolvedAt);

    this.carrierScores.set(carrierId, score);
    return score;
  }

  /**
   * Update a single factor of fraud score.
   */
  async updateFraudScoreFactor(
    carrierId: string,
    factor: keyof FraudFactorScores,
    delta: number
  ): Promise<void> {
    const score = await this.calculateFraudScore(carrierId);
    score.factors[factor] = Math.min(1, Math.max(0, score.factors[factor] + delta));
    this.carrierScores.set(carrierId, score);
  }

  private scoreToLevel(score: number): FraudRiskLevel {
    if (score < 0.3) return 'low';
    if (score < 0.6) return 'medium';
    if (score < 0.8) return 'high';
    return 'critical';
  }

  // =========================================================================
  // FLAG MANAGEMENT
  // =========================================================================

  /**
   * Create a fraud flag.
   */
  async createFlag(params: {
    carrierId: string;
    type: FraudFlagType;
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: Record<string, unknown>;
  }): Promise<FraudFlag> {
    const flag: FraudFlag = {
      id: `flag_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      carrierId: params.carrierId,
      type: params.type,
      severity: params.severity,
      description: params.description,
      evidence: params.evidence,
      createdAt: new Date().toISOString(),
    };

    this.flags.push(flag);

    // Update fraud score based on flag type
    const factorMap: Record<FraudFlagType, keyof FraudFactorScores> = {
      UNUSUAL_CANCEL_PATTERN: 'cancelRate',
      HIGH_DISPUTE_RATE: 'disputeRate',
      NO_SHOW_INCIDENT: 'noShowRate',
      PRICE_ANOMALY: 'priceAnomaly',
      COLLUSION_SUSPECTED: 'collusion',
      BID_FLOOD: 'biddingPattern',
      IDENTICAL_BIDS: 'collusion',
      ROTATION_PATTERN: 'collusion',
      GEOGRAPHIC_ANOMALY: 'biddingPattern',
    };

    const factor = factorMap[params.type];
    const severityWeight = { low: 0.05, medium: 0.1, high: 0.2 };
    await this.updateFraudScoreFactor(params.carrierId, factor, severityWeight[params.severity]);

    return flag;
  }

  /**
   * Resolve a fraud flag.
   */
  async resolveFlag(flagId: string, resolvedBy: string, resolution: string): Promise<void> {
    const flag = this.flags.find((f) => f.id === flagId);
    if (flag) {
      flag.resolvedAt = new Date().toISOString();
      flag.resolvedBy = resolvedBy;
      flag.resolution = resolution;
    }
  }

  /**
   * Get flags for a carrier.
   */
  async getCarrierFlags(carrierId: string, includeResolved: boolean = false): Promise<FraudFlag[]> {
    return this.flags.filter(
      (f) => f.carrierId === carrierId && (includeResolved || !f.resolvedAt)
    );
  }

  // =========================================================================
  // EXPOSED COMPONENTS
  // =========================================================================

  getBidValidator(): BidValidator {
    return this.bidValidator;
  }

  getPatternDetector(): BiddingPatternDetector {
    return this.patternDetector;
  }

  getCollusionDetector(): CollusionDetector {
    return this.collusionDetector;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  AntiFraudService,
  BidValidator,
  BiddingPatternDetector,
  CollusionDetector,
  DEFAULT_BID_VALIDATION_CONFIG,
  DEFAULT_BIDDING_PATTERN_CONFIG,
  DEFAULT_COLLUSION_CONFIG,
};
