/**
 * CargoBit Bids API Routes
 * POST   /api/bids          - Create new bid
 * GET    /api/bids          - List user's bids
 */

import { NextRequest, NextResponse } from 'next/server';
import { bidsService, type CreateBidInput } from '@/services/bids.service';

// ============================================
// GET /api/bids - List user's bids
// ============================================

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Get bids where user is the transporter
    const { prisma } = await import('@/lib/db');
    
    const where: any = { driverId: userId };
    if (status) {
      where.status = status.toUpperCase();
    }
    
    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: {
          transport: {
            include: {
              pickupAddress: true,
              deliveryAddress: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.offer.count({ where }),
    ]);
    
    const bids = offers.map(offer => ({
      id: offer.id,
      jobId: offer.transportId,
      pickupCity: offer.transport.pickupAddress.city,
      deliveryCity: offer.transport.deliveryAddress.city,
      price: offer.price,
      currency: offer.currency,
      status: offer.status.toLowerCase(),
      createdAt: offer.createdAt,
      validUntil: offer.validUntil,
    }));
    
    return NextResponse.json({
      bids,
      total,
      limit,
      offset,
    });
    
  } catch (error: any) {
    console.error('[API] GET /bids error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bids' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/bids - Create bid
// ============================================

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['jobId', 'price'];
    
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Get transporter's vehicle
    const { prisma } = await import('@/lib/db');
    
    const driver = await prisma.driver.findFirst({
      where: { userId },
      include: {
        driverVehicles: {
          where: { isPrimary: true },
          include: { vehicle: true },
        },
      },
    });
    
    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 400 }
      );
    }
    
    const vehicleId = driver.driverVehicles[0]?.vehicleId 
      || driver.driverVehicles[0]?.vehicle.id;
    
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'No vehicle assigned' },
        { status: 400 }
      );
    }
    
    const input: CreateBidInput = {
      jobId: body.jobId,
      transporterId: driver.id,
      vehicleId,
      price: parseFloat(body.price),
      currency: body.currency || 'EUR',
      message: body.message,
      estimatedDuration: body.estimatedDuration,
      validUntilHours: body.validUntilHours,
    };
    
    const result = await bidsService.createBid(input);
    
    return NextResponse.json({
      success: true,
      bidId: result.bidId,
      status: result.status,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[API] POST /bids error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create bid' },
      { status: 500 }
    );
  }
}
