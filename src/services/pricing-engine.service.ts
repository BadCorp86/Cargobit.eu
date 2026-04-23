/**
 * CargoBit Pricing Engine Service
 * Configurable Pricing with Risk Adjustments and Anti-Dumping
 * Enhanced with Fuel, Toll, Labor, and Risk Cost Components
 * 
 * IMPORTANT: All prices are rounded to cents using roundToCents()
 * IMPORTANT: Currency is always included in all responses
 * IMPORTANT: Matching-Engine uses priceScore, never raw bid_price_eur
 * 
 * Price Formula:
 * P_market = C_base + C_fuel + C_toll + C_labor + C_risk
 */

import { db } from '@/lib/db';
import {
  PricingConfigData,
  PriceContext,
  MarketPriceInput,
  MarketPriceResult,
  BidValidationInput,
  BidValidationResult,
  CostBreakdown,
  ExternalPricingData,
  VehiclePricingParams,
  buildPriceContext,
  validateBid,
  calculateHeuristicMarketPrice,
  extractPricingFeatures,
  computeCostBreakdown,
  getLaborRateByCountry,
  getFuelPriceByRegion,
  getRiskFactorFromLevel,
  DEFAULT_PRICING_CONFIG,
  DEFAULT_VEHICLE_PARAMS,
  roundToCents,
  DEFAULT_CURRENCY,
  createPricingError,
  PricingError
} from '@/types/pricing-engine';

// ============================================
// MAIN PRICING FUNCTIONS
// ============================================

/**
 * Calculate market price for an order
 * Uses ML model if available, falls back to heuristic
 * All prices are rounded to cents
 */
export async function computeMarketPrice(input: MarketPriceInput): Promise<MarketPriceResult> {
  // Try to get ML model prediction (in future)
  // For now, use heuristic calculation
  const marketPrice = roundToCents(calculateHeuristicMarketPrice(input));
  
  // Extract features for potential ML use
  const features = extractPricingFeatures(input);
  
  return {
    orderId: input.orderId,
    marketPrice,
    currency: DEFAULT_CURRENCY,
    modelVersion: 'heuristic-v1',
    confidence: 0.75, // Confidence for heuristic model
    features
  };
}

// ============================================
// ENHANCED PRICING WITH COST BREAKDOWN
// ============================================

/**
 * Fetch external pricing data from database
 * Falls back to defaults if not available
 */
export async function fetchExternalPricingData(
  input: MarketPriceInput,
  riskLevel: 'green' | 'yellow' | 'red' = 'green'
): Promise<ExternalPricingData> {
  // Get fuel price (try DB first, fallback to defaults)
  let fuelPricePerLiter = getFuelPriceByRegion(input.origin.country);
  
  const fuelPriceRecord = await db.fuelPrice.findFirst({
    where: {
      region: input.origin.country,
      fuelType: 'diesel',
      priceDate: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    },
    orderBy: { priceDate: 'desc' }
  });
  
  if (fuelPriceRecord) {
    fuelPricePerLiter = fuelPriceRecord.pricePerLiter;
  }
  
  // Get labor rate (try DB first, fallback to defaults)
  let hourlyRate = getLaborRateByCountry(input.origin.country);
  
  const laborRateRecord = await db.laborRate.findFirst({
    where: {
      countryCode: input.origin.country,
      isActive: true
    }
  });
  
  if (laborRateRecord) {
    hourlyRate = laborRateRecord.hourlyRateEur;
  }
  
  // Estimate toll cost
  const tollCostEstimate = await estimateTollCost(input);
  
  // Calculate driving parameters
  const avgSpeedKmh = 70; // Average speed on highways
  const drivingHours = input.distanceKm / avgSpeedKmh;
  
  // Get risk factor
  const riskFactor = getRiskFactorFromLevel(riskLevel);
  
  return {
    fuelPricePerLiter,
    fuelRegion: input.origin.country,
    tollCostEstimate,
    hourlyRate,
    laborCountry: input.origin.country,
    avgSpeedKmh,
    drivingHours,
    riskFactor,
    riskLevel
  };
}

/**
 * Estimate toll cost for a route
 * Uses toll system data if available
 */
export async function estimateTollCost(input: MarketPriceInput): Promise<number> {
  // Check if we have a stored toll cost for this transport
  const existingToll = await db.tollCost.findUnique({
    where: { transportId: input.orderId }
  });
  
  if (existingToll) {
    return existingToll.totalCostEur;
  }
  
  // Calculate heuristic toll cost
  // Germany: ~0.19 EUR/km for Euro6 trucks
  // Austria: ~0.22 EUR/km
  // Eastern EU: lower rates
  
  const tollRatesByCountry: Record<string, number> = {
    'DE': 0.19,
    'AT': 0.22,
    'PL': 0.08,
    'CZ': 0.07,
    'HU': 0.06,
    'RO': 0.05,
    'BG': 0.05,
    'SK': 0.07,
    'SI': 0.15,
    'HR': 0.10,
    'NL': 0.25,
    'BE': 0.24,
    'FR': 0.18,
    'IT': 0.20,
    'ES': 0.16,
    'DEFAULT': 0.15
  };
  
  const originRate = tollRatesByCountry[input.origin.country] || tollRatesByCountry['DEFAULT'];
  const destRate = tollRatesByCountry[input.destination.country] || tollRatesByCountry['DEFAULT'];
  const avgRate = (originRate + destRate) / 2;
  
  return roundToCents(input.distanceKm * avgRate);
}

/**
 * Calculate enhanced market price with full cost breakdown
 * P_market = C_base + C_fuel + C_toll + C_labor + C_risk
 */
export async function computeEnhancedMarketPrice(
  input: MarketPriceInput,
  vehicleParams: VehiclePricingParams = DEFAULT_VEHICLE_PARAMS,
  riskLevel: 'green' | 'yellow' | 'red' = 'green'
): Promise<{ marketPrice: number; costBreakdown: CostBreakdown; externalData: ExternalPricingData }> {
  // Fetch external data
  const externalData = await fetchExternalPricingData(input, riskLevel);
  
  // Compute cost breakdown
  const costBreakdown = computeCostBreakdown(
    input.distanceKm,
    input.weightKg,
    externalData,
    vehicleParams,
    {
      isInternational: input.isInternational,
      isHazmat: input.isHazmat,
      requiresCooling: input.requiresCooling
    }
  );
  
  return {
    marketPrice: costBreakdown.total,
    costBreakdown,
    externalData
  };
}

/**
 * Create enhanced pricing with cost breakdown for an order
 */
export async function createEnhancedOrderPricing(
  orderId: string,
  input: MarketPriceInput,
  riskLevel: 'green' | 'yellow' | 'red' = 'green',
  vehicleParams: VehiclePricingParams = DEFAULT_VEHICLE_PARAMS,
  currency: string = DEFAULT_CURRENCY
): Promise<PriceContext & { costBreakdown: CostBreakdown }> {
  // Get pricing configuration
  const config = await getActivePricingConfig();
  
  // Calculate enhanced market price with cost breakdown
  const { marketPrice, costBreakdown, externalData } = await computeEnhancedMarketPrice(
    input,
    vehicleParams,
    riskLevel
  );
  
  // Build price context with currency
  const priceContextBase = buildPriceContext(marketPrice, riskLevel, config, currency);
  
  // Create pricing record
  const orderPricing = await db.orderPricing.create({
    data: {
      transportId: orderId,
      marketPriceEur: priceContextBase.marketPrice,
      startPriceEur: priceContextBase.startPrice,
      minPriceEur: priceContextBase.minPrice,
      riskLevel: priceContextBase.riskLevel,
      adjustedStartPriceEur: priceContextBase.adjustedStartPrice,
      adjustedMinPriceEur: priceContextBase.adjustedMinPrice,
      modelVersion: 'enhanced-v1',
      configVersion: config.name,
      features: JSON.stringify({
        ...extractPricingFeatures(input),
        fuelPricePerLiter: externalData.fuelPricePerLiter,
        tollCostEstimate: externalData.tollCostEstimate,
        hourlyRate: externalData.hourlyRate,
        riskFactor: externalData.riskFactor
      }),
      currency: currency
    }
  });
  
  // Store cost breakdown
  await db.costBreakdown.create({
    data: {
      orderPricingId: orderPricing.id,
      baseCost: costBreakdown.baseCost,
      fuelCost: costBreakdown.fuelCost,
      tollCost: costBreakdown.tollCost,
      laborCost: costBreakdown.laborCost,
      riskCost: costBreakdown.riskCost,
      coolingCost: costBreakdown.coolingCost,
      hazmatCost: costBreakdown.hazmatCost,
      internationalCost: costBreakdown.internationalCost,
      subtotal: costBreakdown.subtotal,
      total: costBreakdown.total,
      distanceKm: input.distanceKm,
      weightKg: input.weightKg,
      fuelPricePerLiter: externalData.fuelPricePerLiter,
      drivingHours: externalData.drivingHours,
      avgSpeedKmh: externalData.avgSpeedKmh,
      currency: currency
    }
  });
  
  // Store toll cost if available
  if (externalData.tollCostEstimate > 0) {
    await db.tollCost.create({
      data: {
        transportId: orderId,
        totalCostEur: externalData.tollCostEstimate,
        currency: currency,
        source: 'heuristic'
      }
    }).catch(() => {
      // Ignore if already exists
    });
  }
  
  return {
    orderId,
    ...priceContextBase,
    configVersion: config.name,
    modelVersion: 'enhanced-v1',
    features: extractPricingFeatures(input),
    costBreakdown
  };
}

/**
 * Create or update pricing for an order
 * All prices are rounded to cents
 */
export async function createOrderPricing(
  orderId: string,
  input: MarketPriceInput,
  riskLevel: 'green' | 'yellow' | 'red' = 'green',
  currency: string = DEFAULT_CURRENCY
): Promise<PriceContext> {
  // Get pricing configuration
  const config = await getActivePricingConfig();
  
  // Calculate market price (already rounded to cents)
  const marketResult = await computeMarketPrice(input);
  
  // Build price context with currency
  const priceContextBase = buildPriceContext(marketResult.marketPrice, riskLevel, config, currency);
  
  // Create pricing record
  await db.orderPricing.create({
    data: {
      transportId: orderId,
      marketPriceEur: priceContextBase.marketPrice,
      startPriceEur: priceContextBase.startPrice,
      minPriceEur: priceContextBase.minPrice,
      riskLevel: priceContextBase.riskLevel,
      adjustedStartPriceEur: priceContextBase.adjustedStartPrice,
      adjustedMinPriceEur: priceContextBase.adjustedMinPrice,
      modelVersion: marketResult.modelVersion,
      configVersion: config.name,
      features: JSON.stringify(marketResult.features),
      currency: currency
    }
  });
  
  return {
    orderId,
    ...priceContextBase,
    configVersion: config.name,
    modelVersion: marketResult.modelVersion,
    features: marketResult.features
  };
}

/**
 * Get pricing context for an order
 * Returns prices rounded to cents with currency
 */
export async function getOrderPricing(orderId: string): Promise<PriceContext | null> {
  const pricing = await db.orderPricing.findUnique({
    where: { transportId: orderId }
  });
  
  if (!pricing) {
    return null;
  }
  
  const currency = pricing.currency || DEFAULT_CURRENCY;
  
  return {
    orderId: pricing.transportId,
    marketPrice: roundToCents(pricing.marketPriceEur),
    startPrice: roundToCents(pricing.startPriceEur),
    minPrice: roundToCents(pricing.minPriceEur),
    riskLevel: pricing.riskLevel as 'green' | 'yellow' | 'red',
    adjustedStartPrice: roundToCents(pricing.adjustedStartPriceEur),
    adjustedMinPrice: roundToCents(pricing.adjustedMinPriceEur),
    currency,
    configVersion: pricing.configVersion || 'default',
    modelVersion: pricing.modelVersion || undefined,
    features: pricing.features ? JSON.parse(pricing.features) : undefined
  };
}

/**
 * Validate a carrier bid
 * Returns structured error with code and details
 * IMPORTANT: priceScore is used by Matching-Engine, never raw bid_price_eur
 */
export async function validateCarrierBid(input: BidValidationInput): Promise<BidValidationResult> {
  // Get pricing context
  const pricing = await getOrderPricing(input.orderId);
  
  if (!pricing) {
    const error = createPricingError('PRICING_NOT_FOUND', {
      orderId: input.orderId,
      currency: DEFAULT_CURRENCY
    });
    return {
      valid: false,
      error,
      reason: 'PRICING_NOT_FOUND',
      currency: DEFAULT_CURRENCY,
      feedback: {
        status: 'rejected',
        message: 'Keine Preisinformationen für diesen Auftrag gefunden.'
      }
    };
  }
  
  // Validate bid
  const validationResult = validateBid(input.bidPrice, pricing);
  
  // Store bid in database with currency
  await db.carrierBid.create({
    data: {
      transportId: input.orderId,
      carrierId: input.carrierId,
      driverId: input.carrierId,
      bidPriceEur: roundToCents(input.bidPrice),
      valid: validationResult.valid,
      validationReason: validationResult.reason || (validationResult.valid ? 'VALID' : 'INVALID'),
      priceScore: validationResult.priceScore,
      status: validationResult.valid ? 'pending' : 'rejected',
      currency: pricing.currency
    }
  });
  
  return validationResult;
}

/**
 * Get active pricing configuration
 */
export async function getActivePricingConfig(): Promise<PricingConfigData> {
  const config = await db.pricingConfig.findFirst({
    where: {
      isActive: true,
      isDefault: true
    }
  });
  
  if (!config) {
    return DEFAULT_PRICING_CONFIG;
  }
  
  return {
    id: config.id,
    name: config.name,
    description: config.description || undefined,
    startFactor: config.startFactor,
    minFactor: config.minFactor,
    riskAdjustments: JSON.parse(config.riskAdjustments),
    isActive: config.isActive,
    isDefault: config.isDefault
  };
}

/**
 * Create or update pricing configuration
 */
export async function upsertPricingConfig(
  configData: Omit<PricingConfigData, 'id' | 'isActive' | 'isDefault'>
): Promise<PricingConfigData> {
  const config = await db.pricingConfig.upsert({
    where: { name: configData.name },
    create: {
      name: configData.name,
      description: configData.description,
      startFactor: configData.startFactor,
      minFactor: configData.minFactor,
      riskAdjustments: JSON.stringify(configData.riskAdjustments),
      isActive: true,
      isDefault: configData.isDefault || false
    },
    update: {
      description: configData.description,
      startFactor: configData.startFactor,
      minFactor: configData.minFactor,
      riskAdjustments: JSON.stringify(configData.riskAdjustments),
      isDefault: configData.isDefault
    }
  });
  
  return {
    id: config.id,
    name: config.name,
    description: config.description || undefined,
    startFactor: config.startFactor,
    minFactor: config.minFactor,
    riskAdjustments: JSON.parse(config.riskAdjustments),
    isActive: config.isActive,
    isDefault: config.isDefault
  };
}

// ============================================
// MARKET PRICE HISTORY (for ML training)
// ============================================

/**
 * Record market price for training
 */
export async function recordMarketPriceHistory(
  input: MarketPriceInput,
  marketPrice: number,
  actualPrice?: number
): Promise<void> {
  await db.marketPriceHistory.create({
    data: {
      originCountry: input.origin.country,
      originPostalCode: input.origin.postalCode,
      destinationCountry: input.destination.country,
      destinationPostalCode: input.destination.postalCode,
      distanceKm: input.distanceKm,
      weightKg: input.weightKg,
      volumeM3: input.volumeM3,
      marketPriceEur: marketPrice,
      actualPriceEur: actualPrice,
      transportType: input.transportType,
      isInternational: input.isInternational || false,
      isHazmat: input.isHazmat || false,
      requiresCooling: input.requiresCooling || false,
      transportDate: new Date()
    }
  });
}

/**
 * Get market price statistics for a route
 */
export async function getRoutePriceStats(
  originCountry: string,
  destinationCountry: string
): Promise<{ avgPrice: number; minPrice: number; maxPrice: number; count: number } | null> {
  const stats = await db.marketPriceHistory.aggregate({
    where: {
      originCountry,
      destinationCountry
    },
    _avg: {
      marketPriceEur: true
    },
    _min: {
      marketPriceEur: true
    },
    _max: {
      marketPriceEur: true
    },
    _count: true
  });
  
  if (stats._count === 0) {
    return null;
  }
  
  return {
    avgPrice: stats._avg.marketPriceEur || 0,
    minPrice: stats._min.marketPriceEur || 0,
    maxPrice: stats._max.marketPriceEur || 0,
    count: stats._count
  };
}

// ============================================
// PRICE SCORE FOR MATCHING ENGINE
// ============================================

/**
 * Calculate price score for matching engine
 * This integrates with the matching engine's price scoring
 * 
 * IMPORTANT: Matching-Engine MUST use this priceScore, never raw bid_price_eur
 * Raw price is only for UI & Reporting
 */
export function calculatePriceScore(
  bidPrice: number,
  marketPrice: number,
  minPrice: number,
  startPrice: number
): number {
  // Round all prices to cents
  const roundedBidPrice = roundToCents(bidPrice);
  const roundedMinPrice = roundToCents(minPrice);
  const roundedStartPrice = roundToCents(startPrice);
  
  if (roundedBidPrice < roundedMinPrice) {
    return 0; // Invalid bid
  }
  
  if (roundedBidPrice > roundedStartPrice) {
    // Above start price - low score but valid
    return Math.max(0, roundToCents(0.2 * (1 - (roundedBidPrice - roundedStartPrice) / roundedStartPrice)));
  }
  
  // Normalize between min and start
  // 1.0 = at min price, 0.0 = at start price
  const range = roundedStartPrice - roundedMinPrice;
  if (range <= 0) return 0.5;
  
  return roundToCents(1 - (roundedBidPrice - roundedMinPrice) / range);
}

/**
 * Get price percentile compared to market
 */
export function calculatePricePercentile(
  bidPrice: number,
  marketPrice: number
): number {
  // Simple heuristic: how far below market price
  const ratio = bidPrice / marketPrice;
  
  if (ratio <= 0.7) return 1.0; // Excellent deal
  if (ratio <= 0.85) return 0.8; // Good deal
  if (ratio <= 1.0) return 0.6; // Below market
  if (ratio <= 1.15) return 0.4; // Slightly above
  if (ratio <= 1.3) return 0.2; // Above market
  return 0.1; // Way above market
}

// ============================================
// EXPORTS
// ============================================

export const pricingEngine = {
  // Basic functions
  computeMarketPrice,
  createOrderPricing,
  getOrderPricing,
  validateCarrierBid,
  getActivePricingConfig,
  upsertPricingConfig,
  recordMarketPriceHistory,
  getRoutePriceStats,
  calculatePriceScore,
  calculatePricePercentile,
  
  // Enhanced pricing with cost breakdown
  computeEnhancedMarketPrice,
  createEnhancedOrderPricing,
  fetchExternalPricingData,
  estimateTollCost
};
