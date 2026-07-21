"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { setQuestionStatus } from "@/actions/admin/questions";
import { Button } from "@/components/ui/button";

type QuestionStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "RETIRED";

/**
 * Icon toggle that flips a question between PUBLISHED and RETIRED (unpublished).
 * Fine-grained states (DRAFT / IN_REVIEW) are set from the edit form.
 */
export function ToggleStatusButton({
  id,
  status,
}: {
  id: string;
  status: QuestionStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isPublished = status === "PUBLISHED";
  const next: QuestionStatus = isPublished ? "RETIRED" : "PUBLISHED";
  const label = isPublished ? "Unpublish question" : "Publish question";

  return (
    <Button
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      disabled={pending}
      className={isPublished ? "text-emerald-600" : "text-slate-400"}
      onClick={() =>
        startTransition(async () => {
          const res = await setQuestionStatus(id, next);
          if (res.ok) {
            toast.success(isPublished ? "Question unpublished." : "Question published.");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPublished ? (
        <ToggleRight className="h-5 w-5" />
      ) : (
        <ToggleLeft className="h-5 w-5" />
      )}
    </Button>
  );
}
