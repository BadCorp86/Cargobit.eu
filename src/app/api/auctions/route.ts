import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, requireRole, AuthUser } from '@/lib/auth-middleware';
import {
  createAuctionSchema,
  updateAuctionSchema,
  createBidSchema,
  auctionQuerySchema,
} from '@/lib/validations';

// Generate auction number
function generateAuctionNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `AUC-${year}-${random}`;
}

// Calculate distance between two coordinates (Haversine formula)
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

// GET - List auctions or get single auction
export async function GET(request: NextRequest) {
  return withAuth(async (req: NextRequest, user: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const params = Object.fromEntries(searchParams.entries());

      // Validate query parameters
      const queryResult = auctionQuerySchema.safeParse({
        ...params,
        page: params.page ? parseInt(params.page) : 1,
        limit: params.limit ? parseInt(params.limit) : 20,
        minPrice: params.minPrice ? parseFloat(params.minPrice) : undefined,
        maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
      });

      if (!queryResult.success) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: queryResult.error.flatten() },
          { status: 400 }
        );
      }

      const { id, shipmentId, creatorId, status, visibility, minPrice, maxPrice, page, limit, sortBy, sortOrder } = queryResult.data;
      const skip = (page - 1) * limit;

      // Get single auction
      if (id) {
        const auction = await db.auction.findUnique({
          where: { id },
          include: {
            shipment: {
              include: {
                sender: { select: { id: true, name: true, companyName: true } },
                carrier: { select: { id: true, name: true, companyName: true } },
              },
            },
            bids: {
              where: { status: { in: ['active', 'winning'] } },
              orderBy: { amount: 'desc' },
              take: 10,
            },
          },
        });

        if (!auction) {
          return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
        }

        // Check visibility permissions
        if (auction.visibility === 'private' && auction.creatorId !== user.id && user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Hide bidder info for non-creators (except admins)
        const showBidderDetails = auction.creatorId === user.id || user.role === 'ADMIN' || user.role === 'SUPPORT';

        return NextResponse.json({
          ...auction,
          bids: showBidderDetails ? auction.bids : auction.bids.map(b => ({
            id: b.id,
            amount: b.amount,
            createdAt: b.createdAt,
            companyName: b.companyName ? `${b.companyName.substring(0, 3)}***` : null,
            bidderName: `${b.bidderName.substring(0, 2)}***`,
          })),
        });
      }

      // Build filter conditions
      const where: any = {};

      // Filter by status
      if (status) {
        where.status = status;
      } else {
        // By default, show active and pending auctions
        where.status = { in: ['active', 'pending'] };
      }

      // Filter by visibility (non-admins can't see private auctions)
      if (user.role !== 'ADMIN' && user.role !== 'SUPPORT') {
        if (visibility) {
          where.visibility = visibility;
        } else {
          where.visibility = { in: ['public', 'invited'] };
        }
      } else if (visibility) {
        where.visibility = visibility;
      }

      // Filter by shipment
      if (shipmentId) {
        where.shipmentId = shipmentId;
      }

      // Filter by creator
      if (creatorId) {
        where.creatorId = creatorId;
      }

      // Filter by price range
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.startingPrice = {};
        if (minPrice !== undefined) where.startingPrice.gte = minPrice;
        if (maxPrice !== undefined) where.startingPrice.lte = maxPrice;
      }

      // Count total
      const total = await db.auction.count({ where });

      // Get auctions with pagination
      const auctions = await db.auction.findMany({
        where,
        include: {
          shipment: {
            select: {
              id: true,
              shipmentNumber: true,
              pickupPlace: true,
              deliveryPlace: true,
              pickupDate: true,
              weight: true,
              volume: true,
              goodsDescription: true,
            },
          },
          bids: {
            where: { status: 'active' },
            orderBy: { amount: 'desc' },
            take: 1,
            select: { amount: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      });

      return NextResponse.json({
        auctions: auctions.map(a => ({
          ...a,
          currentHighestBid: a.bids[0]?.amount || a.startingPrice,
          bids: undefined, // Don't expose bids in list view
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });

    } catch (error) {
      console.error('Auctions GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch auctions' },
        { status: 500 }
      );
    }
  })(request);
}

// POST - Create new auction (Shipper only)
export async function POST(request: NextRequest) {
  return requireRole('SHIPPER')(async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await request.json();

      // Validate input
      const result = createAuctionSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: result.error.flatten() },
          { status: 400 }
        );
      }

      const data = result.data;

      // Verify shipment exists and belongs to user
      const shipment = await db.shipment.findUnique({
        where: { id: data.shipmentId },
        include: { sender: true },
      });

      if (!shipment) {
        return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
      }

      if (shipment.senderId !== user.id) {
        return NextResponse.json({ error: 'You can only create auctions for your own shipments' }, { status: 403 });
      }

      // Check if shipment already has an auction
      const existingAuction = await db.auction.findUnique({
        where: { shipmentId: data.shipmentId },
      });

      if (existingAuction) {
        return NextResponse.json({ error: 'This shipment already has an auction' }, { status: 400 });
      }

      // Calculate end time
      const startsAt = new Date(data.startsAt);
      const endsAt = new Date(startsAt.getTime() + data.durationHours * 60 * 60 * 1000);

      // Create auction
      const auction = await db.auction.create({
        data: {
          auctionNumber: generateAuctionNumber(),
          shipmentId: data.shipmentId,
          creatorId: user.id,
          creatorName: user.name || user.companyName || 'Unknown',
          title: data.title,
          description: data.description,
          startingPrice: data.startingPrice,
          currentHighestBid: 0,
          buyNowPrice: data.buyNowPrice,
          reservePrice: data.reservePrice,
          totalBids: 0,
          startsAt,
          endsAt,
          durationHours: data.durationHours,
          status: 'active', // Auto-activate
          visibility: data.visibility,
        },
        include: {
          shipment: {
            select: {
              shipmentNumber: true,
              pickupPlace: true,
              deliveryPlace: true,
              weight: true,
              volume: true,
            },
          },
        },
      });

      // Update shipment type
      await db.shipment.update({
        where: { id: data.shipmentId },
        data: { shipmentType: 'auction' },
      });

      return NextResponse.json(auction, { status: 201 });

    } catch (error) {
      console.error('Auction POST error:', error);
      return NextResponse.json(
        { error: 'Failed to create auction' },
        { status: 500 }
      );
    }
  })(request);
}

// PUT - Update auction, place bid, or award auction
export async function PUT(request: NextRequest) {
  return withAuth(async (req: NextRequest, user: AuthUser) => {
    try {
      const body = await request.json();

      // Check if this is a bid
      if (body.auctionId && body.amount && !body.action) {
        // This is a bid - only DISPATCHERS can bid
        if (user.role !== 'DISPATCHER' && user.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Only dispatchers can place bids' },
            { status: 403 }
          );
        }

        const result = createBidSchema.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            { error: 'Validation failed', details: result.error.flatten() },
            { status: 400 }
          );
        }

        const { auctionId, amount, message } = result.data;

        // Get auction
        const auction = await db.auction.findUnique({
          where: { id: auctionId },
          include: {
            bids: {
              where: { status: { in: ['active', 'winning'] } },
              orderBy: { amount: 'desc' },
              take: 1,
            },
          },
        });

        if (!auction) {
          return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
        }

        if (auction.status !== 'active') {
          return NextResponse.json({ error: 'Auction is not active' }, { status: 400 });
        }

        // Check if auction has ended
        if (new Date() > auction.endsAt) {
          return NextResponse.json({ error: 'Auction has ended' }, { status: 400 });
        }

        // Check if auction has started
        if (new Date() < auction.startsAt) {
          return NextResponse.json({ error: 'Auction has not started yet' }, { status: 400 });
        }

        // Check minimum bid
        const currentHighestBid = auction.bids[0]?.amount || auction.startingPrice;
        const minIncrement = Math.max(1, currentHighestBid * 0.01); // 1% or 1 EUR minimum

        if (amount <= currentHighestBid) {
          return NextResponse.json({
            error: `Bid must be higher than current highest bid (${currentHighestBid} EUR)`,
          }, { status: 400 });
        }

        if (amount < currentHighestBid + minIncrement) {
          return NextResponse.json({
            error: `Minimum bid increment is ${minIncrement.toFixed(2)} EUR`,
          }, { status: 400 });
        }

        // Check buy now price
        if (auction.buyNowPrice && amount >= auction.buyNowPrice) {
          // Award auction immediately
          const updatedAuction = await db.auction.update({
            where: { id: auctionId },
            data: {
              status: 'awarded',
              winnerId: user.id,
              winnerName: user.name || user.companyName || 'Unknown',
              winningBid: auction.buyNowPrice,
              currentHighestBid: auction.buyNowPrice,
              totalBids: { increment: 1 },
            },
          });

          // Create winning bid
          await db.auctionBid.create({
            data: {
              auctionId,
              bidderId: user.id,
              bidderName: user.name || 'Unknown',
              companyName: user.companyName,
              amount: auction.buyNowPrice,
              message,
              status: 'winning',
            },
          });

          // Update shipment
          await db.shipment.update({
            where: { id: auction.shipmentId },
            data: {
              carrierId: user.id,
              carrierName: user.name || user.companyName,
              price: auction.buyNowPrice,
              status: 'assigned',
            },
          });

          // Mark other bids as outbid
          await db.auctionBid.updateMany({
            where: { auctionId, status: 'active' },
            data: { status: 'outbid' },
          });

          return NextResponse.json({
            success: true,
            message: 'Congratulations! You won the auction with Buy Now price!',
            auction: updatedAuction,
          });
        }

        // Regular bid
        // Mark previous highest bid as outbid
        if (auction.bids[0]) {
          await db.auctionBid.update({
            where: { id: auction.bids[0].id },
            data: { status: 'outbid' },
          });
        }

        // Create new bid
        const bid = await db.auctionBid.create({
          data: {
            auctionId,
            bidderId: user.id,
            bidderName: user.name || 'Unknown',
            companyName: user.companyName,
            amount,
            message,
            status: 'active',
          },
        });

        // Update auction
        const updatedAuction = await db.auction.update({
          where: { id: auctionId },
          data: {
            currentHighestBid: amount,
            totalBids: { increment: 1 },
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Bid placed successfully',
          bid,
          auction: updatedAuction,
        });
      }

      // Regular update
      const result = updateAuctionSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: result.error.flatten() },
          { status: 400 }
        );
      }

      const { id, action, ...updateData } = result.data;

      // Get auction
      const auction = await db.auction.findUnique({ where: { id } });
      if (!auction) {
        return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
      }

      // Handle actions
      if (action === 'cancel') {
        // Only creator or admin can cancel
        if (auction.creatorId !== user.id && user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Not authorized to cancel this auction' }, { status: 403 });
        }

        if (auction.status !== 'active' && auction.status !== 'pending') {
          return NextResponse.json({ error: 'Can only cancel active or pending auctions' }, { status: 400 });
        }

        const cancelled = await db.auction.update({
          where: { id },
          data: { status: 'cancelled' },
        });

        return NextResponse.json({ success: true, auction: cancelled });
      }

      if (action === 'extend') {
        // Only creator or admin can extend
        if (auction.creatorId !== user.id && user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Not authorized to extend this auction' }, { status: 403 });
        }

        const extendHours = updateData.extendHours || 1;
        const newEndsAt = new Date(auction.endsAt.getTime() + extendHours * 60 * 60 * 1000);

        const extended = await db.auction.update({
          where: { id },
          data: { endsAt: newEndsAt },
        });

        return NextResponse.json({ success: true, auction: extended });
      }

      // General update (admin only)
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      const updated = await db.auction.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json(updated);

    } catch (error) {
      console.error('Auction PUT error:', error);
      return NextResponse.json(
        { error: 'Failed to update auction' },
        { status: 500 }
      );
    }
  })(request);
}

// DELETE - Cancel auction
export async function DELETE(request: NextRequest) {
  return withAuth(async (req: NextRequest, user: AuthUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ error: 'Auction ID is required' }, { status: 400 });
      }

      const auction = await db.auction.findUnique({ where: { id } });
      if (!auction) {
        return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
      }

      // Only creator or admin can delete
      if (auction.creatorId !== user.id && user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      // Can only cancel pending or active auctions
      if (!['pending', 'active'].includes(auction.status)) {
        return NextResponse.json({ error: 'Can only cancel pending or active auctions' }, { status: 400 });
      }

      await db.auction.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      return NextResponse.json({ success: true, message: 'Auction cancelled' });

    } catch (error) {
      console.error('Auction DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to cancel auction' },
        { status: 500 }
      );
    }
  })(request);
}
