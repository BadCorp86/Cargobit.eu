// ============================================
// CARGOBIT PRICING ENGINE TYPES
// Configurable Pricing with Risk Adjustments
// ============================================

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Round a number to cents (2 decimal places)
 * IMPORTANT: All prices must be rounded to cents before storage or comparison
 */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Default currency for all pricing operations
 */
export const DEFAULT_CURRENCY = 'EUR' as const;

// ============================================
// ERROR CODES
// ============================================

/**
 * Structured error codes for pricing operations
 * Using codes instead of text for i18n support
 */
export type PricingErrorCode =
  | 'RISK_BLOCKED'
  | 'BID_BELOW_MIN_PRICE'
  | 'ORDER_NOT_FOUND'
  | 'PRICING_NOT_FOUND'
  | 'INVALID_BID_PRICE'
  | 'CONFIG_NOT_FOUND';

/**
 * Structured error with code and details
 */
export interface PricingError {
  code: PricingErrorCode;
  message?: string; // Optional human-readable message (can be translated)
  details?: Record<string, unknown>;
}

/**
 * Create a structured pricing error
 */
export function createPricingError(
  code: PricingErrorCode,
  details?: Record<string, unknown>
): PricingError {
  return { code, details };
}

// ============================================
// RISK ADJUSTMENT TYPES
// ============================================

export type RiskAdjustmentMode = 'multiplier' | 'block';

export interface RiskAdjustment {
  mode: RiskAdjustmentMode;
  value?: number; // Multiplier value, e.g., 1.10 for 10% increase
}

export interface PricingConfigData {
  id: string;
  name: string;
  description?: string;
  
  // Price factors
  startFactor: number;   // e.g., 1.15 (start price = market * 1.15)
  minFactor: number;     // e.g., 0.65 (min price = market * 0.65)
  
  // Risk adjustments by level
  riskAdjustments: {
    green: RiskAdjustment;
    yellow: RiskAdjustment;
    red: RiskAdjustment;
  };
  
  isActive: boolean;
  isDefault: boolean;
}

/**
 * Default pricing configuration
 */
export const DEFAULT_PRICING_CONFIG: PricingConfigData = {
  id: 'default',
  name: 'default',
  description: 'Standard Pricing-Konfiguration',
  
  startFactor: 1.15,  // Start price is 15% above market
  minFactor: 0.65,    // Min price is 35% below market (anti-dumping)
  
  riskAdjustments: {
    green: { mode: 'multiplier', value: 1.0 },    // No adjustment
    yellow: { mode: 'multiplier', value: 1.10 },  // 10% increase
    red: { mode: 'block' }                        // Block bidding
  },
  
  isActive: true,
  isDefault: true
};

// ============================================
// PRICE CONTEXT TYPES
// ============================================

export interface PriceContext {
  orderId: string;
  
  // Base prices (all rounded to cents)
  marketPrice: number;
  startPrice: number;
  minPrice: number;
  
  // Risk-adjusted prices (all rounded to cents)
  riskLevel: 'green' | 'yellow' | 'red';
  adjustedStartPrice: number;
  adjustedMinPrice: number;
  
  // Currency
  currency: string;
  
  // Config used
  configVersion: string;
  
  // Metadata
  modelVersion?: string;
  features?: Record<string, number>;
}

export interface MarketPriceInput {
  orderId: string;
  
  // Route info
  origin: {
    country: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
  };
  destination: {
    country: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
  };
  
  // Cargo info
  distanceKm: number;
  weightKg: number;
  volumeM3?: number;
  
  // Transport type
  transportType?: string;
  isInternational?: boolean;
  isHazmat?: boolean;
  requiresCooling?: boolean;
}

export interface MarketPriceResult {
  orderId: string;
  marketPrice: number;
  currency: string;
  modelVersion: string;
  confidence?: number;
  features?: Record<string, number>;
}

// ============================================
// BID VALIDATION TYPES
// ============================================

export interface BidValidationInput {
  orderId: string;
  carrierId: string;
  bidPrice: number;
}

export interface BidValidationResult {
  valid: boolean;
  
  // Structured error (always present when valid = false)
  error?: PricingError;
  
  // Legacy reason field for backward compatibility
  reason?: PricingErrorCode | null;
  
  // priceScore: 0-1 normalized, 1 = near min, 0 = near start
  // IMPORTANT: Matching-Engine MUST use this priceScore, never raw bid_price_eur
  priceScore?: number;
  
  // Pricing context (always includes currency)
  marketPrice?: number;
  minPrice?: number;
  startPrice?: number;
  currency?: string;
  
  // Feedback
  feedback?: {
    status: 'excellent' | 'good' | 'acceptable' | 'too_low' | 'rejected';
    message: string;
  };
}

// ============================================
// PRICING API TYPES
// ============================================

export interface PricingOrderResponse {
  orderId: string;
  
  // All prices rounded to cents
  marketPrice: number;
  startPrice: number;
  minPrice: number;
  riskLevel: string;
  adjustedStartPrice: number;
  adjustedMinPrice: number;
  
  // Currency always included
  currency: string;
  configVersion: string;
}

export interface CreatePricingRequest {
  orderId: string;
  route: {
    origin: string;
    destination: string;
  };
  distanceKm: number;
  weightKg: number;
  volumeM3?: number;
  transportType?: string;
  isInternational?: boolean;
}

// ============================================
// PRICE CALCULATION FUNCTIONS
// ============================================

/**
 * Build price context from market price, risk level, and config
 * All prices are rounded to cents
 */
export function buildPriceContext(
  marketPrice: number,
  riskLevel: 'green' | 'yellow' | 'red',
  config: PricingConfigData,
  currency: string = DEFAULT_CURRENCY
): Omit<PriceContext, 'orderId' | 'configVersion' | 'modelVersion' | 'features'> {
  // Round all prices to cents
  const roundedMarketPrice = roundToCents(marketPrice);
  const startPrice = roundToCents(roundedMarketPrice * config.startFactor);
  const minPrice = roundToCents(roundedMarketPrice * config.minFactor);
  
  const riskConfig = config.riskAdjustments[riskLevel];
  
  // Handle blocked risk
  if (riskConfig.mode === 'block') {
    return {
      marketPrice: roundedMarketPrice,
      startPrice,
      minPrice,
      riskLevel,
      adjustedStartPrice: -1, // Indicates blocked
      adjustedMinPrice: -1,
      currency
    };
  }
  
  const factor = riskConfig.value ?? 1.0;
  
  return {
    marketPrice: roundedMarketPrice,
    startPrice,
    minPrice,
    riskLevel,
    adjustedStartPrice: roundToCents(startPrice * factor),
    adjustedMinPrice: roundToCents(minPrice * factor),
    currency
  };
}

/**
 * Validate a carrier bid against price context
 * Returns structured error with code and details
 */
export function validateBid(
  bidPrice: number,
  ctx: PriceContext
): BidValidationResult {
  const roundedBidPrice = roundToCents(bidPrice);
  const currency = ctx.currency || DEFAULT_CURRENCY;
  
  // Check if risk is blocked
  if (ctx.riskLevel === 'red') {
    const error: PricingError = {
      code: 'RISK_BLOCKED',
      details: {
        riskLevel: ctx.riskLevel,
        currency
      }
    };
    return {
      valid: false,
      error,
      reason: 'RISK_BLOCKED',
      currency,
      feedback: {
        status: 'rejected',
        message: 'Gebote für diesen Auftrag sind aufgrund von Risiko-Bewertung gesperrt.'
      }
    };
  }
  
  // Check minimum price (anti-dumping)
  if (roundedBidPrice < ctx.adjustedMinPrice) {
    const error: PricingError = {
      code: 'BID_BELOW_MIN_PRICE',
      details: {
        minPrice: ctx.adjustedMinPrice,
        bidPrice: roundedBidPrice,
        currency
      }
    };
    return {
      valid: false,
      error,
      reason: 'BID_BELOW_MIN_PRICE',
      marketPrice: ctx.marketPrice,
      minPrice: ctx.adjustedMinPrice,
      startPrice: ctx.adjustedStartPrice,
      currency,
      feedback: {
        status: 'rejected',
        message: `Dein Gebot von ${currency} ${roundedBidPrice.toFixed(2)} liegt unter dem Mindestpreis von ${currency} ${ctx.adjustedMinPrice.toFixed(2)}.`
      }
    };
  }
  
  // Calculate price score (IMPORTANT: Used by Matching-Engine)
  // Score: 1 = near min price (good for shipper), 0 = near start price
  // Matching-Engine MUST use this priceScore, never raw bid_price_eur directly
  const range = ctx.adjustedStartPrice - ctx.adjustedMinPrice;
  let priceScore = 0;
  
  if (range > 0) {
    const clamped = Math.min(Math.max(roundedBidPrice, ctx.adjustedMinPrice), ctx.adjustedStartPrice);
    priceScore = roundToCents(1 - (clamped - ctx.adjustedMinPrice) / range);
  } else {
    priceScore = 0.5;
  }
  
  // Generate feedback
  let feedback: BidValidationResult['feedback'];
  
  if (priceScore >= 0.8) {
    feedback = {
      status: 'excellent',
      message: 'Ausgezeichneter Preis! Sehr wettbewerbsfähig.'
    };
  } else if (priceScore >= 0.6) {
    feedback = {
      status: 'good',
      message: 'Guter Preis im erwarteten Bereich.'
    };
  } else if (priceScore >= 0.4) {
    feedback = {
      status: 'acceptable',
      message: 'Akzeptabler Preis.'
    };
  } else {
    feedback = {
      status: 'too_low',
      message: 'Preis akzeptabel, aber nahe am Startpreis.'
    };
  }
  
  return {
    valid: true,
    reason: null,
    priceScore,
    marketPrice: ctx.marketPrice,
    minPrice: ctx.adjustedMinPrice,
    startPrice: ctx.adjustedStartPrice,
    currency,
    feedback
  };
}

/**
 * Calculate heuristic market price
 * Used as fallback when ML model is not available
 */
export function calculateHeuristicMarketPrice(input: MarketPriceInput): number {
  // Base rates
  const baseRate = 50; // € base
  const pricePerKm = 1.2; // € per km
  const pricePerKg = 0.02; // € per kg
  
  // Calculate base price
  let price = baseRate + (input.distanceKm * pricePerKm) + (input.weightKg * pricePerKg);
  
  // International premium
  if (input.isInternational) {
    price *= 1.15;
  }
  
  // Hazmat premium
  if (input.isHazmat) {
    price *= 1.25;
  }
  
  // Cooling premium
  if (input.requiresCooling) {
    price *= 1.20;
  }
  
  // Transport type adjustments
  const typeMultipliers: Record<string, number> = {
    'PALLET': 1.0,
    'BULK': 0.9,
    'LIQUID': 1.1,
    'OVERSIZE': 1.4,
    'LOWLOADER': 1.35,
    'CAR_TRANSPORT': 1.2,
    'COOLING': 1.25,
    'HAZMAT': 1.3,
    'CONTAINER': 1.0
  };
  
  if (input.transportType && typeMultipliers[input.transportType]) {
    price *= typeMultipliers[input.transportType];
  }
  
  // Round to 2 decimal places
  return Math.round(price * 100) / 100;
}

/**
 * Extract features for ML model
 */
export function extractPricingFeatures(input: MarketPriceInput): Record<string, number> {
  return {
    distance_km: input.distanceKm,
    weight_kg: input.weightKg,
    volume_m3: input.volumeM3 || 0,
    is_international: input.isInternational ? 1 : 0,
    is_hazmat: input.isHazmat ? 1 : 0,
    requires_cooling: input.requiresCooling ? 1 : 0,
    // One-hot encoding for transport types
    type_pallet: input.transportType === 'PALLET' ? 1 : 0,
    type_bulk: input.transportType === 'BULK' ? 1 : 0,
    type_liquid: input.transportType === 'LIQUID' ? 1 : 0,
    type_oversize: input.transportType === 'OVERSIZE' ? 1 : 0,
    type_lowloader: input.transportType === 'LOWLOADER' ? 1 : 0,
    type_car_transport: input.transportType === 'CAR_TRANSPORT' ? 1 : 0,
    type_cooling: input.transportType === 'COOLING' ? 1 : 0,
    type_hazmat: input.transportType === 'HAZMAT' ? 1 : 0,
    type_container: input.transportType === 'CONTAINER' ? 1 : 0,
    // Origin/destination encoding (country code hash)
    origin_country_hash: hashCountry(input.origin.country),
    dest_country_hash: hashCountry(input.destination.country)
  };
}

function hashCountry(country: string): number {
  // Simple hash for country code
  let hash = 0;
  for (let i = 0; i < country.length; i++) {
    hash = ((hash << 5) - hash) + country.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) / 2147483647; // Normalize to 0-1
}

// ============================================
// COST BREAKDOWN TYPES (Enhanced Pricing)
// ============================================

/**
 * Complete cost breakdown for enhanced pricing
 * P_market = C_base + C_fuel + C_toll + C_labor + C_risk
 */
export interface CostBreakdown {
  // Base cost components (all in EUR, rounded to cents)
  baseCost: number;       // C_base = distance_km * baseRate
  fuelCost: number;       // C_fuel = distance_km * fuelConsumptionPerKm * fuelPrice
  tollCost: number;       // C_toll = sum of toll segments
  laborCost: number;      // C_labor = drivingHours * hourlyRate
  riskCost: number;       // C_risk = subtotal * riskFactor
  
  // Additional costs
  coolingCost: number;    // Additional cooling surcharge
  hazmatCost: number;     // Hazmat handling surcharge
  internationalCost: number; // Cross-border surcharge
  
  // Totals
  subtotal: number;       // Sum of base costs before risk
  total: number;          // Final market price
  
  // Currency
  currency: string;
}

/**
 * External data required for cost calculation
 */
export interface ExternalPricingData {
  // Fuel data
  fuelPricePerLiter: number;   // Current diesel price in EUR/liter
  fuelRegion: string;           // Region for fuel price (DE, AT, EU)
  
  // Toll data
  tollCostEstimate: number;     // Estimated toll cost for the route
  tollBreakdown?: TollSegment[]; // Detailed toll breakdown
  
  // Labor data
  hourlyRate: number;           // Driver hourly rate in EUR/hour
  laborCountry: string;         // Country for labor rate
  
  // Route data
  avgSpeedKmh: number;          // Average speed for time calculation
  drivingHours: number;         // Calculated driving hours
  
  // Risk data
  riskFactor: number;           // Risk multiplier (0, 0.05, or block)
  riskLevel: 'green' | 'yellow' | 'red';
}

/**
 * Toll segment for breakdown
 */
export interface TollSegment {
  country: string;        // Country code
  system: string;         // Toll system name (Toll Collect, ASFINAG, etc.)
  distanceKm: number;     // Distance on toll road
  costEur: number;        // Cost for this segment
}

/**
 * Vehicle parameters for cost calculation
 */
export interface VehiclePricingParams {
  // Fuel consumption
  fuelConsumptionPer100Km: number;  // Liters per 100km (e.g., 30)
  
  // Base rate
  baseRatePerKm: number;            // Base rate in EUR/km (e.g., 0.25)
  
  // Euro class for toll
  euroClass: 'euro5' | 'euro6' | 'euro6eev';
  
  // Axles
  axles: number;                    // Number of axles (2, 3, 4+)
}

/**
 * Default vehicle parameters for 40t truck
 */
export const DEFAULT_VEHICLE_PARAMS: VehiclePricingParams = {
  fuelConsumptionPer100Km: 30,  // 30 liters/100km
  baseRatePerKm: 0.25,         // 0.25 EUR/km base
  euroClass: 'euro6',
  axles: 4
};

/**
 * Default labor rates by country (EUR/hour)
 */
export const DEFAULT_LABOR_RATES: Record<string, number> = {
  'DE': 25.0,   // Germany
  'AT': 22.0,   // Austria
  'PL': 12.0,   // Poland
  'CZ': 10.0,   // Czech Republic
  'HU': 9.0,    // Hungary
  'RO': 7.0,    // Romania
  'BG': 6.5,    // Bulgaria
  'SK': 10.0,   // Slovakia
  'SI': 15.0,   // Slovenia
  'HR': 12.0,   // Croatia
  'NL': 28.0,   // Netherlands
  'BE': 26.0,   // Belgium
  'FR': 24.0,   // France
  'IT': 20.0,   // Italy
  'ES': 18.0,   // Spain
  'DEFAULT': 20.0 // Default fallback
};

/**
 * Default fuel prices by region (EUR/liter)
 */
export const DEFAULT_FUEL_PRICES: Record<string, number> = {
  'DE': 1.80,    // Germany
  'AT': 1.75,    // Austria
  'EU': 1.70,    // EU average
  'DEFAULT': 1.75 // Default
};

// ============================================
// COST CALCULATION FUNCTIONS
// ============================================

/**
 * Compute complete cost breakdown
 * Implements: P_market = C_base + C_fuel + C_toll + C_labor + C_risk
 */
export function computeCostBreakdown(
  distanceKm: number,
  weightKg: number,
  externalData: ExternalPricingData,
  vehicleParams: VehiclePricingParams = DEFAULT_VEHICLE_PARAMS,
  options: {
    isInternational?: boolean;
    isHazmat?: boolean;
    requiresCooling?: boolean;
  } = {}
): CostBreakdown {
  const { fuelPricePerLiter, tollCostEstimate, hourlyRate, avgSpeedKmh, riskFactor } = externalData;
  const { fuelConsumptionPer100Km, baseRatePerKm } = vehicleParams;
  
  // 1. Base cost: C_base = distance_km * baseRate
  const baseCost = roundToCents(distanceKm * baseRatePerKm);
  
  // 2. Fuel cost: C_fuel = distance_km * (liters/100km / 100) * price_per_liter
  const fuelConsumptionPerKm = fuelConsumptionPer100Km / 100;
  const fuelCost = roundToCents(distanceKm * fuelConsumptionPerKm * fuelPricePerLiter);
  
  // 3. Toll cost
  const tollCost = roundToCents(tollCostEstimate);
  
  // 4. Labor cost: C_labor = driving_hours * hourly_rate
  const drivingHours = distanceKm / avgSpeedKmh;
  const laborCost = roundToCents(drivingHours * hourlyRate);
  
  // Subtotal before risk
  const subtotal = roundToCents(baseCost + fuelCost + tollCost + laborCost);
  
  // 5. Additional costs
  let coolingCost = 0;
  let hazmatCost = 0;
  let internationalCost = 0;
  
  if (options.requiresCooling) {
    coolingCost = roundToCents(subtotal * 0.15); // 15% cooling surcharge
  }
  
  if (options.isHazmat) {
    hazmatCost = roundToCents(subtotal * 0.20); // 20% hazmat surcharge
  }
  
  if (options.isInternational) {
    internationalCost = roundToCents(subtotal * 0.10); // 10% cross-border
  }
  
  // Subtotal with additional costs
  const subtotalWithExtras = roundToCents(subtotal + coolingCost + hazmatCost + internationalCost);
  
  // 6. Risk cost: C_risk = subtotal * riskFactor
  const riskCost = roundToCents(subtotalWithExtras * riskFactor);
  
  // Total market price
  const total = roundToCents(subtotalWithExtras + riskCost);
  
  return {
    baseCost,
    fuelCost,
    tollCost,
    laborCost,
    riskCost,
    coolingCost,
    hazmatCost,
    internationalCost,
    subtotal: subtotalWithExtras,
    total,
    currency: 'EUR'
  };
}

/**
 * Get labor rate by country
 */
export function getLaborRateByCountry(countryCode: string): number {
  return DEFAULT_LABOR_RATES[countryCode.toUpperCase()] || DEFAULT_LABOR_RATES['DEFAULT'];
}

/**
 * Get fuel price by region
 */
export function getFuelPriceByRegion(region: string): number {
  return DEFAULT_FUEL_PRICES[region.toUpperCase()] || DEFAULT_FUEL_PRICES['DEFAULT'];
}

/**
 * Calculate risk factor from risk level
 */
export function getRiskFactorFromLevel(riskLevel: 'green' | 'yellow' | 'red'): number {
  switch (riskLevel) {
    case 'green':
      return 0;      // No risk surcharge
    case 'yellow':
      return 0.05;   // 5% risk surcharge
    case 'red':
      return -1;     // Blocked
    default:
      return 0;
  }
}

// ============================================
// EXPORT ALL
// ============================================

export type {
  RiskAdjustment,
  PricingConfigData,
  PriceContext,
  MarketPriceInput,
  MarketPriceResult,
  BidValidationInput,
  BidValidationResult,
  PricingOrderResponse,
  CreatePricingRequest,
  PricingErrorCode,
  PricingError,
  CostBreakdown,
  ExternalPricingData,
  TollSegment,
  VehiclePricingParams
};

export {
  roundToCents,
  DEFAULT_CURRENCY,
  createPricingError,
  computeCostBreakdown,
  getLaborRateByCountry,
  getFuelPriceByRegion,
  getRiskFactorFromLevel,
  DEFAULT_VEHICLE_PARAMS,
  DEFAULT_LABOR_RATES,
  DEFAULT_FUEL_PRICES
};
