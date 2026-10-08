-- AlterTable
ALTER TABLE "PromoteOrder" ADD COLUMN     "campaignId" TEXT;

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "pausedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "landingUrl" TEXT,
    "pendingLandingUrl" TEXT,
    "rejectionReason" TEXT,
    "clicksPurchased" INTEGER NOT NULL DEFAULT 0,
    "clicksRemaining" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdClick" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "placement" TEXT,
    "ipHash" TEXT NOT NULL,
    "charged" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdCampaign_status_clicksRemaining_idx" ON "AdCampaign"("status", "clicksRemaining");

-- CreateIndex
CREATE INDEX "AdCampaign_toolId_idx" ON "AdCampaign"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "AdCampaign_userId_toolId_tier_key" ON "AdCampaign"("userId", "toolId", "tier");

-- CreateIndex
CREATE INDEX "AdClick_campaignId_ipHash_createdAt_idx" ON "AdClick"("campaignId", "ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "AdClick_campaignId_createdAt_idx" ON "AdClick"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "PromoteOrder_campaignId_idx" ON "PromoteOrder"("campaignId");

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data: the old pooled User.adCredits balance only ever came from paid advertise orders and
-- was never spent, so turn those orders into one running STANDARD campaign per user + tool
-- (landing URL = that tool's most recent order), then drop the pooled balance.
INSERT INTO "AdCampaign" ("id", "userId", "toolId", "tier", "status", "landingUrl", "clicksPurchased", "clicksRemaining", "approvedAt", "createdAt", "updatedAt")
SELECT
    'c' || substr(md5(random()::text || o."userId" || o."adToolId"), 1, 24),
    o."userId",
    o."adToolId",
    'STANDARD',
    'ACTIVE',
    (ARRAY_AGG(NULLIF(o."payload"->>'landingUrl', '') ORDER BY o."createdAt" DESC))[1],
    SUM((o."payload"->>'clicks')::int),
    SUM((o."payload"->>'clicks')::int),
    MIN(o."paidAt"),
    MIN(o."createdAt"),
    CURRENT_TIMESTAMP
FROM (
    SELECT po."userId", po."payload", po."createdAt", po."paidAt", po."payload"->>'toolId' AS "adToolId"
    FROM "PromoteOrder" po
    WHERE po."type" = 'advertise' AND po."status" = 'PAID'
) o
JOIN "Tool" t ON t."id" = o."adToolId"
GROUP BY o."userId", o."adToolId";

UPDATE "PromoteOrder" po
SET "toolId" = c."toolId", "campaignId" = c."id"
FROM "AdCampaign" c
WHERE po."type" = 'advertise' AND po."status" = 'PAID'
  AND c."userId" = po."userId" AND c."toolId" = po."payload"->>'toolId' AND c."tier" = 'STANDARD';

UPDATE "Tool" t
SET "isAd" = true, "adPriority" = LEAST(c."clicksRemaining", 999999)
FROM "AdCampaign" c
WHERE c."toolId" = t."id" AND c."status" = 'ACTIVE' AND c."clicksRemaining" > 0;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "adCredits";
