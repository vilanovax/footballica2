-- Challenge-only categories + many-to-many banks on RecordChallenge.
-- Preserves existing single categoryId locks into the junction table.

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "challengeOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RecordChallengeCategory" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordChallengeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordChallengeCategory_categoryId_idx" ON "RecordChallengeCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordChallengeCategory_challengeId_categoryId_key" ON "RecordChallengeCategory"("challengeId", "categoryId");

-- AddForeignKey
ALTER TABLE "RecordChallengeCategory" ADD CONSTRAINT "RecordChallengeCategory_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "RecordChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordChallengeCategory" ADD CONSTRAINT "RecordChallengeCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy single category lock
INSERT INTO "RecordChallengeCategory" ("id", "challengeId", "categoryId", "createdAt")
SELECT
  gen_random_uuid()::text,
  rc."id",
  rc."categoryId",
  CURRENT_TIMESTAMP
FROM "RecordChallenge" rc
WHERE rc."categoryId" IS NOT NULL;

-- Drop legacy FK / index / column
ALTER TABLE "RecordChallenge" DROP CONSTRAINT "RecordChallenge_categoryId_fkey";
DROP INDEX "RecordChallenge_categoryId_idx";
ALTER TABLE "RecordChallenge" DROP COLUMN "categoryId";
