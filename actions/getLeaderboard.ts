"use server";

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

export type LeaderboardPlayState = "scored" | "playedZero" | "unplayed";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  clubName: string;
  avatarKey: AvatarKey;
  weeklyXp: number;
  matchesPlayed: number;
  playState: LeaderboardPlayState;
  isCurrentUser: boolean;
};

export type LeaderboardPayload = {
  rows: LeaderboardRow[];
  /** Tehran week days until Monday reset (1–7). */
  resetsInDays: number;
  /** Current user's row even when outside Top N (for sticky bar). */
  currentUserRow: LeaderboardRow | null;
};

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
  return arr[Math.floor(Math.random() * (arr.length))];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedMockUsers(count: number): Promise<void> {
  const stamp = Date.now();
  const rows = Array.from({ length: count }).map((_, i) => {
    const avatar = pick(AVATAR_KEYS);
    const clubName = `${pick(MOCK_PREFIX)} ${pick(MOCK_SUFFIX)} ${stamp}-${i}`;
    return {
      email: `mock_${stamp}_${i}@footballica.local`,
      displayName: clubName,
      avatar,
      weeklyXp: randomInt(50, 2000),
      matchesPlayed: randomInt(1, 20),
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
              matchesPlayed: r.matchesPlayed,
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

type RawUser = {
  id: string;
  displayName: string | null;
  managerAvatar: string | null;
  weeklyXp: number;
  club: {
    name: string;
    avatar: string | null;
    matchesPlayed: number;
    lastPlayedDate: Date | null;
  } | null;
};

function playStateOf(u: RawUser): LeaderboardPlayState {
  const matches = u.club?.matchesPlayed ?? 0;
  const playedSignal = matches > 0 || u.club?.lastPlayedDate != null;
  if (u.weeklyXp > 0) return "scored";
  if (playedSignal) return "playedZero";
  return "unplayed";
}

/**
 * Rank order for weekly-active players (weeklyXp > 0):
 * XP desc, then fewer matchesPlayed (efficiency), then stable id.
 */
function compareActiveUsers(a: RawUser, b: RawUser): number {
  if (b.weeklyXp !== a.weeklyXp) return b.weeklyXp - a.weeklyXp;
  const ma = a.club?.matchesPlayed ?? 0;
  const mb = b.club?.matchesPlayed ?? 0;
  if (ma !== mb) return ma - mb;
  return a.id.localeCompare(b.id);
}

function toRow(
  u: RawUser,
  rank: number,
  currentUserId: string | null,
): LeaderboardRow {
  return {
    rank,
    userId: u.id,
    clubName: u.club?.name ?? u.displayName ?? "Unknown Club",
    avatarKey: toAvatarKey(u.club?.avatar ?? u.managerAvatar),
    weeklyXp: u.weeklyXp,
    matchesPlayed: u.club?.matchesPlayed ?? 0,
    playState: playStateOf(u),
    isCurrentUser: currentUserId !== null && currentUserId === u.id,
  };
}

/**
 * Weekly league standings: humans with weeklyXp > 0 only (Top 50).
 * Unplayed / zero-XP players are excluded from the table.
 */
export async function getLeaderboard(): Promise<LeaderboardPayload> {
  try {
    await ensureWeeklyLeagueReset();
  } catch (err) {
    console.error("ensureWeeklyLeagueReset in getLeaderboard", err);
  }

  const activeCount = await prisma.user.count({
    where: { isBot: false, weeklyXp: { gt: 0 } },
  });
  if (activeCount < MIN_USERS_FOR_UI) {
    await seedMockUsers(SEED_COUNT);
  }

  const currentUserId = await getSessionUserId();

  const users = (await prisma.user.findMany({
    where: { isBot: false },
    select: {
      id: true,
      displayName: true,
      managerAvatar: true,
      weeklyXp: true,
      club: {
        select: {
          name: true,
          avatar: true,
          matchesPlayed: true,
          lastPlayedDate: true,
        },
      },
    },
  })) as RawUser[];

  // Only this week's active scorers appear in the league table.
  const ranked = users
    .filter((u) => u.weeklyXp > 0)
    .sort(compareActiveUsers);
  const top = ranked.slice(0, TOP_N);
  const rows = top.map((u, index) => toRow(u, index + 1, currentUserId));

  let currentUserRow: LeaderboardRow | null =
    rows.find((r) => r.isCurrentUser) ?? null;

  // Sticky "you" bar even when you haven't scored this week yet.
  if (!currentUserRow && currentUserId) {
    const me = users.find((u) => u.id === currentUserId);
    if (me) {
      const activeIdx = ranked.findIndex((u) => u.id === currentUserId);
      currentUserRow = toRow(
        me,
        activeIdx >= 0 ? activeIdx + 1 : 0,
        currentUserId,
      );
    }
  }

  return {
    resetsInDays: tehranWeekDaysRemaining(),
    rows,
    currentUserRow,
  };
}
