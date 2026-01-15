import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

// Disable Vercel body parser
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const sig = req.headers["stripe-signature"];
  let rawBody = [];

  try {
    // Read raw request body using Node stream (no raw-body)
    for await (const chunk of req) {
      rawBody.push(chunk);
    }
    rawBody = Buffer.concat(rawBody);

    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      if (invoice.subscription && invoice.billing_reason === "subscription_create") {
        console.log("First payment succeeded for subscription:", invoice.subscription);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
