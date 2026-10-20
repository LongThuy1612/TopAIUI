-- CreateTable
CREATE TABLE "CategoryAlias" (
    "alias_slug" TEXT NOT NULL,
    "keep_slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryAlias_pkey" PRIMARY KEY ("alias_slug")
);

-- CreateIndex
CREATE INDEX "CategoryAlias_keep_slug_idx" ON "CategoryAlias"("keep_slug");

