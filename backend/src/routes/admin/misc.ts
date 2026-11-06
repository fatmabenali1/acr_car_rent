import { PaymentStatus, Prisma, QuoteStatus } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../db";
import { requireAdmin, requireRoles } from "../../middleware/admin-auth";
import { AppError } from "../../middleware/errors";
import { getPaymentProvider } from "../../services/payment-providers";
import { logAdminAction } from "../../services/admin-audit";
import { LocalStorageProvider } from "../../services/storage-provider";

const miscRouter = Router();
miscRouter.use(requireAdmin);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const paymentsRouter = Router();
paymentsRouter.use(requireRoles("ADMIN"));
paymentsRouter.get("/", async (request, response) => {
  const query = paginationSchema.extend({
    status: z.nativeEnum(PaymentStatus).optional(),
  }).parse(request.query);
  const where: Prisma.PaymentWhereInput = query.status ? { status: query.status } : {};
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quoteId: true,
        provider: true,
        providerTransactionId: true,
        amountEur: true,
        currency: true,
        status: true,
        customerFirstName: true,
        customerLastName: true,
        customerEmail: true,
        createdAt: true,
        quote: { select: { reference: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);
  await logAdminAction({
    adminUserId: request.admin!.id,
    action: "LIST",
    resource: "payments",
    details: { page: query.page, limit: query.limit, status: query.status ?? null },
  });
  response.json({
    success: true,
    data: items,
    meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  });
});

paymentsRouter.get("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      provider: true,
      providerTransactionId: true,
      amountEur: true,
      currency: true,
      status: true,
      customerFirstName: true,
      customerLastName: true,
      customerEmail: true,
      providerResponse: true,
      createdAt: true,
      updatedAt: true,
      quote: { select: { id: true, reference: true, status: true, quotedTotalEur: true } },
    },
  });
  if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  await logAdminAction({
    adminUserId: request.admin!.id,
    action: "READ",
    resource: "payment",
    resourceId: id,
  });
  response.json({ success: true, data: payment, meta: { timestamp: new Date().toISOString() } });
});

paymentsRouter.post("/:id/refund", async (request, response) => {
  const { id } = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
  const input = z.object({
    amount: z.coerce.number().finite().positive().refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
      "Amount must have at most two decimal places",
    ).optional(),
  }).strict().parse(request.body);
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { id: true, provider: true, providerTransactionId: true, amountEur: true, status: true },
  });
  if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  if (payment.status !== PaymentStatus.PAID || !payment.providerTransactionId) {
    throw new AppError(409, "PAYMENT_NOT_REFUNDABLE", "Only paid transactions can be refunded");
  }
  const amount = input.amount ?? Number(payment.amountEur);
  if (amount > Number(payment.amountEur)) {
    throw new AppError(422, "REFUND_AMOUNT_INVALID", "Refund cannot exceed the amount paid");
  }
  if (payment.provider !== env.PAYMENT_PROVIDER) {
    throw new AppError(409, "PAYMENT_PROVIDER_MISMATCH", "Payment provider does not match the active provider");
  }
  const refund = await getPaymentProvider().refund(payment.providerTransactionId, amount.toFixed(2));
  await logAdminAction({
    adminUserId: request.admin!.id,
    action: "REFUND",
    resource: "payment",
    resourceId: id,
    details: { amountEur: amount.toFixed(2), refundTransactionId: refund.transactionId },
  });
  response.json({ success: true, data: refund, meta: { timestamp: new Date().toISOString() } });
});

miscRouter.use("/payments", paymentsRouter);

const contactMessagesRouter = Router();
contactMessagesRouter.use(requireRoles("ADMIN"));
contactMessagesRouter.get("/", async (request, response) => {
  const query = paginationSchema.extend({
    isRead: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  }).parse(request.query);
  const where: Prisma.ContactMessageWhereInput = query.isRead === undefined ? {} : { isRead: query.isRead };
  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      include: { emailNotifications: { select: { id: true, template: true, status: true } } },
    }),
    prisma.contactMessage.count({ where }),
  ]);
  await logAdminAction({
    adminUserId: request.admin!.id,
    action: "LIST",
    resource: "contact-messages",
    details: { page: query.page, limit: query.limit, isRead: query.isRead ?? null },
  });
  response.json({
    success: true,
    data: items,
    meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  });
});

contactMessagesRouter.patch("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
  const input = z.object({ isRead: z.boolean() }).strict().parse(request.body);
  const existing = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AppError(404, "CONTACT_MESSAGE_NOT_FOUND", "Contact message not found");
  const message = await prisma.contactMessage.update({ where: { id }, data: input });
  await logAdminAction({
    adminUserId: request.admin!.id,
    action: "UPDATE",
    resource: "contact-message",
    resourceId: id,
    details: { isRead: input.isRead },
  });
  response.json({ success: true, data: message, meta: { timestamp: new Date().toISOString() } });
});
miscRouter.use("/contact-messages", contactMessagesRouter);

miscRouter.get("/stats/overview", requireRoles("ADMIN"), async (request, response) => {
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [statusCounts, recentQuotes, topCategories, paidDeposits] = await Promise.all([
    prisma.quote.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.quote.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    }),
    prisma.quoteVehicle.groupBy({
      by: ["vehicleId"],
      where: { quote: { createdAt: { gte: from } } },
      _count: { vehicleId: true },
      orderBy: { _count: { vehicleId: "desc" } },
      take: 10,
    }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.PAID },
      _sum: { amountEur: true },
      _count: { _all: true },
    }),
  ]);
  const vehicleIds = topCategories.map(({ vehicleId }) => vehicleId);
  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds } },
    select: { id: true, code: true, name: true },
  });
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const requestsByDay = new Map<string, number>();
  for (const quote of recentQuotes) {
    const day = quote.createdAt.toISOString().slice(0, 10);
    requestsByDay.set(day, (requestsByDay.get(day) ?? 0) + 1);
  }
  await logAdminAction({
    adminUserId: request.admin!.id,
    action: "READ",
    resource: "stats-overview",
  });
  response.json({
    success: true,
    data: {
      requestsByStatus: statusCounts.map(({ status, _count }) => ({ status, count: _count._all })),
      requestsByDay: [...requestsByDay.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
      topCategories: topCategories.flatMap(({ vehicleId, _count }) => {
        const vehicle = vehicleById.get(vehicleId);
        return vehicle ? [{ vehicleId, code: vehicle.code, name: vehicle.name, requests: _count.vehicleId }] : [];
      }),
      depositsCollected: {
        amountEur: paidDeposits._sum.amountEur?.toString() ?? "0.00",
        paymentsCount: paidDeposits._count._all,
      },
      period: { from: from.toISOString(), to: new Date().toISOString() },
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.ADMIN_UPLOAD_MAX_BYTES, files: 1 },
});
miscRouter.post(
  "/uploads",
  requireRoles("ADMIN"),
  upload.single("file"),
  async (request, response) => {
    if (!request.file) {
      throw new AppError(422, "UPLOAD_FILE_REQUIRED", "Upload an image in the 'file' field");
    }
    const stored = await new LocalStorageProvider().upload({
      buffer: request.file.buffer,
      mimeType: request.file.mimetype,
      originalName: request.file.originalname,
    });
    await logAdminAction({
      adminUserId: request.admin!.id,
      action: "UPLOAD",
      resource: "file",
      resourceId: stored.url,
      details: { mimeType: stored.mimeType, size: stored.size },
    });
    response.status(201).json({ success: true, data: stored, meta: { timestamp: new Date().toISOString() } });
  },
);

export { miscRouter };
