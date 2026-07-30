import { listAdminGridPuzzles } from "@/actions/admin/grid";
import { GridPuzzlesPanel } from "@/components/admin/GridPuzzlesPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminGridPage() {
  const { todayKey, puzzles, ruleOptions } = await listAdminGridPuzzles();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
            Football Grid
            <AdminHelpTip
              wide
              title="Game of the Day (even days)"
              text="3×3 axes puzzle per Tehran day. Auto-fill builds a solvable board; Preview colors cells; Save only when all 9 are green."
            />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Today <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{todayKey}</code>
            {" · "}
            player data from{" "}
            <Link
              href="/admin/players"
              className="font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              Players
            </Link>
          </p>
        </div>
        <p className="max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Flow:</span> Auto-fill
          → check green cells → Save. Or Fill week for gaps.
        </p>
      </div>

      <GridPuzzlesPanel
        todayKey={todayKey}
        initialPuzzles={puzzles}
        ruleOptions={ruleOptions}
      />
    </div>
  );
}
