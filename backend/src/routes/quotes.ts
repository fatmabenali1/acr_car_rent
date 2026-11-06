import { EmailDeliveryStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../db";
import { AppError } from "../middleware/errors";
import { processPendingEmails } from "../services/quote-email-outbox";
import { createQuoteReference } from "../services/quote-reference";
import { validateQuoteEligibility, type DriverEligibility } from "../services/rental-rules";
import { verifyRecaptchaToken } from "../services/recaptcha";

const quotesRouter = Router();
const languageSchema = z.enum(["en", "el"]).default("en");
const countryCodeSchema = z.string().regex(/^[A-Za-z]{2}$/, "Country must be a two-letter ISO code").transform((value) => value.toUpperCase());

const driverSchema = z.object({
  age: z.number().int().min(18).max(100),
  licenceYears: z.number().int().min(0).max(80),
  countryCode: countryCodeSchema,
  hasInternationalPermit: z.boolean().default(false),
}).strict();

const quoteRequestSchema = z.object({
  vehicleSlug: z.string().min(1).max(100),
  pickupLocationSlug: z.string().min(1).max(100),
  returnLocationSlug: z.string().min(1).max(100),
  pickupAt: z.string().datetime({ offset: true }),
  returnAt: z.string().datetime({ offset: true }),
  flightNumber: z.string().trim().max(30).optional(),
  customer: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
    phone: z.string().trim().min(5).max(30),
    country: countryCodeSchema,
  }).strict(),
  driver: driverSchema,
  additionalDrivers: z.array(driverSchema).max(5).default([]),
  extras: z.array(z.object({
    extraId: z.string().min(1).max(100),
    quantity: z.number().int().min(1).max(10),
    childAge: z.number().int().min(0).max(17).optional(),
    childWeightKg: z.number().positive().max(100).optional(),
  }).strict()).max(20).default([]),
  notes: z.string().trim().max(2_000).optional(),
  language: languageSchema,
  recaptchaToken: z.string().min(1).max(4_000),
}).strict().superRefine((request, context) => {
  const pickupAt = new Date(request.pickupAt);
  const returnAt = new Date(request.returnAt);
  if (returnAt <= pickupAt) {
    context.addIssue({
      code: "custom",
      path: ["returnAt"],
      message: "Return date must be after pickup date",
    });
  }
  const extraIds = request.extras.map((extra) => extra.extraId);
  if (new Set(extraIds).size !== extraIds.length) {
    context.addIssue({
      code: "custom",
      path: ["extras"],
      message: "Each extra may only be specified once",
    });
  }
});

function localizedText(value: Prisma.JsonValue, language: "en" | "el", fallback: string): string {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const text = value[language];
    if (typeof text === "string") {
      return text;
    }
  }
  return fallback;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

quotesRouter.post("/quotes", async (request, response) => {
  const input = quoteRequestSchema.parse(request.body);
  const language = z.enum(["en", "el"]).optional().parse(request.query.lang) ?? input.language;
  await verifyRecaptchaToken(input.recaptchaToken, "quote_request");

  const pickupAt = new Date(input.pickupAt);
  const returnAt = new Date(input.returnAt);
  const driver: DriverEligibility = {
    age: input.driver.age,
    licenceYears: input.driver.licenceYears,
    countryCode: input.driver.countryCode,
    hasInternationalPermit: input.driver.hasInternationalPermit,
  };
  const additionalDrivers = input.additionalDrivers.map((additionalDriver) => ({
    age: additionalDriver.age,
    licenceYears: additionalDriver.licenceYears,
    countryCode: additionalDriver.countryCode,
    hasInternationalPermit: additionalDriver.hasInternationalPermit,
  }));
  const ids = await validateQuoteEligibility({
    vehicleSlug: input.vehicleSlug,
    pickupAt,
    returnAt,
    pickupLocationSlug: input.pickupLocationSlug,
    returnLocationSlug: input.returnLocationSlug,
    driver,
    additionalDrivers,
  });

  const [vehicle, pickupLocation, returnLocation, extras] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: ids.vehicleId }, select: { id: true, code: true } }),
    prisma.location.findUnique({ where: { id: ids.pickupLocationId }, select: { id: true, name: true } }),
    prisma.location.findUnique({ where: { id: ids.returnLocationId }, select: { id: true, name: true } }),
    prisma.extra.findMany({
      where: { id: { in: input.extras.map((extra) => extra.extraId) }, isActive: true },
      select: { id: true, name: true, requiresChildAge: true, requiresChildWeight: true },
    }),
  ]);
  if (!vehicle || !pickupLocation || !returnLocation) {
    throw new AppError(409, "QUOTE_DATA_CHANGED", "Selected quote details are no longer available");
  }
  if (extras.length !== input.extras.length) {
    throw new AppError(400, "INVALID_EXTRA", "An extra is unavailable or inactive");
  }
  const extraById = new Map(extras.map((extra) => [extra.id, extra]));
  for (const requestedExtra of input.extras) {
    const extra = extraById.get(requestedExtra.extraId);
    if (extra?.requiresChildAge && requestedExtra.childAge === undefined) {
      throw new AppError(400, "CHILD_AGE_REQUIRED", "Child age is required for this extra");
    }
    if (extra?.requiresChildWeight && requestedExtra.childWeightKg === undefined) {
      throw new AppError(400, "CHILD_WEIGHT_REQUIRED", "Child weight is required for this extra");
    }
  }

  const emailPayload = {
    customerFirstName: input.customer.firstName,
    customerLastName: input.customer.lastName,
    customerEmail: input.customer.email,
    customerPhone: input.customer.phone,
    customerCountry: input.customer.country,
    vehicleCode: vehicle.code,
    pickupLocation: localizedText(pickupLocation.name, language, input.pickupLocationSlug),
    returnLocation: localizedText(returnLocation.name, language, input.returnLocationSlug),
    pickupAt: pickupAt.toISOString(),
    returnAt: returnAt.toISOString(),
    flightNumber: input.flightNumber ?? null,
    driverAge: input.driver.age,
    driverLicenceYears: input.driver.licenceYears,
    driverCountryCode: input.driver.countryCode,
    driverHasInternationalPermit: input.driver.hasInternationalPermit,
    additionalDrivers,
    extras: input.extras.map((requestedExtra) => {
      const extra = extraById.get(requestedExtra.extraId);
      return {
        name: extra ? localizedText(extra.name, language, requestedExtra.extraId) : requestedExtra.extraId,
        quantity: requestedExtra.quantity,
        childAge: requestedExtra.childAge ?? null,
        childWeightKg: requestedExtra.childWeightKg ?? null,
      };
    }),
    notes: input.notes ?? null,
  };

  let quote: { id: string; reference: string; status: string } | undefined;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reference = createQuoteReference();
    try {
      quote = await prisma.quote.create({
        data: {
          reference,
          customerFirstName: input.customer.firstName,
          customerLastName: input.customer.lastName,
          customerEmail: input.customer.email,
          customerPhone: input.customer.phone,
          customerCountry: input.customer.country,
          language,
          pickupLocationId: ids.pickupLocationId,
          returnLocationId: ids.returnLocationId,
          pickupAt,
          returnAt,
          flightNumber: input.flightNumber,
          driverAge: input.driver.age,
          driverLicenceYears: input.driver.licenceYears,
          driverHasInternationalPermit: input.driver.hasInternationalPermit,
          additionalDrivers: additionalDrivers as Prisma.InputJsonValue,
          notes: input.notes,
          vehicles: { create: { vehicleId: ids.vehicleId } },
          extras: {
            create: input.extras.map((extra) => ({
              extraId: extra.extraId,
              quantity: extra.quantity,
              childAge: extra.childAge,
              childWeightKg: extra.childWeightKg,
            })),
          },
          emailNotifications: {
            create: [
              {
                recipient: input.customer.email,
                template: "quote_acknowledgement",
                language,
                payload: { reference, ...emailPayload },
              },
              {
                recipient: env.AGENCY_EMAIL,
                template: "internal_quote_notification",
                language,
                payload: { reference, ...emailPayload },
              },
            ],
          },
        },
        select: { id: true, reference: true, status: true },
      });
      break;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 9) {
        throw error;
      }
    }
  }

  if (!quote) {
    throw new AppError(500, "QUOTE_CREATION_FAILED", "Could not create quote request");
  }
  void processPendingEmails(2);
  response.status(202).json({
    success: true,
    data: {
      reference: quote.reference,
      status: quote.status,
      notificationStatus: "queued",
      message: language === "el"
        ? "Το αίτημα προσφοράς καταχωρίστηκε. Δεν αποτελεί επιβεβαιωμένη κράτηση."
        : "Your quote request has been received. This is not a confirmed booking.",
    },
    meta: { lang: language },
  });
});

quotesRouter.get("/quotes/:reference", async (request, response) => {
  const params = z.object({
    reference: z.string().regex(/^\d{4}[A-Z]{2}$/),
  }).parse(request.params);
  const query = z.object({ email: z.string().trim().email().max(254) }).parse(request.query);
  const quote = await prisma.quote.findFirst({
    where: {
      reference: params.reference,
      customerEmail: query.email.toLowerCase(),
    },
    select: {
      reference: true,
      status: true,
      pickupAt: true,
      returnAt: true,
      quotedTotalEur: true,
      depositEur: true,
      quoteSentAt: true,
      expiresAt: true,
      language: true,
      emailNotifications: {
        select: { status: true, template: true },
      },
    },
  });
  if (!quote) {
    throw new AppError(404, "QUOTE_NOT_FOUND", "Quote request not found");
  }
  response.json({
    success: true,
    data: {
      reference: quote.reference,
      status: quote.status,
      pickupAt: quote.pickupAt,
      returnAt: quote.returnAt,
      quotedTotalEur: quote.quotedTotalEur,
      depositEur: quote.depositEur,
      quoteSentAt: quote.quoteSentAt,
      expiresAt: quote.expiresAt,
      notifications: {
        customer: quote.emailNotifications.find((item) => item.template === "quote_acknowledgement")?.status
          ?? EmailDeliveryStatus.PENDING,
        agency: quote.emailNotifications.find((item) => item.template === "internal_quote_notification")?.status
          ?? EmailDeliveryStatus.PENDING,
      },
    },
    meta: { lang: quote.language },
  });
});

export { quotesRouter };
