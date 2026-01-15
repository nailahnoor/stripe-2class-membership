import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });
const PRICE_ID = "price_1R6xxcAXY9hpMKCtAWp2nhos"; // Replace with your price ID

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://stripe-2class-membership.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // 1️⃣ Create customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Calculate timestamp for next 1st of the month
    const now = new Date();
    const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const anchorTimestamp = Math.floor(nextMonthFirst.getTime() / 1000);

    // 3️⃣ Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      payment_behavior: "allow_incomplete", // allows PaymentIntent for immediate charge
      billing_cycle_anchor: anchorTimestamp, // next 1st
      proration_behavior: "none",
      trial_end: "now", // charge immediately
      expand: ["latest_invoice.payment_intent"]
    });

    const client_secret = subscription.latest_invoice.payment_intent.client_secret;
    res.status(200).json({ client_secret });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
