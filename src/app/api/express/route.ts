import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET - Get express transports (for driver feed or single transport)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const driverLat = parseFloat(searchParams.get('driverLat') || '0');
    const driverLng = parseFloat(searchParams.get('driverLng') || '0');
    const status = searchParams.get('status') || 'active';
    const creatorId = searchParams.get('creatorId');

    // Get single express transport
    if (id) {
      const express = await db.expressTransport.findUnique({ where: { id } });
      if (!express) {
        return NextResponse.json({ error: 'Express transport not found' }, { status: 404 });
      }
      return NextResponse.json(express);
    }

    // Build query
    const where: any = { status };
    
    if (creatorId) {
      where.creatorId = creatorId;
    }

    // Get active express transports
    const expresses = await db.expressTransport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // If driver location provided, calculate distances and filter by radius
    if (driverLat && driverLng) {
      const withDistance = expresses
        .map(exp => ({
          ...exp,
          distance: calculateDistance(driverLat, driverLng, exp.pickupLat, exp.pickupLng)
        }))
        .filter(exp => exp.distance <= exp.alertRadiusKm)
        .sort((a, b) => a.distance - b.distance);

      return NextResponse.json({
        expressTransports: withDistance,
        driverLocation: { lat: driverLat, lng: driverLng },
      });
    }

    return NextResponse.json({ expressTransports: expresses });

  } catch (error) {
    console.error('Express GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch express transports' }, { status: 500 });
  }
}

// POST - Create express transport request (trigger alerts to nearby drivers)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      creatorId,
      creatorName,
      creatorPhone,
      pickupAddress,
      pickupLat,
      pickupLng,
      pickupPlace,
      pickupDeadline,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      deliveryPlace,
      weight,
      volume,
      pallets,
      description,
      specialRequirements,
      offeredPrice,
      currency,
      alertRadiusKm,
      expiresInMinutes,
    } = body;

    // Validate required fields
    if (!creatorId || !pickupAddress || !pickupLat || !pickupLng || !description || !offeredPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const radiusKm = alertRadiusKm || 20;
    const expiresAt = new Date(Date.now() + (expiresInMinutes || 30) * 60 * 1000);

    // Create express transport
    const express = await db.expressTransport.create({
      data: {
        creatorId,
        creatorName: creatorName || 'Unknown',
        creatorPhone,
        pickupAddress,
        pickupLat,
        pickupLng,
        pickupPlace: pickupPlace || '',
        pickupDeadline: pickupDeadline ? new Date(pickupDeadline) : new Date(Date.now() + 2 * 60 * 60 * 1000),
        deliveryAddress: deliveryAddress || '',
        deliveryLat,
        deliveryLng,
        deliveryPlace,
        weight: weight || 0,
        volume,
        pallets: pallets || 0,
        description,
        specialRequirements,
        offeredPrice,
        currency: currency || 'EUR',
        alertRadiusKm: radiusKm,
        status: 'active',
        expiresAt,
      }
    });

    // Find drivers within radius
    const nearbyDrivers = await db.user.findMany({
      where: {
        role: 'DRIVER',
        status: 'ACTIVE',
        currentLat: { not: null },
        currentLng: { not: null },
      },
      select: {
        id: true,
        name: true,
        currentLat: true,
        currentLng: true,
      }
    });

    // Filter by radius
    const driversToAlert = nearbyDrivers.filter(driver => {
      if (!driver.currentLat || !driver.currentLng) return false;
      const distance = calculateDistance(pickupLat, pickupLng, driver.currentLat, driver.currentLng);
      return distance <= radiusKm;
    });

    // Create push notifications for each driver
    const notifications = await Promise.all(
      driversToAlert.map(driver =>
        db.pushNotification.create({
          data: {
            userId: driver.id,
            title: '🚨 Express Transport!',
            body: `${description.substring(0, 50)}... - €${offeredPrice}`,
            data: JSON.stringify({
              expressId: express.id,
              type: 'express',
              pickupPlace,
              distance: calculateDistance(pickupLat, pickupLng, driver.currentLat!, driver.currentLng!).toFixed(1)
            }),
            type: 'express',
            entityType: 'express_transport',
            entityId: express.id,
            status: 'pending',
          }
        })
      )
    );

    // Update notification count
    await db.expressTransport.update({
      where: { id: express.id },
      data: { notificationsSent: driversToAlert.length }
    });

    return NextResponse.json({
      express,
      driversAlerted: driversToAlert.length,
      notifications: notifications.length,
    }, { status: 201 });

  } catch (error) {
    console.error('Express POST error:', error);
    return NextResponse.json({ error: 'Failed to create express transport' }, { status: 500 });
  }
}

// PUT - Accept express transport
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, driverId, driverName } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'ID and action required' }, { status: 400 });
    }

    const express = await db.expressTransport.findUnique({ where: { id } });
    if (!express) {
      return NextResponse.json({ error: 'Express transport not found' }, { status: 404 });
    }

    let data: any = {};

    switch (action) {
      case 'accept':
        if (!driverId) {
          return NextResponse.json({ error: 'Driver ID required' }, { status: 400 });
        }
        if (express.status !== 'active') {
          return NextResponse.json({ error: 'Express transport no longer available' }, { status: 400 });
        }
        data = {
          status: 'accepted',
          acceptedById: driverId,
          acceptedByName: driverName || 'Driver',
          acceptedAt: new Date(),
        };
        break;

      case 'cancel':
        if (express.creatorId !== driverId && express.acceptedById !== driverId) {
          return NextResponse.json({ error: 'Not authorized to cancel' }, { status: 403 });
        }
        data = { status: 'cancelled' };
        break;

      case 'complete':
        if (express.acceptedById !== driverId) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }
        data = { status: 'delivered' };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await db.expressTransport.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Express PUT error:', error);
    return NextResponse.json({ error: 'Failed to update express transport' }, { status: 500 });
  }
}
