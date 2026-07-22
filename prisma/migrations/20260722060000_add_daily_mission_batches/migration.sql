-- CreateEnum
CREATE TYPE "MissionBatchKind" AS ENUM ('CAMPAIGN', 'DAILY');

-- AlterTable
ALTER TABLE "MissionBatch" ADD COLUMN     "dayKey" TEXT,
ADD COLUMN     "kind" "MissionBatchKind" NOT NULL DEFAULT 'CAMPAIGN';

-- CreateIndex
CREATE UNIQUE INDEX "MissionBatch_dayKey_key" ON "MissionBatch"("dayKey");

-- CreateIndex
CREATE INDEX "MissionBatch_kind_dayKey_idx" ON "MissionBatch"("kind", "dayKey");
