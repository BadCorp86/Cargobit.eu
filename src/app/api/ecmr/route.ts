import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// Generate a pseudo-blockchain hash (in production, this would be a real blockchain transaction)
function generateBlockchainHash(data: string): string {
  return '0x' + crypto.createHash('sha256').update(data + Date.now()).digest('hex');
}

// Generate eCMR number
function generateECMRNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `eCMR-${year}-${random}`;
}

// GET - List eCMRs or get single eCMR
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    if (id) {
      // Get single eCMR
      const ecmr = await db.eCMR.findUnique({
        where: { id },
        include: {
          shipment: {
            include: {
              sender: { select: { id: true, name: true, email: true, companyName: true } },
              carrier: { select: { id: true, name: true, email: true, companyName: true } },
              driver: { select: { id: true, name: true, email: true } },
            }
          }
        }
      });

      if (!ecmr) {
        return NextResponse.json({ error: 'eCMR not found' }, { status: 404 });
      }

      return NextResponse.json(ecmr);
    }

    // List eCMRs with filters
    const where: any = {};
    
    if (userId) {
      where.OR = [
        { shipment: { senderId: userId } },
        { shipment: { carrierId: userId } },
        { shipment: { driverId: userId } },
      ];
    }
    
    if (status) {
      where.status = status;
    }

    const ecmrs = await db.eCMR.findMany({
      where,
      include: {
        shipment: {
          select: {
            shipmentNumber: true,
            status: true,
            sender: { select: { name: true, companyName: true } },
            carrier: { select: { name: true, companyName: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(ecmrs);

  } catch (error) {
    console.error('eCMR GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch eCMRs' }, { status: 500 });
  }
}

// POST - Create new eCMR
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shipmentId,
      senderName,
      senderAddress,
      senderContact,
      receiverName,
      receiverAddress,
      receiverContact,
      carrierName,
      carrierAddress,
      carrierContact,
      vehiclePlate,
      driverName,
      pickupPlace,
      pickupDate,
      deliveryPlace,
      deliveryDate,
      goodsDescription,
      weight,
      volume,
      packages,
      specialInstructions,
    } = body;

    // Validate required fields
    if (!shipmentId || !senderName || !receiverName || !carrierName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if shipment exists and doesn't already have an eCMR
    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
      include: { eCMR: true }
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    if (shipment.eCMR) {
      return NextResponse.json({ error: 'Shipment already has an eCMR' }, { status: 400 });
    }

    // Generate eCMR number and blockchain hash
    const ecmrNumber = generateECMRNumber();
    const dataToHash = JSON.stringify({
      ecmrNumber,
      shipmentId,
      senderName,
      receiverName,
      carrierName,
      timestamp: new Date().toISOString(),
    });
    const blockchainHash = generateBlockchainHash(dataToHash);

    // Create eCMR
    const ecmr = await db.eCMR.create({
      data: {
        ecmrNumber,
        shipmentId,
        senderName,
        senderAddress: senderAddress || '',
        senderContact,
        receiverName,
        receiverAddress: receiverAddress || '',
        receiverContact,
        carrierName,
        carrierAddress: carrierAddress || '',
        carrierContact,
        vehiclePlate: vehiclePlate || '',
        driverName: driverName || '',
        pickupPlace: pickupPlace || '',
        pickupDate: new Date(pickupDate),
        deliveryPlace: deliveryPlace || '',
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        goodsDescription: goodsDescription || '',
        weight: weight || 0,
        volume,
        packages: packages || 1,
        specialInstructions,
        status: 'draft',
        blockchainHash,
        blockchainNetwork: 'ethereum',
        blockchainTimestamp: new Date(),
      },
      include: {
        shipment: true,
      }
    });

    return NextResponse.json(ecmr, { status: 201 });

  } catch (error) {
    console.error('eCMR POST error:', error);
    return NextResponse.json({ error: 'Failed to create eCMR' }, { status: 500 });
  }
}

// PUT - Update eCMR (sign, change status)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, signature, gpsLat, gpsLng, signerType } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    const ecmr = await db.eCMR.findUnique({ where: { id } });
    if (!ecmr) {
      return NextResponse.json({ error: 'eCMR not found' }, { status: 404 });
    }

    let updateData: any = {};

    switch (action) {
      case 'sign':
        // Handle digital signature
        if (!signature || !signerType) {
          return NextResponse.json({ error: 'Missing signature or signerType' }, { status: 400 });
        }

        const timestamp = new Date();
        
        switch (signerType) {
          case 'sender':
            updateData = {
              senderSignature: signature,
              senderSignedAt: timestamp,
              senderGpsLat: gpsLat,
              senderGpsLng: gpsLng,
            };
            break;
          case 'carrier':
            updateData = {
              carrierSignature: signature,
              carrierSignedAt: timestamp,
              carrierGpsLat: gpsLat,
              carrierGpsLng: gpsLng,
            };
            break;
          case 'receiver':
            updateData = {
              receiverSignature: signature,
              receiverSignedAt: timestamp,
              receiverGpsLat: gpsLat,
              receiverGpsLng: gpsLng,
              status: 'completed',
            };
            break;
          default:
            return NextResponse.json({ error: 'Invalid signerType' }, { status: 400 });
        }
        break;

      case 'activate':
        updateData = { status: 'active' };
        break;

      case 'archive':
        updateData = { status: 'archived' };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedEcmr = await db.eCMR.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedEcmr);

  } catch (error) {
    console.error('eCMR PUT error:', error);
    return NextResponse.json({ error: 'Failed to update eCMR' }, { status: 500 });
  }
}

// DELETE - Delete eCMR (only draft status)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const ecmr = await db.eCMR.findUnique({ where: { id } });
    if (!ecmr) {
      return NextResponse.json({ error: 'eCMR not found' }, { status: 404 });
    }

    if (ecmr.status !== 'draft') {
      return NextResponse.json({ error: 'Can only delete draft eCMRs' }, { status: 400 });
    }

    await db.eCMR.delete({ where: { id } });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('eCMR DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete eCMR' }, { status: 500 });
  }
}
