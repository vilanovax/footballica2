-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "dailyStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "goalsTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "highestCombo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastPlayedDate" TIMESTAMP(3),
ADD COLUMN     "longestDailyStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "matchesWon" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stadiumName" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "bestCombo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usedHelp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ClubBadge" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "badgeSlug" TEXT NOT NULL,
    "coinsAwarded" INTEGER NOT NULL DEFAULT 0,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubBadge_clubId_idx" ON "ClubBadge"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubBadge_clubId_badgeSlug_key" ON "ClubBadge"("clubId", "badgeSlug");

-- AddForeignKey
ALTER TABLE "ClubBadge" ADD CONSTRAINT "ClubBadge_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
