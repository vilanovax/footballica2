"use server";

import { prisma } from "@/lib/prisma";
import { getGameConfig } from "@/lib/game/gameConfig";
import { computeStaminaRegen } from "@/lib/club/stamina";
import { requireUserClub } from "@/lib/player/current";
import {
  pickDraftCategories,
  listDuelEligibleCategories,
} from "@/lib/duel/draw";
import {
  absorbMatchingIfPossible,
  claimOpenMatchingDuel,
} from "@/lib/duel/matchmaking";
import { tickDuelJobs } from "@/lib/duel/jobs";
import { toDuelSnapshot, type DuelSnapshot } from "@/lib/duel/snapshot";
import { duelSnapshotInclude } from "@/lib/duel/include";

export type StartDuelResult =
  | { ok: true; duel: DuelSnapshot }
  | {
      ok: false;
      error:
        | "not_authenticated"
        | "no_stamina"
        | "not_enough_categories"
        | "server_error";
    };

/**
 * Open a Draft Duel:
 * 1) Claim an open MATCHING human duel if one exists.
 * 2) Otherwise enqueue as MATCHING (bot fallback after matchmakingMs).
 */
export async function startDuel(): Promise<StartDuelResult> {
  try {
    await tickDuelJobs();
  } catch (err) {
    console.error("tickDuelJobs in startDuel", err);
  }

  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  const { user, club } = pair;

  const config = await getGameConfig();
  const now = new Date();

  try {
    // Prefer pairing with a waiting human.
    const joinedId = await claimOpenMatchingDuel({
      userId: user.id,
      clubId: club.id,
      staminaCost: config.duel.staminaCost,
      turnHours: config.duel.turnHours,
      now,
    });

    if (joinedId) {
      const duel = await prisma.duelMatch.findUniqueOrThrow({
        where: { id: joinedId },
        include: duelSnapshotInclude,
      });
      const cats = await listDuelEligibleCategories();
      const r1 = duel.rounds.find((r) => r.roundNumber === 1);
      const draftIds = Array.isArray(r1?.draftOptionIds)
        ? (r1!.draftOptionIds as string[])
        : [];
      const draftOptions = cats.filter((c) => draftIds.includes(c.id));
      return {
        ok: true,
        duel: toDuelSnapshot(duel, user.id, draftOptions),
      };
    }

    const draft = await pickDraftCategories(config.duel.draftChoices);

    const created = await prisma.$transaction(async (tx) => {
      const live = await tx.club.findUniqueOrThrow({ where: { id: club.id } });
      const regen = computeStaminaRegen(live, now);
      if (regen.stamina < config.duel.staminaCost) {
        throw new Error("no_stamina");
      }

      const spent = regen.stamina - config.duel.staminaCost;
      const staminaAnchor =
        regen.stamina >= live.maxStamina ? now : regen.lastStaminaUpdate;

      await tx.club.update({
        where: { id: club.id },
        data: {
          stamina: spent,
          lastStaminaUpdate: staminaAnchor,
        },
      });

      const duel = await tx.duelMatch.create({
        data: {
          challengerId: user.id,
          opponentId: null,
          isBotOpponent: false,
          status: "MATCHING",
          turnUserId: null,
          // Search window — cron / tick assigns a bot when this elapses.
          turnDeadlineAt: new Date(now.getTime() + config.duel.matchmakingMs),
          staminaSpent: config.duel.staminaCost,
          rounds: {
            create: {
              roundNumber: 1,
              attackerId: user.id,
              draftOptionIds: draft.map((c) => c.id),
            },
          },
        },
        include: {
          rounds: {
            include: { category: true },
            orderBy: { roundNumber: "asc" },
          },
        },
      });

      return duel;
    });

    // Fix double-enqueue race: absorb into an older waiting human if one appeared.
    const liveId = await absorbMatchingIfPossible({
      myDuelId: created.id,
      userId: user.id,
      turnHours: config.duel.turnHours,
      now,
    });

    const duel = await prisma.duelMatch.findUniqueOrThrow({
      where: { id: liveId },
      include: duelSnapshotInclude,
    });
    const cats = await listDuelEligibleCategories();
    const r1 = duel.rounds.find((r) => r.roundNumber === 1);
    const draftIds = Array.isArray(r1?.draftOptionIds)
      ? (r1!.draftOptionIds as string[])
      : [];
    const draftOptions =
      duel.status === "MATCHING"
        ? draft
        : cats.filter((c) => draftIds.includes(c.id));

    return {
      ok: true,
      duel: toDuelSnapshot(duel, user.id, draftOptions),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "no_stamina") return { ok: false, error: "no_stamina" };
    if (msg === "not_enough_categories") {
      return { ok: false, error: "not_enough_categories" };
    }
    console.error("startDuel failed", err);
    return { ok: false, error: "server_error" };
  }
}
