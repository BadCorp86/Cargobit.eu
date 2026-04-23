/**
 * CargoBit Dispatcher API - Suggestions Endpoint
 * ===============================================
 * 
 * GET: Fetch matching suggestions for dispatcher
 * Returns suggestions with scores, SHAP explanations, and details
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock data for demo - in production, fetch from database
const generateMockSuggestions = (profile: string, tenantId?: string) => {
  const baseSuggestions = [
    {
      id: 'sg_001',
      tourId: 'tour_DE_HH_01',
      tourName: 'Tour Hamburg-Nord MO-01',
      orderId: 'order_789',
      orderName: 'Palettentransport - 5 Paletten nach Kiel',
      
      // Scores based on profile
      totalScore: 0.72,
      heuristicScore: 0.72,
      mlScore: null,
      
      // Component scores
      components: {
        revenue: { score: 0.85, weight: 0.35, contribution: 0.2975 },
        capacityUtilization: { score: 0.70, weight: 0.20, contribution: 0.14 },
        priority: { score: 0.50, weight: 0.10, contribution: 0.05 },
        risk: { score: 0.80, weight: 0.10, contribution: 0.08 },
        serviceLevel: { score: 0.70, weight: 0.15, contribution: 0.105 },
        co2: { score: 0.50, weight: 0.10, contribution: 0.05 },
      },
      
      // SHAP contributions (empty when ML disabled)
      shapContributions: [],
      
      // Tour details
      detourKm: 12,
      pickupTime: '08:30',
      deliveryTime: '14:00',
      additionalRevenue: 187.50,
      co2Saved: 4.2,
      
      // Metadata
      status: 'pending',
      createdAt: new Date().toISOString(),
      mlEnabled: false,
      canaryMode: true,
    },
    {
      id: 'sg_002',
      tourId: 'tour_DE_HH_02',
      tourName: 'Tour Hamburg-Süd MO-02',
      orderId: 'order_790',
      orderName: 'Express-Lieferung - Medizintechnik Lübeck',
      
      totalScore: 0.58,
      heuristicScore: 0.58,
      mlScore: null,
      
      components: {
        revenue: { score: 0.60, weight: 0.35, contribution: 0.21 },
        capacityUtilization: { score: 0.85, weight: 0.20, contribution: 0.17 },
        priority: { score: 0.80, weight: 0.10, contribution: 0.08 },
        risk: { score: 0.50, weight: 0.10, contribution: 0.05 },
        serviceLevel: { score: 0.70, weight: 0.15, contribution: 0.105 },
        co2: { score: 0.15, weight: 0.10, contribution: 0.015 },
      },
      
      shapContributions: [],
      
      detourKm: 18,
      pickupTime: '10:00',
      deliveryTime: '12:30',
      additionalRevenue: 245.00,
      co2Saved: 2.1,
      
      status: 'pending',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      mlEnabled: false,
      canaryMode: true,
    },
    {
      id: 'sg_003',
      tourId: 'tour_DE_HH_03',
      tourName: 'Tour Hamburg-Hafen MO-03',
      orderId: 'order_791',
      orderName: 'Teilladung - Baustoffe nach Bremen',
      
      totalScore: 0.81,
      heuristicScore: 0.81,
      mlScore: null,
      
      components: {
        revenue: { score: 0.90, weight: 0.35, contribution: 0.315 },
        capacityUtilization: { score: 0.95, weight: 0.20, contribution: 0.19 },
        priority: { score: 0.50, weight: 0.10, contribution: 0.05 },
        risk: { score: 0.80, weight: 0.10, contribution: 0.08 },
        serviceLevel: { score: 0.60, weight: 0.15, contribution: 0.09 },
        co2: { score: 0.85, weight: 0.10, contribution: 0.085 },
      },
      
      shapContributions: [],
      
      detourKm: 8,
      pickupTime: '06:00',
      deliveryTime: '11:00',
      additionalRevenue: 312.00,
      co2Saved: 6.8,
      
      status: 'pending',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      mlEnabled: false,
      canaryMode: true,
    },
  ];

  // Adjust weights based on profile
  const profileWeights: Record<string, Record<string, number>> = {
    revenue_focused: { revenue: 0.35, capacityUtilization: 0.20, priority: 0.10, risk: 0.10, serviceLevel: 0.15, co2: 0.10 },
    premium_customers: { revenue: 0.25, capacityUtilization: 0.15, priority: 0.15, risk: 0.10, serviceLevel: 0.25, co2: 0.10 },
    sustainability: { revenue: 0.25, capacityUtilization: 0.15, priority: 0.10, risk: 0.10, serviceLevel: 0.10, co2: 0.30 },
    risk_averse: { revenue: 0.25, capacityUtilization: 0.15, priority: 0.10, risk: 0.25, serviceLevel: 0.15, co2: 0.10 },
  };

  const weights = profileWeights[profile] || profileWeights.revenue_focused;

  // Recalculate scores with profile weights
  return baseSuggestions.map(suggestion => {
    const components = { ...suggestion.components };
    let totalScore = 0;

    Object.keys(components).forEach(key => {
      components[key].weight = weights[key];
      components[key].contribution = components[key].score * weights[key];
      totalScore += components[key].contribution;
    });

    return {
      ...suggestion,
      components,
      totalScore,
      heuristicScore: totalScore,
    };
  });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profile = searchParams.get('profile') || 'revenue_focused';
    const tenantId = searchParams.get('tenant') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // In production, fetch from database with proper filters
    const suggestions = generateMockSuggestions(profile, tenantId);

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(offset, offset + limit),
      total: suggestions.length,
      profile,
      tenantId,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < suggestions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
