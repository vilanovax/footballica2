// Manager avatar catalog for the FTUE. Keys mirror the Prisma `ManagerAvatar`
// enum so the server can validate + set both Club.avatar and User.managerAvatar.

export type AvatarKey =
  | "TACTICAL_COACH"
  | "YOUNG_DIRECTOR"
  | "VETERAN_FAN"
  | "GOALKEEPER_LEGEND"
  | "SUPER_FAN"
  | "CLUB_LEGEND"
  | "OLD_GAFFER";

export type ManagerAvatar = {
  key: AvatarKey;
  name: string;
  faName: string;
  emoji: string;
  /** Short personality tag shown on the card. */
  tagline: string;
  faTagline: string;
  /** In-character line for the "handing over the keys" dialog. */
  dialog: string;
  faDialog: string;
  /**
   * Achievement slug that must be unlocked before this avatar can be picked.
   * Starter avatars omit it (always available in onboarding + profile).
   */
  lockedBy?: string;
};

export const MANAGER_AVATARS: ManagerAvatar[] = [
  {
    key: "TACTICAL_COACH",
    name: "Tactical Coach",
    faName: "مربی تاکتیکی",
    emoji: "🧠",
    tagline: "Reads the game like a book.",
    faTagline: "بازی رو مثل کتاب می‌خونه.",
    dialog:
      "Welcome Boss! The club is in ruins, but we can fix it. What should we name our team?",
    faDialog:
      "رئیس خوش اومدی! باشگاه نابوده ولی با هم می‌سازیمش. اسم تیممون رو چی بذاریم؟",
  },
  {
    key: "YOUNG_DIRECTOR",
    name: "Young Director",
    faName: "مدیر ورزشی جوان",
    emoji: "💼",
    tagline: "Ambitious and fearless.",
    faTagline: "جاه‌طلب و نترس.",
    dialog:
      "Welcome Boss! The club is in ruins, but we can fix it. What should we name our team?",
    faDialog:
      "رئیس خوش اومدی! باشگاه نابوده ولی با هم می‌سازیمش. اسم تیممون رو چی بذاریم؟",
  },
  {
    key: "VETERAN_FAN",
    name: "Veteran Fan",
    faName: "لیدر متعصب",
    emoji: "📣",
    tagline: "Lives and breathes the club.",
    faTagline: "با باشگاه نفس می‌کشه.",
    dialog:
      "Welcome Boss! The club is in ruins, but we can fix it. What should we name our team?",
    faDialog:
      "رئیس خوش اومدی! باشگاه نابوده ولی با هم می‌سازیمش. اسم تیممون رو چی بذاریم؟",
  },

  // ── Unlockable cosmetics (earned via achievements) ──────────────────────────
  {
    key: "GOALKEEPER_LEGEND",
    name: "Goalkeeper Legend",
    faName: "اسطورهٔ دروازه",
    emoji: "🧤",
    tagline: "Never lets one slip past.",
    faTagline: "هیچ توپی از دستش در نمی‌ره.",
    dialog: "",
    faDialog: "",
    lockedBy: "clean_sheet",
  },
  {
    key: "SUPER_FAN",
    name: "Super Fan",
    faName: "هوادار ویژه",
    emoji: "🦸",
    tagline: "Shows up every single day.",
    faTagline: "هر روز پای کاره.",
    dialog: "",
    faDialog: "",
    lockedBy: "streak_7",
  },
  {
    key: "CLUB_LEGEND",
    name: "Club Legend",
    faName: "اسطورهٔ باشگاه",
    emoji: "👑",
    tagline: "A name carved into history.",
    faTagline: "اسمش تو تاریخ حک شده.",
    dialog: "",
    faDialog: "",
    lockedBy: "streak_30",
  },
  {
    key: "OLD_GAFFER",
    name: "Old Gaffer",
    faName: "سرمربی پیشکسوت",
    emoji: "🧓",
    tagline: "Seen it all, won it all.",
    faTagline: "همه‌چیزو دیده، همه‌چیزو برده.",
    dialog: "",
    faDialog: "",
    lockedBy: "veteran",
  },
];

/** Avatars available from the start (shown in onboarding). */
export const STARTER_AVATARS: ManagerAvatar[] = MANAGER_AVATARS.filter(
  (a) => !a.lockedBy,
);

export function isAvatarKey(value: string): value is AvatarKey {
  return MANAGER_AVATARS.some((a) => a.key === value);
}

export function getAvatar(key: AvatarKey): ManagerAvatar {
  return MANAGER_AVATARS.find((a) => a.key === key) ?? MANAGER_AVATARS[0];
}

/** True when a starter avatar or its unlocking badge is owned. */
export function isAvatarUnlocked(
  key: AvatarKey,
  ownedBadgeSlugs: ReadonlySet<string>,
): boolean {
  const def = MANAGER_AVATARS.find((a) => a.key === key);
  if (!def) return false;
  return !def.lockedBy || ownedBadgeSlugs.has(def.lockedBy);
}
