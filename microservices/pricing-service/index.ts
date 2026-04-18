/**
 * CargoBit Pricing-Service (Microservice)
 * 
 * Bietet:
 * - Preisberechnung für Transporte
 * - Bid-Validierung mit Fraud-Score
 * - Integration mit Security-Config-Service für Config
 * 
 * @module @cargobit/pricing-service
 * @version 2.0.0 - Mit Fraud-Score Integration
 */

import { serve } from 'bun';

// =============================================================================
// TYPES
// =============================================================================

interface PricingRequest {
  orderId: string;
  
  // Route
  pickupAddress: Address;
  deliveryAddress: Address;
  distanceKm: number;
  isInternational: boolean;
  transitCountries?: string[];
  
  // Cargo
  transportType: TransportType;
  weightKg?: number;
  volumeM3?: number;
  
  // Requirements
  vehicleRequirements?: VehicleRequirements;
  driverRequirements?: DriverRequirements;
  
  // Timing
  pickupDatetime: string;
  deliveryDatetime?: string;
}

interface PricingResponse {
  orderId: string;
  
  // Prices
  marketPrice: number;
  startPrice: number;
  minPrice: number;
  currency: string;
  
  // Scores
  priceScore: number;  // 0-1 für Matching
  
  // Context
  validUntil: string;
  calculatedAt: string;
  calculatedBy: 'rule' | 'ml' | 'hybrid';
  
  // Breakdown
  costBreakdown: {
    baseCost: number;
    fuelCost: number;
    tollCost: number;
    laborCost: number;
    riskCost: number;
    total: number;
  };
  
  // Adjustments
  adjustments: {
    riskAdjustment: number;
    demandAdjustment: number;
    routeComplexityFactor: number;
  };
  
  // Config
  configVersion: string;
  
  // Correlation
  correlationId: string;
}

interface BidValidateRequest {
  carrierId: string;
  driverId?: string;
  vehicleId?: string;
  bidPrice: number;
  currency?: string;
  estimatedDuration?: number;
  message?: string;
}

interface BidValidateResponse {
  valid: boolean;
  reason?: string;
  
  // Price validation
  priceScore: number;
  
  // Fraud validation
  fraudScore: number;
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
  
  recommendations?: string[];
  
  configVersion: string;
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

interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
  country: string;
  lat?: number;
  lng?: number;
}

type TransportType = 
  | 'FTL'
  | 'LTL'
  | 'FTL_HAZMAT'
  | 'LTL_HAZMAT'
  | 'FTL_TEMP'
  | 'LTL_TEMP';

interface VehicleRequirements {
  vehicleType?: string;
  minWeight?: number;
  minVolume?: number;
  hasAdr?: boolean;
  hasCooling?: boolean;
  hasLift?: boolean;
  hasCrane?: boolean;
}

interface DriverRequirements {
  languages?: string[];
  certifications?: string[];
  experience?: number;
}

// =============================================================================
// SECURITY CONFIG CLIENT (Embedded)
// =============================================================================

interface SecurityConfig {
  version: string;
  fraud: {
    carrierScore: {
      weights: { cancelRate: number; disputeRate: number; noShowRate: number; patternScore: number };
      thresholds: { observe: number; suspect: number };
      normalization: { cancelRateMax: number; disputeRateMax: number; noShowRateMax: number };
    };
    bidScore: {
      weights: { dumping: number; spam: number; coordination: number };
      dumping: { maxDiscountVsMarket: number; warnDiscountVsMarket: number; hardFloorEur: number; minPriceFactor: number };
      spam: { maxBidsPerOrderPerHour: number; maxBidsPerMinuteGlobal: number; maxBidsPerCarrierPerDay: number };
      coordination: { similarityWindowMinutes: number; similarityThreshold: number; minCarriersForCollusion: number; bidSpreadThreshold: number };
    };
    totalScore: { alphaCarrier: number; penaltyFactor: number };
    matching: { applyPenalty: boolean; capSuspectedScore: number; excludeFromAutoMatch: boolean };
    events: { emitFraudSuspected: boolean; emitFraudFlagged: boolean; auditAllScores: boolean };
  };
  rateLimits: Array<{
    endpoint: string;
    maxRequests: number;
    windowMs: number;
    scope: string;
    keyTemplate: string;
  }>;
}

class SecurityConfigClient {
  private cache: SecurityConfig | null = null;
  private version: string | null = null;
  private baseUrl: string;
  private checkIntervalId: Timer | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async init(): Promise<void> {
    console.log('[SecurityConfigClient] Initializing...');
    await this.reload();
    
    // Start periodic checks (every 60s)
    this.checkIntervalId = setInterval(() => this.checkForUpdate(), 60000);
    console.log('[SecurityConfigClient] Initialized successfully');
  }

  private async checkForUpdate(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/config/security/version`);
      const { version } = await res.json() as { version: string };
      
      if (version !== this.version) {
        console.log(`[SecurityConfigClient] Config updated: ${this.version} → ${version}`);
        await this.reload();
      }
    } catch (error) {
      console.error('[SecurityConfigClient] Check failed:', error);
    }
  }

  private async reload(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/config/security`);
    const config = await res.json() as SecurityConfig;
    this.cache = config;
    this.version = config.version;
  }

  getConfig(): SecurityConfig {
    if (!this.cache) throw new Error('SecurityConfig not loaded');
    return this.cache;
  }

  getFraudConfig() {
    return this.getConfig().fraud;
  }

  getVersion(): string {
    return this.version ?? 'unknown';
  }
}

// =============================================================================
// FRAUD SCORING (Simplified for Pricing Service)
// =============================================================================

interface CarrierStats {
  carrierId: string;
  cancelRatePercent: number;
  disputeRatePercent: number;
  noShowRatePercent: number;
  winsJustAboveFloorRate: number;
  rotationPatternScore: number;
  avgMarginOverFloor: number;
}

interface FraudAnalysisResult {
  carrierFraudScore: number;
  bidFraudScore: number;
  totalFraudScore: number;
  fraudLevel: 'unauffaellig' | 'beobachten' | 'fraud_suspected';
  fraudSuspected: boolean;
  breakdown: {
    carrier: { cancelRate: number; disputeRate: number; noShowRate: number; patternScore: number };
    bid: { dumpingScore: number; spamScore: number; coordinationScore: number };
  };
  recommendations: string[];
}

async function analyzeFraud(
  carrierStats: CarrierStats,
  bidPrice: number,
  marketPrice: number,
  startPrice: number,
  minPrice: number,
  fraudConfig: SecurityConfig['fraud']
): Promise<FraudAnalysisResult> {
  const { weights, normalization, thresholds } = fraudConfig.carrierScore;
  const { weights: bidWeights, dumping: dumpingConfig } = fraudConfig.bidScore;
  
  // Carrier factors
  const cancelRate = Math.min(carrierStats.cancelRatePercent / 100 / normalization.cancelRateMax, 1);
  const disputeRate = Math.min(carrierStats.disputeRatePercent / 100 / normalization.disputeRateMax, 1);
  const noShowRate = Math.min(carrierStats.noShowRatePercent / 100 / normalization.noShowRateMax, 1);
  const patternScore = carrierStats.avgMarginOverFloor < 0.05 ? 0.5 : 0.1;
  
  const carrierFraudScore = 
    weights.cancelRate * cancelRate +
    weights.disputeRate * disputeRate +
    weights.noShowRate * noShowRate +
    weights.patternScore * patternScore;
  
  // Bid factors
  const discountVsMarket = marketPrice > 0 ? (marketPrice - bidPrice) / marketPrice : 0;
  const dumpingScore = discountVsMarket > dumpingConfig.maxDiscountVsMarket ? 1 : discountVsMarket / dumpingConfig.maxDiscountVsMarket;
  const spamScore = 0; // Would need bid history
  const coordinationScore = 0; // Would need similar bid analysis
  
  const bidFraudScore = 
    bidWeights.dumping * dumpingScore +
    bidWeights.spam * spamScore +
    bidWeights.coordination * coordinationScore;
  
  // Total
  const alpha = fraudConfig.totalScore.alphaCarrier;
  const totalFraudScore = alpha * carrierFraudScore + (1 - alpha) * bidFraudScore;
  
  // Level
  let fraudLevel: 'unauffaellig' | 'beobachten' | 'fraud_suspected';
  if (totalFraudScore < thresholds.observe) {
    fraudLevel = 'unauffaellig';
  } else if (totalFraudScore < thresholds.suspect) {
    fraudLevel = 'beobachten';
  } else {
    fraudLevel = 'fraud_suspected';
  }
  
  // Recommendations
  const recommendations: string[] = [];
  if (totalFraudScore >= thresholds.suspect) {
    recommendations.push('FRAUD SUSPECTED - Kein Auto-Match');
    recommendations.push('In Manual-Review-Queue aufnehmen');
  }
  if (dumpingScore > 0.7) {
    recommendations.push('Bid erscheint als Price-Dumping');
  }
  
  return {
    carrierFraudScore,
    bidFraudScore,
    totalFraudScore,
    fraudLevel,
    fraudSuspected: totalFraudScore >= thresholds.suspect,
    breakdown: {
      carrier: { cancelRate, disputeRate, noShowRate, patternScore },
      bid: { dumpingScore, spamScore, coordinationScore },
    },
    recommendations,
  };
}

// =============================================================================
// PRICING SERVICE
// =============================================================================

const SECURITY_CONFIG_URL = process.env.SECURITY_CONFIG_URL || 'http://localhost:3005';
const securityConfigClient = new SecurityConfigClient(SECURITY_CONFIG_URL);

// In-memory cache for order pricing
const pricingCache = new Map<string, PricingResponse>();

// =============================================================================
// HTTP SERVER
// =============================================================================

const server = serve({
  port: 3002,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Service-Token',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ==========================================
      // GET /health
      // ==========================================
      if (method === 'GET' && path === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'pricing-service',
          version: '2.0.0',
          configVersion: securityConfigClient.getVersion(),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ==========================================
      // GET /ready
      // ==========================================
      if (method === 'GET' && path === '/ready') {
        try {
          securityConfigClient.getConfig();
          return new Response(JSON.stringify({ status: 'ready' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch {
          return new Response(JSON.stringify({ status: 'not_ready' }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // ==========================================
      // POST /pricing/calculate
      // ==========================================
      if (method === 'POST' && path === '/pricing/calculate') {
        const body = await req.json() as PricingRequest;
        const correlationId = `pricing_${body.orderId}_${Date.now()}`;
        
        const fraudConfig = securityConfigClient.getFraudConfig();
        
        // Calculate base price
        const distanceKm = body.distanceKm || 100;
        const baseCost = distanceKm * 1.2; // €1.20/km base
        const fuelCost = distanceKm * 0.35;
        const tollCost = body.isInternational ? distanceKm * 0.15 : distanceKm * 0.08;
        const laborCost = 50; // Base labor
        const riskCost = 20; // Base risk
        
        const total = baseCost + fuelCost + tollCost + laborCost + riskCost;
        
        // Calculate price range
        const marketPrice = Math.round(total * 1.1);
        const startPrice = Math.round(total * 1.25);
        const minPrice = Math.round(total * 0.85);
        
        const response: PricingResponse = {
          orderId: body.orderId,
          marketPrice,
          startPrice,
          minPrice,
          currency: 'EUR',
          priceScore: 0.5, // Neutral score before matching
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          calculatedAt: new Date().toISOString(),
          calculatedBy: 'rule',
          costBreakdown: {
            baseCost: Math.round(baseCost),
            fuelCost: Math.round(fuelCost),
            tollCost: Math.round(tollCost),
            laborCost,
            riskCost,
            total: Math.round(total),
          },
          adjustments: {
            riskAdjustment: 1.0,
            demandAdjustment: 1.0,
            routeComplexityFactor: body.isInternational ? 1.2 : 1.0,
          },
          configVersion: securityConfigClient.getVersion(),
          correlationId,
        };
        
        // Cache for later bid validation
        pricingCache.set(body.orderId, response);
        
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // POST /pricing/orders/:id/bid/validate
      // ==========================================
      const bidValidateMatch = path.match(/^\/pricing\/orders\/([^/]+)\/bid\/validate$/);
      if (method === 'POST' && bidValidateMatch) {
        const orderId = bidValidateMatch[1];
        const body = await req.json() as BidValidateRequest;
        const correlationId = `bid_validate_${orderId}_${Date.now()}`;
        
        // Get pricing for order
        const pricing = pricingCache.get(orderId);
        if (!pricing) {
          return new Response(JSON.stringify({
            valid: false,
            reason: 'Pricing not found for order',
            correlationId,
          }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const fraudConfig = securityConfigClient.getFraudConfig();
        const { hardFloorEur, minPriceFactor } = fraudConfig.bidScore.dumping;
        
        // Price validation
        if (body.bidPrice < hardFloorEur) {
          return new Response(JSON.stringify({
            valid: false,
            reason: `Bid below hard floor (€${hardFloorEur})`,
            priceScore: 0,
            fraudScore: 0,
            fraudLevel: 'unauffaellig',
            fraudFlags: ['PRICE_BELOW_FLOOR'] as FraudFlag[],
            details: {
              minPrice: pricing.minPrice,
              startPrice: pricing.startPrice,
              marketPrice: pricing.marketPrice,
              currency: pricing.currency,
              discountPct: ((pricing.marketPrice - body.bidPrice) / pricing.marketPrice) * 100,
            },
            configVersion: securityConfigClient.getVersion(),
            correlationId,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        if (body.bidPrice < pricing.minPrice * minPriceFactor) {
          return new Response(JSON.stringify({
            valid: false,
            reason: `Bid below minimum price`,
            priceScore: 0,
            fraudScore: 0,
            fraudLevel: 'unauffaellig',
            fraudFlags: ['PRICE_BELOW_FLOOR'] as FraudFlag[],
            details: {
              minPrice: pricing.minPrice,
              startPrice: pricing.startPrice,
              marketPrice: pricing.marketPrice,
              currency: pricing.currency,
              discountPct: ((pricing.marketPrice - body.bidPrice) / pricing.marketPrice) * 100,
            },
            configVersion: securityConfigClient.getVersion(),
            correlationId,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        // Calculate price score
        const range = pricing.startPrice - pricing.minPrice;
        const position = body.bidPrice - pricing.minPrice;
        const priceScore = range > 0 ? position / range : 0.5;
        
        // Get carrier stats (mock - would fetch from carrier service)
        const carrierStats: CarrierStats = {
          carrierId: body.carrierId,
          cancelRatePercent: 5,
          disputeRatePercent: 2,
          noShowRatePercent: 1,
          winsJustAboveFloorRate: 0.2,
          rotationPatternScore: 0.1,
          avgMarginOverFloor: 0.12,
        };
        
        // Analyze fraud
        const fraudAnalysis = await analyzeFraud(
          carrierStats,
          body.bidPrice,
          pricing.marketPrice,
          pricing.startPrice,
          pricing.minPrice,
          fraudConfig
        );
        
        // Extract flags
        const fraudFlags: FraudFlag[] = [];
        if (fraudAnalysis.breakdown.bid.dumpingScore > 0.7) fraudFlags.push('DUMPING_PATTERN');
        if (fraudAnalysis.breakdown.carrier.cancelRate > 0.3) fraudFlags.push('HIGH_CANCEL_RATE');
        if (fraudAnalysis.breakdown.carrier.disputeRate > 0.2) fraudFlags.push('HIGH_DISPUTE_RATE');
        
        const response: BidValidateResponse = {
          valid: true,
          priceScore: Math.min(Math.max(priceScore, 0), 1),
          fraudScore: fraudAnalysis.totalFraudScore,
          fraudLevel: fraudAnalysis.fraudLevel,
          fraudFlags,
          details: {
            minPrice: pricing.minPrice,
            startPrice: pricing.startPrice,
            marketPrice: pricing.marketPrice,
            currency: pricing.currency,
            discountPct: ((pricing.marketPrice - body.bidPrice) / pricing.marketPrice) * 100,
          },
          recommendations: fraudAnalysis.fraudSuspected ? fraudAnalysis.recommendations : undefined,
          configVersion: securityConfigClient.getVersion(),
          correlationId,
        };
        
        return new Response(JSON.stringify(response), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Config-Version': response.configVersion,
            'X-Correlation-Id': correlationId,
          },
        });
      }

      // ==========================================
      // 404
      // ==========================================
      return new Response(JSON.stringify({
        error: 'Not Found',
        path,
        availableEndpoints: [
          'GET  /health',
          'GET  /ready',
          'POST /pricing/calculate',
          'POST /pricing/orders/:id/bid/validate',
        ],
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
      console.error('[Pricing] Error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  },
});

// =============================================================================
// INITIALIZATION
// =============================================================================

async function main() {
  // Initialize security config client
  await securityConfigClient.init();
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          CargoBit Pricing-Service v2.0.0                        ║
║          Port: 3002                                             ║
╠════════════════════════════════════════════════════════════════╣
║  Endpoints:                                                    ║
║  GET  /health                          - Health check           ║
║  GET  /ready                           - Readiness check        ║
║  POST /pricing/calculate               - Calculate pricing      ║
║  POST /pricing/orders/:id/bid/validate - Validate bid          ║
║                                                                ║
║  Features:                                                     ║
║  ✓ Price calculation (rule-based)                              ║
║  ✓ Fraud score integration                                     ║
║  ✓ Security config client with caching                         ║
║  ✓ Config version: ${securityConfigClient.getVersion().padEnd(44)}║
╚════════════════════════════════════════════════════════════════╝
  `);
}

main().catch(console.error);

export { SecurityConfigClient, securityConfigClient };
