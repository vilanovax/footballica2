"use server";

import { prisma } from "@/lib/prisma";
import { REPORT_REASON_CODES } from "@/lib/reports/reasons";

export type SubmitReportResult = { ok: true } | { ok: false; error: string };

/**
 * Player-facing report submission. No auth yet, so `reporterId` stays null.
 * Untrusted input: we whitelist the reason code and verify the question exists
 * before inserting a PENDING row for the admin triage queue.
 */
export async function submitQuestionReport(
  questionId: string,
  reason: string,
  note?: string,
): Promise<SubmitReportResult> {
  if (!questionId) return { ok: false, error: "Missing question." };
  if (!REPORT_REASON_CODES.includes(reason)) {
    return { ok: false, error: "Invalid reason." };
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!question) return { ok: false, error: "Question not found." };

  const trimmedNote = note?.trim();

  try {
    await prisma.questionReport.create({
      data: {
        questionId,
        reporterId: null,
        reason,
        note: trimmedNote ? trimmedNote.slice(0, 500) : null,
        status: "PENDING",
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not submit report." };
  }
}
