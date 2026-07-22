// Club color palette catalog. Keys are stored on Club.colorKey (not freeform hex)
// so Hub / Profile / Duel accents stay consistent with Fantasy UI.

export type ClubColorKey =
  | "CLUB_GREEN"
  | "CLUB_RED"
  | "CLUB_BLUE"
  | "CLUB_GOLD"
  | "CLUB_PURPLE"
  | "CLUB_ORANGE"
  | "CLUB_TEAL"
  | "CLUB_DARK";

export type ClubColor = {
  key: ClubColorKey;
  name: string;
  faName: string;
  /** Solid accent for rings / swatches. */
  hex: string;
  /** Soft wash for header glows (same hue, lower alpha applied in CSS). */
  washHex: string;
};

export const DEFAULT_CLUB_COLOR_KEY: ClubColorKey = "CLUB_GREEN";

export const CLUB_COLORS: ClubColor[] = [
  {
    key: "CLUB_GREEN",
    name: "Pitch Green",
    faName: "سبز چمن",
    hex: "#10B981",
    washHex: "#34D399",
  },
  {
    key: "CLUB_RED",
    name: "Derby Red",
    faName: "قرمز دربی",
    hex: "#EF4444",
    washHex: "#F87171",
  },
  {
    key: "CLUB_BLUE",
    name: "Royal Blue",
    faName: "آبی سلطنتی",
    hex: "#3B82F6",
    washHex: "#60A5FA",
  },
  {
    key: "CLUB_GOLD",
    name: "Trophy Gold",
    faName: "طلای جام",
    hex: "#EAB308",
    washHex: "#FACC15",
  },
  {
    key: "CLUB_PURPLE",
    name: "Night Purple",
    faName: "بنفش شب",
    hex: "#A855F7",
    washHex: "#C084FC",
  },
  {
    key: "CLUB_ORANGE",
    name: "Kickoff Orange",
    faName: "نارنجی شروع",
    hex: "#F97316",
    washHex: "#FB923C",
  },
  {
    key: "CLUB_TEAL",
    name: "Coast Teal",
    faName: "فیروزه‌ای ساحل",
    hex: "#14B8A6",
    washHex: "#2DD4BF",
  },
  {
    key: "CLUB_DARK",
    name: "Midnight",
    faName: "نیمه‌شب",
    hex: "#334155",
    washHex: "#64748B",
  },
];

const BY_KEY = new Map(CLUB_COLORS.map((c) => [c.key, c]));

export function isClubColorKey(value: string): value is ClubColorKey {
  return BY_KEY.has(value as ClubColorKey);
}

export function getClubColor(
  key: string | null | undefined,
): ClubColor {
  if (key && isClubColorKey(key)) {
    return BY_KEY.get(key)!;
  }
  return BY_KEY.get(DEFAULT_CLUB_COLOR_KEY)!;
}

/** Inline style helpers for scoped club accents (does not touch --primary). */
export function clubAccentRingStyle(key: string | null | undefined): {
  boxShadow: string;
} {
  const c = getClubColor(key);
  return { boxShadow: `0 0 0 3px ${c.hex}` };
}

export function clubAccentWashStyle(key: string | null | undefined): {
  background: string;
} {
  const c = getClubColor(key);
  return {
    background: `radial-gradient(ellipse at 20% 0%, ${c.washHex}55, transparent 55%)`,
  };
}
