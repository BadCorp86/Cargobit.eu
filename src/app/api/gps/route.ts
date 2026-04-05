import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get GPS positions for an entity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType'); // user, vehicle, shipment
    const entityId = searchParams.get('entityId');
    const shipmentId = searchParams.get('shipmentId');
    const fromTime = searchParams.get('from');
    const toTime = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get current position for shipment tracking
    if (shipmentId) {
      const shipment = await db.shipment.findUnique({
        where: { id: shipmentId },
        select: {
          id: true,
          shipmentNumber: true,
          status: true,
          currentLat: true,
          currentLng: true,
          lastTrackingUpdate: true,
          driver: { select: { id: true, name: true, phone: true } },
          vehicle: { select: { id: true, plateNumber: true, vehicleType: true } },
        }
      });

      if (!shipment) {
        return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
      }

      // Get recent positions for route history
      const positions = await db.gPSPosition.findMany({
        where: {
          entityType: 'shipment',
          entityId: shipmentId,
          recordedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        },
        orderBy: { recordedAt: 'asc' },
        take: limit,
      });

      return NextResponse.json({
        shipment,
        currentLocation: shipment.currentLat ? {
          lat: shipment.currentLat,
          lng: shipment.currentLng,
          timestamp: shipment.lastTrackingUpdate
        } : null,
        routeHistory: positions,
      });
    }

    // Get positions for specific entity
    if (entityType && entityId) {
      const where: any = { entityType, entityId };
      
      if (fromTime) {
        where.recordedAt = { ...where.recordedAt, gte: new Date(fromTime) };
      }
      if (toTime) {
        where.recordedAt = { ...where.recordedAt, lte: new Date(toTime) };
      }

      const positions = await db.gPSPosition.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({ positions });
    }

    // Get all active tracked entities (for fleet overview)
    const activeVehicles = await db.vehicle.findMany({
      where: {
        currentLat: { not: null },
        currentLng: { not: null },
        lastUpdate: { gte: new Date(Date.now() - 30 * 60 * 1000) } // Active in last 30 min
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        capacity: true,
      }
    });

    const activeDrivers = await db.user.findMany({
      where: {
        role: 'DRIVER',
        currentLat: { not: null },
        currentLng: { not: null },
        lastLocationUpdate: { gte: new Date(Date.now() - 30 * 60 * 1000) }
      },
      select: {
        id: true,
        name: true,
        currentLat: true,
        currentLng: true,
        lastLocationUpdate: true,
      }
    });

    return NextResponse.json({
      activeVehicles,
      activeDrivers,
      timestamp: new Date(),
    });

  } catch (error) {
    console.error('GPS GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch GPS data' }, { status: 500 });
  }
}

// POST - Update GPS position (from driver app)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entityType,  // user, vehicle, shipment
      entityId,
      lat,
      lng,
      accuracy,
      speed,
      heading,
      altitude,
      locationName,
      isMoving,
      batteryLevel,
      isCharging,
    } = body;

    // Validate required fields
    if (!entityType || !entityId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save GPS position
    const position = await db.gPSPosition.create({
      data: {
        entityType,
        entityId,
        lat,
        lng,
        accuracy,
        speed,
        heading,
        altitude,
        locationName,
        isMoving: isMoving ?? false,
        batteryLevel,
        isCharging: isCharging ?? false,
      }
    });

    // Update entity's current position
    switch (entityType) {
      case 'user':
        await db.user.update({
          where: { id: entityId },
          data: {
            currentLat: lat,
            currentLng: lng,
            lastLocationUpdate: new Date(),
          }
        });
        break;

      case 'vehicle':
        await db.vehicle.update({
          where: { id: entityId },
          data: {
            currentLat: lat,
            currentLng: lng,
            lastUpdate: new Date(),
          }
        });
        break;

      case 'shipment':
        await db.shipment.update({
          where: { id: entityId },
          data: {
            currentLat: lat,
            currentLng: lng,
            lastTrackingUpdate: new Date(),
          }
        });
        break;
    }

    return NextResponse.json(position, { status: 201 });

  } catch (error) {
    console.error('GPS POST error:', error);
    return NextResponse.json({ error: 'Failed to save GPS position' }, { status: 500 });
  }
}

// DELETE - Clean old GPS history
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30');

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await db.gPSPosition.deleteMany({
      where: {
        recordedAt: { lt: cutoffDate }
      }
    });

    return NextResponse.json({
      deleted: result.count,
      cutoffDate,
    });

  } catch (error) {
    console.error('GPS DELETE error:', error);
    return NextResponse.json({ error: 'Failed to clean GPS history' }, { status: 500 });
  }
}
