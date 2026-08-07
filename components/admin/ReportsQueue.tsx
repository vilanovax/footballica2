"use client";

import Link from "next/link";
import { Flag, Inbox } from "lucide-react";
import { ReportReview } from "@/components/admin/ReportReview";
import { ReportActions } from "@/components/admin/ReportActions";
import { ReportStatusBadge, TypeBadge } from "@/components/admin/AdminBadge";
import type { ReportFilterKey } from "@/components/admin/ReportFilters";

type LocaleContent = { text?: string; options?: string[] };

export type ReportQueueItem = {
  id: string;
  reasonLabel: string;
  note: string | null;
  status: "PENDING" | "RESOLVED" | "REJECTED";
  dateLabel: string;
  timeLabel: string;
  questionId: string;
  questionType: "TEXT" | "IMAGE" | "CAREER_PATH" | "HIGHER_LOWER" | "REVEAL_IMAGE";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  correctIndex: number;
  mediaUrl: string | null;
  content: unknown;
};

function parseContent(content: unknown): { en: string; fa: string } {
  const c = (content ?? {}) as { en?: LocaleContent; fa?: LocaleContent };
  return {
    en: c.en?.text?.trim() || "Untitled question",
    fa: c.fa?.text?.trim() || "",
  };
}

export function ReportsQueue({
  items,
  active,
  pendingCount,
}: {
  items: ReportQueueItem[];
  active: ReportFilterKey;
  pendingCount: number;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 px-4 py-12 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 ring-1 ring-slate-200">
          {active === "PENDING" ? (
            <Inbox className="h-5 w-5" strokeWidth={2} />
          ) : (
            <Flag className="h-5 w-5" strokeWidth={2} />
          )}
        </span>
        <p className="text-sm font-semibold text-slate-900">
          {active === "PENDING"
            ? "Triage queue is clear"
            : "Nothing in this filter"}
        </p>
        <p className="max-w-sm text-xs font-medium text-slate-700">
          {active === "PENDING"
            ? pendingCount === 0
              ? "Players flag bad questions from the quiz. New reports land here for Resolve / Reject."
              : "Switch filters to browse older reports."
            : "Try New or All to see the full queue."}
        </p>
        {active === "PENDING" && pendingCount === 0 ? (
          <ButtonLink href="/admin/questions" label="Open question bank" />
        ) : null}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const { en, fa } = parseContent(item.content);
        return (
          <li
            key={item.id}
            className={[
              "rounded-xl border bg-white px-3.5 py-3 shadow-sm",
              item.status === "PENDING"
                ? "border-amber-200 ring-1 ring-amber-100"
                : "border-slate-200/90",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 ring-1 ring-amber-200">
                    {item.reasonLabel}
                  </span>
                  <ReportStatusBadge status={item.status} />
                  <TypeBadge type={item.questionType} />
                  <span
                    className="text-[11px] font-medium text-slate-700"
                    dir="rtl"
                  >
                    {item.dateLabel} · {item.timeLabel}
                  </span>
                </div>

                <ReportReview
                  report={{
                    id: item.id,
                    reasonLabel: item.reasonLabel,
                    note: item.note,
                    status: item.status,
                    dateLabel: item.dateLabel,
                    timeLabel: item.timeLabel,
                  }}
                  question={{
                    id: item.questionId,
                    type: item.questionType,
                    difficulty: item.difficulty,
                    correctIndex: item.correctIndex,
                    mediaUrl: item.mediaUrl,
                    content: item.content,
                  }}
                />

                {item.note ? (
                  <p className="line-clamp-2 text-xs font-medium text-slate-700">
                    Player note: {item.note}
                  </p>
                ) : null}

                <p className="sr-only">
                  {en}
                  {fa ? ` · ${fa}` : ""}
                </p>
              </div>

              <ReportActions
                reportId={item.id}
                questionId={item.questionId}
                status={item.status}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ButtonLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-2 inline-flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500"
    >
      {label}
    </Link>
  );
}
