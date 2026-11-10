import { PaymentStatus, Prisma, QuoteStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../db";
import { requireAdmin, requireRoles } from "../../middleware/admin-auth";
import { AppError } from "../../middleware/errors";
import { logAdminAction } from "../../services/admin-audit";
import { processPendingEmails } from "../../services/quote-email-outbox";
import {
  getCancellationNoticeDays,
  getIncludedKilometres,
  getIncludedRentalItems,
  localizedJsonString,
  resolveCdwExcessEur,
} from "../../services/rental-email-policy";

const quotesRouter = Router();
quotesRouter.use(requireAdmin, requireRoles("ADMIN", "STAFF"));

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const quoteFilterSchema = paginationSchema.extend({
  status: z.nativeEnum(QuoteStatus).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  categoryId: z.string().min(1).optional(),
  categoryCode: z.string().min(1).max(20).optional(),
});

const updateQuoteSchema = z.object({
  status: z.nativeEnum(QuoteStatus).optional(),
  quotedTotal: z.coerce.number().finite().min(0).refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    "quotedTotal must have at most two decimal places",
  ).optional(),
  depositAmount: z.coerce.number().finite().min(0).refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
    "depositAmount must have at most two decimal places",
  ).optional(),
}).strict();

const transitions: Record<QuoteStatus, QuoteStatus[]> = {
  NEW: ["IN_PROGRESS", "CANCELLED", "EXPIRED"],
  IN_PROGRESS: ["QUOTE_SENT", "CANCELLED", "EXPIRED"],
  QUOTE_SENT: ["DEPOSIT_PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"],
  DEPOSIT_PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["CANCELLED", "COMPLETED"],
  CANCELLED: [],
  EXPIRED: [],
  COMPLETED: [],
};

function buildQuoteWhere(filters: {
  status?: QuoteStatus;
  from?: Date;
  to?: Date;
  categoryId?: string;
  categoryCode?: string;
}): Prisma.QuoteWhereInput {
  const where: Prisma.QuoteWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.pickupAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  if (filters.categoryId) {
    where.vehicles = { some: { vehicleId: filters.categoryId } };
  } else if (filters.categoryCode) {
    where.vehicles = { some: { vehicle: { code: filters.categoryCode } } };
  }
  return where;
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function localizedName(value: Prisma.JsonValue, language: string): string {
  return localizedJsonString(value, language === "el" ? "el" : "en");
}

quotesRouter.get("/export", async (request, response) => {
  const { status, from, to, categoryId, categoryCode } = quoteFilterSchema
    .omit({ page: true, limit: true })
    .parse(request.query);
  const quotes = await prisma.quote.findMany({
    where: buildQuoteWhere({ status, from, to, categoryId, categoryCode }),
    orderBy: { createdAt: "desc" },
    include: { vehicles: { include: { vehicle: { select: { code: true } } } } },
  });
  const columns = [
    "reference", "status", "customerFirstName", "customerLastName", "customerEmail",
    "customerPhone", "pickupAt", "returnAt", "categories", "quotedTotalEur", "depositEur",
  ];
  const records = quotes.map((quote) => [
    quote.reference,
    quote.status,
    quote.customerFirstName,
    quote.customerLastName,
    quote.customerEmail,
    quote.customerPhone,
    quote.pickupAt.toISOString(),
    quote.returnAt.toISOString(),
    quote.vehicles.map(({ vehicle }) => vehicle.code).join(";"),
    quote.quotedTotalEur?.toString(),
    quote.depositEur?.toString(),
  ]);
  const csv = [columns, ...records].map((row) => row.map(csvCell).join(",")).join("\r\n");
  await logAdminAction({
    adminUserId: request.admin!.id,
    action: "EXPORT",
    resource: "quotes",
    details: {
      filters: Object.fromEntries(
        Object.entries({ status, from: from?.toISOString(), to: to?.toISOString(), categoryId, categoryCode })
          .filter(([, value]) => value !== undefined),
      ) as Prisma.InputJsonObject,
      count: quotes.length,
    },
  });
  response.type("text/csv").attachment("quotes.csv").send(`\uFEFF${csv}`);
});

quotesRouter.get("/", async (request, response) => {
  const filters = quoteFilterSchema.parse(request.query);
  const where = buildQuoteWhere(filters);
  const [items, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: {
        vehicles: { include: { vehicle: { select: { code: true, name: true } } } },
        pickupLocation: { select: { name: true } },
        returnLocation: { select: { name: true } },
      },
    }),
    prisma.quote.count({ where }),
  ]);
  await logAdminAction({
    adminUserId: request.admin!.id,
    action: "LIST",
    resource: "quotes",
    details: { page: filters.page, limit: filters.limit, status: filters.status ?? null },
  });
  response.json({
    success: true,
    data: items,
    meta: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit),
    },
  });
});

quotesRouter.get("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      vehicles: { include: { vehicle: true } },
      extras: { include: { extra: true } },
      payments: { select: { id: true, amountEur: true, currency: true, status: true, createdAt: true } },
      pickupLocation: true,
      returnLocation: true,
      emailNotifications: { select: { id: true, template: true, status: true, attempts: true, createdAt: true } },
    },
  });
  if (!quote) throw new AppError(404, "QUOTE_NOT_FOUND", "Quote not found");
  await logAdminAction({
    adminUserId: request.admin!.id,
    action: "READ",
    resource: "quote",
    resourceId: id,
  });
  response.json({ success: true, data: quote, meta: { timestamp: new Date().toISOString() } });
});

quotesRouter.patch("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
  const input = updateQuoteSchema.parse(request.body);
  if (Object.keys(input).length === 0) {
    throw new AppError(422, "EMPTY_UPDATE", "At least one field must be provided");
  }
  const current = await prisma.quote.findUnique({
    where: { id },
    select: { id: true, status: true, quotedTotalEur: true, depositEur: true },
  });
  if (!current) throw new AppError(404, "QUOTE_NOT_FOUND", "Quote not found");
  if (input.status && input.status !== current.status && !transitions[current.status].includes(input.status)) {
    throw new AppError(409, "QUOTE_STATUS_TRANSITION_INVALID", `Cannot move quote from ${current.status} to ${input.status}`);
  }

  const quotedTotal = input.quotedTotal ?? (current.quotedTotalEur ? Number(current.quotedTotalEur) : null);
  const deposit = input.depositAmount ?? (current.depositEur ? Number(current.depositEur) : null);
  if (deposit !== null && deposit < 50) {
    throw new AppError(422, "DEPOSIT_AMOUNT_TOO_LOW", "The requested deposit must be at least EUR 50");
  }
  if (deposit !== null && (quotedTotal === null || deposit > quotedTotal)) {
    throw new AppError(422, "DEPOSIT_AMOUNT_INVALID", "The requested deposit cannot exceed the quoted total");
  }
  if (input.quotedTotal !== undefined && input.quotedTotal <= 0) {
    throw new AppError(422, "QUOTE_TOTAL_INVALID", "The quoted total must be greater than zero");
  }

  const updateData: Prisma.QuoteUpdateInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.quotedTotal !== undefined
      ? { quotedTotalEur: new Prisma.Decimal(input.quotedTotal.toFixed(2)) }
      : {}),
    ...(input.depositAmount !== undefined
      ? { depositEur: new Prisma.Decimal(input.depositAmount.toFixed(2)) }
      : {}),
    ...(input.status === "QUOTE_SENT" && current.status !== "QUOTE_SENT" ? { quoteSentAt: new Date() } : {}),
  };
  const quote = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.quote.update({ where: { id }, data: updateData });
    await logAdminAction({
      database: transaction,
      adminUserId: request.admin!.id,
      action: "UPDATE",
      resource: "quote",
      resourceId: id,
      details: { fields: Object.keys(input) },
    });
    return updated;
  });
  response.json({ success: true, data: quote, meta: { timestamp: new Date().toISOString() } });
});

quotesRouter.post("/:id/send-quote", async (request, response) => {
  const { id } = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      vehicles: { include: { vehicle: { select: { code: true, exampleModels: true, cdwExcessEur: true, group: true } } } },
      extras: { include: { extra: { select: { name: true } } } },
      pickupLocation: { select: { name: true } },
      returnLocation: { select: { name: true } },
    },
  });
  if (!quote) throw new AppError(404, "QUOTE_NOT_FOUND", "Quote not found");
  if (quote.status !== "IN_PROGRESS" && quote.status !== "QUOTE_SENT") {
    throw new AppError(409, "QUOTE_NOT_READY_TO_SEND", "Move the quote to IN_PROGRESS before sending an offer");
  }
  if (!quote.quotedTotalEur || !quote.depositEur || quote.depositEur.lessThan(50)) {
    throw new AppError(409, "QUOTE_PRICING_INCOMPLETE", "A valid total and deposit of at least EUR 50 are required");
  }
  if (quote.depositEur.greaterThan(quote.quotedTotalEur)) {
    throw new AppError(409, "QUOTE_DEPOSIT_INVALID", "The deposit cannot exceed the quoted total");
  }
  if (!quote.vehicles.length) {
    throw new AppError(409, "QUOTE_CATEGORY_MISSING", "The quote has no vehicle category");
  }
  const [rentalPolicy, rentalInfo] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "rental-policy" }, select: { value: true } }),
    prisma.setting.findUnique({ where: { key: "rental-info" }, select: { value: true } }),
  ]);
  const language = quote.language === "el" ? "el" : "en";
  const paymentUrl = new URL("/pay", env.APP_URL);
  paymentUrl.searchParams.set("ref", quote.reference);

  const payload = {
    reference: quote.reference,
    customerFirstName: quote.customerFirstName,
    vehicleCategories: quote.vehicles.map(({ vehicle }) => ({
      code: vehicle.code,
      exampleModels: vehicle.exampleModels,
      cdwExcessEur: resolveCdwExcessEur(vehicle, rentalInfo?.value),
      cancellationNoticeDays: getCancellationNoticeDays(rentalPolicy?.value, vehicle.code),
    })),
    pickupLocation: quote.pickupLocationLabel ?? localizedName(quote.pickupLocation.name, quote.language),
    returnLocation: quote.returnLocationLabel ?? localizedName(quote.returnLocation.name, quote.language),
    pickupAt: quote.pickupAt.toISOString(),
    returnAt: quote.returnAt.toISOString(),
    totalEur: quote.quotedTotalEur.toFixed(2),
    depositEur: quote.depositEur.toFixed(2),
    kilometresIncluded: getIncludedKilometres(quote.pickupAt, quote.returnAt, rentalInfo?.value, language),
    inclusions: getIncludedRentalItems(rentalInfo?.value, language),
    extras: quote.extras.map(({ extra, quantity, childAge, childWeightKg }) => {
      const name = localizedName(extra.name, language);
      const childAgeText = language === "el" ? "ηλικία παιδιού" : "child age";
      const childWeightText = language === "el" ? "βάρος παιδιού" : "child weight";
      return [
        `${name} x${quantity}`,
        childAge === null ? "" : `${childAgeText} ${childAge}`,
        childWeightKg === null ? "" : `${childWeightText} ${childWeightKg.toString()} kg`,
      ].filter(Boolean).join(" — ");
    }),
    paymentUrl: paymentUrl.toString(),
    agencyPhones: [env.AGENCY_PHONE, env.AGENCY_SECONDARY_PHONE],
  };
  const updated = await prisma.$transaction(async (transaction) => {
    const result = await transaction.quote.update({
      where: { id },
      data: { status: "QUOTE_SENT", quoteSentAt: new Date() },
    });
    await transaction.emailOutbox.create({
      data: {
        quoteId: id,
        recipient: quote.customerEmail,
        template: "quote_offer",
        language,
        payload,
      },
    });
    await logAdminAction({
      database: transaction,
      adminUserId: request.admin!.id,
      action: "SEND_QUOTE",
      resource: "quote",
      resourceId: id,
      details: { reference: quote.reference, language: quote.language },
    });
    return result;
  });
  void processPendingEmails(1);
  response.status(202).json({
    success: true,
    data: { quote: updated, emailStatus: "queued" },
    meta: { lang: language },
  });
});

export { quotesRouter };
