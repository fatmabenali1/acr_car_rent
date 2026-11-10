import assert from "node:assert/strict";
import test from "node:test";

test("Stripe checkout returns a single machine-readable 503 when payment keys are missing", async () => {
  process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test?schema=public";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-change-before-production";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-change-before-production";
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
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
