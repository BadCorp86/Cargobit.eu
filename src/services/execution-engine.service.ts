/**
 * CargoBit Execution Engine Service
 * Transport Execution, Tracking & Proof-of-Delivery
 * 
 * Status Model:
 * CREATED → ASSIGNED → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED → POD_SUBMITTED → COMPLETED
 *                                                                   ↓
 *                                                              CANCELLED / DISPUTED
 */

import { prisma } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export type ExecutionStatus = 
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'POD_SUBMITTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type PodType = 'PHOTO' | 'SIGNATURE' | 'PDF' | 'QR_CODE' | 'DIGITAL_ACK';

export interface CreateExecutionInput {
  orderId: string;
  carrierId: string;
  vehicleId?: string;
  pickupTimePlanned?: Date;
  deliveryTimePlanned?: Date;
  plannedDistanceKm?: number;
}

export interface UpdateStatusInput {
  executionId: string;
  status: ExecutionStatus;
  reason?: string;
  actorType: 'system' | 'carrier' | 'shipper' | 'admin';
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export interface LocationUpdate {
  lat: number;
  lng: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export interface PodUploadInput {
  executionId: string;
  podType: PodType;
  podUrl: string;
  metadata?: {
    signatureUrl?: string;
    photoUrls?: string[];
    recipientName?: string;
    signedAt?: Date;
  };
}

export interface ExecutionWithEvents {
  id: string;
  orderId: string;
  carrierId: string;
  vehicleId: string | null;
  status: ExecutionStatus;
  statusReason: string | null;
  pickupTimePlanned: Date | null;
  pickupTimeActual: Date | null;
  deliveryTimePlanned: Date | null;
  deliveryTimeActual: Date | null;
  trackingData: string | null;
  lastKnownLocation: string | null;
  lastLocationUpdate: Date | null;
  currentEta: Date | null;
  podType: PodType | null;
  podUrl: string | null;
  podMetadata: string | null;
  podSubmittedAt: Date | null;
  plannedDistanceKm: number | null;
  actualDistanceKm: number | null;
  issues: string | null;
  shipperRating: number | null;
  carrierRating: number | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  events: ExecutionEvent[];
}

export interface ExecutionEvent {
  id: string;
  executionId: string;
  status: ExecutionStatus;
  eventType: string;
  payload: string | null;
  actorType: string | null;
  actorId: string | null;
  createdAt: Date;
}

// ============================================
// STATUS TRANSITIONS
// ============================================

const VALID_TRANSITIONS: Record<ExecutionStatus, ExecutionStatus[]> = {
  'CREATED': ['ASSIGNED', 'CANCELLED'],
  'ASSIGNED': ['ACCEPTED', 'CANCELLED'],
  'ACCEPTED': ['PICKED_UP', 'CANCELLED'],
  'PICKED_UP': ['IN_TRANSIT', 'CANCELLED', 'DISPUTED'],
  'IN_TRANSIT': ['DELIVERED', 'CANCELLED', 'DISPUTED'],
  'DELIVERED': ['POD_SUBMITTED', 'COMPLETED', 'DISPUTED'],
  'POD_SUBMITTED': ['COMPLETED', 'DISPUTED'],
  'COMPLETED': ['DISPUTED'],
  'CANCELLED': [],
  'DISPUTED': ['COMPLETED', 'CANCELLED'],
};

// ============================================
// EXECUTION SERVICE
// ============================================

export const ExecutionEngine = {
  // ============================================
  // CREATE
  // ============================================

  /**
   * Create a new execution record after carrier assignment
   */
  async createExecution(input: CreateExecutionInput): Promise<ExecutionWithEvents> {
    // Check if execution already exists
    const existing = await prisma.execution.findUnique({
      where: { orderId: input.orderId }
    });

    if (existing) {
      throw new Error(`Execution already exists for order ${input.orderId}`);
    }

    // Create execution with initial event
    const execution = await prisma.execution.create({
      data: {
        orderId: input.orderId,
        carrierId: input.carrierId,
        vehicleId: input.vehicleId,
        pickupTimePlanned: input.pickupTimePlanned,
        deliveryTimePlanned: input.deliveryTimePlanned,
        plannedDistanceKm: input.plannedDistanceKm,
        status: 'CREATED',
        events: {
          create: {
            status: 'CREATED',
            eventType: 'execution_created',
            actorType: 'system',
            payload: JSON.stringify({ carrierId: input.carrierId, vehicleId: input.vehicleId })
          }
        }
      },
      include: { events: true }
    });

    return execution as ExecutionWithEvents;
  },

  // ============================================
  // STATUS UPDATES
  // ============================================

  /**
   * Update execution status with validation
   */
  async updateStatus(input: UpdateStatusInput): Promise<ExecutionWithEvents> {
    const execution = await prisma.execution.findUnique({
      where: { id: input.executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${input.executionId}`);
    }

    // Validate transition
    const currentStatus = execution.status as ExecutionStatus;
    const validNextStates = VALID_TRANSITIONS[currentStatus];

    if (!validNextStates.includes(input.status)) {
      throw new Error(
        `Invalid status transition: ${currentStatus} → ${input.status}. ` +
        `Valid transitions: ${validNextStates.join(', ')}`
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: input.status,
      statusReason: input.reason,
    };

    // Handle specific status updates
    switch (input.status) {
      case 'ACCEPTED':
        // Carrier accepted - no additional data needed
        break;
      
      case 'PICKED_UP':
        updateData.pickupTimeActual = new Date();
        break;
      
      case 'DELIVERED':
        updateData.deliveryTimeActual = new Date();
        // Calculate actual distance if we have tracking data
        if (execution.trackingData) {
          const distance = calculateTotalDistance(JSON.parse(execution.trackingData));
          updateData.actualDistanceKm = distance;
        }
        break;
      
      case 'COMPLETED':
        updateData.completedAt = new Date();
        // Update carrier stats
        await updateCarrierStats(execution.carrierId, execution);
        break;
      
      case 'CANCELLED':
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = input.reason;
        break;
    }

    // Update execution and create event
    const updated = await prisma.execution.update({
      where: { id: input.executionId },
      data: {
        ...updateData,
        events: {
          create: {
            status: input.status,
            eventType: 'status_change',
            actorType: input.actorType,
            actorId: input.actorId,
            payload: JSON.stringify({
              previousStatus: currentStatus,
              newStatus: input.status,
              reason: input.reason,
              ...input.metadata
            })
          }
        }
      },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });

    // Trigger notifications
    await notifyStatusChange(updated as ExecutionWithEvents, currentStatus);

    return updated as ExecutionWithEvents;
  },

  /**
   * Carrier accepts the assigned job
   */
  async acceptJob(executionId: string, carrierId: string): Promise<ExecutionWithEvents> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId }
    });

    if (!execution || execution.carrierId !== carrierId) {
      throw new Error('Execution not found or not assigned to this carrier');
    }

    return this.updateStatus({
      executionId,
      status: 'ACCEPTED',
      actorType: 'carrier',
      actorId: carrierId
    });
  },

  /**
   * Mark cargo as picked up
   */
  async confirmPickup(
    executionId: string, 
    carrierId: string,
    location?: LocationUpdate
  ): Promise<ExecutionWithEvents> {
    const metadata: Record<string, unknown> = {};
    if (location) {
      metadata.pickupLocation = location;
    }

    return this.updateStatus({
      executionId,
      status: 'PICKED_UP',
      actorType: 'carrier',
      actorId: carrierId,
      metadata
    });
  },

  /**
   * Mark cargo as delivered
   */
  async confirmDelivery(
    executionId: string,
    carrierId: string,
    location?: LocationUpdate
  ): Promise<ExecutionWithEvents> {
    const metadata: Record<string, unknown> = {};
    if (location) {
      metadata.deliveryLocation = location;
    }

    return this.updateStatus({
      executionId,
      status: 'DELIVERED',
      actorType: 'carrier',
      actorId: carrierId,
      metadata
    });
  },

  // ============================================
  // TRACKING
  // ============================================

  /**
   * Update carrier location
   */
  async updateLocation(
    executionId: string,
    location: LocationUpdate
  ): Promise<void> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Only update location for active statuses
    const activeStatuses: ExecutionStatus[] = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
    if (!activeStatuses.includes(execution.status as ExecutionStatus)) {
      return; // Silently ignore for inactive executions
    }

    // Parse existing tracking data
    let trackingData: LocationUpdate[] = [];
    if (execution.trackingData) {
      trackingData = JSON.parse(execution.trackingData);
    }

    // Add new location point (keep last 1000 points)
    trackingData.push(location);
    if (trackingData.length > 1000) {
      trackingData = trackingData.slice(-1000);
    }

    // Calculate ETA based on current location and destination
    const eta = await calculateEta(location, execution);

    // Update execution
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        trackingData: JSON.stringify(trackingData),
        lastKnownLocation: JSON.stringify(location),
        lastLocationUpdate: new Date(),
        currentEta: eta,
        etaUpdatedAt: eta ? new Date() : null,
        events: {
          create: {
            status: execution.status as ExecutionStatus,
            eventType: 'location_update',
            payload: JSON.stringify(location)
          }
        }
      }
    });
  },

  /**
   * Get current tracking info
   */
  async getTracking(executionId: string): Promise<{
    status: ExecutionStatus;
    lastLocation: LocationUpdate | null;
    currentEta: Date | null;
    trackingHistory: LocationUpdate[];
  }> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      select: {
        status: true,
        lastKnownLocation: true,
        lastLocationUpdate: true,
        currentEta: true,
        trackingData: true
      }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    return {
      status: execution.status as ExecutionStatus,
      lastLocation: execution.lastKnownLocation 
        ? JSON.parse(execution.lastKnownLocation) 
        : null,
      currentEta: execution.currentEta,
      trackingHistory: execution.trackingData 
        ? JSON.parse(execution.trackingData) 
        : []
    };
  },

  // ============================================
  // PROOF OF DELIVERY
  // ============================================

  /**
   * Upload Proof of Delivery
   */
  async uploadPod(input: PodUploadInput): Promise<ExecutionWithEvents> {
    const execution = await prisma.execution.findUnique({
      where: { id: input.executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${input.executionId}`);
    }

    // Validate status (must be DELIVERED or later)
    const validStatuses: ExecutionStatus[] = ['DELIVERED', 'POD_SUBMITTED'];
    if (!validStatuses.includes(execution.status as ExecutionStatus)) {
      throw new Error(`Cannot upload POD for status: ${execution.status}`);
    }

    const now = new Date();

    // Update execution with POD data
    const updated = await prisma.execution.update({
      where: { id: input.executionId },
      data: {
        podType: input.podType,
        podUrl: input.podUrl,
        podMetadata: JSON.stringify(input.metadata || {}),
        podSubmittedAt: now,
        status: 'POD_SUBMITTED',
        statusReason: 'POD uploaded by carrier',
        events: {
          create: {
            status: 'POD_SUBMITTED',
            eventType: 'pod_uploaded',
            actorType: 'carrier',
            payload: JSON.stringify({
              podType: input.podType,
              podUrl: input.podUrl,
              metadata: input.metadata
            })
          }
        }
      },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });

    return updated as ExecutionWithEvents;
  },

  /**
   * Verify POD (admin/shipper action)
   */
  async verifyPod(
    executionId: string,
    verifiedBy: string,
    autoComplete: boolean = true
  ): Promise<ExecutionWithEvents> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId }
    });

    if (!execution || !execution.podUrl) {
      throw new Error('Execution not found or no POD submitted');
    }

    const now = new Date();

    // Update POD verification
    const updateData: Record<string, unknown> = {
      podVerifiedBy: verifiedBy,
      podVerifiedAt: now,
    };

    if (autoComplete) {
      updateData.status = 'COMPLETED';
      updateData.completedAt = now;
    }

    const updated = await prisma.execution.update({
      where: { id: executionId },
      data: {
        ...updateData,
        events: {
          create: {
            status: autoComplete ? 'COMPLETED' : (execution.status as ExecutionStatus),
            eventType: 'pod_verified',
            actorType: 'admin',
            actorId: verifiedBy,
            payload: JSON.stringify({ autoComplete })
          }
        }
      },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });

    // Update carrier stats on completion
    if (autoComplete) {
      await updateCarrierStats(execution.carrierId, updated);
    }

    return updated as ExecutionWithEvents;
  },

  // ============================================
  // RATINGS
  // ============================================

  /**
   * Submit shipper rating for carrier
   */
  async submitCarrierRating(
    executionId: string,
    carrierRating: number,
    carrierReview?: string
  ): Promise<void> {
    if (carrierRating < 1 || carrierRating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await prisma.execution.update({
      where: { id: executionId },
      data: {
        carrierRating,
        carrierReview,
        events: {
          create: {
            status: 'COMPLETED',
            eventType: 'rating_submitted',
            actorType: 'shipper',
            payload: JSON.stringify({ carrierRating, carrierReview })
          }
        }
      }
    });

    // Update carrier average rating
    await updateCarrierRating(executionId);
  },

  /**
   * Submit carrier rating for shipper
   */
  async submitShipperRating(
    executionId: string,
    shipperRating: number,
    shipperReview?: string
  ): Promise<void> {
    if (shipperRating < 1 || shipperRating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await prisma.execution.update({
      where: { id: executionId },
      data: {
        shipperRating,
        shipperReview,
        events: {
          create: {
            status: 'COMPLETED',
            eventType: 'rating_submitted',
            actorType: 'carrier',
            payload: JSON.stringify({ shipperRating, shipperReview })
          }
        }
      }
    });
  },

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get execution by order ID
   */
  async getByOrderId(orderId: string): Promise<ExecutionWithEvents | null> {
    const execution = await prisma.execution.findUnique({
      where: { orderId },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 50 } }
    });

    return execution as ExecutionWithEvents | null;
  },

  /**
   * Get execution by ID
   */
  async getById(executionId: string): Promise<ExecutionWithEvents | null> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 50 } }
    });

    return execution as ExecutionWithEvents | null;
  },

  /**
   * Get active executions for a carrier
   */
  async getCarrierActiveExecutions(carrierId: string): Promise<ExecutionWithEvents[]> {
    const activeStatuses: ExecutionStatus[] = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];

    const executions = await prisma.execution.findMany({
      where: {
        carrierId,
        status: { in: activeStatuses }
      },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 10 } },
      orderBy: { createdAt: 'desc' }
    });

    return executions as ExecutionWithEvents[];
  },

  /**
   * Get execution history for carrier
   */
  async getCarrierHistory(
    carrierId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ executions: ExecutionWithEvents[]; total: number }> {
    const [executions, total] = await Promise.all([
      prisma.execution.findMany({
        where: {
          carrierId,
          status: { in: ['COMPLETED', 'CANCELLED'] }
        },
        include: { events: { orderBy: { createdAt: 'desc' }, take: 5 } },
        orderBy: { completedAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.execution.count({
        where: {
          carrierId,
          status: { in: ['COMPLETED', 'CANCELLED'] }
        }
      })
    ]);

    return { executions: executions as ExecutionWithEvents[], total };
  },

  /**
   * Get status timeline
   */
  async getStatusTimeline(executionId: string): Promise<ExecutionEvent[]> {
    const events = await prisma.executionEvent.findMany({
      where: {
        executionId,
        eventType: 'status_change'
      },
      orderBy: { createdAt: 'asc' }
    });

    return events as ExecutionEvent[];
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate total distance from tracking data
 */
function calculateTotalDistance(trackingData: LocationUpdate[]): number {
  if (trackingData.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < trackingData.length; i++) {
    const prev = trackingData[i - 1];
    const curr = trackingData[i];
    totalDistance += haversineDistance(
      prev.lat, prev.lng,
      curr.lat, curr.lng
    );
  }

  return Math.round(totalDistance * 10) / 10;
}

/**
 * Haversine distance calculation
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate ETA based on current location
 */
async function calculateEta(
  location: LocationUpdate,
  execution: { deliveryTimePlanned: Date | null; currentEta: Date | null }
): Promise<Date | null> {
  // In production, this would call a routing service
  // For now, use planned delivery time as fallback
  return execution.deliveryTimePlanned || execution.currentEta;
}

/**
 * Update carrier stats after completion
 */
async function updateCarrierStats(
  carrierId: string,
  execution: { 
    status: string; 
    pickupTimeActual: Date | null;
    deliveryTimeActual: Date | null;
    pickupTimePlanned: Date | null;
    deliveryTimePlanned: Date | null;
    actualDistanceKm: number | null;
    carrierRating: number | null;
  }
): Promise<void> {
  const stats = await prisma.carrierStats.findUnique({
    where: { driverId: carrierId }
  });

  if (!stats) return;

  // Calculate on-time status
  let onTime = true;
  if (execution.deliveryTimeActual && execution.deliveryTimePlanned) {
    const delayMinutes = 
      (execution.deliveryTimeActual.getTime() - execution.deliveryTimePlanned.getTime()) / (1000 * 60);
    onTime = delayMinutes <= 30; // Within 30 minutes is considered on-time
  }

  // Update stats
  const completedOrders = stats.completedOrders + 1;
  const newOnTimeRate = (stats.onTimeRate * stats.completedOrders + (onTime ? 1 : 0)) / completedOrders;
  const newAvgRating = stats.avgRating > 0 && execution.carrierRating
    ? (stats.avgRating * stats.completedOrders + execution.carrierRating) / completedOrders
    : execution.carrierRating || stats.avgRating;

  await prisma.carrierStats.update({
    where: { driverId: carrierId },
    data: {
      completedOrders,
      onTimeRate: newOnTimeRate,
      avgRating: newAvgRating,
      totalDistanceKm: stats.totalDistanceKm + (execution.actualDistanceKm || 0),
      lastOrderAt: new Date(),
      lastUpdated: new Date()
    }
  });
}

/**
 * Update carrier average rating
 */
async function updateCarrierRating(executionId: string): Promise<void> {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    select: { carrierId: true, carrierRating: true }
  });

  if (!execution || !execution.carrierRating) return;

  // Get all completed executions with ratings for this carrier
  const ratings = await prisma.execution.aggregate({
    where: {
      carrierId: execution.carrierId,
      status: 'COMPLETED',
      carrierRating: { not: null }
    },
    _avg: { carrierRating: true },
    _count: { carrierRating: true }
  });

  if (ratings._count.carrierRating > 0) {
    await prisma.carrierStats.update({
      where: { driverId: execution.carrierId },
      data: {
        avgRating: ratings._avg.carrierRating || 0,
        lastUpdated: new Date()
      }
    });
  }
}

/**
 * Notify relevant parties about status change
 */
async function notifyStatusChange(
  execution: ExecutionWithEvents,
  previousStatus: ExecutionStatus
): Promise<void> {
  // In production, this would:
  // 1. Push notification to shipper app
  // 2. Push notification to carrier app (if relevant)
  // 3. Send email if configured
  // 4. Trigger webhooks if configured

  console.log(`[ExecutionEngine] Status change: ${execution.orderId} ${previousStatus} → ${execution.status}`);
}

// ============================================
// EXPORTS
// ============================================

export default ExecutionEngine;
