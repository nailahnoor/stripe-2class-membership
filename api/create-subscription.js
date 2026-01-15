import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });
const PRICE_ID = "price_1R6xxcAXY9hpMKCtAWp2nhos"; // replace with your test Price ID

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // 1️⃣ Create customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Calculate first of next month for billing
    const now = new Date();
    const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const anchorTimestamp = Math.floor(nextMonthFirst.getTime() / 1000);

    // 3️⃣ Create subscription with anchor and immediate payment
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      payment_behavior: "default_incomplete", // creates PaymentIntent
      billing_cycle_anchor: anchorTimestamp,  // next charge on 1st
      proration_behavior: "none",
      expand: ["latest_invoice.payment_intent"],
    });

    const client_secret = subscription.latest_invoice.payment_intent.client_secret;

    res.status(200).json({ client_secret });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
