/**
 * Campaign metagame helpers (ADR 002).
 * Campaign = MissionBatchKind.CAMPAIGN + live RecordChallenge chapters.
 * Not a MatchMode — progress still comes from playing existing modes.
 */

import type { EvaluateMissionsResult } from "./missionTypes";

export type CampaignChapterView = {
  id: string;
  slug: string;
  titleEn: string;
  titleFa: string;
  rewardBadgeEmoji: string | null;
  targetScore: number;
  unlocked: boolean;
  conquered: boolean;
  bestScore: number;
};

export type CampaignSeasonView = {
  /** Active CAMPAIGN mission batch index (null if none). */
  batchIndex: number | null;
  batchId: string | null;
  missionsDone: number;
  missionsTotal: number;
  chestReady: boolean;
  claimableCount: number;
  chapters: CampaignChapterView[];
  chaptersConquered: number;
};

export function buildCampaignSeasonView(input: {
  board: EvaluateMissionsResult | null | undefined;
  chapters: CampaignChapterView[];
}): CampaignSeasonView {
  const board = input.board;
  const missions = board?.missions ?? [];
  const missionsDone = missions.filter((m) => m.isCompleted).length;
  const claimableCount = missions.filter(
    (m) => m.isCompleted && !m.isClaimed,
  ).length;
  const chapters = input.chapters;
  return {
    batchIndex: board?.batchIndex ?? null,
    batchId: board?.batchId ?? null,
    missionsDone,
    missionsTotal: missions.length,
    chestReady: Boolean(board?.chestReady),
    claimableCount,
    chapters,
    chaptersConquered: chapters.filter((c) => c.conquered).length,
  };
}

export function campaignSeasonActive(season: CampaignSeasonView): boolean {
  return Boolean(season.batchId) || season.chapters.length > 0;
}
