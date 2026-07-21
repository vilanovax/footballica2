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
};

export function ReportActions({
  reportId,
  questionId,
  status,
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
    <div className="flex items-center justify-end gap-1">
      {status === "PENDING" ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setStatus("RESOLVED", "Marked resolved.")}
            className="text-emerald-600 hover:text-emerald-700"
          >
            <Check className="h-3.5 w-3.5" />
            Resolve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setStatus("REJECTED", "Marked rejected.")}
            className="text-rose-600 hover:text-rose-700"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setStatus("PENDING", "Reopened.")}
          className="text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reopen
        </Button>
      )}
      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/questions/${questionId}/edit`}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
      </Button>
    </div>
  );
}
