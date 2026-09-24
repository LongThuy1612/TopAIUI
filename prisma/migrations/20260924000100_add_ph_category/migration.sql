-- CreateTable
CREATE TABLE "PhCategory" (
    "id" TEXT NOT NULL,
    "category_id" INTEGER,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "path" TEXT,
    "parent_category_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PhCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PhProductCategories" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PhProductCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhCategory_category_id_key" ON "PhCategory"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "PhCategory_slug_key" ON "PhCategory"("slug");

-- CreateIndex
CREATE INDEX "PhCategory_parent_category_id_idx" ON "PhCategory"("parent_category_id");

-- CreateIndex
CREATE INDEX "_PhProductCategories_B_index" ON "_PhProductCategories"("B");

-- AddForeignKey
ALTER TABLE "PhCategory" ADD CONSTRAINT "PhCategory_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "PhCategory"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PhProductCategories" ADD CONSTRAINT "_PhProductCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "PhCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PhProductCategories" ADD CONSTRAINT "_PhProductCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "PhProductTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

