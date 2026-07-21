// Club flag catalog. Free flags are national colours available from day one;
// "premium" flags are prestige crests unlocked by reaching a manager level.
// Kept framework-free so both the server (setClubFlag anti-tamper check) and
// the client (picker UI) share the exact same unlock rules.

export type FlagKey =
  | "IR"
  | "BR"
  | "AR"
  | "DE"
  | "GB"
  | "ES"
  | "IT"
  | "FR"
  // Premium crests (level-gated)
  | "LIONS"
  | "EAGLES"
  | "DRAGONS"
  | "ROYALS"
  | "INFERNO"
  | "THUNDER";

export type ClubFlag = {
  key: FlagKey;
  emoji: string;
  name: string;
  faName: string;
  /** Prestige flag gated behind a manager level. */
  premium: boolean;
  /** Manager level required to unlock (premium only; free flags omit it). */
  unlockLevel?: number;
};

export const CLUB_FLAGS: ClubFlag[] = [
  // ── Free national colours ──────────────────────────────────────────────────
  { key: "IR", emoji: "🇮🇷", name: "Iran", faName: "ایران", premium: false },
  { key: "BR", emoji: "🇧🇷", name: "Brazil", faName: "برزیل", premium: false },
  { key: "AR", emoji: "🇦🇷", name: "Argentina", faName: "آرژانتین", premium: false },
  { key: "DE", emoji: "🇩🇪", name: "Germany", faName: "آلمان", premium: false },
  { key: "GB", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", name: "England", faName: "انگلیس", premium: false },
  { key: "ES", emoji: "🇪🇸", name: "Spain", faName: "اسپانیا", premium: false },
  { key: "IT", emoji: "🇮🇹", name: "Italy", faName: "ایتالیا", premium: false },
  { key: "FR", emoji: "🇫🇷", name: "France", faName: "فرانسه", premium: false },

  // ── Premium crests (unlock by manager level) ───────────────────────────────
  { key: "LIONS", emoji: "🦁", name: "Lions", faName: "شیرها", premium: true, unlockLevel: 3 },
  { key: "EAGLES", emoji: "🦅", name: "Eagles", faName: "عقاب‌ها", premium: true, unlockLevel: 5 },
  { key: "DRAGONS", emoji: "🐉", name: "Dragons", faName: "اژدهاها", premium: true, unlockLevel: 8 },
  { key: "ROYALS", emoji: "👑", name: "Royals", faName: "سلطنتی", premium: true, unlockLevel: 10 },
  { key: "INFERNO", emoji: "🔥", name: "Inferno", faName: "آتشین", premium: true, unlockLevel: 12 },
  { key: "THUNDER", emoji: "⚡", name: "Thunder", faName: "رعد", premium: true, unlockLevel: 15 },
];

/** Default flag for a fresh club (first free flag). */
export const DEFAULT_FLAG_KEY: FlagKey = "IR";

const BY_KEY = new Map(CLUB_FLAGS.map((f) => [f.key, f]));

export function isFlagKey(value: string): value is FlagKey {
  return BY_KEY.has(value as FlagKey);
}

export function getFlag(key: string | null | undefined): ClubFlag {
  return (key && BY_KEY.get(key as FlagKey)) || BY_KEY.get(DEFAULT_FLAG_KEY)!;
}

/** Free flags are always unlocked; premium flags need the manager level. */
export function isFlagUnlocked(key: FlagKey, managerLevel: number): boolean {
  const def = BY_KEY.get(key);
  if (!def) return false;
  if (!def.premium) return true;
  return managerLevel >= (def.unlockLevel ?? Infinity);
}
