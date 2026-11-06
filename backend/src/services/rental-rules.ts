import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { AppError } from "../middleware/errors";

const DEFAULT_MIN_AGE_STANDARD = 23;
const DEFAULT_MIN_AGE_OTHER = 25;
const DEFAULT_MAX_AGE = 75;
const DEFAULT_MIN_LICENCE_YEARS = 1;
const SHORT_RENTAL_DAYS = 5;

const minimumAge23Codes = new Set(["B", "C", "D", "D1", "E", "E1", "E2"]);

export type DriverEligibility = {
  age: number;
  licenceYears: number;
  countryCode: string;
  hasInternationalPermit: boolean;
};

export function validateDriverForVehicle(
  driver: DriverEligibility,
  vehicleCode: string,
  driverIndex: number,
  policy: Prisma.JsonObject,
): void {
  const minimumAge = minimumAge23Codes.has(vehicleCode)
    ? readNonNegativeNumber(policy.standardMinimumDriverAge, DEFAULT_MIN_AGE_STANDARD)
    : readNonNegativeNumber(policy.otherMinimumDriverAge, DEFAULT_MIN_AGE_OTHER);
  const maximumAge = readNonNegativeNumber(policy.maximumDriverAge, DEFAULT_MAX_AGE);
  const minimumLicenceYears = readNonNegativeNumber(policy.minimumLicenceYears, DEFAULT_MIN_LICENCE_YEARS);
  const exemptCountriesValue = policy.internationalPermitExemptCountries;
  const exemptCountries = Array.isArray(exemptCountriesValue)
    ? new Set(exemptCountriesValue.filter((country): country is string => typeof country === "string").map((country) => country.toUpperCase()))
    : new Set<string>();
  const driverLabel = driverIndex === 0 ? "Main driver" : `Additional driver ${driverIndex}`;

  if (driver.age > maximumAge) {
    throw new AppError(400, "DRIVER_AGE_REQUIRES_AGENCY_CONTACT", `${driverLabel} is over the maximum permitted age; contact the agency`);
  }
  if (driver.age < minimumAge) {
    throw new AppError(400, "DRIVER_BELOW_MINIMUM_AGE", `${driverLabel} does not meet the minimum age for this vehicle category`);
  }
  if (driver.licenceYears < minimumLicenceYears) {
    throw new AppError(400, "DRIVING_LICENCE_TOO_RECENT", `${driverLabel} must have held a driving licence for at least one year`);
  }
  if (!exemptCountries.has(driver.countryCode.toUpperCase()) && !driver.hasInternationalPermit) {
    throw new AppError(400, "INTERNATIONAL_PERMIT_REQUIRED", `${driverLabel} must provide an international driving permit`);
  }
}

function isRecord(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonNegativeNumber(value: Prisma.JsonValue | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function parseTime(value: Prisma.JsonValue | undefined, fallback: string): number {
  const time = typeof value === "string" ? value : fallback;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new AppError(500, "RENTAL_POLICY_INVALID", "Configured rental location hours are invalid");
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function athensTimeMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return (
    Number(parts.find((part) => part.type === "hour")?.value ?? "0") * 60 +
    Number(parts.find((part) => part.type === "minute")?.value ?? "0")
  );
}

export function isWithinConfiguredWindow(
  date: Date,
  window: Prisma.JsonObject,
  fromFallback: string,
  untilFallback: string,
): boolean {
  const from = parseTime(window.from, fromFallback);
  const until = parseTime(window.until, untilFallback);
  const current = athensTimeMinutes(date);
  return from <= until ? current >= from && current < until : current >= from || current < until;
}

export async function validateQuoteEligibility(input: {
  vehicleSlug: string;
  pickupAt: Date;
  returnAt: Date;
  pickupLocationSlug: string;
  returnLocationSlug: string;
  driver: DriverEligibility;
  additionalDrivers: DriverEligibility[];
}): Promise<{ vehicleId: string; pickupLocationId: string; returnLocationId: string }> {
  if (
    !Number.isFinite(input.pickupAt.getTime()) ||
    !Number.isFinite(input.returnAt.getTime()) ||
    input.pickupAt <= new Date() ||
    input.returnAt <= input.pickupAt
  ) {
    throw new AppError(400, "INVALID_RENTAL_DATES", "Pickup must be in the future and return must be later");
  }

  const [vehicle, pickupLocation, returnLocation, setting] = await Promise.all([
    prisma.vehicle.findFirst({
      where: { slug: input.vehicleSlug, isActive: true },
      select: { id: true, code: true },
    }),
    prisma.location.findFirst({
      where: { slug: input.pickupLocationSlug, isActive: true },
      select: { id: true, isFree: true, isAirport: true },
    }),
    prisma.location.findFirst({
      where: { slug: input.returnLocationSlug, isActive: true },
      select: { id: true, isFree: true, isAirport: true },
    }),
    prisma.setting.findUnique({ where: { key: "rental-policy" }, select: { value: true } }),
  ]);
  if (!vehicle) {
    throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle category not found");
  }
  if (!pickupLocation || !returnLocation) {
    throw new AppError(404, "LOCATION_NOT_FOUND", "Pickup or return location not found");
  }

  const policy = isRecord(setting?.value) ? setting.value : {};
  for (const [index, driver] of [input.driver, ...input.additionalDrivers].entries()) {
    validateDriverForVehicle(driver, vehicle.code, index, policy);
  }

  const durationMs = input.returnAt.getTime() - input.pickupAt.getTime();
  const graceHours = readNonNegativeNumber(policy.extraDayGraceHours, 3);
  const billedMs = Math.max(0, durationMs - graceHours * 60 * 60 * 1000);
  const rentalDays = Math.max(1, Math.ceil(billedMs / (24 * 60 * 60 * 1000)));
  if (
    rentalDays < SHORT_RENTAL_DAYS &&
    (!pickupLocation.isFree || !returnLocation.isFree)
  ) {
    throw new AppError(
      400,
      "LOCATION_NOT_ALLOWED_FOR_RENTAL_DURATION",
      "Rentals under 5 days must start and end at the airport or Koropi Metro Station",
    );
  }

  const locationHoursValue = policy.otherLocationsWindow;
  const locationHours = isRecord(locationHoursValue) ? locationHoursValue : {};
  for (const { location, at } of [
    { location: pickupLocation, at: input.pickupAt },
    { location: returnLocation, at: input.returnAt },
  ]) {
    if (
      !location.isAirport &&
      !location.isFree &&
      !isWithinConfiguredWindow(at, locationHours, "07:00", "21:00")
    ) {
      throw new AppError(400, "LOCATION_OUTSIDE_OPERATING_HOURS", "Non-airport locations are available from 07:00 to 21:00 Athens time");
    }
  }

  return {
    vehicleId: vehicle.id,
    pickupLocationId: pickupLocation.id,
    returnLocationId: returnLocation.id,
  };
}
