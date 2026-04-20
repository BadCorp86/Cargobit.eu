#!/usr/bin/env node
/**
 * =============================================================================
 * Node Reprocess Script zum sicheren Replay von Stripe Events
 * =============================================================================
 * Usage: node reprocess-stripe-events.js --dbUrl=postgres://... --webhookUrl=https://staging.example.com/webhooks/stripe
 *
 * WICHTIG: Nur in Staging oder nach Review verwenden!
 * Setze processed = true nur wenn du sicher bist, dass handler idempotent ist.
 * Teste zuerst mit 1-2 Events.
 * =============================================================================
 */

const { Client } = require('pg');
const fetch = require('node-fetch');
const argv = require('yargs').argv;

(async () => {
  const db = new Client({ connectionString: argv.dbUrl });
  await db.connect();

  const res = await db.query(
    "SELECT id, payload FROM stripe_events WHERE processed = false ORDER BY received_at LIMIT 100"
  );
  console.log(`Found ${res.rows.length} events to reprocess`);

  for (const row of res.rows) {
    try {
      const event = row.payload;
      // Post to webhook endpoint with original id in body
      const resp = await fetch(argv.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      if (resp.ok) {
        console.log(`Reprocessed ${row.id} -> ${resp.status}`);
        // Optionally mark processed only if webhook returns 200
        await db.query(
          "UPDATE stripe_events SET processed = true, processed_at = now() WHERE id = $1",
          [row.id]
        );
      } else {
        console.warn(`Webhook returned ${resp.status} for ${row.id}`);
      }
    } catch (err) {
      console.error(`Error reprocessing ${row.id}:`, err.message);
    }
  }

  await db.end();
})();
