import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  ACHIEVEMENTS,
  type Achievement,
  type BadgeCategory,
  type BadgeTier,
} from "@/lib/game/achievements";
import type { BadgePresentation } from "@/lib/game/badgeTypes";

export type { BadgePresentation };

type Db = PrismaClient | Prisma.TransactionClient;

function fromAchievement(a: Achievement, sortOrder: number): BadgePresentation {
  return {
    slug: a.slug,
    nameEn: a.nameEn,
    nameFa: a.nameFa,
    descriptionEn: a.descriptionEn,
    descriptionFa: a.descriptionFa,
    emoji: a.emoji,
    imageUrl: null,
    rewardCoins: a.reward.coins,
    rewardXp: a.reward.xp,
    category: a.category,
    tier: a.tier,
    isSystem: true,
    isActive: true,
    sortOrder,
  };
}

/**
 * Ensure every code-catalog achievement has a BadgeDefinition row.
 * Idempotent — safe to call from admin pages and match settle.
 */
export async function ensureBadgeCatalog(db: Db = prisma): Promise<number> {
  const existing = await db.badgeDefinition.findMany({
    select: { slug: true },
  });
  const have = new Set(existing.map((r) => r.slug));
  const missing = ACHIEVEMENTS.filter((a) => !have.has(a.slug));
  if (missing.length === 0) return 0;

  await db.badgeDefinition.createMany({
    data: missing.map((a, i) => ({
      slug: a.slug,
      nameEn: a.nameEn,
      nameFa: a.nameFa,
      descriptionEn: a.descriptionEn,
      descriptionFa: a.descriptionFa,
      emoji: a.emoji,
      rewardCoins: a.reward.coins,
      rewardXp: a.reward.xp,
      category: a.category,
      tier: a.tier,
      isSystem: true,
      isActive: true,
      sortOrder: ACHIEVEMENTS.findIndex((x) => x.slug === a.slug) + 1 || i + 1,
    })),
    skipDuplicates: true,
  });
  return missing.length;
}

/** All active badge presentations (DB), falling back to code defaults. */
export async function listBadgePresentations(
  db: Db = prisma,
): Promise<BadgePresentation[]> {
  await ensureBadgeCatalog(db);
  const rows = await db.badgeDefinition.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });
  return rows.map((r) => ({
    slug: r.slug,
    nameEn: r.nameEn,
    nameFa: r.nameFa,
    descriptionEn: r.descriptionEn,
    descriptionFa: r.descriptionFa,
    emoji: r.emoji,
    imageUrl: r.imageUrl,
    rewardCoins: r.rewardCoins,
    rewardXp: r.rewardXp,
    category: r.category as BadgeCategory | "showcase",
    tier: r.tier as BadgeTier,
    isSystem: r.isSystem,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
  }));
}

/** Lookup map for a set of slugs (missing → code catalog fallback). */
export async function getBadgePresentationsBySlug(
  slugs: string[],
  db: Db = prisma,
): Promise<Map<string, BadgePresentation>> {
  const unique = [...new Set(slugs.filter(Boolean))];
  const map = new Map<string, BadgePresentation>();
  if (unique.length === 0) return map;

  await ensureBadgeCatalog(db);
  const rows = await db.badgeDefinition.findMany({
    where: { slug: { in: unique } },
  });
  for (const r of rows) {
    map.set(r.slug, {
      slug: r.slug,
      nameEn: r.nameEn,
      nameFa: r.nameFa,
      descriptionEn: r.descriptionEn,
      descriptionFa: r.descriptionFa,
      emoji: r.emoji,
      imageUrl: r.imageUrl,
      rewardCoins: r.rewardCoins,
      rewardXp: r.rewardXp,
      category: r.category as BadgeCategory | "showcase",
      tier: r.tier as BadgeTier,
      isSystem: r.isSystem,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
    });
  }
  for (const [i, a] of ACHIEVEMENTS.entries()) {
    if (unique.includes(a.slug) && !map.has(a.slug)) {
      map.set(a.slug, fromAchievement(a, i + 1));
    }
  }
  return map;
}

/** Merge code achievement unlock with DB presentation for payout + UI. */
export function applyPresentation(
  achievement: Achievement,
  presentation: BadgePresentation | undefined,
): Achievement & { imageUrl: string | null } {
  if (!presentation) {
    return { ...achievement, imageUrl: null };
  }
  return {
    ...achievement,
    nameEn: presentation.nameEn,
    nameFa: presentation.nameFa,
    descriptionEn: presentation.descriptionEn,
    descriptionFa: presentation.descriptionFa,
    emoji: presentation.emoji || achievement.emoji,
    tier: presentation.tier || achievement.tier,
    reward: {
      coins: presentation.rewardCoins,
      xp: presentation.rewardXp,
    },
    imageUrl: presentation.imageUrl,
  };
}
