-- CreateIndex
CREATE INDEX "Tag_slug_trgm_idx" ON "Tag" USING GIN ("slug" gin_trgm_ops);
-- CreateIndex
CREATE INDEX "TagTranslation_name_trgm_idx" ON "TagTranslation" USING GIN ("name" gin_trgm_ops);
-- CreateIndex
CREATE INDEX "Tool_website_trgm_idx" ON "Tool" USING GIN ("website" gin_trgm_ops);
