import { listAdminMysteryPuzzles } from "@/actions/admin/mystery";
import { getGameConfig } from "@/actions/admin/config";
import { MysteryPuzzlesPanel } from "@/components/admin/MysteryPuzzlesPanel";
import { ModePlacementBadges } from "@/components/admin/ModePlacementBadges";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { liveModesFromConfig } from "@/lib/game/liveModes";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminMysteryPage() {
  const [{ todayKey, puzzles, players }, config] = await Promise.all([
    listAdminMysteryPuzzles(),
    getGameConfig(),
  ]);
  const placement = liveModesFromConfig(config).mystery;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
            Mystery Day
            <AdminHelpTip
              wide
              title="Mysterious Player"
              text="One puzzle per Tehran day. Saving today’s target updates GotD immediately. Fill 7-day gaps only creates missing days — never overwrites."
            />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            بازیکن مرموز ·{" "}
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

      <MysteryPuzzlesPanel
        todayKey={todayKey}
        initialPuzzles={puzzles}
        players={players}
      />
    </div>
  );
}
