// @ts-nocheck
// functions/api/webhook.ts
import Stripe from "stripe";

/**
 * KV bindings required (Cloudflare):
 * - STRIPE_EVENTS
 * - STRIPE_CUSTOMERS
 *
 * Env vars required (Cloudflare):
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 *
 * Env vars for Stripe Price IDs (optional mapping to tiers):
 * - STRIPE_PRICE_ID_FIRSTFLAME_INDIVIDUAL
 * - STRIPE_PRICE_ID_FIRSTFLAME_PAIR
 *
 * Env vars to call Fly:
 * - GOBLINALIAS_URL
 * - GOBLINALIAS_API_KEY
 * - GOBLINALIAS_CONTRACT (default "v1")
 *
 * Optional (enables /intake/mint):
 * - GOBLINALIAS_INTAKE_SECRET (must match Fly INTAKE_TOKEN_SECRET)
 *
 * NEW (recommended): enable Neon transaction persistence via Fly:
 * - (no extra env needed) uses Fly /orders/upsert with same api key + contract
 */

type AccessState = "active" | "locked";

type CustomerRecord = {
  email: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  priceId: string | null;
  tier: string | null;

  // NEW: persist which plan they purchased (Individual vs Pair)
  planKey: string | null;
  planName: string | null;

  access: AccessState;
  updatedAt: string;
  lastEventId: string;
  lastEventType: string;
};

const isActiveStatus = (status: string | null | undefined) =>
  status === "active" || status === "trialing";

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

  // First Flame (two prices -> same tier)
  if (env?.STRIPE_PRICE_ID_FIRSTFLAME_INDIVIDUAL)
    map[env.STRIPE_PRICE_ID_FIRSTFLAME_INDIVIDUAL] = "firstflame";
  if (env?.STRIPE_PRICE_ID_FIRSTFLAME_PAIR)
    map[env.STRIPE_PRICE_ID_FIRSTFLAME_PAIR] = "firstflame";

  return map[priceId] || null;
};

const planFromPriceId = (priceId: string | null | undefined, env: any) => {
  if (!priceId) return { planKey: null, planName: null };

  if (env?.STRIPE_PRICE_ID_FIRSTFLAME_INDIVIDUAL && priceId === env.STRIPE_PRICE_ID_FIRSTFLAME_INDIVIDUAL) {
    return { planKey: "firstflame_individual", planName: "First Flame: Individual" };
  }
  if (env?.STRIPE_PRICE_ID_FIRSTFLAME_PAIR && priceId === env.STRIPE_PRICE_ID_FIRSTFLAME_PAIR) {
    return { planKey: "firstflame_pair", planName: "First Flame: Household Pair" };
  }

  return { planKey: null, planName: null };
};

const safeJsonParse = (s: string | null) => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
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
  // This is the *first* line of defense (fast). Fly also has DB idempotency via stripe_events.
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

      planKey: existing?.planKey ?? null,
      planName: existing?.planName ?? null,

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
      planKey: next.planKey,
      status: next.subscriptionStatus,
    });
  };

  // ---- Fly callers ----

  const flyConfig = () => {
    const baseUrl = requireEnv(env, "GOBLINALIAS_URL").replace(/\/+$/, "");
    const apiKey = requireEnv(env, "GOBLINALIAS_API_KEY");
    const contract = env.GOBLINALIAS_CONTRACT || "v1";
    const intakeSecret = env.GOBLINALIAS_INTAKE_SECRET || null;
    return { baseUrl, apiKey, contract, intakeSecret };
  };

  // Create alias (idempotent by Stripe event id). Returns JSON { success, alias, ... }
  const callFlyGenerateAlias = async (params: { email: string; customerId: string; skipEmail: boolean }) => {
    const { baseUrl, apiKey, contract } = flyConfig();
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
        email: params.email,
        stripeCustomerId: params.customerId, // ✅ REQUIRED by Fly
        skipEmail: params.skipEmail,
      }),
    });

    const text = await resp.text().catch(() => "");
    if (!resp.ok) throw new Error(`Fly /generate-alias failed (${resp.status}): ${text || "no body"}`);

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Fly /generate-alias returned non-JSON. Body="${(text || "").slice(0, 200)}"`);
    }
  };

  // Mint intake code + send email with ?code=... (requires x-intake-secret on Fly)
  const callFlyIntakeMint = async (params: { customerId: string; email: string; alias: string }) => {
    const { baseUrl, apiKey, contract, intakeSecret } = flyConfig();
    if (!intakeSecret) throw new Error("Missing env var: GOBLINALIAS_INTAKE_SECRET");

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
    if (!resp.ok) throw new Error(`Fly /intake/mint failed (${resp.status}): ${text || "no body"}`);

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Fly /intake/mint returned non-JSON. Body="${(text || "").slice(0, 200)}"`);
    }
  };

  // NEW: persist transaction into Neon through Fly
  const callFlyOrdersUpsert = async (payload: any) => {
    const { baseUrl, apiKey, contract } = flyConfig();

    const resp = await fetch(`${baseUrl}/orders/upsert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "x-ng-contract": contract,
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text().catch(() => "");
    if (!resp.ok) throw new Error(`Fly /orders/upsert failed (${resp.status}): ${text || "no body"}`);

    const parsed = safeJsonParse(text);
    if (!parsed) {
      throw new Error(`Fly /orders/upsert returned non-JSON. Body="${(text || "").slice(0, 200)}"`);
    }
    return parsed;
  };

  // ---- Only send intake once per customer/email ----
  const maybeSendIntakeViaFlyOnce = async (params: { email: string | null; customerId: string | null; access: AccessState }) => {
    const emailLower = safeLower(params.email);
    const customerId = params.customerId ?? null;

    const welcomeKey =
      customerId ? `welcome_sent:cust:${customerId}` : emailLower ? `welcome_sent:email:${emailLower}` : null;

    if (!welcomeKey) return console.log("📧 intake not sent: missing email/customerId");
    if (!params.email) return console.log("📧 intake not sent: missing email");
    if (!customerId) return console.log("📧 intake not sent: missing customerId");
    if (params.access !== "active")
      return console.log("📧 intake not sent: access not active", { access: params.access });

    const alreadyWelcomed = await env.STRIPE_EVENTS.get(welcomeKey);
    if (alreadyWelcomed) {
      console.log("📧 intake already sent, skipping:", welcomeKey);
      return;
    }

    try {
      const { intakeSecret } = flyConfig();

      // If we have intakeSecret: do 2-step (prevents duplicate emails)
      if (intakeSecret) {
        const resAlias = await callFlyGenerateAlias({
          email: params.email,
          customerId,
          skipEmail: true,
        });

        const alias = resAlias?.alias;
        if (!alias || typeof alias !== "string") throw new Error("Fly /generate-alias did not return alias");

        const resMint = await callFlyIntakeMint({ customerId, email: params.email, alias });

        await env.STRIPE_EVENTS.put(welcomeKey, "1", { expirationTtl: 60 * 60 * 24 * 365 });
        console.log("📧 intake sent via Fly (/intake/mint):", params.email, {
          alias,
          intakeUrl: resMint?.intakeUrl ? "(ok)" : "(no intakeUrl returned)",
        });
        return;
      }

      // Fallback: no intakeSecret => let /generate-alias send the email itself
      const resAlias = await callFlyGenerateAlias({
        email: params.email,
        customerId,
        skipEmail: false,
      });

      const alias = resAlias?.alias;

      await env.STRIPE_EVENTS.put(welcomeKey, "1", { expirationTtl: 60 * 60 * 24 * 365 });
      console.log("📧 intake sent via Fly (/generate-alias fallback):", params.email, alias ? { alias } : {});
    } catch (err: any) {
      console.error("❌ intake via Fly failed:", err?.message || err);
      // Do NOT set welcomeKey so future events can retry
    }
  };

  // ---- Helpers for pulling payment/subscription details ----
  const expandCustomerId = (customer: any) => (typeof customer === "string" ? customer : customer?.id) ?? null;

  const expandSubscriptionId = (subscription: any) =>
    (typeof subscription === "string" ? subscription : subscription?.id) ?? null;

  const expandPaymentIntentId = (pi: any) => (typeof pi === "string" ? pi : pi?.id) ?? null;

  const getCheckoutLineItemPriceId = async (checkoutSessionId: string) => {
    // For Checkout Sessions, the best way to read price/product is via listLineItems(expand price.product)
    try {
      const items = await stripe.checkout.sessions.listLineItems(checkoutSessionId, {
        limit: 5,
        expand: ["data.price.product"],
      });
      const li = items?.data?.[0];
      const priceId = (li?.price as any)?.id ?? null;
      const productId = ((li?.price as any)?.product as any)?.id ?? null;
      return { priceId, productId };
    } catch (e: any) {
      console.log("ℹ️ could not read checkout line items:", e?.message || e);
      return { priceId: null, productId: null };
    }
  };

  const getSubscriptionPriceId = async (subscriptionId: string) => {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price.product"],
      });
      const priceId = (sub?.items?.data?.[0]?.price as any)?.id ?? null;
      const productId = ((sub?.items?.data?.[0]?.price as any)?.product as any)?.id ?? null;
      const status = sub?.status ?? null;
      return { priceId, productId, subscriptionStatus: status };
    } catch (e: any) {
      console.log("ℹ️ could not retrieve subscription:", e?.message || e);
      return { priceId: null, productId: null, subscriptionStatus: null };
    }
  };

  // ---- Event routing ----
  switch (event.type) {
    case "checkout.session.completed": {
      console.log("✅ checkout.session.completed");

      const session = event.data.object as Stripe.Checkout.Session;

      let customerId = expandCustomerId(session.customer);
      const checkoutSessionId = session.id ?? null;

      const email = session.customer_email ?? (session.customer_details as any)?.email ?? null;

      const subscriptionId = expandSubscriptionId(session.subscription);
      const paymentIntentId = expandPaymentIntentId((session as any).payment_intent);

      // Pull plan metadata from Checkout Session (set by /api/checkout)
      let planKey: string | null = (session.metadata as any)?.planKey ?? null;
      let planName: string | null = (session.metadata as any)?.planName ?? null;

      // Best-effort recovery if customerId absent.
      if (!customerId && email) {
        try {
          const found = await stripe.customers.list({ email, limit: 1 });
          customerId = found?.data?.[0]?.id ?? null;
          if (customerId) console.log("✅ recovered customerId via email lookup:", customerId);
        } catch {
          console.log("ℹ️ could not recover customerId via email lookup");
        }
      }

      // Determine access + tier + price
      let subscriptionStatus: string | null = null;
      let priceId: string | null = null;
      let productId: string | null = null;

      if (subscriptionId) {
        const subInfo = await getSubscriptionPriceId(subscriptionId);
        subscriptionStatus = subInfo.subscriptionStatus;
        priceId = subInfo.priceId;
        productId = subInfo.productId;
      } else if (checkoutSessionId) {
        const liInfo = await getCheckoutLineItemPriceId(checkoutSessionId);
        priceId = liInfo.priceId;
        productId = liInfo.productId;
      }

      const tier = tierFromPriceId(priceId, env);

      // If checkout metadata missing, infer plan from priceId
      if ((!planKey || !planName) && priceId) {
        const inferred = planFromPriceId(priceId, env);
        planKey = planKey ?? inferred.planKey;
        planName = planName ?? inferred.planName;
      }

      // For non-subscription (one-time) sessions, treat completion as "active" access to the intake
      const access: AccessState = subscriptionId
        ? isActiveStatus(subscriptionStatus)
          ? "active"
          : "locked"
        : "active";

      await upsertCustomerRecord({
        email,
        customerId,
        subscriptionId,
        subscriptionStatus,
        priceId,
        tier,
        planKey,
        planName,
        access,
      });

      // ✅ Persist transaction into Neon through Fly (best-effort; do not break webhook)
      try {
        if (customerId) {
          const amountTotal = typeof (session as any).amount_total === "number" ? (session as any).amount_total : null;
          const currency = (session as any).currency ?? null;
          const mode = (session as any).mode ?? null;
          const status = (session as any).status ?? null;

          await callFlyOrdersUpsert({
            stripeEventId: event.id,
            checkoutSessionId,
            paymentIntentId,
            stripeCustomerId: customerId,
            customerEmail: email,
            amountTotal,
            currency,
            mode,
            status,
            priceId,
            productId,
            tier,
            planKey,
            planName,
            purchasedAt: now,
            raw: {
              eventType: event.type,
              checkoutSessionId,
              customerId,
              subscriptionId,
              paymentIntentId,
              amountTotal,
              currency,
              mode,
              status,
              priceId,
              productId,
              tier,
              planKey,
              planName,
              email,
            },
          });

          console.log("✅ stored order via Fly /orders/upsert");
        } else {
          console.log("ℹ️ skipped /orders/upsert: missing customerId");
        }
      } catch (e: any) {
        console.error("⚠️ /orders/upsert failed (non-fatal):", e?.message || e);
      }

      // ✅ Send intake email once (via Fly)
      await maybeSendIntakeViaFlyOnce({ email, customerId, access });

      break;
    }

    case "customer.subscription.updated": {
      console.log("🔁 customer.subscription.updated");

      const sub = event.data.object as Stripe.Subscription;
      const customerId = expandCustomerId(sub.customer);

      const subscriptionId = sub.id ?? null;
      const subscriptionStatus = sub.status ?? null;

      const priceId = (sub.items?.data?.[0]?.price as any)?.id ?? null;
      const productId = ((sub.items?.data?.[0]?.price as any)?.product as any)?.id ?? null;

      const tier = tierFromPriceId(priceId, env);
      const access: AccessState = isActiveStatus(subscriptionStatus) ? "active" : "locked";

      // OPTIONAL BIT (enabled): read planKey/planName from Subscription metadata,
      // falling back to price inference if absent.
      const subMeta: any = (sub as any).metadata || {};
      let planKey: string | null = subMeta?.planKey ?? null;
      let planName: string | null = subMeta?.planName ?? null;

      if ((!planKey || !planName) && priceId) {
        const inferred = planFromPriceId(priceId, env);
        planKey = planKey ?? inferred.planKey;
        planName = planName ?? inferred.planName;
      }

      await upsertCustomerRecord({
        customerId,
        subscriptionId,
        subscriptionStatus,
        priceId,
        tier,
        planKey,
        planName,
        access,
      });

      // Optional: persist subscription state changes as order snapshots (best-effort)
      try {
        if (customerId) {
          await callFlyOrdersUpsert({
            stripeEventId: event.id,
            checkoutSessionId: null,
            paymentIntentId: null,
            stripeCustomerId: customerId,
            customerEmail: null,
            amountTotal: null,
            currency: null,
            mode: "subscription",
            status: subscriptionStatus,
            priceId,
            productId,
            tier,
            planKey,
            planName,
            purchasedAt: now,
            raw: {
              eventType: event.type,
              customerId,
              subscriptionId,
              subscriptionStatus,
              priceId,
              productId,
              tier,
              planKey,
              planName,
            },
          });
          console.log("✅ stored subscription update snapshot via /orders/upsert");
        }
      } catch (e: any) {
        console.error("⚠️ /orders/upsert snapshot failed (non-fatal):", e?.message || e);
      }

      break;
    }

    case "invoice.payment_failed": {
      console.log("⚠️ invoice.payment_failed (locking access)");

      const invoice = event.data.object as Stripe.Invoice;
      const customerId = expandCustomerId(invoice.customer);

      const subscriptionId = expandSubscriptionId(invoice.subscription);

      await upsertCustomerRecord({ customerId, subscriptionId, access: "locked" });

      // Optional snapshot
      try {
        if (customerId) {
          const paymentIntentId = expandPaymentIntentId((invoice as any).payment_intent);
          await callFlyOrdersUpsert({
            stripeEventId: event.id,
            checkoutSessionId: null,
            paymentIntentId,
            stripeCustomerId: customerId,
            customerEmail: (invoice as any).customer_email ?? null,
            amountTotal: typeof (invoice as any).amount_due === "number" ? (invoice as any).amount_due : null,
            currency: (invoice as any).currency ?? null,
            mode: "subscription",
            status: "payment_failed",
            priceId: null,
            productId: null,
            tier: null,
            planKey: null,
            planName: null,
            purchasedAt: now,
            raw: {
              eventType: event.type,
              customerId,
              subscriptionId,
              paymentIntentId,
              amountDue: (invoice as any).amount_due ?? null,
              currency: (invoice as any).currency ?? null,
            },
          });
          console.log("✅ stored invoice.payment_failed snapshot via /orders/upsert");
        }
      } catch (e: any) {
        console.error("⚠️ /orders/upsert snapshot failed (non-fatal):", e?.message || e);
      }

      break;
    }

    case "customer.subscription.deleted": {
      console.log("🛑 customer.subscription.deleted (locking access)");

      const sub = event.data.object as Stripe.Subscription;
      const customerId = expandCustomerId(sub.customer);

      const priceId = (sub.items?.data?.[0]?.price as any)?.id ?? null;
      const productId = ((sub.items?.data?.[0]?.price as any)?.product as any)?.id ?? null;
      const tier = tierFromPriceId(priceId, env);

      // OPTIONAL BIT (enabled): read planKey/planName from Subscription metadata,
      // falling back to price inference if absent.
      const subMeta: any = (sub as any).metadata || {};
      let planKey: string | null = subMeta?.planKey ?? null;
      let planName: string | null = subMeta?.planName ?? null;

      if ((!planKey || !planName) && priceId) {
        const inferred = planFromPriceId(priceId, env);
        planKey = planKey ?? inferred.planKey;
        planName = planName ?? inferred.planName;
      }

      await upsertCustomerRecord({
        customerId,
        subscriptionId: sub.id ?? null,
        subscriptionStatus: sub.status ?? "canceled",
        priceId,
        tier,
        planKey,
        planName,
        access: "locked",
      });

      // Optional snapshot
      try {
        if (customerId) {
          await callFlyOrdersUpsert({
            stripeEventId: event.id,
            checkoutSessionId: null,
            paymentIntentId: null,
            stripeCustomerId: customerId,
            customerEmail: null,
            amountTotal: null,
            currency: null,
            mode: "subscription",
            status: "canceled",
            priceId,
            productId,
            tier,
            planKey,
            planName,
            purchasedAt: now,
            raw: {
              eventType: event.type,
              customerId,
              subscriptionId: sub.id ?? null,
              subscriptionStatus: sub.status ?? "canceled",
              priceId,
              productId,
              tier,
              planKey,
              planName,
            },
          });
          console.log("✅ stored subscription deleted snapshot via /orders/upsert");
        }
      } catch (e: any) {
        console.error("⚠️ /orders/upsert snapshot failed (non-fatal):", e?.message || e);
      }

      break;
    }

    default: {
      console.log("ℹ️ Unhandled event:", event.type);
      break;
    }
  }

  return new Response("ok", { status: 200 });
};
