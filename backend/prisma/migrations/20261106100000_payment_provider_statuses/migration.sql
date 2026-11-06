CREATE TYPE "PaymentStatus_new" AS ENUM ('INITIATED', 'PAID', 'FAILED', 'CANCELLED');

ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment"
  ALTER COLUMN "status" TYPE "PaymentStatus_new"
  USING (
    CASE "status"::text
      WHEN 'CREATED' THEN 'INITIATED'
      WHEN 'PENDING' THEN 'INITIATED'
      WHEN 'SUCCEEDED' THEN 'PAID'
      ELSE "status"::text
    END
  )::"PaymentStatus_new";
DROP TYPE "PaymentStatus";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'INITIATED';
ALTER TABLE "Payment" ADD COLUMN "providerResponse" JSONB;
