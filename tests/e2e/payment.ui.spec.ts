import { expect, test } from "@playwright/test";

const booking = {
  reference: "2026AB",
  status: "pending_payment",
  category: "D1",
  categoryName: "E2E Standard",
  example: "Test vehicle",
  pickupLocation: "E2E Airport",
  dropoffLocation: "E2E Airport",
  pickupAt: "2030-07-12T10:00:00.000Z",
  dropoffAt: "2030-07-14T10:00:00.000Z",
  depositAmountCents: 10_000,
  totalAmountCents: 25_000,
};

async function preparePaymentPage(page) {
  await page.route("**/api/v1/cookie-consent**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: null }),
      });
      return;
    }
    await route.continue();
  });
  await page.route("**/api/bookings/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: booking }),
    });
  });
  await page.goto("/pay");
  await page.getByLabel("Reservation reference").fill(booking.reference);
  await page.getByLabel("Email", { exact: true }).fill("customer@example.test");
  await page.getByRole("button", { name: "Find my reservation" }).click();
  await expect(page.getByText("E2E Standard", { exact: true })).toBeVisible();
}

test("the pay button requires terms, makes exactly one request, disables in flight, then redirects to the returned URL", async ({ page }) => {
  await preparePaymentPage(page);
  const summary = page.locator("aside");
  await expect(summary).toContainText("E2E Standard");
  await expect(summary).toContainText("E2E Airport");
  await expect(summary).toContainText("12 Jul 2030");
  await expect(summary).toContainText("14 Jul 2030");
  await expect(summary).toContainText("€100.00");
  await expect(summary).toContainText("€150.00");
  const payButton = page.getByRole("button", { name: "Pay €100.00" });
  await expect(payButton).toBeDisabled();
  const terms = page.getByRole("checkbox");
  await terms.check();
  await expect(payButton).toBeEnabled();

  let releaseCheckout;
  let requestCount = 0;
  const checkoutStarted = new Promise((resolve) => {
    page.on("request", (request) => {
      if (request.url() === "http://localhost:4100/api/payments/checkout") {
        requestCount += 1;
        resolve(request);
      }
    });
  });
  const checkoutGate = new Promise((resolve) => { releaseCheckout = resolve; });
  await page.route("http://localhost:4100/api/payments/checkout", async (route) => {
    await checkoutGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { url: "https://checkout.stripe-mock.invalid/session/cs_ui" } }),
    });
  });
  await page.route("https://checkout.stripe-mock.invalid/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Fake hosted checkout</title>" });
  });

  await payButton.click();
  const request = await checkoutStarted;
  await expect(page.getByRole("button", { name: /Connecting to Stripe/ })).toBeDisabled();
  expect(request.method()).toBe("POST");
  expect(request.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/i);
  expect(request.postDataJSON()).toEqual({ reference: booking.reference, email: "customer@example.test" });
  expect(requestCount).toBe(1);
  releaseCheckout();
  await page.waitForURL("https://checkout.stripe-mock.invalid/session/cs_ui");
  expect(requestCount).toBe(1);
});

test("503 shows exactly one polite customer message and never retries", async ({ page }) => {
  await preparePaymentPage(page);
  await page.getByRole("checkbox").check();
  let requestCount = 0;
  await page.route("http://localhost:4100/api/payments/checkout", async (route) => {
    requestCount += 1;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "payment_not_configured" }),
    });
  });
  await page.getByRole("button", { name: "Pay €100.00" }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toHaveText(
    "Online payment is temporarily unavailable. Please contact us on +30 210 6022220 or info@athenscarrental.com.",
  );
  await expect(alert).toHaveCount(1);
  expect(await page.locator("body").innerText()).not.toContain("payment_not_configured");
  expect(requestCount).toBe(1);
});

for (const [status, message] of [
  [400, "We could not verify the payment request. Please check your reservation details."],
  [404, "We could not find this reservation. Please check your reference and email address."],
  [429, "Too many payment attempts. Please wait a moment before trying again."],
  [500, "We could not start your payment due to a temporary error. Please try again later."],
] as const) {
  test(`${status} has a distinct readable payment error message`, async ({ page }) => {
    await preparePaymentPage(page);
    await page.getByRole("checkbox").check();
    await page.route("http://localhost:4100/api/payments/checkout", async (route) => {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ error: "internal_provider_error" }),
      });
    });
    await page.getByRole("button", { name: "Pay €100.00" }).click();
    await expect(page.getByRole("alert")).toHaveText(message);
    expect(await page.locator("body").innerText()).not.toContain("internal_provider_error");
  });
}

test("success and cancel pages render correctly; polling stops when paid", async ({ page }) => {
  let statusRequests = 0;
  await page.route("**/api/payments/status/*", async (route) => {
    statusRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { reference: booking.reference, status: "paid", pickupLocation: "E2E Airport" },
      }),
    });
  });
  await page.goto(`/pay/success?ref=${booking.reference}`);
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
  await expect(page.getByText("Pick-up: E2E Airport")).toBeVisible();
  await page.waitForLoadState("networkidle");
  const paidRequestCount = statusRequests;
  expect(paidRequestCount).toBeGreaterThan(0);
  await page.clock.install();
  await page.clock.runFor("00:00:10");
  expect(statusRequests).toBe(paidRequestCount);
  await page.goto(`/pay/cancel?ref=${booking.reference}`);
  await expect(page.getByRole("heading", { name: "Payment cancelled" })).toBeVisible();
  expect(statusRequests).toBe(paidRequestCount);
});

test("success polling stops after its 30-second limit", async ({ page }) => {
  await page.clock.install();
  let statusRequests = 0;
  await page.route("**/api/payments/status/*", async (route) => {
    statusRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { reference: booking.reference, status: "pending_payment", pickupLocation: "E2E Airport" },
      }),
    });
  });
  await page.goto(`/pay/success?ref=${booking.reference}`);
  await page.waitForLoadState("networkidle");
  expect(statusRequests).toBeGreaterThan(0);
  for (let attempt = 0; attempt < 30 && statusRequests < 17; attempt += 1) {
    await page.clock.runFor("00:00:02");
    await page.waitForLoadState("networkidle");
  }
  expect(statusRequests).toBe(17);
  const finalCount = statusRequests;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.clock.runFor("00:00:02");
  }
  expect(statusRequests).toBe(finalCount);
});

test("mobile payment form has no horizontal overflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile viewport is configured in the mobile Playwright project.");
  await preparePaymentPage(page);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});
