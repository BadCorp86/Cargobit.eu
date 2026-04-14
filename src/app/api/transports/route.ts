import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CreateTransportRequest, CreateTransportResponse, ApiErrorResponse } from '@/types/transport';

// POST /api/transports - Create a new transport
export async function POST(request: NextRequest) {
  try {
    const body: CreateTransportRequest = await request.json();
    
    // Validate required fields
    if (!body.shipperId || !body.pickup || !body.delivery || !body.transportType) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required fields: shipperId, pickup, delivery, transportType',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    // Check if international transport
    const isInternational = body.pickup.country !== body.delivery.country;
    
    // Determine transit countries for international transport
    let transitCountries: string[] = [];
    if (isInternational && body.requirements?.international?.transitCountries) {
      transitCountries = body.requirements.international.transitCountries;
    }

    // Create transport
    const transport = await db.transport.create({
      data: {
        shipperId: body.shipperId,
        transportType: mapTransportType(body.transportType),
        status: 'PENDING',
        
        // Pickup
        pickupAddress: body.pickup.address,
        pickupCity: body.pickup.city || '',
        pickupPostalCode: body.pickup.postalCode || '',
        pickupCountry: body.pickup.country,
        pickupDate: new Date(body.pickup.date),
        pickupTimeFrom: body.pickup.timeFrom,
        pickupTimeTo: body.pickup.timeTo,
        pickupContact: body.pickup.contact,
        pickupPhone: body.pickup.phone,
        pickupLatitude: body.pickup.latitude,
        pickupLongitude: body.pickup.longitude,
        
        // Delivery
        deliveryAddress: body.delivery.address,
        deliveryCity: body.delivery.city || '',
        deliveryPostalCode: body.delivery.postalCode || '',
        deliveryCountry: body.delivery.country,
        deliveryDate: body.delivery.date ? new Date(body.delivery.date) : null,
        deliveryTimeFrom: body.delivery.timeFrom,
        deliveryTimeTo: body.delivery.timeTo,
        deliveryContact: body.delivery.contact,
        deliveryPhone: body.delivery.phone,
        deliveryLatitude: body.delivery.latitude,
        deliveryLongitude: body.delivery.longitude,
        
        // Cargo Details
        cargoDetails: JSON.stringify(body.details),
        description: body.description,
        
        // Pricing
        shipperBudget: body.pricing.proposedPrice,
        currency: body.pricing.currency || 'EUR',
        
        // Requirements
        vehicleRequirements: body.requirements?.vehicle 
          ? JSON.stringify(body.requirements.vehicle) 
          : null,
        driverRequirements: body.requirements?.driver 
          ? JSON.stringify(body.requirements.driver) 
          : null,
        internationalRequirements: body.requirements?.international 
          ? JSON.stringify(body.requirements.international) 
          : null,
        
        // International
        isInternational,
        transitCountries: transitCountries.length > 0 
          ? JSON.stringify(transitCountries) 
          : null,
        customsRequired: body.requirements?.international?.customsRequired || false,
      }
    });

    // Start matching process (async)
    startMatching(transport.id).catch(console.error);

    return NextResponse.json<CreateTransportResponse>({
      transportId: transport.id,
      status: 'created',
      matchingStarted: true
    }, { status: 201 });

  } catch (error) {
    console.error('Create transport error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to create transport',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// GET /api/transports - List transports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const shipperId = searchParams.get('shipperId');
    const driverId = searchParams.get('driverId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (shipperId) where.shipperId = shipperId;
    if (driverId) where.driverId = driverId;

    const [transports, total] = await Promise.all([
      db.transport.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          shipper: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              rating: true
            }
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              rating: true
            }
          },
          offers: {
            where: { status: 'PENDING' },
            select: {
              id: true,
              price: true,
              currency: true,
              createdAt: true
            }
          }
        }
      }),
      db.transport.count({ where })
    ]);

    return NextResponse.json({
      data: transports,
      total,
      page,
      pageSize,
      hasMore: total > page * pageSize
    });

  } catch (error) {
    console.error('Get transports error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to fetch transports',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// Helper: Map transport type to Prisma enum
function mapTransportType(type: string): string {
  const mapping: Record<string, string> = {
    'pallet': 'PALLET',
    'bulk': 'BULK',
    'liquid': 'LIQUID',
    'oversize': 'OVERSIZE',
    'lowloader': 'LOWLOADER',
    'car_transport': 'CAR_TRANSPORT',
    'cooling': 'COOLING',
    'hazmat': 'HAZMAT',
    'container': 'CONTAINER'
  };
  return mapping[type] || 'PALLET';
}

// Helper: Start matching process (would be a background job in production)
async function startMatching(transportId: string) {
  // This would typically be a background job or message queue
  // For now, we'll just log it
  console.log(`[Matching] Starting matching for transport: ${transportId}`);
  
  // The actual matching logic would be in the matching service
  // See: src/services/matching.service.ts
}
