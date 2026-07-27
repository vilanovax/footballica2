import { getGameConfig } from "@/lib/game/gameConfig";
import { EconomyConfigPanel } from "@/components/admin/EconomyConfigPanel";

export const dynamic = "force-dynamic";

export default async function AdminEconomyConfigPage() {
  const config = await getGameConfig();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Economy</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
          Control soft currency, XP, and stamina without a redeploy. Start on{" "}
          <strong className="font-semibold text-slate-700">Live Ops</strong> for
          events and inflation; open Match / Survival / Duel only when you need
          deeper balance. Each field explains what it changes in the player
          economy.
        </p>
      </div>

      <EconomyConfigPanel initialConfig={config} />
    </div>
  );
}
