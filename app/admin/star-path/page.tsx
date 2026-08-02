import { listAdminStarPathPuzzles } from "@/actions/admin/starpath";
import { getGameConfig } from "@/actions/admin/config";
import { StarPathPuzzlesPanel } from "@/components/admin/StarPathPuzzlesPanel";
import { ModePlacementBadges } from "@/components/admin/ModePlacementBadges";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { liveModesFromConfig } from "@/lib/game/liveModes";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminStarPathPage() {
  const [{ todayKey, puzzles, players }, config] = await Promise.all([
    listAdminStarPathPuzzles(),
    getGameConfig(),
  ]);
  const placement = liveModesFromConfig(config).starPath;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
            Star Path
            <AdminHelpTip
              wide
              title="مسیر ستاره"
              text="One career-club path per Tehran day. Saving freezes pathJson so catalog edits don’t change mid-day. Pick players with ≥2 club steps. Fill week only creates missing days."
            />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            مسیر ستاره ·{" "}
            <Link
              href="/admin/modes"
              className="font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              Modes
            </Link>
            {" · "}
            <Link
              href="/admin/players"
              className="font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              Players
            </Link>
          </p>
        </div>
        <ModePlacementBadges placement={placement} />
      </div>

      <StarPathPuzzlesPanel
        todayKey={todayKey}
        initialPuzzles={puzzles}
        players={players}
      />
    </div>
  );
}
