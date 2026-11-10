import { randomInt } from "node:crypto";
import { PaymentStatus, Prisma, QuoteStatus } from "@prisma/client";
import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env, stripePaymentMissingVariables, stripePaymentsEnabled } from "../config/env";
import { prisma } from "../db";
import { AppError } from "../middleware/errors";
import { getPaymentProvider } from "../payments/provider";
import { processPendingEmails, queueDepositPaidEmails } from "../services/quote-email-outbox";

const checkoutRouter = Router();
const stripeWebhookRouter = Router();
const bookingCreateRateLimit = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });
const bookingLookupRateLimit = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });
const paymentCheckoutRateLimit = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });
const referenceSchema = z.string().trim().regex(/^(ACR-\d{4}-[A-Z0-9]{6}|\d{4}[A-Z]{2})$/);

const bookingSchema = z.object({
  categorySlug: z.string().trim().min(1).max(100),
  pickupLocation: z.string().trim().min(1).max(300),
  dropoffLocation: z.string().trim().max(300).nullable().optional(),
  pickupAt: z.string().datetime({ offset: true }),
  dropoffAt: z.string().datetime({ offset: true }),
  driverAge: z.number().int().min(1).max(100),
  driverLicenceYears: z.number().int().min(0).max(80),
  driverCountryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).default("GR"),
  source: z.string().trim().min(1).max(100).optional(),
  coupon: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
  customer: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
    phone: z.string().trim().min(5).max(30),
    country: z.string().trim().min(2).max(100),
  }).strict(),
}).strict().superRefine((booking, context) => {
  const pickupAt = new Date(booking.pickupAt);
  const dropoffAt = new Date(booking.dropoffAt);
  if (pickupAt <= new Date()) {
    context.addIssue({ code: "custom", path: ["pickupAt"], message: "Pick-up must be in the future" });
  }
  if (dropoffAt <= pickupAt) {
    context.addIssue({ code: "custom", path: ["dropoffAt"], message: "Drop-off must be after pick-up" });
  }
});

function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `ACR-${new Date().getFullYear()}-${suffix}`;
}

function localizedText(value: Prisma.JsonValue, fallback: string): string {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const text = value.en;
    if (typeof text === "string") return text;
  }
  return fallback;
}

function toAmountCents(amount: Prisma.Decimal | null): number | null {
  return amount === null ? null : Math.round(Number(amount) * 100);
}

function statusForClient(
  status: QuoteStatus,
  paymentStatus?: PaymentStatus,
  paymentEvent?: Prisma.JsonValue,
  expiresAt?: Date | null,
): string {
  if (paymentStatus === PaymentStatus.PAID || status === QuoteStatus.CONFIRMED) return "paid";
  if (status === QuoteStatus.CANCELLED) return "cancelled";
  if (
    paymentStatus === PaymentStatus.EXPIRED ||
    status === QuoteStatus.EXPIRED ||
    (expiresAt !== null && expiresAt !== undefined && expiresAt <= new Date()) ||
    (paymentStatus === PaymentStatus.CANCELLED &&
      typeof paymentEvent === "object" &&
      paymentEvent !== null &&
      !Array.isArray(paymentEvent) &&
      paymentEvent.eventType === "checkout.session.expired")
  ) return "expired";
  if (paymentStatus === PaymentStatus.CANCELLED) return "cancelled";
  if (status === QuoteStatus.DEPOSIT_PENDING) return "pending_payment";
  return "quote";
}

async function findOrCreateLocation(value: string) {
  const locations = await prisma.location.findMany({
    where: { isActive: true, OR: [{ slug: value }, { id: value }] },
    select: { id: true, name: true, slug: true },
  });
  let existing: (typeof locations)[number] | undefined = locations[0];
  if (!existing) {
    const knownLocations = await prisma.location.findMany({
      where: {
        isActive: true,
        slug: { in: ["athens-international-airport", "koropi-metro-station", "piraeus-port"] },
      },
      select: { id: true, name: true, slug: true },
    });
    const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLocaleLowerCase();
    existing = knownLocations.find((location) => normalize(localizedText(location.name, location.slug)) === normalize(value));
  }
  if (existing) return { ...existing, label: localizedText(existing.name, existing.slug) };

  const slug = `address-${makeReference().toLowerCase().replaceAll("-", "")}`;
  const location = await prisma.location.create({
    data: {
      slug,
      name: { en: value, el: value },
      address: value,
      locationType: "address",
      isActive: false,
    },
    select: { id: true, name: true, slug: true },
  });
  return { ...location, label: `${value} (to be confirmed)` };
}

checkoutRouter.get("/locations", async (request, response) => {
  const query = z.string().trim().max(100).optional().parse(request.query.q);
  const locations = await prisma.location.findMany({
    where: {
      isActive: true,
      slug: { in: ["athens-international-airport", "koropi-metro-station", "piraeus-port"] },
    },
    orderBy: { displayOrder: "asc" },
    select: { id: true, slug: true, name: true, locationType: true, address: true },
  });
  const normalizedQuery = query?.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
  const filtered = locations
    .map((location) => ({ ...location, name: localizedText(location.name, location.slug) }))
    .filter((location) => !normalizedQuery
      || `${location.name} ${location.address ?? ""}`.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase().includes(normalizedQuery));
  response.json({ success: true, data: filtered });
});

checkoutRouter.post("/bookings", bookingCreateRateLimit, async (request, response) => {
  const input = bookingSchema.parse(request.body);
  const vehicle = await prisma.vehicle.findFirst({
    where: { slug: input.categorySlug, isActive: true },
    select: { id: true, code: true, minimumDriverAge: true },
  });
  if (!vehicle) throw new AppError(400, "INVALID_CATEGORY", "Selected vehicle category is unavailable");
  const minimumAge = ["B", "C", "D", "D1", "E", "E1", "E2"].includes(vehicle.code) ? 23 : 25;
  if (input.driverAge < minimumAge || input.driverAge > 75) {
    throw new AppError(422, "DRIVER_AGE_NOT_ELIGIBLE", input.driverAge > 75
      ? "Drivers above 75 must contact the agency before booking"
      : `The minimum driver age for this category is ${minimumAge}`);
  }
  if (input.driverLicenceYears < 1) {
    throw new AppError(422, "LICENCE_HELD_TOO_SHORT", "The driving licence must have been held for at least one year");
  }

  const pickup = await findOrCreateLocation(input.pickupLocation);
  const dropoff = input.dropoffLocation?.trim()
    ? await findOrCreateLocation(input.dropoffLocation.trim())
    : pickup;
  const agencyNotes = [
    input.notes,
    input.source ? `Source: ${input.source}` : null,
  ].filter(Boolean).join("\n") || null;
  let booking: { id: string; reference: string } | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const reference = makeReference();
      booking = await prisma.quote.create({
        data: {
          reference,
          status: QuoteStatus.NEW,
          customerFirstName: input.customer.firstName,
          customerLastName: input.customer.lastName,
          customerEmail: input.customer.email,
          customerPhone: input.customer.phone,
          customerCountry: input.customer.country,
          pickupLocationId: pickup.id,
          returnLocationId: dropoff.id,
          pickupLocationLabel: pickup.label,
          returnLocationLabel: dropoff.label,
          pickupAt: new Date(input.pickupAt),
          returnAt: new Date(input.dropoffAt),
          driverAge: input.driverAge,
          driverLicenceYears: input.driverLicenceYears,
          driverHasInternationalPermit: false,
          additionalDrivers: [],
          categorySlug: input.categorySlug,
          coupon: input.coupon,
          notes: agencyNotes,
          vehicles: { create: { vehicleId: vehicle.id } },
          emailNotifications: {
            create: [
              {
                recipient: input.customer.email,
                template: "quote_acknowledgement",
                language: "en",
                payload: {
                  reference,
                  customerFirstName: input.customer.firstName,
                  customerLastName: input.customer.lastName,
                  customerEmail: input.customer.email,
                  customerPhone: input.customer.phone,
                  customerCountry: input.customer.country,
                  vehicleCode: vehicle.code,
                  pickupLocation: pickup.label,
                  returnLocation: dropoff.label,
                  pickupAt: new Date(input.pickupAt).toISOString(),
                  returnAt: new Date(input.dropoffAt).toISOString(),
                  flightNumber: null,
                  driverAge: input.driverAge,
                  driverLicenceYears: input.driverLicenceYears,
                  driverCountryCode: input.driverCountryCode.toUpperCase(),
                  driverHasInternationalPermit: false,
                  additionalDrivers: [],
                  extras: [],
                  notes: input.notes ?? null,
                },
              },
              {
                recipient: env.MAIL_TO_AGENCY ?? env.AGENCY_EMAIL,
                template: "internal_quote_notification",
                language: "en",
                payload: {
                  reference,
                  customerFirstName: input.customer.firstName,
                  customerLastName: input.customer.lastName,
                  customerEmail: input.customer.email,
                  customerPhone: input.customer.phone,
                  customerCountry: input.customer.country,
                  vehicleCode: vehicle.code,
                  pickupLocation: pickup.label,
                  returnLocation: dropoff.label,
                  pickupAt: new Date(input.pickupAt).toISOString(),
                  returnAt: new Date(input.dropoffAt).toISOString(),
                  flightNumber: null,
                  driverAge: input.driverAge,
                  driverLicenceYears: input.driverLicenceYears,
                  driverCountryCode: input.driverCountryCode.toUpperCase(),
                  driverHasInternationalPermit: false,
                  additionalDrivers: [],
                  extras: [],
                  notes: agencyNotes,
                },
              },
            ],
          },
        },
        select: { id: true, reference: true },
      });
      break;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 4) {
        throw error;
      }
    }
  }
  if (!booking) throw new AppError(503, "BOOKING_REFERENCE_UNAVAILABLE", "Could not create a unique booking reference");
  void processPendingEmails(2);
  response.status(201).json({ success: true, data: { reference: booking.reference, status: "quote" } });
});

checkoutRouter.get("/bookings/:reference", bookingLookupRateLimit, async (request, response) => {
  const reference = referenceSchema.parse(request.params.reference);
  const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase()).parse(request.query.email);
  const quote = await prisma.quote.findFirst({
    where: { reference, customerEmail: email },
    include: {
      pickupLocation: { select: { name: true, slug: true } },
      returnLocation: { select: { name: true, slug: true } },
      vehicles: { include: { vehicle: { select: { code: true, name: true, exampleModels: true } } } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!quote) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  const vehicle = quote.vehicles[0]?.vehicle;
  const payment = quote.payments[0];
  response.json({
    success: true,
    data: {
      reference: quote.reference,
      status: statusForClient(quote.status, payment?.status, payment?.providerResponse, quote.expiresAt),
      category: quote.categorySlug ?? vehicle?.code ?? "—",
      categoryName: vehicle ? localizedText(vehicle.name, vehicle.code) : quote.categorySlug ?? "—",
      example: vehicle?.exampleModels[0] ?? null,
      pickupLocation: quote.pickupLocationLabel ?? localizedText(quote.pickupLocation.name, quote.pickupLocation.slug),
      dropoffLocation: quote.returnLocationLabel ?? localizedText(quote.returnLocation.name, quote.returnLocation.slug),
      pickupAt: quote.pickupAt.toISOString(),
      dropoffAt: quote.returnAt.toISOString(),
      totalAmountCents: toAmountCents(quote.quotedTotalEur),
      depositAmountCents: toAmountCents(quote.depositEur),
      receipt: payment?.status === PaymentStatus.PAID
        ? {
          amountPaidCents: toAmountCents(payment.amountEur),
          paidAt: payment.paidAt?.toISOString() ?? payment.updatedAt.toISOString(),
        }
        : null,
      currency: "eur",
    },
  });
});

checkoutRouter.post("/payments/checkout", paymentCheckoutRateLimit, async (request, response) => {
  if (!stripePaymentsEnabled) {
    console.error(
      "Stripe checkout is not configured; missing environment variables:",
      stripePaymentMissingVariables.join(", "),
    );
    response.status(503).json({ error: "payment_not_configured" });
    return;
  }
  const input = z.object({
    reference: referenceSchema,
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    idempotencyKey: z.string().uuid().optional(),
  }).strict().parse(request.body);
  const requestIdempotencyKey = z.string().uuid().parse(
    request.header("Idempotency-Key") ?? input.idempotencyKey,
  );
  const quote = await prisma.quote.findFirst({
    where: { reference: input.reference, customerEmail: input.email },
    include: { payments: { where: { provider: "stripe" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!quote) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  if (quote.expiresAt && quote.expiresAt <= new Date()) {
    throw new AppError(409, "BOOKING_EXPIRED", "This reservation quote has expired");
  }
  if (quote.status !== QuoteStatus.QUOTE_SENT && quote.status !== QuoteStatus.DEPOSIT_PENDING) {
    throw new AppError(409, "BOOKING_NOT_PAYABLE", "This booking is not currently awaiting a deposit");
  }
  const amountCents = toAmountCents(quote.depositEur);
  if (amountCents === null || amountCents < 5_000) {
    throw new AppError(409, "DEPOSIT_NOT_SET", "The agency has not set a deposit of at least EUR 50 for this booking yet");
  }
  const totalCents = toAmountCents(quote.quotedTotalEur);
  if (totalCents === null || amountCents > totalCents) {
    throw new AppError(409, "DEPOSIT_INVALID", "The deposit must not exceed the quoted total");
  }

  const latestPayment = quote.payments[0];
  const paymentIdempotencyKey = latestPayment?.status === PaymentStatus.CREATED &&
    toAmountCents(latestPayment.amountEur) === amountCents
    ? latestPayment.idempotencyKey
    : `stripe_checkout_${quote.id}_${amountCents}_${requestIdempotencyKey}`;
  const session = await getPaymentProvider().createPayment({
    bookingId: quote.id,
    reference: quote.reference,
    amountCents,
    currency: "eur",
    email: quote.customerEmail,
    idempotencyKey: paymentIdempotencyKey,
  });
  await prisma.$transaction(async (transaction) => {
    await transaction.payment.upsert({
      where: { idempotencyKey: paymentIdempotencyKey },
      create: {
        quoteId: quote.id,
        provider: "stripe",
        providerTransactionId: session.sessionId,
        providerPaymentIntentId: session.paymentIntentId,
        idempotencyKey: paymentIdempotencyKey,
        amountEur: new Prisma.Decimal((amountCents / 100).toFixed(2)),
        currency: "EUR",
        status: PaymentStatus.CREATED,
        checkoutUrl: session.url,
        customerFirstName: quote.customerFirstName,
        customerLastName: quote.customerLastName,
        customerEmail: quote.customerEmail,
        billingAddress: {},
        termsAcceptedAt: new Date(),
        providerResponse: { expiresAt: session.expiresAt.toISOString() },
      },
      update: {
        providerTransactionId: session.sessionId,
        providerPaymentIntentId: session.paymentIntentId,
        checkoutUrl: session.url,
        providerResponse: { expiresAt: session.expiresAt.toISOString() },
      },
    });
    await transaction.quote.update({
      where: { id: quote.id },
      data: { status: QuoteStatus.DEPOSIT_PENDING },
    });
  });
  response.json({ success: true, data: { url: session.url } });
});

stripeWebhookRouter.post("/payments/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (request, response) => {
  const signature = request.header("stripe-signature");
  if (!signature || !Buffer.isBuffer(request.body)) {
    throw new AppError(400, "INVALID_WEBHOOK_REQUEST", "Invalid payment notification");
  }
  const event = getPaymentProvider().handleWebhook(request.body, signature);
  if (!["checkout.session.completed", "checkout.session.expired", "payment_intent.payment_failed"].includes(event.type)) {
    response.json({ received: true });
    return;
  }

  let paidQuoteId: string | null = null;
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.processedStripeEvent.create({
        data: { eventId: event.id, eventType: event.type },
      });
      const payment =
        (event.paymentIntentId
          ? await transaction.payment.findFirst({ where: { providerPaymentIntentId: event.paymentIntentId } })
          : null) ??
        (event.sessionId
          ? await transaction.payment.findFirst({ where: { providerTransactionId: event.sessionId } })
          : null) ??
        (event.bookingId
          ? await transaction.payment.findFirst({
            where: { quoteId: event.bookingId, status: PaymentStatus.CREATED },
            orderBy: { createdAt: "desc" },
          })
          : null);
      if (!payment || payment.provider !== "stripe") return;
      if (event.paid && event.type === "checkout.session.completed") {
        await transaction.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            providerPaymentIntentId: event.paymentIntentId,
            providerResponse: { eventType: event.type },
          },
        });
        await transaction.quote.update({
          where: { id: payment.quoteId },
          data: { status: QuoteStatus.CONFIRMED },
        });
        await queueDepositPaidEmails(transaction, payment.quoteId);
        paidQuoteId = payment.quoteId;
      } else if (event.type === "checkout.session.expired") {
        await transaction.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.EXPIRED, providerResponse: { eventType: event.type } },
        });
      } else if (event.type === "payment_intent.payment_failed" && payment.status !== PaymentStatus.PAID) {
        await transaction.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
      }
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
  }
  if (paidQuoteId) await processPendingEmails();
  response.json({ received: true });
});

checkoutRouter.get("/payments/status/:reference", async (request, response) => {
  const reference = referenceSchema.parse(request.params.reference);
  const quote = await prisma.quote.findUnique({
    where: { reference },
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      pickupLocation: { select: { name: true, slug: true } },
    },
  });
  if (!quote) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  response.json({
    success: true,
    data: {
      reference,
      status: statusForClient(
        quote.status,
        quote.payments[0]?.status,
        quote.payments[0]?.providerResponse,
        quote.expiresAt,
      ),
      pickupLocation: quote.pickupLocationLabel
        ?? localizedText(quote.pickupLocation.name, quote.pickupLocation.slug),
    },
  });
});

export { checkoutRouter, stripeWebhookRouter };
