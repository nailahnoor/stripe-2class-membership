import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

const PRICE_ID = process.env.PRICE_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // 1️⃣ Create Stripe customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Create subscription (charge immediately)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    const paymentIntent = subscription.latest_invoice.payment_intent;
    if (!paymentIntent) throw new Error("Missing payment_intent");

    res.status(200).json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
}
