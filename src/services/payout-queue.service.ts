// ============================================
// CARGOBIT PAYOUT QUEUE SERVICE
// BullMQ-based Async Job Processing
// ============================================

import { Queue, QueueEvents, Job, Worker } from 'bullmq';
import { db } from '@/lib/db';
import { PayoutStatus } from '@prisma/client';
import { payoutWorker } from './payout-worker.service';

// ============================================
// CONFIGURATION
// ============================================

const QUEUE_NAME = 'payouts';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// ============================================
// INTERFACES
// ============================================

export interface PayoutJobData {
  payoutId: string;
  attemptNumber: number;
  type: 'execute-payout' | 'retry-payout' | 'reconciliation';
}

export interface PayoutJobResult {
  success: boolean;
  payoutId: string;
  transferId?: string;
  error?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// ============================================
// PAYOUT QUEUE SERVICE
// ============================================

/**
 * Payout Queue Service
 * 
 * Manages BullMQ queue for async payout processing.
 * Provides:
 * - Job enqueue with idempotency
 * - Job status tracking
 * - Queue statistics
 * - Worker management
 * 
 * Usage:
 * ```typescript
 * const queue = PayoutQueueService.getInstance();
 * 
 * // Enqueue a payout job
 * await queue.enqueuePayout('payout_123');
 * 
 * // Get queue stats
 * const stats = await queue.getStats();
 * ```
 */
export class PayoutQueueService {
  private static instance: PayoutQueueService;
  private queue: Queue<PayoutJobData, PayoutJobResult>;
  private queueEvents: QueueEvents;
  private worker: Worker<PayoutJobData, PayoutJobResult> | null = null;
  private initialized = false;

  private constructor() {
    // Create queue
    this.queue = new Queue<PayoutJobData, PayoutJobResult>(QUEUE_NAME, {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s initial delay
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
          age: 24 * 3600, // Or 24 hours
        },
        removeOnFail: {
          count: 5000, // Keep last 5000 failed jobs
        },
      },
    });

    // Create queue events for listening
    this.queueEvents = new QueueEvents(QUEUE_NAME, {
      connection: redisConfig,
    });
  }

  static getInstance(): PayoutQueueService {
    if (!PayoutQueueService.instance) {
      PayoutQueueService.instance = new PayoutQueueService();
    }
    return PayoutQueueService.instance;
  }

  /**
   * Initialize the worker process
   * Call this in a separate worker process
   */
  initializeWorker(): void {
    if (this.worker) {
      console.log('[PayoutQueue] Worker already initialized');
      return;
    }

    this.worker = new Worker<PayoutJobData, PayoutJobResult>(
      QUEUE_NAME,
      async (job: Job<PayoutJobData>) => {
        console.log(`[PayoutQueue] Processing job ${job.id}: ${job.data.type}`);
        
        const result = await payoutWorker.processJob({
          payoutId: job.data.payoutId,
          attemptNumber: job.data.attemptNumber,
        });

        if (!result.success) {
          throw new Error(result.error || 'Payout processing failed');
        }

        return result;
      },
      {
        connection: redisConfig,
        concurrency: 5, // Process up to 5 jobs concurrently
        limiter: {
          max: 100, // Max 100 jobs
          duration: 60000, // per minute
        },
      }
    );

    // Worker event handlers
    this.worker.on('completed', (job: Job<PayoutJobData>, result: PayoutJobResult) => {
      console.log(`[PayoutQueue] Job ${job.id} completed:`, result);
    });

    this.worker.on('failed', (job: Job<PayoutJobData> | undefined, error: Error) => {
      console.error(`[PayoutQueue] Job ${job?.id} failed:`, error.message);
    });

    this.worker.on('error', (error: Error) => {
      console.error('[PayoutQueue] Worker error:', error);
    });

    this.initialized = true;
    console.log('[PayoutQueue] Worker initialized');
  }

  /**
   * Enqueue a payout for async processing
   */
  async enqueuePayout(payoutId: string, options?: {
    priority?: number;
    delay?: number;
  }): Promise<string> {
    // Check for existing job (idempotency)
    const existingJobs = await this.queue.getJobs(['waiting', 'active', 'delayed']);
    const duplicate = existingJobs.find(j => j.data.payoutId === payoutId);
    
    if (duplicate) {
      console.log(`[PayoutQueue] Job already exists for payout ${payoutId}: ${duplicate.id}`);
      return duplicate.id || '';
    }

    // Get payout to check current retry count
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
      select: { retryCount: true },
    });

    const job = await this.queue.add(
      'execute-payout',
      {
        payoutId,
        attemptNumber: (payout?.retryCount || 0) + 1,
        type: 'execute-payout',
      },
      {
        jobId: `payout_${payoutId}`,
        priority: options?.priority || 1,
        delay: options?.delay,
      }
    );

    console.log(`[PayoutQueue] Enqueued payout ${payoutId} as job ${job.id}`);
    return job.id || '';
  }

  /**
   * Enqueue a retry for a failed payout
   */
  async enqueueRetry(payoutId: string, delay: number = 60000): Promise<string> {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
      select: { retryCount: true },
    });

    const job = await this.queue.add(
      'retry-payout',
      {
        payoutId,
        attemptNumber: (payout?.retryCount || 0) + 1,
        type: 'retry-payout',
      },
      {
        jobId: `payout_retry_${payoutId}_${Date.now()}`,
        delay,
        priority: 5, // Lower priority for retries
      }
    );

    console.log(`[PayoutQueue] Enqueued retry for payout ${payoutId}`);
    return job.id || '';
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    data?: PayoutJobData;
    returnValue?: PayoutJobResult;
    failedReason?: string;
  } | null> {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id || '',
      status: state,
      progress: job.progress || 0,
      data: job.data,
      returnValue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Clean up old jobs
   */
  async cleanup(): Promise<void> {
    await this.queue.clean(1000, 100, 'completed');
    await this.queue.clean(5000, 500, 'failed');
    console.log('[PayoutQueue] Cleanup completed');
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    console.log('[PayoutQueue] Queue paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    console.log('[PayoutQueue] Queue resumed');
  }

  /**
   * Drain the queue (remove all jobs)
   */
  async drain(): Promise<void> {
    await this.queue.drain();
    console.log('[PayoutQueue] Queue drained');
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.worker?.close();
    await this.queueEvents.close();
    await this.queue.close();
    console.log('[PayoutQueue] Connections closed');
  }

  /**
   * Wait for a job to complete
   */
  async waitForJob(jobId: string, timeout: number = 30000): Promise<PayoutJobResult | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    try {
      const result = await job.waitUntilFinished(this.queueEvents, timeout);
      return result;
    } catch (error) {
      console.error(`[PayoutQueue] Wait for job ${jobId} failed:`, error);
      return null;
    }
  }

  /**
   * Get queue events for external listening
   */
  getQueueEvents(): QueueEvents {
    return this.queueEvents;
  }
}

// Export singleton
export const payoutQueue = PayoutQueueService.getInstance();
