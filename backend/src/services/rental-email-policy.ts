import { Prisma, VehicleGroup } from "@prisma/client";
import { calculateBillableDaysFromDuration } from "./pricing";
import type { EmailLanguage } from "./email-templates/common";

function isJsonObject(value: Prisma.JsonValue | undefined): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonNegativeNumber(value: Prisma.JsonValue | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function localizedJsonString(value: Prisma.JsonValue, language: EmailLanguage): string {
  if (typeof value === "string") return value;
  if (!isJsonObject(value)) return "";
  const localized = value[language] ?? value.en ?? Object.values(value)[0];
  return typeof localized === "string" ? localized : "";
}

export function getCancellationNoticeDays(
  policy: Prisma.JsonValue | undefined,
  vehicleCode: string,
): number | null {
  if (!isJsonObject(policy)) return null;
  const byCategory = policy.cancellationNoticeDaysByVehicleCode;
  if (!isJsonObject(byCategory)) return null;
  const days = readNonNegativeNumber(byCategory[vehicleCode]);
  return days !== null && Number.isInteger(days) ? days : null;
}

export function resolveCdwExcessEur(
  vehicle: { cdwExcessEur: Prisma.Decimal | null; group: VehicleGroup },
  rentalInfo: Prisma.JsonValue | undefined,
): string | null {
  if (vehicle.cdwExcessEur) return vehicle.cdwExcessEur.toFixed(2);
  if (!isJsonObject(rentalInfo)) return null;
  const insurance = rentalInfo.insurance;
  if (!isJsonObject(insurance)) return null;
  const key = vehicle.group === VehicleGroup.STANDARD || vehicle.group === VehicleGroup.AUTOMATIC
    ? "cdwExcessSmallAndMediumEur"
    : "cdwExcessSuvMinivansLuxuryEur";
  const amount = readNonNegativeNumber(insurance[key]);
  return amount === null ? null : amount.toFixed(2);
}

export function getIncludedRentalItems(
  rentalInfo: Prisma.JsonValue | undefined,
  language: EmailLanguage,
): string[] {
  if (!isJsonObject(rentalInfo) || !Array.isArray(rentalInfo.included)) return [];
  return rentalInfo.included.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (!isJsonObject(item)) return [];
    const translated = item[language] ?? item.en;
    return typeof translated === "string" ? [translated] : [];
  });
}

export function getIncludedKilometres(
  pickupAt: Date,
  returnAt: Date,
  rentalInfo: Prisma.JsonValue | undefined,
  language: EmailLanguage,
): string {
  const mileage = isJsonObject(rentalInfo) && isJsonObject(rentalInfo.mileage)
    ? rentalInfo.mileage
    : {};
  const unlimitedFromDays = readNonNegativeNumber(mileage.unlimitedFromRentalDays) ?? 3;
  const dailyLimit = readNonNegativeNumber(mileage.dailyLimitForOneOrTwoDays) ?? 200;
  const rentalDays = calculateBillableDaysFromDuration(returnAt.getTime() - pickupAt.getTime());
  if (rentalDays >= unlimitedFromDays) {
    return language === "el" ? "Απεριόριστα χιλιόμετρα" : "Unlimited mileage";
  }
  return language === "el"
    ? `${dailyLimit} km ανά ημέρα`
    : `${dailyLimit} km per day`;
}
