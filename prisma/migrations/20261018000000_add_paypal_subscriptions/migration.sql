-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'stripe',
ADD COLUMN     "providerStatus" TEXT;

-- CreateTable
CREATE TABLE "PaypalPlan" (
    "key" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaypalPlan_pkey" PRIMARY KEY ("key")
);
