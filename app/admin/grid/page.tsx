import { Grid3x3 } from "lucide-react";
import Link from "next/link";
import { listAdminGridPuzzles } from "@/actions/admin/grid";
import { getGameConfig } from "@/actions/admin/config";
import { GridPuzzlesPanel } from "@/components/admin/GridPuzzlesPanel";
import { ModePlacementBadges } from "@/components/admin/ModePlacementBadges";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { liveModesFromConfig } from "@/lib/game/liveModes";

export const dynamic = "force-dynamic";

export default async function AdminGridPage() {
  const [{ todayKey, puzzles, ruleOptions }, config] = await Promise.all([
    listAdminGridPuzzles(),
    getGameConfig(),
  ]);
  const placement = liveModesFromConfig(config).grid;
  const today = puzzles.find((p) => p.dateKey === todayKey) ?? null;
  const upcoming = puzzles.filter((p) => p.dateKey > todayKey).length;
  const solvable = puzzles.filter((p) => p.solvable).length;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-300 ring-1 ring-sky-400/30">
                <Grid3x3 className="h-3 w-3" strokeWidth={2.5} />
                Immortal
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
                جدول فوتبال · {todayKey}
              </span>
            </div>
            <ModePlacementBadges placement={placement} />
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Grid Day
            <AdminHelpTip
              wide
              title="Football Grid"
              text="Auto-fill builds a solvable 3×3. Preview colors cells (green ≥ 3). Save only when all 9 are green. Fill week creates missing days only."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            Daily 3×3 ·{" "}
            <Link
              href="/admin/modes"
              className="font-semibold text-sky-300 underline-offset-2 hover:underline"
            >
              Modes
            </Link>
            {" · "}
            <Link
              href="/admin/players"
              className="font-semibold text-sky-300 underline-offset-2 hover:underline"
            >
              Players
            </Link>
          </p>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat label="Today plays" value={today?.attemptCount ?? 0} />
            <HeroStat label="Solved" value={today?.solvedCount ?? 0} />
            <HeroStat label="Upcoming" value={upcoming} muted />
            <HeroStat label="Solvable" value={solvable} muted />
          </div>
        </div>
      </div>

      <GridPuzzlesPanel
        todayKey={todayKey}
        initialPuzzles={puzzles}
        ruleOptions={ruleOptions}
      />
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
