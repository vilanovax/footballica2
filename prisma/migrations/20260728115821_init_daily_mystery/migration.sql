-- CreateEnum
CREATE TYPE "DailyMysteryAttemptStatus" AS ENUM ('IN_PROGRESS', 'SOLVED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'CAREER_PATH';
ALTER TYPE "QuestionType" ADD VALUE 'HIGHER_LOWER';
ALTER TYPE "QuestionType" ADD VALUE 'REVEAL_IMAGE';

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "lastMysteryDate" TIMESTAMP(3),
ADD COLUMN     "longestMysteryStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mysteryStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DailyMysteryPuzzle" (
    "id" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "targetPlayerId" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMysteryPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMysteryAttempt" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "status" "DailyMysteryAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "guessCount" INTEGER NOT NULL DEFAULT 0,
    "guesses" JSONB NOT NULL DEFAULT '[]',
    "shareCode" TEXT,
    "solvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMysteryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMysteryPuzzle_dateKey_key" ON "DailyMysteryPuzzle"("dateKey");

-- CreateIndex
CREATE INDEX "DailyMysteryPuzzle_targetPlayerId_idx" ON "DailyMysteryPuzzle"("targetPlayerId");

-- CreateIndex
CREATE INDEX "DailyMysteryAttempt_clubId_status_idx" ON "DailyMysteryAttempt"("clubId", "status");

-- CreateIndex
CREATE INDEX "DailyMysteryAttempt_puzzleId_idx" ON "DailyMysteryAttempt"("puzzleId");

-- CreateIndex
CREATE INDEX "DailyMysteryAttempt_solvedAt_idx" ON "DailyMysteryAttempt"("solvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMysteryAttempt_clubId_puzzleId_key" ON "DailyMysteryAttempt"("clubId", "puzzleId");

-- AddForeignKey
ALTER TABLE "DailyMysteryAttempt" ADD CONSTRAINT "DailyMysteryAttempt_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMysteryAttempt" ADD CONSTRAINT "DailyMysteryAttempt_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "DailyMysteryPuzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
