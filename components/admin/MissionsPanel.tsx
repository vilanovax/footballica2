"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Plus,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminHelpTip, FieldLabel } from "@/components/admin/AdminHelpTip";

const OBJECTIVES = [
  {
    value: "SCORE_GOALS",
    label: "Score goals",
    tip: "Player must answer this many questions correctly (goals) across matches.",
  },
  {
    value: "PLAY_MATCHES",
    label: "Play matches",
    tip: "Complete this many matches (any result). Duels may also count when configured.",
  },
  {
    value: "WIN_MATCHES",
    label: "Win matches",
    tip: "Win this many matches (goal majority).",
  },
  {
    value: "PERFECT_COMBO",
    label: "Perfect combo",
    tip: "Reach a best combo of at least this length in a single match.",
  },
  {
    value: "PLAY_DUEL",
    label: "Play a duel",
    tip: "Finish this many Draft Duels (win or lose).",
  },
  {
    value: "WIN_DUEL",
    label: "Win a duel",
    tip: "Win this many Draft Duels.",
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

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

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
  const [showAnalytics, setShowAnalytics] = useState(false);
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
      toast.success(batch.isActive ? "Batch disabled" : "Batch enabled");
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
      toast.success(`Batch ${nextIndex} created`);
      refresh();
    });
  }

  function handleSaveBatch(batch: AdminMissionBatch, form: FormData) {
    startTransition(async () => {
      const res = await upsertMissionBatch({
        id: batch.id,
        batchIndex: Number(form.get("batchIndex")),
        chestCoins: Number(form.get("chestCoins")),
        chestXp: Number(form.get("chestXp")),
        isActive: form.get("isActive") === "on",
        startsAt: fromDatetimeLocal(String(form.get("startsAt") ?? "")),
        endsAt: fromDatetimeLocal(String(form.get("endsAt") ?? "")),
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
      toast.success(mission ? "Mission updated" : "Mission added");
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
    <div className="space-y-5">
      {/* Live status — plain language */}
      <Card className="border-emerald-200 bg-emerald-50/70">
        <CardContent className="flex flex-wrap items-center gap-3 py-4 text-sm">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-semibold text-emerald-900">
              What players see now
              <AdminHelpTip text="The campaign batch players unlock next (if Active and inside the start/end window). Daily batches reset on the Tehran calendar and are listed separately below." />
            </p>
            <p className="mt-0.5 text-emerald-800/80">
              {livePreview.activeBatchIndex != null
                ? `Campaign batch #${livePreview.activeBatchIndex} is live.`
                : "No campaign batch is live — check Active + schedule."}
            </p>
          </div>
          {livePreview.activeBatchIndex != null ? (
            <Badge className="bg-emerald-600">Live #{livePreview.activeBatchIndex}</Badge>
          ) : (
            <Badge variant="secondary">None live</Badge>
          )}
        </CardContent>
      </Card>

      {/* Collapsible analytics */}
      <Card>
        <button
          type="button"
          onClick={() => setShowAnalytics((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-6 py-4 text-start"
        >
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              Performance
              <AdminHelpTip text="Completion = missions finished / slots for clubs that started. Chests = how many of those clubs claimed the batch chest." />
            </p>
            <p className="text-xs text-slate-500">
              {analytics.length} batches · click to{" "}
              {showAnalytics ? "hide" : "show"} stats
            </p>
          </div>
          {showAnalytics ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {showAnalytics && (
          <CardContent className="border-t pt-4">
            {analytics.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Batch</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">
                      <span className="inline-flex items-center gap-1">
                        Clubs
                        <AdminHelpTip text="Clubs that started this batch." />
                      </span>
                    </th>
                    <th className="py-2 pr-3 font-medium">Done</th>
                    <th className="py-2 pr-3 font-medium">Chests</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((row) => (
                    <tr key={row.batchId} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium">
                        #{row.batchIndex}
                        {row.dayKey ? (
                          <span className="ml-2 font-mono text-xs text-slate-400">
                            {row.dayKey}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-[10px]">
                          {row.kind === "DAILY" ? "Daily" : "Campaign"}
                        </Badge>
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
          </CardContent>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Campaign batches
          </h2>
          <p className="text-xs text-slate-500">
            Each batch has up to 3 missions + one chest when all are done.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleCreateBatch}
          className="shrink-0 gap-1"
        >
          <Plus className="h-4 w-4" />
          New campaign batch
        </Button>
      </div>

      {campaignBatches.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No campaign batches. Create one to start LiveOps.
          </CardContent>
        </Card>
      )}

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
            onSaveBatch={(form) => handleSaveBatch(batch, form)}
            onSaveMission={handleSaveMission}
            onDeleteMission={handleDeleteMission}
          />
        ))}
      </div>

      {dailyBatches.length > 0 && (
        <div className="space-y-2 pt-2">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              Daily batches
              <AdminHelpTip text="Auto-generated for each Tehran calendar day. Prefer editing the daily template in code/seed; you can still tweak chest rewards and missions here." />
            </h2>
            <p className="text-xs text-slate-500">
              Reset every day · usually leave Active.
            </p>
          </div>
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
              onSaveBatch={(form) => handleSaveBatch(batch, form)}
              onSaveMission={handleSaveMission}
              onDeleteMission={handleDeleteMission}
            />
          ))}
        </div>
      )}
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
  onSaveBatch: (form: FormData) => void;
  onSaveMission: (
    batchId: string,
    mission: AdminMission | null,
    form: FormData,
  ) => void;
  onDeleteMission: (id: string) => void;
}) {
  return (
    <Card className={isLive ? "border-emerald-300 ring-1 ring-emerald-200" : ""}>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-start"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-900">
                #{batch.batchIndex}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {batch.kind === "DAILY" ? "Daily" : "Campaign"}
              </Badge>
              <Badge variant={batch.isActive ? "default" : "secondary"}>
                {batch.isActive ? "On" : "Off"}
              </Badge>
              {isLive && (
                <Badge className="bg-emerald-600 text-[10px]">Live</Badge>
              )}
              <span className="text-xs text-slate-500">
                {batch.missions.length}/3 missions
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              Chest {batch.chestCoins}🪙 · {batch.chestXp} XP
              {stats
                ? ` · ${stats.completionRate}% done · ${stats.clubsStarted} clubs`
                : ""}
              {batch.dayKey ? ` · ${batch.dayKey}` : ""}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1 pe-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={onToggleActive}
          >
            {batch.isActive ? "Turn off" : "Turn on"}
          </Button>
        </div>
      </div>

      {open && (
        <CardContent className="space-y-5 border-t pt-4">
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveBatch(new FormData(e.currentTarget));
            }}
          >
            <div>
              <FieldLabel
                tip="Order in the campaign ladder. Lower numbers unlock first."
                htmlFor={`idx-${batch.id}`}
              >
                Ladder order
              </FieldLabel>
              <Input
                id={`idx-${batch.id}`}
                name="batchIndex"
                type="number"
                defaultValue={batch.batchIndex}
              />
            </div>
            <div>
              <FieldLabel
                tip="Bonus coins when the player finishes all 3 missions and opens the chest."
                htmlFor={`cc-${batch.id}`}
              >
                Chest coins
              </FieldLabel>
              <Input
                id={`cc-${batch.id}`}
                name="chestCoins"
                type="number"
                defaultValue={batch.chestCoins}
              />
            </div>
            <div>
              <FieldLabel
                tip="Bonus XP when the batch chest is claimed."
                htmlFor={`cx-${batch.id}`}
              >
                Chest XP
              </FieldLabel>
              <Input
                id={`cx-${batch.id}`}
                name="chestXp"
                type="number"
                defaultValue={batch.chestXp}
              />
            </div>
            <div>
              <FieldLabel
                tip="Optional. Before this time the batch stays hidden even if Active."
                htmlFor={`sa-${batch.id}`}
              >
                Starts
              </FieldLabel>
              <Input
                id={`sa-${batch.id}`}
                name="startsAt"
                type="datetime-local"
                defaultValue={toDatetimeLocal(batch.startsAt)}
              />
            </div>
            <div>
              <FieldLabel
                tip="Optional. After this time the batch stops being offered."
                htmlFor={`ea-${batch.id}`}
              >
                Ends
              </FieldLabel>
              <Input
                id={`ea-${batch.id}`}
                name="endsAt"
                type="datetime-local"
                defaultValue={toDatetimeLocal(batch.endsAt)}
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={batch.isActive}
                />
                Active
                <AdminHelpTip text="Must be Active (and inside Starts/Ends) for players to receive this batch." />
              </label>
              <Button type="submit" size="sm" disabled={pending}>
                Save
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                Missions
                <AdminHelpTip text="Exactly 3 per batch. Each has its own drip reward; finishing all unlocks the chest above." />
              </h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={onDelete}
              >
                <Trash2 className="me-1 h-3.5 w-3.5" />
                Delete batch
              </Button>
            </div>

            {/* Compact read-only summary when missions exist */}
            {batch.missions.length > 0 && (
              <ul className="mb-2 space-y-1 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                {batch.missions
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((m, i) => (
                    <li key={m.id} className="flex flex-wrap gap-x-2">
                      <span className="font-semibold text-slate-800">
                        {i + 1}.
                      </span>
                      <span>{m.titleEn}</span>
                      <span className="text-slate-400">·</span>
                      <span>
                        {objectiveLabel(m.objectiveType)} ×{m.targetValue}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span>
                        +{m.rewardCoins}🪙 +{m.rewardXp}XP
                      </span>
                    </li>
                  ))}
              </ul>
            )}

            {batch.missions.map((m) => (
              <MissionForm
                key={m.id}
                batchId={batch.id}
                mission={m}
                pending={pending}
                onSave={onSaveMission}
                onDelete={onDeleteMission}
              />
            ))}
            {batch.missions.length < 3 && (
              <MissionForm
                batchId={batch.id}
                mission={null}
                pending={pending}
                onSave={onSaveMission}
                onDelete={onDeleteMission}
                defaultSort={batch.missions.length}
              />
            )}
          </div>
        </CardContent>
      )}
    </Card>
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
      className="rounded-lg border border-slate-200 bg-white"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(batchId, mission, new FormData(e.currentTarget));
      }}
    >
      {mission && !expanded ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="min-w-0 flex-1 text-start text-sm"
          >
            <span className="font-medium text-slate-900">{mission.titleEn}</span>
            <span className="ms-2 text-xs text-slate-500">
              {objectiveLabel(mission.objectiveType)} ×{mission.targetValue}
            </span>
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
          {!mission && (
            <p className="text-xs font-semibold text-slate-500">
              + Add mission ({defaultSort + 1}/3)
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <FieldLabel tip="English label shown in the app (EN locale).">
                Title EN
              </FieldLabel>
              <Input
                name="titleEn"
                defaultValue={mission?.titleEn ?? ""}
                required
                placeholder="Score 3 goals"
              />
            </div>
            <div>
              <FieldLabel tip="Persian label shown when the app language is FA.">
                Title FA
              </FieldLabel>
              <Input
                name="titleFa"
                defaultValue={mission?.titleFa ?? ""}
                required
                dir="rtl"
                placeholder="۳ گل بزن"
              />
            </div>
            <div>
              <FieldLabel tip={objMeta?.tip ?? "What the player must do."}>
                Goal type
              </FieldLabel>
              <Select
                value={objective}
                onValueChange={(v) =>
                  setObjective(v as AdminMission["objectiveType"])
                }
              >
                <SelectTrigger>
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
              {objMeta && (
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  {objMeta.tip}
                </p>
              )}
            </div>
            <div>
              <FieldLabel tip="How many times / how high the goal type must reach.">
                Target
              </FieldLabel>
              <Input
                name="targetValue"
                type="number"
                min={1}
                defaultValue={mission?.targetValue ?? 1}
                required
              />
            </div>
            <div>
              <FieldLabel tip="Coins paid when the player claims this mission (drip reward).">
                Coins
              </FieldLabel>
              <Input
                name="rewardCoins"
                type="number"
                min={0}
                defaultValue={mission?.rewardCoins ?? 0}
              />
            </div>
            <div>
              <FieldLabel tip="XP paid when the player claims this mission.">
                XP
              </FieldLabel>
              <Input
                name="rewardXp"
                type="number"
                min={0}
                defaultValue={mission?.rewardXp ?? 0}
              />
            </div>
          </div>
          {/* Keep sort in DOM but auto-fill — hidden from busy admins */}
          <input
            type="hidden"
            name="sortOrder"
            value={mission?.sortOrder ?? defaultSort}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {mission ? "Save mission" : "Add mission"}
            </Button>
            {mission && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(false)}
                >
                  Collapse
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
            )}
          </div>
        </div>
      )}
    </form>
  );
}
