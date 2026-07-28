/**
 * Bundled badge art under /public/badges.
 * Used when BadgeDefinition.imageUrl is empty so system badges still look
 * like game trophies without requiring an admin upload.
 */
export const DEFAULT_BADGE_ART: Partial<Record<string, string>> = {
  /** Warming Up / گرم‌شدن */
  streak_3: "/badges/warm_up.png",
};

export function resolveBadgeImageUrl(
  slug: string,
  imageUrl: string | null | undefined,
): string | null {
  const trimmed = imageUrl?.trim();
  if (trimmed) return trimmed;
  return DEFAULT_BADGE_ART[slug] ?? null;
}
