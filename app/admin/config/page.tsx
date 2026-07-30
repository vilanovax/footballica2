import { getGameConfig } from "@/lib/game/gameConfig";
import { EconomyConfigPanel } from "@/components/admin/EconomyConfigPanel";

export const dynamic = "force-dynamic";

export default async function AdminGameConfigPage() {
  const config = await getGameConfig();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Game Config & Economy
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
          Command center for global game parameters — theme weeks, duel timeout
          behavior, Survival rates, and soft currency. Start on{" "}
          <strong className="font-semibold text-slate-700">Live Ops</strong> for
          events; open Match / Survival / Duel for deeper balance. One Save
          writes the full GameConfig JSON (no redeploy).
        </p>
        <p className="mt-1 text-sm text-slate-500" dir="rtl">
          تنظیمات بازی و اقتصاد — تم هفته، دوئل، بقا و سکه‌ها در یک داشبورد.
        </p>
      </div>

      <EconomyConfigPanel initialConfig={config} />
    </div>
  );
}
