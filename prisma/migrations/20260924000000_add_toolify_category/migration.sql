-- CreateTable
CREATE TABLE "ToolifyCategory" (
    "id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_locales" JSONB,
    "description" TEXT,
    "type" INTEGER,
    "order" INTEGER,
    "tool_count" INTEGER,
    "top_tool_count" INTEGER,
    "top_visited_count" INTEGER,
    "toolify_created_at" TIMESTAMPTZ(6),
    "toolify_updated_at" TIMESTAMPTZ(6),
    "source_url" TEXT,
    "scraped_at" TIMESTAMPTZ(6),
    "parent_category_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ToolifyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolifyCategory_category_id_key" ON "ToolifyCategory"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "ToolifyCategory_handle_key" ON "ToolifyCategory"("handle");

-- CreateIndex
CREATE INDEX "ToolifyCategory_parent_category_id_idx" ON "ToolifyCategory"("parent_category_id");

-- AddForeignKey
ALTER TABLE "ToolifyCategory" ADD CONSTRAINT "ToolifyCategory_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "ToolifyCategory"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

