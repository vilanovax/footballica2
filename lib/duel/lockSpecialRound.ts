import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { DuelRoundType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import type { LiveModeId } from "@/lib/game/economy";
import {
  isLiveModeEnabledInDuel,
  LIVE_MODE_TO_DUEL_TYPE,
} from "@/lib/game/liveModes";
import { requireUserClub } from "@/lib/player/current";
import { canUserAct, describeTurn } from "@/lib/duel";
import { duelHasSpecialRound } from "@/lib/duel/specialRounds";
import { memoryRoundCreateData } from "@/lib/duel/createMemoryRound";
import { starPathRoundCreateData } from "@/lib/duel/createStarPathRound";
import { mysteryRoundCreateData } from "@/lib/duel/createMysteryRound";
import { gridRoundCreateData } from "@/lib/duel/createGridRound";
import { tikiTakaRoundCreateData } from "@/lib/duel/createTikiTakaRound";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";

export type LockSpecialError =
  | "not_authenticated"
  | "not_found"
  | "not_your_turn"
  | "special_already_used"
  | "mode_disabled"
  | "already_locked"
  | "server_error";

export type LockSpecialResult =
  | {
      ok: true;
      duel: DuelSnapshot;
      roundType: DuelRoundType;
      boardJson: unknown;
      roundNumber: number;
    }
  | { ok: false; error: LockSpecialError };

/**
 * Convert the active QUIZ attack shell into a special round (once per duel).
 */
export async function lockDuelSpecialRound(
  duelId: string,
  mode: LiveModeId,
): Promise<LockSpecialResult> {
  void tickDuelJobs();

  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user } = pair;

  try {
    const config = await getGameConfig();
    if (!isLiveModeEnabledInDuel(mode, config)) {
      return { ok: false, error: "mode_disabled" };
    }

    const expectedType = LIVE_MODE_TO_DUEL_TYPE[mode];

    const duel = await prisma.duelMatch.findUnique({
      where: { id: duelId },
      include: duelSnapshotInclude,
    });
    if (!duel) return { ok: false, error: "not_found" };
    if (duel.timeoutUserId === user.id) {
      return { ok: false, error: "not_your_turn" };
    }

    if (
      !canUserAct({
        status: duel.status,
        userId: user.id,
        challengerId: duel.challengerId,
        opponentId: duel.opponentId,
      })
    ) {
      return { ok: false, error: "not_your_turn" };
    }

    const turn = describeTurn(duel.status);
    if (turn.kind !== "attack" || turn.roundNumber == null) {
      return { ok: false, error: "not_your_turn" };
    }

    const round = duel.rounds.find((r) => r.roundNumber === turn.roundNumber);
    if (!round) return { ok: false, error: "not_found" };

    if (round.attackSubmittedAt) {
      return { ok: false, error: "already_locked" };
    }

    // Idempotent reopen
    if (round.roundType === expectedType && round.boardJson) {
      return {
        ok: true,
        duel: toDuelSnapshot(duel, user.id, { liveModes: config.liveModes }),
        roundType: expectedType,
        boardJson: round.boardJson,
        roundNumber: round.roundNumber,
      };
    }

    if (duelHasSpecialRound(duel.rounds.filter((r) => r.id !== round.id))) {
      return { ok: false, error: "special_already_used" };
    }

    if (
      round.categoryId ||
      (Array.isArray(round.questionIds) &&
        (round.questionIds as unknown[]).length > 0)
    ) {
      return { ok: false, error: "already_locked" };
    }

    const create =
      mode === "memory"
        ? await memoryRoundCreateData({
            duelId: duel.id,
            attackerId: user.id,
            pairCount: config.duel.memoryPairs,
            roundNumber: round.roundNumber,
          })
        : mode === "starPath"
          ? await starPathRoundCreateData({
              duelId: duel.id,
              attackerId: user.id,
              roundNumber: round.roundNumber,
            })
          : mode === "mystery"
            ? await mysteryRoundCreateData({
                duelId: duel.id,
                attackerId: user.id,
                roundNumber: round.roundNumber,
              })
            : mode === "tikiTaka"
              ? await tikiTakaRoundCreateData({
                  duelId: duel.id,
                  attackerId: user.id,
                  roundNumber: round.roundNumber,
                })
              : await gridRoundCreateData({
                  duelId: duel.id,
                  attackerId: user.id,
                  roundNumber: round.roundNumber,
                });

    await prisma.duelRound.update({
      where: { id: round.id },
      data: {
        roundType: create.roundType,
        categoryId: null,
        questionIds: Prisma.DbNull,
        draftOptionIds: [],
        boardJson: create.boardJson,
        attackerId: user.id,
      },
    });

    const refreshed = await prisma.duelMatch.findUniqueOrThrow({
      where: { id: duel.id },
      include: duelSnapshotInclude,
    });

    return {
      ok: true,
      duel: toDuelSnapshot(refreshed, user.id, { liveModes: config.liveModes }),
      roundType: create.roundType,
      boardJson: create.boardJson,
      roundNumber: round.roundNumber,
    };
  } catch (err) {
    console.error("lockDuelSpecialRound failed", mode, err);
    return { ok: false, error: "server_error" };
  }
}
