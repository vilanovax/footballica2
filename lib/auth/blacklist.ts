/**
 * Exact-match club-name blacklist (famous real-world clubs).
 * Variations like "استقلال آبی" or "Manchester City Fans" are ALLOWED —
 * only the exact normalized form is blocked.
 */

/** Collapse whitespace + lowercase for comparison / uniqueness. */
export function normalizeClubName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Famous clubs blocked as exact team names (EN + FA).
 * Keep this list curated — exact match only after normalizeClubName.
 */
export const CLUB_NAME_BLACKLIST: readonly string[] = [
  // Iran
  "استقلال",
  "پرسپولیس",
  "تراکتور",
  "سپاهان",
  "فولاد",
  "ذوب آهن",
  "ذوب‌آهن",
  "ملوان",
  "پیکان",
  "گل گهر",
  "گل‌گهر",
  "نساجی",
  "شمس آذر",
  "شمس‌آذر",
  "آلومینیوم اراک",
  "هوادار",
  "مس رفسنجان",
  "مس کرمان",
  "استیل آذین",
  // Europe / world
  "real madrid",
  "barcelona",
  "fc barcelona",
  "manchester united",
  "manchester city",
  "chelsea",
  "arsenal",
  "liverpool",
  "tottenham",
  "bayern munich",
  "bayern münchen",
  "juventus",
  "inter milan",
  "ac milan",
  "psg",
  "paris saint-germain",
  "paris saint germain",
  "borussia dortmund",
  "ajax",
  "benfica",
  "porto",
  "atletico madrid",
  "atlético madrid",
].map(normalizeClubName);

const BLACKLIST_SET = new Set(CLUB_NAME_BLACKLIST);

export type ClubNameValidation =
  | { ok: true; name: string; normalized: string }
  | { ok: false; error: "too_short" | "too_long" | "blacklisted" | "empty" };

const MIN_LEN = 2;
/** Club / team name hard cap (onboarding + profile). */
export const CLUB_NAME_MAX_LEN = 10;

/**
 * Validate a club / team name for onboarding + profile edit.
 * Blocks EXACT blacklist matches after normalization; allows variations.
 */
export function validateClubName(raw: string): ClubNameValidation {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length === 0) return { ok: false, error: "empty" };
  if (name.length < MIN_LEN) return { ok: false, error: "too_short" };
  if (name.length > CLUB_NAME_MAX_LEN) return { ok: false, error: "too_long" };

  const normalized = normalizeClubName(name);
  if (BLACKLIST_SET.has(normalized)) {
    return { ok: false, error: "blacklisted" };
  }

  return { ok: true, name, normalized };
}
