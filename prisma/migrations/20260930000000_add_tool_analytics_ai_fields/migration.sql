-- AlterTable
ALTER TABLE "ToolAnalyticsData" ADD COLUMN     "aiTraffic" JSONB,
ADD COLUMN     "aiTrafficHistory" JSONB,
ADD COLUMN     "history" JSONB,
ADD COLUMN     "topPrompts" JSONB;
