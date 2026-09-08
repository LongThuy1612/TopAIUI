-- RenameColumn
-- The crawler service reads/writes these Translation tables via raw SQL and
-- expects snake_case timestamp columns. Renamed to match; no data is lost.
ALTER TABLE "CategoryTranslation" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "TagTranslation" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "CollectionTranslation" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "ToolTranslation" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "ToolTranslation" RENAME COLUMN "updatedAt" TO "updated_at";
