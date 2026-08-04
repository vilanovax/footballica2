import { getGameConfig } from "@/lib/game/gameConfig";
import { EconomyConfigPanel } from "@/components/admin/EconomyConfigPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminGameConfigPage() {
  const config = await getGameConfig();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Game Config
          <AdminHelpTip
            wide
            title="Live rates"
            text="One Save updates theme week and economy rates for everyone — no redeploy. Open the indigo Club Biz tab for Managers, Safe, Bank, and facilities."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Match rates · Live Ops ·{" "}
          <span className="font-semibold text-indigo-700">
            Club Biz (Managers)
          </span>{" "}
          · یک Save برای همه
        </p>
      </div>

      <EconomyConfigPanel initialConfig={config} />
    </div>
  );
}
