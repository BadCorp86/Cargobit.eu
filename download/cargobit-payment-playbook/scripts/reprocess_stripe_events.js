#!/usr/bin/env node
/**
 * =============================================================================
 * CargoBit Payment Platform - Stripe Event Reprocess Script
 * =============================================================================
 *
 * Dieses Script ermöglicht das sichere Reprocessing von Stripe Events.
 *
 * Usage:
 *   node reprocess_stripe_events.js --event-id evt_xxx
 *   node reprocess_stripe_events.js --unprocessed-only --since "1 hour ago"
 *   node reprocess_stripe_events.js --all-pending --dry-run
 *
 * Options:
 *   --event-id <id>       Specific event ID to reprocess
 *   --unprocessed-only    Only process unprocessed events
 *   --all-pending         Process all pending events
 *   --since <time>        Time filter (e.g., "1 hour ago", "2024-01-01")
 *   --dry-run             Preview without making changes
 *   --force               Skip idempotency checks (dangerous!)
 *   --verbose             Enable verbose logging
 *
 * Requirements:
 *   - Node.js 18+
 *   - PostgreSQL connection (DATABASE_URL env var)
 *   - Redis connection (REDIS_URL env var)
 *   - Stripe API key (STRIPE_SECRET_KEY env var)
 *
 * =============================================================================
 */

const { Pool } = require('pg');
const Redis = require('ioredis');
const Stripe = require('stripe');
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const cli_table = require('cli-table3');

// =============================================================================
// Configuration
// =============================================================================

const config = {
  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cargobit_payments',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    keyPrefix: 'cargobit:',
  },
  stripe: {
    apiKey: process.env.STRIPE_SECRET_KEY,
    apiVersion: '2023-10-16',
  },
  webhook: {
    endpoint: process.env.WEBHOOK_ENDPOINT || 'http://localhost:3000/webhooks/stripe',
    signingSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
};

// =============================================================================
// CLI Setup
// =============================================================================

program
  .name('reprocess-stripe-events')
  .description('Reprocess Stripe webhook events for CargoBit Payment Platform')
  .version('1.0.0')
  .option('-e, --event-id <id>', 'Specific event ID to reprocess')
  .option('-u, --unprocessed-only', 'Only process unprocessed events')
  .option('-a, --all-pending', 'Process all pending events')
  .option('-s, --since <time>', 'Time filter (e.g., "1 hour ago", "2024-01-01")')
  .option('-d, --dry-run', 'Preview without making changes')
  .option('-f, --force', 'Skip idempotency checks (dangerous!)')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-l, --limit <number>', 'Maximum number of events to process', parseInt, 100)
  .option('--batch-size <number>', 'Batch size for bulk processing', parseInt, 10)
  .option('--delay <ms>', 'Delay between events in milliseconds', parseInt, 500)
  .parse(process.argv);

const options = program.opts();

// =============================================================================
// Logging Utilities
// =============================================================================

const log = {
  info: (msg) => options.verbose && console.log(chalk.blue('[INFO]'), msg),
  success: (msg) => console.log(chalk.green('[SUCCESS]'), msg),
  warning: (msg) => console.log(chalk.yellow('[WARNING]'), msg),
  error: (msg) => console.log(chalk.red('[ERROR]'), msg),
  dryRun: (msg) => options.dryRun && console.log(chalk.gray('[DRY-RUN]'), msg),
  verbose: (msg) => options.verbose && console.log(chalk.gray('[VERBOSE]'), msg),
};

// =============================================================================
// Database Client
// =============================================================================

class DatabaseClient {
  constructor() {
    this.pool = new Pool(config.database);
  }

  async query(sql, params = []) {
    const start = Date.now();
    const result = await this.pool.query(sql, params);
    const duration = Date.now() - start;
    log.verbose(`Query executed in ${duration}ms`);
    return result;
  }

  async getEvent(eventId) {
    const result = await this.query(
      'SELECT * FROM stripe_events WHERE id = $1',
      [eventId]
    );
    return result.rows[0];
  }

  async getUnprocessedEvents(since, limit) {
    let sql = `
      SELECT id, type, payload, created_at
      FROM stripe_events
      WHERE processed = false
    `;
    const params = [];

    if (since) {
      const sinceDate = parseTimeFilter(since);
      sql += ' AND created_at >= $1';
      params.push(sinceDate);
    }

    sql += ' ORDER BY created_at ASC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await this.query(sql, params);
    return result.rows;
  }

  async getAllEvents(since, limit) {
    let sql = `
      SELECT id, type, payload, processed, created_at
      FROM stripe_events
      WHERE 1=1
    `;
    const params = [];

    if (since) {
      const sinceDate = parseTimeFilter(since);
      sql += ' AND created_at >= $1';
      params.push(sinceDate);
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await this.query(sql, params);
    return result.rows;
  }

  async markEventProcessed(eventId, txId) {
    if (options.dryRun) {
      log.dryRun(`Would mark event ${eventId} as processed`);
      return;
    }

    await this.query(
      `UPDATE stripe_events
       SET processed = true, processed_at = NOW()
       WHERE id = $1`,
      [eventId]
    );
  }

  async getPaymentByIntentId(paymentIntentId) {
    const result = await this.query(
      'SELECT * FROM payments WHERE stripe_payment_intent_id = $1',
      [paymentIntentId]
    );
    return result.rows[0];
  }

  async getWalletTransactions(reference) {
    const result = await this.query(
      'SELECT * FROM wallet_transactions WHERE reference = $1',
      [reference]
    );
    return result.rows;
  }

  async end() {
    await this.pool.end();
  }
}

// =============================================================================
// Redis Client
// =============================================================================

class RedisClient {
  constructor() {
    this.client = new Redis(config.redis);
  }

  async acquireLock(key, ttl = 30000) {
    const lockKey = `lock:${key}`;
    const token = Date.now().toString();

    const result = await this.client.set(lockKey, token, 'PX', ttl, 'NX');
    return result === 'OK';
  }

  async releaseLock(key) {
    const lockKey = `lock:${key}`;
    await this.client.del(lockKey);
  }

  async checkIdempotency(eventId) {
    const key = `idempotency:event:${eventId}`;
    const exists = await this.client.exists(key);

    if (exists && !options.force) {
      return false; // Already processed
    }

    if (!options.dryRun) {
      // Set idempotency key with 24h TTL
      await this.client.set(key, Date.now().toString(), 'EX', 86400);
    }

    return true;
  }

  async end() {
    await this.client.quit();
  }
}

// =============================================================================
// Stripe Client Wrapper
// =============================================================================

class StripeClient {
  constructor() {
    this.stripe = new Stripe(config.stripe.apiKey, {
      apiVersion: config.stripe.apiVersion,
    });
  }

  async getEvent(eventId) {
    return await this.stripe.events.retrieve(eventId);
  }

  constructWebhookEvent(payload, signature) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      config.webhook.signingSecret
    );
  }

  generateTestSignature(payload) {
    // For testing purposes only
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = typeof payload === 'object' ? JSON.stringify(payload) : payload;
    return `t=${timestamp},v1=test_signature`;
  }
}

// =============================================================================
// Webhook Sender
// =============================================================================

class WebhookSender {
  constructor() {
    this.endpoint = config.webhook.endpoint;
    this.signingSecret = config.webhook.signingSecret;
  }

  async sendEvent(event) {
    const payload = typeof event.payload === 'string'
      ? event.payload
      : JSON.stringify(event.payload || event);

    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadToSign = `${timestamp}.${payload}`;
    const signature = this.generateSignature(payloadToSign);

    const headers = {
      'Content-Type': 'application/json',
      'Stripe-Signature': `t=${timestamp},v1=${signature}`,
    };

    if (options.dryRun) {
      log.dryRun(`Would POST to ${this.endpoint}`);
      log.dryRun(`Event: ${event.id || event.type}`);
      return { status: 200, data: { received: true } };
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: payload,
      });

      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      return { status: 500, error: error.message };
    }
  }

  generateSignature(payload) {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');
  }
}

// =============================================================================
// Time Filter Parser
// =============================================================================

function parseTimeFilter(timeStr) {
  if (!timeStr) return null;

  // Relative time
  const relativeMatch = timeStr.match(/^(\d+)\s+(hour|day|week|month)s?\s+ago$/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const date = new Date();

    switch (unit) {
      case 'hour': date.setHours(date.getHours() - amount); break;
      case 'day': date.setDate(date.getDate() - amount); break;
      case 'week': date.setDate(date.getDate() - amount * 7); break;
      case 'month': date.setMonth(date.getMonth() - amount); break;
    }

    return date;
  }

  // ISO date
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  throw new Error(`Invalid time filter: ${timeStr}`);
}

// =============================================================================
// Main Reprocessor
// =============================================================================

class EventReprocessor {
  constructor() {
    this.db = new DatabaseClient();
    this.redis = new RedisClient();
    this.stripe = new StripeClient();
    this.webhook = new WebhookSender();
    this.stats = {
      total: 0,
      success: 0,
      skipped: 0,
      failed: 0,
    };
  }

  async init() {
    log.info('Initializing reprocessor...');

    // Test database connection
    try {
      await this.db.query('SELECT 1');
      log.info('Database connection OK');
    } catch (error) {
      log.error(`Database connection failed: ${error.message}`);
      throw error;
    }

    // Test Redis connection
    try {
      await this.redis.client.ping();
      log.info('Redis connection OK');
    } catch (error) {
      log.warning(`Redis connection failed: ${error.message}`);
      if (!options.force) {
        throw new Error('Redis required for idempotency checks. Use --force to skip.');
      }
    }

    return this;
  }

  async processEvent(event) {
    const eventId = event.id || event.stripe_event_id;
    log.info(`Processing event: ${eventId} (${event.type})`);

    // Idempotency check
    if (!options.force) {
      const canProcess = await this.redis.checkIdempotency(eventId);
      if (!canProcess) {
        log.warning(`Event ${eventId} already processed, skipping`);
        this.stats.skipped++;
        return { status: 'skipped', reason: 'already_processed' };
      }
    }

    // Send to webhook endpoint
    const result = await this.webhook.sendEvent(event);

    if (result.status === 200) {
      await this.db.markEventProcessed(eventId);
      this.stats.success++;
      log.success(`Event ${eventId} processed successfully`);
      return { status: 'success' };
    } else {
      this.stats.failed++;
      log.error(`Event ${eventId} failed: ${result.error || result.data?.error}`);
      return { status: 'failed', error: result.error || result.data?.error };
    }
  }

  async reprocessSingle(eventId) {
    log.info(`Reprocessing single event: ${eventId}`);

    // Try to get from database first
    let event = await this.db.getEvent(eventId);

    if (!event) {
      // Try to fetch from Stripe
      try {
        const stripeEvent = await this.stripe.getEvent(eventId);
        event = {
          id: stripeEvent.id,
          type: stripeEvent.type,
          payload: JSON.stringify(stripeEvent),
        };
      } catch (error) {
        log.error(`Event ${eventId} not found in database or Stripe`);
        return { status: 'not_found' };
      }
    }

    this.stats.total = 1;
    return await this.processEvent(event);
  }

  async reprocessUnprocessed(since, limit) {
    log.info(`Fetching unprocessed events since: ${since || 'all time'}`);

    const events = await this.db.getUnprocessedEvents(since, limit);
    this.stats.total = events.length;

    log.info(`Found ${events.length} unprocessed events`);

    if (events.length === 0) {
      log.success('No unprocessed events found');
      return;
    }

    // Display events table
    this.displayEventsTable(events);

    // Confirm if not dry-run
    if (!options.dryRun) {
      const confirmed = await this.confirmProcessing(events.length);
      if (!confirmed) {
        log.warning('Processing cancelled');
        return;
      }
    }

    // Process events
    const spinner = ora('Processing events...').start();

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      spinner.text = `Processing event ${i + 1}/${events.length}: ${event.id}`;

      await this.processEvent(event);

      // Delay between events
      if (i < events.length - 1 && options.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
    }

    spinner.stop();
  }

  async reprocessAll(since, limit) {
    log.info(`Fetching all events since: ${since || 'all time'}`);

    const events = await this.db.getAllEvents(since, limit);
    this.stats.total = events.length;

    log.info(`Found ${events.length} events`);

    if (events.length === 0) {
      log.success('No events found');
      return;
    }

    this.displayEventsTable(events);

    if (!options.dryRun) {
      const confirmed = await this.confirmProcessing(events.length);
      if (!confirmed) {
        log.warning('Processing cancelled');
        return;
      }
    }

    const spinner = ora('Processing events...').start();

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      spinner.text = `Processing event ${i + 1}/${events.length}: ${event.id}`;

      await this.processEvent(event);

      if (i < events.length - 1 && options.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
    }

    spinner.stop();
  }

  displayEventsTable(events) {
    const table = new cli_table({
      head: ['ID', 'Type', 'Processed', 'Created'],
      colWidths: [30, 35, 12, 20],
    });

    events.forEach(event => {
      table.push([
        event.id.substring(0, 28),
        event.type,
        event.processed ? 'Yes' : 'No',
        new Date(event.created_at).toISOString(),
      ]);
    });

    console.log(table.toString());
  }

  async confirmProcessing(count) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      readline.question(
        `\nProcess ${count} events? [y/N] `,
        answer => {
          readline.close();
          resolve(answer.toLowerCase() === 'y');
        }
      );
    });
  }

  displayStats() {
    console.log('\n' + chalk.bold('=== Processing Summary ==='));
    console.log(`Total Events:   ${this.stats.total}`);
    console.log(chalk.green(`Successful:     ${this.stats.success}`));
    console.log(chalk.yellow(`Skipped:        ${this.stats.skipped}`));
    console.log(chalk.red(`Failed:         ${this.stats.failed}`));

    if (options.dryRun) {
      console.log(chalk.gray('\n(Dry-run mode - no changes made)'));
    }
  }

  async cleanup() {
    await this.db.end();
    await this.redis.end();
  }
}

// =============================================================================
// Main Execution
// =============================================================================

async function main() {
  console.log(chalk.bold.blue('\n🔄 CargoBit Stripe Event Reprocessor\n'));

  if (options.dryRun) {
    console.log(chalk.yellow('⚠️  DRY-RUN MODE - No changes will be made\n'));
  }

  if (options.force) {
    console.log(chalk.red('⚠️  FORCE MODE - Idempotency checks disabled\n'));
  }

  const reprocessor = new EventReprocessor();

  try {
    await reprocessor.init();

    // Determine processing mode
    if (options.eventId) {
      await reprocessor.reprocessSingle(options.eventId);
    } else if (options.unprocessedOnly) {
      await reprocessor.reprocessUnprocessed(options.since, options.limit);
    } else if (options.allPending) {
      await reprocessor.reprocessAll(options.since, options.limit);
    } else {
      // Default: show help
      program.help();
    }

    reprocessor.displayStats();

  } catch (error) {
    log.error(error.message);
    process.exit(1);
  } finally {
    await reprocessor.cleanup();
  }
}

// Run main function
main();
