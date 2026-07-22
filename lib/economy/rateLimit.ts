import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

/** Mock IAP: max successful pack purchases per club per rolling day. */
export const MAX_COIN_PACKS_PER_DAY = 10;

/** Admin CMS: max manual grants per club per rolling day. */
export const MAX_ADMIN_GRANTS_PER_DAY = 30;

/** Soft-currency stamina refill: min seconds between purchases. */
export const STAMINA_REFILL_COOLDOWN_SEC = 20;

const staminaCooldownUntil = new Map<string, number>();

function since24h(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

export async function countRecentCoinPacks(
  clubId: string,
  db: Db = prisma,
): Promise<number> {
  return db.purchaseLog.count({
    where: {
      clubId,
      status: "SUCCESS",
      createdAt: { gte: since24h() },
    },
  });
}

export async function countRecentAdminGrants(
  clubId: string,
  db: Db = prisma,
): Promise<number> {
  return db.adminCoinGrant.count({
    where: {
      clubId,
      createdAt: { gte: since24h() },
    },
  });
}

/** Best-effort in-process cooldown (resets per serverless instance). */
export function assertStaminaRefillCooldown(clubId: string): boolean {
  const now = Date.now();
  const until = staminaCooldownUntil.get(clubId) ?? 0;
  if (now < until) return false;
  staminaCooldownUntil.set(
    clubId,
    now + STAMINA_REFILL_COOLDOWN_SEC * 1000,
  );
  // Prevent unbounded growth in long-lived Node processes.
  if (staminaCooldownUntil.size > 5_000) {
    for (const [id, ts] of staminaCooldownUntil) {
      if (ts < now) staminaCooldownUntil.delete(id);
    }
  }
  return true;
}

/** Roll back cooldown after a failed refill attempt. */
export function clearStaminaRefillCooldown(clubId: string): void {
  staminaCooldownUntil.delete(clubId);
}
