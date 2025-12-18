// @ts-nocheck
// functions/api/webhook.ts
// Cloudflare Pages Functions (Workers runtime)
//
// TARGET 1 ONLY:
// ✅ Receive Stripe event
// ✅ Verify signature with raw body
// ✅ Log event.type + event.id
// ✅ Return 200 quickly
//
// After Target 1 is proven stable, we will re-add tier assignment, aliasing, emails, etc.

import Stripe from "stripe";

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  // 1) Read required Stripe header
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  // 2) IMPORTANT: Use the RAW body string (do not JSON.parse before verifying)
  const body = await request.text();

  // 3) Create Stripe client
  // env.STRIPE_SECRET_KEY should be your TEST secret while testing
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  // 4) Cloudflare Workers/Pages verification uses async WebCrypto provider
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

  // 5) Target 1 success log lines
  console.log("✅ Stripe webhook verified");
  console.log("type:", event.type);
  console.log("id:", event.id);

  // Optional: useful during testing to confirm livemode/testmode quickly
  // (Stripe sends "livemode" on the event object)
  // @ts-ignore
  console.log("livemode:", event.livemode);

  // 6) Return 2xx fast so Stripe stops retrying
  return new Response("ok", { status: 200 });
};
