-- AlterTable
ALTER TABLE "EmailOutbox" ADD COLUMN     "contactMessageId" TEXT,
ALTER COLUMN "quoteId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "EmailOutbox_contactMessageId_template_idx" ON "EmailOutbox"("contactMessageId", "template");

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_contactMessageId_fkey" FOREIGN KEY ("contactMessageId") REFERENCES "ContactMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
