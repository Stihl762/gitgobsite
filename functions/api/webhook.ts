// @ts-nocheck
// functions/api/webhook.ts
import Stripe from "stripe";

export const onRequestPost = async ({ request, env }: any) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature", { status: 400 });

  const body = await request.text();
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    );
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err?.message || err);
    return new Response("Webhook Error", { status: 400 });
  }

  console.log("✅ verified:", event.type, event.id);

  // --- Target 3: Idempotency lock ---
  const lockKey = `stripe_event:${event.id}`;

  // If KV isn't bound yet, fail loudly (so we don't think we're safe when we're not)
  if (!env.STRIPE_EVENTS) {
    console.error("❌ Missing KV binding: STRIPE_EVENTS");
    return new Response("Server misconfigured", { status: 500 });
  }

  const already = await env.STRIPE_EVENTS.get(lockKey);
  if (already) {
    console.log("🧱 duplicate event, skipped:", event.id);
    return new Response("ok", { status: 200 });
  }

  // Mark as processed (keep for 14 days to cover retries/disputes)
  await env.STRIPE_EVENTS.put(lockKey, "1", { expirationTtl: 60 * 60 * 24 * 14 });

  // --- Target 2 switchboard (still minimal) ---
  switch (event.type) {
    case "checkout.session.completed":
      console.log("✅ Payment succeeded (checkout.session.completed)");
      break;

    case "invoice.payment_failed":
      console.log("⚠️ Payment failed (invoice.payment_failed)");
      break;

    case "customer.subscription.deleted":
      console.log("🛑 Subscription cancelled (customer.subscription.deleted)");
      break;

    default:
      console.log("ℹ️ Unhandled event type:", event.type);
      break;
  }

  return new Response("ok", { status: 200 });
};
