import { listAdminPlayers } from "@/actions/admin/players";
import { PlayersPanel } from "@/components/admin/PlayersPanel";
import {
  AdminHelpTip,
  AdminHowItWorks,
} from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminPlayersPage() {
  const players = await listAdminPlayers();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Football players
          <AdminHelpTip
            wide
            title="Player catalog"
            text="Source of truth for Mysterious Player guesses and daily puzzle targets. Inactive players are hidden from pickers and auto-publish."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {players.length} players · used by Game of the Day / بازیکن مرموز
        </p>
      </div>

      <AdminHowItWorks
        title="Routine"
        steps={[
          "Add or edit a player (slug is permanent).",
          "Keep nationality / position / club / age / shirt accurate — they drive guess feedback.",
          "Disable instead of deleting if a player should leave the pool.",
        ]}
      />

      <PlayersPanel initialPlayers={players} />
    </div>
  );
}
