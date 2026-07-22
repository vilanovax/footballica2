import "server-only";

import { prisma } from "@/lib/prisma";

export type AnswerStat = {
  /** Correct answers (numerator). */
  correct: number;
  /** Questions answered (denominator). */
  total: number;
};

/**
 * Aggregate correct / answered for a batch of users from Match rows + Duel rounds.
 */
export async function answerStatsForUsers(
  userIds: string[],
): Promise<Map<string, AnswerStat>> {
  const map = new Map<string, AnswerStat>();
  for (const id of userIds) {
    map.set(id, { correct: 0, total: 0 });
  }
  if (userIds.length === 0) return map;

  const matchAgg = await prisma.match.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, status: "COMPLETED" },
    _sum: { correctCount: true, questionsTotal: true },
  });
  for (const row of matchAgg) {
    const s = map.get(row.userId);
    if (!s) continue;
    s.correct += row._sum.correctCount ?? 0;
    s.total += row._sum.questionsTotal ?? 0;
  }

  const duels = await prisma.duelMatch.findMany({
    where: {
      OR: [
        { challengerId: { in: userIds } },
        { opponentId: { in: userIds } },
      ],
    },
    select: {
      challengerId: true,
      opponentId: true,
      rounds: {
        select: {
          attackerId: true,
          attackCorrect: true,
          defenseCorrect: true,
          attackSubmittedAt: true,
          defenseSubmittedAt: true,
          questionIds: true,
        },
      },
    },
    take: 3000,
  });

  for (const duel of duels) {
    for (const round of duel.rounds) {
      const qCount = Array.isArray(round.questionIds)
        ? (round.questionIds as unknown[]).length
        : 0;
      if (qCount === 0) continue;

      if (round.attackSubmittedAt && map.has(round.attackerId)) {
        const s = map.get(round.attackerId)!;
        s.correct += round.attackCorrect;
        s.total += qCount;
      }

      if (round.defenseSubmittedAt) {
        const defenderId =
          round.attackerId === duel.challengerId
            ? duel.opponentId
            : duel.challengerId;
        if (defenderId && map.has(defenderId)) {
          const s = map.get(defenderId)!;
          s.correct += round.defenseCorrect;
          s.total += qCount;
        }
      }
    }
  }

  return map;
}

export function formatAnswerStat(stat: AnswerStat): string {
  return `${stat.correct}/${stat.total}`;
}
