/**
 * CargoBit Bids Service
 * Offer Management for Jobs
 * 
 * BID STATUS FLOW:
 * pending → accepted | rejected | withdrawn
 * 
 * Python equivalent for Redis broadcasting:
 * ```python
 * def notify_user(user_id, message):
 *     publish_event(
 *         f"user:{user_id}",
 *         {"userId": str(user_id), "message": message}
 *     )
 * ```
 */

import { prisma } from '@/lib/db';
import { broadcastNewBid, notifyUser, broadcastJobStatus } from './redis-publisher.service';

// ============================================
// TYPES
// ============================================

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface CreateBidInput {
  jobId: string;
  transporterId: string;
  vehicleId: string;
  price: number;
  currency?: string;
  message?: string;
  estimatedDuration?: number;  // minutes
  validUntilHours?: number;    // hours from now
}

export interface BidWithDetails {
  id: string;
  jobId: string;
  transporterId: string;
  transporterName?: string;
  transporterRating: number;
  vehicleId: string;
  vehicleType: string;
  price: number;
  currency: string;
  message?: string;
  estimatedDuration?: number;
  status: BidStatus;
  createdAt: Date;
  validUntil?: Date;
}

// ============================================
// CREATE BID
// ============================================

export async function createBid(input: CreateBidInput): Promise<{ bidId: string; status: string }> {
  console.log(`[Bids] Creating bid for job ${input.jobId} by transporter ${input.transporterId}`);
  
  // Verify job is open for bids
  const transport = await prisma.transport.findUnique({
    where: { id: input.jobId },
  });
  
  if (!transport) {
    throw new Error('Job not found');
  }
  
  if (!['CREATED', 'PUBLISHED', 'ASSIGNED'].includes(transport.status)) {
    throw new Error('Job is not open for bids');
  }
  
  // Check if transporter already bid
  const existingBid = await prisma.offer.findFirst({
    where: {
      transportId: input.jobId,
      driverId: input.transporterId,
      status: { in: ['PENDING', 'ACCEPTED'] },
    },
  });
  
  if (existingBid) {
    throw new Error('You already have an active bid for this job');
  }
  
  // Verify transporter has access to this job (was matched)
  const matchingCandidate = await prisma.matchingCandidate.findFirst({
    where: {
      matchingSession: { transportId: input.jobId },
      driverId: input.transporterId,
      status: 'PENDING',
    },
  });
  
  // If not in matching, they can still bid but with lower priority
  const isMatched = !!matchingCandidate;
  
  // Create bid
  const validUntil = input.validUntilHours
    ? new Date(Date.now() + input.validUntilHours * 60 * 60 * 1000)
    : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours
  
  const offer = await prisma.offer.create({
    data: {
      transportId: input.jobId,
      driverId: input.transporterId,
      vehicleId: input.vehicleId,
      price: input.price,
      currency: input.currency ?? 'EUR',
      message: input.message,
      estimatedDuration: input.estimatedDuration,
      status: 'PENDING',
      validUntil,
    },
  });
  
  // Update matching candidate status if exists
  if (matchingCandidate) {
    await prisma.matchingCandidate.update({
      where: { id: matchingCandidate.id },
      data: { status: 'NOTIFIED' }, // They've been notified (via bid)
    });
  }
  
  // Notify shipper
  await notifyShipperOfBid(input.jobId, offer.id, input.price);
  
  return {
    bidId: offer.id,
    status: 'pending',
  };
}

// ============================================
// GET BIDS FOR JOB
// ============================================

export async function getBidsForJob(
  jobId: string,
  userId: string
): Promise<BidWithDetails[]> {
  // Verify user is the shipper
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
  });
  
  if (!transport) {
    throw new Error('Job not found');
  }
  
  if (transport.shipperUserId !== userId) {
    // Check if user is the transporter with a bid
    const transporterBid = await prisma.offer.findFirst({
      where: { transportId: jobId, driverId: userId },
    });
    
    if (!transporterBid) {
      throw new Error('Not authorized');
    }
    
    // Return only their bid
    return [await mapBidToDetails(transporterBid)];
  }
  
  // Get all bids for shipper
  const offers = await prisma.offer.findMany({
    where: { transportId: jobId },
    orderBy: [
      { status: 'asc' }, // Pending first
      { createdAt: 'asc' },
    ],
    include: {
      driver: {
        include: {
          user: {
            include: {
              companyUsers: {
                include: { company: true },
              },
            },
          },
        },
      },
      vehicle: true,
    },
  });
  
  return offers.map(offer => ({
    id: offer.id,
    jobId: offer.transportId,
    transporterId: offer.driverId,
    transporterName: offer.driver.user.companyUsers[0]?.company.name 
      || `${offer.driver.user.firstName} ${offer.driver.user.lastName}`,
    transporterRating: offer.driver.ratingAvg,
    vehicleId: offer.vehicleId,
    vehicleType: offer.vehicle.type,
    price: offer.price,
    currency: offer.currency,
    message: offer.message ?? undefined,
    estimatedDuration: offer.estimatedDuration ?? undefined,
    status: mapBidStatus(offer.status),
    createdAt: offer.createdAt,
    validUntil: offer.validUntil ?? undefined,
  }));
}

// ============================================
// ACCEPT BID
// ============================================

export async function acceptBid(
  bidId: string,
  userId: string
): Promise<{ success: boolean; jobId: string; agreedPrice: number }> {
  console.log(`[Bids] Accepting bid ${bidId}`);
  
  // Get bid with transport details
  const offer = await prisma.offer.findUnique({
    where: { id: bidId },
    include: {
      transport: true,
      driver: true,
    },
  });
  
  if (!offer) {
    throw new Error('Bid not found');
  }
  
  // Verify user is the shipper
  if (offer.transport.shipperUserId !== userId) {
    throw new Error('Not authorized');
  }
  
  // Verify bid is still pending
  if (offer.status !== 'PENDING') {
    throw new Error(`Bid is already ${offer.status.toLowerCase()}`);
  }
  
  // Verify job is not already assigned
  if (offer.transport.status === 'IN_TRANSIT' || offer.transport.status === 'COMPLETED') {
    throw new Error('Job is already in progress or completed');
  }
  
  // Process booking (wallet transactions)
  const bookingResult = await processBooking(offer);
  
  if (!bookingResult.success) {
    throw new Error('Booking failed: ' + bookingResult.error);
  }
  
  // Update bid status
  await prisma.offer.update({
    where: { id: bidId },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });
  
  // Create assignment
  await prisma.assignment.create({
    data: {
      transportId: offer.transportId,
      driverId: offer.driverId,
      vehicleId: offer.vehicleId,
      assignedBy: userId,
    },
  });
  
  // Update transport
  await prisma.transport.update({
    where: { id: offer.transportId },
    data: {
      status: 'ASSIGNED',
      agreedPrice: offer.price,
      assignedAt: new Date(),
    },
  });
  
  // Reject other pending bids
  await prisma.offer.updateMany({
    where: {
      transportId: offer.transportId,
      status: 'PENDING',
      id: { not: bidId },
    },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectionReason: 'Another bid was accepted',
    },
  });
  
  // Notify transporter
  await notifyTransporterOfAcceptance(offer);
  
  return {
    success: true,
    jobId: offer.transportId,
    agreedPrice: offer.price,
  };
}

// ============================================
// REJECT BID
// ============================================

export async function rejectBid(
  bidId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean }> {
  const offer = await prisma.offer.findUnique({
    where: { id: bidId },
    include: { transport: true },
  });
  
  if (!offer) {
    throw new Error('Bid not found');
  }
  
  // Verify user is the shipper
  if (offer.transport.shipperUserId !== userId) {
    throw new Error('Not authorized');
  }
  
  if (offer.status !== 'PENDING') {
    throw new Error(`Bid is already ${offer.status.toLowerCase()}`);
  }
  
  await prisma.offer.update({
    where: { id: bidId },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });
  
  // Update matching candidate if exists
  await prisma.matchingCandidate.updateMany({
    where: {
      matchingSession: { transportId: offer.transportId },
      driverId: offer.driverId,
    },
    data: { status: 'REJECTED' },
  });
  
  return { success: true };
}

// ============================================
// WITHDRAW BID
// ============================================

export async function withdrawBid(
  bidId: string,
  userId: string
): Promise<{ success: boolean }> {
  const offer = await prisma.offer.findUnique({
    where: { id: bidId },
  });
  
  if (!offer) {
    throw new Error('Bid not found');
  }
  
  // Verify user is the transporter
  if (offer.driverId !== userId) {
    throw new Error('Not authorized');
  }
  
  if (offer.status !== 'PENDING') {
    throw new Error(`Bid is already ${offer.status.toLowerCase()}`);
  }
  
  await prisma.offer.update({
    where: { id: bidId },
    data: { status: 'WITHDRAWN' },
  });
  
  return { success: true };
}

// ============================================
// PROCESS BOOKING (Wallet Operations)
// ============================================

async function processBooking(offer: any): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = offer.transport;
    const amount = offer.price;
    
    // Get shipper's wallet
    const shipperWallet = await prisma.wallet.findFirst({
      where: { ownerUserId: transport.shipperUserId },
    });
    
    if (!shipperWallet) {
      return { success: false, error: 'Shipper wallet not found' };
    }
    
    // Check balance
    if (shipperWallet.balance < amount) {
      return { success: false, error: 'Insufficient balance. Please top up your wallet.' };
    }
    
    // Get transporter's wallet
    const transporterWallet = await prisma.wallet.findFirst({
      where: { ownerUserId: offer.driverId },
    });
    
    if (!transporterWallet) {
      // Create wallet for transporter
      await prisma.wallet.create({
        data: {
          ownerUserId: offer.driverId,
          balance: 0,
          currency: 'EUR',
          status: 'ACTIVE',
        },
      });
    }
    
    // Calculate platform fee (3.5% as per CargoBit specification)
    const platformFeePercent = 0.035;  // 3.5%
    const platformFee = amount * platformFeePercent;
    const transporterPayout = amount - platformFee;
    
    // Get platform wallet (for fees)
    const platformWallet = await prisma.wallet.findFirst({
      where: { ownerUserId: 'PLATFORM' },
    });
    
    // Run transaction
    await prisma.$transaction([
      // 1. Debit shipper
      prisma.wallet.update({
        where: { id: shipperWallet.id },
        data: { balance: { decrement: amount } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: shipperWallet.id,
          type: 'PAYMENT_OUT',
          amount: -amount,
          currency: 'EUR',
          relatedTransportId: transport.id,
          description: `Payment for job ${transport.id}`,
          processedAt: new Date(),
        },
      }),
      
      // 2. Credit platform fee
      ...(platformWallet ? [
        prisma.wallet.update({
          where: { id: platformWallet.id },
          data: { balance: { increment: platformFee } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: platformWallet.id,
            type: 'COMMISSION',
            amount: platformFee,
            currency: 'EUR',
            relatedTransportId: transport.id,
            description: `Platform fee for job ${transport.id}`,
            processedAt: new Date(),
          },
        }),
      ] : []),
      
      // 3. Credit transporter (pending until completion)
      prisma.wallet.update({
        where: { id: transporterWallet?.id || (await prisma.wallet.findFirst({ 
          where: { ownerUserId: offer.driverId } 
        }))!.id },
        data: { balance: { increment: transporterPayout } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: transporterWallet?.id || (await prisma.wallet.findFirst({ 
            where: { ownerUserId: offer.driverId } 
          }))!.id,
          type: 'PAYMENT_IN',
          amount: transporterPayout,
          currency: 'EUR',
          relatedTransportId: transport.id,
          description: `Pending payment for job ${transport.id} (pending until completion)`,
          processedAt: new Date(),
        },
      }),
      
      // 4. Record commission
      prisma.commission.create({
        data: {
          transportId: transport.id,
          plan: 'FREE',
          commissionPercent: platformFeePercent * 100,
          commissionAmount: platformFee,
          walletFeePercent: 0,
          walletFeeAmount: 0,
        },
      }),
    ]);
    
    console.log(`[Bids] Booking processed: ${amount} EUR (fee: ${platformFee}, payout: ${transporterPayout})`);
    
    return { success: true };
  } catch (error) {
    console.error('[Bids] Booking failed:', error);
    return { success: false, error: 'Transaction failed' };
  }
}

// ============================================
// HELPERS
// ============================================

function mapBidStatus(status: string): BidStatus {
  const map: Record<string, BidStatus> = {
    'PENDING': 'pending',
    'ACCEPTED': 'accepted',
    'REJECTED': 'rejected',
    'WITHDRAWN': 'withdrawn',
  };
  return map[status] ?? 'pending';
}

async function mapBidToDetails(offer: any): Promise<BidWithDetails> {
  const offerWithIncludes = await prisma.offer.findUnique({
    where: { id: offer.id },
    include: {
      driver: {
        include: {
          user: {
            include: {
              companyUsers: {
                include: { company: true },
              },
            },
          },
        },
      },
      vehicle: true,
    },
  });
  
  return {
    id: offer.id,
    jobId: offer.transportId,
    transporterId: offer.driverId,
    transporterName: offerWithIncludes?.driver.user.companyUsers[0]?.company.name
      || `${offerWithIncludes?.driver.user.firstName} ${offerWithIncludes?.driver.user.lastName}`,
    transporterRating: offerWithIncludes?.driver.ratingAvg ?? 0,
    vehicleId: offer.vehicleId,
    vehicleType: offerWithIncludes?.vehicle.type ?? 'UNKNOWN',
    price: offer.price,
    currency: offer.currency,
    message: offer.message ?? undefined,
    estimatedDuration: offer.estimatedDuration ?? undefined,
    status: mapBidStatus(offer.status),
    createdAt: offer.createdAt,
    validUntil: offer.validUntil ?? undefined,
  };
}

async function notifyShipperOfBid(jobId: string, bidId: string, price: number): Promise<void> {
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
  });
  
  if (!transport) return;
  
  // Create database notification
  await prisma.notification.create({
    data: {
      userId: transport.shipperUserId,
      type: 'NEW_OFFER',
      title: 'Neues Angebot erhalten',
      message: `Ein Transporteur hat ein Angebot über ${price} EUR abgegeben.`,
      data: JSON.stringify({ jobId, bidId }),
    },
  });
  
  // Broadcast via Redis for real-time notification
  // Python equivalent: notify_user(user_id, message)
  await notifyUser(
    transport.shipperUserId,
    `New bid received: €${price}`,
    'info',
    { jobId, bidId, price, type: 'NEW_BID' }
  );
  
  // Also broadcast to job channel
  await broadcastNewBid({
    bidId,
    jobId,
    transporterId: '', // Will be filled by caller
    amount: price,
  });
}

async function notifyTransporterOfAcceptance(offer: any): Promise<void> {
  // Create database notification
  await prisma.notification.create({
    data: {
      userId: offer.driverId,
      type: 'OFFER_ACCEPTED',
      title: 'Angebot angenommen!',
      message: `Dein Angebot für den Auftrag wurde angenommen. Der Preis beträgt ${offer.price} EUR.`,
      data: JSON.stringify({ jobId: offer.transportId, bidId: offer.id }),
    },
  });
  
  // Broadcast via Redis for real-time notification
  await notifyUser(
    offer.driverId,
    `Your bid was accepted! Price: €${offer.price}`,
    'success',
    { jobId: offer.transportId, bidId: offer.id, type: 'BID_ACCEPTED' }
  );
  
  // Update job status
  await broadcastJobStatus({ id: offer.transportId, status: 'booked' });
}

// ============================================
// EXPORTS
// ============================================

export const bidsService = {
  createBid,
  getBidsForJob,
  acceptBid,
  rejectBid,
  withdrawBid,
};
