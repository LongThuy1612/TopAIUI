-- CreateTable
CREATE TABLE "NewsletterIssue" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENDING',
    "source" TEXT NOT NULL DEFAULT 'schedule',
    "toolIds" TEXT[],
    "articleIds" TEXT[],
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterDelivery" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsletterIssue_createdAt_idx" ON "NewsletterIssue"("createdAt");

-- CreateIndex
CREATE INDEX "NewsletterDelivery_sentAt_idx" ON "NewsletterDelivery"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterDelivery_issueId_subscriberId_key" ON "NewsletterDelivery"("issueId", "subscriberId");

-- AddForeignKey
ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "NewsletterIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterDelivery" ADD CONSTRAINT "NewsletterDelivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

