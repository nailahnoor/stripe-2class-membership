import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });
const PRICE_ID = "price_1R6xxcAXY9hpMKCtAWp2nhos"; // test mode price

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // 1️⃣ Create customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      billing_cycle_anchor_config: { day_of_month: 1 },
      proration_behavior: "none",
      expand: ["latest_invoice.payment_intent"],
    });

    const invoice = subscription.latest_invoice;

    if (!invoice || !invoice.payment_intent) {
      // Subscription was created, but no payment intent yet
      return res.status(200).json({ success: true, message: "Subscription created, no payment required" });
    }

    const client_secret = invoice.payment_intent.client_secret;

    res.status(200).json({ success: true, client_secret });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}
