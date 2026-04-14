import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UpdateMatchingRequest, UpdateMatchingResponse, ApiErrorResponse } from '@/types/matching';

// POST /api/matching/update - Update matching session with new data
export async function POST(request: NextRequest) {
  try {
    const body: UpdateMatchingRequest = await request.json();

    if (!body.transportId || !body.event) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required fields: transportId, event',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    // Get active matching session
    const session = await db.matchingSession.findFirst({
      where: {
        transportId: body.transportId,
        status: { in: ['STARTED', 'RUNNING'] }
      }
    });

    if (!session) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'No active matching session found',
        code: 'NO_ACTIVE_SESSION'
      }, { status: 404 });
    }

    let status: 'updated' | 'recalculating' | 'completed' = 'updated';

    switch (body.event) {
      case 'new_driver_available':
        // Recalculate matching with new driver
        status = 'recalculating';
        await handleNewDriverAvailable(session, body.data);
        break;

      case 'driver_location_changed':
        // Update driver distances
        await handleDriverLocationChange(session, body.data);
        break;

      case 'requirements_updated':
        // Re-run filtering with new requirements
        status = 'recalculating';
        await handleRequirementsUpdated(session, body.transportId);
        break;

      case 'price_changed':
        // Update price scores
        await handlePriceChanged(session, body.data);
        break;
    }

    return NextResponse.json<UpdateMatchingResponse>({
      matchingId: session.id,
      status
    }, { status: 200 });

  } catch (error) {
    console.error('Update matching error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to update matching',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

async function handleNewDriverAvailable(session: any, data: any) {
  if (!data?.driverId) return;

  // Check if driver already in candidates
  const existing = await db.matchingCandidate.findFirst({
    where: {
      matchingSessionId: session.id,
      driverId: data.driverId
    }
  });

  if (existing) return;

  // Get driver details
  const driver = await db.driver.findUnique({
    where: { id: data.driverId },
    include: {
      user: true,
      driverVehicles: {
        include: { vehicle: { where: { status: 'ACTIVE' } } }
      }
    }
  });

  if (!driver || !driver.driverVehicles.length) return;

  // Add driver as candidate (simplified - would run full matching logic)
  for (const dv of driver.driverVehicles) {
    await db.matchingCandidate.create({
      data: {
        matchingSessionId: session.id,
        driverId: driver.id,
        vehicleId: dv.vehicle.id,
        hardFilterPassed: true,
        softRulesPassed: true,
        fraudSafe: true,
        internationalAllowed: driver.internationalExperience,
        score: 50, // Default score
        status: 'PENDING',
        expiresAt: session.expiresAt
      }
    }).catch(() => {});
  }
}

async function handleDriverLocationChange(session: any, data: any) {
  if (!data?.driverId || !data?.location) return;

  // In production, would recalculate distance scores for affected candidates
  // For now, just update the timestamp
  await db.matchingSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() }
  });
}

async function handleRequirementsUpdated(session: any, transportId: string) {
  // Get transport with new requirements
  const transport = await db.transport.findUnique({
    where: { id: transportId },
    include: { transportDetail: true }
  });

  if (!transport) return;

  // In production, would re-run the full matching pipeline
  // For now, just update the session timestamp
  await db.matchingSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() }
  });
}

async function handlePriceChanged(session: any, data: any) {
  if (!data?.newPrice) return;

  // In production, would recalculate price scores for all candidates
  // For now, just update the session timestamp
  await db.matchingSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() }
  });
}
