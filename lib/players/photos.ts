/**
 * Client-safe portrait allowlist for Grid cells.
 * Files: `/public/players/{slug}.svg` (from `npm run seed:player-photos`).
 *
 * Keep in sync with Mystery seedCatalog + Grid Immortal pack.
 */

/** Slugs that have art under /public/players/. */
export const PLAYER_PHOTO_SLUGS = [
  "alisson",
  "bellingham",
  "courtois",
  "de_bruyne",
  "fabregas",
  "ghoddos",
  "haaland",
  "jahanbakhsh",
  "kane",
  "lewandowski",
  "mbappe",
  "messi",
  "modric",
  "neymar",
  "ozil",
  "rodri",
  "ronaldo",
  "salah",
  "taremi",
  "van_dijk",
  "vinicius",
  "yamal",
] as const;

export const PLAYER_PHOTOS = new Set<string>(PLAYER_PHOTO_SLUGS);

/** Public URL when the slug is allowlisted. */
export function playerPhotoSrc(playerId: string): string | null {
  return PLAYER_PHOTOS.has(playerId) ? `/players/${playerId}.svg` : null;
}
