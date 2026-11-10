import { expect, test } from "@playwright/test";
import { clearEmails, waitForEmail } from "./helpers/smtp.mjs";
import { checkoutEvent, createStripeWebhook, postJson } from "./helpers/api.mjs";
import { createPayableQuote, prisma, truncateE2EData } from "./helpers/db.mjs";

const api = "http://localhost:4105";
const stripeMock = "http://localhost:12111";
const noKeyApi = "http://localhost:4101";
const rateLimitedApi = "http://localhost:4102";
const webhookApi = "http://localhost:4100";
const stripeSmokeApi = "http://localhost:4104";
const idempotencyKey = () => crypto.randomUUID();

test.beforeEach(async ({ isMobile }) => {
  test.skip(isMobile, "API contract tests run once in the Chromium project.");
  await truncateE2EData();
  await clearEmails();
  await fetch(`${stripeMock}/__test/reset`, { method: "POST" });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("CORS preflight permits the payment idempotency header from the frontend", async () => {
  const response = await fetch(`${api}/api/payments/checkout`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5183",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,idempotency-key",
    },
  });
  const allowedHeaders = response.headers.get("access-control-allow-headers")
    ?.toLowerCase()
    .split(",")
    .map((header) => header.trim());

  expect(response.status).toBe(204);
  expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:5183");
  expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  expect(allowedHeaders).toContain("idempotency-key");
});

test("checkout creates one fake Stripe session for concurrent calls with the same idempotency key", async () => {
  const quote = await createPayableQuote();
  const key = idempotencyKey();
  const makeRequest = () => postJson(
    api,
    "/api/payments/checkout",
    { reference: quote.reference, email: quote.customerEmail },
    { "Idempotency-Key": key },
  );
  const [first, second] = await Promise.all([makeRequest(), makeRequest()]);

  expect(first.response.status).toBe(200);
  expect(second.response.status).toBe(200);
  expect(first.body.data.url).toMatch(/^http:\/\/stripe-mock\.invalid\/checkout\//);
  expect(second.body.data.url).toBe(first.body.data.url);
  const fakeSessions = await (await fetch(`${stripeMock}/__test/sessions`)).json();
  expect(fakeSessions.count).toBe(1);
  expect(fakeSessions.sessions[0].amount_total).toBe(10_000);
  expect(fakeSessions.sessions[0].metadata.booking_id).toBe(quote.id);

  const paymentRows = await prisma.payment.findMany({ where: { quoteId: quote.id } });
  expect(paymentRows).toHaveLength(1);
  expect(Number(paymentRows[0].amountEur)).toBe(100);
});

test("client-supplied amounts are rejected and cannot override the database deposit", async () => {
  const quote = await createPayableQuote({ deposit: 125 });
  const key = idempotencyKey();
  const rejected = await postJson(api, "/api/payments/checkout", {
    reference: quote.reference,
    email: quote.customerEmail,
    amount: 1,
  }, { "Idempotency-Key": key });
  expect(rejected.response.status).toBe(400);

  const accepted = await postJson(api, "/api/payments/checkout", {
    reference: quote.reference,
    email: quote.customerEmail,
  }, { "Idempotency-Key": key });
  expect(accepted.response.status).toBe(200);
  const fakeSessions = await (await fetch(`${stripeMock}/__test/sessions`)).json();
  expect(fakeSessions.sessions[0].amount_total).toBe(12_500);
});

test("unknown reference and wrong email return the same not-found response", async () => {
  const quote = await createPayableQuote();
  const unknown = await postJson(api, "/api/payments/checkout", {
    reference: "ACR-2099-NOTFND",
    email: quote.customerEmail,
  }, { "Idempotency-Key": idempotencyKey() });
  const wrongEmail = await postJson(api, "/api/payments/checkout", {
    reference: quote.reference,
    email: "wrong@example.test",
  }, { "Idempotency-Key": idempotencyKey() });

  expect(unknown.response.status).toBe(404);
  expect(wrongEmail.response.status).toBe(404);
  expect(wrongEmail.body).toEqual(unknown.body);
});

test("a confirmed reservation cannot start another checkout", async () => {
  const quote = await createPayableQuote({ status: "CONFIRMED" });
  const result = await postJson(api, "/api/payments/checkout", {
    reference: quote.reference,
    email: quote.customerEmail,
  }, { "Idempotency-Key": idempotencyKey() });
  expect(result.response.status).toBe(409);
  expect((await fetch(`${stripeMock}/__test/sessions`).then((response) => response.json())).count).toBe(0);
});

test("missing Stripe keys return exactly one explicit 503 response", async () => {
  const result = await postJson(noKeyApi, "/api/payments/checkout", {
    reference: "ACR-2099-NOTFND",
    email: "customer@example.test",
  }, { "Idempotency-Key": idempotencyKey() });
  expect(result.response.status).toBe(503);
  expect(result.body).toEqual({ error: "payment_not_configured" });
});

test("the 11th checkout request in a minute is rate limited", async () => {
  const quote = await createPayableQuote();
  const responses = [];
  for (let index = 0; index < 11; index += 1) {
    const result = await postJson(rateLimitedApi, "/api/payments/checkout", {
      reference: quote.reference,
      email: quote.customerEmail,
    }, { "Idempotency-Key": idempotencyKey() });
    responses.push(result.response.status);
  }
  expect(responses.slice(0, 10)).toEqual(Array(10).fill(200));
  expect(responses[10]).toBe(429);
});

test("invalid Stripe signatures are rejected without changing payment or reservation state", async () => {
  const quote = await createPayableQuote();
  const checkout = await postJson(api, "/api/payments/checkout", {
    reference: quote.reference,
    email: quote.customerEmail,
  }, { "Idempotency-Key": idempotencyKey() });
  expect(checkout.response.status).toBe(200);

  const response = await fetch(`${api}/api/payments/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": "invalid" },
    body: "{}",
  });
  expect(response.status).toBe(400);
  expect((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("DEPOSIT_PENDING");
});

test("a signed paid event confirms once and sends one customer and one agency email", async () => {
  const quote = await createPayableQuote({ total: 250, deposit: 100 });
  const checkout = await postJson(webhookApi, "/api/payments/checkout", {
    reference: quote.reference,
    email: quote.customerEmail,
  }, { "Idempotency-Key": idempotencyKey() });
  const sessionId = new URL(checkout.body.data.url).pathname.split("/").pop();
  const payment = await prisma.payment.findFirstOrThrow({ where: { quoteId: quote.id } });
  const event = checkoutEvent("checkout.session.completed", {
    id: `evt_paid_${quote.id}`,
    bookingId: quote.id,
    reference: quote.reference,
    paymentIntent: payment.providerPaymentIntentId,
    paymentStatus: "paid",
  });
  event.data.object.id = payment.providerTransactionId ?? sessionId;

  const first = await createStripeWebhook(event, webhookApi);
  expect(first.status).toBe(200);
  await waitForEmail({ to: quote.customerEmail, subjectContains: quote.reference });
  await waitForEmail({ to: "agency@example.test", subjectContains: quote.reference });
  const sentRows = await prisma.emailOutbox.findMany({
    where: { quoteId: quote.id, template: { in: ["deposit_confirmation", "internal_deposit_paid"] } },
  });
  expect(sentRows).toHaveLength(2);
  expect(sentRows.every((row) => row.status === "SENT")).toBe(true);

  const replay = await createStripeWebhook(event, webhookApi);
  expect(replay.status).toBe(200);
  expect(await prisma.emailOutbox.count({
    where: { quoteId: quote.id, template: { in: ["deposit_confirmation", "internal_deposit_paid"] } },
  })).toBe(2);
  expect((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("CONFIRMED");
  expect((await fetch(`${stripeMock}/__test/sessions`).then((response) => response.json())).count).toBe(1);
});

test("signed expired and failed events update their payment status", async () => {
  const expiredQuote = await createPayableQuote();
  await postJson(api, "/api/payments/checkout", {
    reference: expiredQuote.reference,
    email: expiredQuote.customerEmail,
  }, { "Idempotency-Key": idempotencyKey() });
  const expiredPayment = await prisma.payment.findFirstOrThrow({ where: { quoteId: expiredQuote.id } });
  const expiredEvent = checkoutEvent("checkout.session.expired", {
    id: `evt_expired_${expiredQuote.id}`,
    bookingId: expiredQuote.id,
    reference: expiredQuote.reference,
    paymentIntent: expiredPayment.providerPaymentIntentId,
  });
  expiredEvent.data.object.id = expiredPayment.providerTransactionId;
  expect((await createStripeWebhook(expiredEvent, api)).status).toBe(200);
  expect((await prisma.payment.findUniqueOrThrow({ where: { id: expiredPayment.id } })).status).toBe("EXPIRED");

  const failedQuote = await createPayableQuote();
  await postJson(api, "/api/payments/checkout", {
    reference: failedQuote.reference,
    email: failedQuote.customerEmail,
  }, { "Idempotency-Key": idempotencyKey() });
  const failedPayment = await prisma.payment.findFirstOrThrow({ where: { quoteId: failedQuote.id } });
  const failedEvent = {
    id: `evt_failed_${failedQuote.id}`,
    object: "event",
    api_version: "2025-03-31.basil",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: failedPayment.providerPaymentIntentId,
        object: "payment_intent",
        metadata: { booking_id: failedQuote.id, reference: failedQuote.reference },
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "payment_intent.payment_failed",
  };
  expect((await createStripeWebhook(failedEvent, api)).status).toBe(200);
  expect((await prisma.payment.findUniqueOrThrow({ where: { id: failedPayment.id } })).status).toBe("FAILED");
});

test("optional real Stripe test mode returns a hosted session URL without opening Stripe", async () => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  test.skip(
    !stripeSecret.startsWith("sk_test_")
      || stripeSecret === "sk_test_your_secret_key_here"
      || !webhookSecret.startsWith("whsec_")
      || webhookSecret === "whsec_e2e_fake"
      || process.env.STRIPE_WEBHOOK_LOCAL !== "1",
    "Set a Stripe test secret, a local stripe listen webhook secret, and STRIPE_WEBHOOK_LOCAL=1 to opt in.",
  );
  const quote = await createPayableQuote();
  const result = await postJson(stripeSmokeApi, "/api/payments/checkout", {
    reference: quote.reference,
    email: quote.customerEmail,
  }, { "Idempotency-Key": idempotencyKey() });

  expect(result.response.status).toBe(200);
  expect(result.body.data.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
});
