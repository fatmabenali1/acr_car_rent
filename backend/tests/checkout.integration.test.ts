import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";

test("Stripe checkout API creates private bookings and processes signed webhooks idempotently", {
  skip: process.env.RUN_DATABASE_TESTS !== "true",
}, async () => {
  process.env.DATABASE_URL ??= "******localhost:5432/athens_car_rental?schema=public";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-change-before-production";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-change-before-production";
  process.env.STRIPE_SECRET_KEY = "sk_test_your_secret_key_here";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_checkout_integration";
  process.env.SMTP_HOST = "";
  process.env.SMTP_USER = "";
  process.env.SMTP_PASSWORD = "";
  process.env.SMTP_FROM = "";

  const [{ app }, { prisma }] = await Promise.all([
    import("../src/app"),
    import("../src/db"),
  ]);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString();
  const email = `checkout-${suffix}@example.com`;
  const vehicle = await prisma.vehicle.create({
    data: {
      code: `B${suffix.slice(-5)}`,
      slug: `checkout-test-${suffix}`,
      name: { en: "Checkout test category", el: "Δοκιμή" },
      exampleModels: ["Test car"],
      group: "STANDARD",
    },
  });
  const location = await prisma.location.create({
    data: {
      slug: `checkout-test-${suffix}`,
      name: { en: "Checkout test location", el: "Δοκιμή" },
      isAirport: true,
      isFree: true,
    },
  });
  const quoteIds: string[] = [];
  const references: string[] = [];
  const post = (path: string, body: unknown) => fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  try {
    const bookingResponse = await post("/api/bookings", {
      categorySlug: vehicle.slug,
      pickupLocation: location.slug,
      pickupAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      dropoffAt: new Date(Date.now() + 12 * 86_400_000).toISOString(),
      driverAge: 25,
      driverLicenceYears: 1,
      customer: {
        firstName: "Test",
        lastName: "Customer",
        email,
        phone: "+302106022220",
        country: "GR",
      },
    });
    assert.equal(bookingResponse.status, 201);
    const createdBooking = await bookingResponse.json() as { data: { reference: string } };
    assert.match(createdBooking.data.reference, /^ACR-\d{4}-[A-Z0-9]{6}$/);
    references.push(createdBooking.data.reference);
    const createdQuote = await prisma.quote.findUniqueOrThrow({ where: { reference: createdBooking.data.reference } });
    quoteIds.push(createdQuote.id);

    const amountInjection = await post("/api/bookings", {
      categorySlug: vehicle.slug,
      pickupLocation: location.slug,
      pickupAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      dropoffAt: new Date(Date.now() + 12 * 86_400_000).toISOString(),
      driverAge: 25,
      driverLicenceYears: 1,
      amount: 1,
      customer: { firstName: "Test", lastName: "Customer", email, phone: "+302106022220", country: "GR" },
    });
    assert.equal(amountInjection.status, 400);
    const checkoutAmountInjection = await post("/api/payments/checkout", {
      reference: createdBooking.data.reference,
      email,
      amount: 1,
    });
    assert.equal(checkoutAmountInjection.status, 400);

    const wrongEmail = await fetch(
      `${baseUrl}/api/bookings/${createdBooking.data.reference}?email=not-the-customer%40example.com`,
    );
    assert.equal(wrongEmail.status, 404);

    const invalidSignature = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": "invalid" },
      body: "{}",
    });
    assert.equal(invalidSignature.status, 400);

    const payableQuote = await prisma.quote.create({
      data: {
        reference: `${Math.floor(Math.random() * 10_000).toString().padStart(4, "0")}ZZ`,
        status: "DEPOSIT_PENDING",
        customerFirstName: "Test",
        customerLastName: "Customer",
        customerEmail: email,
        customerPhone: "+302106022220",
        customerCountry: "GR",
        pickupLocationId: location.id,
        returnLocationId: location.id,
        pickupAt: new Date(Date.now() + 10 * 86_400_000),
        returnAt: new Date(Date.now() + 12 * 86_400_000),
        driverAge: 25,
        driverLicenceYears: 1,
        driverHasInternationalPermit: false,
        additionalDrivers: [],
        quotedTotalEur: "500.00",
        depositEur: "100.00",
        vehicles: { create: { vehicleId: vehicle.id } },
      },
      select: { id: true, reference: true },
    });
    quoteIds.push(payableQuote.id);
    references.push(payableQuote.reference);
    const sessionId = `cs_test_${suffix}`;
    await prisma.payment.create({
      data: {
        quoteId: payableQuote.id,
        provider: "stripe",
        providerTransactionId: sessionId,
        idempotencyKey: `checkout-test-${suffix}`,
        amountEur: "100.00",
        currency: "EUR",
        status: "CREATED",
        customerFirstName: "Test",
        customerLastName: "Customer",
        customerEmail: email,
        billingAddress: {},
        termsAcceptedAt: new Date(),
      },
    });

    const stripe = new Stripe("sk_test_your_secret_key_here");
    const payload = JSON.stringify({
      id: `evt_checkout_${suffix}`,
      object: "event",
      api_version: "2025-03-31.basil",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: sessionId,
          object: "checkout.session",
          payment_status: "paid",
          status: "complete",
          payment_intent: `pi_test_${suffix}`,
          metadata: { booking_id: payableQuote.id, reference: payableQuote.reference },
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: "checkout.session.completed",
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_checkout_integration",
    });
    const sendWebhook = () => fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": signature },
      body: payload,
    });
    assert.equal((await sendWebhook()).status, 200);
    assert.equal((await sendWebhook()).status, 200);
    assert.equal((await prisma.quote.findUniqueOrThrow({ where: { id: payableQuote.id } })).status, "CONFIRMED");
    assert.equal((await prisma.payment.findFirstOrThrow({ where: { providerTransactionId: sessionId } })).status, "PAID");
    assert.equal(await prisma.processedStripeEvent.count({ where: { eventId: `evt_checkout_${suffix}` } }), 1);
    assert.equal(await prisma.emailOutbox.count({ where: { quoteId: payableQuote.id, template: { in: ["deposit_confirmation", "internal_deposit_paid"] } } }), 2);

    const limitedRequests = await Promise.all(Array.from({ length: 10 }, () => fetch(
      `${baseUrl}/api/bookings/${createdBooking.data.reference}?email=${encodeURIComponent(email)}`,
    )));
    assert.ok(limitedRequests.some((result) => result.status === 429));
  } finally {
    await prisma.payment.deleteMany({ where: { quoteId: { in: quoteIds } } });
    await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
    await prisma.location.delete({ where: { id: location.id } });
    await prisma.vehicle.delete({ where: { id: vehicle.id } });
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
