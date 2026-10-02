-- AlterTable
ALTER TABLE "Tool" ADD COLUMN "aiSync" INTEGER;

-- CreateIndex
CREATE INDEX "Tool_aiSync_idx" ON "Tool"("aiSync");
