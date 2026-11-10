import assert from "node:assert/strict";
import test from "node:test";

test("admin routes reject requests without an access token", async () => {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/athens_car_rental?schema=public";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-change-before-production";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-change-before-production";
  process.env.APP_URL = "http://localhost:3000";
  const { app } = await import("../src/app");
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1/admin`;

  try {
    for (const path of ["/auth/me", "/vehicles", "/quotes", "/payments", "/contact-messages"]) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 401, `${path} must require an access token`);
      const body = await response.json() as { success: boolean; error: { code: string } };
      assert.equal(body.success, false);
      assert.equal(body.error.code, "AUTHENTICATION_REQUIRED");
    }
    const allowedOrigin = await fetch(`${baseUrl}/auth/me`, {
      headers: { origin: "http://localhost:3000" },
    });
    assert.equal(allowedOrigin.headers.get("access-control-allow-origin"), "http://localhost:3000");
    const unlistedOrigin = await fetch(`${baseUrl}/auth/me`, {
      headers: { origin: "https://unlisted.example" },
    });
    assert.equal(unlistedOrigin.headers.get("access-control-allow-origin"), null);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
