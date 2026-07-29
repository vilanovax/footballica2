"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { isRecordChallengeLive } from "@/lib/game/recordChallenge";

export type UnlockRecordChallengeResult =
  | {
      ok: true;
      challengeId: string;
      coinsSpent: number;
      balances: { coins: number };
    }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "not_found"
        | "not_live"
        | "already_unlocked"
        | "not_enough_coins"
        | "unlock_failed";
    };

/**
 * Hybrid economy — one-time unlockCostCoins. Subsequent Survival runs
 * inside the challenge only spend SURVIVAL_STAMINA_COST (on settle).
 */
export async function unlockRecordChallenge(
  challengeId: string,
): Promise<UnlockRecordChallengeResult> {
  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { club } = pair;

  const id = typeof challengeId === "string" ? challengeId.trim() : "";
  if (!id) return { ok: false, error: "not_found" };

  try {
    const challenge = await prisma.recordChallenge.findUnique({
      where: { id },
    });
    if (!challenge) return { ok: false, error: "not_found" };
    if (!isRecordChallengeLive(challenge)) {
      return { ok: false, error: "not_live" };
    }

    const existing = await prisma.clubChallengeAccess.findUnique({
      where: {
        clubId_challengeId: { clubId: club.id, challengeId: id },
      },
    });
    if (existing) return { ok: false, error: "already_unlocked" };

    const cost = Math.max(0, challenge.unlockCostCoins);
    if (club.coins < cost) return { ok: false, error: "not_enough_coins" };

    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.club.findUniqueOrThrow({
        where: { id: club.id },
        select: { coins: true },
      });
      if (fresh.coins < cost) {
        throw new Error("not_enough_coins");
      }

      const updated = await tx.club.update({
        where: { id: club.id },
        data: { coins: { decrement: cost } },
        select: { coins: true },
      });

      await tx.clubChallengeAccess.create({
        data: {
          clubId: club.id,
          challengeId: id,
          coinsSpent: cost,
        },
      });

      await tx.clubChallengeRun.upsert({
        where: {
          clubId_challengeId: { clubId: club.id, challengeId: id },
        },
        create: {
          clubId: club.id,
          challengeId: id,
        },
        update: {},
      });

      return updated;
    });

    revalidatePath("/play");
    revalidatePath("/club");
    revalidatePath("/profile");

    return {
      ok: true,
      challengeId: id,
      coinsSpent: cost,
      balances: { coins: result.coins },
    };
  } catch (err) {
    if (err instanceof Error && err.message === "not_enough_coins") {
      return { ok: false, error: "not_enough_coins" };
    }
    console.error("[unlockRecordChallenge]", err);
    return { ok: false, error: "unlock_failed" };
  }
}

export type ListRecordChallengesResult =
  | {
      ok: true;
      challenges: Array<{
        id: string;
        slug: string;
        titleEn: string;
        titleFa: string;
        descriptionEn: string;
        descriptionFa: string;
        unlockCostCoins: number;
        targetScore: number;
        rewardBadgeSlug: string | null;
        rewardBadgeEmoji: string | null;
        themeKey: string | null;
        /** Assigned banks — empty = any public. length===1 → skip picker. */
        categoryIds: string[];
        expiresAt: Date | null;
        unlocked: boolean;
        bestScore: number;
        conquered: boolean;
      }>;
    }
  | { ok: false; error: "not_authenticated" | "server_error" };

/** Active Live-Ops premium challenges for the current club. */
export async function listRecordChallenges(): Promise<ListRecordChallengesResult> {
  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };

  try {
    const now = new Date();
    const rows = await prisma.recordChallenge.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { expiresAt: "asc" },
      include: {
        categories: { select: { categoryId: true } },
        access: {
          where: { clubId: pair.club.id },
          take: 1,
        },
        runs: {
          where: { clubId: pair.club.id },
          take: 1,
        },
      },
    });

    return {
      ok: true,
      challenges: rows.map((c) => ({
        id: c.id,
        slug: c.slug,
        titleEn: c.titleEn,
        titleFa: c.titleFa,
        descriptionEn: c.descriptionEn,
        descriptionFa: c.descriptionFa,
        unlockCostCoins: c.unlockCostCoins,
        targetScore: c.targetScore,
        rewardBadgeSlug: c.rewardBadgeSlug,
        rewardBadgeEmoji: c.rewardBadgeEmoji,
        themeKey: c.themeKey,
        categoryIds: c.categories.map((l) => l.categoryId),
        expiresAt: c.expiresAt,
        unlocked: c.access.length > 0,
        bestScore: c.runs[0]?.bestScore ?? 0,
        conquered: Boolean(c.runs[0]?.conqueredAt),
      })),
    };
  } catch (err) {
    console.error("[listRecordChallenges]", err);
    return { ok: false, error: "server_error" };
  }
}
