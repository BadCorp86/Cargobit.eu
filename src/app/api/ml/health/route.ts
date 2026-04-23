/**
 * ML Scoring Health API Route
 * 
 * Health check endpoint for ML scoring service.
 */

import { NextResponse } from 'next/server';

const SCORING_SERVICE_URL = process.env.SCORING_SERVICE_URL || 'http://ml-scoring-service:8080';

export async function GET() {
  try {
    const response = await fetch(`${SCORING_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          status: 'unhealthy', 
          error: `Service returned ${response.status}`,
          model_version: null,
          mode: 'unknown',
          uptime_seconds: 0,
          shap_enabled: false,
        },
        { status: 503 }
      );
    }

    const health = await response.json();
    return NextResponse.json(health);

  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Service unavailable',
        model_version: null,
        mode: 'unknown',
        uptime_seconds: 0,
        shap_enabled: false,
      },
      { status: 503 }
    );
  }
}
