import { createRequire } from "node:module";
import { resolve } from "node:path";

const backendRequire = createRequire(resolve(process.cwd(), "backend/package.json"));
const Stripe = backendRequire("stripe");

export async function postJson(baseUrl, path, body, headers = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { response, body: parsed };
}

export async function createStripeWebhook(event, baseUrl = "http://localhost:4100") {
  const payload = JSON.stringify(event);
  const stripe = new Stripe("sk_test_your_secret_key_here");
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  return fetch(new URL("/api/payments/webhook", baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
}

export function checkoutEvent(type, { id, bookingId, reference, paymentIntent, paymentStatus } = {}) {
  return {
    id,
    object: "event",
    api_version: "2025-03-31.basil",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: `cs_test_e2e_${reference}`,
        object: "checkout.session",
        payment_status: paymentStatus ?? "unpaid",
        status: type === "checkout.session.expired" ? "expired" : "complete",
        payment_intent: paymentIntent ?? `pi_test_${reference}`,
        metadata: { booking_id: bookingId, reference },
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  };
}
