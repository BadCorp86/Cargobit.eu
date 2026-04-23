/**
 * CargoBit Tracking Service
 * Status transitions, Job Events, Redis-based WebSocket broadcasting
 * 
 * Redis-basierter WS-Broadcast:
 * - API-Services: publishen Events nach Redis (PUBLISH channel payload)
 * - WS-Service: subscribed auf Redis-Channels und broadcastet an Websocket-Clients
 * 
 * Python equivalent:
 * ```python
 * def broadcast_job_status(job):
 *     publish_event(
 *         f"job:{job.id}",
 *         {"jobId": str(job.id), "status": job.status}
 *     )
 * ```
 */

import { prisma } from '@/lib/db';
import type { TransportStatus, JobEventType } from '@prisma/client';
import { broadcastJobStatus, broadcastTracking } from './redis-publisher.service';

// ============================================
// TYPES
// ============================================

export interface UpdateStatusRequest {
  status: TransportStatus;
  eventType?: JobEventType;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface JobEventPayload {
  jobId: string;
  status: TransportStatus;
  eventType?: JobEventType;
  timestamp: string;
}

// ============================================
// 1. UPDATE JOB STATUS (Python spec)
// ============================================

/**
 * Python equivalent:
 * @router.post("/jobs/{job_id}/status")
 * def update_status(
 *     job_id: str,
 *     req: UpdateStatusRequest,
 *     db: Session = Depends(get_db),
 *     user_id: str = Depends(get_current_transporter),
 * ):
 *     job = get_job(db, job_id)
 *     if not job or job.transporter_id != user_id:
 *         raise HTTPException(404, "Job not found")
 *     
 *     job.status = req.status
 *     db.add(job)
 *     
 *     if req.event_type:
 *         ev = JobEvent(id=uuid4(), job_id=job.id, type=req.event_type)
 *         db.add(ev)
 *     
 *     db.commit()
 *     
 *     # Websocket/Event push
 *     broadcast_job_update(job.id, job.status, req.event_type)
 *     
 *     return {"status": job.status}
 */
export async function updateJobStatus(
  jobId: string,
  userId: string,
  req: UpdateStatusRequest
): Promise<{ success: boolean; status?: TransportStatus; error?: string }> {
  // Get job
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
    include: { assignment: true },
  });
  
  if (!transport) {
    return { success: false, error: 'Job not found' };
  }
  
  // Check authorization - must be assigned driver or admin
  const driver = await prisma.driver.findFirst({
    where: { userId },
  });
  
  const isAssignedDriver = driver && transport.assignment?.driverId === driver.id;
  
  if (!isAssignedDriver) {
    return { success: false, error: 'Not authorized to update this job' };
  }
  
  // Validate status transition
  const validTransitions: Record<TransportStatus, TransportStatus[]> = {
    'CREATED': ['PUBLISHED', 'CANCELLED'],
    'PUBLISHED': ['ASSIGNED', 'CANCELLED'],
    'ASSIGNED': ['IN_TRANSIT', 'CANCELLED'],
    'IN_TRANSIT': ['PICKUP_DONE', 'DELIVERY_DONE', 'COMPLETED', 'CANCELLED'],
    'PICKUP_DONE': ['IN_TRANSIT', 'DELIVERY_DONE', 'COMPLETED'],
    'DELIVERY_DONE': ['COMPLETED'],
    'COMPLETED': [],
    'CANCELLED': [],
  };
  
  if (!validTransitions[transport.status].includes(req.status)) {
    return { 
      success: false, 
      error: `Invalid status transition: ${transport.status} → ${req.status}` 
    };
  }
  
  // Update in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update job status
    const updated = await tx.transport.update({
      where: { id: jobId },
      data: {
        status: req.status,
        ...(req.status === 'IN_TRANSIT' && { pickedUpAt: new Date() }),
        ...(req.status === 'COMPLETED' && { completedAt: new Date(), deliveredAt: new Date() }),
        ...(req.status === 'CANCELLED' && { cancelledAt: new Date() }),
      },
    });
    
    // Create status history
    await tx.transportStatusHistory.create({
      data: {
        transportId: jobId,
        status: req.status,
        changedBy: userId,
        note: req.description,
      },
    });
    
    // Create job event if specified
    if (req.eventType) {
      await tx.jobEvent.create({
        data: {
          transportId: jobId,
          type: req.eventType,
          description: req.description,
          latitude: req.latitude,
          longitude: req.longitude,
          createdBy: userId,
        },
      });
    }
    
    return updated;
  });
  
  // Broadcast update via Redis (WebSocket subscribers will receive it)
  await broadcastJobStatus(jobId, req.status, {
    previousStatus: transport.status,
    eventType: req.eventType,
    metadata: req.description ? { description: req.description } : undefined,
  });
  
  return { success: true, status: result.status };
}

// ============================================
// 2. CREATE JOB EVENT
// ============================================

export async function createJobEvent(
  jobId: string,
  userId: string,
  data: {
    type: JobEventType;
    description?: string;
    latitude?: number;
    longitude?: number;
    metadata?: Record<string, any>;
  }
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
    include: { assignment: true },
  });
  
  if (!transport) {
    return { success: false, error: 'Job not found' };
  }
  
  // Check authorization
  const driver = await prisma.driver.findFirst({ where: { userId } });
  if (!driver || transport.assignment?.driverId !== driver.id) {
    return { success: false, error: 'Not authorized' };
  }
  
  const event = await prisma.jobEvent.create({
    data: {
      transportId: jobId,
      type: data.type,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      createdBy: userId,
    },
  });
  
  return { success: true, eventId: event.id };
}

// ============================================
// 3. GET JOB TIMELINE
// ============================================

export async function getJobTimeline(jobId: string) {
  const events = await prisma.jobEvent.findMany({
    where: { transportId: jobId },
    orderBy: { createdAt: 'asc' },
  });
  
  const statusHistory = await prisma.transportStatusHistory.findMany({
    where: { transportId: jobId },
    orderBy: { changedAt: 'asc' },
  });
  
  return {
    events: events.map(e => ({
      id: e.id,
      type: e.type,
      description: e.description,
      location: e.latitude && e.longitude 
        ? { lat: e.latitude, lng: e.longitude }
        : null,
      metadata: e.metadata ? JSON.parse(e.metadata) : null,
      createdAt: e.createdAt,
    })),
    statusHistory: statusHistory.map(s => ({
      status: s.status,
      changedBy: s.changedBy,
      note: s.note,
      changedAt: s.changedAt,
    })),
  };
}

// ============================================
// 4. TRACKING UPDATE (Redis broadcast)
// ============================================

/**
 * Update GPS tracking and broadcast via Redis.
 * 
 * Python equivalent:
 * ```python
 * def broadcast_tracking(job_id, driver_id, lat, lng):
 *     publish_event(
 *         f"tracking:{job_id}",
 *         {"jobId": job_id, "driverId": driver_id, "latitude": lat, "longitude": lng}
 *     )
 * ```
 */
export async function updateTracking(
  jobId: string,
  driverId: string,
  latitude: number,
  longitude: number,
  options?: { speed?: number; heading?: number }
): Promise<{ success: boolean; error?: string }> {
  // Verify job assignment
  const assignment = await prisma.assignment.findFirst({
    where: { transportId: jobId, driverId },
  });
  
  if (!assignment) {
    return { success: false, error: 'Not assigned to this job' };
  }
  
  // Create tracking point
  await prisma.trackingPoint.create({
    data: {
      transportId: jobId,
      driverId,
      latitude,
      longitude,
      speed: options?.speed,
      heading: options?.heading,
    },
  });
  
  // Broadcast via Redis
  await broadcastTracking(jobId, driverId, latitude, longitude, options);
  
  return { success: true };
}

// ============================================
// EXPORTS
// ============================================

export const trackingService = {
  updateJobStatus,
  createJobEvent,
  getJobTimeline,
  updateTracking,
};
