import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { CookieConsentChoice, FuelType, Transmission, VehicleGroup } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../db";
import { AppError } from "../middleware/errors";

const publicRouter = Router();
const cookieConsentName = "acr_cookie_consent";
const cookieConsentLifetimeMs = 365 * 24 * 60 * 60 * 1000;
const cookieConsentChoiceMap = {
  accepted: CookieConsentChoice.ACCEPTED,
  refused: CookieConsentChoice.REFUSED,
  customized: CookieConsentChoice.CUSTOMIZED,
} as const;

function getCookieConsentToken(cookieHeader: string | undefined): string | null {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieConsentName}=`));
  const token = cookie?.slice(cookieConsentName.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function hashCookieConsentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const languageSchema = z.enum(["en", "el"]).default("en");
const vehicleGroupSchema = z.enum([
  "standard",
  "automatic",
  "mini-vans",
  "mini-van-automatic",
  "suv",
  "luxury",
]);
const fuelSchema = z.enum(["petrol", "diesel", "petrol-or-diesel", "electric", "hybrid"]);
const groupMap = {
  standard: VehicleGroup.STANDARD,
  automatic: VehicleGroup.AUTOMATIC,
  "mini-vans": VehicleGroup.MINI_VANS,
  "mini-van-automatic": VehicleGroup.MINI_VAN_AUTOMATIC,
  suv: VehicleGroup.SUV,
  luxury: VehicleGroup.LUXURY,
} as const;
const transmissionMap = {
  manual: Transmission.MANUAL,
  automatic: Transmission.AUTOMATIC,
} as const;
const fuelMap = {
  petrol: FuelType.PETROL,
  diesel: FuelType.DIESEL,
  "petrol-or-diesel": FuelType.PETROL_OR_DIESEL,
  electric: FuelType.ELECTRIC,
  hybrid: FuelType.HYBRID,
} as const;
const groupOptions = [
  { slug: "standard", group: VehicleGroup.STANDARD, name: { en: "Standard", el: "Μικρά και μεσαία" } },
  { slug: "automatic", group: VehicleGroup.AUTOMATIC, name: { en: "Automatic", el: "Αυτόματα" } },
  { slug: "mini-vans", group: VehicleGroup.MINI_VANS, name: { en: "Manual minivans", el: "Μίνι βαν με χειροκίνητο κιβώτιο" } },
  { slug: "mini-van-automatic", group: VehicleGroup.MINI_VAN_AUTOMATIC, name: { en: "Automatic minivans", el: "Μίνι βαν με αυτόματο κιβώτιο" } },
  { slug: "suv", group: VehicleGroup.SUV, name: { en: "SUV", el: "SUV" } },
  { slug: "luxury", group: VehicleGroup.LUXURY, name: { en: "Luxury", el: "Πολυτελή" } },
] as const;
const reviewSources = ["google", "tripadvisor", "trustpilot", "facebook"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function localize(value: unknown, lang: "en" | "el"): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => localize(item, lang));
  }
  if (isRecord(value)) {
    if ("en" in value && "el" in value) {
      return localize(value[lang], lang);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, localize(item, lang)]),
    );
  }
  return value;
}

function getLanguage(query: unknown): "en" | "el" {
  return languageSchema.parse(isRecord(query) ? query.lang : undefined);
}

function success(
  response: import("express").Response,
  data: unknown,
  lang: "en" | "el",
  meta: Record<string, unknown> = {},
): void {
  response.json({
    success: true,
    data: localize(data, lang),
    meta: { lang, ...meta },
  });
}

const vehicleSelect = {
  id: true,
  code: true,
  slug: true,
  name: true,
  description: true,
  exampleModels: true,
  group: true,
  transmission: true,
  seats: true,
  doors: true,
  luggageMinLitres: true,
  luggageMaxLitres: true,
  fuel: true,
  airbag: true,
  abs: true,
  airConditioning: true,
  cdPlayer: true,
  imageUrl: true,
  cdwExcessEur: true,
  minimumDriverAge: true,
  displayOrder: true,
} as const;

publicRouter.get("/cookie-consent", async (request, response) => {
  const token = getCookieConsentToken(request.headers.cookie);
  if (!token) {
    success(response, null, "en");
    return;
  }

  const consent = await prisma.cookieConsent.findFirst({
    where: { id: hashCookieConsentToken(token), expiresAt: { gt: new Date() } },
    select: { choice: true, updatedAt: true },
  });
  success(response, consent ? {
    choice: consent.choice.toLowerCase(),
    updatedAt: consent.updatedAt,
  } : null, "en");
});

publicRouter.put("/cookie-consent", async (request, response) => {
  const { choice } = z.object({
    choice: z.enum(["accepted", "refused", "customized"]),
  }).parse(request.body);
  const token = getCookieConsentToken(request.headers.cookie) ?? randomBytes(32).toString("hex");
  const tokenHash = hashCookieConsentToken(token);
  const expiresAt = new Date(Date.now() + cookieConsentLifetimeMs);
  const consentChoice = cookieConsentChoiceMap[choice];
  const consent = await prisma.cookieConsent.upsert({
    where: { id: tokenHash },
    update: { choice: consentChoice, expiresAt },
    create: {
      id: tokenHash,
      choice: consentChoice,
      expiresAt,
    },
    select: { choice: true, updatedAt: true },
  });

  response.cookie(cookieConsentName, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookieConsentLifetimeMs,
  });
  success(response, {
    choice: consent.choice.toLowerCase(),
    updatedAt: consent.updatedAt,
  }, "en");
});

publicRouter.get("/home", async (request, response) => {
  const lang = getLanguage(request.query);
  const [slides, banners, argumentsSetting] = await Promise.all([
    prisma.homeSlide.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, title: true, subtitle: true, imageUrl: true, linkUrl: true },
    }),
    prisma.homeBanner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, title: true, text: true, imageUrl: true, linkUrl: true },
    }),
    prisma.setting.findUnique({ where: { key: "home-arguments" }, select: { value: true } }),
  ]);
  success(response, { slides, banners, arguments: argumentsSetting?.value ?? [] }, lang);
});

publicRouter.get("/vehicles", async (request, response) => {
  const lang = getLanguage(request.query);
  const querySchema = z.object({
    group: vehicleGroupSchema.optional(),
    transmission: z.enum(["manual", "automatic"]).optional(),
    seats: z.coerce.number().int().min(1).max(100).optional(),
    fuel: fuelSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
  });
  const query = querySchema.parse(request.query);
  const where = {
    isActive: true,
    ...(query.group ? { group: groupMap[query.group] } : {}),
    ...(query.transmission ? { transmission: transmissionMap[query.transmission] } : {}),
    ...(query.seats ? { seats: query.seats } : {}),
    ...(query.fuel ? { fuel: fuelMap[query.fuel] } : {}),
  };
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      select: vehicleSelect,
      orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.vehicle.count({ where }),
  ]);
  success(response, vehicles, lang, {
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  });
});

publicRouter.get("/vehicles/:slug", async (request, response) => {
  const lang = getLanguage(request.query);
  const { slug } = z.object({ slug: z.string().min(1).max(100) }).parse(request.params);
  const vehicle = await prisma.vehicle.findFirst({
    where: { slug, isActive: true },
    select: vehicleSelect,
  });
  if (!vehicle) {
    throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle category not found");
  }
  success(response, vehicle, lang);
});

publicRouter.get("/vehicle-groups", async (request, response) => {
  const lang = getLanguage(request.query);
  const counts = await prisma.vehicle.groupBy({
    by: ["group"],
    where: { isActive: true },
    _count: { _all: true },
  });
  const countByGroup = new Map(counts.map((entry) => [entry.group, entry._count._all]));
  const groups = groupOptions.map(({ slug, group, name }) => ({
    slug,
    name,
    count: countByGroup.get(group) ?? 0,
  }));
  success(response, groups, lang);
});

publicRouter.get("/locations", async (request, response) => {
  const lang = getLanguage(request.query);
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true, slug: true, name: true, description: true, address: true,
      latitude: true, longitude: true, phone: true, isAirport: true, isFree: true,
    },
  });
  success(response, locations, lang);
});

publicRouter.get("/locations/:slug", async (request, response) => {
  const lang = getLanguage(request.query);
  const { slug } = z.object({ slug: z.string().min(1).max(100) }).parse(request.params);
  const location = await prisma.location.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true, slug: true, name: true, description: true, address: true,
      latitude: true, longitude: true, phone: true, isAirport: true, isFree: true,
    },
  });
  if (!location) {
    throw new AppError(404, "LOCATION_NOT_FOUND", "Location not found");
  }
  success(response, location, lang);
});

publicRouter.get("/extras", async (request, response) => {
  const lang = getLanguage(request.query);
  const extras = await prisma.extra.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true, code: true, slug: true, name: true, description: true, unitPriceEur: true,
      priceUnit: true, requiresChildAge: true, requiresChildWeight: true,
    },
  });
  success(response, extras, lang);
});

publicRouter.get("/rental-info", async (request, response) => {
  const lang = getLanguage(request.query);
  const setting = await prisma.setting.findUnique({ where: { key: "rental-info" }, select: { value: true } });
  success(response, setting?.value ?? {}, lang);
});

publicRouter.get("/faq", async (request, response) => {
  const lang = getLanguage(request.query);
  const faq = await prisma.faq.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, key: true, question: true, answer: true, displayOrder: true },
  });
  success(response, faq, lang);
});

publicRouter.get("/offers", async (request, response) => {
  const lang = getLanguage(request.query);
  const now = new Date();
  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, name: true, description: true, offerType: true,
      vehicleCodes: true, startsAt: true, endsAt: true,
    },
  });
  success(response, offers, lang);
});

publicRouter.get("/reviews", async (request, response) => {
  const lang = getLanguage(request.query);
  const query = z.object({ source: z.enum(reviewSources).optional() }).parse(request.query);
  const reviews = await prisma.review.findMany({
    where: { isActive: true, ...(query.source ? { source: query.source } : {}) },
    orderBy: [{ reviewDate: "desc" }, { createdAt: "desc" }],
    select: { id: true, source: true, author: true, rating: true, text: true, reviewDate: true, imageUrl: true },
  });
  success(response, reviews, lang);
});

publicRouter.get("/pages/:slug", async (request, response) => {
  const lang = getLanguage(request.query);
  const { slug } = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/).max(150) }).parse(request.params);
  const page = await prisma.contentPage.findFirst({
    where: { slug, isPublished: true },
    select: { id: true, slug: true, title: true, body: true, seoTitle: true, seoDescription: true },
  });
  if (!page) {
    throw new AppError(404, "PAGE_NOT_FOUND", "Page not found");
  }
  success(response, page, lang);
});

publicRouter.get("/contact-info", async (request, response) => {
  const lang = getLanguage(request.query);
  const setting = await prisma.setting.findUnique({ where: { key: "company-info" }, select: { value: true } });
  const companyInfo = isRecord(setting?.value) ? setting.value : {};
  success(response, {
    ...companyInfo,
    email: env.AGENCY_EMAIL,
    phones: [env.AGENCY_PHONE, "+30 210 6624887"],
  }, lang);
});

export { publicRouter };
