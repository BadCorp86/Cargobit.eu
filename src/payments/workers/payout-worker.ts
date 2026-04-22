// src/payments/workers/payout-worker.ts
import { Worker, Job } from 'bullmq';
import { Logger } from '@nestjs/common';

const logger = new Logger('PayoutWorker');

export interface PayoutJobData {
  payoutId: string;
  userId: string;
  amountCents: number;
  currency: string;
  iban: string;
  reference: string;
}

export interface PayoutJobResult {
  success: boolean;
  payoutId: string;
  externalId?: string;
  error?: string;
}

export function startPayoutWorker(redisOpts: { host: string; port: number }): Worker {
  const worker = new Worker<PayoutJobData, PayoutJobResult>(
    'payouts',
    async (job: Job<PayoutJobData>) => {
      const { payoutId, userId, amountCents, currency, iban, reference } = job.data;
      
      logger.log(`Processing payout ${payoutId} for user ${userId}`);
      logger.debug(`Amount: ${amountCents} ${currency}, IBAN: ${iban.slice(-4)}`);
      
      try {
        // TODO: Integrate with actual payment provider (Stripe, GoCardless, etc.)
        // For now, simulate a successful payout
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const externalId = `ext_${Date.now()}_${payoutId.slice(0, 8)}`;
        
        logger.log(`Payout ${payoutId} completed successfully. External ID: ${externalId}`);
        
        return {
          success: true,
          payoutId,
          externalId,
        };
      } catch (error: any) {
        logger.error(`Payout ${payoutId} failed: ${error.message}`);
        
        return {
          success: false,
          payoutId,
          error: error.message,
        };
      }
    },
    {
      connection: redisOpts,
      concurrency: 5,
      limiter: {
        max: 100,
        duration: 60000, // 100 jobs per minute
      },
    }
  );

  worker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  return worker;
}

export default startPayoutWorker;
