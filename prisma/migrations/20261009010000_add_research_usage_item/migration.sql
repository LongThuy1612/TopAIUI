-- CreateTable
CREATE TABLE "ResearchUsageItem" (
    "id" TEXT NOT NULL,
    "usageId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchUsageItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearchUsageItem_usageId_key_key" ON "ResearchUsageItem"("usageId", "key");

-- AddForeignKey
ALTER TABLE "ResearchUsageItem" ADD CONSTRAINT "ResearchUsageItem_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "ResearchUsage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

