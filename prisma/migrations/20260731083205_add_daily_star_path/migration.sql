-- CreateEnum
CREATE TYPE "DailyStarPathAttemptStatus" AS ENUM ('IN_PROGRESS', 'SOLVED', 'FAILED');

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "lastStarPathDate" TIMESTAMP(3),
ADD COLUMN     "longestStarPathStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "starPathSolves" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "starPathStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DailyStarPathPuzzle" (
    "id" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "targetPlayerId" TEXT NOT NULL,
    "pathJson" JSONB NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyStarPathPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStarPathAttempt" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "status" "DailyStarPathAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "cluesRevealed" INTEGER NOT NULL DEFAULT 1,
    "score" INTEGER NOT NULL DEFAULT 0,
    "guessesJson" JSONB NOT NULL DEFAULT '[]',
    "shareCode" TEXT,
    "solvedAt" TIMESTAMP(3),
    "rewardJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyStarPathAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyStarPathPuzzle_dateKey_key" ON "DailyStarPathPuzzle"("dateKey");

-- CreateIndex
CREATE INDEX "DailyStarPathPuzzle_targetPlayerId_idx" ON "DailyStarPathPuzzle"("targetPlayerId");

-- CreateIndex
CREATE INDEX "DailyStarPathAttempt_clubId_status_idx" ON "DailyStarPathAttempt"("clubId", "status");

-- CreateIndex
CREATE INDEX "DailyStarPathAttempt_puzzleId_idx" ON "DailyStarPathAttempt"("puzzleId");

-- CreateIndex
CREATE INDEX "DailyStarPathAttempt_solvedAt_idx" ON "DailyStarPathAttempt"("solvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStarPathAttempt_clubId_puzzleId_key" ON "DailyStarPathAttempt"("clubId", "puzzleId");

-- AddForeignKey
ALTER TABLE "DailyStarPathPuzzle" ADD CONSTRAINT "DailyStarPathPuzzle_targetPlayerId_fkey" FOREIGN KEY ("targetPlayerId") REFERENCES "FootballPlayer"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStarPathAttempt" ADD CONSTRAINT "DailyStarPathAttempt_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyStarPathAttempt" ADD CONSTRAINT "DailyStarPathAttempt_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "DailyStarPathPuzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
