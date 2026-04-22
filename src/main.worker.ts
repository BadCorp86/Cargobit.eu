// src/main.worker.ts
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
loadEnv();

import { startPayoutWorker } from './payments/workers/payout-worker';
import { Logger } from '@nestjs/common';

const logger = new Logger('main.worker');

async function bootstrap() {
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = Number(process.env.REDIS_PORT || 6379);

  logger.log(`Starting payout worker connecting to Redis ${redisHost}:${redisPort}`);

  const redisOpts = { host: redisHost, port: redisPort };

  const worker = startPayoutWorker(redisOpts);

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down worker');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down worker');
    await worker.close();
    process.exit(0);
  });

  worker.on('completed', job => {
    logger.log(`Job completed ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job failed ${job?.id}`, err?.message || err);
  });

  logger.log('Payout worker started');
}

bootstrap().catch(err => {
  logger.error('Worker bootstrap failed', err);
  process.exit(1);
});
