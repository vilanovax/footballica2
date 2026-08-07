-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "newspaperReady" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "staminaFull" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "lastNewspaperPushAt" TIMESTAMP(3);
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "lastStaminaPushAt" TIMESTAMP(3);
