// /api/create-subscription.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });
const PRICE_ID = "price_1SpaQ1AXY9hpMKCt5BfdzbVQ"; // replace with your Stripe Price ID

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // 1️⃣ Create customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Create subscription with billing anchor on the 1st
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      billing_cycle_anchor_config: { day_of_month: 1 },
      proration_behavior: "none",
      expand: ["latest_invoice.payment_intent"],
    });

    const client_secret = subscription.latest_invoice.payment_intent.client_secret;
    res.status(200).json({ success: true, client_secret });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}
