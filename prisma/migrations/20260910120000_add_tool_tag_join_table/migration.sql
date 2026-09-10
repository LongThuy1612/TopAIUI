-- CreateTable
-- Implicit m2m join table for Tool <-> Tag, named "_ToolToTag" to match the
-- name the separate crawler service expects when it reads/writes this table
-- directly via raw SQL (same convention as "_ToolToCategory").
-- "A" = Tag.id, "B" = Tool.id (Prisma orders implicit m2m columns alphabetically by model name).
CREATE TABLE "_ToolToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ToolToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ToolToTag_B_index" ON "_ToolToTag"("B");

-- AddForeignKey
ALTER TABLE "_ToolToTag" ADD CONSTRAINT "_ToolToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ToolToTag" ADD CONSTRAINT "_ToolToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
