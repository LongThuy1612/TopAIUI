-- Indexes for the remaining /api/tools sorts and filters, owner lookups and
-- the review moderation list. IF NOT EXISTS in case some were added by hand.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Tool_ownerId_createdAt_idx" ON "Tool"("ownerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Tool_isFeatured_createdAt_idx" ON "Tool"("isFeatured", "createdAt");
CREATE INDEX IF NOT EXISTS "Tool_averageRating_idx" ON "Tool"("averageRating" DESC);
CREATE INDEX IF NOT EXISTS "Tool_name_idx" ON "Tool"("name");
CREATE INDEX IF NOT EXISTS "Tool_isAd_adPriority_isFeatured_viewCount_idx" ON "Tool"("isAd" DESC, "adPriority" DESC, "isFeatured" DESC, "viewCount" DESC);
CREATE INDEX IF NOT EXISTS "Tool_name_trgm_idx" ON "Tool" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Review_status_createdAt_idx" ON "Review"("status", "createdAt");
