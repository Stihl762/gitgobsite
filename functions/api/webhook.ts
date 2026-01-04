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
 * Env vars for email (Resend):
 * - RESEND_API_KEY
 * - RESEND_FROM_EMAIL            e.g. "NetGoblin <admin@netgoblin.org>" (recommended) or "admin@netgoblin.org"
 * Optional:
 * - EMAIL_WELCOME_SUBJECT        default: "Welcome to NetGoblin"
 *
 * Env vars for Stripe Price IDs (Cloudflare Secrets):
 * - STRIPE_PRICE_ID_FIRSTFLAME
 * (Add more later as needed)
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
  // Prefer customerId because it’s stable; fallback to email if needed.
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

const escapeHtml = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const tierFromPriceId = (priceId: string | null | undefined, env: any) => {
  if (!priceId) return null;

  // Map Stripe Price IDs (from env secrets) -> your internal tier strings
  const map: Record<string, string> = {};

  // Required (you confirmed it exists in Cloudflare)
  if (env?.STRIPE_PRICE_ID_FIRSTFLAME) {
    map[env.STRIPE_PRICE_ID_FIRSTFLAME] = "firstflame";
  }

  // Add these later when you create them as Cloudflare secrets:
  // if (env?.STRIPE_PRICE_ID_HUNTER) map[env.STRIPE_PRICE_ID_HUNTER] = "hunter";
  // if (env?.STRIPE_PRICE_ID_AEGIS) map[env.STRIPE_PRICE_ID_AEGIS] = "aegis";
  // if (env?.STRIPE_PRICE_ID_ADVENTURER) map[env.STRIPE_PRICE_ID_ADVENTURER] = "adventurer";

  return map[priceId] || null;
};

const buildWelcomeEmail = (opts: { tier: string | null; email: string }) => {
  const tierLabel = opts.tier ? escapeHtml(opts.tier) : "unknown";
  const toLabel = escapeHtml(opts.email);

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2 style="margin: 0 0 12px 0;">Welcome to NetGoblin.</h2>
      <p style="margin: 0 0 10px 0;">Your account is active. The hunt begins now.</p>
      <p style="margin: 0 0 10px 0;">Tier: <b>${tierLabel}</b></p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
      <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">
        This message was sent to ${toLabel}.
      </p>
    </div>
  `.trim();

  return { html };
};

const sendWelcomeEmailResend = async (env: any, to: string, tier: string | null) => {
  const apiKey = requireEnv(env, "RESEND_API_KEY");
  const from = requireEnv(env, "RESEND_FROM_EMAIL"); // <-- matches your Cloudflare var
  const subject = env.EMAIL_WELCOME_SUBJECT || "Welcome to NetGoblin";

  const { html } = buildWelcomeEmail({ tier, email: to });

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to], // safe form for Resend
      subject,
      html,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Resend failed (${resp.status}): ${txt || "no body"}`);
  }

  const json = await resp.json().catch(() => ({}));
  return json;
};

export const onRequestPost = async ({ request, env }: any) => {
  // ---- Stripe signature verification ----
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature", { status: 400 });

  // Stripe requires the raw body for signature verification.
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

  // ---- Email helper (idempotent per customer/email) ----
  const maybeSendWelcome = async (params: {
    email: string | null;
    customerId: string | null;
    subscriptionId: string | null;
    tier: string | null;
    access: AccessState;
  }) => {
    const emailLower = safeLower(params.email);
    const customerId = params.customerId ?? null;

    const welcomeKey =
      customerId ? `welcome_sent:cust:${customerId}` : emailLower ? `welcome_sent:email:${emailLower}` : null;

    if (!welcomeKey) {
      console.log("📧 welcome not sent: missing email/customerId");
      return;
    }

    if (params.access !== "active") {
      console.log("📧 welcome not sent: access not active", { access: params.access });
      return;
    }

    if (!params.email) {
      console.log("📧 welcome not sent: missing email");
      return;
    }

    const alreadyWelcomed = await env.STRIPE_EVENTS.get(welcomeKey);
    if (alreadyWelcomed) {
      console.log("📧 welcome already sent, skipping:", welcomeKey);
      return;
    }

    try {
      const res = await sendWelcomeEmailResend(env, params.email, params.tier);
      await env.STRIPE_EVENTS.put(welcomeKey, "1", { expirationTtl: 60 * 60 * 24 * 365 });
      console.log("📧 welcome sent:", params.email, res?.id ? { id: res.id } : {});
    } catch (err: any) {
      console.error("❌ welcome email failed:", err?.message || err);
      // We still return 200 so Stripe doesn't retry endlessly if Resend is misconfigured.
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
        console.error("❌ Failed to retrieve subscription for authority:", err?.message || err);
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

      await maybeSendWelcome({ email, customerId, subscriptionId, tier, access });

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
