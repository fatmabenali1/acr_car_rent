import assert from "node:assert/strict";
import test from "node:test";
import "dotenv/config";

test("reservation API validates input, ignores submitted amounts, stores quotes and exposes scoped payment info", {
  skip: process.env.RUN_DATABASE_TESTS !== "true",
}, async () => {
  process.env.NODE_ENV = "test";
  process.env.SMTP_HOST = "";
  process.env.SMTP_USER = "";
  process.env.SMTP_PASSWORD = "";
  process.env.SMTP_FROM = "";

  const [
    { app },
    { prisma },
    { configureReservationEmailTransportForTests },
    { computeQuote },
  ] = await Promise.all([
    import("../src/app"),
    import("../src/db"),
    import("../src/services/reservation-emails"),
    import("../src/services/compute-quote"),
  ]);
  const vehicle = await prisma.vehicle.findFirstOrThrow({ where: { code: "D1", isActive: true } });
  const location = await prisma.location.findFirstOrThrow({
    where: { slug: "athens-international-airport", isActive: true },
  });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now();
  const email = `fake-${suffix}@example.invalid`;
  const pickupAt = new Date(Date.now() + 10 * 86_400_000);
  const returnAt = new Date(pickupAt.getTime() + 48 * 60 * 60 * 1000);
  const baseRequest = {
    carId: vehicle.code,
    pickupLocation: location.slug,
    returnLocation: location.slug,
    pickupAt: pickupAt.toISOString(),
    returnAt: returnAt.toISOString(),
    driverAge: 23,
    driverLicenceYears: 1,
    firstName: "Fictional",
    lastName: "Customer",
    email,
    phone: "+302100000000",
    country: "GR",
    language: "en",
    privacyAccepted: true,
    website: "",
  };
  const references: string[] = [];
  const post = (body: unknown) => fetch(`${baseUrl}/api/reservations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  try {
    configureReservationEmailTransportForTests({
      async sendMail() {
        throw Object.assign(new Error("simulated mail outage"), { code: "ECONNECTION" });
      },
    });
    const failedMailResponse = await post(baseRequest);
    assert.equal(failedMailResponse.status, 201);
    const failedMail = await failedMailResponse.json() as { data: { reservationNumber: string; emailSent: boolean } };
    assert.equal(failedMail.data.emailSent, false);
    references.push(failedMail.data.reservationNumber);
    assert.ok(await prisma.quote.findUnique({ where: { reference: failedMail.data.reservationNumber } }));

    const sentMessages: Array<{ to: string }> = [];
    configureReservationEmailTransportForTests({
      async sendMail(message) {
        sentMessages.push({ to: String(message.to) });
        return {} as never;
      },
    });
    const validResponse = await post({ ...baseRequest, amount: 0.01 });
    assert.equal(validResponse.status, 201);
    const valid = await validResponse.json() as {
      success: boolean;
      data: { reservationNumber: string; total: number; deposit: number; currency: string; emailSent: boolean; demoPrices: boolean };
    };
    assert.equal(valid.success, true);
    assert.match(valid.data.reservationNumber, /^\d{4}[A-Z]{2}$/);
    assert.equal(valid.data.total, 50);
    assert.equal(valid.data.deposit, 50);
    assert.equal(valid.data.currency, "EUR");
    assert.equal(valid.data.emailSent, true);
    assert.equal(sentMessages.length, 2);
    references.push(valid.data.reservationNumber);

    const stored = await prisma.quote.findUniqueOrThrow({ where: { reference: valid.data.reservationNumber } });
    assert.equal(stored.status, "DEPOSIT_PENDING");
    assert.equal(Number(stored.quotedTotalEur), valid.data.total);
    assert.equal(Number(stored.depositEur), valid.data.deposit);
    assert.equal(valid.data.total, computeQuote("D1", pickupAt, returnAt).total);

    const paymentInfoResponse = await fetch(`${baseUrl}/api/reservations/${valid.data.reservationNumber}/payment-info`);
    assert.equal(paymentInfoResponse.status, 200);
    const paymentInfo = await paymentInfoResponse.json() as {
      data: { firstName: string; email: string; mobile: string; reservationReference: string; deliveryDate: string; amount: number };
    };
    assert.equal(paymentInfo.data.firstName, "Fictional");
    assert.equal(paymentInfo.data.email, email);
    assert.equal(paymentInfo.data.mobile, baseRequest.phone);
    assert.equal(paymentInfo.data.reservationReference, valid.data.reservationNumber);
    assert.match(paymentInfo.data.deliveryDate, /^\d{1,2}\/\d{1,2}\/\d{4}$/);
    assert.equal(paymentInfo.data.amount, valid.data.deposit);

    for (const invalidBody of [
      { ...baseRequest, email: "not-an-email" },
      { ...baseRequest, pickupAt: "invalid-date" },
      { ...baseRequest, returnAt: new Date(pickupAt.getTime() - 60_000).toISOString() },
      { ...baseRequest, carId: "UNKNOWN" },
      { ...baseRequest, driverAge: 22 },
      { ...baseRequest, driverAge: 76 },
      { carId: vehicle.code },
      { ...baseRequest, notes: "x".repeat(2_001) },
      { ...baseRequest, website: "spam" },
    ]) {
      const response = await post(invalidBody);
      assert.equal(response.status, 400);
    }

    assert.equal((await post(baseRequest)).status, 429);
    assert.equal((await fetch(`${baseUrl}/api/reservations/not-a-reference/payment-info`)).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/reservations/9999ZZ/payment-info`)).status, 404);

    const tooLargeResponse = await fetch(`${baseUrl}/api/reservations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...baseRequest, notes: "x".repeat(1_100_000) }),
    });
    assert.equal(tooLargeResponse.status, 413);
  } finally {
    configureReservationEmailTransportForTests(null);
    await prisma.quote.deleteMany({ where: { reference: { in: references } } });
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await prisma.$disconnect();
  }
});
