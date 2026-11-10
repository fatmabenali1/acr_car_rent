import assert from "node:assert/strict";
import test from "node:test";
import { computeQuote } from "../src/services/compute-quote";

const start = new Date("2027-01-01T10:00:00.000Z");
const plusHours = (hours: number) => new Date(start.getTime() + hours * 60 * 60 * 1000);

test("computeQuote applies the three-hour grace period and bills at least one day", () => {
  assert.equal(computeQuote("D1", start, plusHours(3)).days, 1);
  assert.equal(computeQuote("D1", start, plusHours(27)).days, 1);
  assert.equal(computeQuote("D1", start, plusHours(27.01)).days, 2);
  assert.equal(computeQuote("E", start, plusHours(48)).days, 2);
});

test("computeQuote applies a EUR 50 minimum deposit and rounds the percentage up", () => {
  assert.deepEqual(computeQuote("D1", start, plusHours(24)), {
    days: 1,
    dailyRate: 25,
    total: 25,
    deposit: 50,
    currency: "EUR",
  });
  const estimate = computeQuote("G", start, plusHours(9 * 24));
  assert.equal(estimate.total, 585);
  assert.equal(estimate.deposit, 59);
});

test("computeQuote rejects invalid duration and unconfigured vehicle categories", () => {
  assert.throws(() => computeQuote("B", start, plusHours(24)), /Unknown vehicle category/);
  assert.throws(() => computeQuote("D1", start, start), /Return date must be after pick-up/);
  assert.throws(() => computeQuote("D1", "invalid", plusHours(24)), /Return date must be after pick-up/);
});
