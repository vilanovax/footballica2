"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";
import { isAvatarKey, type AvatarKey } from "@/lib/onboarding/avatars";

export type HallOfFameEntry = {
  id: string;
  tehranWeekKey: string;
  rank: number;
  xp: number;
  userId: string;
  clubName: string;
  avatarKey: AvatarKey;
  isCurrentUser: boolean;
};

export type HallOfFameWeek = {
  tehranWeekKey: string;
  entries: HallOfFameEntry[];
};

function toAvatarKey(raw: string | null | undefined): AvatarKey {
  return raw && isAvatarKey(raw) ? raw : "TACTICAL_COACH";
}

/**
 * Archived weekly podiums — newest weeks first, ranks 1→3 within each week.
 */
export async function getHallOfFame(
  limitWeeks = 12,
): Promise<HallOfFameWeek[]> {
  const sessionId = await getSessionUserId();

  const rows = await prisma.hallOfFame.findMany({
    orderBy: [{ tehranWeekKey: "desc" }, { rank: "asc" }],
    take: limitWeeks * 3,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          managerAvatar: true,
          club: { select: { name: true, avatar: true } },
        },
      },
    },
  });

  const byWeek = new Map<string, HallOfFameEntry[]>();
  for (const row of rows) {
    const entry: HallOfFameEntry = {
      id: row.id,
      tehranWeekKey: row.tehranWeekKey,
      rank: row.rank,
      xp: row.xp,
      userId: row.userId,
      clubName:
        row.user.club?.name ?? row.user.displayName ?? "Unknown Club",
      avatarKey: toAvatarKey(
        row.user.club?.avatar ?? row.user.managerAvatar,
      ),
      isCurrentUser: sessionId === row.userId,
    };
    const list = byWeek.get(row.tehranWeekKey) ?? [];
    list.push(entry);
    byWeek.set(row.tehranWeekKey, list);
  }

  return [...byWeek.entries()].map(([tehranWeekKey, entries]) => ({
    tehranWeekKey,
    entries: entries.sort((a, b) => a.rank - b.rank),
  }));
}
