import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { name, email, phone } = req.body;
  if (!name || !email || !phone) return res.status(400).json({ error: "All fields are required" });

  try {
    // 1️⃣ Create a customer
    const customer = await stripe.customers.create({
      name,
      email,
      phone,
    });

    // 2️⃣ Create standalone PaymentIntent for first month
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 4000, // $40, adjust as needed
      currency: "usd",
      customer: customer.id,
      metadata: { name, email, phone },
    });

    res.status(200).json({ client_secret: paymentIntent.client_secret, customerId: customer.id });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
}
