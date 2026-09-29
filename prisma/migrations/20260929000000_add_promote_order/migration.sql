-- CreateTable
CREATE TABLE "PromoteOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PromoteOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoteOrder_stripeSessionId_key" ON "PromoteOrder"("stripeSessionId");

-- CreateIndex
CREATE INDEX "PromoteOrder_userId_idx" ON "PromoteOrder"("userId");

-- CreateIndex
CREATE INDEX "PromoteOrder_type_status_idx" ON "PromoteOrder"("type", "status");

-- AddForeignKey
ALTER TABLE "PromoteOrder" ADD CONSTRAINT "PromoteOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
