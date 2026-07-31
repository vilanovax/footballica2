-- CreateTable
CREATE TABLE "QuestionCategory" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionCategory_categoryId_idx" ON "QuestionCategory"("categoryId");

-- CreateIndex
CREATE INDEX "QuestionCategory_questionId_idx" ON "QuestionCategory"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCategory_questionId_categoryId_key" ON "QuestionCategory"("questionId", "categoryId");

-- AddForeignKey
ALTER TABLE "QuestionCategory" ADD CONSTRAINT "QuestionCategory_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategory" ADD CONSTRAINT "QuestionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing primary category becomes an M2N membership.
INSERT INTO "QuestionCategory" ("id", "questionId", "categoryId", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || q.id),
  q.id,
  q."categoryId",
  CURRENT_TIMESTAMP
FROM "Question" q
WHERE q."categoryId" IS NOT NULL
ON CONFLICT ("questionId", "categoryId") DO NOTHING;
