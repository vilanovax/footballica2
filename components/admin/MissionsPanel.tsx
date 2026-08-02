"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  deleteMission,
  deleteMissionBatch,
  toggleMissionBatchActive,
  upsertMission,
  upsertMissionBatch,
  type AdminMission,
  type AdminMissionBatch,
  type MissionBatchAnalytics,
} from "@/actions/admin/missions";
import {
  datetimeLocalToIso,
  formatJalaliDateTimeLabel,
  isoToDatetimeLocal,
} from "@/lib/admin/jalali";
import { AdminHelpTip, FieldLabel } from "@/components/admin/AdminHelpTip";
import { AdminJalaliDateTimeField } from "@/components/admin/AdminJalaliDateTimeField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OBJECTIVES = [
  {
    value: "SCORE_GOALS",
    label: "Score goals",
    tip: "Correct answers (goals) across matches.",
  },
  {
    value: "PLAY_MATCHES",
    label: "Play matches",
    tip: "Any finished match counts.",
  },
  {
    value: "WIN_MATCHES",
    label: "Win matches",
    tip: "Wins only (goal majority).",
  },
  {
    value: "PERFECT_COMBO",
    label: "Perfect combo",
    tip: "Best consecutive-correct streak in one match.",
  },
  {
    value: "PLAY_DUEL",
    label: "Play a duel",
    tip: "Finish Draft Duels (any outcome).",
  },
  {
    value: "WIN_DUEL",
    label: "Win a duel",
    tip: "Win Draft Duels.",
  },
] as const;

type LivePreview = {
  nowIso: string;
  activeBatchIndex: number | null;
  activeBatchId: string | null;
  reason: string;
};

type MissionsPanelProps = {
  initialBatches: AdminMissionBatch[];
  livePreview: LivePreview;
  analytics: MissionBatchAnalytics[];
};

function objectiveLabel(value: string): string {
  return OBJECTIVES.find((o) => o.value === value)?.label ?? value;
}

export function MissionsPanel({
  initialBatches,
  livePreview,
  analytics,
}: MissionsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [batches, setBatches] = useState(initialBatches);
  const [openId, setOpenId] = useState<string | null>(
    () =>
      initialBatches.find((b) => b.id === livePreview.activeBatchId)?.id ??
      initialBatches[0]?.id ??
      null,
  );
  const [showStats, setShowStats] = useState(false);
  const analyticsById = useMemo(
    () => new Map(analytics.map((a) => [a.batchId, a])),
    [analytics],
  );

  const campaignBatches = batches.filter((b) => b.kind === "CAMPAIGN");
  const dailyBatches = batches.filter((b) => b.kind === "DAILY");

  useEffect(() => {
    setBatches(initialBatches);
  }, [initialBatches]);

  function refresh() {
    router.refresh();
  }

  function handleToggle(batch: AdminMissionBatch) {
    startTransition(async () => {
      const res = await toggleMissionBatchActive(batch.id, !batch.isActive);
      if (!res.ok) {
        toast.error("Could not toggle batch");
        return;
      }
      setBatches((prev) =>
        prev.map((b) =>
          b.id === batch.id ? { ...b, isActive: !b.isActive } : b,
        ),
      );
      toast.success(batch.isActive ? "Batch off" : "Batch on");
      refresh();
    });
  }

  function handleCreateBatch() {
    const nextIndex =
      campaignBatches.reduce((m, b) => Math.max(m, b.batchIndex), 0) + 1;
    startTransition(async () => {
      const res = await upsertMissionBatch({
        batchIndex: nextIndex,
        chestCoins: 100,
        chestXp: 25,
        isActive: true,
      });
      if (!res.ok) {
        toast.error("Could not create batch");
        return;
      }
      toast.success(`Batch #${nextIndex} created`);
      refresh();
    });
  }

  function handleSaveBatch(
    batch: AdminMissionBatch,
    data: {
      batchIndex: number;
      chestCoins: number;
      chestXp: number;
      isActive: boolean;
      startsAt: string;
      endsAt: string;
    },
  ) {
    startTransition(async () => {
      const res = await upsertMissionBatch({
        id: batch.id,
        batchIndex: data.batchIndex,
        chestCoins: data.chestCoins,
        chestXp: data.chestXp,
        isActive: data.isActive,
        startsAt: datetimeLocalToIso(data.startsAt),
        endsAt: datetimeLocalToIso(data.endsAt),
      });
      if (!res.ok) {
        toast.error("Save failed");
        return;
      }
      toast.success("Batch saved");
      refresh();
    });
  }

  function handleDeleteBatch(id: string) {
    if (!confirm("Delete this batch and all its missions?")) return;
    startTransition(async () => {
      const res = await deleteMissionBatch(id);
      if (!res.ok) {
        toast.error("Delete failed");
        return;
      }
      setBatches((prev) => prev.filter((b) => b.id !== id));
      if (openId === id) setOpenId(null);
      toast.success("Batch deleted");
      refresh();
    });
  }

  function handleSaveMission(
    batchId: string,
    mission: AdminMission | null,
    form: FormData,
  ) {
    startTransition(async () => {
      const res = await upsertMission({
        id: mission?.id,
        batchId,
        titleEn: String(form.get("titleEn") ?? ""),
        titleFa: String(form.get("titleFa") ?? ""),
        objectiveType: String(
          form.get("objectiveType") ?? "SCORE_GOALS",
        ) as AdminMission["objectiveType"],
        targetValue: Number(form.get("targetValue")),
        rewardCoins: Number(form.get("rewardCoins")),
        rewardXp: Number(form.get("rewardXp")),
        sortOrder: Number(form.get("sortOrder")),
      });
      if (!res.ok) {
        toast.error(
          res.error === "batch_full"
            ? "Batch already has 3 missions"
            : "Save failed",
        );
        return;
      }
      toast.success(mission ? "Mission saved" : "Mission added");
      refresh();
    });
  }

  function handleDeleteMission(id: string) {
    if (!confirm("Delete this mission?")) return;
    startTransition(async () => {
      const res = await deleteMission(id);
      if (!res.ok) {
        toast.error("Delete failed");
        return;
      }
      toast.success("Mission deleted");
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Live status */}
      <div
        className={[
          "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3.5",
          livePreview.activeBatchIndex != null
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50",
        ].join(" ")}
      >
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Players see now
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {livePreview.activeBatchIndex != null
              ? `Campaign #${livePreview.activeBatchIndex} is live`
              : "Nothing live — turn a batch On or fix schedule"}
          </p>
        </div>
        {livePreview.activeBatchIndex != null ? (
          <Badge className="bg-emerald-600">#{livePreview.activeBatchIndex}</Badge>
        ) : (
          <Badge variant="secondary">Offline</Badge>
        )}
      </div>

      {/* Stats */}
      <button
        type="button"
        onClick={() => setShowStats((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-start shadow-sm"
      >
        <span className="text-sm font-medium text-slate-800">
          Stats · {analytics.length} batches
        </span>
        {showStats ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {showStats ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {analytics.length === 0 ? (
            <p className="text-sm text-slate-500">No player data yet.</p>
          ) : (
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Clubs</th>
                  <th className="py-2 pr-3 font-medium">Done</th>
                  <th className="py-2 pr-3 font-medium">Chests</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((row) => (
                  <tr key={row.batchId} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium">#{row.batchIndex}</td>
                    <td className="py-2 pr-3 text-slate-600">
                      {row.kind === "DAILY" ? "Daily" : "Campaign"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.clubsStarted}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.completionRate}%
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.chestClaimRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {/* Campaign list */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          Campaign batches
          <AdminHelpTip text="Ladder order · only one Active + in schedule window is offered." />
        </h2>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleCreateBatch}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          New batch
        </Button>
      </div>

      {campaignBatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No batches yet — create one, add 3 missions, turn On.
        </div>
      ) : (
        <div className="space-y-2">
          {campaignBatches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              stats={analyticsById.get(batch.id)}
              open={openId === batch.id}
              pending={pending}
              isLive={livePreview.activeBatchId === batch.id}
              onToggleOpen={() =>
                setOpenId((id) => (id === batch.id ? null : batch.id))
              }
              onToggleActive={() => handleToggle(batch)}
              onDelete={() => handleDeleteBatch(batch.id)}
              onSaveBatch={(data) => handleSaveBatch(batch, data)}
              onSaveMission={handleSaveMission}
              onDeleteMission={handleDeleteMission}
            />
          ))}
        </div>
      )}

      {dailyBatches.length > 0 ? (
        <div className="space-y-2 pt-1">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            Daily batches
            <AdminHelpTip text="Auto Tehran-day track — usually leave Active." />
          </h2>
          {dailyBatches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              stats={analyticsById.get(batch.id)}
              open={openId === batch.id}
              pending={pending}
              isLive={false}
              onToggleOpen={() =>
                setOpenId((id) => (id === batch.id ? null : batch.id))
              }
              onToggleActive={() => handleToggle(batch)}
              onDelete={() => handleDeleteBatch(batch.id)}
              onSaveBatch={(data) => handleSaveBatch(batch, data)}
              onSaveMission={handleSaveMission}
              onDeleteMission={handleDeleteMission}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BatchCard({
  batch,
  stats,
  open,
  pending,
  isLive,
  onToggleOpen,
  onToggleActive,
  onDelete,
  onSaveBatch,
  onSaveMission,
  onDeleteMission,
}: {
  batch: AdminMissionBatch;
  stats?: MissionBatchAnalytics;
  open: boolean;
  pending: boolean;
  isLive: boolean;
  onToggleOpen: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onSaveBatch: (data: {
    batchIndex: number;
    chestCoins: number;
    chestXp: number;
    isActive: boolean;
    startsAt: string;
    endsAt: string;
  }) => void;
  onSaveMission: (
    batchId: string,
    mission: AdminMission | null,
    form: FormData,
  ) => void;
  onDeleteMission: (id: string) => void;
}) {
  const missionCount = batch.missions.length;
  const [batchIndex, setBatchIndex] = useState(batch.batchIndex);
  const [chestCoins, setChestCoins] = useState(batch.chestCoins);
  const [chestXp, setChestXp] = useState(batch.chestXp);
  const [isActive, setIsActive] = useState(batch.isActive);
  const [startsAt, setStartsAt] = useState(isoToDatetimeLocal(batch.startsAt));
  const [endsAt, setEndsAt] = useState(isoToDatetimeLocal(batch.endsAt));

  useEffect(() => {
    setBatchIndex(batch.batchIndex);
    setChestCoins(batch.chestCoins);
    setChestXp(batch.chestXp);
    setIsActive(batch.isActive);
    setStartsAt(isoToDatetimeLocal(batch.startsAt));
    setEndsAt(isoToDatetimeLocal(batch.endsAt));
  }, [batch]);

  const scheduleHint = useMemo(() => {
    if (!startsAt && !endsAt) return "No schedule window";
    const a = startsAt ? formatJalaliDateTimeLabel(startsAt) : "…";
    const b = endsAt ? formatJalaliDateTimeLabel(endsAt) : "…";
    return `${a} → ${b}`;
  }, [startsAt, endsAt]);

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border bg-white shadow-sm",
        isLive
          ? "border-emerald-300 ring-1 ring-emerald-100"
          : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-start"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">
                Batch #{batch.batchIndex}
              </span>
              {isLive ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  LIVE
                </span>
              ) : null}
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  batch.isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {batch.isActive ? "On" : "Off"}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {missionCount}/3 · chest {batch.chestCoins}🪙 / {batch.chestXp} XP
              {stats ? ` · ${stats.completionRate}% done` : ""}
            </p>
          </div>
        </button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={onToggleActive}
        >
          {batch.isActive ? "Off" : "On"}
        </Button>
      </div>

      {open ? (
        <div className="space-y-5 border-t border-slate-100 px-3 py-4">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <FieldLabel>Order</FieldLabel>
                <Input
                  type="number"
                  value={batchIndex}
                  onChange={(e) => setBatchIndex(Number(e.target.value))}
                  className="h-10"
                />
              </div>
              <div>
                <FieldLabel>Chest coins</FieldLabel>
                <Input
                  type="number"
                  value={chestCoins}
                  onChange={(e) => setChestCoins(Number(e.target.value))}
                  className="h-10"
                />
              </div>
              <div>
                <FieldLabel>Chest XP</FieldLabel>
                <Input
                  type="number"
                  value={chestXp}
                  onChange={(e) => setChestXp(Number(e.target.value))}
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>شروع (شمسی)</FieldLabel>
                <AdminJalaliDateTimeField
                  value={startsAt}
                  onChange={setStartsAt}
                  disabled={pending}
                  clearable
                />
              </div>
              <div>
                <FieldLabel>پایان (شمسی)</FieldLabel>
                <AdminJalaliDateTimeField
                  value={endsAt}
                  onChange={setEndsAt}
                  disabled={pending}
                  clearable
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500" dir="rtl">
              {scheduleHint}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  className="gap-1.5"
                  onClick={() =>
                    onSaveBatch({
                      batchIndex,
                      chestCoins,
                      chestXp,
                      isActive,
                      startsAt,
                      endsAt,
                    })
                  }
                >
                  <Save className="h-3.5 w-3.5" />
                  Save batch
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={pending}
                  onClick={onDelete}
                >
                  <Trash2 className="me-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Missions ({missionCount}/3)
            </p>
            {batch.missions
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((m) => (
                <MissionForm
                  key={m.id}
                  batchId={batch.id}
                  mission={m}
                  pending={pending}
                  onSave={onSaveMission}
                  onDelete={onDeleteMission}
                />
              ))}
            {missionCount < 3 ? (
              <MissionForm
                batchId={batch.id}
                mission={null}
                pending={pending}
                onSave={onSaveMission}
                onDelete={onDeleteMission}
                defaultSort={missionCount}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MissionForm({
  batchId,
  mission,
  pending,
  onSave,
  onDelete,
  defaultSort = 0,
}: {
  batchId: string;
  mission: AdminMission | null;
  pending: boolean;
  onSave: (
    batchId: string,
    mission: AdminMission | null,
    form: FormData,
  ) => void;
  onDelete: (id: string) => void;
  defaultSort?: number;
}) {
  const [objective, setObjective] = useState<AdminMission["objectiveType"]>(
    mission?.objectiveType ?? "SCORE_GOALS",
  );
  const [expanded, setExpanded] = useState(!mission);
  const objMeta = OBJECTIVES.find((o) => o.value === objective);

  return (
    <form
      className="rounded-xl border border-slate-200 bg-slate-50/50"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(batchId, mission, new FormData(e.currentTarget));
      }}
    >
      {mission && !expanded ? (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="min-w-0 flex-1 text-start"
          >
            <p className="truncate text-sm font-medium text-slate-900">
              {mission.titleEn}
            </p>
            <p className="truncate text-xs text-slate-500">
              {objectiveLabel(mission.objectiveType)} ×{mission.targetValue}
              {" · "}+{mission.rewardCoins}🪙 +{mission.rewardXp}XP
            </p>
          </button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(true)}
          >
            Edit
          </Button>
        </div>
      ) : (
        <div className="space-y-3 p-3">
          {!mission ? (
            <p className="text-xs font-semibold text-slate-500">
              Add mission {defaultSort + 1} of 3
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <FieldLabel>Title EN</FieldLabel>
              <Input
                name="titleEn"
                defaultValue={mission?.titleEn ?? ""}
                required
                placeholder="Score 5 goals"
                className="h-10"
              />
            </div>
            <div>
              <FieldLabel>Title FA</FieldLabel>
              <Input
                name="titleFa"
                defaultValue={mission?.titleFa ?? ""}
                required
                dir="rtl"
                placeholder="۵ گل بزن"
                className="h-10"
              />
            </div>
            <div>
              <FieldLabel>Goal</FieldLabel>
              <Select
                value={objective}
                onValueChange={(v) =>
                  setObjective(v as AdminMission["objectiveType"])
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="objectiveType" value={objective} />
              {objMeta ? (
                <p className="mt-1 text-[11px] text-slate-500">{objMeta.tip}</p>
              ) : null}
            </div>
            <div>
              <FieldLabel>Target</FieldLabel>
              <Input
                name="targetValue"
                type="number"
                min={1}
                defaultValue={mission?.targetValue ?? 1}
                required
                className="h-10"
              />
            </div>
            <div>
              <FieldLabel>Coins</FieldLabel>
              <Input
                name="rewardCoins"
                type="number"
                min={0}
                defaultValue={mission?.rewardCoins ?? 0}
                className="h-10"
              />
            </div>
            <div>
              <FieldLabel>XP</FieldLabel>
              <Input
                name="rewardXp"
                type="number"
                min={0}
                defaultValue={mission?.rewardXp ?? 0}
                className="h-10"
              />
            </div>
          </div>
          <input
            type="hidden"
            name="sortOrder"
            value={mission?.sortOrder ?? defaultSort}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {mission ? "Save" : "Add"}
            </Button>
            {mission ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(false)}
                >
                  Done
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => onDelete(mission.id)}
                >
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </form>
  );
}
