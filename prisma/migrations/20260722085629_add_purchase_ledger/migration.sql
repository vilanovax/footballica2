-- CreateTable
CREATE TABLE "PurchaseLog" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "packTier" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "coinsGranted" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseLog_clubId_createdAt_idx" ON "PurchaseLog"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseLog_status_idx" ON "PurchaseLog"("status");

-- AddForeignKey
ALTER TABLE "PurchaseLog" ADD CONSTRAINT "PurchaseLog_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
