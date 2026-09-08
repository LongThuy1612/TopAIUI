-- RenameColumn
-- The 20260908091500_snake_case_translation_timestamps migration renamed
-- ToolTranslation's timestamp columns to snake_case, on the assumption that
-- the crawler service expected snake_case there. In fact the crawler's
-- tool-sync worker (src/sync-content/tool-sync.js) writes ToolTranslation
-- via raw SQL using camelCase "createdAt"/"updatedAt", causing
-- "column \"createdAt\" of relation \"ToolTranslation\" does not exist"
-- on every SYNC_TOOL_CONTENT job. Revert to camelCase to match.
-- (CategoryTranslation/TagTranslation/CollectionTranslation already use
-- snake_case correctly in the crawler and are left untouched.)
ALTER TABLE "ToolTranslation" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "ToolTranslation" RENAME COLUMN "updated_at" TO "updatedAt";
