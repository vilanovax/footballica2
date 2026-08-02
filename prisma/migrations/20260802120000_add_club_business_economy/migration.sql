-- AlterTable
ALTER TABLE "Club" ADD COLUMN "clubFunds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Club" ADD COLUMN "vaultBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Club" ADD COLUMN "vaultLevel" INTEGER NOT NULL DEFAULT 1;

-- CreateEnum
CREATE TYPE "BusinessFacilityKey" AS ENUM ('TICKET_OFFICE', 'CLUB_SHOP', 'MUSEUM');

-- CreateEnum
CREATE TYPE "ClubFacilityStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'BUILT');

-- CreateTable
CREATE TABLE "ClubFacility" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "key" "BusinessFacilityKey" NOT NULL,
    "status" "ClubFacilityStatus" NOT NULL DEFAULT 'LOCKED',
    "level" INTEGER NOT NULL DEFAULT 0,
    "storedAmount" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubFacility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubFacility_clubId_status_idx" ON "ClubFacility"("clubId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClubFacility_clubId_key_key" ON "ClubFacility"("clubId", "key");

-- AddForeignKey
ALTER TABLE "ClubFacility" ADD CONSTRAINT "ClubFacility_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
