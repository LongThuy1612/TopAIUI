-- CreateTable
CREATE TABLE "ToolAnalyticsData" (
    "id" TEXT NOT NULL,
    "toolSlug" TEXT NOT NULL,
    "monthlyVisits" DOUBLE PRECISION,
    "trafficVisits" JSONB,
    "trafficSources" JSONB,
    "engagement" JSONB,
    "paidKeywords" JSONB,
    "organicKeywords" JSONB,
    "geography" JSONB,
    "globalRanking" INTEGER,
    "highestTrafficCountry" INTEGER,
    "highestTrafficCountryRanking" INTEGER,
    "category" TEXT,
    "categoryRanking" INTEGER,
    "hasGaToken" BOOLEAN,
    "privacyStatus" TEXT,
    "relatedApps" JSONB,
    "employeeRange" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "desktopVsMobile" JSONB,
    "growthMetrics" JSONB,
    "similarSites" JSONB,
    "yearFounded" TEXT,

    CONSTRAINT "ToolAnalyticsData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolAnalyticsData_toolSlug_key" ON "ToolAnalyticsData"("toolSlug");

