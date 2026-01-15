// /api/create-subscription.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

// ⚡ Replace with your **test mode price ID** for $100/month subscription
const PRICE_ID = "price_1R6xxcAXY9hpMKCtAWp2nhos";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // 1️⃣ Create Stripe customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Create subscription with billing anchor on 1st of month
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      billing_cycle_anchor_config: { day_of_month: 1 },
      proration_behavior: "none",
      expand: ["latest_invoice.payment_intent"], // ensures payment intent is returned
    });

    // 3️⃣ Get client secret if a payment is required
    const paymentIntent = subscription.latest_invoice?.payment_intent || null;

    if (paymentIntent) {
      // Payment is required
      res.status(200).json({ client_secret: paymentIntent.client_secret, requires_payment: true });
    } else {
      // Free subscription
      res.status(200).json({ requires_payment: false });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
