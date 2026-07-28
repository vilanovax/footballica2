import type { ReactNode } from "react";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import type { BadgeTier } from "@/lib/game/achievements";

/** Top-line win / clear / duel outcome. */
export type PostMatchOutcome = {
  emoji: string;
  title: string;
  subtitle?: string;
  hint?: string;
  hintTone?: "positive" | "negative" | "neutral";
  chips?: Array<{
    key: string;
    label: string;
    tone?: "accent" | "secondary" | "muted";
  }>;
  /** Mode-specific board (e.g. Duel scorecard body). */
  children?: ReactNode;
};

export type PostMatchBonusLine = {
  key: string;
  label: string;
  amount: number;
  unit: string;
};

export type PostMatchRewards = {
  coins: number;
  xp: number;
  fans: number;
  bonusLines?: PostMatchBonusLine[];
  /** Club totals after settle (optional footer pill). */
  balances?: {
    coins: number;
    fans: number;
    stamina: number;
    maxStamina: number;
  };
};

export type PostMatchLevelProgress = {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
  /** Progress before this match's XP (animated from → to). */
  barFrom: number;
  levelUp: { from: number; to: number; coinReward: number } | null;
};

export type PostMatchBadge = {
  slug: string;
  emoji: string;
  imageUrl?: string | null;
  nameEn: string;
  nameFa: string;
  descriptionEn?: string;
  descriptionFa?: string;
  tier?: BadgeTier;
  coins?: number;
  xp?: number;
};

/** Challenge conquer / record / custom trophy chips. */
export type PostMatchTrophy = {
  key: string;
  emoji: string;
  title: string;
  subtitle?: string;
};

export type PostMatchMilestone = {
  icon: string;
  eyebrow: string;
  body: string;
  /** 0–1 fill toward next upgrade cost. */
  fill?: number;
};

export type PostMatchAchievements = {
  level?: PostMatchLevelProgress | null;
  badges?: PostMatchBadge[];
  trophies?: PostMatchTrophy[];
  missions?: EvaluateMissionsResult | null;
  milestone?: PostMatchMilestone | null;
  streakNote?: string | null;
};

export type PostMatchCta = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "accent" | "secondary";
  disabled?: boolean;
};

export type PostMatchCtas = {
  /** Banner above buttons (tutorial nudge / out of energy). */
  notice?: string | null;
  primary?: PostMatchCta | null;
  secondary?: PostMatchCta | null;
  tertiary?: PostMatchCta | null;
};
