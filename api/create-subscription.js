// /api/create-subscription.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

// Replace with your test Price ID
const PRICE_ID = "price_1R6xxcAXY9hpMKCtAWp2nhos";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // 1️⃣ Create Stripe customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Create subscription with immediate payment
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      payment_behavior: "default_incomplete", // ensures PaymentIntent is created
      expand: ["latest_invoice.payment_intent"],
    });

    // 3️⃣ Extract client_secret from the PaymentIntent
    const client_secret = subscription.latest_invoice.payment_intent?.client_secret;

    if (!client_secret) {
      // fallback if subscription doesn't require immediate payment
      return res.status(200).json({ client_secret: null, requires_payment: false });
    }

    res.status(200).json({ client_secret, requires_payment: true });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
}
