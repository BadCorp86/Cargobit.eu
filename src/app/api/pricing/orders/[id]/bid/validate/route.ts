/**
 * CargoBit Pricing Bid Validation API
 * 
 * POST /api/pricing/orders/[id]/bid/validate
 * 
 * Validiert ein Bid mit:
 * - Preis-Validierung (minPrice, startPrice, marketPrice)
 * - Fraud-Score Berechnung (Carrier + Bid)
 * - Fraud Flags
 * 
 * @module @cargobit/api/pricing
 * @version 2.0.0 - Mit Fraud-Score Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { SecurityConfigService } from '@/services/security-config.service';
import { FraudScoringService, CarrierStats, BidContext } from '@/services/fraud-scoring.service';
import { prisma } from '@/lib/db';

// =============================================================================
// TYPES
// =============================================================================

interface BidValidateRequest {
  carrierId: string;
  driverId?: string;
  vehicleId?: string;
  bidPrice: number;
  currency?: string;
  
  // Optional: Additional context
  estimatedDuration?: number;
  message?: string;
}

interface BidValidateResponse {
  valid: boolean;
  reason?: string;
  
  // Price validation
  priceScore: number;          // 0-1 (how good is the price for carrier)
  
  // Fraud validation
  fraudScore: number;          // 0-1 (higher = more suspicious)
  fraudLevel: 'unauffaellig' | 'beobachten' | 'fraud_suspected';
  fraudFlags: FraudFlag[];
  
  // Details
  details: {
    minPrice: number;
    startPrice: number;
    marketPrice: number;
    currency: string;
    discountPct: number;
  };
  
  // Recommendations
  recommendations?: string[];
  
  // Config version
  configVersion: string;
  
  // Correlation
  correlationId: string;
}

type FraudFlag = 
  | 'DUMPING_PATTERN'
  | 'BID_SPAM'
  | 'COORDINATION_SUSPECTED'
  | 'HIGH_CANCEL_RATE'
  | 'HIGH_DISPUTE_RATE'
  | 'PATTERN_ANOMALY'
  | 'NEW_CARRIER'
  | 'PRICE_BELOW_FLOOR';

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  const correlationId = `bid_validate_${orderId}_${Date.now()}`;
  
  try {
    // Parse request
    const body: BidValidateRequest = await request.json();
    
    // Validate required fields
    if (!body.carrierId) {
      return NextResponse.json({
        valid: false,
        reason: 'Missing required field: carrierId',
        correlationId,
      }, { status: 400 });
    }
    
    if (!body.bidPrice || body.bidPrice <= 0) {
      return NextResponse.json({
        valid: false,
        reason: 'Invalid bid price',
        correlationId,
      }, { status: 400 });
    }
    
    // Get Security Config
    const securityConfig = SecurityConfigService.getInstance();
    const fraudConfig = securityConfig.getFraudConfig();
    const configVersion = securityConfig.getConfigVersion();
    
    // Get order with pricing
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        pricing: true,
        pickupAddress: true,
        deliveryAddress: true,
      },
    });
    
    if (!order) {
      return NextResponse.json({
        valid: false,
        reason: 'Order not found',
        correlationId,
      }, { status: 404 });
    }
    
    // Get pricing context
    const pricing = order.pricing;
    if (!pricing) {
      return NextResponse.json({
        valid: false,
        reason: 'Pricing not available for this order',
        correlationId,
      }, { status: 400 });
    }
    
    const minPrice = pricing.minPrice || pricing.minPriceEur;
    const startPrice = pricing.startPrice || pricing.startPriceEur;
    const marketPrice = pricing.marketPrice || pricing.marketPriceEur;
    const currency = body.currency || 'EUR';
    
    // ==========================================
    // PRICE VALIDATION
    // ==========================================
    
    const priceValidation = validatePrice(body.bidPrice, minPrice, startPrice, fraudConfig);
    
    if (!priceValidation.valid) {
      return NextResponse.json({
        valid: false,
        reason: priceValidation.reason,
        priceScore: 0,
        fraudScore: 0,
        fraudLevel: 'unauffaellig',
        fraudFlags: priceValidation.flags as FraudFlag[],
        details: {
          minPrice,
          startPrice,
          marketPrice,
          currency,
          discountPct: calculateDiscount(body.bidPrice, marketPrice),
        },
        configVersion,
        correlationId,
      }, { status: 200 });
    }
    
    // ==========================================
    // FRAUD SCORE CALCULATION
    // ==========================================
    
    // Get carrier stats
    const carrierStats = await getCarrierStats(body.carrierId);
    
    // Build bid context
    const bidContext: BidContext = {
      bidId: `bid_${body.carrierId}_${orderId}_${Date.now()}`,
      orderId,
      carrierId: body.carrierId,
      bidPrice: body.bidPrice,
      startPrice,
      minPrice,
      marketPrice,
      bidsLastMinute: 0,  // Would query from DB
      bidsLastHour: 0,    // Would query from DB
      bidsLastDay: 0,     // Would query from DB
      similarBidsCount: 0, // Would query from DB
      similarBidsTimeWindow: [],
      priceVariance: 0,    // Would calculate from similar bids
      uniqueCarriersWithSimilarBids: 0,
    };
    
    // Calculate fraud score
    const fraudService = new FraudScoringService();
    const fraudAnalysis = await fraudService.analyzeBidFraud(carrierStats, bidContext, correlationId);
    
    // Extract fraud flags
    const fraudFlags = extractFraudFlags(
      fraudAnalysis.breakdown,
      fraudAnalysis.fraudLevel,
      priceValidation
    );
    
    // ==========================================
    // BUILD RESPONSE
    // ==========================================
    
    const response: BidValidateResponse = {
      valid: true,
      priceScore: priceValidation.priceScore,
      fraudScore: fraudAnalysis.totalFraudScore,
      fraudLevel: fraudAnalysis.fraudLevel,
      fraudFlags,
      details: {
        minPrice,
        startPrice,
        marketPrice,
        currency,
        discountPct: calculateDiscount(body.bidPrice, marketPrice),
      },
      recommendations: fraudAnalysis.fraudSuspected 
        ? fraudAnalysis.recommendations 
        : undefined,
      configVersion,
      correlationId,
    };
    
    // Log for audit
    console.log('[Pricing]', {
      correlationId,
      orderId,
      carrierId: body.carrierId,
      bidPrice: body.bidPrice,
      priceScore: response.priceScore,
      fraudScore: response.fraudScore,
      fraudLevel: response.fraudLevel,
      valid: response.valid,
    });
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Config-Version': configVersion,
        'X-Correlation-Id': correlationId,
      },
    });
    
  } catch (error) {
    console.error('[Pricing] Bid validation error:', error);
    
    return NextResponse.json({
      valid: false,
      reason: 'Internal server error during bid validation',
      priceScore: 0,
      fraudScore: 0,
      fraudLevel: 'unauffaellig',
      fraudFlags: [],
      details: {
        minPrice: 0,
        startPrice: 0,
        marketPrice: 0,
        currency: 'EUR',
        discountPct: 0,
      },
      configVersion: 'error',
      correlationId,
    }, { status: 500 });
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function validatePrice(
  bidPrice: number,
  minPrice: number,
  startPrice: number,
  fraudConfig: any
): { valid: boolean; reason?: string; priceScore: number; flags?: string[] } {
  const flags: string[] = [];
  
  // Check hard floor
  const hardFloor = fraudConfig.bidScore.dumping.hardFloorEur;
  if (bidPrice < hardFloor) {
    return {
      valid: false,
      reason: `Bid below hard floor (€${hardFloor})`,
      priceScore: 0,
      flags: ['PRICE_BELOW_FLOOR'],
    };
  }
  
  // Check min price
  const minPriceFactor = fraudConfig.bidScore.dumping.minPriceFactor;
  if (bidPrice < minPrice * minPriceFactor) {
    return {
      valid: false,
      reason: `Bid below minimum price (€${minPrice * minPriceFactor})`,
      priceScore: 0,
      flags: ['PRICE_BELOW_FLOOR'],
    };
  }
  
  // Calculate price score (0-1, higher is better for carrier)
  const range = startPrice - minPrice;
  const position = bidPrice - minPrice;
  const priceScore = range > 0 ? position / range : 0.5;
  
  return {
    valid: true,
    priceScore: Math.min(Math.max(priceScore, 0), 1),
    flags,
  };
}

function calculateDiscount(bidPrice: number, marketPrice: number): number {
  if (marketPrice <= 0) return 0;
  return ((marketPrice - bidPrice) / marketPrice) * 100;
}

async function getCarrierStats(carrierId: string): Promise<CarrierStats> {
  // In production, this would query the database
  // For now, return defaults
  
  const carrier = await prisma.user.findUnique({
    where: { id: carrierId },
    include: {
      driverProfile: true,
    },
  });
  
  return {
    carrierId,
    cancelRatePercent: carrier?.driverProfile?.cancelRate || 0,
    disputeRatePercent: carrier?.driverProfile?.disputeRate || 0,
    noShowRatePercent: carrier?.driverProfile?.noShowRate || 0,
    winsJustAboveFloorRate: 0,
    rotationPatternScore: 0,
    sameRegionWinRate: 0,
    avgMarginOverFloor: 0.15,
    periodDays: 90,
  };
}

function extractFraudFlags(
  breakdown: FraudAnalysisResult['breakdown'],
  fraudLevel: string,
  priceValidation: { flags?: string[] }
): FraudFlag[] {
  const flags: FraudFlag[] = [];
  
  // Add price validation flags
  if (priceValidation.flags) {
    flags.push(...priceValidation.flags as FraudFlag[]);
  }
  
  // Carrier flags
  if (breakdown.carrier.cancelRate > 0.3) {
    flags.push('HIGH_CANCEL_RATE');
  }
  if (breakdown.carrier.disputeRate > 0.2) {
    flags.push('HIGH_DISPUTE_RATE');
  }
  if (breakdown.carrier.patternScore > 0.5) {
    flags.push('PATTERN_ANOMALY');
  }
  
  // Bid flags
  if (breakdown.bid.dumpingScore > 0.7) {
    flags.push('DUMPING_PATTERN');
  }
  if (breakdown.bid.spamScore > 0.7) {
    flags.push('BID_SPAM');
  }
  if (breakdown.bid.coordinationScore > 0.5) {
    flags.push('COORDINATION_SUSPECTED');
  }
  
  // Remove duplicates
  return [...new Set(flags)];
}

interface FraudAnalysisResult {
  totalFraudScore: number;
  fraudLevel: 'unauffaellig' | 'beobachten' | 'fraud_suspected';
  fraudSuspected: boolean;
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
  recommendations: string[];
}
