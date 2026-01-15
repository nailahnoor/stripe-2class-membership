import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export const config = {
  api: {
    bodyParser: false, // REQUIRED for Stripe webhooks
  },
};

import getRawBody from "raw-body";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Only run AFTER payment succeeds
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;

    if (invoice.subscription && invoice.billing_reason === "subscription_create") {
      const subscriptionId = invoice.subscription;

      // 🔥 Calculate 1st of next month
      const now = new Date();
      const nextMonthFirst = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );

      const anchorTimestamp = Math.floor(nextMonthFirst.getTime() / 1000);

      try {
        await stripe.subscriptions.update(subscriptionId, {
          billing_cycle_anchor: anchorTimestamp,
          proration_behavior: "none",
        });

        console.log("Subscription aligned to 1st:", subscriptionId);
      } catch (err) {
        console.error("Failed to realign billing cycle", err);
      }
    }
  }

  res.json({ received: true });
}
