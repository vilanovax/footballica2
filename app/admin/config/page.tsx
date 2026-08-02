import { getGameConfig } from "@/lib/game/gameConfig";
import { EconomyConfigPanel } from "@/components/admin/EconomyConfigPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminGameConfigPage() {
  const config = await getGameConfig();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Game Config
          <AdminHelpTip
            wide
            title="Live rates"
            text="One Save updates theme week and economy rates for everyone — no redeploy. Use tabs for Match / Survival / Duel / GotD details."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          نرخ‌ها و تم هفته · یک Save
        </p>
      </div>

      <EconomyConfigPanel initialConfig={config} />
    </div>
  );
}
