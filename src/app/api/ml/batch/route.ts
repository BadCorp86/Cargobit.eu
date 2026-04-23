/**
 * ML Batch Scoring API Route
 * 
 * Batch scoring endpoint for multiple suggestions.
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
  try {
    const body = await request.json();
    const suggestions: ScoringRequest[] = body.suggestions || [];
    
    // Validate request
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: suggestions array required' },
        { status: 400 }
      );
    }

    if (suggestions.length > 100) {
      return NextResponse.json(
        { error: 'Too many suggestions: maximum 100 per batch' },
        { status: 400 }
      );
    }

    // Forward to ML scoring service
    const response = await fetch(`${SCORING_SERVICE_URL}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ suggestions }),
      signal: AbortSignal.timeout(10000), // 10s timeout for batch
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Batch scoring failed: ${response.status}` },
        { status: response.status }
      );
    }

    const results = await response.json();
    return NextResponse.json(results);

  } catch (error) {
    console.error('ML batch scoring error:', error);
    
    return NextResponse.json(
      { error: 'ML scoring service unavailable' },
      { status: 503 }
    );
  }
}
