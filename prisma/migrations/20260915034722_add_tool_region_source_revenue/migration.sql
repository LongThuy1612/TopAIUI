-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "monthlyRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "source" TEXT;
