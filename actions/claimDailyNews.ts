"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import {
  BOOSTER_DURATION_HOURS,
  canClaimNews,
  newspaperEventById,
  pickRandomEvent,
  type BoosterType,
} from "@/lib/boosters/boosters";

export type NewsPayload = {
  type: BoosterType;
  multiplier: number;
  emoji: string;
  /** Translation key (news.events.*) — falls back to raw text if unknown. */
  headline: string;
  expiresAt: string;
};

/**
 * - `fresh`   → a new booster was just granted.
 * - `active`  → today's booster is still running; re-displayed (no new claim).
 * - `cooldown`→ already claimed today, nothing active; come back tomorrow.
 */
export type NewsState = "fresh" | "active" | "cooldown";

export type ClaimNewsResult =
  | { ok: true; state: NewsState; news: NewsPayload | null }
  | { ok: false; error: string };

/**
 * Daily Newspaper claim. One booster per calendar day. If a booster is already
 * running we re-show it (never stack); if today's claim is spent we return a
 * cooldown so the UI can say "come back tomorrow".
 */
export async function claimDailyNews(): Promise<ClaimNewsResult> {
  try {
    const result = await prisma.$transaction(
      async (tx): Promise<{ state: NewsState; news: NewsPayload | null }> => {
        const pair = await requireUserClub(tx);
        if (!pair) throw new Error("Not authenticated.");
        const { club } = pair;
        const now = new Date();

        // Re-display a still-running booster without consuming a claim.
        const existing = await tx.activeBooster.findFirst({
          where: { clubId: club.id, expiresAt: { gt: now } },
          orderBy: { expiresAt: "desc" },
        });

        if (existing) {
          const catalog = newspaperEventById(existing.headline);
          return {
            state: "active",
            news: {
              type: existing.type as BoosterType,
              multiplier: existing.multiplier,
              emoji: catalog?.emoji ?? "📰",
              headline: existing.headline,
              expiresAt: existing.expiresAt.toISOString(),
            },
          };
        }

        // No active booster → enforce the once-per-day gate.
        if (!canClaimNews(club.lastNewsClaim, now)) {
          return { state: "cooldown", news: null };
        }

        const event = pickRandomEvent();
        const expiresAt = new Date(
          now.getTime() + BOOSTER_DURATION_HOURS * 60 * 60 * 1000,
        );

        const created = await tx.activeBooster.create({
          data: {
            clubId: club.id,
            type: event.type,
            multiplier: event.multiplier,
            // Stored as a translation key so the headline localizes on read.
            headline: event.id,
            expiresAt,
          },
        });

        await tx.club.update({
          where: { id: club.id },
          data: { lastNewsClaim: now },
        });

        return {
          state: "fresh",
          news: {
            type: event.type,
            multiplier: event.multiplier,
            emoji: event.emoji,
            headline: event.id,
            expiresAt: created.expiresAt.toISOString(),
          },
        };
      },
    );

    revalidatePath("/club");
    return { ok: true, state: result.state, news: result.news };
  } catch (err) {
    console.error("claimDailyNews failed", err);
    return { ok: false, error: "Could not fetch today's news." };
  }
}
