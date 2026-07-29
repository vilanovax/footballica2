import { listAdminGridPuzzles } from "@/actions/admin/grid";
import { GridPuzzlesPanel } from "@/components/admin/GridPuzzlesPanel";
import {
  AdminHelpTip,
  AdminHowItWorks,
} from "@/components/admin/AdminHelpTip";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminGridPage() {
  const { todayKey, puzzles, ruleOptions } = await listAdminGridPuzzles();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Football Grid
          <AdminHelpTip
            wide
            title="Game of the Day (even days)"
            text="One 3×3 axis puzzle per Tehran day. Cron fills missing days; publishing here overrides. Preview requires every cell to have ≥1 matching active player."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live-Ops schedule for جدول فوتبال · player attrs from{" "}
          <Link
            href="/admin/players"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            Players
          </Link>
        </p>
      </div>

      <AdminHowItWorks
        title="Daily routine"
        steps={[
          "Keep Players catalog filled (league, position, nation, club).",
          "Auto-fill or set 3 row + 3 column axes, then Preview.",
          "Save only when all 9 cells are green — live on /play/grid.",
        ]}
      />

      <GridPuzzlesPanel
        todayKey={todayKey}
        initialPuzzles={puzzles}
        ruleOptions={ruleOptions}
      />
    </div>
  );
}
