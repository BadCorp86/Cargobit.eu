// ============================================
// CARGOBIT SECURITY GATEWAY API
// GET /api/security/health
// Service Health Check
// Version: 1.2.0
// ============================================

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Service start time for uptime calculation
const SERVICE_START_TIME = Date.now();

export async function GET() {
  const dependencies = {
    riskEngine: 'unavailable' as const,
    database: 'disconnected' as const,
  };

  // Check database connection
  try {
    await db.$queryRaw`SELECT 1`;
    dependencies.database = 'connected';
  } catch (error) {
    console.error('[HealthCheck] Database check failed:', error);
  }

  // Check risk engine (internal, so always healthy if DB is connected)
  if (dependencies.database === 'connected') {
    dependencies.riskEngine = 'healthy';
  }

  const allHealthy = dependencies.database === 'connected';
  const uptime = Math.floor((Date.now() - SERVICE_START_TIME) / 1000);

  return NextResponse.json({
    status: allHealthy ? 'ok' : 'degraded',
    service: 'security-gateway',
    version: '1.2.0',
    port: 3004,
    dependencies,
    uptime,
  }, { 
    status: allHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    }
  });
}
