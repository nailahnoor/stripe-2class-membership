import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

// Disable Vercel body parser — required for raw webhook payloads
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const sig = req.headers["stripe-signature"];
  let rawBody = [];

  try {
    // Read the request body as raw bytes (no raw-body package needed)
    for await (const chunk of req) {
      rawBody.push(chunk);
    }
    rawBody = Buffer.concat(rawBody);

    // Construct the Stripe event
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle invoice payment succeeded
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;

      // Only act on the first subscription payment
      if (invoice.subscription && invoice.billing_reason === "subscription_create") {
        console.log("✅ First payment succeeded for subscription:", invoice.subscription);

        // Here you can add extra logic if needed (e.g., update database, send email)
      }
    }

    // Respond to Stripe
    res.json({ received: true });
  } catch (err) {
    console.error("⚠️ Webhook error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
