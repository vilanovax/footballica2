/**
 * Bundled badge art under /public/badges.
 * Used when BadgeDefinition.imageUrl is empty so system badges still look
 * like game trophies without requiring an admin upload.
 */
export const DEFAULT_BADGE_ART: Partial<Record<string, string>> = {
  /** Warming Up / گرم‌شدن */
  streak_3: "/badges/warm_up.png",
  /** Hat-trick / هتریک */
  hat_trick: "/badges/hat_trick.png",
  /** First Suspect / اولین مظنون */
  mystery_debut: "/badges/mystery_debut.png",
  /** Grid Rookie / تازه‌کار جدول */
  grid_debut: "/badges/grid_debut.png",
  /** Grid Regular / پای ثابت جدول */
  grid_streak_3: "/badges/grid_streak_3.png",
  /** Grid Master / استاد جدول */
  grid_streak_7: "/badges/grid_streak_7.png",
};

export function resolveBadgeImageUrl(
  slug: string,
  imageUrl: string | null | undefined,
): string | null {
  const trimmed = imageUrl?.trim();
  if (trimmed) return trimmed;
  return DEFAULT_BADGE_ART[slug] ?? null;
}
