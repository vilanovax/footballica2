-- AlterEnum
ALTER TYPE "MatchMode" ADD VALUE 'SURVIVAL';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "CategoryRecord" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "maxSurvivalScore" INTEGER NOT NULL DEFAULT 0,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryRecord_categoryId_maxSurvivalScore_idx" ON "CategoryRecord"("categoryId", "maxSurvivalScore");

-- CreateIndex
CREATE INDEX "CategoryRecord_clubId_idx" ON "CategoryRecord"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRecord_clubId_categoryId_key" ON "CategoryRecord"("clubId", "categoryId");

-- CreateIndex
CREATE INDEX "Match_categoryId_finishedAt_idx" ON "Match"("categoryId", "finishedAt");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRecord" ADD CONSTRAINT "CategoryRecord_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRecord" ADD CONSTRAINT "CategoryRecord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
