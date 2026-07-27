-- AlterTable
ALTER TABLE "ClubBadge" ADD COLUMN     "sourceChallengeId" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "recordChallengeId" TEXT;

-- CreateTable
CREATE TABLE "RecordChallenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFa" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionFa" TEXT NOT NULL DEFAULT '',
    "unlockCostCoins" INTEGER NOT NULL,
    "targetScore" INTEGER NOT NULL,
    "rewardBadgeSlug" TEXT,
    "rewardBadgeEmoji" TEXT DEFAULT '🏆',
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubChallengeAccess" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "coinsSpent" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubChallengeAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubChallengeRun" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "conqueredAt" TIMESTAMP(3),
    "badgeGranted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubChallengeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecordChallenge_slug_key" ON "RecordChallenge"("slug");

-- CreateIndex
CREATE INDEX "RecordChallenge_isActive_expiresAt_idx" ON "RecordChallenge"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "RecordChallenge_categoryId_idx" ON "RecordChallenge"("categoryId");

-- CreateIndex
CREATE INDEX "ClubChallengeAccess_challengeId_idx" ON "ClubChallengeAccess"("challengeId");

-- CreateIndex
CREATE INDEX "ClubChallengeAccess_clubId_idx" ON "ClubChallengeAccess"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubChallengeAccess_clubId_challengeId_key" ON "ClubChallengeAccess"("clubId", "challengeId");

-- CreateIndex
CREATE INDEX "ClubChallengeRun_challengeId_bestScore_idx" ON "ClubChallengeRun"("challengeId", "bestScore");

-- CreateIndex
CREATE INDEX "ClubChallengeRun_clubId_idx" ON "ClubChallengeRun"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubChallengeRun_clubId_challengeId_key" ON "ClubChallengeRun"("clubId", "challengeId");

-- CreateIndex
CREATE INDEX "ClubBadge_sourceChallengeId_idx" ON "ClubBadge"("sourceChallengeId");

-- CreateIndex
CREATE INDEX "Match_recordChallengeId_finishedAt_idx" ON "Match"("recordChallengeId", "finishedAt");

-- AddForeignKey
ALTER TABLE "ClubBadge" ADD CONSTRAINT "ClubBadge_sourceChallengeId_fkey" FOREIGN KEY ("sourceChallengeId") REFERENCES "RecordChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_recordChallengeId_fkey" FOREIGN KEY ("recordChallengeId") REFERENCES "RecordChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordChallenge" ADD CONSTRAINT "RecordChallenge_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubChallengeAccess" ADD CONSTRAINT "ClubChallengeAccess_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubChallengeAccess" ADD CONSTRAINT "ClubChallengeAccess_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "RecordChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubChallengeRun" ADD CONSTRAINT "ClubChallengeRun_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubChallengeRun" ADD CONSTRAINT "ClubChallengeRun_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "RecordChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
