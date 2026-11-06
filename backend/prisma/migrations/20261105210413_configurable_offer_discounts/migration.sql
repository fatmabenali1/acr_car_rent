-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "discountAmountEur" DECIMAL(10,2),
ADD COLUMN     "discountPercent" DECIMAL(5,2),
ADD COLUMN     "minimumAdvanceDays" INTEGER,
ADD COLUMN     "minimumDays" INTEGER,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stackable" BOOLEAN NOT NULL DEFAULT false;
