-- AlterTable
ALTER TABLE "SubscriptionInvoice" ADD COLUMN     "refundDue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundKey" TEXT,
ADD COLUMN     "refundedAmount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_refundDue_idx" ON "SubscriptionInvoice"("refundDue");
