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

    // 2️⃣ Calculate next 1st
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const billing_cycle_anchor = Math.floor(nextMonth.getTime() / 1000);

    // 3️⃣ Create subscription anchored to next 1st
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.PRICE_ID }],
      billing_cycle_anchor,
      proration_behavior: "none",
      metadata: { full_name: name, phone: phone },
    });

    // 4️⃣ Create the first invoice manually
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      subscription: subscription.id,
      collection_method: "charge_automatically",
    });

    // 5️⃣ Pay the invoice immediately
    const paidInvoice = await stripe.invoices.pay(invoice.id, { expand: ["payment_intent"] });

    const paymentIntent = paidInvoice.payment_intent;

    if (!paymentIntent) throw new Error("PaymentIntent could not be retrieved");

    // 6️⃣ Return client_secret
    res.status(200).json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
}
