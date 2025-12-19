// @ts-nocheck
// functions/api/webhook.ts
import Stripe from "stripe";

/**
 * KV bindings required:
 * - STRIPE_EVENTS     (idempotency)
 * - STRIPE_CUSTOMERS  (customer/tier/access records)
 *
 * Env vars required:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 */

type AccessState = "active" | "locked";

type CustomerRecord = {
  email: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  priceId: string | null;
  tier: string | null;
  access: AccessState;
  updatedAt: string; // ISO
  lastEventId: string;
  lastEventType: string;
};

const tierFromPriceId = (priceId: string | null | undefined) => {
  if (!priceId) return null;

  // TODO: Replace with your real Price IDs from Stripe
  const map: Record<string, string> = {
    // "price_123": "firstflame",
    // "price_456": "hunter",
    // "price_789": "aegis",
  };

  return map[priceId] || null;
};

const isActiveStatus = (status: string | null | undefined) => {
  return status === "active" || status === "trialing";
};

const kvKeyForCustomer = (customerId: string | null, email: string | null) => {
  // Prefer customerId because it’s stable; fallback to email if needed.
  if (customerId) return `cust:${customerId}`;
  if (email) return `email:${email.toLowerCase()}`;
  return null;
};

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

  // ---- Target 3: Idempotency lock ----
  if (!env.STRIPE_EVENTS) {
    console.error("❌ Missing KV binding: STRIPE_EVENTS");
    return new Response("Server misconfigured", { status: 500 });
  }
  if (!env.STRIPE_CUSTOMERS) {
    console.error("❌ Missing KV binding: STRIPE_CUSTOMERS");
    return new Response("Server misconfigured", { status: 500 });
  }

  const lockKey = `stripe_event:${event.id}`;
  const already = await env.STRIPE_EVENTS.get(lockKey);
  if (already) {
    console.log("🧱 duplicate event, skipped:", event.id);
    return new Response("ok", { status: 200 });
  }
  await env.STRIPE_EVENTS.put(lockKey, "1", { expirationTtl: 60 * 60 * 24 * 14 });

  // ---- Target 4: Subscription authority ----
  const now = new Date().toISOString();

  const upsertCustomerRecord = async (partial: Partial<CustomerRecord>) => {
    const key = kvKeyForCustomer(partial.customerId ?? null, partial.email ?? null);
    if (!key) {
      console.error("❌ Cannot store record: missing customerId and email");
      return;
    }

    const existingRaw = await env.STRIPE_CUSTOMERS.get(key);
    const existing: CustomerRecord | null = existingRaw ? JSON.parse(existingRaw) : null;

    const next: CustomerRecord = {
      email: existing?.email ?? null,
      customerId: existing?.customerId ?? null,
      subscriptionId: existing?.subscriptionId ?? null,
      subscriptionStatus: existing?.subscriptionStatus ?? null,
      priceId: existing?.priceId ?? null,
      tier: existing?.tier ?? null,
      access: existing?.access ?? "locked",
      updatedAt: now,
      lastEventId: event.id,
      lastEventType: event.type,
      ...partial,
    };

    await env.STRIPE_CUSTOMERS.put(key, JSON.stringify(next));
    console.log("🧾 stored record:", key, { access: next.access, tier: next.tier, status: next.subscriptionStatus });
  };

  switch (event.type) {
    // Primary grant: purchase completed, then we fetch subscription for truth.
    case "checkout.session.completed": {
      console.log("✅ checkout.session.completed");

      const session = event.data.object as Stripe.Checkout.Session;

      const customerId =
        (typeof session.customer === "string" ? session.customer : session.customer?.id) ?? null;

      const email =
        session.customer_email ??
        session.customer_details?.email ??
        null;

      const subscriptionId =
        (typeof session.subscription === "string" ? session.subscription : session.subscription?.id) ?? null;

      // If it’s subscription-only, subscriptionId should exist; if missing, we still store what we have.
      let subscriptionStatus: string | null = null;
      let priceId: string | null = null;

      try {
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });

          subscriptionStatus = sub.status ?? null;
          priceId = sub.items?.data?.[0]?.price?.id ?? null;
        }
      } catch (err: any) {
        console.error("❌ Failed to retrieve subscription for authority:", err?.message || err);
      }

      const tier = tierFromPriceId(priceId);
      const access: AccessState = isActiveStatus(subscriptionStatus) ? "active" : "locked";

      await upsertCustomerRecord({
        email,
        customerId,
        subscriptionId,
        subscriptionStatus,
        priceId,
        tier,
        access,
      });

      break;
    }

    // Ongoing authority: status changes (reactivations, pauses, upgrades, etc.)
    case "customer.subscription.updated": {
      console.log("🔁 customer.subscription.updated");

      const sub = event.data.object as Stripe.Subscription;

      const customerId = (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) ?? null;
      const subscriptionId = sub.id ?? null;
      const subscriptionStatus = sub.status ?? null;
      const priceId = sub.items?.data?.[0]?.price?.id ?? null;

      const tier = tierFromPriceId(priceId);
      const access: AccessState = isActiveStatus(subscriptionStatus) ? "active" : "locked";

      await upsertCustomerRecord({
        customerId,
        subscriptionId,
        subscriptionStatus,
        priceId,
        tier,
        access,
      });

      break;
    }

    // Payment failure: lock access (even if subscription still exists)
    case "invoice.payment_failed": {
      console.log("⚠️ invoice.payment_failed (locking access)");

      const invoice = event.data.object as Stripe.Invoice;
      const customerId = (typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id) ?? null;
      const subscriptionId =
        (typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id) ?? null;

      await upsertCustomerRecord({
        customerId,
        subscriptionId,
        access: "locked",
      });

      break;
    }

    // Subscription ended: lock access
    case "customer.subscription.deleted": {
      console.log("🛑 customer.subscription.deleted (locking access)");

      const sub = event.data.object as Stripe.Subscription;
      const customerId = (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) ?? null;

      await upsertCustomerRecord({
        customerId,
        subscriptionId: sub.id ?? null,
        subscriptionStatus: sub.status ?? "canceled",
        access: "locked",
      });

      break;
    }

    default: {
      console.log("ℹ️ Unhandled event:", event.type);
      break;
    }
  }

  return new Response("ok", { status: 200 });
};
