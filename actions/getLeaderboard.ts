import "server-only";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";
import { normalizeClubName } from "@/lib/auth/blacklist";
import { isAvatarKey, type AvatarKey } from "@/lib/onboarding/avatars";
import {
  ensureWeeklyLeagueReset,
  tehranWeekDaysRemaining,
} from "@/lib/game/weeklyLeague";

const TOP_N = 50;
const MIN_USERS_FOR_UI = 10;
const SEED_COUNT = 14;

export type LeaderboardRow = {
  rank: number;
  userId: string;
  clubName: string;
  avatarKey: AvatarKey;
  weeklyXp: number;
  isCurrentUser: boolean;
};

export type LeaderboardPayload = {
  rows: LeaderboardRow[];
  /** Tehran week days until Monday reset (1–7). */
  resetsInDays: number;
};

// Mock managers show off the full avatar roster (cosmetic only — mocks aren't
// gated by achievements). Real users' avatars are validated via isAvatarKey.
const AVATAR_KEYS: AvatarKey[] = [
  "TACTICAL_COACH",
  "YOUNG_DIRECTOR",
  "VETERAN_FAN",
  "GOALKEEPER_LEGEND",
  "SUPER_FAN",
  "CLUB_LEGEND",
  "OLD_GAFFER",
  "STAR_MANAGER",
  "COSMIC_COACH",
];

// Flavorful mock club names so the dev leaderboard reads like a real league.
const MOCK_PREFIX = [
  "Real",
  "Athletic",
  "Inter",
  "Dynamo",
  "Sporting",
  "Royal",
  "United",
  "Galactic",
];
const MOCK_SUFFIX = [
  "Lions",
  "Falcons",
  "Rovers",
  "Titans",
  "Wanderers",
  "Kings",
  "Comets",
  "Wolves",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Seed a batch of mock managers (each with a club) so the leaderboard UI is
 * testable before real traffic exists. Runs only when the roster is thin.
 */
async function seedMockUsers(count: number): Promise<void> {
  const stamp = Date.now();
  const rows = Array.from({ length: count }).map((_, i) => {
    const avatar = pick(AVATAR_KEYS);
    // Suffix keeps nameNormalized unique even if the flavor name collides.
    const clubName = `${pick(MOCK_PREFIX)} ${pick(MOCK_SUFFIX)} ${stamp}-${i}`;
    return {
      email: `mock_${stamp}_${i}@footballica.local`,
      displayName: clubName,
      avatar,
      weeklyXp: randomInt(50, 2000),
      nameNormalized: normalizeClubName(clubName),
    };
  });

  await prisma.$transaction(
    rows.map((r) =>
      prisma.user.create({
        data: {
          email: r.email,
          displayName: r.displayName,
          managerAvatar: r.avatar,
          weeklyXp: r.weeklyXp,
          xp: r.weeklyXp,
          club: {
            create: {
              name: r.displayName,
              nameNormalized: r.nameNormalized,
              avatar: r.avatar,
            },
          },
        },
      }),
    ),
  );
}

function toAvatarKey(value: string | null): AvatarKey {
  return value && isAvatarKey(value) ? value : "TACTICAL_COACH";
}

/**
 * Weekly league standings: Top 50 managers by `weeklyXp` (desc).
 * Duel wins already grant `config.duel.winWeeklyXp` (+3 default).
 * Auto-seeds mock managers in dev when the roster is too small.
 */
export async function getLeaderboard(): Promise<LeaderboardPayload> {
  try {
    await ensureWeeklyLeagueReset();
  } catch (err) {
    console.error("ensureWeeklyLeagueReset in getLeaderboard", err);
  }

  const total = await prisma.user.count({ where: { isBot: false } });
  if (total < MIN_USERS_FOR_UI) {
    await seedMockUsers(SEED_COUNT);
  }

  const currentUserId = await getSessionUserId();

  // Humans only — bots / practice pool stay out of the weekly league table.
  const users = await prisma.user.findMany({
    where: { isBot: false },
    orderBy: [{ weeklyXp: "desc" }, { createdAt: "asc" }],
    take: TOP_N,
    select: {
      id: true,
      displayName: true,
      managerAvatar: true,
      weeklyXp: true,
      club: { select: { name: true, avatar: true } },
    },
  });

  return {
    resetsInDays: tehranWeekDaysRemaining(),
    rows: users.map((u, index) => ({
      rank: index + 1,
      userId: u.id,
      clubName: u.club?.name ?? u.displayName ?? "Unknown Club",
      avatarKey: toAvatarKey(u.club?.avatar ?? u.managerAvatar),
      weeklyXp: u.weeklyXp,
      isCurrentUser: currentUserId !== null && currentUserId === u.id,
    })),
  };
}
