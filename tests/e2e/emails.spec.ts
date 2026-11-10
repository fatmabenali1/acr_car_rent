import { expect, test } from "@playwright/test";
import { clearEmails, getEmails, startFakeSmtp, stopFakeSmtp, waitForEmail } from "./helpers/smtp.mjs";
import { checkoutEvent, createStripeWebhook, postJson } from "./helpers/api.mjs";
import { prisma, truncateE2EData } from "./helpers/db.mjs";

const api = "http://localhost:4100";
const isolatedRateLimitApi = "http://localhost:4102";
const paymentApi = api;

function quoteRequest(email, recaptchaToken = "e2e-valid-token") {
  const pickupAt = new Date(Date.now() + 10 * 86_400_000);
  pickupAt.setUTCHours(10, 0, 0, 0);
  const returnAt = new Date(pickupAt.getTime() + 2 * 86_400_000);
  return {
    vehicleSlug: "e2e-standard-d1",
    pickupLocationSlug: "e2e-airport",
    returnLocationSlug: "e2e-airport",
    pickupAt: pickupAt.toISOString(),
    returnAt: returnAt.toISOString(),
    customer: {
      firstName: "E2E",
      lastName: "Customer",
      email,
      phone: "+302106022220",
      country: "GR",
    },
    driver: {
      age: 30,
      licenceYears: 8,
      countryCode: "GR",
      hasInternationalPermit: false,
    },
    additionalDrivers: [],
    extras: [],
    notes: "Automated E2E request",
    language: "en",
    recaptchaToken,
  };
}

function expectCompleteEmail(email, reference, { pickupPrefix = "Pickup:", returnPrefix = "Return:" } = {}) {
  expect(email.text.trim()).not.toBe("");
  expect(email.html.trim()).not.toBe("");
  expect(email.html).toContain("<!doctype html>");
  expect(email.html).toContain(reference);
  expect(email.html).toContain("E2E Airport");
  expect(email.html).not.toMatch(/\{\{|\bundefined\b|\bnull\b/i);
  expect(email.text).not.toMatch(/\{\{|\bundefined\b|\bnull\b/i);

  const pickupLine = email.text.split("\n").find((line) => line.startsWith(pickupPrefix));
  expect(pickupLine).toBeTruthy();
  expect(email.html).toContain(pickupLine.slice(pickupPrefix.length).trim());
  if (returnPrefix) {
    const returnLine = email.text.split("\n").find((line) => line.startsWith(returnPrefix));
    expect(returnLine).toBeTruthy();
    expect(email.html).toContain(returnLine.slice(returnPrefix.length).trim());
  }
}

test.beforeEach(async ({ isMobile }) => {
  test.skip(isMobile, "Database-backed email tests run once in Chromium.");
  await truncateE2EData();
  await clearEmails();
});

test.afterAll(async () => {
  await prisma.$disconnect();
  await startFakeSmtp();
});

test("failed reCAPTCHA rejects the quote before a quote or email is stored", async () => {
  const result = await postJson(
    api,
    "/api/v1/quotes",
    quoteRequest("recaptcha-fail@example.test", "e2e-invalid-token"),
  );
  expect(result.response.status).toBe(400);
  expect(await prisma.quote.count()).toBe(0);
  expect(await prisma.emailOutbox.count()).toBe(0);
  expect(await getEmails()).toHaveLength(0);
});

test("quote request stores two outbox rows and delivers both messages to the fake SMTP server", async () => {
  const customer = "quote-customer@example.test";
  const result = await postJson(api, "/api/v1/quotes", quoteRequest(customer));
  expect(result.response.status).toBe(202);
  const reference = result.body.data.reference;
  expect(reference).toMatch(/^\d{4}[A-Z]{2}$/);

  const customerEmail = await waitForEmail({ to: customer, subjectContains: reference });
  const agencyEmail = await waitForEmail({ to: "agency@example.test", subjectContains: reference });
  expect(customerEmail.subject).toContain("quote request");
  expect(agencyEmail.subject).toContain(reference);
  expect(customerEmail.text).toContain(reference);
  expect(customerEmail.text).toContain("E2E Airport");
  expect(customerEmail.text).toContain("Vehicle category: D1");
  expect(customerEmail.text).not.toContain("+302106022220");
  expect(customerEmail.text).toContain("agency@example.test");
  expect(agencyEmail.text).toContain("+302106022220");
  expect(agencyEmail.text).toContain("Driver age: 30");
  expect(agencyEmail.text).toContain("Automated E2E request");

  const quote = await prisma.quote.findUniqueOrThrow({ where: { reference } });
  const outbox = await prisma.emailOutbox.findMany({ where: { quoteId: quote.id } });
  expect(outbox).toHaveLength(2);
  expect(outbox.every((row) => row.status === "SENT")).toBe(true);

  const contents = [customerEmail, agencyEmail];
  for (const email of contents) {
    expectCompleteEmail(email, reference);
    const internalLinks = [...email.html.matchAll(/href=["'](https?:\/\/localhost:5183[^"']*)["']/g)]
      .map((match) => match[1]);
    for (const link of internalLinks) {
      const response = await fetch(link);
      expect(response.status).toBeLessThan(400);
    }
  }
  expect(agencyEmail.html).toContain("Driver age");
  expect(agencyEmail.html).toContain("Automated E2E request");
});

test("queued quote emails remain pending while SMTP is down and deliver after it returns", async () => {
  await startFakeSmtp();
  await stopFakeSmtp();
  try {
    const customer = "retry-customer@example.test";
    const result = await postJson(api, "/api/v1/quotes", quoteRequest(customer));
    expect(result.response.status).toBe(202);
    const quote = await prisma.quote.findUniqueOrThrow({ where: { reference: result.body.data.reference } });

    await expect.poll(async () => {
      const rows = await prisma.emailOutbox.findMany({ where: { quoteId: quote.id } });
      return rows.length === 2 && rows.some((row) => row.attempts > 0) && rows.every((row) => row.status === "PENDING");
    }).toBe(true);
    await prisma.emailOutbox.updateMany({
      where: { quoteId: quote.id, status: "PENDING" },
      data: { nextAttemptAt: new Date() },
    });
  } finally {
    await startFakeSmtp();
  }

  const retryTrigger = await postJson(api, "/api/v1/quotes", quoteRequest("retry-trigger@example.test"));
  expect(retryTrigger.response.status).toBe(202);
  const triggerQuote = await prisma.quote.findUniqueOrThrow({
    where: { reference: retryTrigger.body.data.reference },
  });
  await waitForEmail({ to: "retry-trigger@example.test", subjectContains: triggerQuote.reference });
  await waitForEmail({ to: "agency@example.test", subjectContains: triggerQuote.reference });
  await expect.poll(() => prisma.emailOutbox.count({
    where: { quoteId: triggerQuote.id, status: "SENT" },
  })).toBe(2);
  const quote = await prisma.quote.findFirstOrThrow({ where: { customerEmail: "retry-customer@example.test" } });
  await waitForEmail({ to: "retry-customer@example.test", subjectContains: quote.reference });
  await expect.poll(async () => (
    await prisma.emailOutbox.findMany({
      where: { quoteId: quote.id },
      orderBy: { template: "asc" },
      select: { template: true, status: true, lastError: true },
    })
  ), { timeout: 30_000 }).toEqual([
    { template: "internal_quote_notification", status: "SENT", lastError: null },
    { template: "quote_acknowledgement", status: "SENT", lastError: null },
  ]);
});

test("a paid webhook sends one confirmation containing the paid deposit and remaining balance", async () => {
  await startFakeSmtp();
  const quote = await prisma.quote.create({
    data: {
      reference: `ACR-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
      status: "DEPOSIT_PENDING",
      customerFirstName: "E2E",
      customerLastName: "Customer",
      customerEmail: "paid-customer@example.test",
      customerPhone: "+302106022220",
      customerCountry: "GR",
      pickupLocationId: (await prisma.location.findUniqueOrThrow({ where: { slug: "e2e-airport" } })).id,
      returnLocationId: (await prisma.location.findUniqueOrThrow({ where: { slug: "e2e-airport" } })).id,
      pickupAt: new Date(Date.now() + 10 * 86_400_000),
      returnAt: new Date(Date.now() + 12 * 86_400_000),
      driverAge: 30,
      driverLicenceYears: 8,
      driverHasInternationalPermit: false,
      additionalDrivers: [],
      categorySlug: "e2e-standard-d1",
      quotedTotalEur: "250.00",
      depositEur: "100.00",
      vehicles: {
        create: { vehicleId: (await prisma.vehicle.findUniqueOrThrow({ where: { slug: "e2e-standard-d1" } })).id },
      },
    },
  });
  const checkout = await postJson(paymentApi, "/api/payments/checkout", {
    reference: quote.reference,
    email: quote.customerEmail,
  }, { "Idempotency-Key": crypto.randomUUID() });
  expect(checkout.response.status).toBe(200);
  const payment = await prisma.payment.findFirstOrThrow({ where: { quoteId: quote.id } });
  const event = checkoutEvent("checkout.session.completed", {
    id: `evt_email_paid_${quote.id}`,
    bookingId: quote.id,
    reference: quote.reference,
    paymentIntent: payment.providerPaymentIntentId,
    paymentStatus: "paid",
  });
  event.data.object.id = payment.providerTransactionId;
  expect((await createStripeWebhook(event, paymentApi)).status).toBe(200);

  const customerEmail = await waitForEmail({ to: quote.customerEmail, subjectContains: quote.reference });
  const agencyEmail = await waitForEmail({ to: "agency@example.test", subjectContains: quote.reference });
  expect(customerEmail.text).toContain("100.00");
  expect(customerEmail.text).toContain("150.00");
  expectCompleteEmail(customerEmail, quote.reference, { returnPrefix: "Drop-off:" });
  expectCompleteEmail(agencyEmail, quote.reference, { returnPrefix: "Drop-off:" });
  expect(customerEmail.html).toContain("100.00");
  expect(customerEmail.html).toContain("150.00");
  expect(agencyEmail.html).toContain("100.00");
  expect(agencyEmail.html).toContain("150.00");
  expect(await prisma.emailOutbox.count({ where: { quoteId: quote.id, status: "SENT" } })).toBe(2);
  expect((await getEmails({ to: quote.customerEmail, subjectContains: quote.reference })).length).toBe(1);
});

test("the Request a quote form creates a reservation and sends HTML and text to customer and agency", async ({ page }) => {
  const pickupDate = "2030-07-12";
  const returnDate = "2030-07-14";
  let reservationRequests = 0;
  page.on("request", (request) => {
    if (request.url() === `${api}/api/reservations` && request.method() === "POST") reservationRequests += 1;
  });
  await page.goto(`/quote?pickupLocation=E2E%20Airport&pickupDate=${pickupDate}&pickupTime=10%3A00&returnDate=${returnDate}&returnTime=10%3A00`);
  const category = page.getByLabel("Vehicle category");
  await expect(category.locator('option[value="e2e-standard-d1"]')).toHaveCount(1);
  await category.selectOption("e2e-standard-d1");
  await page.getByLabel("First name").fill("E2E");
  await page.getByLabel("Last name").fill("Form");
  await page.getByLabel("Email").fill("form-customer@example.test");
  await page.getByLabel("Phone").fill("+302106022220");
  await page.getByLabel("Country").fill("Greece");
  await page.getByRole("checkbox", { name: /accept the processing of my personal data/i }).check();

  const reservationResponsePromise = page.waitForResponse((response) =>
    response.url() === `${api}/api/reservations` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Submit quote" }).click();
  const reservationResponse = await reservationResponsePromise;
  expect(reservationResponse.status()).toBe(201);
  await page.waitForURL(/\/pay\?ref=/);
  const reference = new URL(page.url()).searchParams.get("ref");
  expect(reference).toMatch(/^\d{4}[A-Z]{2}$/);
  expect(reservationRequests).toBe(1);

  const customerEmail = await waitForEmail({
    to: "form-customer@example.test",
    subjectContains: reference,
  });
  const agencyEmail = await waitForEmail({ to: "agency@example.test", subjectContains: reference });
  expect(customerEmail.subject).toContain(reference);
  expect(customerEmail.text).toContain(`Category: E2E test category (D1)`);
  expect(customerEmail.text).toContain("E2E Airport");
  expect(customerEmail.text).toContain("Jul 2030");
  expect(customerEmail.text).toContain("Rental days: 2");
  expect(customerEmail.text).toContain("Deposit due: EUR");
  expect(agencyEmail.text).toContain("form-customer@example.test");
  expect(agencyEmail.text).toContain(reference);

  for (const email of [customerEmail, agencyEmail]) {
    expect(email.text).not.toMatch(/\{\{[^}]+\}\}|\bundefined\b/);
    expect(email.html).not.toMatch(/\{\{[^}]+\}\}|\bundefined\b/);
    expect(email.html.trim()).not.toBe("");
    const internalLinks = [...email.html.matchAll(/href=["'](https?:\/\/localhost:5183[^"']*)["']/g)]
      .map((match) => match[1]);
    for (const link of internalLinks) {
      expect((await fetch(link)).status).toBeLessThan(400);
    }
  }
  expect(await prisma.emailOutbox.count()).toBe(0);
});

test("reservation honeypot, invalid fields, and inquiry rate limit suppress mail", async () => {
  const pickupAt = new Date(Date.now() + 10 * 86_400_000).toISOString();
  const returnAt = new Date(Date.now() + 12 * 86_400_000).toISOString();
  const reservationBody = {
    carId: "D1",
    pickupLocation: "e2e-airport",
    returnLocation: "e2e-airport",
    pickupAt,
    returnAt,
    driverAge: 30,
    driverLicenceYears: 5,
    firstName: "E2E",
    lastName: "Honeypot",
    email: "honeypot@example.test",
    phone: "+302106022220",
    country: "Greece",
    privacyAccepted: true,
    website: "spam-value",
  };
  const honeypot = await postJson(api, "/api/reservations", reservationBody);
  expect(honeypot.response.status).toBe(400);
  expect(await prisma.emailOutbox.count()).toBe(0);
  expect(await getEmails()).toHaveLength(0);

  const invalid = await postJson(api, "/api/v1/quotes", {
    ...quoteRequest("invalid@example.test"),
    customer: { ...quoteRequest("bad-email") .customer, email: "not-an-email" },
    driver: { age: 17, licenceYears: 0, countryCode: "GR", hasInternationalPermit: false },
    pickupAt: returnAt,
    returnAt: pickupAt,
  });
  expect(invalid.response.status).toBe(400);
  expect(await prisma.emailOutbox.count()).toBe(0);

  const inquiry = {
    name: "E2E Spam",
    email: "spam@example.test",
    phone: "+302106022220",
    van: "Not sure yet",
    pickupLocation: "E2E Airport",
    pickupAt,
    returnAt,
    privacyAccepted: true,
    website: "bot",
  };
  const responses = [];
  for (let index = 0; index < 6; index += 1) {
    responses.push((await postJson(isolatedRateLimitApi, "/api/inquiries", inquiry)).response.status);
  }
  expect(responses.slice(0, 5)).toEqual(Array(5).fill(202));
  expect(responses[5]).toBe(429);
  expect(await prisma.contactMessage.count()).toBe(0);
  expect(await getEmails()).toHaveLength(0);
});
