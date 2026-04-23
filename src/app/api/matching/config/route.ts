/**
 * Matching Configuration API
 * GET /api/matching/config - List all configs
 * POST /api/matching/config - Create new config
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ScoringWeights, DEFAULT_WEIGHTS } from '@/types/matching-engine';

/**
 * GET /api/matching/config
 * List all matching configurations
 */
export async function GET() {
  try {
    const configs = await prisma.matchingConfig.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' }
    });
    
    return NextResponse.json({
      configs: configs.map(config => ({
        id: config.id,
        name: config.name,
        description: config.description,
        weights: {
          price: config.weightPrice,
          distance: config.weightDistance,
          reliability: config.weightReliability,
          capacity: config.weightCapacity,
          risk: config.weightRisk
        },
        thresholds: {
          minScore: config.minScore,
          autoMatchGap: config.autoMatchGap
        },
        features: {
          enableAutoMatch: config.enableAutoMatch,
          enableNewCarrierPenalty: config.enableNewCarrierPenalty,
          newCarrierPenalty: config.newCarrierPenalty
        },
        riskSettings: {
          riskRedCap: config.riskRedCap,
          riskYellowPenalty: config.riskYellowPenalty
        },
        isDefault: config.isDefault,
        createdAt: config.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Error fetching configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configurations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matching/config
 * Create new matching configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate weights sum to 1.0
    const weights: ScoringWeights = {
      price: body.weights?.price ?? DEFAULT_WEIGHTS.price,
      distance: body.weights?.distance ?? DEFAULT_WEIGHTS.distance,
      reliability: body.weights?.reliability ?? DEFAULT_WEIGHTS.reliability,
      capacity: body.weights?.capacity ?? DEFAULT_WEIGHTS.capacity,
      risk: body.weights?.risk ?? DEFAULT_WEIGHTS.risk
    };
    
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      return NextResponse.json(
        { error: 'Weights must sum to 1.0', currentSum: weightSum },
        { status: 400 }
      );
    }
    
    // Create config
    const config = await prisma.matchingConfig.create({
      data: {
        name: body.name,
        description: body.description,
        
        weightPrice: weights.price,
        weightDistance: weights.distance,
        weightReliability: weights.reliability,
        weightCapacity: weights.capacity,
        weightRisk: weights.risk,
        
        minScore: body.minScore ?? 0.6,
        autoMatchGap: body.autoMatchGap ?? 0.1,
        
        enableAutoMatch: body.enableAutoMatch ?? false,
        enableNewCarrierPenalty: body.enableNewCarrierPenalty ?? true,
        newCarrierPenalty: body.newCarrierPenalty ?? 0.3,
        
        riskRedCap: body.riskRedCap ?? 0.3,
        riskYellowPenalty: body.riskYellowPenalty ?? 0.1,
        
        isDefault: body.isDefault ?? false,
        isActive: true
      }
    });
    
    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        name: config.name,
        weights
      }
    });
    
  } catch (error) {
    console.error('Error creating config:', error);
    return NextResponse.json(
      { error: 'Failed to create configuration', message: (error as Error).message },
      { status: 500 }
    );
  }
}
