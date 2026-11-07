import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import "dotenv/config";

test("cookie consent is persisted and restored using an HTTP-only browser cookie", {
  skip: process.env.RUN_DATABASE_TESTS !== "true",
}, async () => {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/athens_car_rental?schema=public";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-change-before-production";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-change-before-production";
  const [{ app }, { prisma }] = await Promise.all([
    import("../src/app"),
    import("../src/db"),
  ]);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1/cookie-consent`;
  let tokenHash: string | undefined;

  try {
    const empty = await fetch(baseUrl);
    assert.equal(empty.status, 200);
    assert.equal((await empty.json() as { data: unknown }).data, null);

    const saved = await fetch(baseUrl, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ choice: "accepted" }),
    });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json() as { data: { choice: string } }).data.choice, "accepted");

    const setCookie = saved.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.match(setCookie, /HttpOnly/i);
    const token = setCookie.match(/acr_cookie_consent=([a-f0-9]{64})/)?.[1];
    assert.ok(token);
    tokenHash = createHash("sha256").update(token).digest("hex");

    const restored = await fetch(baseUrl, { headers: { cookie: `acr_cookie_consent=${token}` } });
    assert.equal((await restored.json() as { data: { choice: string } }).data.choice, "accepted");

    const updated = await fetch(baseUrl, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        cookie: `acr_cookie_consent=${token}`,
      },
      body: JSON.stringify({ choice: "refused" }),
    });
    assert.equal((await updated.json() as { data: { choice: string } }).data.choice, "refused");

    const invalid = await fetch(baseUrl, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ choice: "unknown" }),
    });
    assert.equal(invalid.status, 400);
  } finally {
    if (tokenHash) await prisma.cookieConsent.deleteMany({ where: { id: tokenHash } });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await prisma.$disconnect();
  }
});
