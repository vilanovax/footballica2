-- CreateEnum
CREATE TYPE "BotDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "botDifficulty" "BotDifficulty",
ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "User_isBot_botDifficulty_idx" ON "User"("isBot", "botDifficulty");
