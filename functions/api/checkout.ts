import Stripe from "stripe";

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const { name, email } = await request.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: "Missing name or email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [
        {
          price: env.STRIPE_PRICE_ID_FIRSTFLAME,
          quantity: 1,
        },
      ],
      metadata: {
        name,
        tier: "firstflame",
        tag: "betaFlame",
      },
      success_url: `${new URL(request.url).origin}/success`,
      cancel_url: `${new URL(request.url).origin}/cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
