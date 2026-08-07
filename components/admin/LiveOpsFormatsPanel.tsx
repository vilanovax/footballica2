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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-3.5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
          <Layers className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
            Format pack
            <AdminHelpTip
              title="Published formats"
              text="Upserts seed format questions (image, career path, higher/lower, reveal) into the live bank. Counts show how many of each type are published."
            />
          </p>
          <p className="text-[11px] font-medium text-slate-600">
            {snap.packSize} seed rows · {totalPublished} published in bank
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={pending}
          onClick={sync}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
          />
          {pending ? "Syncing…" : "Sync pack"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-3.5 py-3">
        {LABELS.map(({ key, label }) => {
          const count = snap.published[key];
          const empty = count === 0;
          return (
            <span
              key={key}
              className={[
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ring-1",
                empty
                  ? "bg-amber-50 text-amber-900 ring-amber-200"
                  : "bg-emerald-50 text-emerald-900 ring-emerald-200",
              ].join(" ")}
            >
              {label}
              <span className="rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
                {count}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
