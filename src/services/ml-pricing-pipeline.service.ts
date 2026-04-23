/**
 * CargoBit ML Pricing Pipeline
 * Feature Engineering and Model Interface for Predictive Pricing
 * 
 * Model: Gradient Boosting (XGBoost/LightGBM)
 * Target: executed_price_eur (actually paid price)
 * 
 * Pipeline:
 * 1) Feature Engineering from orders, pricing, risk, carrier data
 * 2) Training with time-based split (rolling window)
 * 3) Deployment as REST/gRPC service or embedded ONNX
 * 4) Monitoring with drift detection
 */

import { prisma } from '@/lib/db';
import { roundToCents } from '@/types/pricing-engine';

// ============================================
// FEATURE MATRIX DEFINITION
// ============================================

/**
 * ML Feature Categories (7 categories, ~30 features)
 */
export interface MLPricingFeatures {
  // === ROUTE FEATURES (6) ===
  origin_country: string;
  destination_country: string;
  distance_km: number;
  toll_cost_estimate: number;
  border_crossings: number;
  route_complexity: number; // 0-1, based on number of countries, toll systems

  // === FREIGHT FEATURES (5) ===
  weight_kg: number;
  volume_m3: number;
  freight_type: string; // PALLET, BULK, etc.
  pallet_count: number;
  special_handling: number; // 0-1, combination of hazmat, cooling, fragile

  // === TIME FEATURES (5) ===
  day_of_week: number; // 0-6
  hour_of_day: number; // 0-23
  month: number; // 1-12
  is_weekend: boolean;
  is_holiday: boolean;
  season: number; // 0-3 (Q1-Q4)

  // === MARKET FEATURES (4) ===
  historical_avg_price: number; // Avg price for this route
  demand_index: number; // 0-1, current demand
  supply_index: number; // 0-1, carrier availability
  price_volatility: number; // StdDev of recent prices

  // === COST FEATURES (5) ===
  fuel_price_per_liter: number;
  fuel_cost_estimate: number;
  toll_cost_total: number;
  labor_cost_estimate: number;
  base_cost_estimate: number;

  // === RISK FEATURES (4) ===
  risk_level: 'green' | 'yellow' | 'red';
  risk_score: number; // 0-100
  theft_hotspot_flag: boolean;
  fraud_incidents_route: number; // Historical incidents on route

  // === EXTERNAL FEATURES (3) ===
  weather_severity: number; // 0-1, impact on route
  traffic_congestion_index: number; // 0-1
  economic_index: number; // Fuel price trend, inflation, etc.
}

/**
 * Feature vector for ML model (numerical only)
 */
export interface MLFeatureVector {
  // Route features
  distance_km: number;
  distance_km_normalized: number;
  toll_cost_estimate: number;
  border_crossings: number;
  route_complexity: number;

  // Freight features
  weight_kg: number;
  weight_kg_normalized: number;
  volume_m3: number;
  volume_m3_normalized: number;
  pallet_count: number;
  special_handling: number;

  // Time features (one-hot encoded)
  day_of_week_0: number;
  day_of_week_1: number;
  day_of_week_2: number;
  day_of_week_3: number;
  day_of_week_4: number;
  day_of_week_5: number;
  day_of_week_6: number;
  hour_of_day_sin: number;
  hour_of_day_cos: number;
  month_sin: number;
  month_cos: number;
  is_weekend: number;
  is_holiday: number;

  // Market features
  historical_avg_price: number;
  demand_index: number;
  supply_index: number;
  price_volatility: number;

  // Cost features
  fuel_price_per_liter: number;
  fuel_cost_estimate: number;
  toll_cost_total: number;
  labor_cost_estimate: number;
  base_cost_estimate: number;

  // Risk features
  risk_score_normalized: number;
  theft_hotspot_flag: number;
  fraud_incidents_route: number;

  // External features
  weather_severity: number;
  traffic_congestion_index: number;
  economic_index: number;

  // One-hot encoded countries (top 10 EU countries)
  origin_country_DE: number;
  origin_country_AT: number;
  origin_country_PL: number;
  origin_country_CZ: number;
  origin_country_NL: number;
  origin_country_BE: number;
  origin_country_FR: number;
  origin_country_IT: number;
  origin_country_ES: number;
  origin_country_OTHER: number;

  dest_country_DE: number;
  dest_country_AT: number;
  dest_country_PL: number;
  dest_country_CZ: number;
  dest_country_NL: number;
  dest_country_BE: number;
  dest_country_FR: number;
  dest_country_IT: number;
  dest_country_ES: number;
  dest_country_OTHER: number;

  // One-hot encoded freight types
  freight_type_PALLET: number;
  freight_type_BULK: number;
  freight_type_LIQUID: number;
  freight_type_OVERSIZE: number;
  freight_type_COOLING: number;
  freight_type_HAZMAT: number;
  freight_type_CONTAINER: number;
  freight_type_OTHER: number;
}

// ============================================
// MODEL INTERFACE
// ============================================

export interface MLPredictionRequest {
  features: MLFeatureVector;
  orderId: string;
}

export interface MLPredictionResponse {
  predictedPrice: number;
  confidence: number; // 0-1
  modelVersion: string;
  featureImportance?: Record<string, number>;
}

export interface MLModelMetrics {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  r2Score: number; // R² Score
  trainingDataCount: number;
  trainedAt: Date;
  modelVersion: string;
}

// ============================================
// FEATURE ENGINEERING SERVICE
// ============================================

export class MLPricingPipeline {
  private modelVersion = 'v1.0.0';
  
  /**
   * Extract features from transport order for ML prediction
   */
  async extractFeatures(
    orderId: string
  ): Promise<MLPricingFeatures> {
    // Get transport data
    const transport = await prisma.transport.findUnique({
      where: { id: orderId },
      include: {
        pickupAddress: true,
        deliveryAddress: true,
        transportDetail: true,
        orderPricing: true
      }
    });

    if (!transport) {
      throw new Error(`Transport ${orderId} not found`);
    }

    // Get external data
    const fuelPrice = await this.getFuelPrice(transport.pickupAddress.country);
    const laborRate = await this.getLaborRate(transport.pickupAddress.country);
    const tollCost = await this.getTollCost(orderId);
    const riskData = await this.getRiskData(orderId);
    const marketData = await this.getMarketData(
      transport.pickupAddress.country,
      transport.deliveryAddress.country
    );
    const externalData = await this.getExternalData(transport);

    // Calculate derived features
    const distanceKm = transport.distanceKm || 0;
    const weightKg = transport.transportDetail?.weightKg || 0;
    const volumeM3 = transport.transportDetail?.volumeM3 || 0;
    const avgSpeedKmh = 70;
    const drivingHours = distanceKm / avgSpeedKmh;

    // Calculate costs
    const baseCost = distanceKm * 0.25;
    const fuelCost = distanceKm * 0.30 * fuelPrice; // 30L/100km
    const laborCost = drivingHours * laborRate;

    // Special handling score
    const specialHandling = this.calculateSpecialHandlingScore(transport);

    // Route complexity
    const transitCountries = transport.transitCountries 
      ? JSON.parse(transport.transitCountries) 
      : [];
    const routeComplexity = this.calculateRouteComplexity(
      transport.pickupAddress.country,
      transport.deliveryAddress.country,
      transitCountries
    );

    // Time features
    const pickupDate = transport.pickupDatetime;
    const dayOfWeek = pickupDate.getDay();
    const hourOfDay = pickupDate.getHours();
    const month = pickupDate.getMonth() + 1;

    return {
      // Route
      origin_country: transport.pickupAddress.country,
      destination_country: transport.deliveryAddress.country,
      distance_km: distanceKm,
      toll_cost_estimate: tollCost,
      border_crossings: transitCountries.length,
      route_complexity: routeComplexity,

      // Freight
      weight_kg: weightKg,
      volume_m3: volumeM3,
      freight_type: transport.transportType,
      pallet_count: this.estimatePalletCount(weightKg, volumeM3),
      special_handling: specialHandling,

      // Time
      day_of_week: dayOfWeek,
      hour_of_day: hourOfDay,
      month: month,
      is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
      is_holiday: false, // TODO: Integrate holiday calendar
      season: Math.ceil(month / 3),

      // Market
      historical_avg_price: marketData.avgPrice,
      demand_index: marketData.demandIndex,
      supply_index: marketData.supplyIndex,
      price_volatility: marketData.priceVolatility,

      // Cost
      fuel_price_per_liter: fuelPrice,
      fuel_cost_estimate: roundToCents(fuelCost),
      toll_cost_total: tollCost,
      labor_cost_estimate: roundToCents(laborCost),
      base_cost_estimate: roundToCents(baseCost),

      // Risk
      risk_level: riskData.level,
      risk_score: riskData.score,
      theft_hotspot_flag: riskData.theftHotspot,
      fraud_incidents_route: riskData.fraudIncidents,

      // External
      weather_severity: externalData.weatherSeverity,
      traffic_congestion_index: externalData.trafficCongestion,
      economic_index: externalData.economicIndex
    };
  }

  /**
   * Convert features to numerical vector for ML model
   */
  toFeatureVector(features: MLPricingFeatures): MLFeatureVector {
    // Normalize distances/weights
    const maxDistance = 3000; // km
    const maxWeight = 40000; // kg
    const maxVolume = 100; // m3

    // One-hot encode day of week
    const dayOfWeekOneHot = Array(7).fill(0);
    dayOfWeekOneHot[features.day_of_week] = 1;

    // Cyclical encoding for hour and month
    const hourSin = Math.sin(2 * Math.PI * features.hour_of_day / 24);
    const hourCos = Math.cos(2 * Math.PI * features.hour_of_day / 24);
    const monthSin = Math.sin(2 * Math.PI * features.month / 12);
    const monthCos = Math.cos(2 * Math.PI * features.month / 12);

    // One-hot encode countries
    const topCountries = ['DE', 'AT', 'PL', 'CZ', 'NL', 'BE', 'FR', 'IT', 'ES'];
    const originCountryOneHot = this.oneHotEncode(
      features.origin_country, 
      topCountries, 
      'OTHER'
    );
    const destCountryOneHot = this.oneHotEncode(
      features.destination_country, 
      topCountries, 
      'OTHER'
    );

    // One-hot encode freight types
    const freightTypes = ['PALLET', 'BULK', 'LIQUID', 'OVERSIZE', 'COOLING', 'HAZMAT', 'CONTAINER'];
    const freightTypeOneHot = this.oneHotEncode(
      features.freight_type,
      freightTypes,
      'OTHER'
    );

    // Risk score normalized
    const riskScoreNormalized = features.risk_score / 100;

    return {
      // Route
      distance_km: features.distance_km,
      distance_km_normalized: features.distance_km / maxDistance,
      toll_cost_estimate: features.toll_cost_estimate,
      border_crossings: features.border_crossings,
      route_complexity: features.route_complexity,

      // Freight
      weight_kg: features.weight_kg,
      weight_kg_normalized: features.weight_kg / maxWeight,
      volume_m3: features.volume_m3,
      volume_m3_normalized: features.volume_m3 / maxVolume,
      pallet_count: features.pallet_count,
      special_handling: features.special_handling,

      // Time
      day_of_week_0: dayOfWeekOneHot[0],
      day_of_week_1: dayOfWeekOneHot[1],
      day_of_week_2: dayOfWeekOneHot[2],
      day_of_week_3: dayOfWeekOneHot[3],
      day_of_week_4: dayOfWeekOneHot[4],
      day_of_week_5: dayOfWeekOneHot[5],
      day_of_week_6: dayOfWeekOneHot[6],
      hour_of_day_sin: hourSin,
      hour_of_day_cos: hourCos,
      month_sin: monthSin,
      month_cos: monthCos,
      is_weekend: features.is_weekend ? 1 : 0,
      is_holiday: features.is_holiday ? 1 : 0,

      // Market
      historical_avg_price: features.historical_avg_price,
      demand_index: features.demand_index,
      supply_index: features.supply_index,
      price_volatility: features.price_volatility,

      // Cost
      fuel_price_per_liter: features.fuel_price_per_liter,
      fuel_cost_estimate: features.fuel_cost_estimate,
      toll_cost_total: features.toll_cost_total,
      labor_cost_estimate: features.labor_cost_estimate,
      base_cost_estimate: features.base_cost_estimate,

      // Risk
      risk_score_normalized: riskScoreNormalized,
      theft_hotspot_flag: features.theft_hotspot_flag ? 1 : 0,
      fraud_incidents_route: features.fraud_incidents_route,

      // External
      weather_severity: features.weather_severity,
      traffic_congestion_index: features.traffic_congestion_index,
      economic_index: features.economic_index,

      // Origin country one-hot
      origin_country_DE: originCountryOneHot['DE'],
      origin_country_AT: originCountryOneHot['AT'],
      origin_country_PL: originCountryOneHot['PL'],
      origin_country_CZ: originCountryOneHot['CZ'],
      origin_country_NL: originCountryOneHot['NL'],
      origin_country_BE: originCountryOneHot['BE'],
      origin_country_FR: originCountryOneHot['FR'],
      origin_country_IT: originCountryOneHot['IT'],
      origin_country_ES: originCountryOneHot['ES'],
      origin_country_OTHER: originCountryOneHot['OTHER'],

      // Destination country one-hot
      dest_country_DE: destCountryOneHot['DE'],
      dest_country_AT: destCountryOneHot['AT'],
      dest_country_PL: destCountryOneHot['PL'],
      dest_country_CZ: destCountryOneHot['CZ'],
      dest_country_NL: destCountryOneHot['NL'],
      dest_country_BE: destCountryOneHot['BE'],
      dest_country_FR: destCountryOneHot['FR'],
      dest_country_IT: destCountryOneHot['IT'],
      dest_country_ES: destCountryOneHot['ES'],
      dest_country_OTHER: destCountryOneHot['OTHER'],

      // Freight type one-hot
      freight_type_PALLET: freightTypeOneHot['PALLET'],
      freight_type_BULK: freightTypeOneHot['BULK'],
      freight_type_LIQUID: freightTypeOneHot['LIQUID'],
      freight_type_OVERSIZE: freightTypeOneHot['OVERSIZE'],
      freight_type_COOLING: freightTypeOneHot['COOLING'],
      freight_type_HAZMAT: freightTypeOneHot['HAZMAT'],
      freight_type_CONTAINER: freightTypeOneHot['CONTAINER'],
      freight_type_OTHER: freightTypeOneHot['OTHER']
    };
  }

  /**
   * Predict market price using ML model
   * Falls back to heuristic if model not available
   */
  async predict(
    orderId: string
  ): Promise<MLPredictionResponse> {
    try {
      // Extract features
      const features = await this.extractFeatures(orderId);
      const featureVector = this.toFeatureVector(features);

      // TODO: Call actual ML model service
      // For now, use heuristic prediction
      const heuristicPrice = this.heuristicPrediction(features);

      return {
        predictedPrice: roundToCents(heuristicPrice),
        confidence: 0.75, // Lower confidence for heuristic
        modelVersion: 'heuristic-v1',
        featureImportance: this.getFeatureImportance()
      };
    } catch (error) {
      console.error('[MLPipeline] Prediction failed:', error);
      throw error;
    }
  }

  /**
   * Combine heuristic and ML predictions
   */
  combinePredictions(
    heuristicPrice: number,
    mlPrice: number,
    mlConfidence: number
  ): number {
    // Weight ML prediction by confidence
    const mlWeight = mlConfidence * 0.5; // Max 50% weight
    const heuristicWeight = 1 - mlWeight;

    return roundToCents(
      heuristicPrice * heuristicWeight + 
      mlPrice * mlWeight
    );
  }

  // ============================================
  // TRAINING DATA EXPORT
  // ============================================

  /**
   * Export training dataset for ML model training
   * Format: Array of {features, target}
   */
  async exportTrainingData(
    fromDate: Date,
    toDate: Date
  ): Promise<Array<{ features: MLFeatureVector; target: number }>> {
    // Get completed transports with pricing
    const transports = await prisma.transport.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: fromDate,
          lte: toDate
        },
        agreedPrice: { not: null }
      },
      include: {
        pickupAddress: true,
        deliveryAddress: true,
        transportDetail: true,
        orderPricing: true
      }
    });

    const trainingData: Array<{ features: MLFeatureVector; target: number }> = [];

    for (const transport of transports) {
      try {
        const mlFeatures = await this.extractFeatures(transport.id);
        const featureVector = this.toFeatureVector(mlFeatures);
        
        trainingData.push({
          features: featureVector,
          target: transport.agreedPrice!
        });
      } catch (error) {
        console.warn(`[MLPipeline] Failed to extract features for ${transport.id}`);
      }
    }

    return trainingData;
  }

  // ============================================
  // MONITORING & DRIFT DETECTION
  // ============================================

  /**
   * Calculate prediction error metrics
   */
  async calculateMetrics(
    fromDate: Date,
    toDate: Date
  ): Promise<MLModelMetrics> {
    const transports = await prisma.transport.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: fromDate,
          lte: toDate
        },
        agreedPrice: { not: null },
        orderPricing: { isNot: null }
      },
      include: {
        orderPricing: true
      }
    });

    if (transports.length === 0) {
      return {
        mape: 0,
        rmse: 0,
        r2Score: 0,
        trainingDataCount: 0,
        trainedAt: new Date(),
        modelVersion: this.modelVersion
      };
    }

    const errors: number[] = [];
    const squaredErrors: number[] = [];
    const actualPrices: number[] = [];

    for (const transport of transports) {
      const predicted = transport.orderPricing?.marketPriceEur || 0;
      const actual = transport.agreedPrice || 0;

      if (actual > 0) {
        const error = (predicted - actual) / actual;
        errors.push(Math.abs(error));
        squaredErrors.push(Math.pow(predicted - actual, 2));
        actualPrices.push(actual);
      }
    }

    // MAPE
    const mape = errors.length > 0 
      ? (errors.reduce((a, b) => a + b, 0) / errors.length) * 100 
      : 0;

    // RMSE
    const rmse = squaredErrors.length > 0
      ? Math.sqrt(squaredErrors.reduce((a, b) => a + b, 0) / squaredErrors.length)
      : 0;

    // R²
    const meanActual = actualPrices.reduce((a, b) => a + b, 0) / actualPrices.length;
    const ssRes = squaredErrors.reduce((a, b) => a + b, 0);
    const ssTot = actualPrices.reduce((a, p) => a + Math.pow(p - meanActual, 2), 0);
    const r2Score = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    return {
      mape,
      rmse,
      r2Score,
      trainingDataCount: transports.length,
      trainedAt: new Date(),
      modelVersion: this.modelVersion
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async getFuelPrice(country: string): Promise<number> {
    const fuelPrice = await prisma.fuelPrice.findFirst({
      where: {
        region: country,
        fuelType: 'diesel',
        priceDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { priceDate: 'desc' }
    });

    return fuelPrice?.pricePerLiter || 1.75;
  }

  private async getLaborRate(country: string): Promise<number> {
    const laborRate = await prisma.laborRate.findFirst({
      where: {
        countryCode: country,
        isActive: true
      }
    });

    return laborRate?.hourlyRateEur || 20;
  }

  private async getTollCost(transportId: string): Promise<number> {
    const tollCost = await prisma.tollCost.findUnique({
      where: { transportId }
    });

    return tollCost?.totalCostEur || 0;
  }

  private async getRiskData(orderId: string): Promise<{
    level: 'green' | 'yellow' | 'red';
    score: number;
    theftHotspot: boolean;
    fraudIncidents: number;
  }> {
    // Get risk score from Risk-Engine
    const riskScore = await prisma.riskScore.findFirst({
      where: {
        entityType: 'TRANSACTION',
        entityId: orderId
      }
    });

    return {
      level: (riskScore?.riskLevel?.toLowerCase() as 'green' | 'yellow' | 'red') || 'green',
      score: riskScore?.score || 0,
      theftHotspot: false, // TODO: Integrate with Risk-Engine
      fraudIncidents: 0
    };
  }

  private async getMarketData(
    originCountry: string,
    destinationCountry: string
  ): Promise<{
    avgPrice: number;
    demandIndex: number;
    supplyIndex: number;
    priceVolatility: number;
  }> {
    // Get historical price data
    const stats = await prisma.marketPriceHistory.aggregate({
      where: {
        originCountry,
        destinationCountry
      },
      _avg: {
        marketPriceEur: true
      },
      _count: true
    });

    return {
      avgPrice: stats._avg.marketPriceEur || 0,
      demandIndex: 0.5, // TODO: Calculate from active orders
      supplyIndex: 0.5, // TODO: Calculate from available carriers
      priceVolatility: 0.1 // TODO: Calculate std deviation
    };
  }

  private async getExternalData(transport: {
    pickupDatetime: Date;
    pickupAddress: { country: string };
    deliveryAddress: { country: string };
  }): Promise<{
    weatherSeverity: number;
    trafficCongestion: number;
    economicIndex: number;
  }> {
    // TODO: Integrate with weather API, traffic API, economic indicators
    return {
      weatherSeverity: 0.1,
      trafficCongestion: 0.3,
      economicIndex: 0.5
    };
  }

  private calculateSpecialHandlingScore(transport: {
    transportType: string;
    transportDetail?: { isHazmat: boolean; isFragile: boolean } | null;
    isInternational?: boolean;
  }): number {
    let score = 0;

    if (transport.transportDetail?.isHazmat) score += 0.3;
    if (transport.transportDetail?.isFragile) score += 0.2;
    if (transport.transportType === 'COOLING') score += 0.25;
    if (transport.transportType === 'OVERSIZE') score += 0.15;
    if (transport.isInternational) score += 0.1;

    return Math.min(1, score);
  }

  private calculateRouteComplexity(
    origin: string,
    destination: string,
    transitCountries: string[]
  ): number {
    let complexity = 0;

    // Base complexity for international
    if (origin !== destination) {
      complexity += 0.3;
    }

    // Add complexity for each transit country
    complexity += transitCountries.length * 0.15;

    // Cap at 1
    return Math.min(1, complexity);
  }

  private estimatePalletCount(weightKg: number, volumeM3: number): number {
    // Assume ~500kg per pallet, ~1.2m³ per pallet
    const byWeight = Math.ceil(weightKg / 500);
    const byVolume = Math.ceil(volumeM3 / 1.2);
    return Math.max(byWeight, byVolume);
  }

  private oneHotEncode(
    value: string,
    categories: string[],
    fallbackCategory: string
  ): Record<string, number> {
    const result: Record<string, number> = {};
    
    for (const cat of categories) {
      result[cat] = value === cat ? 1 : 0;
    }
    result[fallbackCategory] = categories.includes(value) ? 0 : 1;

    return result;
  }

  private heuristicPrediction(features: MLPricingFeatures): number {
    // Base rate
    const baseRate = 0.25; // EUR/km
    let price = features.distance_km * baseRate;

    // Weight factor
    price += features.weight_kg * 0.02;

    // Fuel cost
    price += features.fuel_cost_estimate;

    // Toll cost
    price += features.toll_cost_total;

    // Labor cost
    price += features.labor_cost_estimate;

    // Special handling
    if (features.special_handling > 0) {
      price *= (1 + features.special_handling * 0.2);
    }

    // Risk premium
    if (features.risk_level === 'yellow') {
      price *= 1.05;
    }

    // Market adjustment
    if (features.demand_index > features.supply_index) {
      price *= (1 + (features.demand_index - features.supply_index) * 0.1);
    }

    return price;
  }

  private getFeatureImportance(): Record<string, number> {
    // Feature importance from trained model (placeholder)
    return {
      distance_km: 0.25,
      weight_kg: 0.15,
      fuel_cost_estimate: 0.12,
      historical_avg_price: 0.10,
      toll_cost_total: 0.08,
      labor_cost_estimate: 0.08,
      demand_index: 0.05,
      supply_index: 0.04,
      risk_score_normalized: 0.04,
      route_complexity: 0.03,
      special_handling: 0.03,
      day_of_week: 0.02,
      hour_of_day: 0.01
    };
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const mlPricingPipeline = new MLPricingPipeline();
