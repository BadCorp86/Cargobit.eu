// ============================================
// MITIGATION API: POST /api/mitigation/verify-gps
// GPS-Check abschließen
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { mitigationService } from '@/services/mitigation.service';
import { MITIGATION_ERROR_CODES } from '@/types/mitigation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.mitigationId) {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.MITIGATION_NOT_FOUND.code,
          message: 'mitigationId is required',
        },
        { status: 400 }
      );
    }

    if (!body.gps || typeof body.gps.lat !== 'number' || typeof body.gps.lng !== 'number') {
      return NextResponse.json(
        {
          error: 'INVALID_GPS_DATA',
          message: 'gps object with lat and lng is required',
        },
        { status: 400 }
      );
    }

    // Validate GPS coordinates range
    if (body.gps.lat < -90 || body.gps.lat > 90) {
      return NextResponse.json(
        {
          error: 'INVALID_GPS_DATA',
          message: 'Latitude must be between -90 and 90',
        },
        { status: 400 }
      );
    }

    if (body.gps.lng < -180 || body.gps.lng > 180) {
      return NextResponse.json(
        {
          error: 'INVALID_GPS_DATA',
          message: 'Longitude must be between -180 and 180',
        },
        { status: 400 }
      );
    }

    const result = await mitigationService.verifyGPS({
      mitigationId: body.mitigationId,
      gps: {
        lat: body.gps.lat,
        lng: body.gps.lng,
        accuracy: body.gps.accuracy,
      },
    });

    if (result.status === 'error') {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.MITIGATION_NOT_FOUND.code,
          message: result.message,
        },
        { status: 404 }
      );
    }

    if (result.status === 'failed') {
      const statusCode = result.remainingAttempts === 0 ? 403 : 400;
      return NextResponse.json(
        {
          status: result.status,
          message: result.message,
          distance: result.distance,
          remainingAttempts: result.remainingAttempts,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      status: result.status,
      message: result.message,
      distance: result.distance,
    });
  } catch (error) {
    console.error('[MitigationAPI] Error in POST /api/mitigation/verify-gps:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to verify GPS location',
      },
      { status: 500 }
    );
  }
}
