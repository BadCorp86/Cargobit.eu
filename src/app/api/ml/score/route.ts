/**
 * ML Scoring API Route
 * 
 * Proxy endpoint for ML scoring service.
 * Used as fallback when direct service access is not available.
 */

import { NextRequest, NextResponse } from 'next/server';

const SCORING_SERVICE_URL = process.env.SCORING_SERVICE_URL || 'http://ml-scoring-service:8080';

interface ScoringRequest {
  suggestion_id: string;
  tour_id: string;
  heuristic_score: number;
  features: Record<string, number>;
}

export async function POST(request: NextRequest) {
  let body: ScoringRequest;
  
  try {
    body = await request.json();
    
    // Validate request
    if (!body.suggestion_id || !body.tour_id || typeof body.heuristic_score !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request: missing required fields' },
        { status: 400 }
      );
    }

    // Forward to ML scoring service
    const response = await fetch(`${SCORING_SERVICE_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Scoring service error: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('ML scoring error:', error);
    
    // Return fallback response (heuristic only)
    return NextResponse.json({
      error: 'ML scoring service unavailable',
      fallback: true,
      suggestion_id: body?.suggestion_id || 'unknown',
      tour_id: body?.tour_id || 'unknown',
      heuristic_score: body?.heuristic_score || 0,
      ml_score: 0,
      final_score: body?.heuristic_score || 0,
      model_version: 'none',
      model_used: 'heuristic',
      blend_factor: 1.0,
      top_contributors: [],
      latency_ms: 0,
    }, { status: 503 });
  }
}
