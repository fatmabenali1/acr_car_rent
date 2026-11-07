CREATE TYPE "CookieConsentChoice" AS ENUM ('ACCEPTED', 'REFUSED', 'CUSTOMIZED');

CREATE TABLE "CookieConsent" (
  "id" TEXT NOT NULL,
  "choice" "CookieConsentChoice" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CookieConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CookieConsent_expiresAt_idx" ON "CookieConsent"("expiresAt");
