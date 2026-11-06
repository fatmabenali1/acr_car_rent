import assert from "node:assert/strict";
import test from "node:test";
import { calculateAvailability, periodsOverlap } from "../src/services/availability";

test("availability overlap includes partial intersections and excludes adjacent periods", () => {
  const requestedStart = new Date("2027-01-05T00:00:00.000Z");
  const requestedEnd = new Date("2027-01-10T00:00:00.000Z");

  assert.equal(
    periodsOverlap(
      new Date("2027-01-09T00:00:00.000Z"),
      new Date("2027-01-12T00:00:00.000Z"),
      requestedStart,
      requestedEnd,
    ),
    true,
  );
  assert.equal(
    periodsOverlap(
      new Date("2027-01-10T00:00:00.000Z"),
      new Date("2027-01-12T00:00:00.000Z"),
      requestedStart,
      requestedEnd,
    ),
    false,
  );
});

test("manual blocks and zero category stock both report unavailable", () => {
  assert.deepEqual(
    calculateAvailability({
      stock: 5,
      occupiedUnits: 0,
      blocked: true,
      visibility: "LEVEL",
      lowStockThreshold: 2,
    }),
    { available: false, availabilityLevel: "none" },
  );
  assert.deepEqual(
    calculateAvailability({
      stock: 0,
      occupiedUnits: 0,
      blocked: false,
      visibility: "EXACT",
      lowStockThreshold: 2,
    }),
    { available: false, remainingUnits: 0 },
  );
});
