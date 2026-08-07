import { Search } from "lucide-react";
import Link from "next/link";
import { listAdminMysteryPuzzles } from "@/actions/admin/mystery";
import { getGameConfig } from "@/actions/admin/config";
import { MysteryPuzzlesPanel } from "@/components/admin/MysteryPuzzlesPanel";
import { ModePlacementBadges } from "@/components/admin/ModePlacementBadges";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { liveModesFromConfig } from "@/lib/game/liveModes";
import { formatJalaliLabel } from "@/lib/admin/jalali";

export const dynamic = "force-dynamic";

export default async function AdminMysteryPage() {
  const [{ todayKey, puzzles, players }, config] = await Promise.all([
    listAdminMysteryPuzzles(),
    getGameConfig(),
  ]);
  const placement = liveModesFromConfig(config).mystery;
  const today = puzzles.find((p) => p.dateKey === todayKey) ?? null;
  const upcoming = puzzles.filter((p) => p.dateKey > todayKey).length;
  const past = puzzles.filter((p) => p.dateKey < todayKey).length;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-300 ring-1 ring-violet-400/30">
                <Search className="h-3 w-3" strokeWidth={2.5} />
                GotD
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
                بازیکن مرموز · {formatJalaliLabel(todayKey)}
              </span>
            </div>
            <ModePlacementBadges placement={placement} />
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Mystery Day
            <AdminHelpTip
              wide
              title="Mysterious Player"
              text="یک پازل برای هر روز تهران. ذخیرهٔ هدف امروز فوراً روی GotD می‌رود. Fill week فقط روزهای خالی را می‌سازد و بازنویسی نمی‌کند. تاریخ در پنل به‌صورت شمسی نمایش داده می‌شود."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            Daily guess target ·{" "}
            <Link
              href="/admin/modes"
              className="font-semibold text-violet-300 underline-offset-2 hover:underline"
            >
              Modes
            </Link>
            {" · "}
            <Link
              href="/admin/players"
              className="font-semibold text-violet-300 underline-offset-2 hover:underline"
            >
              Players
            </Link>
          </p>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat label="Today plays" value={today?.attemptCount ?? 0} />
            <HeroStat label="Solved" value={today?.solvedCount ?? 0} />
            <HeroStat label="Upcoming" value={upcoming} muted />
            <HeroStat label="Past" value={past} muted />
          </div>
        </div>
      </div>

      <MysteryPuzzlesPanel
        todayKey={todayKey}
        initialPuzzles={puzzles}
        players={players}
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
