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
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
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
        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
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
              "rounded-2xl border bg-white p-4 shadow-sm transition",
              item.status === "PENDING"
                ? "border-amber-200 ring-1 ring-amber-50"
                : "border-slate-200",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    {item.reasonLabel}
                  </span>
                  <ReportStatusBadge status={item.status} />
                  <TypeBadge type={item.questionType} />
                  <span
                    className="text-[11px] font-medium text-slate-500"
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
                  <p className="line-clamp-2 text-xs text-slate-600">
                    Player note: {item.note}
                  </p>
                ) : null}

                {/* Hidden text for a11y / SEO of card body when Review button truncates */}
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
      className="mt-4 inline-flex h-9 items-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
    >
      {label}
    </Link>
  );
}
