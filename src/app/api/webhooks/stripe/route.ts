/**
 * CargoBit Stripe Webhook API Route
 * 
 * POST /api/webhooks/stripe
 * 
 * Stripe calls this endpoint for all payment events.
 * This is the source of truth for wallet operations.
 * 
 * Python equivalent:
 * ```python
 * @webhook_router.post("/stripe/webhook")
 * async def stripe_webhook(request: Request):
 *     payload = await request.body()
 *     sig_header = request.headers.get("Stripe-Signature")
 * 
 *     event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
 * 
 *     if event["type"] == "payment_intent.succeeded":
 *         handle_pi_succeeded(event["data"]["object"])
 *     elif event["type"] == "charge.refunded":
 *         handle_charge_refunded(event["data"]["object"])
 * 
 *     return {"received": True}
 * ```
 */

import { NextRequest } from 'next/server';
import { handleStripeWebhook } from '@/services/stripe-webhook.service';

export async function POST(request: NextRequest) {
  return handleStripeWebhook(request);
}

// Stripe webhooks need raw body - disable body parsing
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
