import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { email, name, phone } = req.body;
  if (!email || !name || !phone)
    return res.status(400).json({ error: "Email, name, and phone are required" });

  try {
    // 1️⃣ Create customer
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
    });

    // 2️⃣ Create a one-time PaymentIntent for the first month
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 4000, // first month price in cents
      currency: "usd",
      customer: customer.id,
      description: "First Month Membership",
      metadata: { full_name: name, phone: phone },
    });

    // 3️⃣ Calculate next 1st for subscription
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const billing_cycle_anchor = Math.floor(nextMonth.getTime() / 1000);

    // 4️⃣ Create subscription anchored to 1st, trial until then (no charge yet)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.PRICE_ID }],
      billing_cycle_anchor,
      trial_end: billing_cycle_anchor,
      metadata: { full_name: name, phone: phone },
      proration_behavior: "none",
    });

    // 5️⃣ Return client_secret for frontend Stripe Elements
    res.status(200).json({ client_secret: paymentIntent.client_secret });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
}
