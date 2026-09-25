-- AlterTable
ALTER TABLE "ToolifyCategory" ADD COLUMN     "is_sync" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PhCategory" ADD COLUMN     "is_sync" INTEGER NOT NULL DEFAULT 0;

