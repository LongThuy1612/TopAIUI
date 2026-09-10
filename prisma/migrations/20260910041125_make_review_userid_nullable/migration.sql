-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "_ToolToCategory" RENAME CONSTRAINT "_CategoryToTool_AB_pkey" TO "_ToolToCategory_AB_pkey";

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "_CategoryToTool_B_index" RENAME TO "_ToolToCategory_B_index";
