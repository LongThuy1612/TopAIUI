-- AlterTable
ALTER TABLE "PromoteOrder" ADD COLUMN "toolId" TEXT;

-- CreateIndex
CREATE INDEX "PromoteOrder_toolId_idx" ON "PromoteOrder"("toolId");
