-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('MATCHING', 'A_ATTACKING', 'WAITING_B', 'B_DEFENDING', 'B_ATTACKING', 'WAITING_A', 'A_DEFENDING', 'COMPLETED', 'EXPIRED', 'FORFEIT');

-- CreateTable
CREATE TABLE "DuelMatch" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT,
    "isBotOpponent" BOOLEAN NOT NULL DEFAULT false,
    "status" "DuelStatus" NOT NULL DEFAULT 'MATCHING',
    "turnUserId" TEXT,
    "turnDeadlineAt" TIMESTAMP(3),
    "botPlayAt" TIMESTAMP(3),
    "challengerCorrect" INTEGER NOT NULL DEFAULT 0,
    "opponentCorrect" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "staminaSpent" INTEGER NOT NULL DEFAULT 0,
    "weeklyXpAwarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "DuelMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuelRound" (
    "id" TEXT NOT NULL,
    "duelId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "attackerId" TEXT NOT NULL,
    "draftOptionIds" JSONB NOT NULL,
    "categoryId" TEXT,
    "questionIds" JSONB,
    "attackAnswers" JSONB,
    "defenseAnswers" JSONB,
    "attackCorrect" INTEGER NOT NULL DEFAULT 0,
    "defenseCorrect" INTEGER NOT NULL DEFAULT 0,
    "attackSubmittedAt" TIMESTAMP(3),
    "defenseSubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuelRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DuelMatch_challengerId_status_idx" ON "DuelMatch"("challengerId", "status");

-- CreateIndex
CREATE INDEX "DuelMatch_opponentId_status_idx" ON "DuelMatch"("opponentId", "status");

-- CreateIndex
CREATE INDEX "DuelMatch_status_turnDeadlineAt_idx" ON "DuelMatch"("status", "turnDeadlineAt");

-- CreateIndex
CREATE INDEX "DuelMatch_status_botPlayAt_idx" ON "DuelMatch"("status", "botPlayAt");

-- CreateIndex
CREATE INDEX "DuelRound_duelId_idx" ON "DuelRound"("duelId");

-- CreateIndex
CREATE INDEX "DuelRound_attackerId_idx" ON "DuelRound"("attackerId");

-- CreateIndex
CREATE UNIQUE INDEX "DuelRound_duelId_roundNumber_key" ON "DuelRound"("duelId", "roundNumber");

-- AddForeignKey
ALTER TABLE "DuelMatch" ADD CONSTRAINT "DuelMatch_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelMatch" ADD CONSTRAINT "DuelMatch_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelRound" ADD CONSTRAINT "DuelRound_duelId_fkey" FOREIGN KEY ("duelId") REFERENCES "DuelMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelRound" ADD CONSTRAINT "DuelRound_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
