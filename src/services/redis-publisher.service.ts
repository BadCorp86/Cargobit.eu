/**
 * CargoBit Redis Publisher Service
 * 
 * Publisher-Seite (API-Service):
 * - führt Business-Logik aus
 * - erzeugt Events (Job-Status, neue Bids, Tracking-Events, Notifications)
 * - published diese Events nach Redis (PUBLISH job:123 {...})
 * 
 * Architecture:
 * API-Nodes → Redis PUBLISH → WS-Nodes broadcast → Clients
 * 
 * Python equivalent:
 * ```python
 * import json
 * import redis
 * 
 * redis_client = redis.Redis(host="redis", port=6379, decode_responses=True)
 * 
 * def publish_event(channel: str, payload: dict):
 *     redis_client.publish(channel, json.dumps(payload))
 * ```
 */

import Redis from 'ioredis';

// ============================================
// TYPES
// ============================================

export interface JobStatusPayload {
  jobId: string;
  status: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UserNotificationPayload {
  userId: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface BidPayload {
  bidId: string;
  jobId: string;
  transporterId: string;
  amount: number;
  status: string;
  timestamp: string;
}

export interface TrackingPayload {
  jobId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export interface MatchPayload {
  matchId: string;
  jobId: string;
  score: number;
  transporterId: string;
  timestamp: string;
}

// ============================================
// CONFIGURATION
// ============================================

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Singleton Redis publisher client
let publisher: Redis | null = null;

// ============================================
// REDIS CONNECTION
// ============================================

/**
 * Get or create Redis publisher instance.
 */
export function getRedisPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          console.error('[Redis Publisher] Connection failed after 10 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });
    
    publisher.on('connect', () => console.log('[Redis Publisher] Connected'));
    publisher.on('error', (err) => console.error('[Redis Publisher] Error:', err));
    publisher.on('close', () => console.warn('[Redis Publisher] Connection closed'));
  }
  
  return publisher;
}

// ============================================
// CORE PUBLISH FUNCTION
// ============================================

/**
 * Publish event to Redis channel.
 * 
 * Python equivalent:
 * ```python
 * def publish_event(channel: str, payload: dict):
 *     redis_client.publish(channel, json.dumps(payload))
 * ```
 * 
 * @param channel - Redis channel name (e.g., "job:123", "user:456")
 * @param payload - Event payload as object
 */
export async function publishEvent(channel: string, payload: Record<string, unknown>): Promise<void> {
  const redis = getRedisPublisher();
  const message = JSON.stringify(payload);
  
  await redis.publish(channel, message);
  console.log(`[Redis Publisher] Published to ${channel}:`, payload);
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Broadcast job status update.
 * 
 * Python equivalent:
 * ```python
 * def broadcast_job_status(job):
 *     publish_event(
 *         f"job:{job.id}",
 *         {"jobId": str(job.id), "status": job.status}
 *     )
 * ```
 * 
 * @param job - Job object with id and status
 */
export async function broadcastJobStatus(job: { id: string; status: string }): Promise<void> {
  const payload: JobStatusPayload = {
    jobId: job.id,
    status: job.status,
    timestamp: new Date().toISOString(),
  };
  
  await publishEvent(`job:${job.id}`, payload);
}

/**
 * Broadcast job status with additional metadata.
 */
export async function broadcastJobStatusWithMetadata(
  job: { id: string; status: string },
  metadata: Record<string, unknown>
): Promise<void> {
  const payload: JobStatusPayload = {
    jobId: job.id,
    status: job.status,
    timestamp: new Date().toISOString(),
    metadata,
  };
  
  await publishEvent(`job:${job.id}`, payload);
}

/**
 * Notify a specific user.
 * 
 * Python equivalent:
 * ```python
 * def notify_user(user_id, message):
 *     publish_event(
 *         f"user:{user_id}",
 *         {"userId": str(user_id), "message": message}
 *     )
 * ```
 * 
 * @param userId - User ID to notify
 * @param message - Notification message
 * @param type - Notification type (info, success, warning, error)
 * @param data - Additional data
 */
export async function notifyUser(
  userId: string,
  message: string,
  type: UserNotificationPayload['type'] = 'info',
  data?: Record<string, unknown>
): Promise<void> {
  const payload: UserNotificationPayload = {
    userId,
    message,
    type,
    timestamp: new Date().toISOString(),
    data,
  };
  
  await publishEvent(`user:${userId}`, payload);
}

/**
 * Broadcast new bid on a job.
 */
export async function broadcastNewBid(bid: {
  bidId: string;
  jobId: string;
  transporterId: string;
  amount: number;
}): Promise<void> {
  const payload: BidPayload = {
    ...bid,
    status: 'new',
    timestamp: new Date().toISOString(),
  };
  
  await publishEvent(`job:${bid.jobId}`, payload);
  await publishEvent(`bid:${bid.bidId}`, payload);
}

/**
 * Broadcast tracking update.
 */
export async function broadcastTrackingUpdate(tracking: {
  jobId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}): Promise<void> {
  const payload: TrackingPayload = {
    ...tracking,
    timestamp: new Date().toISOString(),
  };
  
  await publishEvent(`tracking:${tracking.jobId}`, payload);
}

/**
 * Broadcast match result from ML-Inference.
 */
export async function broadcastMatchResult(match: {
  matchId: string;
  jobId: string;
  score: number;
  transporterId: string;
}): Promise<void> {
  const payload: MatchPayload = {
    ...match,
    timestamp: new Date().toISOString(),
  };
  
  await publishEvent(`match:${match.matchId}`, payload);
  await publishEvent(`job:${match.jobId}`, { type: 'match', ...payload });
}

/**
 * Broadcast dispute update.
 */
export async function broadcastDisputeUpdate(dispute: {
  disputeId: string;
  jobId: string;
  status: string;
  action?: string;
}): Promise<void> {
  const payload = {
    ...dispute,
    timestamp: new Date().toISOString(),
  };
  
  await publishEvent(`dispute:${dispute.disputeId}`, payload);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Publish to multiple channels at once.
 */
export async function publishToMany(
  channels: string[],
  payload: Record<string, unknown>
): Promise<void> {
  const redis = getRedisPublisher();
  const message = JSON.stringify(payload);
  
  // Use pipeline for efficiency
  const pipeline = redis.pipeline();
  for (const channel of channels) {
    pipeline.publish(channel, message);
  }
  await pipeline.exec();
  
  console.log(`[Redis Publisher] Published to ${channels.length} channels`);
}

/**
 * Close publisher connection (for graceful shutdown).
 */
export async function closePublisher(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
    console.log('[Redis Publisher] Connection closed');
  }
}

// ============================================
// EXPORT
// ============================================

export const redisPublisher = {
  getRedisPublisher,
  publishEvent,
  broadcastJobStatus,
  broadcastJobStatusWithMetadata,
  notifyUser,
  broadcastNewBid,
  broadcastTrackingUpdate,
  broadcastMatchResult,
  broadcastDisputeUpdate,
  publishToMany,
  closePublisher,
};
