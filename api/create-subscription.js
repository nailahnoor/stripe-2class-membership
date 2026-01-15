// /api/create-subscription.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

const PRICE_ID = "price_1R6xxcAXY9hpMKCtAWp2nhos"; // ✅ TEST MODE price

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  try {
    // 1️⃣ Create customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Create subscription that REQUIRES payment immediately
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],

      // 🔥 THIS IS THE KEY
      payment_behavior: "default_incomplete",

      // Align future billing to the 1st
      billing_cycle_anchor_config: { day_of_month: 1 },

      expand: ["latest_invoice.payment_intent"],
    });

    const paymentIntent =
      subscription.latest_invoice?.payment_intent;

    if (!paymentIntent) {
      return res.status(500).json({
        error: "PaymentIntent was not created",
      });
    }

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
