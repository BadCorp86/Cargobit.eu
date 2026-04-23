// ============================================
// CARGOBIT METRICS API
// Prometheus-compatible Metrics Endpoint
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { payoutMetrics } from '@/services/payout-metrics.service';

// ============================================
// GET /api/metrics/payouts
// 
// Returns Prometheus-compatible metrics for
// payouts system monitoring.
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Optional: Verify auth for production
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.METRICS_TOKEN}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const format = request.nextUrl.searchParams.get('format') || 'prometheus';

    if (format === 'json') {
      const metrics = await payoutMetrics.getMetrics();
      return NextResponse.json(metrics);
    }

    // Default: Prometheus text format
    const prometheusMetrics = await payoutMetrics.getPrometheusMetrics();

    return new NextResponse(prometheusMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Failed to fetch metrics',
    }, { status: 500 });
  }
}

// ============================================
// POST /api/metrics/payouts
// 
// Record a payout event for metrics tracking.
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate event
    if (!body.type || !['created', 'paid', 'failed', 'cancelled'].includes(body.type)) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Invalid event type',
      }, { status: 400 });
    }

    if (!body.payoutId) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'payoutId is required',
      }, { status: 400 });
    }

    await payoutMetrics.recordEvent({
      type: body.type,
      payoutId: body.payoutId,
      amountCents: body.amountCents || 0,
      processingTimeMs: body.processingTimeMs,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Record event error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Failed to record event',
    }, { status: 500 });
  }
}
