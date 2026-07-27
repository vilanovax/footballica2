import {
  getLiveOpsPreview,
  getMissionAnalytics,
  listAdminMissionBatches,
} from "@/actions/admin/missions";
import { MissionsPanel } from "@/components/admin/MissionsPanel";

export const dynamic = "force-dynamic";

export default async function AdminMissionsPage() {
  const [batches, livePreview, analytics] = await Promise.all([
    listAdminMissionBatches(),
    getLiveOpsPreview(),
    getMissionAnalytics(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Missions</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Build LiveOps quests players chase in the app. Each batch = 3 missions
          + a chest. Hover the{" "}
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
            ?
          </span>{" "}
          icons for field help.
        </p>
      </div>

      <MissionsPanel
        initialBatches={batches}
        livePreview={livePreview}
        analytics={analytics}
      />
    </div>
  );
}
