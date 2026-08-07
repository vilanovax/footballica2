import { ContactRound } from "lucide-react";
import { listAdminPlayers } from "@/actions/admin/players";
import { PlayersPanel } from "@/components/admin/PlayersPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminPlayersPage() {
  const players = await listAdminPlayers();
  const active = players.filter((p) => p.isActive).length;
  const byPos = {
    GK: players.filter((p) => p.position === "GK").length,
    DEF: players.filter((p) => p.position === "DEF").length,
    MID: players.filter((p) => p.position === "MID").length,
    FWD: players.filter((p) => p.position === "FWD").length,
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
              <ContactRound className="h-3 w-3" strokeWidth={2.5} />
              Catalog
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
              Mystery · Grid · بازیکن مرموز
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Players
            <AdminHelpTip
              wide
              title="Mystery catalog"
              text="Guess targets for Game of the Day. Slug is permanent. Keep nation / pos / club / age / # accurate — they drive feedback. Prefer Disable over delete."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            Shared roster for Mystery feedback and Immortal Grid intersections.
          </p>
          <div className="mt-3 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-5">
            <HeroStat label="Active" value={active} />
            <HeroStat label="Total" value={players.length} />
            <HeroStat label="GK" value={byPos.GK} muted />
            <HeroStat label="DEF·MID" value={byPos.DEF + byPos.MID} muted />
            <HeroStat label="FWD" value={byPos.FWD} muted />
          </div>
        </div>
      </div>

      <PlayersPanel initialPlayers={players} />
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
