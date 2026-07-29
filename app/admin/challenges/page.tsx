import {
  listAdminCategories,
  listAdminRecordChallenges,
} from "@/actions/admin/challenges";
import { getGameConfig } from "@/lib/game/gameConfig";
import { ChallengesPanel } from "@/components/admin/ChallengesPanel";
import { LiveOpsThemesPanel } from "@/components/admin/LiveOpsThemesPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminChallengesPage() {
  const [challenges, categories, config] = await Promise.all([
    listAdminRecordChallenges(),
    listAdminCategories(),
    getGameConfig(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Premium Challenges
          <AdminHelpTip text="Timed Survival campaigns sold with coins. Players unlock once, then spend stamina per run and earn a showcase badge on conquer. Theme weeks bias visual formats without a new MatchMode." />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live-Ops crowns, campaigns & theme weeks — unlock → survive → badge.
        </p>
      </div>

      <LiveOpsThemesPanel initialConfig={config} />

      <ChallengesPanel
        initialChallenges={challenges}
        categories={categories}
      />
    </div>
  );
}
