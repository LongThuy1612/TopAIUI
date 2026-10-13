-- CreateTable
CREATE TABLE "ToolSave" (
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolSave_pkey" PRIMARY KEY ("userId","toolId")
);

-- CreateIndex
CREATE INDEX "ToolSave_userId_createdAt_idx" ON "ToolSave"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ToolSave_toolId_idx" ON "ToolSave"("toolId");

-- AddForeignKey
ALTER TABLE "ToolSave" ADD CONSTRAINT "ToolSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolSave" ADD CONSTRAINT "ToolSave_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

