// /api/create-subscription.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

const PRICE_ID = "price_1R6xxcAXY9hpMKCtAWp2nhos"; // your test price ID

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // 1️⃣ Create Stripe customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      billing_cycle_anchor_config: { day_of_month: 1 },
      proration_behavior: "none",
      expand: ["latest_invoice.payment_intent"],
    });

    // 3️⃣ Check if payment is required
    const paymentIntent = subscription.latest_invoice?.payment_intent || null;

    res.status(200).json({
      success: true,
      client_secret: paymentIntent?.client_secret || null,
      subscription_id: subscription.id,
      requires_payment: !!paymentIntent, // true if user needs to pay
    });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
