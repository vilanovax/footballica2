"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, RefreshCw } from "lucide-react";
import {
  syncLiveopsFormatsAction,
  type LiveopsFormatsSnapshot,
} from "@/actions/admin/liveopsFormats";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { Button } from "@/components/ui/button";

const LABELS: { key: keyof LiveopsFormatsSnapshot["published"]; label: string }[] =
  [
    { key: "IMAGE", label: "IMAGE" },
    { key: "CAREER_PATH", label: "CAREER" },
    { key: "HIGHER_LOWER", label: "H/L" },
    { key: "REVEAL_IMAGE", label: "REVEAL" },
  ];

export function LiveOpsFormatsPanel({
  initial,
}: {
  initial: LiveopsFormatsSnapshot;
}) {
  const router = useRouter();
  const [snap, setSnap] = useState(initial);
  const [pending, startTransition] = useTransition();

  function sync() {
    startTransition(async () => {
      const res = await syncLiveopsFormatsAction();
      if (!res.ok) {
        toast.error("Could not sync format pack.");
        return;
      }
      setSnap((prev) => ({
        ...prev,
        published: res.published,
      }));
      toast.success(
        `Synced ${res.upserted} format question(s) into the published bank.`,
      );
      router.refresh();
    });
  }

  const totalPublished = LABELS.reduce(
    (sum, { key }) => sum + snap.published[key],
    0,
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Layers className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
            Format pack
            <AdminHelpTip
              title="Published formats"
              text="Upserts seed format questions (image, career path, higher/lower, reveal) into the live bank. Counts show how many of each type are published."
            />
          </p>
          <p className="text-[11px] text-slate-500">
            {snap.packSize} seed rows · {totalPublished} published
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {LABELS.map(({ key, label }) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200"
          >
            {label}
            <span className="font-mono tabular-nums text-slate-900">
              {snap.published[key]}
            </span>
          </span>
        ))}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="ms-auto h-9"
        disabled={pending}
        onClick={sync}
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
        />
        {pending ? "Syncing…" : "Sync"}
      </Button>
    </div>
  );
}
