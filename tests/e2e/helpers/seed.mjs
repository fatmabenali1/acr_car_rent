import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const backendRequire = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../backend/package.json"));
const { PrismaClient } = backendRequire("@prisma/client");

export async function seedReferenceData(databaseUrl = process.env.DATABASE_URL) {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.vehicle.upsert({
      where: { slug: "e2e-standard-d1" },
      update: {},
      create: {
        code: "D1",
        slug: "e2e-standard-d1",
        name: { en: "E2E test category", el: "Κατηγορία δοκιμής" },
        exampleModels: ["Test vehicle"],
        group: "STANDARD",
        transmission: "MANUAL",
        isActive: true,
        availableUnits: 1,
      },
    });
    await prisma.location.upsert({
      where: { slug: "e2e-airport" },
      update: {},
      create: {
        slug: "e2e-airport",
        name: { en: "E2E Airport", el: "Αεροδρόμιο E2E" },
        locationType: "airport",
        isAirport: true,
        isFree: true,
        isActive: true,
      },
    });
    await prisma.setting.upsert({
      where: { key: "rental-policy" },
      update: {},
      create: {
        key: "rental-policy",
        value: {
          standardMinimumDriverAge: 23,
          otherMinimumDriverAge: 25,
          maximumDriverAge: 75,
          minimumLicenceYears: 1,
          internationalPermitExemptCountries: ["GR"],
          extraDayGraceHours: 3,
          otherLocationsWindow: { from: "07:00", until: "21:00" },
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
