import { FuelType, Prisma, Transmission, VehicleGroup } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db";
import { requireAdmin, requireRoles } from "../../middleware/admin-auth";
import { AppError } from "../../middleware/errors";
import { logAdminAction } from "../../services/admin-audit";

type CrudOperations<Create extends object, Update extends object> = {
  list: (skip: number, take: number) => Promise<{ items: unknown[]; total: number }>;
  get: (id: string) => Promise<unknown | null>;
  create: (data: Create) => Promise<{ id: string }>;
  update: (id: string, data: Update) => Promise<{ id: string }>;
  remove: (id: string) => Promise<void>;
};

const localizedTextSchema = z.record(z.string().min(2).max(10), z.string().max(20_000));
const nullableMoneySchema = z.number().finite().min(0).refine(
  (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
  "Amounts must have at most two decimal places",
).nullable().optional();
const moneySchema = z.number().finite().min(0).refine(
  (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
  "Amounts must have at most two decimal places",
);
const nullableIntegerSchema = z.number().int().min(0).nullable().optional();

function isJsonInput(value: unknown): value is Prisma.InputJsonValue {
  if (value === null) return false;
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonInput);
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === Object.prototype || prototype === null) &&
    Object.values(value).every(isJsonInput)
  );
}

const jsonInputSchema = z.custom<Prisma.InputJsonValue>(isJsonInput, "Value must be valid JSON");

function actorId(request: Express.Request): string {
  if (!request.admin) throw new AppError(401, "AUTHENTICATION_REQUIRED", "Admin access token is required");
  return request.admin.id;
}

function registerCrud<Create extends object, Update extends object>(
  router: Router,
  path: string,
  resource: string,
  createSchema: z.ZodType<Create>,
  updateSchema: z.ZodType<Update>,
  operations: CrudOperations<Create, Update>,
): void {
  const resourceRouter = Router();
  const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  });

  resourceRouter.get("/", async (request, response) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const result = await operations.list((page - 1) * limit, limit);
    response.json({
      success: true,
      data: result.items,
      meta: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  });

  resourceRouter.get("/:id", async (request, response) => {
    const { id } = z.object({ id: z.string().min(1).max(200) }).parse(request.params);
    const item = await operations.get(id);
    if (!item) throw new AppError(404, "ADMIN_RESOURCE_NOT_FOUND", `${resource} item not found`);
    response.json({ success: true, data: item, meta: { timestamp: new Date().toISOString() } });
  });

  resourceRouter.post("/", async (request, response) => {
    const input = createSchema.parse(request.body);
    const item = await operations.create(input);
    await logAdminAction({
      adminUserId: actorId(request),
      action: "CREATE",
      resource,
      resourceId: item.id,
      details: { fields: Object.keys(input) },
    });
    response.status(201).json({ success: true, data: item, meta: { timestamp: new Date().toISOString() } });
  });

  resourceRouter.patch("/:id", async (request, response) => {
    const { id } = z.object({ id: z.string().min(1).max(200) }).parse(request.params);
    const input = updateSchema.parse(request.body);
    if (
      typeof input !== "object" ||
      input === null ||
      Object.keys(input).length === 0
    ) {
      throw new AppError(422, "EMPTY_UPDATE", "At least one field must be provided");
    }
    if (!(await operations.get(id))) {
      throw new AppError(404, "ADMIN_RESOURCE_NOT_FOUND", `${resource} item not found`);
    }
    const item = await operations.update(id, input);
    await logAdminAction({
      adminUserId: actorId(request),
      action: "UPDATE",
      resource,
      resourceId: item.id,
      details: { fields: Object.keys(input) },
    });
    response.json({ success: true, data: item, meta: { timestamp: new Date().toISOString() } });
  });

  resourceRouter.delete("/:id", async (request, response) => {
    const { id } = z.object({ id: z.string().min(1).max(200) }).parse(request.params);
    if (!(await operations.get(id))) {
      throw new AppError(404, "ADMIN_RESOURCE_NOT_FOUND", `${resource} item not found`);
    }
    await operations.remove(id);
    await logAdminAction({
      adminUserId: actorId(request),
      action: "DELETE",
      resource,
      resourceId: id,
    });
    response.json({ success: true, data: { id, deleted: true }, meta: { timestamp: new Date().toISOString() } });
  });

  router.use(path, resourceRouter);
}

const vehicleSchema = z.object({
  code: z.string().trim().min(1).max(20),
  slug: z.string().trim().min(1).max(100),
  name: localizedTextSchema,
  description: localizedTextSchema.optional(),
  exampleModels: z.array(z.string().max(100)).max(30).default([]),
  group: z.nativeEnum(VehicleGroup),
  transmission: z.nativeEnum(Transmission).nullable().optional(),
  seats: nullableIntegerSchema,
  doors: nullableIntegerSchema,
  luggageMinLitres: nullableIntegerSchema,
  luggageMaxLitres: nullableIntegerSchema,
  fuel: z.nativeEnum(FuelType).nullable().optional(),
  airbag: z.boolean().nullable().optional(),
  abs: z.boolean().nullable().optional(),
  airConditioning: z.boolean().nullable().optional(),
  cdPlayer: z.boolean().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  cdwExcessEur: nullableMoneySchema,
  availableUnits: z.number().int().min(0).default(0),
  minimumDriverAge: z.number().int().min(18).max(100).nullable().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
}).strict();

const pricePlanSchema = z.object({
  vehicleId: z.string().min(1),
  seasonId: z.string().min(1),
  minDays: z.number().int().min(1).max(365),
  maxDays: z.number().int().min(1).max(365).nullable().optional(),
  dailyRateEur: moneySchema.optional(),
}).strict();

const seasonBaseSchema = z.object({
  name: localizedTextSchema,
  startsOn: z.coerce.date(),
  endsOn: z.coerce.date(),
  isActive: z.boolean().default(true),
}).strict();
const seasonSchema = seasonBaseSchema.refine((value) => value.endsOn > value.startsOn, {
  message: "Season end must be after its start",
});
const seasonUpdateSchema = seasonBaseSchema.partial().refine(
  (value) => !value.startsOn || !value.endsOn || value.endsOn > value.startsOn,
  { message: "Season end must be after its start" },
);

const extraSchema = z.object({
  code: z.string().trim().min(1).max(30),
  slug: z.string().trim().min(1).max(100),
  name: localizedTextSchema,
  description: localizedTextSchema.optional(),
  unitPriceEur: moneySchema.optional(),
  priceUnit: z.enum(["PER_DAY", "PER_RENTAL"]).nullable().optional(),
  requiresChildAge: z.boolean().default(false),
  requiresChildWeight: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
}).strict();

const locationSchema = z.object({
  slug: z.string().trim().min(1).max(100),
  name: localizedTextSchema,
  description: localizedTextSchema.optional(),
  address: z.string().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  isAirport: z.boolean().default(false),
  isFree: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
}).strict();

const offerSchema = z.object({
  slug: z.string().trim().min(1).max(100),
  name: localizedTextSchema,
  description: localizedTextSchema.optional(),
  offerType: z.string().trim().min(1).max(50),
  vehicleCodes: z.array(z.string().max(20)).max(100).default([]),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  discountAmountEur: nullableMoneySchema,
  minimumDays: z.number().int().min(1).nullable().optional(),
  minimumAdvanceDays: z.number().int().min(0).nullable().optional(),
  stackable: z.boolean().default(false),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
}).strict();

const faqSchema = z.object({
  key: z.string().trim().min(1).max(100),
  question: localizedTextSchema,
  answer: localizedTextSchema,
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
}).strict();

const pageSchema = z.object({
  slug: z.string().trim().min(1).max(100),
  title: localizedTextSchema,
  body: localizedTextSchema,
  seoTitle: localizedTextSchema.optional(),
  seoDescription: localizedTextSchema.optional(),
  isPublished: z.boolean().default(false),
}).strict();

const reviewSchema = z.object({
  source: z.string().trim().min(1).max(100),
  author: z.string().trim().min(1).max(200),
  rating: z.number().min(0).max(5).nullable().optional(),
  text: localizedTextSchema,
  reviewDate: z.coerce.date().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().default(true),
}).strict();

const homeSlideSchema = z.object({
  key: z.string().trim().min(1).max(100),
  title: localizedTextSchema,
  subtitle: localizedTextSchema.optional(),
  imageUrl: z.string().url().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
}).strict();

const homeBannerSchema = z.object({
  key: z.string().trim().min(1).max(100),
  title: localizedTextSchema,
  text: localizedTextSchema.optional(),
  imageUrl: z.string().url().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
}).strict();

const settingSchema = z.object({
  key: z.string().trim().min(1).max(200),
  value: jsonInputSchema,
}).strict();

function registerModelCrud<
  Create extends object,
  Update extends object,
  Item extends { id: string },
>(
  router: Router,
  path: string,
  resource: string,
  createSchema: z.ZodType<Create>,
  updateSchema: z.ZodType<Update>,
  model: {
    list: (skip: number, take: number) => Promise<[Item[], number]>;
    get: (id: string) => Promise<Item | null>;
    create: (data: Create) => Promise<Item>;
    update: (id: string, data: Update) => Promise<Item>;
    remove: (id: string) => Promise<unknown>;
  },
): void {
  registerCrud(router, path, resource, createSchema, updateSchema, {
    list: async (skip, take) => {
      const [items, total] = await model.list(skip, take);
      return { items, total };
    },
    get: (id) => model.get(id),
    create: async (data) => ({ id: (await model.create(data)).id }),
    update: async (id, data) => ({ id: (await model.update(id, data)).id }),
    remove: async (id) => { await model.remove(id); },
  });
}

const contentRouter = Router();
contentRouter.use(requireAdmin, requireRoles("ADMIN"));

registerModelCrud(contentRouter, "/vehicles", "vehicle", vehicleSchema, vehicleSchema.partial(), {
  list: async (skip, take) => Promise.all([
    prisma.vehicle.findMany({ skip, take, orderBy: [{ displayOrder: "asc" }, { code: "asc" }] }),
    prisma.vehicle.count(),
  ]),
  get: (id) => prisma.vehicle.findUnique({ where: { id } }),
  create: (data) => prisma.vehicle.create({ data }),
  update: (id, data) => prisma.vehicle.update({ where: { id }, data }),
  remove: async (id) => prisma.vehicle.delete({ where: { id } }),
});

registerModelCrud(contentRouter, "/price-plans", "price-plan", pricePlanSchema, pricePlanSchema.partial(), {
  list: async (skip, take) => Promise.all([
    prisma.pricePlan.findMany({ skip, take, orderBy: [{ vehicleId: "asc" }, { seasonId: "asc" }, { minDays: "asc" }], include: { vehicle: true, season: true } }),
    prisma.pricePlan.count(),
  ]),
  get: (id) => prisma.pricePlan.findUnique({ where: { id } }),
  create: (data) => prisma.pricePlan.create({ data }),
  update: (id, data) => prisma.pricePlan.update({ where: { id }, data }),
  remove: async (id) => prisma.pricePlan.delete({ where: { id } }),
});

registerModelCrud(contentRouter, "/seasons", "season", seasonSchema, seasonUpdateSchema, {
  list: async (skip, take) => Promise.all([
    prisma.season.findMany({ skip, take, orderBy: [{ startsOn: "desc" }, { id: "asc" }] }),
    prisma.season.count(),
  ]),
  get: (id) => prisma.season.findUnique({ where: { id } }),
  create: (data) => prisma.season.create({ data }),
  update: (id, data) => prisma.season.update({ where: { id }, data }),
  remove: async (id) => prisma.season.delete({ where: { id } }),
});

registerModelCrud(contentRouter, "/extras", "extra", extraSchema, extraSchema.partial(), {
  list: async (skip, take) => Promise.all([
    prisma.extra.findMany({ skip, take, orderBy: [{ displayOrder: "asc" }, { code: "asc" }] }),
    prisma.extra.count(),
  ]),
  get: (id) => prisma.extra.findUnique({ where: { id } }),
  create: (data) => prisma.extra.create({ data }),
  update: (id, data) => prisma.extra.update({ where: { id }, data }),
  remove: async (id) => prisma.extra.delete({ where: { id } }),
});

registerModelCrud(contentRouter, "/locations", "location", locationSchema, locationSchema.partial(), {
  list: async (skip, take) => Promise.all([
    prisma.location.findMany({ skip, take, orderBy: [{ displayOrder: "asc" }, { slug: "asc" }] }),
    prisma.location.count(),
  ]),
  get: (id) => prisma.location.findUnique({ where: { id } }),
  create: (data) => prisma.location.create({ data }),
  update: (id, data) => prisma.location.update({ where: { id }, data }),
  remove: async (id) => prisma.location.delete({ where: { id } }),
});

registerModelCrud(contentRouter, "/offers", "offer", offerSchema, offerSchema.partial(), {
  list: async (skip, take) => Promise.all([
    prisma.offer.findMany({ skip, take, orderBy: [{ priority: "desc" }, { createdAt: "desc" }] }),
    prisma.offer.count(),
  ]),
  get: (id) => prisma.offer.findUnique({ where: { id } }),
  create: (data) => prisma.offer.create({ data }),
  update: (id, data) => prisma.offer.update({ where: { id }, data }),
  remove: async (id) => prisma.offer.delete({ where: { id } }),
});

registerModelCrud(contentRouter, "/faq", "faq", faqSchema, faqSchema.partial(), {
  list: async (skip, take) => Promise.all([
    prisma.faq.findMany({ skip, take, orderBy: [{ displayOrder: "asc" }, { key: "asc" }] }),
    prisma.faq.count(),
  ]),
  get: (id) => prisma.faq.findUnique({ where: { id } }),
  create: (data) => prisma.faq.create({ data }),
  update: (id, data) => prisma.faq.update({ where: { id }, data }),
  remove: async (id) => prisma.faq.delete({ where: { id } }),
});

registerModelCrud(contentRouter, "/pages", "content-page", pageSchema, pageSchema.partial(), {
  list: async (skip, take) => Promise.all([
    prisma.contentPage.findMany({ skip, take, orderBy: [{ updatedAt: "desc" }, { slug: "asc" }] }),
    prisma.contentPage.count(),
  ]),
  get: (id) => prisma.contentPage.findUnique({ where: { id } }),
  create: (data) => prisma.contentPage.create({ data }),
  update: (id, data) => prisma.contentPage.update({ where: { id }, data }),
  remove: async (id) => prisma.contentPage.delete({ where: { id } }),
});

registerModelCrud(contentRouter, "/reviews", "review", reviewSchema, reviewSchema.partial(), {
  list: async (skip, take) => Promise.all([
    prisma.review.findMany({ skip, take, orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }] }),
    prisma.review.count(),
  ]),
  get: (id) => prisma.review.findUnique({ where: { id } }),
  create: (data) => prisma.review.create({ data }),
  update: (id, data) => prisma.review.update({ where: { id }, data }),
  remove: async (id) => prisma.review.delete({ where: { id } }),
});

registerModelCrud(contentRouter, "/home-content/sliders", "home-slide", homeSlideSchema, homeSlideSchema.partial(), {
  list: async (skip, take) => Promise.all([
    prisma.homeSlide.findMany({ skip, take, orderBy: [{ displayOrder: "asc" }, { key: "asc" }] }),
    prisma.homeSlide.count(),
  ]),
  get: (id) => prisma.homeSlide.findUnique({ where: { id } }),
  create: (data) => prisma.homeSlide.create({ data }),
  update: (id, data) => prisma.homeSlide.update({ where: { id }, data }),
  remove: async (id) => prisma.homeSlide.delete({ where: { id } }),
});

registerModelCrud(contentRouter, "/home-content/banners", "home-banner", homeBannerSchema, homeBannerSchema.partial(), {
  list: async (skip, take) => Promise.all([
    prisma.homeBanner.findMany({ skip, take, orderBy: [{ displayOrder: "asc" }, { key: "asc" }] }),
    prisma.homeBanner.count(),
  ]),
  get: (id) => prisma.homeBanner.findUnique({ where: { id } }),
  create: (data) => prisma.homeBanner.create({ data }),
  update: (id, data) => prisma.homeBanner.update({ where: { id }, data }),
  remove: async (id) => prisma.homeBanner.delete({ where: { id } }),
});

registerCrud(contentRouter, "/settings", "setting", settingSchema, settingSchema.partial(), {
  list: async (skip, take) => {
    const [items, total] = await Promise.all([
      prisma.setting.findMany({ skip, take, orderBy: { key: "asc" } }),
      prisma.setting.count(),
    ]);
    return { items, total };
  },
  get: (key) => prisma.setting.findUnique({ where: { key } }),
  create: async (data) => {
    const item = await prisma.setting.create({ data });
    return { id: item.key };
  },
  update: async (key, data) => {
    const item = await prisma.setting.update({ where: { key }, data });
    return { id: item.key };
  },
  remove: async (key) => { await prisma.setting.delete({ where: { key } }); },
});

export { contentRouter };
