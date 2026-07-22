"use server";

import { revalidatePath } from "next/cache";
import { requireUserClub } from "@/lib/player/current";
import { prisma } from "@/lib/prisma";
import {
  claimMissionChest,
  getMissionBoardState,
  type EvaluateMissionsResult,
} from "@/lib/game/missionEngine";

export async function getMyMissions(): Promise<
  | { ok: true; board: EvaluateMissionsResult; daily: EvaluateMissionsResult }
  | { ok: false; error: "not_authenticated" | "server_error" }
> {
  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };
  try {
    const [board, daily] = await Promise.all([
      getMissionBoardState(pair.club.id, prisma, "CAMPAIGN"),
      getMissionBoardState(pair.club.id, prisma, "DAILY"),
    ]);
    return { ok: true, board, daily };
  } catch (err) {
    console.error("getMyMissions", err);
    return { ok: false, error: "server_error" };
  }
}

export async function claimMyMissionChest(
  batchId?: string,
): Promise<
  | {
      ok: true;
      coins: number;
      xp: number;
      nextBatchIndex: number | null;
      balances: { coins: number; xp: number };
    }
  | { ok: false; error: string }
> {
  const pair = await requireUserClub();
  if (!pair) return { ok: false, error: "not_authenticated" };

  const res = await claimMissionChest(pair.club.id, batchId);
  if (res.ok) {
    revalidatePath("/club");
    revalidatePath("/profile");
  }
  return res;
}
