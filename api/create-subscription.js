// /api/create-subscription.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });
const PRICE_ID = "price_1R6xxcAXY9hpMKCtAWp2nhos"; // your test price

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // 1️⃣ Create customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Determine the next month's first day
    const now = new Date();
    const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const billingCycleAnchor = Math.floor(nextMonthFirst.getTime() / 1000);

    // 3️⃣ Create subscription with immediate charge and set the billing cycle anchor to the 1st of next month
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      payment_behavior: "default_incomplete", // ensures a PaymentIntent is created immediately
      billing_cycle_anchor: billingCycleAnchor, // sets the renewal date to the 1st of next month
      proration_behavior: "none", // no proration, first month is paid in full
      expand: ["latest_invoice.payment_intent"],
    });

    // 4️⃣ Extract client_secret from the PaymentIntent
    const paymentIntent = subscription.latest_invoice?.payment_intent;
    const client_secret = paymentIntent ? paymentIntent.client_secret : null;

    if (!client_secret) {
      // If no payment is required (e.g., free subscription), return that info
      return res.status(200).json({ client_secret: null, requires_payment: false });
    }

    // 5️⃣ Return the client_secret to the frontend
    res.status(200).json({ client_secret, requires_payment: true });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
}
