-- AlterTable
ALTER TABLE "ResearchUsage" ADD COLUMN     "exportRowsLimit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "exportRowsUsed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SocialQuery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialQuery_userId_active_idx" ON "SocialQuery"("userId", "active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tool_social_feeds_title_trgm_idx" ON "tool_social_feeds" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tool_social_feeds_description_trgm_idx" ON "tool_social_feeds" USING GIN ("description" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "SocialQuery" ADD CONSTRAINT "SocialQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Existing quota months: the export limit and the new query limits of their plan
-- (shared/research.ts).
UPDATE "ResearchUsage" SET
    "exportRowsLimit" = CASE "plan" WHEN 'STARTER' THEN 10000 WHEN 'PROFESSIONAL' THEN 10000 WHEN 'ENTERPRISE' THEN 50000 ELSE 500 END,
    "socialQueriesLimit" = CASE "plan" WHEN 'STARTER' THEN 10 WHEN 'PROFESSIONAL' THEN 10 WHEN 'ENTERPRISE' THEN 100 ELSE 1 END;
