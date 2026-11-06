import type { Offer, PricePlan, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { AppError } from "../middleware/errors";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_GRACE_HOURS = 3;
const DEFAULT_MINIMUM_DEPOSIT_EUR = 50;

export type PricingRequest = {
  vehicleSlug: string;
  pickupAt: Date;
  returnAt: Date;
  pickupLocationSlug: string;
  returnLocationSlug: string;
  extras: Array<{
    extraId: string;
    quantity: number;
    childAge?: number;
    childWeightKg?: number;
  }>;
};

export type PricingWarning = {
  code: string;
  message: { en: string; el: string };
};

export type PricingLine = {
  type: "vehicle_day" | "extra" | "delivery" | "night_fee" | "discount";
  description: { en: string; el: string };
  quantity: number;
  unitPriceEur: number | null;
  amountEur: number | null;
  minimumAmountEur?: number;
};

type PlanWithSeason = Prisma.PricePlanGetPayload<{
  include: { season: { select: { id: true; name: true; startsOn: true; endsOn: true } } };
}>;

type PricingOffer = Pick<
  Offer,
  | "id"
  | "name"
  | "discountPercent"
  | "discountAmountEur"
  | "minimumDays"
  | "minimumAdvanceDays"
  | "stackable"
  | "priority"
>;

export type PricingEstimate = {
  currency: "EUR";
  rentalDays: number;
  mileage: { type: "unlimited" } | { type: "limited"; kilometresPerDay: number };
  lines: PricingLine[];
  included: { en: string[]; el: string[] };
  subtotalEur: number | null;
  totalEur: number | null;
  suggestedDepositEur: { min: number; max: number } | null;
  warnings: PricingWarning[];
};

export function calculateBillableDaysFromDuration(
  durationMs: number,
  graceHours = DEFAULT_GRACE_HOURS,
): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new AppError(400, "INVALID_RENTAL_DATES", "Return date must be after pickup date");
  }
  if (!Number.isFinite(graceHours) || graceHours < 0) {
    throw new AppError(500, "PRICING_CONFIGURATION_ERROR", "Rental grace period is invalid");
  }
  const billedMs = Math.max(0, durationMs - graceHours * 60 * 60 * 1000);
  return Math.max(1, Math.ceil(billedMs / DAY_MS));
}

export function calculateOfferDiscountCents(
  remainingCents: number,
  discountPercent: number | null,
  discountAmountEur: number | null,
): number | null {
  if (!Number.isInteger(remainingCents) || remainingCents < 0) {
    return null;
  }
  if (discountPercent !== null && discountAmountEur !== null) {
    return null;
  }
  if (discountPercent !== null) {
    if (discountPercent < 0 || discountPercent > 100) {
      return null;
    }
    return Math.min(remainingCents, Math.round((remainingCents * discountPercent) / 100));
  }
  if (discountAmountEur !== null) {
    if (!Number.isFinite(discountAmountEur) || discountAmountEur < 0) {
      return null;
    }
    return Math.min(remainingCents, cents(discountAmountEur));
  }
  return null;
}

function cents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

function eur(amountInCents: number): number {
  return Number((amountInCents / 100).toFixed(2));
}

function withinDuration(plan: PricePlan, days: number): boolean {
  return plan.minDays <= days && (plan.maxDays === null || plan.maxDays >= days);
}

function seasonContains(plan: PlanWithSeason, day: Date): boolean {
  return plan.season.startsOn <= day && plan.season.endsOn >= day;
}

function warning(code: string, en: string, el: string): PricingWarning {
  return { code, message: { en, el } };
}

function isRecord(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonNumber(value: Prisma.JsonValue | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function bilingualText(value: unknown, fallback: string): { en: string; el: string } {
  if (isPlainRecord(value)) {
    return {
      en: typeof value.en === "string" ? value.en : fallback,
      el: typeof value.el === "string" ? value.el : fallback,
    };
  }
  return { en: fallback, el: fallback };
}

function minutesOfDayInAthens(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return (
    Number(parts.find((part) => part.type === "hour")?.value ?? "0") * 60 +
    Number(parts.find((part) => part.type === "minute")?.value ?? "0")
  );
}

function configuredMinutes(value: unknown, fallback: string): number {
  const time = typeof value === "string" ? value : fallback;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new AppError(500, "PRICING_CONFIGURATION_ERROR", "Configured rental location hours are invalid");
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function isWithinWindow(date: Date, window: Prisma.JsonObject, defaultFrom: string, defaultUntil: string): boolean {
  const from = configuredMinutes(window.from, defaultFrom);
  const until = configuredMinutes(window.until, defaultUntil);
  const current = minutesOfDayInAthens(date);
  return from <= until ? current >= from && current < until : current >= from || current < until;
}

function eligibleOffer(offer: PricingOffer, days: number, advanceDays: number): boolean {
  return (
    (offer.minimumDays === null || days >= offer.minimumDays) &&
    (offer.minimumAdvanceDays === null || advanceDays >= offer.minimumAdvanceDays)
  );
}

export async function estimateRental(request: PricingRequest): Promise<PricingEstimate> {
  const [vehicle, pickupLocation, returnLocation, rentalInfo, rentalPolicySetting, pricePlans, extras] = await Promise.all([
    prisma.vehicle.findFirst({
      where: { slug: request.vehicleSlug, isActive: true },
      select: { id: true, code: true },
    }),
    prisma.location.findFirst({
      where: { slug: request.pickupLocationSlug, isActive: true },
      select: { id: true, slug: true, isFree: true, isAirport: true },
    }),
    prisma.location.findFirst({
      where: { slug: request.returnLocationSlug, isActive: true },
      select: { id: true, slug: true, isFree: true, isAirport: true },
    }),
    prisma.setting.findUnique({ where: { key: "rental-info" }, select: { value: true } }),
    prisma.setting.findUnique({ where: { key: "rental-policy" }, select: { value: true } }),
    prisma.pricePlan.findMany({
      where: {
        vehicle: { slug: request.vehicleSlug, isActive: true },
        season: { isActive: true },
      },
      include: {
        season: { select: { id: true, name: true, startsOn: true, endsOn: true } },
      },
    }),
    request.extras.length
      ? prisma.extra.findMany({
          where: { id: { in: request.extras.map((item) => item.extraId) }, isActive: true },
          select: {
            id: true,
            name: true,
            unitPriceEur: true,
            priceUnit: true,
            requiresChildAge: true,
            requiresChildWeight: true,
          },
        })
      : Promise.resolve([]),
  ]);

  if (!vehicle) {
    throw new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle category not found");
  }
  if (!pickupLocation || !returnLocation) {
    throw new AppError(404, "LOCATION_NOT_FOUND", "Pickup or return location not found");
  }

  const configurablePolicy = isRecord(rentalPolicySetting?.value) ? rentalPolicySetting.value : {};
  const graceHours = jsonNumber(configurablePolicy.extraDayGraceHours) ?? DEFAULT_GRACE_HOURS;
  const minimumDepositEur = jsonNumber(configurablePolicy.minDepositEur) ?? DEFAULT_MINIMUM_DEPOSIT_EUR;
  const depositSharePolicy = isRecord(configurablePolicy.depositSharePercent)
    ? configurablePolicy.depositSharePercent
    : {};
  const minimumDepositPercent = jsonNumber(depositSharePolicy.min) ?? 10;
  const maximumDepositPercent = jsonNumber(depositSharePolicy.max) ?? 15;
  if (
    minimumDepositPercent > maximumDepositPercent ||
    maximumDepositPercent > 100
  ) {
    throw new AppError(500, "PRICING_CONFIGURATION_ERROR", "Configured deposit percentage range is invalid");
  }
  const rentalDays = calculateBillableDaysFromDuration(
    request.returnAt.getTime() - request.pickupAt.getTime(),
    graceHours,
  );
  const rentalPolicy = isRecord(rentalInfo?.value) ? rentalInfo.value : {};
  const deliveryPolicy = isRecord(rentalPolicy.delivery) ? rentalPolicy.delivery : {};
  const airportNightWindow = isRecord(deliveryPolicy.airportNightFeeWindow)
    ? deliveryPolicy.airportNightFeeWindow
    : {};
  const otherLocationsWindow = isRecord(deliveryPolicy.otherLocationsWindow)
    ? deliveryPolicy.otherLocationsWindow
    : {};
  const minimumShortRentalDays = jsonNumber(deliveryPolicy.shortRentalDaysThreshold) ?? 5;

  if (
    rentalDays < minimumShortRentalDays &&
    (!pickupLocation.isFree || !returnLocation.isFree)
  ) {
    throw new AppError(
      400,
      "LOCATION_NOT_ALLOWED_FOR_RENTAL_DURATION",
      "Rentals under 5 days must start and end at the airport or Koropi Metro Station",
    );
  }
  for (const { location, at } of [
    { location: pickupLocation, at: request.pickupAt },
    { location: returnLocation, at: request.returnAt },
  ]) {
    if (!location.isAirport && !location.isFree && !isWithinWindow(at, otherLocationsWindow, "07:00", "21:00")) {
      throw new AppError(
        400,
        "LOCATION_OUTSIDE_OPERATING_HOURS",
        "Non-airport locations are available from 07:00 to 21:00 Athens time",
      );
    }
  }

  const lines: PricingLine[] = [];
  const warnings: PricingWarning[] = [];
  let vehicleSubtotalCents = 0;
  let hasUnknownAmount = false;

  for (let dayIndex = 0; dayIndex < rentalDays; dayIndex += 1) {
    const billableDay = new Date(request.pickupAt.getTime() + dayIndex * DAY_MS);
    const matchingPlans = pricePlans.filter(
      (plan) => withinDuration(plan, rentalDays) && seasonContains(plan, billableDay),
    );
    const pricePlan = matchingPlans.length === 1 ? matchingPlans[0] : null;
    if (
      pricePlan === null ||
      pricePlan.dailyRateEur === null ||
      pricePlan.dailyRateEur.toNumber() < 0
    ) {
      hasUnknownAmount = true;
      const code = matchingPlans.length > 1 ? "AMBIGUOUS_PRICE_PLAN" : "PRICE_NOT_CONFIGURED";
      warnings.push(
        matchingPlans.length > 1
          ? warning(
              code,
              "More than one price plan applies to a rental day; ask the agency for a quote.",
              "Ισχύουν περισσότερα από ένα τιμολόγια για την ημέρα· ζητήστε προσφορά από το γραφείο.",
            )
          : warning(
              code,
              "A rate is not configured for every rental day; ask the agency for a quote.",
              "Δεν έχει οριστεί τιμή για κάθε ημέρα ενοικίασης· ζητήστε προσφορά από το γραφείο.",
            ),
      );
      lines.push({
        type: "vehicle_day",
        description: { en: `Vehicle rental — day ${dayIndex + 1}`, el: `Ενοικίαση οχήματος — ημέρα ${dayIndex + 1}` },
        quantity: 1,
        unitPriceEur: null,
        amountEur: null,
      });
      continue;
    }

    const amountCents = cents(pricePlan.dailyRateEur.toNumber());
    vehicleSubtotalCents += amountCents;
    const seasonName = bilingualText(pricePlan.season.name, "Season");
    lines.push({
      type: "vehicle_day",
      description: {
        en: `Vehicle rental — day ${dayIndex + 1} (${seasonName.en})`,
        el: `Ενοικίαση οχήματος — ημέρα ${dayIndex + 1} (${seasonName.el})`,
      },
      quantity: 1,
      unitPriceEur: eur(amountCents),
      amountEur: eur(amountCents),
    });
  }

  const now = new Date();
  const advanceDays = Math.max(0, Math.floor((request.pickupAt.getTime() - now.getTime()) / DAY_MS));
  const offers = hasUnknownAmount ? [] : await prisma.offer.findMany({
    where: {
      isActive: true,
      vehicleCodes: { has: vehicle.code },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: request.pickupAt } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: request.pickupAt } }] },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      discountPercent: true,
      discountAmountEur: true,
      minimumDays: true,
      minimumAdvanceDays: true,
      stackable: true,
      priority: true,
    },
  });
  const applicableOffers = offers.filter((offer) => eligibleOffer(offer, rentalDays, advanceDays));
  let offerBalanceCents = vehicleSubtotalCents;
  const selectedOffers: PricingOffer[] = [];
  for (const offer of applicableOffers) {
    if (selectedOffers.length > 0 && (!offer.stackable || !selectedOffers.every((item) => item.stackable))) {
      continue;
    }
    selectedOffers.push(offer);
    const discountCents = calculateOfferDiscountCents(
      offerBalanceCents,
      offer.discountPercent?.toNumber() ?? null,
      offer.discountAmountEur?.toNumber() ?? null,
    );
    if (discountCents === null) {
      hasUnknownAmount = true;
      warnings.push(
        warning(
          "OFFER_DISCOUNT_NOT_CONFIGURED",
          "An eligible offer has no valid discount configured; request a confirmed quote.",
          "Μια επιλέξιμη προσφορά δεν έχει έγκυρη έκπτωση· ζητήστε επιβεβαιωμένη προσφορά.",
        ),
      );
      continue;
    }
    if (discountCents > 0) {
      offerBalanceCents -= discountCents;
      const offerName = bilingualText(offer.name, "Offer");
      lines.push({
        type: "discount",
        description: {
          en: `Offer: ${offerName.en}`,
          el: `Προσφορά: ${offerName.el}`,
        },
        quantity: 1,
        unitPriceEur: -eur(discountCents),
        amountEur: -eur(discountCents),
      });
    }
  }
  vehicleSubtotalCents = offerBalanceCents;

  let extrasSubtotalCents = 0;
  const extraById = new Map(extras.map((extra) => [extra.id, extra]));
  for (const requestedExtra of request.extras) {
    const extra = extraById.get(requestedExtra.extraId);
    if (!extra) {
      throw new AppError(400, "INVALID_EXTRA", "An extra is unavailable or inactive");
    }
    if (extra.requiresChildAge && requestedExtra.childAge === undefined) {
      throw new AppError(400, "CHILD_AGE_REQUIRED", "Child age is required for this extra");
    }
    if (extra.requiresChildWeight && requestedExtra.childWeightKg === undefined) {
      throw new AppError(400, "CHILD_WEIGHT_REQUIRED", "Child weight is required for this extra");
    }

    const unitPriceCents = extra.unitPriceEur === null ? null : cents(extra.unitPriceEur.toNumber());
    const priceUnit = extra.priceUnit?.toUpperCase();
    const units =
      priceUnit === "PER_DAY"
        ? requestedExtra.quantity * rentalDays
        : priceUnit === "PER_RENTAL"
          ? requestedExtra.quantity
          : null;
    if (unitPriceCents === null || unitPriceCents < 0 || units === null) {
      hasUnknownAmount = true;
      warnings.push(
        warning(
          "EXTRA_PRICE_NOT_CONFIGURED",
          "An extra has no configured price or supported price unit.",
          "Ένα πρόσθετο δεν έχει ορισμένη τιμή ή έγκυρη μονάδα χρέωσης.",
        ),
      );
      lines.push({
        type: "extra",
        description: bilingualText(extra.name, "Optional extra"),
        quantity: requestedExtra.quantity,
        unitPriceEur: null,
        amountEur: null,
      });
      continue;
    }
    const amountCents = unitPriceCents * units;
    extrasSubtotalCents += amountCents;
    const extraName = bilingualText(extra.name, "Optional extra");
    lines.push({
      type: "extra",
      description: extraName,
      quantity: units,
      unitPriceEur: eur(unitPriceCents),
      amountEur: eur(amountCents),
    });
  }

  const otherDeliveryMinimum = jsonNumber(deliveryPolicy.otherAthensLocationsStartingFeeEur);
  for (const [location, label] of [
    [pickupLocation, "Pickup"],
    [returnLocation, "Return"],
  ] as const) {
    if (!location.isFree) {
      hasUnknownAmount = true;
      warnings.push(
        warning(
          "DELIVERY_FEE_NOT_CONFIGURED",
          "The exact delivery fee for this location is not configured; ask the agency for a quote.",
          "Η ακριβής χρέωση παράδοσης για αυτήν την τοποθεσία δεν έχει οριστεί· ζητήστε προσφορά από το γραφείο.",
        ),
      );
      lines.push({
        type: "delivery",
        description: {
          en: `${label} outside the free locations`,
          el: `${label === "Pickup" ? "Παραλαβή" : "Επιστροφή"} εκτός δωρεάν τοποθεσιών`,
        },
        quantity: 1,
        unitPriceEur: null,
        amountEur: null,
        ...(otherDeliveryMinimum === null ? {} : { minimumAmountEur: otherDeliveryMinimum }),
      });
    }
  }

  const nightFee = jsonNumber(deliveryPolicy.airportNightFeeEur);
  const nightWindows = [
    { location: pickupLocation, at: request.pickupAt },
    { location: returnLocation, at: request.returnAt },
  ].filter(({ location, at }) => {
    if (!location.isAirport) {
      return false;
    }
    return isWithinWindow(at, airportNightWindow, "23:00", "07:00");
  });
  if (nightWindows.length > 0) {
    if (nightFee === null) {
      hasUnknownAmount = true;
      warnings.push(
        warning(
          "AIRPORT_NIGHT_FEE_NOT_CONFIGURED",
          "An airport pickup or return is in the night-fee window, but the fee is not configured.",
          "Η παραλαβή ή επιστροφή στο αεροδρόμιο είναι σε νυχτερινό ωράριο, αλλά η χρέωση δεν έχει οριστεί.",
        ),
      );
      lines.push({
        type: "night_fee",
        description: { en: "Airport night service", el: "Νυχτερινή εξυπηρέτηση αεροδρομίου" },
        quantity: nightWindows.length,
        unitPriceEur: null,
        amountEur: null,
      });
    } else {
      const amountCents = cents(nightFee) * nightWindows.length;
      extrasSubtotalCents += amountCents;
      lines.push({
        type: "night_fee",
        description: { en: "Airport night service", el: "Νυχτερινή εξυπηρέτηση αεροδρομίου" },
        quantity: nightWindows.length,
        unitPriceEur: eur(cents(nightFee)),
        amountEur: eur(amountCents),
      });
    }
  }

  const subtotalCents = vehicleSubtotalCents + extrasSubtotalCents;
  const subtotalEur = hasUnknownAmount ? null : eur(subtotalCents);
  const minimumDepositCents = cents(minimumDepositEur);
  const deposit = subtotalEur === null ? null : {
    min: eur(Math.min(subtotalCents, Math.max(minimumDepositCents, Math.round(subtotalCents * minimumDepositPercent / 100)))),
    max: eur(Math.min(subtotalCents, Math.max(minimumDepositCents, Math.round(subtotalCents * maximumDepositPercent / 100)))),
  };

  const mileagePolicy = isRecord(rentalPolicy.mileage) ? rentalPolicy.mileage : {};
  const unlimitedFromDays = jsonNumber(mileagePolicy.unlimitedFromRentalDays) ?? 3;
  const dailyLimit = jsonNumber(mileagePolicy.dailyLimitForOneOrTwoDays) ?? 200;
  const inclusionsPolicy = Array.isArray(rentalPolicy.included) ? rentalPolicy.included : [];
  const included = {
    en: inclusionsPolicy
      .map((item) => (isRecord(item) ? item.en : item))
      .filter((item): item is string => typeof item === "string"),
    el: inclusionsPolicy
      .map((item) => (isRecord(item) ? item.el : item))
      .filter((item): item is string => typeof item === "string"),
  };

  return {
    currency: "EUR",
    rentalDays,
    mileage: rentalDays >= unlimitedFromDays ? { type: "unlimited" } : { type: "limited", kilometresPerDay: dailyLimit },
    lines,
    included,
    subtotalEur,
    totalEur: subtotalEur,
    suggestedDepositEur: deposit,
    warnings: [...new Map(warnings.map((item) => [item.code, item])).values()],
  };
}
