import { Radio } from "lucide-react";
import Link from "next/link";
import { getGameConfig } from "@/actions/admin/config";
import { LiveModesPanel } from "@/components/admin/LiveModesPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { LIVE_MODE_IDS } from "@/lib/game/liveModes";

export const dynamic = "force-dynamic";

export default async function AdminLiveModesPage() {
  const config = await getGameConfig();
  let duel = 0;
  let gotd = 0;
  let idle = 0;
  for (const id of LIVE_MODE_IDS) {
    const p = config.liveModes[id];
    if (p.duel) duel += 1;
    if (p.gotd) gotd += 1;
    if (!p.duel && !p.gotd) idle += 1;
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-300 ring-1 ring-sky-400/30">
              <Radio className="h-3 w-3" strokeWidth={2.5} />
              Live-Ops
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
              Placement · GameConfig.liveModes
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Live Modes
            <AdminHelpTip
              wide
              title="Mode Placement"
              text="Toggle each mode for Duel specials and/or Game of the Day. Content panels publish daily puzzles; placement is stored in GameConfig.liveModes."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            Flip where each engine appears · content panels for daily puzzles ·{" "}
            <Link
              href="/admin/config"
              className="font-semibold text-sky-300 underline-offset-2 hover:underline"
            >
              Game Config
            </Link>
          </p>
          <div className="mt-3 grid max-w-lg grid-cols-3 gap-2">
            <HeroStat label="Duel on" value={duel} />
            <HeroStat label="GotD on" value={gotd} />
            <HeroStat label="Idle" value={idle} muted />
          </div>
        </div>
      </div>

      <LiveModesPanel initialConfig={config} />
    </div>
  );
}

function HeroStat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10">
      <p
        className={[
          "text-sm font-bold tabular-nums",
          muted ? "text-white/85" : "text-white",
        ].join(" ")}
      >
        {value.toLocaleString("en-US")}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">
        {label}
      </p>
    </div>
  );
}
