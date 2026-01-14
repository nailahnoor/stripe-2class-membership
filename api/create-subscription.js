import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse JSON safely
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { email } = data;

    if (!email) return res.status(400).json({ error: "Email is required" });

    // 1️⃣ Create customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: "price_1SpaQ1AXY9hpMKCt5BfdzbVQ" }],
      billing_cycle_anchor: getNextFirstOfMonthUnix(),
      proration_behavior: "none",
      expand: ["latest_invoice.payment_intent"]
    });

    res.status(200).json({
      success: true,
      client_secret: subscription.latest_invoice.payment_intent.client_secret
    });

  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Helper: next 1st of the month as UNIX timestamp
function getNextFirstOfMonthUnix() {
  const now = new Date();
  return Math.floor(new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000);
}
