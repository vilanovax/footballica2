-- CreateEnum
CREATE TYPE "ManagerAvatar" AS ENUM ('TACTICAL_COACH', 'YOUNG_DIRECTOR', 'VETERAN_FAN');

-- CreateEnum
CREATE TYPE "MatchMode" AS ENUM ('TUTORIAL', 'QUICK_MATCH', 'PENALTY');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "BoosterType" AS ENUM ('COIN_BOOST', 'FAN_BOOST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "managerAvatar" "ManagerAvatar",
    "xp" INTEGER NOT NULL DEFAULT 0,
    "managerLevel" INTEGER NOT NULL DEFAULT 1,
    "weeklyXp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "tutorialStep" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "fans" INTEGER NOT NULL DEFAULT 0,
    "stamina" INTEGER NOT NULL DEFAULT 3,
    "maxStamina" INTEGER NOT NULL DEFAULT 3,
    "lastStaminaUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastNewsClaim" TIMESTAMP(3),
    "stadiumLevel" INTEGER NOT NULL DEFAULT 0,
    "pitchLevel" INTEGER NOT NULL DEFAULT 0,
    "medicalLevel" INTEGER NOT NULL DEFAULT 0,
    "trainingGroundLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveBooster" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "type" "BoosterType" NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "headline" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveBooster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "mode" "MatchMode" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'COMPLETED',
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "questionsTotal" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "coinsEarned" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "fansEarned" INTEGER NOT NULL DEFAULT 0,
    "staminaSpent" INTEGER NOT NULL DEFAULT 1,
    "answerLog" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'EASY',
    "category" TEXT NOT NULL,
    "matchContext" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_weeklyXp_idx" ON "User"("weeklyXp");

-- CreateIndex
CREATE INDEX "User_xp_idx" ON "User"("xp");

-- CreateIndex
CREATE UNIQUE INDEX "Club_userId_key" ON "Club"("userId");

-- CreateIndex
CREATE INDEX "Club_fans_idx" ON "Club"("fans");

-- CreateIndex
CREATE INDEX "Club_coins_idx" ON "Club"("coins");

-- CreateIndex
CREATE INDEX "ActiveBooster_clubId_expiresAt_idx" ON "ActiveBooster"("clubId", "expiresAt");

-- CreateIndex
CREATE INDEX "Match_userId_finishedAt_idx" ON "Match"("userId", "finishedAt");

-- CreateIndex
CREATE INDEX "Match_clubId_finishedAt_idx" ON "Match"("clubId", "finishedAt");

-- CreateIndex
CREATE INDEX "Match_mode_finishedAt_idx" ON "Match"("mode", "finishedAt");

-- CreateIndex
CREATE INDEX "Question_category_difficulty_idx" ON "Question"("category", "difficulty");

-- CreateIndex
CREATE INDEX "Question_isActive_idx" ON "Question"("isActive");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveBooster" ADD CONSTRAINT "ActiveBooster_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
