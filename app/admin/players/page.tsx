import { listAdminPlayers } from "@/actions/admin/players";
import { PlayersPanel } from "@/components/admin/PlayersPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminPlayersPage() {
  const players = await listAdminPlayers();
  const active = players.filter((p) => p.isActive).length;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
            Players
            <AdminHelpTip
              wide
              title="Mystery catalog"
              text="Guess targets for Game of the Day. Slug is permanent. Keep nation / pos / club / age / # accurate — they drive feedback. Prefer Disable over delete."
            />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{active}</span> active
            <span className="mx-1.5 text-slate-300">·</span>
            {players.length} total
            <span className="mx-1.5 text-slate-300">·</span>
            Mystery / بازیکن مرموز
          </p>
        </div>
      </div>

      <PlayersPanel initialPlayers={players} />
    </div>
  );
}
