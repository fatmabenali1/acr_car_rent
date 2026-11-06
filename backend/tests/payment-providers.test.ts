import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../src/middleware/errors";

test("mock provider creates sessions, verifies each outcome, and rejects altered callbacks", async () => {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/athens_car_rental?schema=public";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-change-before-production";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-change-before-production";
  const { MockProvider } = await import("../src/services/payment-providers/mock-provider");
  const provider = new MockProvider();
  const session = await provider.createSession({
    paymentId: "payment_test",
    reference: "0203AC",
    amountEur: "100.00",
    currency: "EUR",
    customerEmail: "customer@example.com",
  });

  assert.match(session.transactionId, /^mock_/);
  assert.equal(session.redirectParameters.reference, "0203AC");
  for (const outcome of ["PAID", "FAILED", "CANCELLED"] as const) {
    const callback = provider.createCallback(session.transactionId, outcome);
    assert.equal((await provider.verifyCallback(callback)).outcome, outcome);
  }
  await assert.rejects(
    provider.verifyCallback({
      ...provider.createCallback(session.transactionId, "PAID"),
      outcome: "FAILED",
    }),
    (error: unknown) => error instanceof AppError && error.code === "INVALID_PAYMENT_SIGNATURE",
  );
  assert.equal((await provider.refund(session.transactionId, "50.00")).status, "REFUNDED");
});

test("Alpha Bank adapter remains an explicit stub without guessed bank API details", async () => {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/athens_car_rental?schema=public";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-change-before-production";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-change-before-production";
  const { AlphaBankProvider } = await import("../src/services/payment-providers/alphabank-provider");
  const provider = new AlphaBankProvider();
  await assert.rejects(
    provider.createSession({
      paymentId: "payment_test",
      reference: "0203AC",
      amountEur: "100.00",
      currency: "EUR",
      customerEmail: "customer@example.com",
    }),
    (error: unknown) => error instanceof AppError && error.code === "ALPHABANK_CONFIGURATION_REQUIRED",
  );
  await assert.rejects(
    new AlphaBankProvider("official-docs-pending").refund("transaction", "50.00"),
    (error: unknown) => error instanceof AppError && error.code === "ALPHABANK_INTEGRATION_TODO",
  );
});
