import {
  getLiveOpsPreview,
  getMissionAnalytics,
  listAdminMissionBatches,
} from "@/actions/admin/missions";
import { MissionsPanel } from "@/components/admin/MissionsPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminMissionsPage() {
  const [batches, livePreview, analytics] = await Promise.all([
    listAdminMissionBatches(),
    getLiveOpsPreview(),
    getMissionAnalytics(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Missions
          <AdminHelpTip
            wide
            title="LiveOps quests"
            text="Players chase a ladder of batches in the app. Each batch has up to 3 missions and a chest reward when all three are claimed. Use the ? next to any field for details."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          One live campaign at a time · edit rewards & goals · hover ? for help.
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
