import type { MissionObjective } from "@/generated/prisma/client";

/** Stats from a just-resolved match or duel (server-verified). */
export type MissionMatchLog = {
  matchId: string;
  goals: number;
  won: boolean;
  perfect: boolean;
  combo: number;
  isTutorial: boolean;
  /** Draft Duel finished (any outcome). */
  playedDuel?: boolean;
  /** Draft Duel win (including expire walkover). */
  wonDuel?: boolean;
  /**
   * Mid-duel attack/defend submit. Counts toward PLAY_MATCHES + SCORE_GOALS
   * immediately; PLAY_DUEL / WIN_* wait for the terminal duel event.
   */
  duelTurn?: boolean;
};

export type MissionProgressView = {
  missionId: string;
  titleEn: string;
  titleFa: string;
  objectiveType: MissionObjective;
  targetValue: number;
  progress: number;
  isCompleted: boolean;
  /** True after the player manually claimed the drip (or zero-reward auto). */
  isClaimed: boolean;
  rewardCoins: number;
  rewardXp: number;
  sortOrder: number;
};

/** Per-mission delta from a single evaluation (for post-match UI). */
export type MissionProgressDelta = {
  missionId: string;
  titleEn: string;
  titleFa: string;
  progress: number;
  targetValue: number;
  isCompleted: boolean;
  justCompleted: boolean;
  /** How much progress increased this event. */
  delta: number;
};

export type EvaluateMissionsResult = {
  batchId: string | null;
  batchIndex: number | null;
  missions: MissionProgressView[];
  /** Missions that moved or completed this evaluation. */
  updates: MissionProgressDelta[];
  /** Individual mission rewards paid this evaluation. */
  missionRewards: { coins: number; xp: number; missionIds: string[] };
  /** All 3 done and chest not yet claimed. */
  chestReady: boolean;
  chestCoins: number;
  chestXp: number;
};

export const EMPTY_MISSION_BOARD: EvaluateMissionsResult = {
  batchId: null,
  batchIndex: null,
  missions: [],
  updates: [],
  missionRewards: { coins: 0, xp: 0, missionIds: [] },
  chestReady: false,
  chestCoins: 0,
  chestXp: 0,
};
