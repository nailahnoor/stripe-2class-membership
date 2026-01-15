import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });
const PRICE_ID = "price_1R6xxcAXY9hpMKCtAWp2nhos"; // replace with your price ID

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // 1️⃣ Create or retrieve customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Create subscription with immediate charge
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    // 3️⃣ Return client_secret for Payment Element
    const client_secret = subscription.latest_invoice.payment_intent.client_secret;
    res.status(200).json({ client_secret });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
