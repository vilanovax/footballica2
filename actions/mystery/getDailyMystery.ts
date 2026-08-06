"use server";

import { prisma } from "@/lib/prisma";
import { requireUserClub } from "@/lib/player/current";
import type {
  MysteryAttemptStatus,
  MysteryGuessRecord,
  MysteryPlayerOption,
} from "@/lib/mystery/types";
import { parseMysteryGuesses } from "@/lib/mystery/parse";
import {
  ensureTodayMysteryPuzzle,
  maxGuessesFromConfig,
} from "@/lib/mystery/puzzle";
import {
  getMysteryPlayer,
  listMysteryOptions,
} from "@/lib/mystery/players";

export type DailyMysterySnapshot = {
  dateKey: string;
  maxGuesses: number;
  status: MysteryAttemptStatus;
  guessCount: number;
  guesses: MysteryGuessRecord[];
  shareCode: string | null;
  /** Revealed only when attempt is terminal. */
  answer: { id: string; nameEn: string; nameFa: string } | null;
  mysteryStreak: number;
  longestMysteryStreak: number;
  options: MysteryPlayerOption[];
};

export type GetDailyMysteryResult =
  | { ok: true; mystery: DailyMysterySnapshot }
  | { ok: false; error: "unauthenticated" | "no_club" | "unknown" };

export async function getDailyMystery(): Promise<GetDailyMysteryResult> {
  try {
    const pair = await requireUserClub();
    if (!pair) return { ok: false, error: "unauthenticated" };
    const { club } = pair;

    const puzzle = await ensureTodayMysteryPuzzle(prisma);
    const maxGuesses = maxGuessesFromConfig(puzzle.config);

    let attempt = await prisma.dailyMysteryAttempt.findUnique({
      where: {
        clubId_puzzleId: { clubId: club.id, puzzleId: puzzle.id },
      },
    });

    if (!attempt) {
      attempt = await prisma.dailyMysteryAttempt.create({
        data: {
          clubId: club.id,
          puzzleId: puzzle.id,
        },
      });
    }

    const guesses = parseMysteryGuesses(attempt.guesses);
    const terminal =
      attempt.status === "SOLVED" || attempt.status === "FAILED";
    const target = await getMysteryPlayer(puzzle.targetPlayerId, prisma);
    const options = await listMysteryOptions(prisma);

    return {
      ok: true,
      mystery: {
        dateKey: puzzle.dateKey,
        maxGuesses,
        status: attempt.status,
        guessCount: attempt.guessCount,
        guesses,
        shareCode: attempt.shareCode,
        answer:
          terminal && target
            ? { id: target.id, nameEn: target.nameEn, nameFa: target.nameFa }
            : null,
        mysteryStreak: club.mysteryStreak,
        longestMysteryStreak: club.longestMysteryStreak,
        options,
      },
    };
  } catch (err) {
    console.error("[getDailyMystery]", err);
    return { ok: false, error: "unknown" };
  }
}
