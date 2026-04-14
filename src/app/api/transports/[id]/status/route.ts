import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UpdateTransportStatusRequest, UpdateTransportStatusResponse, ApiErrorResponse, TransportStatusUpdate } from '@/types/transport';

// POST /api/transports/[id]/status - Update transport status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transportId } = await params;
    const body: UpdateTransportStatusRequest = await request.json();

    // Validate
    if (!body.status) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required field: status',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    // Get transport
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

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      'CONFIRMED': ['in_transit'],
      'in_transit': ['pickup_done', 'delivered'],
      'pickup_done': ['on_route', 'delivered'],
      'on_route': ['delivery_done', 'delivered'],
      'delivery_done': ['completed'],
      'delivered': ['completed']
    };

    const currentStatus = transport.status.toLowerCase();
    const newStatus = body.status;

    // Map status
    const statusMapping: Record<string, string> = {
      'accepted': 'CONFIRMED',
      'on_route': 'IN_TRANSIT',
      'pickup_done': 'IN_TRANSIT',
      'delivery_done': 'DELIVERED',
      'completed': 'COMPLETED'
    };

    // Update transport based on status
    const updateData: Record<string, unknown> = {};
    
    switch (newStatus) {
      case 'accepted':
        updateData.status = 'CONFIRMED';
        updateData.acceptedAt = new Date();
        break;
      case 'on_route':
        updateData.status = 'IN_TRANSIT';
        updateData.pickedUpAt = new Date();
        break;
      case 'pickup_done':
        updateData.status = 'IN_TRANSIT';
        updateData.pickedUpAt = new Date();
        break;
      case 'delivery_done':
      case 'delivered':
        updateData.status = 'DELIVERED';
        updateData.deliveredAt = new Date();
        break;
      case 'completed':
        updateData.status = 'COMPLETED';
        updateData.completedAt = new Date();
        break;
    }

    // Update current location if provided
    if (body.location) {
      updateData.currentLocation = JSON.stringify({
        latitude: body.location.latitude,
        longitude: body.location.longitude,
        timestamp: new Date().toISOString()
      });
    }

    // Update transport
    await db.transport.update({
      where: { id: transportId },
      data: updateData
    });

    // Create tracking event
    await db.trackingEvent.create({
      data: {
        transportId,
        status: newStatus,
        location: body.location ? JSON.stringify(body.location) : null,
        note: body.note,
        photoUrl: body.photoUrl
      }
    });

    // If completed, process payment
    if (newStatus === 'completed') {
      await processCompletion(transportId);
    }

    return NextResponse.json<UpdateTransportStatusResponse>({
      transportId,
      status: newStatus as TransportStatusUpdate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update transport status error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to update transport status',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// Helper: Process transport completion (release escrow)
async function processCompletion(transportId: string) {
  const transport = await db.transport.findUnique({
    where: { id: transportId },
    include: {
      driver: { include: { wallet: true } },
      shipper: { include: { wallet: true } }
    }
  });

  if (!transport || !transport.agreedPrice || !transport.driver?.wallet) return;

  // Calculate amounts
  const price = transport.agreedPrice;
  const platformCommission = price * 0.08; // 8% commission (would vary by subscription)
  const driverPayout = price - platformCommission;

  // Release escrow and pay driver
  await db.$transaction([
    // Update shipper's wallet (remove from pending)
    db.wallet.update({
      where: { userId: transport.shipperId },
      data: {
        pendingBalance: { decrement: price }
      }
    }),
    // Update driver's wallet
    db.wallet.update({
      where: { userId: transport.driverId! },
      data: {
        availableBalance: { increment: driverPayout }
      }
    }),
    // Create payout transaction
    db.transaction.create({
      data: {
        walletId: transport.driver.wallet.id,
        type: 'PAYMENT_IN',
        status: 'COMPLETED',
        amount: driverPayout,
        fee: platformCommission,
        netAmount: driverPayout,
        description: `Payment for transport ${transportId}`,
        transportId,
        processedAt: new Date()
      }
    })
  ]);

  // Update user stats
  await db.user.update({
    where: { id: transport.driverId! },
    data: {
      totalTransports: { increment: 1 },
      completedTransports: { increment: 1 }
    }
  });
}
