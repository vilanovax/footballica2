-- AlterTable
ALTER TABLE "Club" ADD COLUMN "sponsorOfficeLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Club" ADD COLUMN "lastSponsorPayoutAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ClubSponsorDeal" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "sponsorKey" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubSponsorDeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubSponsorDeal_clubId_idx" ON "ClubSponsorDeal"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubSponsorDeal_clubId_slotIndex_key" ON "ClubSponsorDeal"("clubId", "slotIndex");

-- AddForeignKey
ALTER TABLE "ClubSponsorDeal" ADD CONSTRAINT "ClubSponsorDeal_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
