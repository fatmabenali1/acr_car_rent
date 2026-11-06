import assert from "node:assert/strict";
import test from "node:test";
import "dotenv/config";

test("availability endpoint accounts for partial quote overlaps, manual blocks, and empty stock", {
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
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const suffix = Date.now().toString();
  const vehicle = await prisma.vehicle.create({
    data: {
      code: `A${suffix}`,
      slug: `availability-test-${suffix}`,
      name: { en: "Test category", el: "Δοκιμή" },
      exampleModels: [],
      group: "STANDARD",
      availableUnits: 1,
    },
  });
  const location = await prisma.location.create({
    data: {
      slug: `availability-test-${suffix}`,
      name: { en: "Test location", el: "Δοκιμή" },
      isAirport: true,
      isFree: true,
    },
  });
  const quoteReferences: string[] = [];

  const check = (pickupAt: Date, dropoffAt: Date) => fetch(`${baseUrl}/api/v1/availability/check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      categoryId: vehicle.id,
      pickupAt: pickupAt.toISOString(),
      dropoffAt: dropoffAt.toISOString(),
    }),
  });

  try {
    const quote = await prisma.quote.create({
      data: {
        reference: `${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}AV`,
        status: "CONFIRMED",
        customerFirstName: "Availability",
        customerLastName: "Test",
        customerEmail: `availability-${suffix}@example.com`,
        customerPhone: "+302106022220",
        customerCountry: "GR",
        pickupLocationId: location.id,
        returnLocationId: location.id,
        pickupAt: new Date("2027-01-09T00:00:00.000Z"),
        returnAt: new Date("2027-01-12T00:00:00.000Z"),
        driverAge: 25,
        driverLicenceYears: 2,
        driverHasInternationalPermit: false,
        additionalDrivers: [],
        vehicles: { create: { vehicleId: vehicle.id, quantity: 1 } },
      },
    });
    quoteReferences.push(quote.reference);
    const partiallyOverlapped = await check(
      new Date("2027-01-05T00:00:00.000Z"),
      new Date("2027-01-10T00:00:00.000Z"),
    );
    assert.equal(partiallyOverlapped.status, 200);
    const partialData = await partiallyOverlapped.json() as { data: { available: boolean; availabilityLevel?: string } };
    assert.equal(partialData.data.available, false);
    assert.equal(partialData.data.availabilityLevel, "none");

    await prisma.availabilityBlock.create({
      data: {
        vehicleId: vehicle.id,
        startsAt: new Date("2027-02-02T00:00:00.000Z"),
        endsAt: new Date("2027-02-03T00:00:00.000Z"),
        reason: "Integration test",
      },
    });
    const manuallyBlocked = await check(
      new Date("2027-02-01T00:00:00.000Z"),
      new Date("2027-02-04T00:00:00.000Z"),
    );
    const blockedData = await manuallyBlocked.json() as { data: { available: boolean; availabilityLevel?: string } };
    assert.equal(blockedData.data.available, false);
    assert.equal(blockedData.data.availabilityLevel, "none");

    await prisma.availabilityBlock.deleteMany({ where: { vehicleId: vehicle.id } });
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { availableUnits: 0 } });
    const noStock = await check(
      new Date("2027-03-01T00:00:00.000Z"),
      new Date("2027-03-03T00:00:00.000Z"),
    );
    const noStockData = await noStock.json() as { data: { available: boolean; availabilityLevel?: string } };
    assert.equal(noStockData.data.available, false);
    assert.equal(noStockData.data.availabilityLevel, "none");
  } finally {
    await prisma.availabilityBlock.deleteMany({ where: { vehicleId: vehicle.id } });
    await prisma.payment.deleteMany({ where: { quote: { reference: { in: quoteReferences } } } });
    await prisma.quote.deleteMany({ where: { reference: { in: quoteReferences } } });
    await prisma.vehicle.delete({ where: { id: vehicle.id } });
    await prisma.location.delete({ where: { id: location.id } });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await prisma.$disconnect();
  }
});
