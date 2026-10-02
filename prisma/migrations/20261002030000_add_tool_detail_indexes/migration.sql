-- IF [NOT] EXISTS: production already had some of these indexes (created by hand / db push).
-- Postgres doesn't index foreign keys on its own: every tool detail page was
-- seq-scanning Faq / PricingPlan / Review for one tool's rows.
CREATE INDEX IF NOT EXISTS "Faq_toolId_locale_idx" ON "Faq"("toolId", "locale");
CREATE INDEX IF NOT EXISTS "Feature_toolId_idx" ON "Feature"("toolId");
CREATE INDEX IF NOT EXISTS "PricingPlan_toolId_locale_idx" ON "PricingPlan"("toolId", "locale");
CREATE INDEX IF NOT EXISTS "Review_toolId_status_createdAt_idx" ON "Review"("toolId", "status", "createdAt");

-- New/Today lists sort by addedOn DESC NULLS LAST, id ASC; the old ascending
-- index (NULLS LAST) can't serve that order, so every request sorted the whole table.
DROP INDEX IF EXISTS "Tool_addedOn_idx";
CREATE INDEX IF NOT EXISTS "Tool_addedOn_id_idx" ON "Tool"("addedOn" DESC NULLS LAST, "id");

-- Default "newest" sort (hero tool count, category pages).
CREATE INDEX IF NOT EXISTS "Tool_createdAt_idx" ON "Tool"("createdAt");
