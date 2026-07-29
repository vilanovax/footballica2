-- CreateEnum
CREATE TYPE "DailyGridAttemptStatus" AS ENUM ('IN_PROGRESS', 'SOLVED', 'FAILED');

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "gridSolves" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gridStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastGridDate" TIMESTAMP(3),
ADD COLUMN     "longestGridStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DailyGridPuzzle" (
    "id" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "rowsJson" JSONB NOT NULL,
    "colsJson" JSONB NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyGridPuzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyGridAttempt" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "status" "DailyGridAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "mistakeCount" INTEGER NOT NULL DEFAULT 0,
    "cellsJson" JSONB NOT NULL DEFAULT '{}',
    "guessesJson" JSONB NOT NULL DEFAULT '[]',
    "shareCode" TEXT,
    "solvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyGridAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyGridPuzzle_dateKey_key" ON "DailyGridPuzzle"("dateKey");

-- CreateIndex
CREATE INDEX "DailyGridAttempt_clubId_status_idx" ON "DailyGridAttempt"("clubId", "status");

-- CreateIndex
CREATE INDEX "DailyGridAttempt_puzzleId_idx" ON "DailyGridAttempt"("puzzleId");

-- CreateIndex
CREATE INDEX "DailyGridAttempt_solvedAt_idx" ON "DailyGridAttempt"("solvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyGridAttempt_clubId_puzzleId_key" ON "DailyGridAttempt"("clubId", "puzzleId");

-- AddForeignKey
ALTER TABLE "DailyGridAttempt" ADD CONSTRAINT "DailyGridAttempt_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyGridAttempt" ADD CONSTRAINT "DailyGridAttempt_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "DailyGridPuzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
