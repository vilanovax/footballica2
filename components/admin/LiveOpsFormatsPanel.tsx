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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers className="h-4 w-4 text-emerald-600" />
          Visual format pack
        </CardTitle>
        <CardDescription>
          Idempotent upsert from{" "}
          <code className="rounded bg-slate-100 px-1 text-[11px]">
            prisma/seeds/format-questions.json
          </code>
          . Draw bias (~1/5) only fires when these are Published.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LABELS.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="font-mono text-lg font-bold tabular-nums text-slate-900">
                {snap.published[key]}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Seed file rows:{" "}
          <span className="font-mono font-semibold text-slate-700">
            {snap.packSize}
          </span>
        </p>
        <Button type="button" disabled={pending} onClick={sync}>
          <RefreshCw
            className={`me-1.5 h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
          />
          {pending ? "Syncing…" : "Sync format pack"}
        </Button>
      </CardContent>
    </Card>
  );
}
