import { createRequire } from "node:module";
import { resolve } from "node:path";

const backendRequire = createRequire(resolve(process.cwd(), "backend/package.json"));
const { Prisma, PrismaClient } = backendRequire("@prisma/client");

export const prisma = new PrismaClient();

export async function truncateE2EData() {
  const database = await prisma.$queryRaw`SELECT current_database() AS name`;
  if (!database[0]?.name?.endsWith("_e2e")) {
    throw new Error("Refusing test cleanup: connected database does not end with _e2e.");
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "EmailOutbox", "QuoteExtra", "QuoteVehicle", "Payment", "ProcessedStripeEvent", "Quote", "ContactMessage", "CookieConsent" RESTART IDENTITY CASCADE',
  );
}

export async function createPayableQuote({
  status = "DEPOSIT_PENDING",
  email = `customer-${crypto.randomUUID()}@example.test`,
  total = 220,
  deposit = 100,
} = {}) {
  const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { slug: "e2e-standard-d1" } });
  const location = await prisma.location.findUniqueOrThrow({ where: { slug: "e2e-airport" } });
  const ref = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  const reference = `ACR-${new Date().getFullYear()}-${ref}`;
  const pickupAt = new Date(Date.now() + 10 * 86_400_000);
  const returnAt = new Date(Date.now() + 12 * 86_400_000);
  return prisma.quote.create({
    data: {
      reference,
      status,
      customerFirstName: "E2E",
      customerLastName: "Customer",
      customerEmail: email,
      customerPhone: "+302106022220",
      customerCountry: "GR",
      pickupLocationId: location.id,
      returnLocationId: location.id,
      pickupAt,
      returnAt,
      driverAge: 30,
      driverLicenceYears: 5,
      driverHasInternationalPermit: false,
      additionalDrivers: [],
      categorySlug: vehicle.slug,
      quotedTotalEur: new Prisma.Decimal(total.toFixed(2)),
      depositEur: new Prisma.Decimal(deposit.toFixed(2)),
      vehicles: { create: { vehicleId: vehicle.id } },
    },
  });
}

export async function deleteQuoteData() {
  await truncateE2EData();
}
