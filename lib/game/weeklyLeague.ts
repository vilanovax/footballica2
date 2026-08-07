import "server-only";

import { prisma } from "@/lib/prisma";
import { GAME_CONFIG_ID } from "@/lib/game/gameConfig";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";
import { WEEKLY_PRIZE_TIERS } from "@/lib/game/weeklyPrizes";

const weekFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * ISO-like week key in Asia/Tehran: `YYYY-Www` (Mon-start weeks).
 * Used to reset `User.weeklyXp` for the seasonal / weekly league.
 */
/** Whole Tehran calendar days remaining until next Monday 00:00 (1–7). */
export function tehranWeekDaysRemaining(date: Date = new Date()): number {
  const parts = weekFormatter.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const utc = new Date(Date.UTC(year, month - 1, day, 12));
  const dayNum = utc.getUTCDay() || 7; // Mon=1 … Sun=7
  return dayNum === 1 ? 7 : 8 - dayNum;
}

export function tehranWeekKey(date: Date = new Date()): string {
  const parts = weekFormatter.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const year = get("year");
  const month = get("month");
  const day = get("day");
  // Treat Tehran Y-M-D as UTC noon to avoid DST edge flips on the ordinal.
  const utc = Date.UTC(year, month - 1, day, 12);
  const d = new Date(utc);
  // ISO week: Thursday determines week-year.
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  const weekYear = d.getUTCFullYear();
  return `${weekYear}-W${String(weekNo).padStart(2, "0")}`;
}

type ConfigBag = Record<string, unknown> & { leagueWeekKey?: string };

/**
 * If the Tehran week rolled over, archive the human podium to Hall of Fame,
 * pay `WEEKLY_PRIZE_TIERS` (coins → club, XP → user), zero human `weeklyXp`
 * (bots + mock emails keep scores), and stamp the new week on GameConfig.
 */
export async function ensureWeeklyLeagueReset(
  now = new Date(),
): Promise<{ reset: boolean; weekKey: string; prizesPaid: number }> {
  const weekKey = tehranWeekKey(now);
  const row = await prisma.gameConfig.findUnique({
    where: { id: GAME_CONFIG_ID },
  });
  const prev = (row?.config ?? {}) as ConfigBag;
  if (prev.leagueWeekKey === weekKey) {
    return { reset: false, weekKey, prizesPaid: 0 };
  }

  const previousWeekKey =
    typeof prev.leagueWeekKey === "string" && prev.leagueWeekKey.length > 0
      ? prev.leagueWeekKey
      : null;

  let prizesPaid = 0;

  await prisma.$transaction(async (tx) => {
    // Hall of Fame + prize payout before wiping scores.
    if (previousWeekKey) {
      const podium = await tx.user.findMany({
        where: {
          isBot: false,
          weeklyXp: { gt: 0 },
          NOT: { email: { endsWith: "@footballica.local" } },
        },
        orderBy: [{ weeklyXp: "desc" }, { createdAt: "asc" }],
        take: 3,
        select: { id: true, weeklyXp: true, club: { select: { id: true } } },
      });

      if (podium.length > 0) {
        await tx.hallOfFame.createMany({
          data: podium.map((u, i) => ({
            userId: u.id,
            tehranWeekKey: previousWeekKey,
            rank: i + 1,
            xp: u.weeklyXp,
          })),
          skipDuplicates: true,
        });

        // Idempotent vs re-archive: only pay if HoF row was new for this week+rank.
        // createMany skipDuplicates means we still pay once per reset run —
        // leagueWeekKey stamp prevents a second reset in the same week.
        for (let i = 0; i < podium.length; i++) {
          const place = (i + 1) as 1 | 2 | 3;
          const tier = WEEKLY_PRIZE_TIERS.find((t) => t.place === place);
          const u = podium[i]!;
          if (!tier || !u.club) continue;

          if (tier.coins > 0) {
            await tx.club.update({
              where: { id: u.club.id },
              data: { coins: { increment: tier.coins } },
            });
          }
          if (tier.xp > 0) {
            await tx.user.update({
              where: { id: u.id },
              data: { xp: { increment: tier.xp } },
            });
          }
          prizesPaid += 1;
        }
      }
    }

    // Humans only — keep seed/mock leaderboard flavor (`*@footballica.local`).
    await tx.user.updateMany({
      where: {
        isBot: false,
        NOT: { email: { endsWith: "@footballica.local" } },
      },
      data: { weeklyXp: 0 },
    });

    const nextConfig: ConfigBag = {
      ...(typeof prev === "object" && prev ? prev : {}),
      leagueWeekKey: weekKey,
    };
    // Keep a usable economy blob if the row was empty.
    if (!row) {
      await tx.gameConfig.create({
        data: {
          id: GAME_CONFIG_ID,
          config: {
            ...DEFAULT_GAME_CONFIG,
            leagueWeekKey: weekKey,
          } as object,
        },
      });
      return;
    }

    await tx.gameConfig.update({
      where: { id: GAME_CONFIG_ID },
      data: { config: nextConfig as object },
    });
  });

  return { reset: true, weekKey, prizesPaid };
}
