import "server-only";

import type {
  MissionBatchKind,
  MissionObjective,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureTodayDailyBatch } from "@/lib/game/dailyMissions";
import {
  EMPTY_MISSION_BOARD,
  type EvaluateMissionsResult,
  type MissionMatchLog,
  type MissionProgressView,
} from "@/lib/game/missionTypes";

export type {
  EvaluateMissionsResult,
  MissionMatchLog,
  MissionProgressView,
} from "@/lib/game/missionTypes";

type Db = typeof prisma | Prisma.TransactionClient;

export type MissionTrackKind = MissionBatchKind;

const EMPTY = EMPTY_MISSION_BOARD;

function nowInWindow(
  startsAt: Date | null,
  endsAt: Date | null,
  now: Date,
): boolean {
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
}

function deltaForObjective(
  type: MissionObjective,
  log: MissionMatchLog,
): number {
  if (log.isTutorial) {
    // Tutorial never advances volume / win / duel missions; combo/goals still
    // count lightly so FTUE feels rewarding.
    if (type === "SCORE_GOALS") return log.goals;
    if (type === "PERFECT_COMBO") return log.combo;
    return 0;
  }
  switch (type) {
    case "SCORE_GOALS":
      return log.goals;
    case "PLAY_MATCHES":
      return log.playedDuel ? 0 : 1;
    case "WIN_MATCHES":
      return log.playedDuel ? 0 : log.won ? 1 : 0;
    case "PERFECT_COMBO":
      return log.combo;
    case "PLAY_DUEL":
      return log.playedDuel ? 1 : 0;
    case "WIN_DUEL":
      return log.wonDuel ? 1 : 0;
    default:
      return 0;
  }
}

function applyProgress(
  type: MissionObjective,
  current: number,
  delta: number,
  target: number,
): number {
  if (type === "PERFECT_COMBO") {
    // Track best combo seen; complete when best >= target.
    return Math.min(target, Math.max(current, delta));
  }
  return Math.min(target, current + Math.max(0, delta));
}

/**
 * Ensure the club has progress rows for the given batch's missions.
 */
async function ensureClubBatch(
  db: Db,
  clubId: string,
  batchId: string,
  missionIds: string[],
): Promise<void> {
  await db.clubMissionBatch.upsert({
    where: { clubId_batchId: { clubId, batchId } },
    update: {},
    create: { clubId, batchId },
  });

  for (const missionId of missionIds) {
    await db.clubMission.upsert({
      where: { clubId_missionId: { clubId, missionId } },
      update: {},
      create: { clubId, missionId },
    });
  }
}

/**
 * Lowest active batch of the given kind whose chest is not claimed.
 * DAILY always resolves to today's Tehran batch (created on demand).
 */
export async function findActiveMissionBatch(
  db: Db,
  clubId: string,
  now = new Date(),
  kind: MissionTrackKind = "CAMPAIGN",
) {
  if (kind === "DAILY") {
    const daily = await ensureTodayDailyBatch(db, now);
    if (!daily.isActive || daily.missions.length === 0) return null;
    if (!nowInWindow(daily.startsAt, daily.endsAt, now)) return null;
    const progress = await db.clubMissionBatch.findUnique({
      where: { clubId_batchId: { clubId, batchId: daily.id } },
    });
    if (progress?.chestClaimedAt) return null;
    return daily;
  }

  const batches = await db.missionBatch.findMany({
    where: { isActive: true, kind: "CAMPAIGN" },
    include: {
      missions: { orderBy: { sortOrder: "asc" } },
      clubProgress: { where: { clubId }, take: 1 },
    },
    orderBy: { batchIndex: "asc" },
  });

  for (const batch of batches) {
    if (!nowInWindow(batch.startsAt, batch.endsAt, now)) continue;
    if (batch.missions.length === 0) continue;
    const progress = batch.clubProgress[0];
    if (progress?.chestClaimedAt) continue;
    return batch;
  }
  return null;
}

function mergeMissionResults(
  a: EvaluateMissionsResult,
  b: EvaluateMissionsResult,
): EvaluateMissionsResult {
  // Prefer the track that actually moved for banner primary display.
  const primary =
    a.updates.length > 0 || a.missionRewards.coins + a.missionRewards.xp > 0
      ? a
      : b.updates.length > 0 ||
          b.missionRewards.coins + b.missionRewards.xp > 0
        ? b
        : a.batchId
          ? a
          : b;

  return {
    ...primary,
    updates: [...a.updates, ...b.updates],
    missionRewards: {
      coins: a.missionRewards.coins + b.missionRewards.coins,
      xp: a.missionRewards.xp + b.missionRewards.xp,
      missionIds: [
        ...a.missionRewards.missionIds,
        ...b.missionRewards.missionIds,
      ],
    },
    chestReady: a.chestReady || b.chestReady,
  };
}

/**
 * Evaluate + persist mission progress for a club after a match.
 * Grants individual mission drip rewards when a mission completes.
 * Does NOT auto-claim the batch chest (UI claim for game feel).
 */
export async function evaluateMissions(
  clubId: string,
  log: MissionMatchLog,
  db: Db = prisma,
  kind: MissionTrackKind = "CAMPAIGN",
): Promise<EvaluateMissionsResult> {
  const batch = await findActiveMissionBatch(db, clubId, new Date(), kind);
  if (!batch) return EMPTY;

  const missionIds = batch.missions.map((m) => m.id);
  await ensureClubBatch(db, clubId, batch.id, missionIds);

  const clubBatch = await db.clubMissionBatch.findUnique({
    where: { clubId_batchId: { clubId, batchId: batch.id } },
  });
  if (!clubBatch) return EMPTY;

  // Idempotent: same match must not apply twice.
  if (clubBatch.lastProcessedMatchId === log.matchId) {
    return getMissionBoardState(clubId, db, kind);
  }

  const clubMissions = await db.clubMission.findMany({
    where: { clubId, missionId: { in: missionIds } },
    include: { mission: true },
  });
  const byMissionId = new Map(clubMissions.map((cm) => [cm.missionId, cm]));

  let rewardCoins = 0;
  let rewardXp = 0;
  const rewardedIds: string[] = [];
  const views: MissionProgressView[] = [];
  const updates: EvaluateMissionsResult["updates"] = [];

  for (const mission of batch.missions) {
    const row = byMissionId.get(mission.id);
    if (!row) continue;

    const prevProgress = row.progress;
    const wasCompleted = row.isCompleted;
    let progress = row.progress;
    let isCompleted = row.isCompleted;
    let completedAt = row.completedAt;
    let rewardClaimedAt = row.rewardClaimedAt;

    if (!isCompleted) {
      const rawDelta = deltaForObjective(mission.objectiveType, log);
      progress = applyProgress(
        mission.objectiveType,
        progress,
        rawDelta,
        mission.targetValue,
      );
      if (progress >= mission.targetValue) {
        isCompleted = true;
        completedAt = new Date();
      }
    }

    const gained = progress - prevProgress;
    const justCompleted = isCompleted && !wasCompleted;
    if (gained > 0 || justCompleted) {
      updates.push({
        missionId: mission.id,
        titleEn: mission.titleEn,
        titleFa: mission.titleFa,
        progress,
        targetValue: mission.targetValue,
        isCompleted,
        justCompleted,
        delta: gained,
      });
    }

    // Pay individual drip once on completion.
    if (
      isCompleted &&
      !rewardClaimedAt &&
      (mission.rewardCoins > 0 || mission.rewardXp > 0)
    ) {
      rewardCoins += mission.rewardCoins;
      rewardXp += mission.rewardXp;
      rewardedIds.push(mission.id);
      rewardClaimedAt = new Date();
    } else if (isCompleted && !rewardClaimedAt) {
      rewardClaimedAt = new Date();
    }

    await db.clubMission.update({
      where: { id: row.id },
      data: {
        progress,
        isCompleted,
        completedAt,
        rewardClaimedAt,
      },
    });

    views.push({
      missionId: mission.id,
      titleEn: mission.titleEn,
      titleFa: mission.titleFa,
      objectiveType: mission.objectiveType,
      targetValue: mission.targetValue,
      progress,
      isCompleted,
      rewardCoins: mission.rewardCoins,
      rewardXp: mission.rewardXp,
      sortOrder: mission.sortOrder,
    });
  }

  await db.clubMissionBatch.update({
    where: { id: clubBatch.id },
    data: { lastProcessedMatchId: log.matchId },
  });

  // Economy payout is applied by the caller (resolveMatch / duel hooks).
  const allDone = views.length > 0 && views.every((m) => m.isCompleted);

  return {
    batchId: batch.id,
    batchIndex: batch.batchIndex,
    missions: views.sort((a, b) => a.sortOrder - b.sortOrder),
    updates,
    missionRewards: {
      coins: rewardCoins,
      xp: rewardXp,
      missionIds: rewardedIds,
    },
    chestReady: allDone && !clubBatch.chestClaimedAt,
    chestCoins: batch.chestCoins,
    chestXp: batch.chestXp,
  };
}

/**
 * Progress both campaign + daily tracks for one match/duel event.
 * Rewards and banner updates are merged; economy caller uses summed drips.
 */
export async function evaluateAllMissionTracks(
  clubId: string,
  log: MissionMatchLog,
  db: Db = prisma,
): Promise<EvaluateMissionsResult> {
  const campaign = await evaluateMissions(clubId, log, db, "CAMPAIGN");
  const daily = await evaluateMissions(clubId, log, db, "DAILY");
  return mergeMissionResults(campaign, daily);
}

/** Read-only board state for Hub / Profile (ensures first batch is unlocked). */
export async function getMissionBoardState(
  clubId: string,
  db: Db = prisma,
  kind: MissionTrackKind = "CAMPAIGN",
): Promise<EvaluateMissionsResult> {
  const batch = await findActiveMissionBatch(db, clubId, new Date(), kind);
  if (!batch) return EMPTY;

  const missionIds = batch.missions.map((m) => m.id);
  await ensureClubBatch(db, clubId, batch.id, missionIds);

  const clubBatch = await db.clubMissionBatch.findUnique({
    where: { clubId_batchId: { clubId, batchId: batch.id } },
  });
  const clubMissions = await db.clubMission.findMany({
    where: { clubId, missionId: { in: missionIds } },
  });
  const byId = new Map(clubMissions.map((cm) => [cm.missionId, cm]));

  const missions: MissionProgressView[] = batch.missions.map((m) => {
    const row = byId.get(m.id);
    return {
      missionId: m.id,
      titleEn: m.titleEn,
      titleFa: m.titleFa,
      objectiveType: m.objectiveType,
      targetValue: m.targetValue,
      progress: row?.progress ?? 0,
      isCompleted: row?.isCompleted ?? false,
      rewardCoins: m.rewardCoins,
      rewardXp: m.rewardXp,
      sortOrder: m.sortOrder,
    };
  });

  const allDone = missions.length > 0 && missions.every((m) => m.isCompleted);

  return {
    batchId: batch.id,
    batchIndex: batch.batchIndex,
    missions,
    updates: [],
    missionRewards: { coins: 0, xp: 0, missionIds: [] },
    chestReady: allDone && !clubBatch?.chestClaimedAt,
    chestCoins: batch.chestCoins,
    chestXp: batch.chestXp,
  };
}

/** Apply mission drip coins/XP to club + user (duel paths). */
export async function applyMissionEconomy(
  clubId: string,
  coins: number,
  xp: number,
  db: Db = prisma,
): Promise<void> {
  if (coins <= 0 && xp <= 0) return;
  const club =
    coins > 0
      ? await db.club.update({
          where: { id: clubId },
          data: { coins: { increment: coins } },
          select: { userId: true },
        })
      : await db.club.findUniqueOrThrow({
          where: { id: clubId },
          select: { userId: true },
        });
  if (xp > 0) {
    await db.user.update({
      where: { id: club.userId },
      data: {
        xp: { increment: xp },
        weeklyXp: { increment: xp },
      },
    });
  }
}

/**
 * After a duel reaches a terminal status, credit PLAY_DUEL / WIN_DUEL for every
 * human participant (bots skipped). Idempotent per club via `duel:{id}`.
 */
export async function creditDuelMissions(params: {
  duelId: string;
  challengerId: string;
  opponentId: string | null;
  winnerId: string | null;
  db?: Db;
}): Promise<Map<string, EvaluateMissionsResult>> {
  const db = params.db ?? prisma;
  const out = new Map<string, EvaluateMissionsResult>();
  const userIds = [params.challengerId, params.opponentId].filter(
    (id): id is string => Boolean(id),
  );

  for (const userId of userIds) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        isBot: true,
        club: { select: { id: true } },
      },
    });
    if (!user || user.isBot || !user.club) continue;

    const result = await evaluateAllMissionTracks(
      user.club.id,
      {
        matchId: `duel:${params.duelId}`,
        goals: 0,
        won: false,
        perfect: false,
        combo: 0,
        isTutorial: false,
        playedDuel: true,
        wonDuel: params.winnerId === userId,
      },
      db,
    );
    await applyMissionEconomy(
      user.club.id,
      result.missionRewards.coins,
      result.missionRewards.xp,
      db,
    );
    out.set(userId, result);
  }
  return out;
}

export type ClaimChestResult =
  | {
      ok: true;
      coins: number;
      xp: number;
      nextBatchIndex: number | null;
      balances: { coins: number; xp: number };
    }
  | { ok: false; error: string };

/**
 * Claim a batch chest when all missions are complete.
 * Pass `batchId` when claiming from a specific board (campaign vs daily).
 */
export async function claimMissionChest(
  clubId: string,
  batchId?: string,
): Promise<ClaimChestResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      let targetBatchId = batchId ?? null;
      let kind: MissionTrackKind = "CAMPAIGN";

      if (targetBatchId) {
        const meta = await tx.missionBatch.findUnique({
          where: { id: targetBatchId },
          select: { kind: true },
        });
        if (!meta) return { ok: false as const, error: "chest_not_ready" };
        kind = meta.kind;
      }

      const state = targetBatchId
        ? await getMissionBoardStateForBatch(clubId, targetBatchId, tx)
        : await getMissionBoardState(clubId, tx, "CAMPAIGN");

      if (!state.batchId || !state.chestReady) {
        return { ok: false as const, error: "chest_not_ready" };
      }
      targetBatchId = state.batchId;

      const clubBatch = await tx.clubMissionBatch.findUnique({
        where: {
          clubId_batchId: { clubId, batchId: targetBatchId },
        },
      });
      if (!clubBatch || clubBatch.chestClaimedAt) {
        return { ok: false as const, error: "already_claimed" };
      }

      await tx.clubMissionBatch.update({
        where: { id: clubBatch.id },
        data: { chestClaimedAt: now },
      });

      const club = await tx.club.update({
        where: { id: clubId },
        data: { coins: { increment: state.chestCoins } },
        select: { coins: true, userId: true },
      });

      let xp = 0;
      if (state.chestXp > 0) {
        const user = await tx.user.update({
          where: { id: club.userId },
          data: {
            xp: { increment: state.chestXp },
            weeklyXp: { increment: state.chestXp },
          },
          select: { xp: true },
        });
        xp = user.xp;
      } else {
        const user = await tx.user.findUnique({
          where: { id: club.userId },
          select: { xp: true },
        });
        xp = user?.xp ?? 0;
      }

      // Unlock next batch rows eagerly so the board flips immediately.
      const next =
        kind === "CAMPAIGN"
          ? await findActiveMissionBatch(tx, clubId, now, "CAMPAIGN")
          : null;
      if (next) {
        await ensureClubBatch(
          tx,
          clubId,
          next.id,
          next.missions.map((m) => m.id),
        );
      }

      return {
        ok: true as const,
        coins: state.chestCoins,
        xp: state.chestXp,
        nextBatchIndex: next?.batchIndex ?? null,
        balances: { coins: club.coins, xp },
      };
    });
  } catch (err) {
    console.error("claimMissionChest failed", err);
    return { ok: false, error: "server_error" };
  }
}

/** Board state for an explicit batch id (used when claiming a specific chest). */
async function getMissionBoardStateForBatch(
  clubId: string,
  batchId: string,
  db: Db,
): Promise<EvaluateMissionsResult> {
  const batch = await db.missionBatch.findUnique({
    where: { id: batchId },
    include: { missions: { orderBy: { sortOrder: "asc" } } },
  });
  if (!batch || batch.missions.length === 0) return EMPTY;

  const missionIds = batch.missions.map((m) => m.id);
  await ensureClubBatch(db, clubId, batch.id, missionIds);

  const clubBatch = await db.clubMissionBatch.findUnique({
    where: { clubId_batchId: { clubId, batchId: batch.id } },
  });
  const clubMissions = await db.clubMission.findMany({
    where: { clubId, missionId: { in: missionIds } },
  });
  const byId = new Map(clubMissions.map((cm) => [cm.missionId, cm]));

  const missions: MissionProgressView[] = batch.missions.map((m) => {
    const row = byId.get(m.id);
    return {
      missionId: m.id,
      titleEn: m.titleEn,
      titleFa: m.titleFa,
      objectiveType: m.objectiveType,
      targetValue: m.targetValue,
      progress: row?.progress ?? 0,
      isCompleted: row?.isCompleted ?? false,
      rewardCoins: m.rewardCoins,
      rewardXp: m.rewardXp,
      sortOrder: m.sortOrder,
    };
  });

  const allDone = missions.length > 0 && missions.every((m) => m.isCompleted);

  return {
    batchId: batch.id,
    batchIndex: batch.batchIndex,
    missions,
    updates: [],
    missionRewards: { coins: 0, xp: 0, missionIds: [] },
    chestReady: allDone && !clubBatch?.chestClaimedAt,
    chestCoins: batch.chestCoins,
    chestXp: batch.chestXp,
  };
}
