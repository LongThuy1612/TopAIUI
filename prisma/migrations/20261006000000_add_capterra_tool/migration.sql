-- CreateTable
CREATE TABLE "CapterraTool" (
    "id" TEXT NOT NULL,
    "capterraId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "categoryName" TEXT,
    "categoryUrl" TEXT,
    "lastUpdated" DATE,
    "description" TEXT,
    "usedFor" JSONB,
    "ratingOverall" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "startingPrice" TEXT,
    "freeTrial" BOOLEAN NOT NULL DEFAULT false,
    "freeVersion" BOOLEAN NOT NULL DEFAULT false,
    "pricingPlans" JSONB,
    "alternatives" JSONB,
    "headToHead" JSONB,
    "support" JSONB,
    "training" JSONB,
    "deployment" JSONB,
    "typicalUsers" JSONB,
    "features" JSONB,
    "ratingBreakdown" JSONB,
    "subRatings" JSONB,
    "reviews" JSONB,
    "faqs" JSONB,
    "sourceUrl" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "is_sync" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapterraTool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CapterraTool_capterraId_key" ON "CapterraTool"("capterraId");

-- CreateIndex
CREATE INDEX "CapterraTool_lastUpdated_idx" ON "CapterraTool"("lastUpdated");

-- CreateIndex
CREATE INDEX "CapterraTool_categoryName_idx" ON "CapterraTool"("categoryName");
