import { listAdminMysteryPuzzles } from "@/actions/admin/mystery";
import { MysteryPuzzlesPanel } from "@/components/admin/MysteryPuzzlesPanel";
import {
  AdminHelpTip,
  AdminHowItWorks,
} from "@/components/admin/AdminHelpTip";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminMysteryPage() {
  const { todayKey, puzzles, players } = await listAdminMysteryPuzzles();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Mysterious Player
          <AdminHelpTip
            wide
            title="Game of the Day"
            text="One puzzle per Tehran calendar day. If you don’t publish, the app auto-picks an active player. Publishing overrides the live day immediately."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live-Ops schedule for بازیکن مرموز · manage catalog in{" "}
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
          "Confirm the player exists & is Active under Players.",
          "Set today’s (or tomorrow’s) date + target + max guesses.",
          "Save — players see the update on /play and /play/mystery.",
        ]}
      />

      <MysteryPuzzlesPanel
        todayKey={todayKey}
        initialPuzzles={puzzles}
        players={players}
      />
    </div>
  );
}
