-- CreateEnum
CREATE TYPE "ClubStaffRole" AS ENUM ('MANAGER', 'TREASURER');

-- CreateTable
CREATE TABLE "ClubStaff" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "avatarKey" TEXT NOT NULL,
    "role" "ClubStaffRole" NOT NULL DEFAULT 'MANAGER',
    "rateBonusPercent" INTEGER NOT NULL DEFAULT 10,
    "assignedFacilityKey" "BusinessFacilityKey",
    "hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubStaff_clubId_idx" ON "ClubStaff"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubStaff_clubId_assignedFacilityKey_key" ON "ClubStaff"("clubId", "assignedFacilityKey");

-- AddForeignKey
ALTER TABLE "ClubStaff" ADD CONSTRAINT "ClubStaff_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
