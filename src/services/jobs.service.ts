/**
 * CargoBit Jobs Service
 * Complete Job Lifecycle Management
 * 
 * STATUS FLOW:
 * open → matched → booked → in_progress → completed → canceled
 * 
 * Python equivalent for Redis broadcasting:
 * ```python
 * def broadcast_job_status(job):
 *     publish_event(
 *         f"job:{job.id}",
 *         {"jobId": str(job.id), "status": job.status}
 *     )
 * ```
 */

import { prisma } from '@/lib/db';
import { matchTransportersForJob, type JobRequirements } from './matching-ml.service';
import { broadcastJobStatus, notifyUser, broadcastNewBid } from './redis-publisher.service';

// ============================================
// TYPES
// ============================================

export type JobStatus = 
  | 'open'
  | 'matched'
  | 'booked'
  | 'in_progress'
  | 'completed'
  | 'canceled';

export interface CreateJobInput {
  shipperUserId: string;
  shipperCompanyId?: string;
  
  // Pickup
  pickupAddressId: string;
  pickupDatetime: Date;
  pickupTimeFrom?: string;
  pickupTimeTo?: string;
  
  // Delivery
  deliveryAddressId: string;
  deliveryDatetime?: Date;
  deliveryTimeFrom?: string;
  deliveryTimeTo?: string;
  
  // Cargo
  description?: string;
  weightKg?: number;
  volumeM3?: number;
  transportType: string;
  
  // Pricing
  shipperBudget?: number;
  currency?: string;
  
  // International
  isInternational?: boolean;
  transitCountries?: string[];
  
  // Requirements
  vehicleRequirements?: Record<string, unknown>;
  driverRequirements?: Record<string, unknown>;
  specialRequirements?: string;
}

export interface JobWithDetails {
  id: string;
  status: JobStatus;
  
  // Addresses
  pickupAddress: {
    id: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  deliveryAddress: {
    id: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  
  // Schedule
  pickupDatetime: Date;
  deliveryDatetime?: Date;
  
  // Cargo
  description?: string;
  weightKg?: number;
  
  // Pricing
  shipperBudget?: number;
  agreedPrice?: number;
  
  // Matching
  matchedTransporters?: Array<{
    id: string;
    score: number;
    companyName?: string;
  }>;
  
  // Bids
  bids?: Array<{
    id: string;
    price: number;
    status: string;
    transporterId: string;
  }>;
  
  // Assignment
  assignedTransporter?: {
    id: string;
    companyName?: string;
    rating: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CREATE JOB
// ============================================

export async function createJob(input: CreateJobInput): Promise<{ jobId: string; status: string }> {
  console.log('[Jobs] Creating new job for shipper:', input.shipperUserId);
  
  // Create transport record
  const transport = await prisma.transport.create({
    data: {
      shipperUserId: input.shipperUserId,
      shipperCompanyId: input.shipperCompanyId,
      pickupAddressId: input.pickupAddressId,
      deliveryAddressId: input.deliveryAddressId,
      pickupDatetime: input.pickupDatetime,
      pickupTimeFrom: input.pickupTimeFrom,
      pickupTimeTo: input.pickupTimeTo,
      deliveryDatetime: input.deliveryDatetime,
      deliveryTimeFrom: input.deliveryTimeFrom,
      deliveryTimeTo: input.deliveryTimeTo,
      description: input.description,
      transportType: input.transportType as any,
      shipperBudget: input.shipperBudget,
      currency: input.currency ?? 'EUR',
      isInternational: input.isInternational ?? false,
      transitCountries: input.transitCountries ? JSON.stringify(input.transitCountries) : null,
      status: 'CREATED',
    },
  });
  
  // Create transport details if provided
  if (input.weightKg || input.vehicleRequirements || input.driverRequirements) {
    await prisma.transportDetail.create({
      data: {
        transportId: transport.id,
        weightKg: input.weightKg,
        volumeM3: input.volumeM3,
        vehicleRequirements: input.vehicleRequirements ? JSON.stringify(input.vehicleRequirements) : null,
        driverRequirements: input.driverRequirements ? JSON.stringify(input.driverRequirements) : null,
        specialRequirements: input.specialRequirements,
        detailsJson: JSON.stringify({}),
      },
    });
  }
  
  // Create status history
  await prisma.transportStatusHistory.create({
    data: {
      transportId: transport.id,
      status: 'CREATED',
      note: 'Job created',
    },
  });
  
  // Publish job (trigger matching)
  await publishJob(transport.id);
  
  return {
    jobId: transport.id,
    status: 'open',
  };
}

// ============================================
// PUBLISH JOB (Trigger Matching)
// ============================================

export async function publishJob(jobId: string): Promise<void> {
  console.log('[Jobs] Publishing job:', jobId);
  
  // Get job details
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
    include: {
      pickupAddress: true,
      deliveryAddress: true,
      transportDetail: true,
    },
  });
  
  if (!transport) {
    throw new Error('Job not found');
  }
  
  // Update status to PUBLISHED
  await prisma.transport.update({
    where: { id: jobId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });
  
  // Broadcast job published status
  await broadcastJobStatus({ id: jobId, status: 'published' });
  
  // Build matching input
  const matchingInput: JobRequirements = {
    jobId: transport.id,
    originRegion: transport.pickupAddress.country,
    destinationRegion: transport.deliveryAddress.country,
    weightKg: transport.transportDetail?.weightKg ?? 0,
    volumeM3: transport.transportDetail?.volumeM3 ?? undefined,
    pickupDate: transport.pickupDatetime,
    isInternational: transport.isInternational,
    transitCountries: transport.transitCountries ? JSON.parse(transport.transitCountries) : undefined,
  };
  
  // Run matching (async - don't wait)
  matchTransportersForJob(matchingInput)
    .then(results => {
      console.log(`[Jobs] Matching complete for job ${jobId}: ${results.length} matches`);
      
      // Update job status to matched
      return prisma.transport.update({
        where: { id: jobId },
        data: { status: 'ASSIGNED' }, // Using ASSIGNED as 'matched' equivalent
      });
    })
    .catch(error => {
      console.error('[Jobs] Matching failed:', error);
    });
}

// ============================================
// GET JOB
// ============================================

export async function getJob(jobId: string, userId: string): Promise<JobWithDetails | null> {
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
    include: {
      pickupAddress: true,
      deliveryAddress: true,
      transportDetail: true,
      matchingSessions: {
        include: {
          candidates: {
            where: { status: 'PENDING' },
            orderBy: { score: 'desc' },
            take: 10,
          },
        },
      },
      offers: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      },
      assignment: {
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
        },
      },
    },
  });
  
  if (!transport) return null;
  
  // Verify access
  if (transport.shipperUserId !== userId) {
    // TODO: Check if user is assigned transporter
    return null;
  }
  
  // Map status
  const statusMap: Record<string, JobStatus> = {
    'CREATED': 'open',
    'PUBLISHED': 'matched',
    'ASSIGNED': 'matched',
    'IN_TRANSIT': 'in_progress',
    'PICKUP_DONE': 'in_progress',
    'DELIVERY_DONE': 'in_progress',
    'COMPLETED': 'completed',
    'CANCELLED': 'canceled',
  };
  
  // Get matched transporters
  const matchedTransporters = transport.matchingSessions[0]?.candidates.map(c => ({
    id: c.driverId,
    score: c.score,
    companyName: undefined, // TODO: Look up company
  })) ?? [];
  
  // Get bids
  const bids = transport.offers.map(o => ({
    id: o.id,
    price: o.price,
    status: o.status.toLowerCase(),
    transporterId: o.driverId,
  }));
  
  // Get assigned transporter
  const assignedTransporter = transport.assignment ? {
    id: transport.assignment.driverId,
    companyName: transport.assignment.driver.user.companyUsers[0]?.company.name,
    rating: transport.assignment.driver.ratingAvg,
  } : undefined;
  
  return {
    id: transport.id,
    status: statusMap[transport.status] ?? 'open',
    pickupAddress: {
      id: transport.pickupAddress.id,
      street: transport.pickupAddress.street,
      postalCode: transport.pickupAddress.postalCode,
      city: transport.pickupAddress.city,
      country: transport.pickupAddress.country,
    },
    deliveryAddress: {
      id: transport.deliveryAddress.id,
      street: transport.deliveryAddress.street,
      postalCode: transport.deliveryAddress.postalCode,
      city: transport.deliveryAddress.city,
      country: transport.deliveryAddress.country,
    },
    pickupDatetime: transport.pickupDatetime,
    deliveryDatetime: transport.deliveryDatetime ?? undefined,
    description: transport.description ?? undefined,
    weightKg: transport.transportDetail?.weightKg ?? undefined,
    shipperBudget: transport.shipperBudget ?? undefined,
    agreedPrice: transport.agreedPrice ?? undefined,
    matchedTransporters,
    bids,
    assignedTransporter,
    createdAt: transport.createdAt,
    updatedAt: transport.updatedAt,
  };
}

// ============================================
// GET JOBS FOR USER
// ============================================

export async function getJobsForUser(
  userId: string,
  role: 'shipper' | 'transporter',
  filters?: {
    status?: JobStatus;
    limit?: number;
    offset?: number;
  }
): Promise<{ jobs: JobWithDetails[]; total: number }> {
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;
  
  let where: any = {};
  
  if (role === 'shipper') {
    where.shipperUserId = userId;
    
    // Map status filter
    if (filters?.status) {
      const statusMap: Record<JobStatus, string[]> = {
        'open': ['CREATED'],
        'matched': ['PUBLISHED', 'ASSIGNED'],
        'booked': ['ASSIGNED'],
        'in_progress': ['IN_TRANSIT', 'PICKUP_DONE', 'DELIVERY_DONE'],
        'completed': ['COMPLETED'],
        'canceled': ['CANCELLED'],
      };
      where.status = { in: statusMap[filters.status] };
    }
  } else {
    // Transporter - get jobs where they have offers or assignments
    where.OR = [
      { offers: { some: { driverId: userId } } },
      { assignment: { driverId: userId } },
    ];
  }
  
  const [transports, total] = await Promise.all([
    prisma.transport.findMany({
      where,
      include: {
        pickupAddress: true,
        deliveryAddress: true,
        transportDetail: true,
        offers: {
          where: { driverId: role === 'transporter' ? userId : undefined },
        },
        assignment: role === 'transporter' ? {
          include: { driver: true },
        } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.transport.count({ where }),
  ]);
  
  // Map to JobWithDetails
  const jobs: JobWithDetails[] = transports.map(t => ({
    id: t.id,
    status: mapStatus(t.status),
    pickupAddress: {
      id: t.pickupAddress.id,
      street: t.pickupAddress.street,
      postalCode: t.pickupAddress.postalCode,
      city: t.pickupAddress.city,
      country: t.pickupAddress.country,
    },
    deliveryAddress: {
      id: t.deliveryAddress.id,
      street: t.deliveryAddress.street,
      postalCode: t.deliveryAddress.postalCode,
      city: t.deliveryAddress.city,
      country: t.deliveryAddress.country,
    },
    pickupDatetime: t.pickupDatetime,
    deliveryDatetime: t.deliveryDatetime ?? undefined,
    description: t.description ?? undefined,
    weightKg: t.transportDetail?.weightKg ?? undefined,
    shipperBudget: t.shipperBudget ?? undefined,
    agreedPrice: t.agreedPrice ?? undefined,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
  
  return { jobs, total };
}

function mapStatus(dbStatus: string): JobStatus {
  const map: Record<string, JobStatus> = {
    'CREATED': 'open',
    'PUBLISHED': 'matched',
    'ASSIGNED': 'booked',
    'IN_TRANSIT': 'in_progress',
    'PICKUP_DONE': 'in_progress',
    'DELIVERY_DONE': 'in_progress',
    'COMPLETED': 'completed',
    'CANCELLED': 'canceled',
  };
  return map[dbStatus] ?? 'open';
}

// ============================================
// UPDATE JOB STATUS
// ============================================

export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus,
  userId: string,
  note?: string
): Promise<{ success: boolean; newStatus: JobStatus }> {
  // Verify job exists and user has access
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
  });
  
  if (!transport) {
    throw new Error('Job not found');
  }
  
  // Map to DB status
  const dbStatusMap: Record<JobStatus, string> = {
    'open': 'CREATED',
    'matched': 'PUBLISHED',
    'booked': 'ASSIGNED',
    'in_progress': 'IN_TRANSIT',
    'completed': 'COMPLETED',
    'canceled': 'CANCELLED',
  };
  
  const dbStatus = dbStatusMap[newStatus];
  
  // Update status
  await prisma.$transaction([
    prisma.transport.update({
      where: { id: jobId },
      data: {
        status: dbStatus as any,
        // Update relevant timestamps
        ...(newStatus === 'in_progress' && { pickedUpAt: new Date() }),
        ...(newStatus === 'completed' && { completedAt: new Date() }),
        ...(newStatus === 'canceled' && { 
          cancelledAt: new Date(),
          cancellationReason: note,
        }),
      },
    }),
    prisma.transportStatusHistory.create({
      data: {
        transportId: jobId,
        status: dbStatus as any,
        changedBy: userId,
        note,
      },
    }),
  ]);
  
  // Trigger side effects
  if (newStatus === 'completed') {
    await handleJobCompletion(jobId);
  }
  
  // Broadcast status update via Redis
  // Python equivalent: broadcast_job_status(job)
  await broadcastJobStatus({ id: jobId, status: newStatus });
  
  // Notify shipper
  if (transport.shipperUserId) {
    await notifyUser(
      transport.shipperUserId,
      `Job status updated to ${newStatus}`,
      newStatus === 'completed' ? 'success' : 'info',
      { jobId, status: newStatus }
    );
  }
  
  console.log(`[Jobs] Updated job ${jobId} to ${newStatus}`);
  
  return { success: true, newStatus };
}

// ============================================
// CANCEL JOB
// ============================================

export async function cancelJob(
  jobId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean }> {
  // Check if job can be canceled
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
    include: { assignment: true },
  });
  
  if (!transport) {
    throw new Error('Job not found');
  }
  
  if (transport.status === 'COMPLETED') {
    throw new Error('Cannot cancel completed job');
  }
  
  if (transport.status === 'CANCELLED') {
    throw new Error('Job already canceled');
  }
  
  // If job was booked, handle refund
  if (transport.assignment && transport.agreedPrice) {
    await handleCancellationRefund(jobId, transport.agreedPrice);
  }
  
  // Update status
  await updateJobStatus(jobId, 'canceled', userId, reason);
  
  return { success: true };
}

// ============================================
// HANDLE JOB COMPLETION
// ============================================

async function handleJobCompletion(jobId: string): Promise<void> {
  console.log('[Jobs] Handling completion for job:', jobId);
  
  // Get job details
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
    include: {
      assignment: { include: { driver: true } },
      commission: true,
    },
  });
  
  if (!transport?.assignment) return;
  
  // Release pending payment to transporter
  const pendingTx = await prisma.walletTransaction.findFirst({
    where: {
      relatedTransportId: jobId,
      type: 'PAYMENT_IN',
      description: { contains: 'pending' },
    },
  });
  
  if (pendingTx) {
    // Update transaction to completed
    await prisma.walletTransaction.update({
      where: { id: pendingTx.id },
      data: {
        description: pendingTx.description?.replace('pending', 'completed'),
        processedAt: new Date(),
      },
    });
    
    console.log(`[Jobs] Released pending payment for job ${jobId}`);
  }
  
  // Trigger payout if transporter has Stripe Connect
  // This would call the payout service
}

// ============================================
// HANDLE CANCELLATION REFUND
// ============================================

async function handleCancellationRefund(jobId: string, amount: number): Promise<void> {
  console.log(`[Jobs] Processing refund for canceled job ${jobId}`);
  
  // Find and reverse wallet transactions
  const transactions = await prisma.walletTransaction.findMany({
    where: { relatedTransportId: jobId },
  });
  
  // Create refund transactions
  for (const tx of transactions) {
    if (tx.type === 'PAYMENT_OUT') {
      // Refund to shipper
      const shipperWallet = await prisma.wallet.findFirst({
        where: { ownerUserId: tx.walletId }, // This needs proper lookup
      });
      
      if (shipperWallet) {
        await prisma.walletTransaction.create({
          data: {
            walletId: shipperWallet.id,
            type: 'REFUND',
            amount: tx.amount,
            currency: tx.currency,
            relatedTransportId: jobId,
            description: `Refund for canceled job ${jobId}`,
          },
        });
        
        await prisma.wallet.update({
          where: { id: shipperWallet.id },
          data: { balance: { increment: tx.amount } },
        });
      }
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export const jobsService = {
  createJob,
  publishJob,
  getJob,
  getJobsForUser,
  updateJobStatus,
  cancelJob,
};
