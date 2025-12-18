// @ts-nocheck
// functions/api/webhook.ts
// Cloudflare Pages Functions (Workers runtime)
//
// TARGET 1 + TARGET 2:
// ✅ Receive Stripe event
// ✅ Verify signature with raw body (constructEventAsync + WebCrypto)
// ✅ Log event.type + event.id
// ✅ Classify core events (switchboard)
// ✅ Return 200 quickly
//
// Next targets (later): idempotency, tier authority, emails/alias actions.

import Stripe from "stripe";

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  // RAW body required for Stripe signature verification
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

  // --- Target 1 success logs ---
  console.log("✅ Stripe webhook verified");
  console.log("type:", event.type);
  console.log("id:", event.id);
  // @ts-ignore
  console.log("livemode:", event.livemode);

  // --- Target 2: Event classification (control) ---
  switch (event.type) {
    case "checkout.session.completed": {
      console.log("✅ Payment succeeded (checkout.session.completed)");
      // Minimal visibility for debugging:
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("session.id:", session.id);
      console.log("mode:", session.mode); // "payment" or "subscription"
      console.log("customer:", session.customer);
      console.log("customer_email:", session.customer_email);
      console.log("payment_status:", session.payment_status);
      break;
    }

    case "invoice.payment_failed": {
      console.log("⚠️ Payment failed (invoice.payment_failed)");
      const invoice = event.data.object as Stripe.Invoice;
      console.log("invoice.id:", invoice.id);
      console.log("customer:", invoice.customer);
      console.log("subscription:", invoice.subscription);
      break;
    }

    case "customer.subscription.deleted": {
      console.log("🛑 Subscription cancelled (customer.subscription.deleted)");
      const sub = event.data.object as Stripe.Subscription;
      console.log("subscription.id:", sub.id);
      console.log("customer:", sub.customer);
      // @ts-ignore
      console.log("status:", sub.status);
      break;
    }

    default: {
      console.log("ℹ️ Unhandled event type:", event.type);
      break;
    }
  }

  // Always return 2xx quickly so Stripe does not retry
  return new Response("ok", { status: 200 });
};
