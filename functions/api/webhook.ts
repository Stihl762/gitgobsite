// @ts-nocheck
// functions/api/webhook.ts
import Stripe from "stripe";

/**
 * KV bindings required (Cloudflare):
 * - STRIPE_EVENTS     (idempotency + welcome-sent markers)
 * - STRIPE_CUSTOMERS  (customer/tier/access records)
 *
 * Env vars required (Cloudflare):
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 *
 * Env vars for Stripe Price IDs (Cloudflare Secrets):
 * - STRIPE_PRICE_ID_FIRSTFLAME
 *   (add more later)
 *
 * Env vars to call Fly alias/email engine (Option A):
 * - GOBLINALIAS_URL            e.g. "https://goblinalias.fly.dev"
 * - GOBLINALIAS_API_KEY        (must match Fly ALIAS_API_KEY)
 * - GOBLINALIAS_CONTRACT       e.g. "v1" (must match Fly NG_CONTRACT)
 *
 * Optional:
 * - DEFAULT_INTAKE_URL         e.g. "https://netgoblin.org/intake"
 *
 * NOTE:
 * - This file DOES NOT use Resend.
 * - It restores the original styled Gmail onboarding email by calling Fly /generate-alias,
 *   which triggers sendEmail.js in your goblinalias app.
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

const isActiveStatus = (status: string | null | undefined) => {
  return status === "active" || status === "trialing";
};

const kvKeyForCustomer = (customerId: string | null, email: string | null) => {
  if (customerId) return `cust:${customerId}`;
  if (email) return `email:${email.toLowerCase()}`;
  return null;
};

const safeLower = (s: string | null | undefined) => (s ? s.toLowerCase() : null);

const requireEnv = (env: any, key: string) => {
  const v = env?.[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
};

const tierFromPriceId = (priceId: string | null | undefined, env: any) => {
  if (!priceId) return null;
  const map: Record<string, string> = {};

  if (env?.STRIPE_PRICE_ID_FIRSTFLAME) map[env.STRIPE_PRICE_ID_FIRSTFLAME] = "firstflame";
  // Add later:
  // if (env?.STRIPE_PRICE_ID_HUNTER) map[env.STRIPE_PRICE_ID_HUNTER] = "hunter";
  // if (env?.STRIPE_PRICE_ID_AEGIS) map[env.STRIPE_PRICE_ID_AEGIS] = "aegis";

  return map[priceId] || null;
};

export const onRequestPost = async ({ request, env }: any) => {
  // ---- Stripe signature verification ----
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

  // ---- KV bindings ----
  if (!env.STRIPE_EVENTS) {
    console.error("❌ Missing KV binding: STRIPE_EVENTS");
    return new Response("Server misconfigured", { status: 500 });
  }
  if (!env.STRIPE_CUSTOMERS) {
    console.error("❌ Missing KV binding: STRIPE_CUSTOMERS");
    return new Response("Server misconfigured", { status: 500 });
  }

  // ---- Idempotency per Stripe event ----
  const lockKey = `stripe_event:${event.id}`;
  const already = await env.STRIPE_EVENTS.get(lockKey);
  if (already) {
    console.log("🧱 duplicate event, skipped:", event.id);
    return new Response("ok", { status: 200 });
  }
  await env.STRIPE_EVENTS.put(lockKey, "1", { expirationTtl: 60 * 60 * 24 * 14 });

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
    console.log("🧾 stored record:", key, {
      access: next.access,
      tier: next.tier,
      status: next.subscriptionStatus,
    });
  };

  // ---- Call Fly /generate-alias to send the styled Gmail intake email ----
  const callFlyGenerateAlias = async (email: string) => {
    const baseUrl = requireEnv(env, "GOBLINALIAS_URL").replace(/\/+$/, "");
    const apiKey = requireEnv(env, "GOBLINALIAS_API_KEY");
    const contract = env.GOBLINALIAS_CONTRACT || "v1";

    const intakeFormUrl = env.DEFAULT_INTAKE_URL || "https://netgoblin.org/intake";

    // Stripe retries happen; use a stable idempotency key.
    const idem = `stripe:${event.id}`;

    const resp = await fetch(`${baseUrl}/generate-alias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "x-ng-contract": contract,
        "Idempotency-Key": idem,
      },
      body: JSON.stringify({
        email,
        intakeFormUrl,
      }),
    });

    const text = await resp.text().catch(() => "");
    if (!resp.ok) {
      throw new Error(`Fly /generate-alias failed (${resp.status}): ${text || "no body"}`);
    }

    // Fly returns JSON { success: true, alias }
    try {
      return JSON.parse(text);
    } catch {
      return { success: true, raw: text };
    }
  };

  // ---- Only send intake once per customer/email ----
  const maybeSendIntakeViaFlyOnce = async (params: {
    email: string | null;
    customerId: string | null;
    access: AccessState;
  }) => {
    const emailLower = safeLower(params.email);
    const customerId = params.customerId ?? null;

    const welcomeKey =
      customerId ? `welcome_sent:cust:${customerId}` : emailLower ? `welcome_sent:email:${emailLower}` : null;

    if (!welcomeKey) {
      console.log("📧 intake not sent: missing email/customerId");
      return;
    }
    if (!params.email) {
      console.log("📧 intake not sent: missing email");
      return;
    }
    if (params.access !== "active") {
      console.log("📧 intake not sent: access not active", { access: params.access });
      return;
    }

    const alreadyWelcomed = await env.STRIPE_EVENTS.get(welcomeKey);
    if (alreadyWelcomed) {
      console.log("📧 intake already sent, skipping:", welcomeKey);
      return;
    }

    try {
      const res = await callFlyGenerateAlias(params.email);

      // Mark as sent ONLY after success
      await env.STRIPE_EVENTS.put(welcomeKey, "1", { expirationTtl: 60 * 60 * 24 * 365 });
      console.log("📧 intake sent via Fly:", params.email, res?.alias ? { alias: res.alias } : {});
    } catch (err: any) {
      console.error("❌ intake via Fly failed:", err?.message || err);
      // Do NOT set welcomeKey so future events can retry
    }
  };

  // ---- Event routing ----
  switch (event.type) {
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
        console.error("❌ Failed to retrieve subscription:", err?.message || err);
      }

      const tier = tierFromPriceId(priceId, env);
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

      // ✅ restore stylized Gmail onboarding/intake email via Fly
      await maybeSendIntakeViaFlyOnce({ email, customerId, access });

      break;
    }

    case "customer.subscription.updated": {
      console.log("🔁 customer.subscription.updated");

      const sub = event.data.object as Stripe.Subscription;

      const customerId = (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) ?? null;
      const subscriptionId = sub.id ?? null;
      const subscriptionStatus = sub.status ?? null;
      const priceId = sub.items?.data?.[0]?.price?.id ?? null;

      const tier = tierFromPriceId(priceId, env);
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
