-- CreateTable
CREATE TABLE "HallOfFame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tehranWeekKey" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HallOfFame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HallOfFame_tehranWeekKey_rank_idx" ON "HallOfFame"("tehranWeekKey", "rank");

-- CreateIndex
CREATE INDEX "HallOfFame_userId_idx" ON "HallOfFame"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HallOfFame_tehranWeekKey_rank_key" ON "HallOfFame"("tehranWeekKey", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "HallOfFame_tehranWeekKey_userId_key" ON "HallOfFame"("tehranWeekKey", "userId");

-- AddForeignKey
ALTER TABLE "HallOfFame" ADD CONSTRAINT "HallOfFame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
