"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import {
  buildMysteryShareCode,
  evaluateMysteryGuess,
  type MysteryGuessRecord,
} from "@/lib/mystery";
import { parseMysteryGuesses } from "@/lib/mystery/parse";
import {
  ensureTodayMysteryPuzzle,
  maxGuessesFromConfig,
} from "@/lib/mystery/puzzle";
import { computeMysteryStreakUpdate } from "@/lib/mystery/streak";
import {
  getMysteryPlayer,
  listMysteryOptions,
} from "@/lib/mystery/players";
import {
  evaluateAchievements,
  type Achievement,
} from "@/lib/game/achievements";
import {
  applyPresentation,
  getBadgePresentationsBySlug,
} from "@/lib/game/badgeCatalog";
import { calculateLevel } from "@/lib/game/economy";
import type { UnlockedBadge } from "@/actions/resolveMatch";
import type { DailyMysterySnapshot } from "./getDailyMystery";

export type SubmitMysteryGuessResult =
  | {
      ok: true;
      mystery: DailyMysterySnapshot;
      unlockedBadges: UnlockedBadge[];
    }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "unknown_player"
        | "already_done"
        | "duplicate_guess"
        | "unknown";
    };

function toUnlocked(
  a: Achievement & { imageUrl: string | null },
): UnlockedBadge {
  return {
    slug: a.slug,
    emoji: a.emoji,
    imageUrl: a.imageUrl,
    nameEn: a.nameEn,
    nameFa: a.nameFa,
    descriptionEn: a.descriptionEn,
    descriptionFa: a.descriptionFa,
    tier: a.tier,
    coins: a.reward.coins,
    xp: a.reward.xp,
  };
}

export async function submitMysteryGuess(
  playerId: string,
): Promise<SubmitMysteryGuessResult> {
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "unauthenticated" };
    const { user, club } = pair;

    const guessed = await getMysteryPlayer(playerId, prisma);
    if (!guessed) return { ok: false, error: "unknown_player" };

    const result = await prisma.$transaction(async (tx) => {
      const puzzle = await ensureTodayMysteryPuzzle(tx);
      const maxGuesses = maxGuessesFromConfig(puzzle.config);
      const target = await getMysteryPlayer(puzzle.targetPlayerId, tx);
      if (!target) throw new Error("puzzle_target_missing");

      const attempt = await tx.dailyMysteryAttempt.upsert({
        where: {
          clubId_puzzleId: { clubId: club.id, puzzleId: puzzle.id },
        },
        create: { clubId: club.id, puzzleId: puzzle.id },
        update: {},
      });

      if (attempt.status !== "IN_PROGRESS") {
        return { kind: "already_done" as const };
      }

      const guesses = parseMysteryGuesses(attempt.guesses);
      if (guesses.some((g) => g.playerId === guessed.id)) {
        return { kind: "duplicate" as const };
      }

      const now = new Date();
      const row = evaluateMysteryGuess(guessed, target, now);
      const nextGuesses: MysteryGuessRecord[] = [...guesses, row];
      const guessCount = nextGuesses.length;

      let status: "IN_PROGRESS" | "SOLVED" | "FAILED" = "IN_PROGRESS";
      let solvedAt: Date | null = null;
      let shareCode: string | null = attempt.shareCode;
      let mysteryStreak = club.mysteryStreak;
      let longestMysteryStreak = club.longestMysteryStreak;
      let mysterySolves = club.mysterySolves;
      let unlockedBadges: UnlockedBadge[] = [];

      if (row.isCorrect) {
        status = "SOLVED";
        solvedAt = now;
        shareCode = buildMysteryShareCode(nextGuesses);
        const upd = computeMysteryStreakUpdate(
          {
            mysteryStreak: club.mysteryStreak,
            longestMysteryStreak: club.longestMysteryStreak,
            lastMysteryDate: club.lastMysteryDate,
          },
          now,
        );
        mysteryStreak = upd.mysteryStreak;
        longestMysteryStreak = upd.longestMysteryStreak;
        mysterySolves = club.mysterySolves + 1;

        const owned = await tx.clubBadge.findMany({
          where: { clubId: club.id },
          select: { badgeSlug: true },
        });
        const ownedSlugs = new Set(owned.map((b) => b.badgeSlug));
        const rawUnlocked = evaluateAchievements(
          {
            match: {
              combo: 0,
              goals: 0,
              total: 0,
              won: true,
              perfect: guessCount === 1,
              usedHelp: false,
              isTutorial: false,
            },
            player: {
              matchesPlayed: club.matchesPlayed,
              matchesWon: club.matchesWon,
              goalsTotal: club.goalsTotal,
              highestCombo: club.highestCombo,
              dailyStreak: club.dailyStreak,
              longestDailyStreak: club.longestDailyStreak,
              mysteryStreak,
              longestMysteryStreak,
              mysterySolves,
            },
          },
          ownedSlugs,
        ).filter((a) => a.slug.startsWith("mystery_"));

        const presentations = await getBadgePresentationsBySlug(
          rawUnlocked.map((a) => a.slug),
          tx,
        );
        const newlyUnlocked = rawUnlocked
          .map((a) => applyPresentation(a, presentations.get(a.slug)))
          .filter((a) => {
            const row = presentations.get(a.slug);
            return row ? row.isActive : true;
          });

        const badgeCoins = newlyUnlocked.reduce((n, a) => n + a.reward.coins, 0);
        const badgeXp = newlyUnlocked.reduce((n, a) => n + a.reward.xp, 0);
        const newXp = user.xp + badgeXp;
        const levelInfo = calculateLevel(newXp);

        await tx.club.update({
          where: { id: club.id },
          data: {
            mysteryStreak,
            longestMysteryStreak,
            lastMysteryDate: upd.lastMysteryDate,
            mysterySolves,
            ...(badgeCoins > 0 ? { coins: { increment: badgeCoins } } : {}),
          },
        });

        if (badgeXp > 0) {
          await tx.user.update({
            where: { id: user.id },
            data: {
              xp: { increment: badgeXp },
              weeklyXp: { increment: badgeXp },
              managerLevel: levelInfo.level,
            },
          });
        }

        if (newlyUnlocked.length > 0) {
          await tx.clubBadge.createMany({
            data: newlyUnlocked.map((a) => ({
              clubId: club.id,
              badgeSlug: a.slug,
              coinsAwarded: a.reward.coins,
              xpAwarded: a.reward.xp,
            })),
          });
          unlockedBadges = newlyUnlocked.map(toUnlocked);
        }
      } else if (guessCount >= maxGuesses) {
        status = "FAILED";
        shareCode = buildMysteryShareCode(nextGuesses);
      }

      const updated = await tx.dailyMysteryAttempt.update({
        where: { id: attempt.id },
        data: {
          status,
          guessCount,
          guesses: nextGuesses as unknown as Prisma.InputJsonValue,
          shareCode,
          solvedAt,
        },
      });

      return {
        kind: "ok" as const,
        attempt: updated,
        puzzle,
        maxGuesses,
        guesses: nextGuesses,
        mysteryStreak,
        longestMysteryStreak,
        target,
        unlockedBadges,
      };
    });

    if (result.kind === "already_done") {
      return { ok: false, error: "already_done" };
    }
    if (result.kind === "duplicate") {
      return { ok: false, error: "duplicate_guess" };
    }

    const terminal =
      result.attempt.status === "SOLVED" || result.attempt.status === "FAILED";

    revalidatePath("/play");
    revalidatePath("/play/mystery");
    revalidatePath("/club");
    revalidatePath("/profile");

    return {
      ok: true,
      unlockedBadges: result.unlockedBadges,
      mystery: {
        dateKey: result.puzzle.dateKey,
        maxGuesses: result.maxGuesses,
        status: result.attempt.status,
        guessCount: result.attempt.guessCount,
        guesses: result.guesses,
        shareCode: result.attempt.shareCode,
        answer: terminal
          ? {
              id: result.target.id,
              nameEn: result.target.nameEn,
              nameFa: result.target.nameFa,
            }
          : null,
        mysteryStreak: result.mysteryStreak,
        longestMysteryStreak: result.longestMysteryStreak,
        options: await listMysteryOptions(prisma),
      },
    };
  } catch (err) {
    console.error("[submitMysteryGuess]", err);
    return { ok: false, error: "unknown" };
  }
}
