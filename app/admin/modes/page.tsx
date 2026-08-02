import { getGameConfig } from "@/actions/admin/config";
import { LiveModesPanel } from "@/components/admin/LiveModesPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLiveModesPage() {
  const config = await getGameConfig();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
            Live Modes
            <AdminHelpTip
              wide
              title="Mode Placement"
              text="Toggle each mode for Duel specials and/or Game of the Day. Content panels publish daily puzzles; placement is stored in GameConfig.liveModes."
            />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Flip where each engine appears · content panels for daily puzzles ·{" "}
            <Link
              href="/admin/config"
              className="font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              Game Config
            </Link>
          </p>
        </div>
      </div>

      <LiveModesPanel initialConfig={config} />
    </div>
  );
}
