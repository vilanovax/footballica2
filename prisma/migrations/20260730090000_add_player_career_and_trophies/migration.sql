-- AlterTable
ALTER TABLE "FootballPlayer" ADD COLUMN "pastClubs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "trophies" JSONB NOT NULL DEFAULT '[]';
