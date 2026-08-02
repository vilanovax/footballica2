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
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Missions
          <AdminHelpTip
            wide
            title="Campaign ladder"
            text="One live campaign at a time. Each batch: up to 3 missions + chest. Turn On and set Shamsi start/end if you want a schedule window."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          کمپین · rewards & goals · schedule with تاریخ شمسی
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
