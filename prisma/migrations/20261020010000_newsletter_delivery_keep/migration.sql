-- DropForeignKey
ALTER TABLE "NewsletterDelivery" DROP CONSTRAINT "NewsletterDelivery_subscriberId_fkey";

-- AlterTable
ALTER TABLE "NewsletterDelivery" ALTER COLUMN "subscriberId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

