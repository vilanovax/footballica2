import type { BadgeCategory, BadgeTier } from "@/lib/game/achievements";

/** Serializable badge presentation (admin DB + client). */
export type BadgePresentation = {
  slug: string;
  nameEn: string;
  nameFa: string;
  descriptionEn: string;
  descriptionFa: string;
  emoji: string;
  imageUrl: string | null;
  rewardCoins: number;
  rewardXp: number;
  category: BadgeCategory | "showcase";
  tier: BadgeTier;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
};
