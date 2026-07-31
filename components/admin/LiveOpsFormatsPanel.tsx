"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, RefreshCw } from "lucide-react";
import {
  syncLiveopsFormatsAction,
  type LiveopsFormatsSnapshot,
} from "@/actions/admin/liveopsFormats";
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

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <Layers className="h-3.5 w-3.5 text-emerald-600" />
        Format pack
        <span className="font-normal text-slate-400">
          · {snap.packSize} seed rows
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {LABELS.map(({ key, label }) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200"
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
        className="ms-auto h-8"
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
