import { DEPOSIT_MIN, DEPOSIT_PERCENT, vehiclePricing } from "../config/vehiclePricing";

const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_PERIOD_MS = 3 * 60 * 60 * 1000;

export type QuoteEstimate = {
  days: number;
  dailyRate: number;
  total: number;
  deposit: number;
  currency: "EUR";
};

export function computeQuote(
  carId: string,
  pickupAt: Date | string,
  returnAt: Date | string,
): QuoteEstimate {
  const dailyRate = vehiclePricing[carId.toUpperCase()];
  if (dailyRate === undefined) {
    throw new RangeError("Unknown vehicle category");
  }

  const pickup = new Date(pickupAt).getTime();
  const dropoff = new Date(returnAt).getTime();
  if (!Number.isFinite(pickup) || !Number.isFinite(dropoff) || dropoff <= pickup) {
    throw new RangeError("Return date must be after pick-up");
  }

  const billableDuration = Math.max(0, dropoff - pickup - GRACE_PERIOD_MS);
  const days = Math.max(1, Math.ceil(billableDuration / DAY_MS));
  const total = dailyRate * days;
  const deposit = Math.ceil(Math.max(DEPOSIT_MIN, total * DEPOSIT_PERCENT / 100));

  return { days, dailyRate, total, deposit, currency: "EUR" };
}
