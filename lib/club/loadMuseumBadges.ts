import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import type { MuseumBadgeRef } from "@/lib/club/museumTrophies";

type Db = PrismaClient | Prisma.TransactionClient;

const CODE_BY_SLUG = new Map(ACHIEVEMENTS.map((a) => [a.slug, a]));

/**
 * Resolve owned ClubBadge rows → Museum trophy refs (tier / category).
 * Challenge badges without a definition count as gold + showcase.
 */
export async function loadMuseumBadgeRefs(
  clubId: string,
  db: Db,
): Promise<MuseumBadgeRef[]> {
  const owned = await db.clubBadge.findMany({
    where: { clubId },
    select: {
      badgeSlug: true,
      sourceChallengeId: true,
    },
  });
  if (owned.length === 0) return [];

  const slugs = owned.map((b) => b.badgeSlug);
  const defs = await db.badgeDefinition.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, tier: true, category: true },
  });
  const defBySlug = new Map(defs.map((d) => [d.slug, d]));

  return owned.map((b) => {
    const def = defBySlug.get(b.badgeSlug);
    if (def) {
      return {
        slug: b.badgeSlug,
        tier: def.tier,
        category: def.category,
        fromChallenge: Boolean(b.sourceChallengeId),
      };
    }
    const code = CODE_BY_SLUG.get(b.badgeSlug);
    if (code) {
      return {
        slug: b.badgeSlug,
        tier: code.tier,
        category: code.category,
        fromChallenge: Boolean(b.sourceChallengeId),
      };
    }
    // Premium challenge showcase without a BadgeDefinition row yet.
    return {
      slug: b.badgeSlug,
      tier: "gold",
      category: "showcase",
      fromChallenge: true,
    };
  });
}
