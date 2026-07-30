-- CreateEnum
CREATE TYPE "DuelRoundType" AS ENUM ('QUIZ', 'MEMORY');

-- AlterTable
ALTER TABLE "DuelRound" ADD COLUMN     "attackStartedAt" TIMESTAMP(3),
ADD COLUMN     "boardJson" JSONB,
ADD COLUMN     "defenseStartedAt" TIMESTAMP(3),
ADD COLUMN     "roundType" "DuelRoundType" NOT NULL DEFAULT 'QUIZ';

-- CreateIndex
CREATE INDEX "DuelRound_roundType_idx" ON "DuelRound"("roundType");
