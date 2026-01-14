// /api/create-subscription.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16", // latest stable
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // 1️⃣ Create or retrieve customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer =
      customers.data.length > 0
        ? customers.data[0]
        : await stripe.customers.create({ email });

    // 2️⃣ Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: "price_1SpaQ1AXY9hpMKCt5BfdzbVQ", // your 2-class price
          quantity: 1,
        },
      ],
      subscription_data: {
        billing_cycle_anchor_config: { day_of_month: 1 }, // charge on the 1st
        proration_behavior: "none",
      },
      allow_promotion_codes: true,
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/cancel.html`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
