import express from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PRICE_ID = process.env.PRICE_ID;
const PORT = parseInt(process.env.PORT, 10) || 3000;

if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY missing");
if (!PRICE_ID) throw new Error("PRICE_ID missing");

const stripe = Stripe(STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => res.send("Backend running"));

// ✅ Create subscription endpoint
app.post("/", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    // 1️⃣ Create customer
    const customer = await stripe.customers.create({ email });

    // 2️⃣ Calculate next 1st of the month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const billing_cycle_anchor = Math.floor(nextMonth.getTime() / 1000);

    // 3️⃣ Create subscription with full first month and anchor to the 1st
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PRICE_ID }],
      payment_behavior: "default_incomplete",
      billing_cycle_anchor: billing_cycle_anchor,
      proration_behavior: "none",
      expand: ["latest_invoice.payment_intent"]
    });

    const paymentIntent = subscription.latest_invoice.payment_intent;

    if (!paymentIntent) throw new Error("Missing payment_intent");

    res.status(200).json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
