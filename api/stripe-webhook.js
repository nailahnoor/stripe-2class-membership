import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

// Vercel body parser disabled for webhooks
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const sig = req.headers["stripe-signature"];

  try {
    // Read request body as text
    const rawBody = await req.text();

    // Construct Stripe event
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle subscription first payment
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;

      if (invoice.subscription && invoice.billing_reason === "subscription_create") {
        console.log("✅ First payment succeeded for subscription:", invoice.subscription);
        // Add additional logic here (update DB, send email, etc.)
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("⚠️ Webhook error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
