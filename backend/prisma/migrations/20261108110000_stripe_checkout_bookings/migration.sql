ALTER TYPE "PaymentStatus" ADD VALUE 'CREATED';
ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

ALTER TABLE "Location"
  ADD COLUMN "locationType" TEXT NOT NULL DEFAULT 'address',
  ADD COLUMN "afterHoursFeeCents" INTEGER,
  ADD COLUMN "deliveryFeeCents" INTEGER;

ALTER TABLE "Quote"
  ADD COLUMN "categorySlug" TEXT,
  ADD COLUMN "coupon" TEXT,
  ADD COLUMN "pickupLocationLabel" TEXT,
  ADD COLUMN "returnLocationLabel" TEXT;

ALTER TABLE "Payment"
  ADD COLUMN "rawEventId" TEXT,
  ADD COLUMN "providerPaymentIntentId" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Payment_rawEventId_key" ON "Payment"("rawEventId");
CREATE UNIQUE INDEX "Payment_providerPaymentIntentId_key" ON "Payment"("providerPaymentIntentId");

CREATE TABLE "ProcessedStripeEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedStripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcessedStripeEvent_eventId_key" ON "ProcessedStripeEvent"("eventId");
