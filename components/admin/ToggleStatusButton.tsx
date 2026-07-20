"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleQuestionStatus } from "@/actions/admin/questions";
import { Button } from "@/components/ui/button";

export function ToggleStatusButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await toggleQuestionStatus(id, !isActive);
          if (res.ok) {
            toast.success(isActive ? "Question deactivated." : "Question activated.");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? "…" : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
