ALTER TABLE "Vehicle"
  ADD COLUMN "availableUnits" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AvailabilityBlock" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AvailabilityBlock_vehicleId_startsAt_endsAt_idx"
  ON "AvailabilityBlock"("vehicleId", "startsAt", "endsAt");

ALTER TABLE "AvailabilityBlock"
  ADD CONSTRAINT "AvailabilityBlock_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
