/**
 * Reconciliation Scheduler Runner
 *
 * Standalone Entry Point für Kubernetes CronJob.
 * Führt vollständige Reconciliation mit Stripe-Abgleich durch.
 *
 * Run with: node dist/src/reconciliation/run-scheduler.js
 *
 * Environment Variables:
 * - DATABASE_URL: PostgreSQL Connection String
 * - STRIPE_SECRET_KEY: Stripe API Key
 * - NAMESPACE: Kubernetes Namespace (für Metrics)
 * - HOSTNAME: Pod Name (für Leader Lock)
 */

import { StripeReconciliationService } from './services/stripe-reconciliation.service';
import { getReconciliationMetrics } from './metrics/reconciliation.metrics';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Lock Configuration
const LOCK_KEY = 'reconciliation:leader';
const LOCK_TTL_SECONDS = 3600; // 1 Stunde

interface RunResult {
  processed: number;
  diffs: number;
  auto_resolved: number;
  needs_review: number;
  errors: number;
  duration_ms: number;
}

/**
 * Acquire Leader Lock für verteilte Systeme
 */
async function acquireLock(holderId: string): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + LOCK_TTL_SECONDS * 1000);

    const result = await prisma.$executeRaw`
      INSERT INTO leader_lock (key, holder_id, expires_at)
      VALUES (${LOCK_KEY}, ${holderId}, ${expiresAt})
      ON CONFLICT (key) DO UPDATE
      SET holder_id = ${holderId},
          expires_at = ${expiresAt},
          updated_at = NOW()
      WHERE leader_lock.expires_at < NOW() OR leader_lock.holder_id = ${holderId}
    `;

    // Prüfe ob wir den Lock haben
    const lock = await prisma.leaderLock.findUnique({
      where: { key: LOCK_KEY },
    });

    return lock?.holderId === holderId;
  } catch (error) {
    console.error('[Lock] Failed to acquire lock:', error);
    return false;
  }
}

/**
 * Release Leader Lock
 */
async function releaseLock(holderId: string): Promise<void> {
  try {
    await prisma.leaderLock.deleteMany({
      where: {
        key: LOCK_KEY,
        holderId: holderId,
      },
    });
    console.log('[Lock] Released lock');
  } catch (error) {
    console.error('[Lock] Failed to release lock:', error);
  }
}

/**
 * Cleanup abgelaufene Locks
 */
async function cleanupExpiredLocks(): Promise<void> {
  try {
    const result = await prisma.leaderLock.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    if (result.count > 0) {
      console.log(`[Cleanup] Removed ${result.count} expired locks`);
    }
  } catch (error) {
    console.error('[Cleanup] Failed to cleanup locks:', error);
  }
}

/**
 * Haupt-Reconciliation Runner
 */
async function runReconciliation(): Promise<RunResult> {
  const startTime = Date.now();
  const metrics = getReconciliationMetrics();

  console.log('='.repeat(60));
  console.log('CargoBit Payout Reconciliation');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Hostname: ${process.env.HOSTNAME || 'local'}`);
  console.log(`Namespace: ${process.env.NAMESPACE || 'default'}`);
  console.log(`Node ENV: ${process.env.NODE_ENV}`);
  console.log(`Stripe Integration: ${process.env.STRIPE_SECRET_KEY ? 'Enabled' : 'Disabled'}`);
  console.log('='.repeat(60));

  // Initialize Service
  const service = new StripeReconciliationService();

  // Run Reconciliation
  const result = await service.runFullReconciliation();

  const duration = Date.now() - startTime;

  return {
    processed: result.processed,
    diffs: result.diffs.length,
    auto_resolved: result.auto_resolved,
    needs_review: result.needs_review,
    errors: result.errors.length,
    duration_ms: duration,
  };
}

/**
 * Main Entry Point
 */
async function main() {
  const holderId = process.env.HOSTNAME || `local-${process.pid}`;
  const metrics = getReconciliationMetrics();

  console.log(`[${new Date().toISOString()}] Starting Reconciliation...`);

  try {
    // 1. Cleanup abgelaufene Locks
    await cleanupExpiredLocks();

    // 2. Versuche Lock zu erwerben
    const acquired = await acquireLock(holderId);

    if (!acquired) {
      console.log('[Leader] Not leader, skipping reconciliation run');
      metrics.recordSkipped();
      process.exit(0);
    }

    console.log(`[Leader] Acquired lock as ${holderId}`);

    // 3. Führe Reconciliation durch
    const result = await runReconciliation();

    // 4. Logge Ergebnis
    console.log('='.repeat(60));
    console.log('Reconciliation Complete');
    console.log('='.repeat(60));
    console.log(`Processed:     ${result.processed}`);
    console.log(`Diffs Found:   ${result.diffs}`);
    console.log(`Auto Resolved: ${result.auto_resolved}`);
    console.log(`Needs Review:  ${result.needs_review}`);
    console.log(`Errors:        ${result.errors}`);
    console.log(`Duration:      ${result.duration_ms}ms`);
    console.log('='.repeat(60));

    // 5. Release Lock
    await releaseLock(holderId);

    // 6. Exit Code basierend auf Fehlern
    if (result.errors > 0) {
      console.warn('[Exit] Completed with errors');
      process.exit(2); // Partial failure
    }

    console.log('[Exit] Completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('='.repeat(60));
    console.error('FATAL ERROR during reconciliation');
    console.error('='.repeat(60));
    console.error(error);

    // Versuche Lock zu releasen
    await releaseLock(holderId);

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Graceful Shutdown Handler
process.on('SIGTERM', async () => {
  console.log('[Signal] Received SIGTERM, shutting down...');
  const holderId = process.env.HOSTNAME || `local-${process.pid}`;
  await releaseLock(holderId);
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Signal] Received SIGINT, shutting down...');
  const holderId = process.env.HOSTNAME || `local-${process.pid}`;
  await releaseLock(holderId);
  await prisma.$disconnect();
  process.exit(0);
});

// Start
main();
