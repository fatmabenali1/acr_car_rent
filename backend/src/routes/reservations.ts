import { randomUUID } from "node:crypto";
import { Prisma, QuoteStatus } from "@prisma/client";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../db";
import { AppError } from "../middleware/errors";
import { computeQuote } from "../services/compute-quote";
import { createQuoteReference } from "../services/quote-reference";
import { sendReservationEmails } from "../services/reservation-emails";

const reservationsRouter = Router();
const reservationRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const paymentInfoRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const reservationReferenceSchema = z.string().regex(/^\d{4}[A-Z]{2}$/);
const cleanText = (value: string) => value
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
  .trim();

const reservationSchema = z.object({
  carId: z.union([
    z.string().trim().min(1).max(100),
    z.number().int().positive(),
  ]).transform(String),
  pickupLocation: z.string().trim().min(1).max(300),
  returnLocation: z.string().trim().min(1).max(300),
  pickupAt: z.string().datetime({ offset: true }),
  returnAt: z.string().datetime({ offset: true }),
  driverAge: z.number().int().min(23, "Drivers must be between 23 and 75 years old").max(75, "Drivers must be between 23 and 75 years old"),
  driverLicenceYears: z.number().int().min(1).max(80),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  phone: z.string().trim().min(5).max(30),
  country: z.string().trim().min(2).max(100),
  coupon: z.string().trim().max(80).optional(),
  notes: z.string().max(2_000).transform(cleanText).optional().default(""),
  language: z.enum(["en", "el"]).default("en"),
  privacyAccepted: z.literal(true, "You must accept personal data processing"),
  website: z.string().max(500).optional().default(""),
  amount: z.unknown().optional(),
}).strict().superRefine((reservation, context) => {
  const pickupAt = new Date(reservation.pickupAt);
  const returnAt = new Date(reservation.returnAt);
  if (pickupAt <= new Date()) {
    context.addIssue({ code: "custom", path: ["pickupAt"], message: "Pick-up must be in the future" });
  }
  if (returnAt <= pickupAt) {
    context.addIssue({ code: "custom", path: ["returnAt"], message: "Return must be after pick-up" });
  }
});

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function findOrCreateLocation(value: string) {
  const location = await prisma.location.findFirst({
    where: { isActive: true, OR: [{ slug: value }, { id: value }] },
    select: { id: true, name: true, slug: true },
  });
  if (location) {
    const localizedName = typeof location.name === "object" && location.name !== null
      && !Array.isArray(location.name) && typeof location.name.en === "string"
      ? location.name.en
      : location.slug;
    return { ...location, label: localizedName };
  }

  const slug = `address-${randomUUID()}`;
  const created = await prisma.location.create({
    data: {
      slug,
      name: { en: value, el: value },
      address: value,
      locationType: "address",
      isActive: false,
    },
    select: { id: true, name: true, slug: true },
  });
  return { ...created, label: `${value} (to be confirmed)` };
}

reservationsRouter.post("/reservations", reservationRateLimit, async (request, response) => {
  const input = reservationSchema.parse(request.body);
  if (input.website.trim()) {
    throw new AppError(400, "INVALID_RESERVATION", "Reservation could not be accepted");
  }

  const category = input.carId.trim();
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      isActive: true,
      OR: [{ slug: category }, { code: category.toUpperCase() }],
    },
    select: { id: true, code: true, slug: true, name: true, exampleModels: true },
  });
  if (!vehicle) {
    throw new AppError(400, "INVALID_CATEGORY", "Selected vehicle category is unavailable");
  }

  let quote;
  try {
    quote = computeQuote(vehicle.code, input.pickupAt, input.returnAt);
  } catch (error) {
    if (error instanceof RangeError && error.message === "Unknown vehicle category") {
      throw new AppError(400, "INVALID_CATEGORY", "Selected vehicle category is unavailable");
    }
    throw error;
  }

  const pickup = await findOrCreateLocation(input.pickupLocation);
  const dropoff = input.returnLocation === input.pickupLocation
    ? pickup
    : await findOrCreateLocation(input.returnLocation);
  let created: { id: string; reference: string } | undefined;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reference = createQuoteReference();
    try {
      created = await prisma.quote.create({
        data: {
          reference,
          status: QuoteStatus.DEPOSIT_PENDING,
          customerFirstName: input.firstName,
          customerLastName: input.lastName,
          customerEmail: input.email,
          customerPhone: input.phone,
          customerCountry: input.country,
          language: input.language,
          pickupLocationId: pickup.id,
          returnLocationId: dropoff.id,
          pickupLocationLabel: pickup.label,
          returnLocationLabel: dropoff.label,
          pickupAt: new Date(input.pickupAt),
          returnAt: new Date(input.returnAt),
          driverAge: input.driverAge,
          driverLicenceYears: input.driverLicenceYears,
          driverHasInternationalPermit: false,
          additionalDrivers: [],
          categorySlug: vehicle.slug,
          coupon: input.coupon || null,
          notes: input.notes || null,
          quotedTotalEur: new Prisma.Decimal(quote.total.toFixed(2)),
          depositEur: new Prisma.Decimal(quote.deposit.toFixed(2)),
          vehicles: { create: { vehicleId: vehicle.id } },
        },
        select: { id: true, reference: true },
      });
      break;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 9) throw error;
    }
  }
  if (!created) {
    throw new AppError(503, "RESERVATION_REFERENCE_UNAVAILABLE", "Could not create a reservation reference");
  }

  let emailSent = false;
  try {
    const localizedName = typeof vehicle.name === "object" && vehicle.name !== null
      && !Array.isArray(vehicle.name)
      ? vehicle.name[input.language]
      : null;
    const categoryName = typeof localizedName === "string" ? localizedName : vehicle.code;
    emailSent = await sendReservationEmails({
      reference: created.reference,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      country: input.country,
      categoryCode: vehicle.code,
      categoryName,
      exampleModels: vehicle.exampleModels,
      driverAge: input.driverAge,
      driverLicenceYears: input.driverLicenceYears,
      coupon: input.coupon ?? "",
      pickupLocation: pickup.label,
      returnLocation: dropoff.label,
      pickupAt: new Date(input.pickupAt).toISOString(),
      returnAt: new Date(input.returnAt).toISOString(),
      days: quote.days,
      total: quote.total,
      deposit: quote.deposit,
      notes: input.notes,
      language: input.language,
    });
  } catch {
    console.error("Reservation email delivery failed", {
      reference: created.reference,
      code: "EMAIL_DELIVERY_UNAVAILABLE",
    });
  }

  response.status(201).json({
    success: true,
    data: {
      reservationNumber: created.reference,
      total: quote.total,
      deposit: quote.deposit,
      currency: quote.currency,
      emailSent,
      demoPrices: !env.PRICING_CONFIRMED,
    },
  });
});

reservationsRouter.get("/reservations/:reference/payment-info", paymentInfoRateLimit, async (request, response) => {
  const reference = reservationReferenceSchema.parse(request.params.reference);
  const reservation = await prisma.quote.findUnique({
    where: { reference },
    select: {
      reference: true,
      customerFirstName: true,
      customerLastName: true,
      customerEmail: true,
      customerCountry: true,
      customerPhone: true,
      pickupAt: true,
      notes: true,
      depositEur: true,
    },
  });
  if (!reservation || reservation.depositEur === null) {
    throw new AppError(404, "RESERVATION_NOT_FOUND", "Reservation not found");
  }
  response.json({
    success: true,
    data: {
      firstName: reservation.customerFirstName,
      lastName: reservation.customerLastName,
      email: reservation.customerEmail,
      country: reservation.customerCountry,
      mobile: reservation.customerPhone,
      reservationReference: reservation.reference,
      deliveryDate: reservation.pickupAt.toLocaleDateString("en-GB", { timeZone: "Europe/Athens" }),
      notes: reservation.notes ?? "",
      amount: Number(reservation.depositEur),
      currency: "EUR",
    },
  });
});

export { reservationsRouter };
