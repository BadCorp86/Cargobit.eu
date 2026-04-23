import { NextRequest, NextResponse } from 'next/server';
import { getReconciliationMetrics } from '@/reconciliation/metrics/reconciliation.metrics';
import { verifyServiceAuth, isInternalRequest } from '@/lib/admin-auth';

/**
 * GET /api/metrics/reconciliation
 *
 * Prometheus Metrics Endpoint für Reconciliation
 * Nur zugänglich für interne Services oder mit gültigem Service-Key
 */
export async function GET(request: NextRequest) {
  try {
    // Auth-Check: Nur interne Services erlaubt
    const isInternal = isInternalRequest(request);
    const hasServiceAuth = await verifyServiceAuth(request);

    // In Produktion sollte man Prometheus IP-Ranges vertrauen
    // Für Staging/Dev erlauben wir Service-Key Auth
    const skipAuth = process.env.NODE_ENV === 'development' || process.env.METRICS_PUBLIC === 'true';

    if (!isInternal && !hasServiceAuth && !skipAuth) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Hole Metrics
    const metrics = getReconciliationMetrics();
    const metricsOutput = await metrics.getMetrics();
    const contentType = metrics.getContentType();

    return new NextResponse(metricsOutput, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics', code: 'METRICS_ERROR' },
      { status: 500 }
    );
  }
}
