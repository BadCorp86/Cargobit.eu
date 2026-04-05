import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Generate shipment number
function generateShipmentNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `CB-${year}-${random}`;
}

// Calculate platform fee based on membership tier
function calculatePlatformFee(price: number, membershipTier: string, role: string): number {
  // Shippers pay 4% brokerage fee on auctions
  if (role === 'SHIPPER') {
    return price * 0.04;
  }
  
  // Dispatchers pay based on membership
  switch (membershipTier) {
    case 'FREE':
      return price * 0.14; // 14% for free tier
    case 'STARTER':
      return price * 0.08;
    case 'PROFESSIONAL':
      return price * 0.05;
    case 'ENTERPRISE':
      return price * 0.035;
    default:
      return price * 0.08;
  }
}

// GET - List shipments or get single shipment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const role = searchParams.get('role'); // User's role for filtering
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (id) {
      // Get single shipment
      const shipment = await db.shipment.findUnique({
        where: { id },
        include: {
          sender: { select: { id: true, name: true, email: true, companyName: true, phone: true } },
          carrier: { select: { id: true, name: true, email: true, companyName: true, phone: true } },
          driver: { select: { id: true, name: true, email: true, phone: true } },
          eCMR: true,
        }
      });

      if (!shipment) {
        return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
      }

      return NextResponse.json(shipment);
    }

    // Build filter conditions
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    // Filter by user and role
    if (userId && role) {
      switch (role) {
        case 'DISPATCHER':
          where.carrierId = userId;
          break;
        case 'DRIVER':
          where.driverId = userId;
          break;
        case 'SHIPPER':
          where.senderId = userId;
          break;
        case 'ADMIN':
        case 'SUPPORT':
          // Can see all shipments
          break;
      }
    }

    // Get shipments with pagination
    const [shipments, total] = await Promise.all([
      db.shipment.findMany({
        where,
        include: {
          sender: { select: { id: true, name: true, companyName: true } },
          carrier: { select: { id: true, name: true, companyName: true } },
          driver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.shipment.count({ where })
    ]);

    return NextResponse.json({
      shipments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('Shipments GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
  }
}

// POST - Create new shipment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      senderId,
      senderName,
      senderAddress,
      senderContact,
      receiverName,
      receiverAddress,
      receiverContact,
      carrierId,
      carrierName,
      driverId,
      driverName,
      vehicleId,
      vehiclePlate,
      pickupPlace,
      pickupDate,
      pickupTime,
      deliveryPlace,
      deliveryDate,
      deliveryTime,
      goodsDescription,
      weight,
      volume,
      packages,
      specialInstructions,
      price,
      currency,
      shipmentType,
    } = body;

    // Validate required fields
    if (!senderId || !senderName || !receiverName || !pickupPlace || !deliveryPlace) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get sender to calculate fees
    const sender = await db.user.findUnique({ where: { id: senderId } });
    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    const shipmentNumber = generateShipmentNumber();
    const platformFee = calculatePlatformFee(price || 0, sender.membershipTier, sender.role);
    const carrierNetPrice = price ? price - platformFee : null;

    // Create shipment
    const shipment = await db.shipment.create({
      data: {
        shipmentNumber,
        senderId,
        senderName,
        senderAddress: senderAddress || '',
        senderContact,
        receiverName,
        receiverAddress: receiverAddress || '',
        receiverContact,
        carrierId,
        carrierName,
        driverId,
        driverName,
        vehicleId,
        vehiclePlate,
        pickupPlace,
        pickupDate: new Date(pickupDate),
        pickupTime,
        deliveryPlace,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        deliveryTime,
        goodsDescription: goodsDescription || '',
        weight: weight || 0,
        volume,
        packages: packages || 1,
        specialInstructions,
        price: price || 0,
        currency: currency || 'EUR',
        platformFee,
        carrierNetPrice,
        shipmentType: shipmentType || 'direct',
        status: carrierId ? 'assigned' : 'pending',
      },
      include: {
        sender: { select: { id: true, name: true, companyName: true } },
        carrier: { select: { id: true, name: true, companyName: true } },
      }
    });

    return NextResponse.json(shipment, { status: 201 });

  } catch (error) {
    console.error('Shipments POST error:', error);
    return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 });
  }
}

// PUT - Update shipment
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Shipment ID is required' }, { status: 400 });
    }

    const shipment = await db.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    let data: any = {};

    // Handle specific actions
    if (action) {
      switch (action) {
        case 'assignCarrier':
          if (!updateData.carrierId) {
            return NextResponse.json({ error: 'Carrier ID required' }, { status: 400 });
          }
          data = {
            carrierId: updateData.carrierId,
            carrierName: updateData.carrierName,
            status: 'assigned',
          };
          break;

        case 'assignDriver':
          if (!updateData.driverId) {
            return NextResponse.json({ error: 'Driver ID required' }, { status: 400 });
          }
          data = {
            driverId: updateData.driverId,
            driverName: updateData.driverName,
            vehicleId: updateData.vehicleId,
            vehiclePlate: updateData.vehiclePlate,
          };
          break;

        case 'startTransport':
          data = { status: 'in_transit' };
          break;

        case 'updateLocation':
          if (typeof updateData.lat !== 'number' || typeof updateData.lng !== 'number') {
            return NextResponse.json({ error: 'Lat/lng required' }, { status: 400 });
          }
          data = {
            currentLat: updateData.lat,
            currentLng: updateData.lng,
            lastTrackingUpdate: new Date(),
          };
          break;

        case 'confirmDelivery':
          data = {
            status: 'delivered',
            deliveredAt: new Date(),
            deliverySignature: updateData.signature,
            deliveryGpsLat: updateData.gpsLat,
            deliveryGpsLng: updateData.gpsLng,
            deliveryPhoto: updateData.photo,
          };
          break;

        case 'cancel':
          data = { status: 'cancelled' };
          break;

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    } else {
      // General update
      const allowedFields = [
        'senderName', 'senderAddress', 'senderContact',
        'receiverName', 'receiverAddress', 'receiverContact',
        'pickupPlace', 'deliveryPlace', 'goodsDescription',
        'weight', 'volume', 'packages', 'specialInstructions',
        'price', 'platformFee'
      ];
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          data[field] = updateData[field];
        }
      }

      // Handle dates
      if (updateData.pickupDate) {
        data.pickupDate = new Date(updateData.pickupDate);
      }
      if (updateData.deliveryDate) {
        data.deliveryDate = new Date(updateData.deliveryDate);
      }
    }

    const updatedShipment = await db.shipment.update({
      where: { id },
      data,
      include: {
        sender: { select: { id: true, name: true, companyName: true } },
        carrier: { select: { id: true, name: true, companyName: true } },
        driver: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json(updatedShipment);

  } catch (error) {
    console.error('Shipments PUT error:', error);
    return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 });
  }
}

// DELETE - Cancel shipment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Shipment ID is required' }, { status: 400 });
    }

    const shipment = await db.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    // Can only cancel pending or assigned shipments
    if (!['pending', 'assigned'].includes(shipment.status)) {
      return NextResponse.json({ error: 'Can only cancel pending or assigned shipments' }, { status: 400 });
    }

    await db.shipment.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    return NextResponse.json({ success: true, message: 'Shipment cancelled' });

  } catch (error) {
    console.error('Shipments DELETE error:', error);
    return NextResponse.json({ error: 'Failed to cancel shipment' }, { status: 500 });
  }
}
