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

// GET - Find available capacity near a location
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radiusKm = parseInt(searchParams.get('radius') || '50');
    const minWeight = parseFloat(searchParams.get('minWeight') || '0');
    const minVolume = parseFloat(searchParams.get('minVolume') || '0');
    const minPallets = parseInt(searchParams.get('minPallets') || '0');
    const headingTo = searchParams.get('headingTo'); // Filter by destination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Latitude and longitude required' }, { status: 400 });
    }

    // Get all capacities with location data
    const capacities = await db.vehicleCapacity.findMany({
      where: {
        status: { in: ['available', 'partially_loaded'] },
        lat: { not: null },
        lng: { not: null },
        availableWeight: { gte: minWeight },
        availableVolume: { gte: minVolume },
        availablePallets: { gte: minPallets },
      },
      include: {
        vehicle: {
          include: {
            user: {
              select: { id: true, name: true, companyName: true, phone: true }
            }
          }
        }
      }
    });

    // Filter by radius and calculate distances
    const withDistance = capacities
      .map(cap => ({
        ...cap,
        distance: calculateDistance(lat, lng, cap.lat!, cap.lng!)
      }))
      .filter(cap => cap.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    // Filter by heading direction if specified
    const filtered = headingTo 
      ? withDistance.filter(cap => 
          cap.headingTo?.toLowerCase().includes(headingTo.toLowerCase())
        )
      : withDistance;

    // Paginate
    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      capacities: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      searchCenter: { lat, lng },
      radiusKm,
    });

  } catch (error) {
    console.error('Capacity GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch capacities' }, { status: 500 });
  }
}

// POST - Update vehicle capacity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vehicleId,
      availableWeight,
      availableVolume,
      availablePallets,
      availableLength,
      status,
      lat,
      lng,
      locationName,
      currentRoute,
      headingTo,
    } = body;

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 });
    }

    // Check if vehicle exists
    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Upsert capacity
    const capacity = await db.vehicleCapacity.upsert({
      where: { vehicleId },
      update: {
        availableWeight: availableWeight ?? undefined,
        availableVolume: availableVolume ?? undefined,
        availablePallets: availablePallets ?? undefined,
        availableLength: availableLength ?? undefined,
        status: status ?? undefined,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        locationName: locationName ?? undefined,
        currentRoute: currentRoute ?? undefined,
        headingTo: headingTo ?? undefined,
      },
      create: {
        vehicleId,
        availableWeight: availableWeight || 0,
        availableVolume: availableVolume || 0,
        availablePallets: availablePallets || 0,
        availableLength: availableLength || 0,
        status: status || 'available',
        lat,
        lng,
        locationName,
        currentRoute,
        headingTo,
      }
    });

    // Update vehicle location too
    if (lat && lng) {
      await db.vehicle.update({
        where: { id: vehicleId },
        data: {
          currentLat: lat,
          currentLng: lng,
          lastUpdate: new Date(),
        }
      });
    }

    return NextResponse.json(capacity);

  } catch (error) {
    console.error('Capacity POST error:', error);
    return NextResponse.json({ error: 'Failed to update capacity' }, { status: 500 });
  }
}

// PUT - Quick update (driver says "3 pallets free")
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { vehicleId, quickMessage } = body;

    if (!vehicleId || !quickMessage) {
      return NextResponse.json({ error: 'Vehicle ID and message required' }, { status: 400 });
    }

    // Use AI to parse the message
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Parse the driver's message about available capacity. Return JSON:
{
  "availablePallets": number,
  "availableWeight": number (in kg, estimate if not specified),
  "availableVolume": number (in m³, estimate if not specified),
  "headingTo": "city name if mentioned",
  "status": "available|partially_loaded|full"
}
Examples:
"3 Paletten frei" -> {"availablePallets": 3, "availableWeight": 1500, "availableVolume": 4.5, "status": "partially_loaded"}
"komplett leer, fahr nach München" -> {"availablePallets": 14, "availableWeight": 12000, "availableVolume": 40, "headingTo": "München", "status": "available"}
"voll" -> {"availablePallets": 0, "availableWeight": 0, "availableVolume": 0, "status": "full"}`
        },
        { role: 'user', content: quickMessage }
      ],
      temperature: 0.1,
    });

    let parsedData: any = {};
    try {
      const content = completion.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response');
    }

    // Update capacity
    const capacity = await db.vehicleCapacity.upsert({
      where: { vehicleId },
      update: {
        availablePallets: parsedData.availablePallets ?? 0,
        availableWeight: parsedData.availableWeight ?? 0,
        availableVolume: parsedData.availableVolume ?? 0,
        headingTo: parsedData.headingTo,
        status: parsedData.status || 'available',
      },
      create: {
        vehicleId,
        availablePallets: parsedData.availablePallets ?? 0,
        availableWeight: parsedData.availableWeight ?? 0,
        availableVolume: parsedData.availableVolume ?? 0,
        headingTo: parsedData.headingTo,
        status: parsedData.status || 'available',
      }
    });

    return NextResponse.json({
      capacity,
      parsedMessage: parsedData,
      originalMessage: quickMessage,
    });

  } catch (error) {
    console.error('Capacity PUT error:', error);
    return NextResponse.json({ error: 'Failed to parse and update capacity' }, { status: 500 });
  }
}
