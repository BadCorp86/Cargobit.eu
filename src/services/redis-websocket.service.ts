/**
 * CargoBit Redis WebSocket Service
 * 
 * Redis Pub/Sub for real-time job status broadcasting.
 * Enables horizontal scaling of WebSocket connections.
 * 
 * Architecture:
 * - Publishers: API servers publishing job updates
 * - Subscribers: WebSocket servers listening for updates
 * - Channel: job:{job_id}
 */

import { Redis } from 'ioredis';
import type { TransportStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface JobUpdatePayload {
  jobId: string;
  status: TransportStatus;
  eventType?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface TrackingUpdatePayload {
  jobId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export interface DisputeUpdatePayload {
  disputeId: string;
  jobId: string;
  status: string;
  action?: string;
  timestamp: string;
}

type WebSocketMessageHandler = (channel: string, message: string) => void;

// ============================================
// REDIS CONFIGURATION
// ============================================

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JOB_CHANNEL_PREFIX = 'job:';
const TRACKING_CHANNEL_PREFIX = 'tracking:';
const DISPUTE_CHANNEL_PREFIX = 'dispute:';

// Singleton Redis clients
let publisher: Redis | null = null;
let subscriber: Redis | null = null;

// ============================================
// REDIS PUBLISHER
// ============================================

export function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[Redis] Publisher connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
    });
    
    publisher.on('connect', () => console.log('[Redis] Publisher connected'));
    publisher.on('error', (err) => console.error('[Redis] Publisher error:', err));
  }
  
  return publisher;
}

// ============================================
// REDIS SUBSCRIBER
// ============================================

export function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required for subscriber mode
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[Redis] Subscriber connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
    });
    
    subscriber.on('connect', () => console.log('[Redis] Subscriber connected'));
    subscriber.on('error', (err) => console.error('[Redis] Subscriber error:', err));
  }
  
  return subscriber;
}

// ============================================
// PUBLISH FUNCTIONS
// ============================================

/**
 * Broadcast job status update to all WebSocket servers.
 * 
 * Channel: job:{job_id}
 * 
 * Python equivalent:
 * ```python
 * def broadcast_job_update(job_id, status, event_type):
 *     payload = {
 *         "jobId": str(job_id),
 *         "status": status,
 *         "eventType": event_type,
 *         "timestamp": datetime.utcnow().isoformat()
 *     }
 *     redis.publish(f"job:{job_id}", json.dumps(payload))
 * ```
 */
export async function broadcastJobUpdate(
  jobId: string,
  status: TransportStatus,
  eventType?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const redis = getPublisher();
  const channel = `${JOB_CHANNEL_PREFIX}${jobId}`;
  
  const payload: JobUpdatePayload = {
    jobId,
    status,
    eventType,
    timestamp: new Date().toISOString(),
    metadata,
  };
  
  await redis.publish(channel, JSON.stringify(payload));
  console.log(`[Redis] Published to ${channel}:`, payload);
}

/**
 * Broadcast GPS tracking update.
 * 
 * Channel: tracking:{job_id}
 */
export async function broadcastTrackingUpdate(
  payload: TrackingUpdatePayload
): Promise<void> {
  const redis = getPublisher();
  const channel = `${TRACKING_CHANNEL_PREFIX}${payload.jobId}`;
  
  await redis.publish(channel, JSON.stringify(payload));
}

/**
 * Broadcast dispute status update.
 * 
 * Channel: dispute:{dispute_id}
 */
export async function broadcastDisputeUpdate(
  payload: DisputeUpdatePayload
): Promise<void> {
  const redis = getPublisher();
  const channel = `${DISPUTE_CHANNEL_PREFIX}${payload.disputeId}`;
  
  await redis.publish(channel, JSON.stringify(payload));
}

// ============================================
// SUBSCRIBE FUNCTIONS
// ============================================

/**
 * Subscribe to job updates for a specific job.
 * 
 * Python equivalent:
 * ```python
 * def subscribe_job(job_id, callback):
 *     pubsub = redis.pubsub()
 *     pubsub.subscribe(f"job:{job_id}")
 *     for message in pubsub.listen():
 *         if message["type"] == "message":
 *             callback(json.loads(message["data"]))
 * ```
 */
export async function subscribeToJob(
  jobId: string,
  callback: (payload: JobUpdatePayload) => void
): Promise<() => void> {
  const redis = getSubscriber();
  const channel = `${JOB_CHANNEL_PREFIX}${jobId}`;
  
  const handler: WebSocketMessageHandler = (ch, message) => {
    if (ch === channel) {
      try {
        const payload = JSON.parse(message) as JobUpdatePayload;
        callback(payload);
      } catch (err) {
        console.error('[Redis] Failed to parse message:', err);
      }
    }
  };
  
  redis.on('message', handler);
  await redis.subscribe(channel);
  
  console.log(`[Redis] Subscribed to ${channel}`);
  
  // Return unsubscribe function
  return async () => {
    redis.off('message', handler);
    await redis.unsubscribe(channel);
    console.log(`[Redis] Unsubscribed from ${channel}`);
  };
}

/**
 * Subscribe to all job updates (for WebSocket server).
 */
export async function subscribeToAllJobs(
  callback: (payload: JobUpdatePayload) => void
): Promise<() => void> {
  const redis = getSubscriber();
  const pattern = `${JOB_CHANNEL_PREFIX}*`;
  
  const handler: WebSocketMessageHandler = (channel, message) => {
    if (channel.startsWith(JOB_CHANNEL_PREFIX)) {
      try {
        const payload = JSON.parse(message) as JobUpdatePayload;
        callback(payload);
      } catch (err) {
        console.error('[Redis] Failed to parse message:', err);
      }
    }
  };
  
  redis.on('message', handler);
  await redis.psubscribe(pattern);
  
  console.log(`[Redis] Subscribed to pattern ${pattern}`);
  
  return async () => {
    redis.off('message', handler);
    await redis.punsubscribe(pattern);
  };
}

/**
 * Subscribe to tracking updates.
 */
export async function subscribeToTracking(
  jobId: string,
  callback: (payload: TrackingUpdatePayload) => void
): Promise<() => void> {
  const redis = getSubscriber();
  const channel = `${TRACKING_CHANNEL_PREFIX}${jobId}`;
  
  const handler: WebSocketMessageHandler = (ch, message) => {
    if (ch === channel) {
      try {
        const payload = JSON.parse(message) as TrackingUpdatePayload;
        callback(payload);
      } catch (err) {
        console.error('[Redis] Failed to parse tracking message:', err);
      }
    }
  };
  
  redis.on('message', handler);
  await redis.subscribe(channel);
  
  return async () => {
    redis.off('message', handler);
    await redis.unsubscribe(channel);
  };
}

// ============================================
// EXPORT
// ============================================

export const redisWebSocket = {
  // Publisher
  getPublisher,
  broadcastJobUpdate,
  broadcastTrackingUpdate,
  broadcastDisputeUpdate,
  
  // Subscriber
  getSubscriber,
  subscribeToJob,
  subscribeToAllJobs,
  subscribeToTracking,
};
