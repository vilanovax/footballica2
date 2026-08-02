"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Pencil,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { updateReportStatus } from "@/actions/admin/reports";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DifficultyBadge,
  ReportStatusBadge,
  TypeBadge,
} from "@/components/admin/AdminBadge";

type ReportStatus = "PENDING" | "RESOLVED" | "REJECTED";
type LocaleContent = { text?: string; options?: string[]; category?: string };

export type ReportReviewData = {
  report: {
    id: string;
    reasonLabel: string;
    note: string | null;
    status: ReportStatus;
    dateLabel: string;
    timeLabel: string;
  };
  question: {
    id: string;
    type: "TEXT" | "IMAGE" | "CAREER_PATH" | "HIGHER_LOWER" | "REVEAL_IMAGE";
    difficulty: "EASY" | "MEDIUM" | "HARD";
    correctIndex: number;
    mediaUrl: string | null;
    content: unknown;
  };
};

function parse(content: unknown): { en: LocaleContent; fa: LocaleContent } {
  const c = (content ?? {}) as { en?: LocaleContent; fa?: LocaleContent };
  return { en: c.en ?? {}, fa: c.fa ?? {} };
}

export function ReportReview({ report, question }: ReportReviewData) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { en, fa } = parse(question.content);

  const enText = en.text?.trim() || "Untitled question";
  const faText = fa.text?.trim() || "";

  function moderate(next: ReportStatus, label: string) {
    start(async () => {
      const res = await updateReportStatus(report.id, next);
      if (res.ok) {
        toast.success(label);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full max-w-xl items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-start transition hover:border-emerald-300 hover:bg-emerald-50/40"
      >
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold text-slate-900">
            {enText}
          </span>
          {faText ? (
            <span
              dir="rtl"
              className="mt-0.5 line-clamp-1 block text-xs text-slate-500"
            >
              {faText}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs font-bold text-emerald-700 group-hover:underline">
          Review
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="ltr" className="admin max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pe-6">
              <DialogTitle>Triage report</DialogTitle>
              <ReportStatusBadge status={report.status} />
            </div>
            <DialogDescription>
              Resolve = fixed or accepted. Reject = no change to the question.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-semibold text-amber-950">
              Flag: {report.reasonLabel}
            </p>
            {report.note ? (
              <p className="mt-1 text-amber-900">{report.note}</p>
            ) : null}
            <p className="mt-1 text-xs font-medium text-amber-800/80" dir="rtl">
              {report.dateLabel} · {report.timeLabel}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TypeBadge type={question.type} />
              <DifficultyBadge difficulty={question.difficulty} />
            </div>

            {question.type === "IMAGE" && question.mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={question.mediaUrl}
                alt=""
                className="max-h-40 rounded-lg border object-cover"
              />
            )}

            <div>
              <p className="font-semibold text-slate-900">{enText}</p>
              {faText && (
                <p dir="rtl" className="text-sm text-slate-500">
                  {faText}
                </p>
              )}
            </div>

            <OptionList
              label="English options"
              options={en.options}
              correctIndex={question.correctIndex}
            />
            <OptionList
              label="Persian options"
              options={fa.options}
              correctIndex={question.correctIndex}
              rtl
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/questions/${question.id}/edit`}>
                <Pencil className="h-3.5 w-3.5" />
                Edit question
              </Link>
            </Button>
            <div className="flex gap-2">
              {report.status === "PENDING" ? (
                <>
                  <Button
                    size="sm"
                    disabled={pending}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() =>
                      moderate("RESOLVED", "Resolved — issue handled.")
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() =>
                      moderate("REJECTED", "Rejected — no change needed.")
                    }
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => moderate("PENDING", "Reopened.")}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reopen
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OptionList({
  label,
  options,
  correctIndex,
  rtl,
}: {
  label: string;
  options?: string[];
  correctIndex: number;
  rtl?: boolean;
}) {
  if (!options?.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <ul className="space-y-1" dir={rtl ? "rtl" : "ltr"}>
        {options.map((opt, i) => {
          const correct = i === correctIndex;
          return (
            <li
              key={i}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                correct
                  ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-900"
                  : "border-slate-200 text-slate-700"
              }`}
            >
              {correct ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{opt}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
