import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

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

// Calculate total route distance
function calculateRouteDistance(waypoints: { lat: number; lng: number }[]): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += calculateDistance(
      waypoints[i].lat, waypoints[i].lng,
      waypoints[i + 1].lat, waypoints[i + 1].lng
    );
  }
  return total;
}

// Simple TSP solver (nearest neighbor)
function optimizeWaypoints(
  start: { lat: number; lng: number },
  waypoints: { lat: number; lng: number; type: string; shipmentId?: string }[]
): { lat: number; lng: number; type: string; shipmentId?: string }[] {
  if (waypoints.length <= 1) return waypoints;

  const optimized: typeof waypoints = [];
  const remaining = [...waypoints];
  let current = start;

  while (remaining.length > 0) {
    // Find nearest waypoint
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateDistance(
        current.lat, current.lng,
        remaining[i].lat, remaining[i].lng
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const nearest = remaining.splice(nearestIdx, 1)[0];
    optimized.push(nearest);
    current = nearest;
  }

  return optimized;
}

// GET - Get optimized routes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const driverId = searchParams.get('driverId');
    const status = searchParams.get('status');

    if (id) {
      const route = await db.optimizedRoute.findUnique({ where: { id } });
      if (!route) {
        return NextResponse.json({ error: 'Route not found' }, { status: 404 });
      }
      return NextResponse.json({ ...route, waypoints: JSON.parse(route.waypoints) });
    }

    const where: any = {};
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;

    const routes = await db.optimizedRoute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      routes: routes.map(r => ({ ...r, waypoints: JSON.parse(r.waypoints) }))
    });

  } catch (error) {
    console.error('Route optimize GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 });
  }
}

// POST - Create optimized route with AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      driverId,
      vehicleId,
      startLocation,  // { lat, lng, name }
      shipments,      // Array of shipment IDs to optimize
      considerTraffic = true,
      considerCapacity = true,
    } = body;

    if (!driverId || !startLocation) {
      return NextResponse.json({ error: 'Driver ID and start location required' }, { status: 400 });
    }

    // Get driver's pending/assigned shipments
    let targetShipments;
    if (shipments && shipments.length > 0) {
      targetShipments = await db.shipment.findMany({
        where: { id: { in: shipments } }
      });
    } else {
      targetShipments = await db.shipment.findMany({
        where: {
          driverId,
          status: { in: ['assigned', 'pending'] }
        }
      });
    }

    if (targetShipments.length === 0) {
      return NextResponse.json({ error: 'No shipments to optimize' }, { status: 400 });
    }

    // Build waypoints
    const waypoints: { lat: number; lng: number; type: string; shipmentId: string; address: string }[] = [];

    for (const shipment of targetShipments) {
      // Add pickup if we have coordinates
      if (shipment.currentLat && shipment.currentLng) {
        waypoints.push({
          lat: shipment.currentLat,
          lng: shipment.currentLng,
          type: 'pickup',
          shipmentId: shipment.id,
          address: shipment.pickupPlace,
        });
      }
      
      // Add delivery
      if (shipment.deliveryGpsLat && shipment.deliveryGpsLng) {
        waypoints.push({
          lat: shipment.deliveryGpsLat,
          lng: shipment.deliveryGpsLng,
          type: 'delivery',
          shipmentId: shipment.id,
          address: shipment.deliveryPlace,
        });
      }
    }

    // Calculate original distance (unordered)
    const originalDistance = calculateRouteDistance([
      startLocation,
      ...waypoints
    ]);

    // Optimize waypoints
    const optimizedWaypoints = optimizeWaypoints(startLocation, waypoints);

    // Calculate optimized distance
    const optimizedDistance = calculateRouteDistance([
      startLocation,
      ...optimizedWaypoints
    ]);

    // Calculate savings
    const savedKm = originalDistance - optimizedDistance;
    const savedMinutes = Math.round(savedKm * 1.5); // ~1.5 min per km saved
    const savedEuros = savedKm * 0.5 + savedMinutes * 0.3; // Fuel + time

    // Estimate duration (average 60 km/h + 15 min per stop)
    const totalDuration = Math.round((optimizedDistance / 60) * 60 + optimizedWaypoints.length * 15);

    // Get AI recommendation
    const zai = await ZAI.create();
    const aiCompletion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Du bist ein Logistik-Experte. Analysiere die optimierte Route und gib eine kurze Empfehlung (max 2 Sätze) auf Deutsch.
Berücksichtige:
- Einsparungen in km und Zeit
- Effizienz der Stop-Reihenfolge
- Mögliche Verbesserungen`
        },
        {
          role: 'user',
          content: `Route von ${startLocation.name || 'Startpunkt'}:
- ${optimizedWaypoints.length} Stopps
- ${optimizedDistance.toFixed(1)} km gesamt
- ${totalDuration} Minuten
- Ersparnis: ${savedKm.toFixed(1)} km, ${savedMinutes} min, €${savedEuros.toFixed(2)}
Stop-Reihenfolge: ${optimizedWaypoints.map(w => w.address || `${w.lat.toFixed(2)},${w.lng.toFixed(2)}`).join(' → ')}`
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const aiRecommendation = aiCompletion.choices[0]?.message?.content || '';

    // Save optimized route
    const route = await db.optimizedRoute.create({
      data: {
        driverId,
        vehicleId,
        waypoints: JSON.stringify([
          { ...startLocation, type: 'start' },
          ...optimizedWaypoints
        ]),
        totalDistance: optimizedDistance,
        totalDuration,
        totalStops: optimizedWaypoints.length,
        savedKm,
        savedMinutes,
        savedEuros,
        aiRecommendation,
        status: 'suggested',
      }
    });

    return NextResponse.json({
      route: { ...route, waypoints: JSON.parse(route.waypoints) },
      originalDistance,
      optimizedDistance,
      savings: {
        km: savedKm,
        minutes: savedMinutes,
        euros: savedEuros,
      },
      aiRecommendation,
    }, { status: 201 });

  } catch (error) {
    console.error('Route optimize POST error:', error);
    return NextResponse.json({ error: 'Failed to optimize route' }, { status: 500 });
  }
}

// PUT - Accept/start route
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'ID and action required' }, { status: 400 });
    }

    const route = await db.optimizedRoute.findUnique({ where: { id } });
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    let data: any = {};

    switch (action) {
      case 'accept':
        data = { status: 'accepted', acceptedAt: new Date() };
        break;
      case 'start':
        data = { status: 'active', startedAt: new Date() };
        break;
      case 'complete':
        data = { status: 'completed', completedAt: new Date() };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await db.optimizedRoute.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ...updated, waypoints: JSON.parse(updated.waypoints) });

  } catch (error) {
    console.error('Route optimize PUT error:', error);
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 });
  }
}
