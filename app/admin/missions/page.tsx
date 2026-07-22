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
        <p className="mt-1 text-sm text-slate-500">
          LiveOps mission batches — 3 active objectives, then a chest reward.
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
