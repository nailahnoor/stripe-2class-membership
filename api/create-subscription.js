import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

// Disable body parser so we can read raw body for webhook verification
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Read raw body
    const buf = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });

    // Verify webhook signature
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);

  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Only act when first PaymentIntent succeeds
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    // Calculate first of next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const billing_cycle_anchor = Math.floor(nextMonth.getTime() / 1000);

    try {
      await stripe.subscriptions.create({
        customer: paymentIntent.customer,
        items: [{ price: process.env.PRICE_ID }],
        billing_cycle_anchor,
        proration_behavior: "none",
        metadata: paymentIntent.metadata, // Pass metadata along
      });
      console.log("Subscription created for customer:", paymentIntent.customer);
    } catch (err) {
      console.error("Error creating subscription:", err);
    }
  }

  res.json({ received: true });
}
