import "server-only";
import { prisma } from "@/lib/prisma";
import { DEV_USER_EMAIL } from "@/lib/dev/dummyClub";
import type { AvatarKey } from "@/lib/onboarding/avatars";

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

const AVATAR_KEYS: AvatarKey[] = [
  "TACTICAL_COACH",
  "YOUNG_DIRECTOR",
  "VETERAN_FAN",
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
  const rows = Array.from({ length: count }).map((_, i) => {
    const avatar = pick(AVATAR_KEYS);
    const clubName = `${pick(MOCK_PREFIX)} ${pick(MOCK_SUFFIX)}`;
    return {
      email: `mock_${Date.now()}_${i}@footballica.local`,
      displayName: clubName,
      avatar,
      weeklyXp: randomInt(50, 2000),
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
          club: { create: { name: r.displayName, avatar: r.avatar } },
        },
      }),
    ),
  );
}

function toAvatarKey(value: string | null): AvatarKey {
  return value && (AVATAR_KEYS as string[]).includes(value)
    ? (value as AvatarKey)
    : "TACTICAL_COACH";
}

/**
 * Weekly league standings: Top 50 managers by `weeklyXp` (desc). Auto-seeds
 * mock managers in dev when the roster is too small to exercise the UI.
 */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const total = await prisma.user.count();
  if (total < MIN_USERS_FOR_UI) {
    await seedMockUsers(SEED_COUNT);
  }

  const [currentUser, users] = await Promise.all([
    prisma.user.findUnique({
      where: { email: DEV_USER_EMAIL },
      select: { id: true },
    }),
    prisma.user.findMany({
      orderBy: [{ weeklyXp: "desc" }, { createdAt: "asc" }],
      take: TOP_N,
      select: {
        id: true,
        displayName: true,
        managerAvatar: true,
        weeklyXp: true,
        club: { select: { name: true, avatar: true } },
      },
    }),
  ]);

  return users.map((u, index) => ({
    rank: index + 1,
    userId: u.id,
    clubName: u.club?.name ?? u.displayName ?? "Unknown Club",
    avatarKey: toAvatarKey(u.club?.avatar ?? u.managerAvatar),
    weeklyXp: u.weeklyXp,
    isCurrentUser: currentUser?.id === u.id,
  }));
}
