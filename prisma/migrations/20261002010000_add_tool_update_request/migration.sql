-- CreateTable
CREATE TABLE "ToolUpdateRequest" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "changes" JSONB,
    "rejectionReason" TEXT,
    "refundId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolUpdateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolUpdateRequest_orderId_key" ON "ToolUpdateRequest"("orderId");

-- CreateIndex
CREATE INDEX "ToolUpdateRequest_toolId_status_idx" ON "ToolUpdateRequest"("toolId", "status");

-- CreateIndex
CREATE INDEX "ToolUpdateRequest_status_idx" ON "ToolUpdateRequest"("status");

-- AddForeignKey
ALTER TABLE "ToolUpdateRequest" ADD CONSTRAINT "ToolUpdateRequest_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolUpdateRequest" ADD CONSTRAINT "ToolUpdateRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

