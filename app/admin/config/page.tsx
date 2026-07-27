import { getGameConfig } from "@/lib/game/gameConfig";
import { EconomyConfigPanel } from "@/components/admin/EconomyConfigPanel";

export const dynamic = "force-dynamic";

export default async function AdminEconomyConfigPage() {
  const config = await getGameConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Game Economy & Config
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Live-Ops control panel for Match, Survival, Duel, and helper sinks.
          Tune rewards in minutes — no code deploy. Values are stored in the{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">GameConfig</code>{" "}
          singleton and merged over safe defaults.
        </p>
      </div>

      <EconomyConfigPanel initialConfig={config} />
    </div>
  );
}
