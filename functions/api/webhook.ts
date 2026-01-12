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
 *
 * Env vars to call Fly alias/email engine:
 * - GOBLINALIAS_URL            e.g. "https://goblinalias.fly.dev"
 * - GOBLINALIAS_API_KEY        (must match Fly ALIAS_API_KEY)
 * - GOBLINALIAS_CONTRACT       e.g. "v1" (must match Fly NG_CONTRACT)
 *
 * Optional (recommended for mint):
 * - GOBLINALIAS_INTAKE_SECRET  (must match Fly INTAKE_TOKEN_SECRET)
 *
 * NOTE:
 * - We call Fly /generate-alias to create alias (idempotent)
 * - Then we call Fly /intake/mint to mint code + send email with ?code=... (when possible)
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

  // ---- Fly callers ----

  const flyConfig = () => {
    const baseUrl = requireEnv(env, "GOBLINALIAS_URL").replace(/\/+$/, "");
    const apiKey = requireEnv(env, "GOBLINALIAS_API_KEY");
    const contract = env.GOBLINALIAS_CONTRACT || "v1";
    return { baseUrl, apiKey, contract };
  };

  // Create alias (idempotent by Stripe event id). Returns { success, alias }
  const callFlyGenerateAlias = async (email: string) => {
    const { baseUrl, apiKey, contract } = flyConfig();

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
        // IMPORTANT: do NOT pass intakeFormUrl here.
        // We want /intake/mint to generate https://netgoblin.org/intake?code=...
      }),
    });

    const text = await resp.text().catch(() => "");
    if (!resp.ok) {
      throw new Error(`Fly /generate-alias failed (${resp.status}): ${text || "no body"}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return { success: true, raw: text };
    }
  };

  // Mint intake code + send email with ?code=... (requires x-intake-secret)
  const callFlyIntakeMint = async (params: { customerId: string; email: string; alias: string }) => {
    const { baseUrl, apiKey, contract } = flyConfig();

    // NOTE: do NOT hard-fail if missing. We'll gate before calling.
    const intakeSecret = env.GOBLINALIAS_INTAKE_SECRET;

    const resp = await fetch(`${baseUrl}/intake/mint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "x-ng-contract": contract,
        "x-intake-secret": intakeSecret,
      },
      body: JSON.stringify({
        stripeCustomerId: params.customerId,
        email: params.email,
        alias: params.alias,
      }),
    });

    const text = await resp.text().catch(() => "");
    if (!resp.ok) {
      throw new Error(`Fly /intake/mint failed (${resp.status}): ${text || "no body"}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return { success: true, raw: text };
    }
  };

  // ---- Only send intake once per customer/email ----
  // FIX: do NOT require customerId to send the welcome email.
  // We always send via /generate-alias when access is active.
  // Then we *optionally* mint the code link if customerId + intake secret exist.
  const maybeSendIntakeViaFlyOnce = async (params: {
    email: string | null;
    customerId: string | null;
    access: AccessState;
  }) => {
    const emailLower = safeLower(params.email);
    const customerId = params.customerId ?? null;

    const welcomeKey =
      customerId
        ? `welcome_sent:cust:${customerId}`
        : emailLower
          ? `welcome_sent:email:${emailLower}`
          : null;

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
      // 1) ALWAYS send welcome email via Fly (restores old behavior)
      const resAlias = await callFlyGenerateAlias(params.email);
      const alias = resAlias?.alias;

      if (!alias || typeof alias !== "string") {
        throw new Error("Fly /generate-alias did not return alias");
      }

      // 2) Optionally mint intake link (code) if we can
      const hasIntakeSecret = Boolean(env.GOBLINALIAS_INTAKE_SECRET);

      if (customerId && hasIntakeSecret) {
        const resMint = await callFlyIntakeMint({
          customerId,
          email: params.email,
          alias,
        });

        console.log("📧 minted intake link via Fly:", params.email, {
          alias,
          intakeUrl: resMint?.intakeUrl ? "(ok)" : "(no intakeUrl returned)",
        });
      } else {
        console.log("ℹ️ skipping /intake/mint:", {
          hasCustomerId: Boolean(customerId),
          hasIntakeSecret,
          note: "welcome email still sent via /generate-alias",
        });
      }

      // Mark as sent after welcome email succeeded (and mint attempted if possible)
      await env.STRIPE_EVENTS.put(welcomeKey, "1", { expirationTtl: 60 * 60 * 24 * 365 });
      console.log("📧 welcome sent via Fly:", params.email, { alias });
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

      let customerId =
        (typeof session.customer === "string" ? session.customer : session.customer?.id) ?? null;

      const email =
        session.customer_email ??
        session.customer_details?.email ??
        null;

      const subscriptionId =
        (typeof session.subscription === "string" ? session.subscription : session.subscription?.id) ?? null;

      // Best-effort recovery: sometimes Checkout doesn't attach a customer to the session.
      if (!customerId && email) {
        try {
          const found = await stripe.customers.list({ email, limit: 1 });
          customerId = found?.data?.[0]?.id ?? null;
          if (customerId) console.log("✅ recovered customerId via email lookup:", customerId);
        } catch (e: any) {
          console.log("ℹ️ could not recover customerId via email lookup");
        }
      }

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

      // ✅ welcome always (if active); mint link if possible
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
