-- CreateTable
CREATE TABLE "ToolDailyStat" (
    "day" DATE NOT NULL,
    "toolId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ToolDailyStat_pkey" PRIMARY KEY ("day","toolId")
);

-- CreateIndex
CREATE INDEX "ToolDailyStat_day_idx" ON "ToolDailyStat"("day");

-- AddForeignKey
ALTER TABLE "ToolDailyStat" ADD CONSTRAINT "ToolDailyStat_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

