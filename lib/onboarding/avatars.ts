// Manager avatar catalog for the FTUE. Keys mirror the Prisma `ManagerAvatar`
// enum so the server can validate + set both Club.avatar and User.managerAvatar.

export type AvatarKey =
  | "TACTICAL_COACH"
  | "YOUNG_DIRECTOR"
  | "VETERAN_FAN"
  | "GOALKEEPER_LEGEND"
  | "SUPER_FAN"
  | "CLUB_LEGEND"
  | "OLD_GAFFER"
  | "STAR_MANAGER"
  | "COSMIC_COACH";

export type ManagerAvatar = {
  key: AvatarKey;
  name: string;
  faName: string;
  /** Illustrated avatar served from /public/avatars. */
  image: string;
  /** Legacy emoji fallback (used if the image ever fails to load). */
  emoji: string;
  /** Short personality tag shown on the card. */
  tagline: string;
  faTagline: string;
  /** In-character line while handing over the keys (narrative beat). */
  keysDialog: string;
  faKeysDialog: string;
  /** In-character line prompting the club name. */
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
    image: "/avatars/tactical-coach.png",
    emoji: "🧠",
    tagline: "Reads the game like a book.",
    faTagline: "بازی رو مثل کتاب می‌خونه.",
    keysDialog:
      "These keys open a ruined ground — cracked stands, dirt pitch. Rebuild it with me, Boss.",
    faKeysDialog:
      "این کلیدها مال یه زمین خرابه‌ست — سکوهای ترک‌خورده، چمن خاکی. با هم بازسازیش می‌کنیم رئیس.",
    dialog:
      "The keys are yours. What should we put on the scoreboard — name the club.",
    faDialog:
      "کلیدها مال توئه. روی تابلو چی بنویسیم — اسم باشگاه رو بگو.",
  },
  {
    key: "YOUNG_DIRECTOR",
    name: "Young Director",
    faName: "مدیر ورزشی جوان",
    image: "/avatars/young-director.png",
    emoji: "💼",
    tagline: "Ambitious and fearless.",
    faTagline: "جاه‌طلب و نترس.",
    keysDialog:
      "Investors walked. The stands are empty. Take the keys — we flip this club.",
    faKeysDialog:
      "سرمایه‌گذارها رفتن. سکوها خالیه. کلیدها رو بگیر — این باشگاه رو برمی‌گردونیم.",
    dialog:
      "Every empire starts with a name. What do we call our project?",
    faDialog: "هر امپراتوری با یه اسم شروع می‌شه. پروژه‌مونو چی صدا کنیم؟",
  },
  {
    key: "VETERAN_FAN",
    name: "Veteran Fan",
    faName: "لیدر متعصب",
    image: "/avatars/veteran-fan.png",
    emoji: "📣",
    tagline: "Lives and breathes the club.",
    faTagline: "با باشگاه نفس می‌کشه.",
    keysDialog:
      "I kept these keys through the dark years. The terrace is waiting for a real boss.",
    faKeysDialog:
      "تو سال‌های تاریک این کلیدها رو نگه داشتم. سکو منتظر یه رئیس واقعیه.",
    dialog:
      "Give the ultras a name they can chant. What are we called?",
    faDialog: "به اولتراس یه اسم بده که هوار بکشن. اسم‌مون چیه؟",
  },

  // ── Unlockable cosmetics (earned via achievements) ──────────────────────────
  {
    key: "GOALKEEPER_LEGEND",
    name: "Goalkeeper Legend",
    faName: "اسطورهٔ دروازه",
    image: "/avatars/goalkeeper-legend.png",
    emoji: "🧤",
    tagline: "Never lets one slip past.",
    faTagline: "هیچ توپی از دستش در نمی‌ره.",
    keysDialog: "",
    faKeysDialog: "",
    dialog: "",
    faDialog: "",
    lockedBy: "clean_sheet",
  },
  {
    key: "SUPER_FAN",
    name: "Super Fan",
    faName: "هوادار ویژه",
    image: "/avatars/super-fan.png",
    emoji: "🦸",
    tagline: "Shows up every single day.",
    faTagline: "هر روز پای کاره.",
    keysDialog: "",
    faKeysDialog: "",
    dialog: "",
    faDialog: "",
    lockedBy: "streak_7",
  },
  {
    key: "CLUB_LEGEND",
    name: "Club Legend",
    faName: "اسطورهٔ باشگاه",
    image: "/avatars/club-legend.png",
    emoji: "👑",
    tagline: "A name carved into history.",
    faTagline: "اسمش تو تاریخ حک شده.",
    keysDialog: "",
    faKeysDialog: "",
    dialog: "",
    faDialog: "",
    lockedBy: "streak_30",
  },
  {
    key: "OLD_GAFFER",
    name: "Old Gaffer",
    faName: "سرمربی پیشکسوت",
    image: "/avatars/old-gaffer.png",
    emoji: "🧓",
    tagline: "Seen it all, won it all.",
    faTagline: "همه‌چیزو دیده، همه‌چیزو برده.",
    keysDialog: "",
    faKeysDialog: "",
    dialog: "",
    faDialog: "",
    lockedBy: "veteran",
  },
  {
    key: "STAR_MANAGER",
    name: "Star Manager",
    faName: "مدیر ستاره",
    image: "/avatars/star-manager.png",
    emoji: "🌟",
    tagline: "Born to lift trophies.",
    faTagline: "برای بالا بردن جام‌ها ساخته شده.",
    keysDialog: "",
    faKeysDialog: "",
    dialog: "",
    faDialog: "",
    lockedBy: "first_win",
  },
  {
    key: "COSMIC_COACH",
    name: "Cosmic Coach",
    faName: "مربی فضایی",
    image: "/avatars/cosmic-coach.png",
    emoji: "👽",
    tagline: "Tactics from another galaxy.",
    faTagline: "تاکتیک‌هایی از کهکشانی دیگر.",
    keysDialog: "",
    faKeysDialog: "",
    dialog: "",
    faDialog: "",
    lockedBy: "on_fire",
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
