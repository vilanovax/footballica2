-- AlterEnum: extend DuelRoundType with special Live-Ops formats
ALTER TYPE "DuelRoundType" ADD VALUE IF NOT EXISTS 'MYSTERY';
ALTER TYPE "DuelRoundType" ADD VALUE IF NOT EXISTS 'GRID';
ALTER TYPE "DuelRoundType" ADD VALUE IF NOT EXISTS 'STAR_PATH';

-- CreateEnum
CREATE TYPE "DailyMemoryAttemptStatus" AS ENUM ('IN_PROGRESS', 'SOLVED', 'FAILED');

-- Club Memory GotD streak fields
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "memoryStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "longestMemoryStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "memorySolves" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "lastMemoryDate" TIMESTAMP(3);

-- Daily Memory GotD
CREATE TABLE IF NOT EXISTS "DailyMemoryPuzzle" (
    "id" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "pairCount" INTEGER NOT NULL DEFAULT 8,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMemoryPuzzle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyMemoryPuzzle_dateKey_key" ON "DailyMemoryPuzzle"("dateKey");
CREATE INDEX IF NOT EXISTS "DailyMemoryPuzzle_dateKey_idx" ON "DailyMemoryPuzzle"("dateKey");

CREATE TABLE IF NOT EXISTS "DailyMemoryAttempt" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "status" "DailyMemoryAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "pairsFound" INTEGER NOT NULL DEFAULT 0,
    "logJson" JSONB,
    "shareCode" TEXT,
    "solvedAt" TIMESTAMP(3),
    "rewardJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMemoryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyMemoryAttempt_clubId_puzzleId_key" ON "DailyMemoryAttempt"("clubId", "puzzleId");
CREATE INDEX IF NOT EXISTS "DailyMemoryAttempt_clubId_status_idx" ON "DailyMemoryAttempt"("clubId", "status");
CREATE INDEX IF NOT EXISTS "DailyMemoryAttempt_puzzleId_idx" ON "DailyMemoryAttempt"("puzzleId");
CREATE INDEX IF NOT EXISTS "DailyMemoryAttempt_solvedAt_idx" ON "DailyMemoryAttempt"("solvedAt");

DO $$ BEGIN
  ALTER TABLE "DailyMemoryAttempt" ADD CONSTRAINT "DailyMemoryAttempt_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DailyMemoryAttempt" ADD CONSTRAINT "DailyMemoryAttempt_puzzleId_fkey"
    FOREIGN KEY ("puzzleId") REFERENCES "DailyMemoryPuzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
