-- CreateEnum
CREATE TYPE "MissionObjective" AS ENUM ('SCORE_GOALS', 'PLAY_MATCHES', 'WIN_MATCHES', 'PERFECT_COMBO');

-- CreateTable
CREATE TABLE "MissionBatch" (
    "id" TEXT NOT NULL,
    "batchIndex" INTEGER NOT NULL,
    "chestCoins" INTEGER NOT NULL DEFAULT 0,
    "chestXp" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "titleFa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "objectiveType" "MissionObjective" NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMissionBatch" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "chestClaimedAt" TIMESTAMP(3),
    "lastProcessedMatchId" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMissionBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMission" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "rewardClaimedAt" TIMESTAMP(3),

    CONSTRAINT "ClubMission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissionBatch_batchIndex_key" ON "MissionBatch"("batchIndex");

-- CreateIndex
CREATE INDEX "MissionBatch_isActive_batchIndex_idx" ON "MissionBatch"("isActive", "batchIndex");

-- CreateIndex
CREATE INDEX "Mission_batchId_sortOrder_idx" ON "Mission"("batchId", "sortOrder");

-- CreateIndex
CREATE INDEX "ClubMissionBatch_clubId_idx" ON "ClubMissionBatch"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMissionBatch_clubId_batchId_key" ON "ClubMissionBatch"("clubId", "batchId");

-- CreateIndex
CREATE INDEX "ClubMission_clubId_idx" ON "ClubMission"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMission_clubId_missionId_key" ON "ClubMission"("clubId", "missionId");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MissionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMissionBatch" ADD CONSTRAINT "ClubMissionBatch_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMissionBatch" ADD CONSTRAINT "ClubMissionBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "MissionBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMission" ADD CONSTRAINT "ClubMission_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMission" ADD CONSTRAINT "ClubMission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
