import { listAdminGridPuzzles } from "@/actions/admin/grid";
import { getGameConfig } from "@/actions/admin/config";
import { GridPuzzlesPanel } from "@/components/admin/GridPuzzlesPanel";
import { ModePlacementBadges } from "@/components/admin/ModePlacementBadges";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { liveModesFromConfig } from "@/lib/game/liveModes";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminGridPage() {
  const [{ todayKey, puzzles, ruleOptions }, config] = await Promise.all([
    listAdminGridPuzzles(),
    getGameConfig(),
  ]);
  const placement = liveModesFromConfig(config).grid;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
            Grid Day
            <AdminHelpTip
              wide
              title="Football Grid"
              text="Auto-fill builds a solvable 3×3. Preview colors cells (green ≥ 3). Save only when all 9 are green. Fill week creates missing days only."
            />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            جدول فوتبال ·{" "}
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

      <GridPuzzlesPanel
        todayKey={todayKey}
        initialPuzzles={puzzles}
        ruleOptions={ruleOptions}
      />
    </div>
  );
}
