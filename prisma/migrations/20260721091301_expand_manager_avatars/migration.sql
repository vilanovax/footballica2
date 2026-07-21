-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ManagerAvatar" ADD VALUE 'GOALKEEPER_LEGEND';
ALTER TYPE "ManagerAvatar" ADD VALUE 'SUPER_FAN';
ALTER TYPE "ManagerAvatar" ADD VALUE 'CLUB_LEGEND';
ALTER TYPE "ManagerAvatar" ADD VALUE 'OLD_GAFFER';
