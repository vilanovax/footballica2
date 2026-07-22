-- CreateTable
CREATE TABLE "AdminCoinGrant" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminCoinGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminCoinGrant_clubId_createdAt_idx" ON "AdminCoinGrant"("clubId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminCoinGrant" ADD CONSTRAINT "AdminCoinGrant_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
