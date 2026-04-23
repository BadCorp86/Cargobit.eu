/**
 * API Route: ML Pricing Prediction
 * POST /api/pricing/ml/predict
 * 
 * Predicts market price using ML model with feature extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { mlPricingPipeline } from '@/services/ml-pricing-pipeline.service';
import { computeEnhancedMarketPrice } from '@/services/pricing-engine.service';
import { DEFAULT_VEHICLE_PARAMS } from '@/types/pricing-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, riskLevel = 'green' } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    // Get ML prediction
    const prediction = await mlPricingPipeline.predict(orderId);

    return NextResponse.json({
      orderId,
      predictedPrice: prediction.predictedPrice,
      confidence: prediction.confidence,
      modelVersion: prediction.modelVersion,
      featureImportance: prediction.featureImportance
    });
  } catch (error) {
    console.error('[ML-Predict] Error:', error);
    return NextResponse.json(
      { error: 'Prediction failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const orderId = searchParams.get('orderId');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  try {
    // Get model metrics
    if (action === 'metrics') {
      const metrics = await mlPricingPipeline.getModelMetrics();
      return NextResponse.json(metrics);
    }

    // Export training data
    if (action === 'training-data' && fromDate && toDate) {
      const trainingData = await mlPricingPipeline.exportTrainingData(
        new Date(fromDate),
        new Date(toDate)
      );
      
      return NextResponse.json({
        count: trainingData.length,
        sampleRate: '90d',
        exportedAt: new Date().toISOString(),
        data: trainingData.slice(0, 100) // Return first 100 samples
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use action=metrics or action=training-data' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[ML-Predict] Error:', error);
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 }
    );
  }
}
