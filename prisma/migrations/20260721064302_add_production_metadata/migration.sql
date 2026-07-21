-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'RETIRED');

-- DropIndex
DROP INDEX "Question_isActive_idx";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "isActive",
ADD COLUMN     "asOfDate" TIMESTAMP(3),
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "eloRating" DOUBLE PRECISION NOT NULL DEFAULT 1500,
ADD COLUMN     "isTemporal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "status" "QuestionStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "timesCorrect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timesServed" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Question_contentHash_key" ON "Question"("contentHash");

-- CreateIndex
CREATE INDEX "Question_status_idx" ON "Question"("status");

-- CreateIndex
CREATE INDEX "Question_eloRating_idx" ON "Question"("eloRating");
