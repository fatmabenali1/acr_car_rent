import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db";
import { requireAdmin, requireRoles } from "../../middleware/admin-auth";
import { AppError } from "../../middleware/errors";
import { logAdminAction } from "../../services/admin-audit";

const availabilityBlocksRouter = Router();
availabilityBlocksRouter.use(requireAdmin, requireRoles("ADMIN"));

const blockSchema = z.object({
  vehicleId: z.string().min(1).max(100),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  reason: z.string().trim().max(500).optional(),
}).strict().refine((value) => value.endsAt > value.startsAt, {
  message: "Block end must be after its start",
  path: ["endsAt"],
});
const updateSchema = z.object({
  vehicleId: z.string().min(1).max(100).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  reason: z.string().trim().max(500).optional(),
}).strict();
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  vehicleId: z.string().min(1).optional(),
});

availabilityBlocksRouter.get("/", async (request, response) => {
  const query = paginationSchema.parse(request.query);
  const where = query.vehicleId ? { vehicleId: query.vehicleId } : {};
  const [items, total] = await Promise.all([
    prisma.availabilityBlock.findMany({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { startsAt: "desc" },
      include: { vehicle: { select: { id: true, code: true, name: true } } },
    }),
    prisma.availabilityBlock.count({ where }),
  ]);
  response.json({
    success: true,
    data: items,
    meta: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  });
});

availabilityBlocksRouter.post("/", async (request, response) => {
  const input = blockSchema.parse(request.body);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId }, select: { id: true } });
  if (!vehicle) throw new AppError(404, "VEHICLE_CATEGORY_NOT_FOUND", "Vehicle category not found");
  const block = await prisma.$transaction(async (transaction) => {
    const created = await transaction.availabilityBlock.create({ data: input });
    await logAdminAction({
      database: transaction,
      adminUserId: request.admin!.id,
      action: "CREATE",
      resource: "availability-block",
      resourceId: created.id,
      details: { vehicleId: created.vehicleId, startsAt: created.startsAt.toISOString(), endsAt: created.endsAt.toISOString() },
    });
    return created;
  });
  response.status(201).json({ success: true, data: block, meta: { timestamp: new Date().toISOString() } });
});

availabilityBlocksRouter.patch("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
  const input = updateSchema.parse(request.body);
  if (Object.keys(input).length === 0) {
    throw new AppError(422, "EMPTY_UPDATE", "At least one field must be provided");
  }
  const current = await prisma.availabilityBlock.findUnique({ where: { id } });
  if (!current) throw new AppError(404, "AVAILABILITY_BLOCK_NOT_FOUND", "Availability block not found");
  const startsAt = input.startsAt ?? current.startsAt;
  const endsAt = input.endsAt ?? current.endsAt;
  if (endsAt <= startsAt) {
    throw new AppError(422, "INVALID_AVAILABILITY_BLOCK", "Block end must be after its start");
  }
  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId }, select: { id: true } });
    if (!vehicle) throw new AppError(404, "VEHICLE_CATEGORY_NOT_FOUND", "Vehicle category not found");
  }
  const block = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.availabilityBlock.update({ where: { id }, data: input });
    await logAdminAction({
      database: transaction,
      adminUserId: request.admin!.id,
      action: "UPDATE",
      resource: "availability-block",
      resourceId: id,
      details: { fields: Object.keys(input) },
    });
    return updated;
  });
  response.json({ success: true, data: block, meta: { timestamp: new Date().toISOString() } });
});

availabilityBlocksRouter.delete("/:id", async (request, response) => {
  const { id } = z.object({ id: z.string().min(1).max(100) }).parse(request.params);
  const block = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.availabilityBlock.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "AVAILABILITY_BLOCK_NOT_FOUND", "Availability block not found");
    const deleted = await transaction.availabilityBlock.delete({ where: { id } });
    await logAdminAction({
      database: transaction,
      adminUserId: request.admin!.id,
      action: "DELETE",
      resource: "availability-block",
      resourceId: id,
      details: { vehicleId: existing.vehicleId },
    });
    return deleted;
  });
  response.json({ success: true, data: { id: block.id, deleted: true }, meta: { timestamp: new Date().toISOString() } });
});

export { availabilityBlocksRouter };
