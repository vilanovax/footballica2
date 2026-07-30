import { getGameConfig } from "@/lib/game/gameConfig";
import { EconomyConfigPanel } from "@/components/admin/EconomyConfigPanel";

export const dynamic = "force-dynamic";

export default async function AdminGameConfigPage() {
  const config = await getGameConfig();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Game Config
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live rates & theme week · one Save, no redeploy
          </p>
        </div>
      </div>

      <EconomyConfigPanel initialConfig={config} />
    </div>
  );
}
