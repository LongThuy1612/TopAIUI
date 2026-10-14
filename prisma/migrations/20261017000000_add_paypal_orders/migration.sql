-- AlterTable
ALTER TABLE "PromoteOrder" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'stripe',
ADD COLUMN     "paypalCaptureId" TEXT;
