"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import {
  ensureTodayGridPuzzle,
  maxMistakesFromConfig,
} from "@/lib/grid/puzzle";
import {
  filledCount,
  parseCellsJson,
  parseGridAxes,
  parseGuessesJson,
} from "@/lib/grid/parse";
import { playerMatchesCell } from "@/lib/grid/rules";
import { buildGridShareCode } from "@/lib/grid/share";
import { computeGridStreakUpdate } from "@/lib/grid/streak";
import { cellKey, GRID_SIZE } from "@/lib/grid/types";
import type { DailyGridSnapshot } from "./getDailyGrid";
import { listMysteryOptions } from "@/lib/mystery/players";
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

export type SubmitGridGuessResult =
  | {
      ok: true;
      grid: DailyGridSnapshot;
      correct: boolean;
      unlockedBadges: UnlockedBadge[];
    }
  | { ok: false; error: string };

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

export async function submitGridGuess(input: {
  row: number;
  col: number;
  playerId: string;
}): Promise<SubmitGridGuessResult> {
  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  const row = Math.floor(input.row);
  const col = Math.floor(input.col);
  const playerId =
    typeof input.playerId === "string" ? input.playerId.trim() : "";
  if (
    !playerId ||
    row < 0 ||
    col < 0 ||
    row >= GRID_SIZE ||
    col >= GRID_SIZE
  ) {
    return { ok: false, error: "invalid_input" };
  }

  const result = await prisma.$transaction(async (tx) => {
    const club = await tx.club.findUniqueOrThrow({
      where: { id: pair.club.id },
    });
    const puzzle = await ensureTodayGridPuzzle(tx);
    const rows = parseGridAxes(puzzle.rowsJson);
    const cols = parseGridAxes(puzzle.colsJson);
    if (!rows || !cols) return { error: "invalid_puzzle" as const };

    const attempt = await tx.dailyGridAttempt.upsert({
      where: {
        clubId_puzzleId: { clubId: club.id, puzzleId: puzzle.id },
      },
      create: { clubId: club.id, puzzleId: puzzle.id },
      update: {},
    });

    if (attempt.status !== "IN_PROGRESS") {
      return { error: "already_done" as const };
    }

    const cells = parseCellsJson(attempt.cellsJson);
    const key = cellKey(row, col);
    if (cells[key]) return { error: "cell_filled" as const };

    const used = new Set(
      Object.values(cells)
        .map((c) => c?.playerId)
        .filter(Boolean),
    );
    if (used.has(playerId)) return { error: "duplicate_player" as const };

    const player = await tx.footballPlayer.findFirst({
      where: { slug: playerId, isActive: true },
    });
    if (!player) return { error: "unknown_player" as const };

    const maxMistakes = maxMistakesFromConfig(puzzle.config);
    const matches = playerMatchesCell(
      {
        league: player.league,
        position: player.position,
        nationalityCode: player.nationalityCode,
        club: player.club,
      },
      rows[row]!,
      cols[col]!,
    );

    const guesses = parseGuessesJson(attempt.guessesJson);
    let mistakeCount = attempt.mistakeCount;
    let status: "IN_PROGRESS" | "SOLVED" | "FAILED" = attempt.status;
    let shareCode = attempt.shareCode;
    let solvedAt = attempt.solvedAt;
    let gridStreak = club.gridStreak;
    let correct = false;
    let unlockedBadges: UnlockedBadge[] = [];

    if (matches) {
      correct = true;
      cells[key] = {
        playerId: player.slug,
        nameEn: player.nameEn,
        nameFa: player.nameFa,
      };
      const filled = filledCount(cells);
      if (filled >= GRID_SIZE * GRID_SIZE) {
        status = "SOLVED";
        solvedAt = new Date();
        shareCode = buildGridShareCode(cells);
        const streak = computeGridStreakUpdate({
          gridStreak: club.gridStreak,
          longestGridStreak: club.longestGridStreak,
          lastGridDate: club.lastGridDate,
        });
        gridStreak = streak.gridStreak;
        const gridSolves = club.gridSolves + (streak.isNewDay ? 1 : 0);

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
              perfect: mistakeCount === 0,
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
              mysteryStreak: club.mysteryStreak,
              longestMysteryStreak: club.longestMysteryStreak,
              mysterySolves: club.mysterySolves,
              gridStreak,
              longestGridStreak: streak.longestGridStreak,
              gridSolves,
            },
          },
          ownedSlugs,
        ).filter((a) => a.slug.startsWith("grid_"));

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
            gridStreak: streak.gridStreak,
            longestGridStreak: streak.longestGridStreak,
            lastGridDate: streak.lastGridDate,
            ...(streak.isNewDay ? { gridSolves: { increment: 1 } } : {}),
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
      }
    } else {
      mistakeCount += 1;
      guesses.push({
        playerId: player.slug,
        row,
        col,
        at: new Date().toISOString(),
      });
      if (mistakeCount >= maxMistakes) {
        status = "FAILED";
        shareCode = buildGridShareCode(cells);
      }
    }

    const updated = await tx.dailyGridAttempt.update({
      where: { id: attempt.id },
      data: {
        cellsJson: cells,
        guessesJson: guesses,
        mistakeCount,
        status,
        shareCode,
        solvedAt,
      },
    });

    const options = await listMysteryOptions(tx);
    return {
      correct,
      unlockedBadges,
      grid: {
        dateKey: puzzle.dateKey,
        status: updated.status,
        rows,
        cols,
        cells,
        mistakeCount: updated.mistakeCount,
        maxMistakes,
        filled: filledCount(cells),
        totalCells: GRID_SIZE * GRID_SIZE,
        shareCode: updated.shareCode,
        gridStreak,
        options,
      } satisfies DailyGridSnapshot,
    };
  });

  if ("error" in result && result.error) {
    return { ok: false, error: result.error };
  }
  if (!("grid" in result) || !result.grid) {
    return { ok: false, error: "err_generic" };
  }

  revalidatePath("/play");
  revalidatePath("/play/grid");
  revalidatePath("/club");
  revalidatePath("/profile");
  return {
    ok: true,
    grid: result.grid,
    correct: Boolean(result.correct),
    unlockedBadges: result.unlockedBadges ?? [],
  };
}
