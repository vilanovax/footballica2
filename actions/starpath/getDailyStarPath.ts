"use server";

import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import { listMysteryOptions } from "@/lib/mystery/players";
import {
  ensureTodayStarPathPuzzle,
  maxCluesFromConfig,
  parsePathJson,
  parseStarPathGuesses,
  type StarPathAttemptStatus,
  type StarPathClubStep,
  type StarPathGuessRecord,
  type StarPathPlayerOption,
} from "@/lib/starpath";

export type DailyStarPathSnapshot = {
  dateKey: string;
  maxClues: number;
  status: StarPathAttemptStatus;
  cluesRevealed: number;
  score: number;
  /** Clubs visible to the player (length === cluesRevealed while playing). */
  visiblePath: StarPathClubStep[];
  /** Full path — only when terminal. */
  fullPath: StarPathClubStep[] | null;
  guesses: StarPathGuessRecord[];
  shareCode: string | null;
  answer: { id: string; nameEn: string; nameFa: string } | null;
  starPathStreak: number;
  longestStarPathStreak: number;
  options: StarPathPlayerOption[];
};

export type GetDailyStarPathResult =
  | { ok: true; starPath: DailyStarPathSnapshot }
  | { ok: false; error: "unauthenticated" | "no_club" | "unknown" };

export async function getDailyStarPath(): Promise<GetDailyStarPathResult> {
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "unauthenticated" };
    const { club } = pair;

    const puzzle = await ensureTodayStarPathPuzzle(prisma);
    const maxClues = maxCluesFromConfig(puzzle.config);
    const path = parsePathJson(puzzle.pathJson);

    let attempt = await prisma.dailyStarPathAttempt.findUnique({
      where: {
        clubId_puzzleId: { clubId: club.id, puzzleId: puzzle.id },
      },
    });

    if (!attempt) {
      attempt = await prisma.dailyStarPathAttempt.create({
        data: {
          clubId: club.id,
          puzzleId: puzzle.id,
          cluesRevealed: 1,
        },
      });
    }

    const terminal =
      attempt.status === "SOLVED" || attempt.status === "FAILED";
    const clues = Math.min(
      maxClues,
      Math.max(1, attempt.cluesRevealed),
    );
    const target = await prisma.footballPlayer.findUnique({
      where: { slug: puzzle.targetPlayerId },
      select: { slug: true, nameEn: true, nameFa: true },
    });
    const options = await listMysteryOptions(prisma);

    return {
      ok: true,
      starPath: {
        dateKey: puzzle.dateKey,
        maxClues,
        status: attempt.status,
        cluesRevealed: clues,
        score: attempt.score,
        visiblePath: terminal ? path : path.slice(0, clues),
        fullPath: terminal ? path : null,
        guesses: parseStarPathGuesses(attempt.guessesJson),
        shareCode: attempt.shareCode,
        answer:
          terminal && target
            ? {
                id: target.slug,
                nameEn: target.nameEn,
                nameFa: target.nameFa,
              }
            : null,
        starPathStreak: club.starPathStreak,
        longestStarPathStreak: club.longestStarPathStreak,
        options: options.map((o) => ({
          id: o.id,
          nameEn: o.nameEn,
          nameFa: o.nameFa,
          club: o.club,
        })),
      },
    };
  } catch (err) {
    console.error("[getDailyStarPath]", err);
    return { ok: false, error: "unknown" };
  }
}
