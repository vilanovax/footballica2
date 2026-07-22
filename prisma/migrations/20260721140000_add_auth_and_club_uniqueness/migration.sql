-- AlterTable: add phone auth identity (nullable for mock leaderboard bots)
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AlterTable: add normalized club name as nullable first, then backfill
ALTER TABLE "Club" ADD COLUMN "nameNormalized" TEXT;

-- Backfill: lowercase + collapse whitespace; uniquify collisions with id suffix
UPDATE "Club"
SET "nameNormalized" = lower(regexp_replace(trim("name"), '\s+', ' ', 'g'));

UPDATE "Club" AS c
SET "nameNormalized" = c."nameNormalized" || '-' || right(c."id", 6)
WHERE c."id" IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY "nameNormalized"
             ORDER BY "createdAt" ASC
           ) AS rn
    FROM "Club"
  ) ranked
  WHERE rn > 1
);

-- Enforce NOT NULL + unique
ALTER TABLE "Club" ALTER COLUMN "nameNormalized" SET NOT NULL;
CREATE UNIQUE INDEX "Club_nameNormalized_key" ON "Club"("nameNormalized");
