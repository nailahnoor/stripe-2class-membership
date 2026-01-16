import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { email, name, phone } = req.body;
  if (!email || !name || !phone)
    return res.status(400).json({ error: "Email, name, and phone required" });

  try {
    // 1️⃣ Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
    });

    // 2️⃣ Create PaymentIntent for first month
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 4000, // first month in cents
      currency: "usd",
      customer: customer.id,
      metadata: { full_name: name, phone, email },
    });

    res.status(200).json({ client_secret: paymentIntent.client_secret, customerId: customer.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
