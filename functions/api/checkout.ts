// @ts-nocheck
import Stripe from "stripe";

export const onRequestPost = async ({ request, env }) => {
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const body = await request.json();
    const name = body?.name?.toString().trim();
    const email = body?.email?.toString().trim();
    const planKey = body?.planKey?.toString().trim();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: "Missing name or email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default to pair if not provided (safe for old clients)
    const normalizedPlanKey =
      planKey === "firstflame_individual" || planKey === "firstflame_pair"
        ? planKey
        : "firstflame_pair";

    // Map planKey -> Stripe Price ID (LIVE values from secrets)
    const priceId =
      normalizedPlanKey === "firstflame_individual"
        ? env.STRIPE_PRICE_ID_FIRSTFLAME_INDIVIDUAL
        : env.STRIPE_PRICE_ID_FIRSTFLAME_PAIR;

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Missing Stripe Price ID for selected plan" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const planName =
      normalizedPlanKey === "firstflame_individual"
        ? "First Flame: Individual"
        : "First Flame: Household Pair";

    const origin = new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // Checkout Session metadata (your webhook reads this on checkout.session.completed)
      metadata: {
        name,
        tier: "firstflame",
        planKey: normalizedPlanKey,
        planName,
        tag: "betaFlame",
      },

      // ✅ Optional bit (enabled): also store metadata on the Subscription itself,
      // so customer.subscription.updated/deleted events can identify the plan later.
      subscription_data: {
        metadata: {
          name,
          tier: "firstflame",
          planKey: normalizedPlanKey,
          planName,
          tag: "betaFlame",
        },
      },

      success_url: `${origin}/success`,
      cancel_url: `${origin}/cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
