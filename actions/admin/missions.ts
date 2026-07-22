"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MissionObjective } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const ObjectiveSchema = z.enum([
  "SCORE_GOALS",
  "PLAY_MATCHES",
  "WIN_MATCHES",
  "PERFECT_COMBO",
  "PLAY_DUEL",
  "WIN_DUEL",
]);

const BatchSchema = z.object({
  batchIndex: z.number().int().min(1).max(999),
  chestCoins: z.number().int().min(0).max(1_000_000),
  chestXp: z.number().int().min(0).max(1_000_000),
  isActive: z.boolean(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
});

const MissionSchema = z.object({
  batchId: z.string().min(1),
  titleEn: z.string().min(1).max(120),
  titleFa: z.string().min(1).max(120),
  objectiveType: ObjectiveSchema,
  targetValue: z.number().int().min(1).max(10_000),
  rewardCoins: z.number().int().min(0).max(1_000_000),
  rewardXp: z.number().int().min(0).max(1_000_000),
  sortOrder: z.number().int().min(0).max(20),
});

export type AdminMissionBatch = {
  id: string;
  batchIndex: number;
  kind: "CAMPAIGN" | "DAILY";
  dayKey: string | null;
  chestCoins: number;
  chestXp: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  missions: AdminMission[];
};

export type MissionBatchAnalytics = {
  batchId: string;
  batchIndex: number;
  kind: "CAMPAIGN" | "DAILY";
  dayKey: string | null;
  missionCount: number;
  clubsStarted: number;
  missionsCompleted: number;
  missionSlots: number;
  completionRate: number;
  chestsClaimed: number;
  chestClaimRate: number;
};

export type AdminMission = {
  id: string;
  batchId: string;
  titleEn: string;
  titleFa: string;
  objectiveType: MissionObjective;
  targetValue: number;
  rewardCoins: number;
  rewardXp: number;
  sortOrder: number;
};

/** Which batch players see right now (schedule + isActive). */
export async function getLiveOpsPreview(): Promise<{
  nowIso: string;
  activeBatchIndex: number | null;
  activeBatchId: string | null;
  reason: string;
}> {
  const now = new Date();
  const batches = await prisma.missionBatch.findMany({
    where: { kind: "CAMPAIGN" },
    include: { missions: true },
    orderBy: { batchIndex: "asc" },
  });

  for (const b of batches) {
    if (!b.isActive) continue;
    if (b.startsAt && b.startsAt > now) continue;
    if (b.endsAt && b.endsAt < now) continue;
    if (b.missions.length === 0) continue;
    return {
      nowIso: now.toISOString(),
      activeBatchIndex: b.batchIndex,
      activeBatchId: b.id,
      reason: "First active campaign batch in schedule window",
    };
  }

  return {
    nowIso: now.toISOString(),
    activeBatchIndex: null,
    activeBatchId: null,
    reason: "No batch is live (check isActive / dates / missions)",
  };
}

export async function listAdminMissionBatches(): Promise<AdminMissionBatch[]> {
  const rows = await prisma.missionBatch.findMany({
    include: { missions: { orderBy: { sortOrder: "asc" } } },
    orderBy: { batchIndex: "asc" },
  });
  return rows.map((b) => ({
    id: b.id,
    batchIndex: b.batchIndex,
    kind: b.kind,
    dayKey: b.dayKey,
    chestCoins: b.chestCoins,
    chestXp: b.chestXp,
    isActive: b.isActive,
    startsAt: b.startsAt?.toISOString() ?? null,
    endsAt: b.endsAt?.toISOString() ?? null,
    missions: b.missions.map((m) => ({
      id: m.id,
      batchId: m.batchId,
      titleEn: m.titleEn,
      titleFa: m.titleFa,
      objectiveType: m.objectiveType,
      targetValue: m.targetValue,
      rewardCoins: m.rewardCoins,
      rewardXp: m.rewardXp,
      sortOrder: m.sortOrder,
    })),
  }));
}

/** Completion / chest claim rates per batch for LiveOps dashboard. */
export async function getMissionAnalytics(): Promise<MissionBatchAnalytics[]> {
  const batches = await prisma.missionBatch.findMany({
    include: {
      missions: { select: { id: true } },
      clubProgress: {
        select: { chestClaimedAt: true },
      },
    },
    orderBy: { batchIndex: "asc" },
  });

  const missionIds = batches.flatMap((b) => b.missions.map((m) => m.id));
  const completedByMission = await prisma.clubMission.groupBy({
    by: ["missionId"],
    where: {
      missionId: { in: missionIds },
      isCompleted: true,
    },
    _count: { _all: true },
  });
  const completedMap = new Map(
    completedByMission.map((r) => [r.missionId, r._count._all]),
  );

  return batches.map((b) => {
    const clubsStarted = b.clubProgress.length;
    const chestsClaimed = b.clubProgress.filter((p) => p.chestClaimedAt).length;
    const missionCount = b.missions.length;
    const missionsCompleted = b.missions.reduce(
      (sum, m) => sum + (completedMap.get(m.id) ?? 0),
      0,
    );
    const missionSlots = Math.max(1, clubsStarted * missionCount);
    const completionRate =
      clubsStarted === 0 || missionCount === 0
        ? 0
        : Math.round((missionsCompleted / missionSlots) * 1000) / 10;
    const chestClaimRate =
      clubsStarted === 0
        ? 0
        : Math.round((chestsClaimed / clubsStarted) * 1000) / 10;

    return {
      batchId: b.id,
      batchIndex: b.batchIndex,
      kind: b.kind,
      dayKey: b.dayKey,
      missionCount,
      clubsStarted,
      missionsCompleted,
      missionSlots,
      completionRate,
      chestsClaimed,
      chestClaimRate,
    };
  });
}

export async function upsertMissionBatch(
  input: z.infer<typeof BatchSchema> & { id?: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = BatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const data = {
    batchIndex: parsed.data.batchIndex,
    chestCoins: parsed.data.chestCoins,
    chestXp: parsed.data.chestXp,
    isActive: parsed.data.isActive,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
  };

  try {
    if (input.id) {
      await prisma.missionBatch.update({ where: { id: input.id }, data });
      revalidatePath("/admin/missions");
      return { ok: true, id: input.id };
    }
    const created = await prisma.missionBatch.create({
      data: { ...data, kind: "CAMPAIGN" },
    });
    revalidatePath("/admin/missions");
    return { ok: true, id: created.id };
  } catch (err) {
    console.error("upsertMissionBatch", err);
    return { ok: false, error: "server_error" };
  }
}

export async function toggleMissionBatchActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.missionBatch.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/admin/missions");
    return { ok: true };
  } catch {
    return { ok: false, error: "server_error" };
  }
}

export async function deleteMissionBatch(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.missionBatch.delete({ where: { id } });
    revalidatePath("/admin/missions");
    return { ok: true };
  } catch {
    return { ok: false, error: "server_error" };
  }
}

export async function upsertMission(
  input: z.infer<typeof MissionSchema> & { id?: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = MissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    if (input.id) {
      await prisma.mission.update({
        where: { id: input.id },
        data: parsed.data,
      });
      revalidatePath("/admin/missions");
      return { ok: true, id: input.id };
    }
    const count = await prisma.mission.count({
      where: { batchId: parsed.data.batchId },
    });
    if (count >= 3) {
      return { ok: false, error: "batch_full" };
    }
    const created = await prisma.mission.create({ data: parsed.data });
    revalidatePath("/admin/missions");
    return { ok: true, id: created.id };
  } catch (err) {
    console.error("upsertMission", err);
    return { ok: false, error: "server_error" };
  }
}

export async function deleteMission(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.mission.delete({ where: { id } });
    revalidatePath("/admin/missions");
    return { ok: true };
  } catch {
    return { ok: false, error: "server_error" };
  }
}
