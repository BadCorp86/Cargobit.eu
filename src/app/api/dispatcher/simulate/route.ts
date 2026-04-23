/**
 * CargoBit Dispatcher API - Scoring Simulation
 * =============================================
 * 
 * POST: Simulate scoring for an order/tour combination
 * - Calculates heuristic score
 * - Optionally calculates ML score (if enabled)
 * - Returns detailed breakdown
 */

import { NextRequest, NextResponse } from 'next/server';

// Profile weights configuration
const PROFILE_WEIGHTS: Record<string, Record<string, number>> = {
  revenue_focused: {
    revenue: 0.35,
    capacityUtilization: 0.20,
    priority: 0.10,
    risk: 0.10,
    serviceLevel: 0.15,
    co2: 0.10,
  },
  premium_customers: {
    revenue: 0.25,
    capacityUtilization: 0.15,
    priority: 0.15,
    risk: 0.10,
    serviceLevel: 0.25,
    co2: 0.10,
  },
  sustainability: {
    revenue: 0.25,
    capacityUtilization: 0.15,
    priority: 0.10,
    risk: 0.10,
    serviceLevel: 0.10,
    co2: 0.30,
  },
  risk_averse: {
    revenue: 0.25,
    capacityUtilization: 0.15,
    priority: 0.10,
    risk: 0.25,
    serviceLevel: 0.15,
    co2: 0.10,
  },
};

// Score mappings
const PRIORITY_SCORES: Record<string, number> = {
  PREMIUM: 1.0,
  HIGH: 0.8,
  NORMAL: 0.5,
  LOW: 0.2,
};

const RISK_SCORES: Record<string, number> = {
  VERY_LOW: 1.0,
  LOW: 0.8,
  MEDIUM: 0.5,
  HIGH: 0.2,
  VERY_HIGH: 0.0,
};

const SERVICE_LEVEL_SCORES: Record<string, number> = {
  SLA_CRITICAL: 1.0,
  SLA_HIGH: 0.7,
  STANDARD: 0.3,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      order = {},
      tour = {},
      profile = 'revenue_focused',
      includeML = false,
    } = body;

    // Extract order data
    const {
      price = 100,
      volumeM3 = 5,
      priority = 'NORMAL',
      riskLevel = 'MEDIUM',
      serviceLevel = 'STANDARD',
    } = order;

    // Extract tour data
    const {
      detourKm = 10,
      freeCapacityM3 = 10,
    } = tour;

    // Get weights for profile
    const weights = PROFILE_WEIGHTS[profile] || PROFILE_WEIGHTS.revenue_focused;

    // Calculate individual scores
    const revenueScore = Math.min(1.0, price / (detourKm + 1) / 10);
    const capacityScore = Math.min(1.0, volumeM3 / freeCapacityM3);
    const priorityScore = PRIORITY_SCORES[priority] || 0.5;
    const riskScore = RISK_SCORES[riskLevel] || 0.5;
    const serviceLevelScore = SERVICE_LEVEL_SCORES[serviceLevel] || 0.3;
    const co2Score = Math.max(0, 1 - detourKm / 20);

    // Calculate contributions
    const components = {
      revenue: {
        score: Math.round(revenueScore * 1000) / 1000,
        weight: weights.revenue,
        contribution: Math.round(revenueScore * weights.revenue * 1000) / 1000,
      },
      capacityUtilization: {
        score: Math.round(capacityScore * 1000) / 1000,
        weight: weights.capacityUtilization,
        contribution: Math.round(capacityScore * weights.capacityUtilization * 1000) / 1000,
      },
      priority: {
        score: priorityScore,
        weight: weights.priority,
        contribution: Math.round(priorityScore * weights.priority * 1000) / 1000,
      },
      risk: {
        score: riskScore,
        weight: weights.risk,
        contribution: Math.round(riskScore * weights.risk * 1000) / 1000,
      },
      serviceLevel: {
        score: serviceLevelScore,
        weight: weights.serviceLevel,
        contribution: Math.round(serviceLevelScore * weights.serviceLevel * 1000) / 1000,
      },
      co2: {
        score: Math.round(co2Score * 1000) / 1000,
        weight: weights.co2,
        contribution: Math.round(co2Score * weights.co2 * 1000) / 1000,
      },
    };

    // Calculate total score
    const heuristicScore = Object.values(components).reduce(
      (sum, c) => sum + c.contribution,
      0
    );

    // ML score simulation (mock)
    let mlScore: number | null = null;
    let shapContributions: any[] = [];

    if (includeML) {
      // Simulate ML score with some variance
      const variance = (Math.random() - 0.5) * 0.1;
      mlScore = Math.max(0, Math.min(1, heuristicScore + variance));

      // Generate mock SHAP contributions
      shapContributions = [
        {
          feature: 'price_per_km',
          value: price / (detourKm + 1),
          contribution: variance > 0 ? 0.05 : -0.03,
          direction: variance > 0 ? 'positive' : 'negative',
          description: 'Preis pro Kilometer Umweg',
        },
        {
          feature: 'capacity_fill_rate',
          value: volumeM3 / freeCapacityM3,
          contribution: capacityScore > 0.5 ? 0.04 : -0.02,
          direction: capacityScore > 0.5 ? 'positive' : 'negative',
          description: 'Kapazitätsauslastung',
        },
        {
          feature: 'customer_priority',
          value: priority,
          contribution: priorityScore === 1.0 ? 0.06 : priorityScore === 0.8 ? 0.03 : 0,
          direction: priorityScore >= 0.8 ? 'positive' : 'neutral',
          description: 'Kundenpriorität',
        },
        {
          feature: 'detour_efficiency',
          value: detourKm,
          contribution: detourKm < 10 ? 0.05 : detourKm > 15 ? -0.04 : 0,
          direction: detourKm < 10 ? 'positive' : detourKm > 15 ? 'negative' : 'neutral',
          description: 'Umweg-Effizienz',
        },
        {
          feature: 'risk_factor',
          value: riskLevel,
          contribution: riskScore >= 0.8 ? 0.03 : riskScore <= 0.2 ? -0.05 : 0,
          direction: riskScore >= 0.8 ? 'positive' : riskScore <= 0.2 ? 'negative' : 'neutral',
          description: 'Risikofaktor',
        },
      ];
    }

    // Hybrid score (if ML enabled)
    const alpha = 0.8; // Heuristic weight
    const totalScore = mlScore !== null
      ? alpha * heuristicScore + (1 - alpha) * mlScore
      : heuristicScore;

    const result = {
      success: true,
      
      // Scores
      totalScore: Math.round(totalScore * 1000) / 1000,
      heuristicScore: Math.round(heuristicScore * 1000) / 1000,
      mlScore: mlScore !== null ? Math.round(mlScore * 1000) / 1000 : null,
      
      // Breakdown
      components,
      
      // SHAP (if ML enabled)
      shapContributions,
      
      // Input echo
      input: {
        order: {
          price,
          volumeM3,
          priority,
          riskLevel,
          serviceLevel,
        },
        tour: {
          detourKm,
          freeCapacityM3,
        },
        profile,
      },
      
      // Metadata
      metadata: {
        mlEnabled: includeML,
        alpha: includeML ? alpha : null,
        timestamp: new Date().toISOString(),
      },
      
      // Recommendations
      recommendations: generateRecommendations(totalScore, components),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in scoring simulation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to simulate scoring' },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  totalScore: number,
  components: any
): string[] {
  const recommendations: string[] = [];

  if (totalScore < 0.5) {
    recommendations.push('Score unter 0.5 - Vorschlag sollte abgelehnt werden');
  } else if (totalScore >= 0.7) {
    recommendations.push('Hoher Score - Vorschlag empfohlen zur Annahme');
  }

  if (components.revenue.score < 0.5) {
    recommendations.push('Revenue-Score niedrig - Preisverhandlung erwägen');
  }

  if (components.co2.score < 0.3) {
    recommendations.push('CO₂-Score niedrig - Großer Umweg, Nachhaltigkeits-Impact prüfen');
  }

  if (components.risk.score < 0.5) {
    recommendations.push('Risiko-Score erhöht - Zusätzliche Absicherung erwägen');
  }

  if (components.capacityUtilization.score > 0.8) {
    recommendations.push('Hohe Kapazitätsauslastung - Effiziente Tourenplanung');
  }

  return recommendations;
}
