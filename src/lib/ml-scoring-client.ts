/**
 * CargoBit ML Scoring Service API Client
 * 
 * Integration with the ML Scoring Service for real-time
 * suggestion scoring with SHAP explainability.
 */

// Types
export interface ScoringRequest {
  suggestion_id: string;
  tour_id: string;
  heuristic_score: number;
  features: Record<string, number>;
}

export interface Contributor {
  feature: string;
  value: number;
  impact: number;
  direction: 'positive' | 'negative';
}

export interface ScoringResponse {
  suggestion_id: string;
  tour_id: string;
  heuristic_score: number;
  ml_score: number;
  final_score: number;
  model_version: string;
  model_used: 'heuristic' | 'ml' | 'hybrid';
  blend_factor: number;
  top_contributors: Contributor[];
  latency_ms: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  model_version: string | null;
  mode: 'shadow' | 'canary' | 'production';
  uptime_seconds: number;
  shap_enabled: boolean;
}

export interface BatchScoringRequest {
  suggestions: ScoringRequest[];
}

export interface BatchScoringResponse {
  responses: ScoringResponse[];
  total_latency_ms: number;
}

// Configuration
const SCORING_SERVICE_URL = process.env.SCORING_SERVICE_URL || 'http://localhost:8080';
const REQUEST_TIMEOUT = 5000; // 5 seconds

/**
 * ML Scoring Service Client
 */
export class MLScoringClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout?: number) {
    this.baseUrl = baseUrl || SCORING_SERVICE_URL;
    this.timeout = timeout || REQUEST_TIMEOUT;
  }

  /**
   * Score a single suggestion
   */
  async score(request: ScoringRequest): Promise<ScoringResponse> {
    const response = await fetch(`${this.baseUrl}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Scoring failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Score multiple suggestions in batch
   */
  async batchScore(requests: ScoringRequest[]): Promise<ScoringResponse[]> {
    const response = await fetch(`${this.baseUrl}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ suggestions: requests }),
      signal: AbortSignal.timeout(this.timeout * 2), // Double timeout for batch
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Batch scoring failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get service health
   */
  async health(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`, {
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check if service is ready
   */
  async ready(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ready`, {
        signal: AbortSignal.timeout(this.timeout),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Reload model from MLflow
   */
  async reload(): Promise<{ model_version: string | null; shap_enabled: boolean }> {
    const response = await fetch(`${this.baseUrl}/reload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeout * 2),
    });

    if (!response.ok) {
      throw new Error(`Model reload failed: ${response.status}`);
    }

    return response.json();
  }
}

// Default client instance
export const mlScoringClient = new MLScoringClient();

/**
 * Feature Builder for ML Scoring
 * 
 * Builds feature vectors from suggestion context
 */
export class FeatureBuilder {
  /**
   * Build features from suggestion context
   */
  static buildFeatures(context: {
    // Heuristic scores
    revenueScore: number;
    capacityScore: number;
    priorityScore: number;
    riskScore: number;
    serviceLevelScore: number;
    co2Score: number;
    heuristicScore: number;
    
    // Historical features
    customerAcceptanceRate30d?: number;
    customerAvgMargin30d?: number;
    driverAcceptanceRate30d?: number;
    driverAvgMargin30d?: number;
    laneAcceptanceRate30d?: number;
    laneAvgMargin30d?: number;
    
    // Context
    hourOfDay?: number;
    dayOfWeek?: number;
    isWeekend?: boolean;
    weather?: 'CLEAR' | 'CLOUDY' | 'RAINY' | 'SNOWY' | 'STORMY' | 'OTHER';
    traffic?: 'LIGHT' | 'NORMAL' | 'HEAVY' | 'CONGESTED' | 'OTHER';
    
    // Profile
    customerTier?: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'STANDARD';
    customerCreditRating?: number;
    driverRating?: number;
    driverExperienceYears?: number;
    
    // Distance/Time
    distancePickupToRoute?: number;
    distanceDeliveryToDestination?: number;
    timeToPickup?: number;
    timeToDelivery?: number;
  }): Record<string, number> {
    const features: Record<string, number> = {};

    // Heuristic features
    features.revenueScore = context.revenueScore;
    features.capacityScore = context.capacityScore;
    features.priorityScore = context.priorityScore;
    features.riskScore = context.riskScore;
    features.serviceLevelScore = context.serviceLevelScore;
    features.co2Score = context.co2Score;
    features.heuristicScoreNorm = Math.min(Math.max(context.heuristicScore / 15.0, 0), 1);

    // Historical features (defaults to 0.5 for missing)
    features.customerAcceptanceRate30d = context.customerAcceptanceRate30d ?? 0.5;
    features.customerAvgMargin30d = context.customerAvgMargin30d ?? 0.0;
    features.driverAcceptanceRate30d = context.driverAcceptanceRate30d ?? 0.5;
    features.driverAvgMargin30d = context.driverAvgMargin30d ?? 0.0;
    features.laneAcceptanceRate30d = context.laneAcceptanceRate30d ?? 0.5;
    features.laneAvgMargin30d = context.laneAvgMargin30d ?? 0.0;

    // Context features
    features.hourOfDay = context.hourOfDay ?? new Date().getHours();
    features.dayOfWeekNumeric = context.dayOfWeek ?? new Date().getDay();
    features.isWeekend = context.isWeekend ? 1 : 0;
    
    // Weather encoding
    features.weatherEncoded = {
      'CLEAR': 0,
      'CLOUDY': 1,
      'RAINY': 2,
      'SNOWY': 3,
      'STORMY': 4,
      'OTHER': 5,
    }[context.weather ?? 'OTHER'] ?? 5;
    
    // Traffic encoding
    features.trafficEncoded = {
      'LIGHT': 0,
      'NORMAL': 1,
      'HEAVY': 2,
      'CONGESTED': 3,
      'OTHER': 4,
    }[context.traffic ?? 'OTHER'] ?? 4;

    // Profile features
    features.customerTierEncoded = {
      'PLATINUM': 4,
      'GOLD': 3,
      'SILVER': 2,
      'BRONZE': 1,
      'STANDARD': 0,
    }[context.customerTier ?? 'STANDARD'] ?? 0;
    
    features.customerCreditRating = context.customerCreditRating ?? 0.5;
    features.driverRating = context.driverRating ?? 3.0;
    features.driverExperienceYears = context.driverExperienceYears ?? 0.0;

    // Distance/Time features (normalized to 0-1)
    features.distancePickupToRouteNorm = Math.min(
      Math.max((context.distancePickupToRoute ?? 0) / 500.0, 0), 1
    );
    features.distanceDeliveryToDestinationNorm = Math.min(
      Math.max((context.distanceDeliveryToDestination ?? 0) / 500.0, 0), 1
    );
    features.timeToPickupNorm = Math.min(
      Math.max((context.timeToPickup ?? 0) / 360.0, 0), 1
    );
    features.timeToDeliveryNorm = Math.min(
      Math.max((context.timeToDelivery ?? 0) / 360.0, 0), 1
    );

    return features;
  }
}

/**
 * Score Formatter for UI Display
 */
export class ScoreFormatter {
  /**
   * Format score for display
   */
  static formatScore(score: number): string {
    return score.toFixed(2);
  }

  /**
   * Format latency for display
   */
  static formatLatency(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(0)}µs`;
    } else if (ms < 1000) {
      return `${ms.toFixed(1)}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  }

  /**
   * Format impact percentage
   */
  static formatImpact(impact: number): string {
    return `${(impact * 100).toFixed(1)}%`;
  }

  /**
   * Get score color class
   */
  static getScoreColor(score: number): string {
    if (score >= 10) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  }

  /**
   * Get impact direction icon
   */
  static getDirectionIcon(direction: 'positive' | 'negative'): string {
    return direction === 'positive' ? '↑' : '↓';
  }

  /**
   * Format contributors for tooltip
   */
  static formatContributorsTooltip(contributors: Contributor[]): string {
    if (contributors.length === 0) return 'No contributors';
    
    return contributors
      .slice(0, 5)
      .map(c => `${c.feature}: ${this.formatImpact(c.impact)} ${this.getDirectionIcon(c.direction)}`)
      .join('\n');
  }
}

/**
 * React Hook for ML Scoring
 */
export function useMLScoring() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<ScoringResponse | null>(null);

  const score = async (request: ScoringRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await mlScoringClient.score(request);
      setResponse(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    score,
    isLoading,
    error,
    response,
    reset: () => {
      setError(null);
      setResponse(null);
    },
  };
}

// Note: This import should be at the top of the file, but placed here for clarity
import { useState } from 'react';
