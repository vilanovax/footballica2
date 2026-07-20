// Manager avatar catalog for the FTUE. Keys mirror the Prisma `ManagerAvatar`
// enum so the server can validate + set both Club.avatar and User.managerAvatar.

export type AvatarKey = "TACTICAL_COACH" | "YOUNG_DIRECTOR" | "VETERAN_FAN";

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
];

export function isAvatarKey(value: string): value is AvatarKey {
  return MANAGER_AVATARS.some((a) => a.key === value);
}

export function getAvatar(key: AvatarKey): ManagerAvatar {
  return MANAGER_AVATARS.find((a) => a.key === key) ?? MANAGER_AVATARS[0];
}
