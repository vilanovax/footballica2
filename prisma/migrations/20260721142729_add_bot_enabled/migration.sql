-- DropIndex
DROP INDEX "User_isBot_botDifficulty_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "botEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "User_isBot_botEnabled_botDifficulty_idx" ON "User"("isBot", "botEnabled", "botDifficulty");
