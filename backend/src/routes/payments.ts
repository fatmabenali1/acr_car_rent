import { randomUUID } from "node:crypto";
import { PaymentStatus, Prisma, QuoteStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../db";
import { AppError } from "../middleware/errors";
import { verifyRecaptchaToken } from "../services/recaptcha";
import { MockProvider, mockCheckoutAvailable } from "../services/payment-providers/mock-provider";
import { getPaymentProvider, type PaymentOutcome, type VerifiedPaymentCallback } from "../services/payment-providers";
import { processPendingEmails } from "../services/quote-email-outbox";
import { getCancellationNoticeDays, localizedJsonString, resolveCdwExcessEur } from "../services/rental-email-policy";

const paymentsRouter = Router();

const paymentInitSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  country: z.string().trim().min(2).max(100),
  state: z.string().trim().max(100),
  city: z.string().trim().min(1).max(100),
  zipcode: z.string().trim().min(1).max(20),
  address: z.string().trim().min(1).max(300),
  mobile: z.string().regex(/^\+?[0-9]{7,15}$/, "Mobile must contain 7 to 15 digits and no spaces"),
  amount: z.coerce.number().finite().min(0).refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    "Amount must have at most two decimal places",
  ),
  reservationReference: z.string().regex(/^\d{4}[A-Z]{2}$/),
  deliveryDate: z.string().regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/, "Delivery date must use d/m/Y format"),
  notes: z.string().max(2000).optional(),
  acceptedTerms: z.boolean().optional(),
  recaptchaToken: z.string().min(1).max(4096),
}).strict();

const mockOutcomeSchema = z.object({
  outcome: z.enum(["success", "failure", "cancelled"]),
}).strict();

function parseDeliveryDate(value: string): Date {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) {
    throw new AppError(400, "INVALID_DELIVERY_DATE", "Delivery date must use d/m/Y format");
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new AppError(400, "INVALID_DELIVERY_DATE", "Delivery date is not a valid calendar date");
  }
  return date;
}

function amountInCents(amount: number): number {
  return Math.round(amount * 100);
}

async function getPaymentTerms(quoteId: string) {
  const [quote, rentalPolicy, rentalInfo] = await Promise.all([
    prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        vehicles: {
          select: {
            vehicle: { select: { code: true, name: true, cdwExcessEur: true, group: true } },
          },
        },
      },
    }),
    prisma.setting.findUnique({ where: { key: "rental-policy" }, select: { value: true } }),
    prisma.setting.findUnique({ where: { key: "rental-info" }, select: { value: true } }),
  ]);
  return (quote?.vehicles ?? []).map(({ vehicle }) => {
    const excess = resolveCdwExcessEur(vehicle, rentalInfo?.value);
    const noticeDays = getCancellationNoticeDays(rentalPolicy?.value, vehicle.code);
    return {
      categoryCode: vehicle.code,
      cdwExcessEur: excess,
      cdwPreauthorization: {
        amountEur: excess,
        charged: false,
        heldOnCardAtPickup: true,
      },
      cancellation: {
        depositRefundNoticeDays: noticeDays,
        message: noticeDays === null
          ? {
            en: "Please contact ACR to confirm the cancellation policy for this category.",
            el: "Επικοινωνήστε με την ACR για επιβεβαίωση της πολιτικής ακύρωσης για αυτή την κατηγορία.",
          }
          : {
            en: `The deposit is refundable when cancellation is received at least ${noticeDays} days before pickup.`,
            el: `Η προκαταβολή επιστρέφεται όταν η ακύρωση γνωστοποιηθεί τουλάχιστον ${noticeDays} ημέρες πριν από την παραλαβή.`,
          },
      },
    };
  });
}

paymentsRouter.post("/payments/init", async (request, response) => {
  if (request.body?.acceptedTerms !== true) {
    throw new AppError(422, "TERMS_NOT_ACCEPTED", "You must accept the payment terms");
  }
  const input = paymentInitSchema.parse(request.body);
  await verifyRecaptchaToken(input.recaptchaToken, "payment_init");

  if (input.amount < 50) {
    throw new AppError(422, "PAYMENT_AMOUNT_TOO_LOW", "The deposit must be at least EUR 50");
  }
  const deliveryAt = parseDeliveryDate(input.deliveryDate);
  const quote = await prisma.quote.findUnique({
    where: { reference: input.reservationReference },
    select: {
      id: true,
      reference: true,
      status: true,
      quotedTotalEur: true,
      expiresAt: true,
    },
  });
  if (!quote) {
    throw new AppError(404, "QUOTE_NOT_FOUND", "Reservation reference not found");
  }
  if (quote.status === QuoteStatus.CANCELLED) {
    throw new AppError(409, "QUOTE_CANCELLED", "This quote has been cancelled");
  }
  if (quote.status === QuoteStatus.EXPIRED || (quote.expiresAt && quote.expiresAt <= new Date())) {
    throw new AppError(409, "QUOTE_EXPIRED", "This quote has expired");
  }
  if (quote.status !== QuoteStatus.QUOTE_SENT && quote.status !== QuoteStatus.DEPOSIT_PENDING) {
    throw new AppError(409, "QUOTE_NOT_PAYABLE", "This quote is not currently awaiting a deposit");
  }
  if (!quote.quotedTotalEur) {
    throw new AppError(409, "QUOTE_TOTAL_MISSING", "The quote does not have a confirmed total");
  }
  if (amountInCents(input.amount) > amountInCents(Number(quote.quotedTotalEur))) {
    throw new AppError(422, "PAYMENT_AMOUNT_EXCEEDS_QUOTE", "The payment cannot exceed the quoted total");
  }

  if (env.PAYMENT_PROVIDER === "alphabank") {
    throw new AppError(
      env.ALPHABANK_INTEGRATION_CONFIG ? 501 : 503,
      env.ALPHABANK_INTEGRATION_CONFIG ? "ALPHABANK_INTEGRATION_TODO" : "ALPHABANK_CONFIGURATION_REQUIRED",
      env.ALPHABANK_INTEGRATION_CONFIG
        ? "Alpha Bank checkout cannot be enabled before the official integration is implemented"
        : "Set ALPHABANK_INTEGRATION_CONFIG after obtaining Alpha Bank's official integration documentation",
    );
  }

  const now = new Date();
  const payment = await prisma.payment.create({
    data: {
      quoteId: quote.id,
      provider: env.PAYMENT_PROVIDER,
      idempotencyKey: `payment_${randomUUID()}`,
      amountEur: new Prisma.Decimal(input.amount.toFixed(2)),
      status: PaymentStatus.INITIATED,
      customerFirstName: input.firstName,
      customerLastName: input.lastName,
      customerEmail: input.email,
      billingAddress: {
        country: input.country,
        state: input.state,
        city: input.city,
        zipcode: input.zipcode,
        address: input.address,
        mobile: input.mobile,
      },
      deliveryAt,
      notes: input.notes,
      termsAcceptedAt: now,
    },
    select: { id: true },
  });

  const provider = getPaymentProvider();
  try {
    const session = await provider.createSession({
      paymentId: payment.id,
      reference: quote.reference,
      amountEur: input.amount.toFixed(2),
      currency: "EUR",
      customerEmail: input.email,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerTransactionId: session.transactionId,
        checkoutUrl: session.redirectUrl,
      },
    });
    response.status(201).json({
      success: true,
      data: {
        paymentId: payment.id,
        status: PaymentStatus.INITIATED,
        redirectUrl: session.redirectUrl,
        redirectParameters: session.redirectParameters,
        terms: await getPaymentTerms(quote.id),
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    });
    throw error;
  }
});

async function applyCallback(callback: VerifiedPaymentCallback) {
  const payment = await prisma.payment.findUnique({
    where: { providerTransactionId: callback.transactionId },
    select: { id: true, quoteId: true, status: true, amountEur: true },
  });
  if (!payment) {
    throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment transaction not found");
  }

  const statusByOutcome: Record<PaymentOutcome, PaymentStatus> = {
    PAID: PaymentStatus.PAID,
    FAILED: PaymentStatus.FAILED,
    CANCELLED: PaymentStatus.CANCELLED,
  };
  const status = statusByOutcome[callback.outcome];
  const result = await prisma.$transaction(async (transaction) => {
    const update = await transaction.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.INITIATED },
      data: { status, providerResponse: callback.safeResponse },
    });
    if (update.count === 1 && status === PaymentStatus.PAID) {
      await transaction.quote.updateMany({
        where: {
          id: payment.quoteId,
          status: { in: [QuoteStatus.QUOTE_SENT, QuoteStatus.DEPOSIT_PENDING] },
        },
        data: { status: QuoteStatus.CONFIRMED },
      });
      const quote = await transaction.quote.findUnique({
        where: { id: payment.quoteId },
        select: {
          reference: true,
          customerFirstName: true,
          customerLastName: true,
          customerEmail: true,
          language: true,
          quotedTotalEur: true,
          pickupAt: true,
          pickupLocation: { select: { name: true } },
        },
      });
      if (!quote) throw new AppError(404, "QUOTE_NOT_FOUND", "Quote for payment not found");
      const totalPaidResult = await transaction.payment.aggregate({
        where: { quoteId: payment.quoteId, status: PaymentStatus.PAID },
        _sum: { amountEur: true },
      });
      const totalPaid = totalPaidResult._sum.amountEur ?? new Prisma.Decimal(0);
      const balanceRemaining = quote.quotedTotalEur && quote.quotedTotalEur.greaterThan(totalPaid)
        ? quote.quotedTotalEur.minus(totalPaid)
        : new Prisma.Decimal(0);
      const language = quote.language === "el" ? "el" : "en";
      const pickupLocation = localizedJsonString(quote.pickupLocation.name, language);
      const customerPayload = {
        reference: quote.reference,
        customerFirstName: quote.customerFirstName,
        amountPaidEur: payment.amountEur.toFixed(2),
        totalPaidEur: totalPaid.toFixed(2),
        balanceRemainingEur: balanceRemaining.toFixed(2),
        pickupAt: quote.pickupAt.toISOString(),
        pickupLocation,
        agencyPhones: [env.AGENCY_PHONE, env.AGENCY_SECONDARY_PHONE],
      };
      const internalPayload = {
        reference: quote.reference,
        customerName: `${quote.customerFirstName} ${quote.customerLastName}`,
        customerEmail: quote.customerEmail,
        amountPaidEur: payment.amountEur.toFixed(2),
        totalPaidEur: totalPaid.toFixed(2),
        balanceRemainingEur: balanceRemaining.toFixed(2),
        pickupAt: quote.pickupAt.toISOString(),
      };
      await transaction.emailOutbox.createMany({
        data: [
          {
            quoteId: payment.quoteId,
            recipient: quote.customerEmail,
            template: "deposit_confirmation",
            language,
            payload: customerPayload,
          },
          {
            quoteId: payment.quoteId,
            recipient: env.AGENCY_EMAIL,
            template: "internal_deposit_paid",
            language,
            payload: internalPayload,
          },
        ],
      });
    }
    const currentPayment = update.count === 1
      ? undefined
      : await transaction.payment.findUnique({
        where: { id: payment.id },
        select: { status: true },
      });
    return {
      status: update.count === 1 ? status : currentPayment?.status ?? payment.status,
      duplicate: update.count === 0,
    };
  });
  return { paymentId: payment.id, ...result };
}

paymentsRouter.post("/payments/callback", async (request, response) => {
  const provider = getPaymentProvider();
  const callback = await provider.verifyCallback(request.body);
  const result = await applyCallback(callback);
  if (!result.duplicate && result.status === PaymentStatus.PAID) {
    void processPendingEmails(2);
  }
  response.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

paymentsRouter.get("/payments/:id/status", async (request, response) => {
  const params = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      quoteId: true,
      amountEur: true,
      status: true,
      createdAt: true,
    },
  });
  if (!payment) {
    throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  }
  response.json({
    success: true,
    data: {
      paymentId: payment.id,
      amountEur: payment.amountEur.toString(),
      status: payment.status,
      createdAt: payment.createdAt,
      terms: await getPaymentTerms(payment.quoteId),
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

if (mockCheckoutAvailable()) {
  paymentsRouter.get("/payments/mock-checkout/:id", async (request, response) => {
    const params = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, providerTransactionId: true, quote: { select: { reference: true } } },
    });
    if (!payment || !payment.providerTransactionId) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    }
    if (payment.status !== PaymentStatus.INITIATED) {
      throw new AppError(409, "PAYMENT_ALREADY_FINALIZED", "This mock payment is already finalized");
    }
    response.type("html").send(`<!doctype html>
      <html lang="en"><meta charset="utf-8"><title>ACR mock payment</title>
      <body><h1>Mock payment for ${payment.quote.reference}</h1>
      <p>Development-only hosted-checkout simulation. No card data is requested or stored.</p>
      <button data-outcome="success">Simulate success</button>
      <button data-outcome="failure">Simulate failure</button>
      <button data-outcome="cancelled">Simulate cancellation</button>
      <pre id="result"></pre>
      <script>
        const paymentId = ${JSON.stringify(payment.id)};
        for (const button of document.querySelectorAll("button[data-outcome]")) {
          button.addEventListener("click", async () => {
            const result = await fetch("/api/v1/payments/mock-checkout/" + encodeURIComponent(paymentId), {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ outcome: button.dataset.outcome })
            });
            document.querySelector("#result").textContent = await result.text();
          });
        }
      </script></body></html>`);
  });

  paymentsRouter.post("/payments/mock-checkout/:id", async (request, response) => {
    const params = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
    const input = mockOutcomeSchema.parse(request.body);
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      select: { status: true, providerTransactionId: true, provider: true },
    });
    if (!payment || !payment.providerTransactionId || payment.provider !== "mock") {
      throw new AppError(404, "PAYMENT_NOT_FOUND", "Mock payment not found");
    }
    if (payment.status !== PaymentStatus.INITIATED) {
      throw new AppError(409, "PAYMENT_ALREADY_FINALIZED", "This mock payment is already finalized");
    }
    const provider = getPaymentProvider();
    if (!(provider instanceof MockProvider)) {
      throw new AppError(404, "MOCK_PAYMENT_NOT_FOUND", "Mock payment checkout is unavailable");
    }
    const outcome: PaymentOutcome = input.outcome === "success"
      ? "PAID"
      : input.outcome === "failure" ? "FAILED" : "CANCELLED";
    const callback = await provider.verifyCallback(
      provider.createCallback(payment.providerTransactionId, outcome),
    );
    response.json({ success: true, data: await applyCallback(callback) });
  });
}

export { paymentsRouter };
