import assert from "node:assert/strict";
import test from "node:test";
import "dotenv/config";

test("payment portal validates deposits and applies signed callbacks once", {
  skip: process.env.RUN_DATABASE_TESTS !== "true",
}, async () => {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/athens_car_rental?schema=public";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-change-before-production";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-change-before-production";
  process.env.RECAPTCHA_SECRET_KEY = "integration-test-secret";
  process.env.RECAPTCHA_EXPECTED_HOSTNAMES = "localhost";
  process.env.SMTP_HOST = "";
  process.env.SMTP_USER = "";
  process.env.SMTP_PASSWORD = "";
  process.env.SMTP_FROM = "";
  process.env.PAYMENT_PORTAL_URL = "https://portal.example.test/pay";

  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://www.google.com/recaptcha/api/siteverify")) {
      return Response.json({
        success: true,
        score: 0.9,
        action: "payment_init",
        hostname: "localhost",
      });
    }
    return nativeFetch(input, init);
  };

  const [{ app }, { prisma }, { MockProvider }, bcrypt] = await Promise.all([
    import("../src/app"),
    import("../src/db"),
    import("../src/services/payment-providers/mock-provider"),
    import("bcryptjs"),
  ]);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString();
  const vehicle = await prisma.vehicle.create({
    data: {
      code: `T${suffix}`,
      slug: `payment-test-${suffix}`,
      name: { en: "Test category", el: "Δοκιμή" },
      exampleModels: [],
      group: "STANDARD",
      cdwExcessEur: "500.00",
    },
  });
  const location = await prisma.location.create({
    data: {
      slug: `payment-test-${suffix}`,
      name: { en: "Test location", el: "Δοκιμή" },
      isAirport: true,
      isFree: true,
    },
  });
  const references: string[] = [];
  const adminEmail = `admin-${suffix}@example.com`;
  const adminPassword = "integration-test-password";
  let adminUserId: string | undefined;

  const createQuote = async (email: string, status = "QUOTE_SENT"): Promise<string> => {
    const quote = await prisma.quote.create({
      data: {
        reference: `${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}AC`,
        status,
        customerFirstName: "Test",
        customerLastName: "Customer",
        customerEmail: email,
        customerPhone: "+302106022220",
        customerCountry: "GR",
        language: "el",
        pickupLocationId: location.id,
        returnLocationId: location.id,
        pickupAt: new Date(Date.now() + 10 * 86_400_000),
        returnAt: new Date(Date.now() + 12 * 86_400_000),
        driverAge: 25,
        driverLicenceYears: 2,
        driverHasInternationalPermit: false,
        additionalDrivers: [],
        quotedTotalEur: "500.00",
        depositEur: "100.00",
        expiresAt: new Date(Date.now() + 86_400_000),
        vehicles: { create: { vehicleId: vehicle.id } },
      },
    });
    references.push(quote.reference);
    return quote.reference;
  };
  const makeRequest = (reference: string, overrides: Record<string, unknown> = {}) => ({
    firstName: "Test",
    lastName: "Customer",
    email: "payments@example.com",
    country: "GR",
    state: "",
    city: "Athens",
    zipcode: "10000",
    address: "Test street 1",
    mobile: "+302106022220",
    amount: 100,
    reservationReference: reference,
    deliveryDate: "12/7/2026",
    acceptedTerms: true,
    recaptchaToken: "payment-test-token",
    ...overrides,
  });
  const post = (path: string, body: unknown) => nativeFetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  try {
    const reference = await createQuote("payments@example.com");

    const termsRejected = await post("/api/v1/payments/init", makeRequest(reference, { acceptedTerms: false }));
    assert.equal(termsRejected.status, 422);

    const lowAmount = await post("/api/v1/payments/init", makeRequest(reference, { amount: 49 }));
    assert.equal(lowAmount.status, 422);

    const highAmount = await post("/api/v1/payments/init", makeRequest(reference, { amount: 501 }));
    assert.equal(highAmount.status, 422);

    const unknownReference = await post(
      "/api/v1/payments/init",
      makeRequest("9999ZZ"),
    );
    assert.equal(unknownReference.status, 404);

    const initialized = await post("/api/v1/payments/init", makeRequest(reference));
    assert.equal(initialized.status, 201);
    const initBody = await initialized.json() as {
      data: {
        paymentId: string;
        status: string;
        redirectParameters: { transactionId: string };
        terms: Array<{ cdwPreauthorization: { amountEur: string; charged: boolean } }>;
      };
    };
    assert.equal(initBody.data.status, "INITIATED");
    assert.equal(initBody.data.terms[0]?.cdwPreauthorization.amountEur, "500.00");
    assert.equal(initBody.data.terms[0]?.cdwPreauthorization.charged, false);

    const provider = new MockProvider();
    const callback = provider.createCallback(initBody.data.redirectParameters.transactionId, "PAID");
    const callbackFirst = await post("/api/v1/payments/callback", callback);
    assert.equal(callbackFirst.status, 200);
    const callbackReplay = await post("/api/v1/payments/callback", callback);
    assert.equal(callbackReplay.status, 200);
    const callbackReplayBody = await callbackReplay.json() as { data: { duplicate: boolean } };
    assert.equal(callbackReplayBody.data.duplicate, true);

    const storedPayment = await prisma.payment.findUniqueOrThrow({
      where: { id: initBody.data.paymentId },
    });
    assert.equal(storedPayment.status, "PAID");
    assert.deepEqual(storedPayment.providerResponse, {
      transactionId: initBody.data.redirectParameters.transactionId,
      outcome: "PAID",
    });
    const storedQuote = await prisma.quote.findUniqueOrThrow({ where: { reference } });
    assert.equal(storedQuote.status, "CONFIRMED");
    const paymentEmails = await prisma.emailOutbox.findMany({
      where: { quoteId: storedQuote.id },
      orderBy: { template: "asc" },
    });
    assert.deepEqual(
      paymentEmails.map(({ template, language }) => ({ template, language })),
      [
        { template: "deposit_confirmation", language: "el" },
        { template: "internal_deposit_paid", language: "el" },
      ],
    );
    assert.equal(
      (paymentEmails.find(({ template }) => template === "deposit_confirmation")?.payload as { amountPaidEur: string }).amountPaidEur,
      "100.00",
    );

    const adminHash = await bcrypt.hash(adminPassword, 4);
    const admin = await prisma.adminUser.create({
      data: { email: adminEmail, passwordHash: adminHash, role: "ADMIN" },
      select: { id: true },
    });
    adminUserId = admin.id;
    const login = await post("/api/v1/admin/auth/login", { email: adminEmail, password: adminPassword });
    assert.equal(login.status, 200);
    const loginBody = await login.json() as { data: { accessToken: string } };

    const offerReference = await createQuote("offer@example.com", "IN_PROGRESS");
    const offerQuote = await prisma.quote.findUniqueOrThrow({ where: { reference: offerReference } });
    const sendOffer = await nativeFetch(`${baseUrl}/api/v1/admin/quotes/${offerQuote.id}/send-quote`, {
      method: "POST",
      headers: { authorization: `Bearer ${loginBody.data.accessToken}` },
    });
    assert.equal(sendOffer.status, 202);
    const offerOutbox = await prisma.emailOutbox.findFirstOrThrow({
      where: { quoteId: offerQuote.id, template: "quote_offer" },
    });
    assert.equal(offerOutbox.language, "el");
    const offerPayload = offerOutbox.payload as { paymentUrl: string; reference: string };
    assert.equal(offerPayload.reference, offerReference);
    assert.equal(new URL(offerPayload.paymentUrl).searchParams.get("reservationReference"), offerReference);

    const failedReference = await createQuote("payments@example.com");
    const failedInit = await post("/api/v1/payments/init", makeRequest(failedReference));
    assert.equal(failedInit.status, 201);
    const failedInitBody = await failedInit.json() as {
      data: { paymentId: string; redirectParameters: { transactionId: string } };
    };
    const failureCallback = provider.createCallback(
      failedInitBody.data.redirectParameters.transactionId,
      "FAILED",
    );
    assert.equal((await post("/api/v1/payments/callback", failureCallback)).status, 200);
    assert.equal(
      (await prisma.payment.findUniqueOrThrow({ where: { id: failedInitBody.data.paymentId } })).status,
      "FAILED",
    );
  } finally {
    for (const reference of references) {
      await prisma.payment.deleteMany({ where: { quote: { reference } } });
      await prisma.quote.deleteMany({ where: { reference } });
    }
    if (adminUserId) await prisma.adminUser.delete({ where: { id: adminUserId } });
    await prisma.vehicle.delete({ where: { id: vehicle.id } });
    await prisma.location.delete({ where: { id: location.id } });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    globalThis.fetch = nativeFetch;
    await prisma.$disconnect();
  }
});
