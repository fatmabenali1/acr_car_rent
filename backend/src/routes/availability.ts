import { QuoteStatus, type Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { AppError } from "../middleware/errors";
import { calculateBillableDaysFromDuration } from "../services/pricing";
import { calculateAvailability } from "../services/availability";
import { isWithinConfiguredWindow } from "../services/rental-rules";

const availabilityRouter = Router();

const availabilityRequestSchema = z.object({
  categoryId: z.string().min(1).max(100),
  pickupAt: z.coerce.date(),
  dropoffAt: z.coerce.date(),
  pickupLocationId: z.string().min(1).max(100).optional(),
  returnLocationId: z.string().min(1).max(100).optional(),
}).strict().refine((value) => value.dropoffAt > value.pickupAt, {
  message: "dropoffAt must be after pickupAt",
  path: ["dropoffAt"],
});

function asJsonObject(value: Prisma.JsonValue | null | undefined): Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function positiveInt(value: Prisma.JsonValue | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function readWindow(value: Prisma.JsonValue | undefined): Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

availabilityRouter.post("/availability/check", async (request, response) => {
  const input = availabilityRequestSchema.parse(request.body);
  const [category, setting] = await Promise.all([
    prisma.vehicle.findFirst({
      where: { id: input.categoryId, isActive: true },
      select: { id: true, availableUnits: true },
    }),
    prisma.setting.findUnique({ where: { key: "rental-policy" }, select: { value: true } }),
  ]);
  if (!category) throw new AppError(404, "VEHICLE_CATEGORY_NOT_FOUND", "Vehicle category not found");

  const policy = asJsonObject(setting?.value);
  const countDepositPending = policy.availabilityCountDepositPending === true;
  const statuses: QuoteStatus[] = countDepositPending
    ? [QuoteStatus.CONFIRMED, QuoteStatus.DEPOSIT_PENDING]
    : [QuoteStatus.CONFIRMED];
  const [overlappingQuotes, overlappingBlocks] = await Promise.all([
    prisma.quote.findMany({
      where: {
        status: { in: statuses },
        pickupAt: { lt: input.dropoffAt },
        returnAt: { gt: input.pickupAt },
        vehicles: { some: { vehicleId: category.id } },
      },
      select: {
        vehicles: {
          where: { vehicleId: category.id },
          select: { quantity: true },
        },
      },
    }),
    prisma.availabilityBlock.count({
      where: {
        vehicleId: category.id,
        startsAt: { lt: input.dropoffAt },
        endsAt: { gt: input.pickupAt },
      },
    }),
  ]);
  const occupiedUnits = overlappingQuotes.reduce(
    (total, quote) => total + quote.vehicles.reduce((units, vehicle) => units + vehicle.quantity, 0),
    0,
  );
  const visibility = policy.availabilityStockVisibility === "EXACT" ? "EXACT" : "LEVEL";
  const lowStockThreshold = positiveInt(policy.availabilityLowStockThreshold, 2);
  const availability = calculateAvailability({
    stock: category.availableUnits,
    occupiedUnits,
    blocked: overlappingBlocks > 0,
    visibility,
    lowStockThreshold,
  });

  const locationIds = [...new Set([input.pickupLocationId, input.returnLocationId].filter(
    (id): id is string => Boolean(id),
  ))];
  const locations = locationIds.length
    ? await prisma.location.findMany({
      where: { id: { in: locationIds }, isActive: true },
      select: { id: true, isAirport: true, isFree: true },
    })
    : [];
  if (locations.length !== locationIds.length) {
    throw new AppError(404, "LOCATION_NOT_FOUND", "Pickup or return location not found");
  }
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const warnings: Array<{ code: string; message: { en: string; el: string } }> = [];
  const graceHours = positiveInt(policy.extraDayGraceHours, 3);
  const rentalDays = calculateBillableDaysFromDuration(
    input.dropoffAt.getTime() - input.pickupAt.getTime(),
    graceHours,
  );
  for (const [locationId, at, label] of [
    [input.pickupLocationId, input.pickupAt, "pickup"],
    [input.returnLocationId, input.dropoffAt, "return"],
  ] as const) {
    if (!locationId) continue;
    const location = locationById.get(locationId);
    if (!location) continue;
    if (rentalDays < 5 && !location.isFree) {
      warnings.push({
        code: "SHORT_RENTAL_LOCATION",
        message: {
          en: `Rentals under 5 days should use the airport or Koropi for ${label}.`,
          el: `Για ενοικίαση κάτω των 5 ημερών, η ${label === "pickup" ? "παραλαβή" : "επιστροφή"} πρέπει να γίνεται στο αεροδρόμιο ή στο Κορωπί.`,
        },
      });
    }
    if (location.isAirport) {
      const airportWindow = readWindow(policy.airportNightWindow);
      if (!isWithinConfiguredWindow(at, airportWindow, "23:00", "07:00")) {
        continue;
      }
      warnings.push({
        code: "AIRPORT_NIGHT_FEE",
        message: {
          en: `Airport ${label} between 23:00 and 07:00 Athens time may incur a night fee.`,
          el: `${label === "pickup" ? "Η παραλαβή" : "Η επιστροφή"} στο αεροδρόμιο μεταξύ 23:00 και 07:00 ώρα Ελλάδας ενδέχεται να επιβαρύνεται με νυχτερινή χρέωση.`,
        },
      });
    } else {
      const otherWindow = readWindow(policy.otherLocationsWindow);
      if (!isWithinConfiguredWindow(at, otherWindow, "07:00", "21:00")) {
        warnings.push({
          code: "LOCATION_OUTSIDE_OPERATING_HOURS",
          message: {
            en: `Non-airport locations operate from 07:00 to 21:00 Athens time; ${label} is outside these hours.`,
            el: `Τα σημεία εκτός αεροδρομίου λειτουργούν από τις 07:00 έως τις 21:00 ώρα Ελλάδας· η ${label === "pickup" ? "παραλαβή" : "επιστροφή"} είναι εκτός ωραρίου.`,
          },
        });
      }
    }
  }

  response.json({
    success: true,
    data: {
      ...availability,
      message: {
        en: "Availability is not guaranteed until the quote is confirmed. Extensions are not guaranteed during high season.",
        el: "Η διαθεσιμότητα δεν είναι εγγυημένη πριν από την επιβεβαίωση της προσφοράς. Οι παρατάσεις δεν είναι εγγυημένες κατά την υψηλή περίοδο.",
      },
      warnings,
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

export { availabilityRouter };
