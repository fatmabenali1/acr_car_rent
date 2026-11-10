import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";

test("Stripe webhook verifies signatures and normalizes completed checkout events", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/athens_car_rental?schema=public";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-change-before-production";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-change-before-production";
  process.env.STRIPE_SECRET_KEY = "sk_test_your_secret_key_here";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_provider_unit";
  const { StripePaymentProvider } = await import("../src/payments/stripe");
  const provider = new StripePaymentProvider();

  assert.throws(
    () => provider.handleWebhook(Buffer.from("{}"), "invalid"),
    { message: "Payment notification signature is invalid" },
  );

  const payload = JSON.stringify({
    id: "evt_provider_unit",
    object: "event",
    api_version: "2025-03-31.basil",
    created: 1_800_000_000,
    data: {
      object: {
        id: "cs_provider_unit",
        object: "checkout.session",
        payment_status: "paid",
        status: "complete",
        payment_intent: "pi_provider_unit",
        metadata: { booking_id: "booking-unit", reference: "ACR-2026-AB2345" },
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "checkout.session.completed",
  });
  const signature = new Stripe("sk_test_your_secret_key_here").webhooks.generateTestHeaderString({
    payload,
    secret: "whsec_provider_unit",
  });
  assert.deepEqual(provider.handleWebhook(Buffer.from(payload), signature), {
    id: "evt_provider_unit",
    type: "checkout.session.completed",
    sessionId: "cs_provider_unit",
    paymentIntentId: "pi_provider_unit",
    bookingId: "booking-unit",
    reference: "ACR-2026-AB2345",
    paid: true,
  });
});
