-- Live-Ops theme week fields on RecordChallenge (Phase C).
ALTER TABLE "RecordChallenge" ADD COLUMN IF NOT EXISTS "themeKey" TEXT;
ALTER TABLE "RecordChallenge" ADD COLUMN IF NOT EXISTS "preferredTypes" JSONB;
ALTER TABLE "RecordChallenge" ADD COLUMN IF NOT EXISTS "formatBiasEveryN" INTEGER;
