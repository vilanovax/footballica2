import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

/** How many claimable drip rewards + ready chests across Daily / Campaign boards. */
export function countMissionRewardsReady(
  daily?: EvaluateMissionsResult | null,
  campaign?: EvaluateMissionsResult | null,
): number {
  let n = 0;
  for (const board of [daily, campaign]) {
    if (!board) continue;
    if (board.chestReady) n += 1;
    n += board.missions.filter((m) => m.isCompleted && !m.isClaimed).length;
  }
  return n;
}

export function hasMissionRewardReady(
  daily?: EvaluateMissionsResult | null,
  campaign?: EvaluateMissionsResult | null,
): boolean {
  return countMissionRewardsReady(daily, campaign) > 0;
}
