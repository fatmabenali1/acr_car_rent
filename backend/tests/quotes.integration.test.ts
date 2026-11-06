import assert from "node:assert/strict";
import test from "node:test";
import "dotenv/config";

test("public quote and contact forms validate reCAPTCHA, persist submissions and queue notifications", {
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

  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://www.google.com/recaptcha/api/siteverify")) {
      const token = new URLSearchParams(String(init?.body ?? "")).get("response");
      return Response.json({
        success: true,
        score: 0.9,
        action: token === "wrong-action" || token === "contact-token"
          ? "contact"
          : "quote_request",
        hostname: "localhost",
      });
    }
    return nativeFetch(input, init);
  };

  const [{ app }, { prisma }] = await Promise.all([
    import("../src/app"),
    import("../src/db"),
  ]);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const pickupAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const returnAt = new Date(pickupAt.getTime() + 2 * 24 * 60 * 60 * 1000);
  const email = `quote-test-${Date.now()}@example.com`;
  const contactEmail = `contact-test-${Date.now()}@example.com`;
  let reference: string | undefined;

  try {
    const baseRequest = {
      vehicleSlug: "standard-b",
      pickupLocationSlug: "athens-international-airport",
      returnLocationSlug: "athens-international-airport",
      pickupAt: pickupAt.toISOString(),
      returnAt: returnAt.toISOString(),
      customer: { firstName: "Test", lastName: "Driver", email, phone: "+302106022220", country: "GR" },
      driver: { age: 23, licenceYears: 1, countryCode: "GR", hasInternationalPermit: false },
      additionalDrivers: [],
      extras: [],
      language: "el",
      recaptchaToken: "test-token",
    };

    const invalidDriver = await nativeFetch(`${baseUrl}/api/v1/quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...baseRequest, driver: { ...baseRequest.driver, age: 22 } }),
    });
    assert.equal(invalidDriver.status, 400);
    assert.equal((await invalidDriver.json() as { error: { code: string } }).error.code, "DRIVER_BELOW_MINIMUM_AGE");

    const invalidRecaptchaAction = await nativeFetch(`${baseUrl}/api/v1/quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...baseRequest, recaptchaToken: "wrong-action" }),
    });
    assert.equal(invalidRecaptchaAction.status, 400);
    assert.equal((await invalidRecaptchaAction.json() as { error: { code: string } }).error.code, "RECAPTCHA_REJECTED");

    const shortRental = await nativeFetch(`${baseUrl}/api/v1/quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...baseRequest,
        pickupLocationSlug: "athens-city-center",
        returnLocationSlug: "athens-city-center",
        returnAt: new Date(pickupAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    assert.equal(shortRental.status, 400);
    assert.equal((await shortRental.json() as { error: { code: string } }).error.code, "LOCATION_NOT_ALLOWED_FOR_RENTAL_DURATION");

    const afterHoursPickup = new Date(pickupAt);
    afterHoursPickup.setUTCHours(22, 30, 0, 0);
    const afterHours = await nativeFetch(`${baseUrl}/api/v1/quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...baseRequest,
        pickupLocationSlug: "athens-city-center",
        returnLocationSlug: "athens-city-center",
        pickupAt: afterHoursPickup.toISOString(),
        returnAt: new Date(afterHoursPickup.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    assert.equal(afterHours.status, 400);
    assert.equal((await afterHours.json() as { error: { code: string } }).error.code, "LOCATION_OUTSIDE_OPERATING_HOURS");

    const createdResponse = await nativeFetch(`${baseUrl}/api/v1/quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseRequest),
    });
    assert.equal(createdResponse.status, 202);
    const created = await createdResponse.json() as {
      success: boolean;
      data: { reference: string; status: string; notificationStatus: string };
    };
    assert.equal(created.success, true);
    assert.match(created.data.reference, /^\d{4}[A-Z]{2}$/);
    assert.equal(created.data.status, "NEW");
    assert.equal(created.data.notificationStatus, "queued");
    reference = created.data.reference;

    const statusResponse = await nativeFetch(
      `${baseUrl}/api/v1/quotes/${reference}?email=${encodeURIComponent(email)}`,
    );
    assert.equal(statusResponse.status, 200);
    const status = await statusResponse.json() as {
      data: { status: string; notifications: { customer: string; agency: string } };
    };
    assert.equal(status.data.status, "NEW");
    assert.equal(status.data.notifications.customer, "PENDING");
    assert.equal(status.data.notifications.agency, "PENDING");

    const contactRequest = {
      name: "Test Sender",
      email: contactEmail,
      phone: "+302106022220",
      subject: "Integration test",
      message: "Please contact me.",
      language: "el",
      recaptchaToken: "contact-token",
    };
    const invalidContactRecaptcha = await nativeFetch(`${baseUrl}/api/v1/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...contactRequest, recaptchaToken: "invalid-contact-action" }),
    });
    assert.equal(invalidContactRecaptcha.status, 400);
    assert.equal(
      (await invalidContactRecaptcha.json() as { error: { code: string } }).error.code,
      "RECAPTCHA_REJECTED",
    );

    const contactResponse = await nativeFetch(`${baseUrl}/api/v1/contact?lang=en`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(contactRequest),
    });
    assert.equal(contactResponse.status, 202);
    const contactResult = await contactResponse.json() as {
      success: boolean;
      data: { notificationStatus: string; message: string };
      meta: { lang: string };
    };
    assert.equal(contactResult.success, true);
    assert.equal(contactResult.data.notificationStatus, "queued");
    assert.equal(contactResult.meta.lang, "en");
    assert.match(contactResult.data.message, /received your message/i);

    const storedContact = await prisma.contactMessage.findFirst({
      where: { email: contactEmail },
      include: { emailNotifications: { select: { template: true, status: true } } },
    });
    assert.ok(storedContact);
    assert.equal(storedContact.language, "en");
    assert.deepEqual(
      storedContact.emailNotifications.map((item) => item.template).sort(),
      ["contact_acknowledgement", "internal_contact_notification"],
    );
    assert.ok(storedContact.emailNotifications.every((item) => item.status === "PENDING"));
  } finally {
    if (reference) await prisma.quote.delete({ where: { reference } });
    await prisma.quote.deleteMany({ where: { customerEmail: email } });
    await prisma.contactMessage.deleteMany({ where: { email: contactEmail } });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    globalThis.fetch = nativeFetch;
    await prisma.$disconnect();
  }
});
