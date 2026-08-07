import { Brain } from "lucide-react";
import Link from "next/link";
import { getAdminMemorySnapshot } from "@/actions/admin/memory";
import { MemoryAdminPanel } from "@/components/admin/MemoryAdminPanel";
import { ModePlacementBadges } from "@/components/admin/ModePlacementBadges";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { formatJalaliLabel } from "@/lib/admin/jalali";

export const dynamic = "force-dynamic";

export default async function AdminMemoryPage() {
  const snapshot = await getAdminMemorySnapshot();
  const today =
    snapshot.puzzles.find((p) => p.dateKey === snapshot.todayKey) ?? null;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-rose-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-300 ring-1 ring-rose-400/30">
                <Brain className="h-3 w-3" strokeWidth={2.5} />
                Pairs
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
                حافظه جفت‌ها · {formatJalaliLabel(snapshot.todayKey)}
              </span>
            </div>
            <ModePlacementBadges placement={snapshot.placement} />
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Memory Day
            <AdminHelpTip
              wide
              title="حافظه جفت‌ها"
              text="Duel special by default. Boards need active players with distinct ISO nationality codes. Tune pairs & timers here; flip Duel/GotD under Modes."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            Footballer ↔ nation ·{" "}
            <Link
              href="/admin/modes"
              className="font-semibold text-rose-300 underline-offset-2 hover:underline"
            >
              Modes
            </Link>
            {" · "}
            <Link
              href="/admin/players"
              className="font-semibold text-rose-300 underline-offset-2 hover:underline"
            >
              Players
            </Link>
          </p>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat label="Nations" value={snapshot.distinctNationCount} />
            <HeroStat
              label="Duel 7d"
              value={snapshot.recentMemoryDuelRounds}
            />
            <HeroStat
              label="Today plays"
              value={today?.attemptCount ?? 0}
              muted
            />
            <HeroStat
              label="Puzzles"
              value={snapshot.puzzles.length}
              muted
            />
          </div>
        </div>
      </div>

      <MemoryAdminPanel snapshot={snapshot} />
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
