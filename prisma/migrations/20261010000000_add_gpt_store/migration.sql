-- CreateTable
CREATE TABLE "Gpt" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gizmoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "content" TEXT,
    "iconUrl" TEXT,
    "author" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fetchStatus" TEXT NOT NULL DEFAULT 'QUEUED',
    "fetchedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "ownerId" TEXT,
    "orderId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gpt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gpt_slug_key" ON "Gpt"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Gpt_orderId_key" ON "Gpt"("orderId");

-- CreateIndex
CREATE INDEX "Gpt_status_publishedAt_idx" ON "Gpt"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Gpt_status_category_publishedAt_idx" ON "Gpt"("status", "category", "publishedAt");

-- CreateIndex
CREATE INDEX "Gpt_gizmoId_idx" ON "Gpt"("gizmoId");

-- CreateIndex
CREATE INDEX "Gpt_ownerId_createdAt_idx" ON "Gpt"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "Gpt" ADD CONSTRAINT "Gpt_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

