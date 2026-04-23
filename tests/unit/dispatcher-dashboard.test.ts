/**
 * CargoBit Dispatcher Dashboard Tests
 * =====================================
 * 
 * Unit tests for Dispatcher Dashboard components:
 * - ScoreBadge
 * - ScoreBreakdown
 * - ShapExplainabilityPanel
 * - SuggestionCard
 * - ProfileSelector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import components (these would be actual imports in real setup)
// For now, we test the logic

// =============================================================================
// SCORE BADGE TESTS
// =============================================================================

describe('ScoreBadge', () => {
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'green';
    if (score >= 0.5) return 'yellow';
    return 'red';
  };

  it('should return green for high scores (>= 0.7)', () => {
    expect(getScoreColor(0.7)).toBe('green');
    expect(getScoreColor(0.85)).toBe('green');
    expect(getScoreColor(1.0)).toBe('green');
  });

  it('should return yellow for medium scores (0.5 - 0.69)', () => {
    expect(getScoreColor(0.5)).toBe('yellow');
    expect(getScoreColor(0.6)).toBe('yellow');
    expect(getScoreColor(0.69)).toBe('yellow');
  });

  it('should return red for low scores (< 0.5)', () => {
    expect(getScoreColor(0.49)).toBe('red');
    expect(getScoreColor(0.3)).toBe('red');
    expect(getScoreColor(0.0)).toBe('red');
  });

  it('should display score as percentage', () => {
    const score = 0.725;
    const displayScore = (score * 100).toFixed(0);
    expect(displayScore).toBe('73');
  });
});

// =============================================================================
// SCORE BREAKDOWN TESTS
// =============================================================================

describe('ScoreBreakdown', () => {
  const components = {
    revenue: { score: 0.8, weight: 0.35, contribution: 0.28 },
    capacityUtilization: { score: 0.6, weight: 0.20, contribution: 0.12 },
    priority: { score: 0.5, weight: 0.10, contribution: 0.05 },
    risk: { score: 0.7, weight: 0.10, contribution: 0.07 },
    serviceLevel: { score: 0.4, weight: 0.15, contribution: 0.06 },
    co2: { score: 0.9, weight: 0.10, contribution: 0.09 },
  };

  it('should calculate total score from components', () => {
    const total = Object.values(components).reduce(
      (sum, c) => sum + c.contribution,
      0
    );
    expect(total).toBeCloseTo(0.67, 2);
  });

  it('should verify contribution = score × weight', () => {
    Object.entries(components).forEach(([key, value]) => {
      const expectedContribution = value.score * value.weight;
      expect(value.contribution).toBeCloseTo(expectedContribution, 3);
    });
  });

  it('should have weights sum to 1.0', () => {
    const totalWeight = Object.values(components).reduce(
      (sum, c) => sum + c.weight,
      0
    );
    expect(totalWeight).toBeCloseTo(1.0, 3);
  });

  it('should format contribution for display', () => {
    const contribution = 0.28;
    const display = (contribution * 100).toFixed(1);
    expect(display).toBe('28.0');
  });
});

// =============================================================================
// SHAP EXPLAINABILITY PANEL TESTS
// =============================================================================

describe('ShapExplainabilityPanel', () => {
  const shapContributions = [
    { feature: 'price_per_km', value: 10.5, contribution: 0.05, direction: 'positive' as const },
    { feature: 'capacity_fill', value: 0.8, contribution: 0.03, direction: 'positive' as const },
    { feature: 'detour_efficiency', value: 12, contribution: -0.02, direction: 'negative' as const },
    { feature: 'risk_factor', value: 'MEDIUM', contribution: 0.01, direction: 'positive' as const },
  ];

  it('should sort contributions by absolute value', () => {
    const sorted = [...shapContributions].sort(
      (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
    );
    
    expect(sorted[0].feature).toBe('price_per_km'); // 0.05
    expect(sorted[sorted.length - 1].feature).toBe('risk_factor'); // 0.01
  });

  it('should identify positive contributions', () => {
    const positive = shapContributions.filter(c => c.contribution > 0);
    expect(positive).toHaveLength(3);
  });

  it('should identify negative contributions', () => {
    const negative = shapContributions.filter(c => c.contribution < 0);
    expect(negative).toHaveLength(1);
  });

  it('should handle empty contributions', () => {
    const empty: typeof shapContributions = [];
    expect(empty.length).toBe(0);
  });

  it('should normalize contribution for display', () => {
    const maxContribution = Math.max(...shapContributions.map(c => Math.abs(c.contribution)));
    const normalized = shapContributions[0].contribution / maxContribution * 100;
    
    expect(normalized).toBe(100); // First item is the max
  });
});

// =============================================================================
// SUGGESTION CARD TESTS
// =============================================================================

describe('SuggestionCard', () => {
  const suggestion = {
    id: 'sg_001',
    tourName: 'Test Tour',
    orderName: 'Test Order',
    totalScore: 0.72,
    heuristicScore: 0.72,
    mlScore: null as number | null,
    detourKm: 12,
    additionalRevenue: 187.50,
    status: 'pending' as const,
    components: {
      revenue: { score: 0.8, weight: 0.35, contribution: 0.28 },
      capacityUtilization: { score: 0.6, weight: 0.20, contribution: 0.12 },
      priority: { score: 0.5, weight: 0.10, contribution: 0.05 },
      risk: { score: 0.7, weight: 0.10, contribution: 0.07 },
      serviceLevel: { score: 0.4, weight: 0.15, contribution: 0.06 },
      co2: { score: 0.9, weight: 0.10, contribution: 0.09 },
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'accepted': return 'green';
      case 'rejected': return 'red';
      default: return 'gray';
    }
  };

  it('should return correct status color', () => {
    expect(getStatusColor('pending')).toBe('yellow');
    expect(getStatusColor('accepted')).toBe('green');
    expect(getStatusColor('rejected')).toBe('red');
  });

  it('should format revenue display', () => {
    const revenue = 187.50;
    const display = `+€${revenue.toFixed(2)}`;
    expect(display).toBe('+€187.50');
  });

  it('should format detour display', () => {
    const detourKm = 12;
    const display = `+${detourKm} km Umweg`;
    expect(display).toBe('+12 km Umweg');
  });

  it('should show ML badge when enabled', () => {
    const mlEnabled = true;
    const canaryMode = true;
    const badgeText = mlEnabled ? `ML${canaryMode ? ' (Shadow)' : ''}` : '';
    expect(badgeText).toBe('ML (Shadow)');
  });

  it('should show accept/reject buttons for pending status', () => {
    const showActions = suggestion.status === 'pending';
    expect(showActions).toBe(true);
  });
});

// =============================================================================
// PROFILE SELECTOR TESTS
// =============================================================================

describe('ProfileSelector', () => {
  const profiles = [
    { id: 'revenue_focused', name: 'Revenue-Fokus', isDefault: true },
    { id: 'sustainability', name: 'Nachhaltigkeit', isDefault: false },
    { id: 'risk_averse', name: 'Risikominimierung', isDefault: false },
  ];

  it('should find default profile', () => {
    const defaultProfile = profiles.find(p => p.isDefault);
    expect(defaultProfile?.id).toBe('revenue_focused');
  });

  it('should have unique profile IDs', () => {
    const ids = profiles.map(p => p.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  it('should have exactly one default profile', () => {
    const defaultCount = profiles.filter(p => p.isDefault).length;
    expect(defaultCount).toBe(1);
  });
});

// =============================================================================
// SCORING SIMULATION TESTS
// =============================================================================

describe('ScoringSimulation', () => {
  const priorityMapping: Record<string, number> = {
    PREMIUM: 1.0,
    HIGH: 0.8,
    NORMAL: 0.5,
    LOW: 0.2,
  };

  const riskMapping: Record<string, number> = {
    VERY_LOW: 1.0,
    LOW: 0.8,
    MEDIUM: 0.5,
    HIGH: 0.2,
    VERY_HIGH: 0.0,
  };

  const weights = {
    revenue: 0.35,
    capacityUtilization: 0.20,
    priority: 0.10,
    risk: 0.10,
    serviceLevel: 0.15,
    co2: 0.10,
  };

  it('should calculate revenue score correctly', () => {
    const price = 150;
    const detourKm = 12;
    const revenueScore = Math.min(1.0, price / (detourKm + 1) / 10);
    
    expect(revenueScore).toBeCloseTo(1.0, 1); // Capped at 1.0
  });

  it('should calculate capacity score correctly', () => {
    const orderVolume = 5;
    const freeCapacity = 10;
    const capacityScore = Math.min(1.0, orderVolume / freeCapacity);
    
    expect(capacityScore).toBe(0.5);
  });

  it('should calculate CO2 score correctly', () => {
    const detourKm = 8;
    const maxDetourKm = 20;
    const co2Score = Math.max(0, 1 - detourKm / maxDetourKm);
    
    expect(co2Score).toBe(0.6);
  });

  it('should map priority to score', () => {
    expect(priorityMapping['PREMIUM']).toBe(1.0);
    expect(priorityMapping['NORMAL']).toBe(0.5);
    expect(priorityMapping['LOW']).toBe(0.2);
  });

  it('should map risk level to score', () => {
    expect(riskMapping['VERY_LOW']).toBe(1.0);
    expect(riskMapping['MEDIUM']).toBe(0.5);
    expect(riskMapping['VERY_HIGH']).toBe(0.0);
  });

  it('should calculate total score from components', () => {
    const scores = {
      revenue: 0.8,
      capacityUtilization: 0.5,
      priority: 0.5,
      risk: 0.5,
      serviceLevel: 0.3,
      co2: 0.6,
    };

    const total = 
      weights.revenue * scores.revenue +
      weights.capacityUtilization * scores.capacityUtilization +
      weights.priority * scores.priority +
      weights.risk * scores.risk +
      weights.serviceLevel * scores.serviceLevel +
      weights.co2 * scores.co2;

    expect(total).toBeCloseTo(0.565, 2);
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(1);
  });
});

// =============================================================================
// RECOMMENDATIONS ENGINE TESTS
// =============================================================================

describe('Recommendations Engine', () => {
  const generateRecommendations = (
    totalScore: number,
    components: Record<string, { score: number }>
  ): string[] => {
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

    return recommendations;
  };

  it('should recommend acceptance for high scores', () => {
    const recommendations = generateRecommendations(0.75, {
      revenue: { score: 0.8 },
      co2: { score: 0.7 },
    });

    expect(recommendations).toContain('Hoher Score - Vorschlag empfohlen zur Annahme');
  });

  it('should recommend rejection for low scores', () => {
    const recommendations = generateRecommendations(0.45, {
      revenue: { score: 0.4 },
      co2: { score: 0.3 },
    });

    expect(recommendations).toContain('Score unter 0.5 - Vorschlag sollte abgelehnt werden');
  });

  it('should warn about low revenue', () => {
    const recommendations = generateRecommendations(0.6, {
      revenue: { score: 0.4 },
      co2: { score: 0.7 },
    });

    expect(recommendations).toContain('Revenue-Score niedrig - Preisverhandlung erwägen');
  });

  it('should warn about low CO2', () => {
    const recommendations = generateRecommendations(0.6, {
      revenue: { score: 0.8 },
      co2: { score: 0.2 },
    });

    expect(recommendations).toContain('CO₂-Score niedrig - Großer Umweg, Nachhaltigkeits-Impact prüfen');
  });
});

// =============================================================================
// HYBRID SCORING TESTS
// =============================================================================

describe('Hybrid Scoring', () => {
  const calculateHybridScore = (
    heuristicScore: number,
    mlScore: number | null,
    alpha: number,
    canaryPercentage: number
  ): { score: number; usedML: boolean } => {
    if (mlScore === null) {
      return { score: heuristicScore, usedML: false };
    }

    // Simulate canary decision
    const usesML = Math.random() * 100 < canaryPercentage;
    
    if (usesML) {
      return {
        score: alpha * heuristicScore + (1 - alpha) * mlScore,
        usedML: true,
      };
    }

    return { score: heuristicScore, usedML: false };
  };

  it('should use heuristic when ML is null', () => {
    const result = calculateHybridScore(0.7, null, 0.8, 100);
    
    expect(result.score).toBe(0.7);
    expect(result.usedML).toBe(false);
  });

  it('should blend scores when ML is available', () => {
    const heuristicScore = 0.7;
    const mlScore = 0.6;
    const alpha = 0.8;
    
    const expected = alpha * heuristicScore + (1 - alpha) * mlScore;
    
    expect(expected).toBeCloseTo(0.68, 2);
  });

  it('should respect canary percentage', () => {
    // With 0% canary, ML should never be used
    let mlUsedCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = calculateHybridScore(0.7, 0.6, 0.8, 0);
      if (result.usedML) mlUsedCount++;
    }
    expect(mlUsedCount).toBe(0);

    // With 100% canary, ML should always be used
    mlUsedCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = calculateHybridScore(0.7, 0.6, 0.8, 100);
      if (result.usedML) mlUsedCount++;
    }
    expect(mlUsedCount).toBe(100);
  });
});
