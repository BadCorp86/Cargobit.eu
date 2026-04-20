#!/usr/bin/env node
/**
 * =============================================================================
 * Erweitertes Reprocess Script mit Dry-Run und Bestätigung
 * =============================================================================
 * Usage:
 *   node reprocess-stripe-events-safe.js --dbUrl=postgres://... --webhookUrl=... --dry-run
 *   node reprocess-stripe-events-safe.js --dbUrl=postgres://... --webhookUrl=... --event-id=evt_xxx
 *   node reprocess-stripe-events-safe.js --dbUrl=postgres://... --webhookUrl=... --limit=10
 *
 * Options:
 *   --dry-run        Nur simulieren, keine Änderungen
 *   --event-id       Spezifisches Event reprocessen
 *   --limit          Maximale Anzahl Events (default: 10)
 *   --force          Keine Bestätigung anfordern
 * =============================================================================
 */

const { Client } = require('pg');
const fetch = require('node-fetch');
const readline = require('readline');

const args = require('yargs')
  .option('dbUrl', { type: 'string', demandOption: true })
  .option('webhookUrl', { type: 'string', demandOption: true })
  .option('dry-run', { type: 'boolean', default: false })
  .option('event-id', { type: 'string' })
  .option('limit', { type: 'number', default: 10 })
  .option('force', { type: 'boolean', default: false })
  .argv;

async function confirm(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${message} [y/N] `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  console.log('\n🔄 Stripe Event Reprocessor\n');
  if (args['dry-run']) {
    console.log('⚠️  DRY-RUN MODE - No changes will be made\n');
  }

  const db = new Client({ connectionString: args.dbUrl });
  await db.connect();

  let query, params;
  if (args['event-id']) {
    query = 'SELECT id, payload FROM stripe_events WHERE id = $1';
    params = [args['event-id']];
  } else {
    query = `SELECT id, payload FROM stripe_events WHERE processed = false ORDER BY received_at LIMIT $1`;
    params = [args.limit];
  }

  const res = await db.query(query, params);
  console.log(`Found ${res.rows.length} events to process\n`);

  if (res.rows.length === 0) {
    console.log('No events to process.');
    await db.end();
    return;
  }

  // Display events
  res.rows.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.id}`);
  });
  console.log('');

  // Confirm
  if (!args['dry-run'] && !args.force) {
    const ok = await confirm(`Process ${res.rows.length} events?`);
    if (!ok) {
      console.log('Cancelled.');
      await db.end();
      return;
    }
  }

  let success = 0, failed = 0;

  for (const row of res.rows) {
    try {
      if (args['dry-run']) {
        console.log(`[DRY-RUN] Would reprocess ${row.id}`);
        success++;
        continue;
      }

      const resp = await fetch(args.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row.payload),
      });

      if (resp.ok) {
        console.log(`✅ Reprocessed ${row.id} -> ${resp.status}`);
        await db.query(
          'UPDATE stripe_events SET processed = true, processed_at = now() WHERE id = $1',
          [row.id]
        );
        success++;
      } else {
        console.warn(`❌ Webhook returned ${resp.status} for ${row.id}`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ Error ${row.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${success} success, ${failed} failed`);
  await db.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
