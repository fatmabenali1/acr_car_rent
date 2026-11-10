import assert from "node:assert/strict";
import test from "node:test";

test("Stripe checkout returns a single machine-readable 503 when payment keys are missing", async () => {
  process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test?schema=public";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-change-before-production";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-change-before-production";
  process.env.FRONTEND_URL = "http://localhost:5173";
  process.env.STRIPE_SECRET_KEY = "";
  process.env.STRIPE_WEBHOOK_SECRET = "";

  const { app } = await import("../src/app");
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/payments/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reference: "0203AC", email: "customer@example.com" }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "payment_not_configured" });

    const unsignedWebhook = await fetch(`http://127.0.0.1:${address.port}/api/payments/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(unsignedWebhook.status, 400);

    const allowedPreflight = await fetch(`http://127.0.0.1:${address.port}/api/reservations`, {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST",
      },
    });
    assert.equal(allowedPreflight.status, 204);
    assert.equal(allowedPreflight.headers.get("access-control-allow-origin"), "http://localhost:5173");

    const blockedPreflight = await fetch(`http://127.0.0.1:${address.port}/api/reservations`, {
      method: "OPTIONS",
      headers: {
        origin: "https://not-allowed.example",
        "access-control-request-method": "POST",
      },
    });
    assert.equal(blockedPreflight.status, 403);

    const invalidReservation = await fetch(`http://127.0.0.1:${address.port}/api/reservations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(invalidReservation.status, 400);
    const validationError = await invalidReservation.json() as { error?: { code?: string; stack?: string } };
    assert.equal(validationError.error?.code, "VALIDATION_ERROR");
    assert.equal(validationError.error?.stack, undefined);

    const limitedStatuses: number[] = [];
    for (let attempt = 0; attempt < 9; attempt += 1) {
      const limitedResponse = await fetch(`http://127.0.0.1:${address.port}/api/reservations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      limitedStatuses.push(limitedResponse.status);
    }
    assert.ok(limitedStatuses.every((status) => status === 400));
    const rateLimited = await fetch(`http://127.0.0.1:${address.port}/api/reservations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(rateLimited.status, 429);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
