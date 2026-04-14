import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CreateOfferRequest, OfferResponse, ApiErrorResponse } from '@/types/transport';

// POST /api/transports/[id]/offers - Create an offer for a transport
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transportId } = await params;
    const body: CreateOfferRequest = await request.json();

    // Validate
    if (!body.driverId || !body.price) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required fields: driverId, price',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    // Check if transport exists and is available
    const transport = await db.transport.findUnique({
      where: { id: transportId }
    });

    if (!transport) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'Transport not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    if (transport.status !== 'PENDING' && transport.status !== 'PUBLISHED') {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Transport is not accepting offers',
        code: 'TRANSPORT_NOT_AVAILABLE'
      }, { status: 400 });
    }

    // Check if driver already made an offer
    const existingOffer = await db.offer.findFirst({
      where: {
        transportId,
        driverId: body.driverId,
        status: 'PENDING'
      }
    });

    if (existingOffer) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'You already have a pending offer for this transport',
        code: 'OFFER_EXISTS'
      }, { status: 400 });
    }

    // Create offer
    const offer = await db.offer.create({
      data: {
        transportId,
        driverId: body.driverId,
        price: body.price,
        currency: body.currency || 'EUR',
        message: body.message,
        estimatedDuration: body.estimatedDuration,
        validUntil: body.validUntil ? new Date(body.validUntil) : null
      }
    });

    // Update transport status if this is the first offer
    const offerCount = await db.offer.count({
      where: { transportId }
    });

    if (offerCount === 1) {
      await db.transport.update({
        where: { id: transportId },
        data: { status: 'OFFERS_RECEIVED' }
      });
    }

    return NextResponse.json<OfferResponse>({
      offerId: offer.id,
      status: 'pending',
      transportId
    }, { status: 201 });

  } catch (error) {
    console.error('Create offer error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to create offer',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// GET /api/transports/[id]/offers - Get all offers for a transport
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transportId } = await params;

    const offers = await db.offer.findMany({
      where: { transportId },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            rating: true,
            totalTransports: true,
            completedTransports: true,
            spokenLanguages: true,
            adrCertified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: offers });

  } catch (error) {
    console.error('Get offers error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to fetch offers',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
