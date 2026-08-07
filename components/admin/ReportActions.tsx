"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Pencil, RotateCcw } from "lucide-react";
import { updateReportStatus } from "@/actions/admin/reports";
import { Button } from "@/components/ui/button";

type ReportActionsProps = {
  reportId: string;
  questionId: string;
  status: "PENDING" | "RESOLVED" | "REJECTED";
  /** Compact icon-only row for cards. */
  compact?: boolean;
};

export function ReportActions({
  reportId,
  questionId,
  status,
  compact,
}: ReportActionsProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function setStatus(next: "PENDING" | "RESOLVED" | "REJECTED", label: string) {
    start(async () => {
      const res = await updateReportStatus(reportId, next);
      if (res.ok) {
        toast.success(label);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {status === "PENDING" ? (
        <>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => setStatus("RESOLVED", "Resolved — issue handled.")}
            className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
            title="Question fixed or report accepted"
          >
            <Check className="h-3.5 w-3.5" />
            {compact ? null : "Resolve"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setStatus("REJECTED", "Rejected — no change needed.")}
            className="h-8 gap-1.5 border-rose-200 bg-white text-rose-800 hover:bg-rose-50"
            title="Report invalid / won't change question"
          >
            <X className="h-3.5 w-3.5" />
            {compact ? null : "Reject"}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setStatus("PENDING", "Reopened for triage.")}
          className="h-8 gap-1.5 border-slate-200 bg-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reopen
        </Button>
      )}
      <Button
        asChild
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-slate-800"
      >
        <Link href={`/admin/questions/${questionId}/edit`}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
      </Button>
    </div>
  );
}
