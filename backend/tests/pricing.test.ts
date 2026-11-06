import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../src/middleware/errors";
import {
  calculateBillableDaysFromDuration,
  calculateOfferDiscountCents,
} from "../src/services/pricing";
import { validateDriverForVehicle, type DriverEligibility } from "../src/services/rental-rules";
import { createQuoteReference } from "../src/services/quote-reference";

const hour = 60 * 60 * 1000;

test("rental pricing charges at least one day and includes the three-hour grace period", () => {
  assert.equal(calculateBillableDaysFromDuration(hour), 1);
  assert.equal(calculateBillableDaysFromDuration(24 * hour), 1);
  assert.equal(calculateBillableDaysFromDuration(27 * hour), 1);
  assert.equal(calculateBillableDaysFromDuration(27 * hour + 1), 2);
});

test("rental days round up after applying the return grace period", () => {
  assert.equal(calculateBillableDaysFromDuration(51 * hour), 2);
  assert.equal(calculateBillableDaysFromDuration(51 * hour + 1), 3);
  assert.equal(calculateBillableDaysFromDuration(72 * hour), 3);
  assert.equal(calculateBillableDaysFromDuration(27 * hour + 1, 0), 2);
});

test("rental duration must be positive", () => {
  assert.throws(
    () => calculateBillableDaysFromDuration(0),
    (error: unknown) => error instanceof AppError && error.code === "INVALID_RENTAL_DATES",
  );
  assert.throws(
    () => calculateBillableDaysFromDuration(-hour),
    (error: unknown) => error instanceof AppError && error.code === "INVALID_RENTAL_DATES",
  );
  assert.throws(
    () => calculateBillableDaysFromDuration(hour, -1),
    (error: unknown) => error instanceof AppError && error.code === "PRICING_CONFIGURATION_ERROR",
  );
});

test("offers discount the vehicle subtotal in cents and cannot exceed it", () => {
  assert.equal(calculateOfferDiscountCents(10_000, 10, null), 1_000);
  assert.equal(calculateOfferDiscountCents(10_000, null, 150), 10_000);
  assert.equal(calculateOfferDiscountCents(10_000, 10, 5), null);
  assert.equal(calculateOfferDiscountCents(10_000, 101, null), null);
  assert.equal(calculateOfferDiscountCents(-1, 10, null), null);
});

const policy = {
  standardMinimumDriverAge: 23,
  otherMinimumDriverAge: 25,
  maximumDriverAge: 75,
  minimumLicenceYears: 1,
  internationalPermitExemptCountries: ["GR", "US", "CA", "AU"],
};

const greekDriver: DriverEligibility = {
  age: 23,
  licenceYears: 1,
  countryCode: "GR",
  hasInternationalPermit: false,
};

test("driver age and licence rules differ for small/medium and other vehicle categories", () => {
  assert.doesNotThrow(() => validateDriverForVehicle(greekDriver, "B", 0, policy));
  assert.throws(
    () => validateDriverForVehicle(greekDriver, "G1", 0, policy),
    (error: unknown) => error instanceof AppError && error.code === "DRIVER_BELOW_MINIMUM_AGE",
  );
  assert.throws(
    () => validateDriverForVehicle({ ...greekDriver, age: 76 }, "B", 0, policy),
    (error: unknown) => error instanceof AppError && error.code === "DRIVER_AGE_REQUIRES_AGENCY_CONTACT",
  );
  assert.throws(
    () => validateDriverForVehicle({ ...greekDriver, licenceYears: 0 }, "B", 0, policy),
    (error: unknown) => error instanceof AppError && error.code === "DRIVING_LICENCE_TOO_RECENT",
  );
});

test("international permits are required outside the configured exempt countries", () => {
  assert.doesNotThrow(() => validateDriverForVehicle({ ...greekDriver, countryCode: "US" }, "B", 0, policy));
  assert.doesNotThrow(() => validateDriverForVehicle({
    ...greekDriver,
    countryCode: "JP",
    hasInternationalPermit: true,
  }, "B", 0, policy));
  assert.throws(
    () => validateDriverForVehicle({ ...greekDriver, countryCode: "JP" }, "B", 0, policy),
    (error: unknown) => error instanceof AppError && error.code === "INTERNATIONAL_PERMIT_REQUIRED",
  );
});

test("quote references use four digits followed by two uppercase letters", () => {
  for (let index = 0; index < 100; index += 1) {
    assert.match(createQuoteReference(), /^\d{4}[A-Z]{2}$/);
  }
});
