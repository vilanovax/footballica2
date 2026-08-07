import { Target } from "lucide-react";
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

  const campaignBatches = batches.filter((b) => b.kind === "CAMPAIGN");
  const activeCampaigns = campaignBatches.filter((b) => b.isActive).length;
  const missionSlots = campaignBatches.reduce(
    (n, b) => n + b.missions.length,
    0,
  );
  const clubsStarted = analytics.reduce((n, a) => n + a.clubsStarted, 0);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
              <Target className="h-3 w-3" strokeWidth={2.5} />
              Campaign
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
              {livePreview.activeBatchIndex != null
                ? `Live · #${livePreview.activeBatchIndex}`
                : "Offline · nothing live"}
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Missions
            <AdminHelpTip
              wide
              title="Campaign ladder"
              text="One live campaign at a time. Each batch: up to 3 missions + chest. Turn On and set Shamsi start/end if you want a schedule window."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            کمپین · rewards & goals · schedule with تاریخ شمسی
          </p>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat label="Campaigns" value={campaignBatches.length} />
            <HeroStat label="Active" value={activeCampaigns} />
            <HeroStat label="Missions" value={missionSlots} muted />
            <HeroStat label="Clubs in" value={clubsStarted} muted />
          </div>
        </div>
      </div>

      <MissionsPanel
        initialBatches={batches}
        livePreview={livePreview}
        analytics={analytics}
      />
    </div>
  );
}

function HeroStat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10">
      <p
        className={[
          "text-sm font-bold tabular-nums",
          muted ? "text-white/85" : "text-white",
        ].join(" ")}
      >
        {value.toLocaleString("en-US")}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">
        {label}
      </p>
    </div>
  );
}
