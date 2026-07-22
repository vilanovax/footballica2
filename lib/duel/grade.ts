import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  DuelAnswerLogEntry,
  DuelAnswerSubmission,
} from "@/lib/duel/types";

export type { DuelAnswerSubmission };

/**
 * Grade client submissions against the locked question ids.
 * Re-derives correctness from the DB (never trusts client `correct`).
 */
export async function gradeDuelAnswers(
  questionIds: string[],
  submissions: DuelAnswerSubmission[],
): Promise<DuelAnswerLogEntry[]> {
  if (questionIds.length === 0) {
    throw new Error("no_questions");
  }

  const byId = new Map(submissions.map((s) => [s.questionId, s]));
  for (const id of questionIds) {
    if (!byId.has(id)) throw new Error("incomplete_answers");
  }
  // Reject extras / swapped ids.
  if (submissions.length !== questionIds.length) {
    throw new Error("incomplete_answers");
  }
  for (const s of submissions) {
    if (!questionIds.includes(s.questionId)) throw new Error("invalid_question");
  }

  const rows = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, correctIndex: true },
  });
  if (rows.length !== questionIds.length) {
    throw new Error("missing_questions");
  }
  const correctById = new Map(rows.map((r) => [r.id, r.correctIndex]));

  return questionIds.map((id) => {
    const sub = byId.get(id)!;
    const correctIndex = correctById.get(id)!;
    const selected = Number(sub.selectedIndex);
    return {
      questionId: id,
      selectedIndex: selected,
      correct: selected === correctIndex,
      ms: typeof sub.ms === "number" ? Math.max(0, Math.round(sub.ms)) : undefined,
    };
  });
}
