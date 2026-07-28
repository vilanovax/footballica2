"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
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
import {
  AdminHelpTip,
  AdminHowItWorks,
  FieldLabel,
} from "@/components/admin/AdminHelpTip";

const OBJECTIVES = [
  {
    value: "SCORE_GOALS",
    label: "Score goals",
    tip: "Count correct answers (goals) across matches until the target is reached.",
  },
  {
    value: "PLAY_MATCHES",
    label: "Play matches",
    tip: "Any finished match counts — win or lose. Duel turns may also count.",
  },
  {
    value: "WIN_MATCHES",
    label: "Win matches",
    tip: "Only matches the player wins (goal majority) count toward the target.",
  },
  {
    value: "PERFECT_COMBO",
    label: "Perfect combo",
    tip: "Best consecutive-correct streak in a single match must reach this length.",
  },
  {
    value: "PLAY_DUEL",
    label: "Play a duel",
    tip: "Finish this many Draft Duels (any outcome).",
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
    <div className="space-y-5">
      <AdminHowItWorks
        title="How missions work"
        steps={[
          "Create a campaign batch and add up to 3 missions (goal + drip reward).",
          "Set chest coins/XP — paid when the player finishes all 3 and opens the chest.",
          "Turn the batch On and keep it inside the start/end window so it goes live.",
        ]}
      />

      {/* Status strip */}
      <div
        className={[
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
          livePreview.activeBatchIndex != null
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50",
        ].join(" ")}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            Players see now
            <AdminHelpTip
              wide
              title="Live campaign"
              text="Only one campaign batch is offered at a time: the lowest ladder order that is Active and inside its schedule. Daily missions reset on the Tehran calendar and appear separately in the app."
            />
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {livePreview.activeBatchIndex != null
              ? `Campaign #${livePreview.activeBatchIndex} is live.`
              : "Nothing live — turn a batch On or fix its schedule."}
          </p>
        </div>
        {livePreview.activeBatchIndex != null ? (
          <Badge className="bg-emerald-600">#{livePreview.activeBatchIndex}</Badge>
        ) : (
          <Badge variant="secondary">Offline</Badge>
        )}
      </div>

      {/* Stats (collapsed by default) */}
      <button
        type="button"
        onClick={() => setShowStats((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-start shadow-sm"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
          Stats
          <AdminHelpTip
            title="Performance"
            text="Clubs = started the batch. Done = mission slots completed. Chests = clubs that claimed the batch chest."
          />
          <span className="ms-1 text-xs font-normal text-slate-400">
            {analytics.length} batches
          </span>
        </span>
        {showStats ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {showStats && (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
            {analytics.length === 0 ? (
              <p className="text-sm text-slate-500">No player data yet.</p>
            ) : (
              <table className="w-full min-w-[480px] text-left text-sm">
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
                      <td className="py-2 pr-3 font-medium">
                        #{row.batchIndex}
                      </td>
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
          </CardContent>
        </Card>
      )}

      {/* Campaign list */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          Campaign batches
          <AdminHelpTip
            wide
            title="Campaign ladder"
            text="Batches unlock in ladder order. Keep only one Active + scheduled at a time unless you intentionally overlap."
          />
        </h2>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleCreateBatch}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          New batch
        </Button>
      </div>

      {campaignBatches.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No batches yet. Create one, add 3 missions, then turn it On.
          </CardContent>
        </Card>
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
              onSaveBatch={(form) => handleSaveBatch(batch, form)}
              onSaveMission={handleSaveMission}
              onDeleteMission={handleDeleteMission}
            />
          ))}
        </div>
      )}

      {dailyBatches.length > 0 && (
        <div className="space-y-2 pt-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            Daily batches
            <AdminHelpTip
              wide
              title="Daily track"
              text="Auto-created per Tehran day. Safe to tweak rewards; usually leave Active."
            />
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
  const missionCount = batch.missions.length;

  return (
    <Card
      className={
        isLive ? "border-emerald-300 shadow-sm ring-1 ring-emerald-100" : ""
      }
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
              {isLive && (
                <Badge className="bg-emerald-600 text-[10px]">Live</Badge>
              )}
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  batch.isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {batch.isActive ? "On" : "Off"}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {missionCount}/3 missions · chest {batch.chestCoins}🪙 /{" "}
              {batch.chestXp} XP
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

      {open && (
        <CardContent className="space-y-6 border-t pt-4">
          {/* Batch settings — one clear block */}
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              onSaveBatch(new FormData(e.currentTarget));
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Batch settings
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <FieldLabel
                  tipTitle="Ladder order"
                  tip="Lower numbers unlock first. Players move up the ladder when they finish the previous batch."
                  htmlFor={`idx-${batch.id}`}
                >
                  Order
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
                  tipTitle="Chest coins"
                  tip="Bonus coins when the player claims the chest after finishing all 3 missions."
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
                  tipTitle="Chest XP"
                  tip="Bonus XP paid with the chest claim."
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
                  tipTitle="Start time"
                  tip="Optional. Before this moment the batch stays hidden even if On."
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
                  tipTitle="End time"
                  tip="Optional. After this moment the batch stops being offered."
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
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={batch.isActive}
                  />
                  Active
                  <AdminHelpTip
                    title="Active switch"
                    text="Must be checked (and inside Starts/Ends) for this batch to go live."
                  />
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
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
          </form>

          {/* Missions — single list, no duplicate summary */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Missions ({missionCount}/3)
              <AdminHelpTip
                wide
                title="Three slots"
                text="Each mission has its own claim reward. When all three are claimed, the chest above unlocks."
              />
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
            {missionCount < 3 && (
              <MissionForm
                batchId={batch.id}
                mission={null}
                pending={pending}
                onSave={onSaveMission}
                onDelete={onDeleteMission}
                defaultSort={missionCount}
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
      className="rounded-xl border border-slate-200 bg-white"
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
          {!mission && (
            <p className="text-xs font-semibold text-slate-500">
              Add mission {defaultSort + 1} of 3
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <FieldLabel
                tipTitle="English title"
                tip="Shown in the app when language is EN."
              >
                Title EN
              </FieldLabel>
              <Input
                name="titleEn"
                defaultValue={mission?.titleEn ?? ""}
                required
                placeholder="Score 5 goals"
              />
            </div>
            <div>
              <FieldLabel
                tipTitle="Persian title"
                tip="Shown when the app language is FA."
              >
                Title FA
              </FieldLabel>
              <Input
                name="titleFa"
                defaultValue={mission?.titleFa ?? ""}
                required
                dir="rtl"
                placeholder="۵ گل بزن"
              />
            </div>
            <div>
              <FieldLabel
                tipTitle="Goal type"
                tip={objMeta?.tip ?? "What the player must do."}
              >
                Goal
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
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                  {objMeta.tip}
                </p>
              )}
            </div>
            <div>
              <FieldLabel
                tipTitle="Target"
                tip="How many / how high — e.g. 5 goals or 2 wins."
              >
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
              <FieldLabel
                tipTitle="Claim coins"
                tip="Paid when the player claims this mission (not the chest)."
              >
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
              <FieldLabel
                tipTitle="Claim XP"
                tip="Paid when the player claims this mission."
              >
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
          <input
            type="hidden"
            name="sortOrder"
            value={mission?.sortOrder ?? defaultSort}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {mission ? "Save" : "Add"}
            </Button>
            {mission && (
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
            )}
          </div>
        </div>
      )}
    </form>
  );
}
