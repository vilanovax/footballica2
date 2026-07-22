"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OBJECTIVES = [
  "SCORE_GOALS",
  "PLAY_MATCHES",
  "WIN_MATCHES",
  "PERFECT_COMBO",
  "PLAY_DUEL",
  "WIN_DUEL",
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

export function MissionsPanel({
  initialBatches,
  livePreview,
  analytics,
}: MissionsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [batches, setBatches] = useState(initialBatches);
  const analyticsById = new Map(analytics.map((a) => [a.batchId, a]));

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
      batches
        .filter((b) => b.kind === "CAMPAIGN")
        .reduce((m, b) => Math.max(m, b.batchIndex), 0) + 1;
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
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Live now</CardTitle>
          <CardDescription>
            What players unlock as their next incomplete batch (server clock).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          {livePreview.activeBatchIndex != null ? (
            <Badge className="bg-emerald-600">
              Batch #{livePreview.activeBatchIndex} is live
            </Badge>
          ) : (
            <Badge variant="secondary">No live batch</Badge>
          )}
          <span className="text-slate-500">{livePreview.reason}</span>
          <span className="font-mono text-xs text-slate-400">
            {livePreview.nowIso}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Analytics</CardTitle>
          <CardDescription>
            Per-batch completion and chest claim rates (clubs that started the
            batch).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {analytics.length === 0 ? (
            <p className="text-sm text-slate-500">No batch data yet.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Batch</th>
                  <th className="py-2 pr-3 font-medium">Kind</th>
                  <th className="py-2 pr-3 font-medium">Clubs</th>
                  <th className="py-2 pr-3 font-medium">Completion</th>
                  <th className="py-2 pr-3 font-medium">Chests</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((row) => (
                  <tr key={row.batchId} className="border-b border-slate-100">
                    <td className="py-2.5 pr-3 font-medium">
                      #{row.batchIndex}
                      {row.dayKey ? (
                        <span className="ml-2 font-mono text-xs text-slate-400">
                          {row.dayKey}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant="outline">{row.kind}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {row.clubsStarted}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {row.completionRate}%
                      <span className="ml-1 text-xs text-slate-400">
                        ({row.missionsCompleted}/{row.missionSlots})
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {row.chestClaimRate}%
                      <span className="ml-1 text-xs text-slate-400">
                        ({row.chestsClaimed}/{row.clubsStarted})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          LiveOps batches of 3. Use schedule + <code>isActive</code> without a
          deploy.
        </p>
        <Button
          type="button"
          disabled={pending}
          onClick={handleCreateBatch}
          className="shrink-0"
        >
          + New batch
        </Button>
      </div>

      {batches.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No batches yet. Create one or run the seed.
          </CardContent>
        </Card>
      )}

      {batches.map((batch) => {
        const stats = analyticsById.get(batch.id);
        return (
        <Card key={batch.id} className="border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                Batch #{batch.batchIndex}
                <Badge variant="outline">{batch.kind}</Badge>
                <Badge variant={batch.isActive ? "default" : "secondary"}>
                  {batch.isActive ? "Active" : "Off"}
                </Badge>
                <Badge variant="outline">
                  {batch.missions.length}/3 missions
                </Badge>
              </CardTitle>
              <CardDescription>
                Chest: {batch.chestCoins} coins · {batch.chestXp} XP
                {batch.dayKey ? ` · day ${batch.dayKey}` : ""}
                {stats
                  ? ` · ${stats.completionRate}% complete · ${stats.chestClaimRate}% chests`
                  : ""}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => handleToggle(batch)}
              >
                {batch.isActive ? "Disable" : "Enable"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => handleDeleteBatch(batch.id)}
              >
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              className="grid gap-3 sm:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveBatch(batch, new FormData(e.currentTarget));
              }}
            >
              <div>
                <Label htmlFor={`idx-${batch.id}`}>Index</Label>
                <Input
                  id={`idx-${batch.id}`}
                  name="batchIndex"
                  type="number"
                  defaultValue={batch.batchIndex}
                />
              </div>
              <div>
                <Label htmlFor={`cc-${batch.id}`}>Chest coins</Label>
                <Input
                  id={`cc-${batch.id}`}
                  name="chestCoins"
                  type="number"
                  defaultValue={batch.chestCoins}
                />
              </div>
              <div>
                <Label htmlFor={`cx-${batch.id}`}>Chest XP</Label>
                <Input
                  id={`cx-${batch.id}`}
                  name="chestXp"
                  type="number"
                  defaultValue={batch.chestXp}
                />
              </div>
              <div>
                <Label htmlFor={`sa-${batch.id}`}>Starts at</Label>
                <Input
                  id={`sa-${batch.id}`}
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(batch.startsAt)}
                />
              </div>
              <div>
                <Label htmlFor={`ea-${batch.id}`}>Ends at</Label>
                <Input
                  id={`ea-${batch.id}`}
                  name="endsAt"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(batch.endsAt)}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={batch.isActive}
                  />
                  Active
                </label>
                <Button type="submit" size="sm" disabled={pending}>
                  Save batch
                </Button>
              </div>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Missions</h3>
              {batch.missions.map((m) => (
                <MissionForm
                  key={m.id}
                  batchId={batch.id}
                  mission={m}
                  pending={pending}
                  onSave={handleSaveMission}
                  onDelete={handleDeleteMission}
                />
              ))}
              {batch.missions.length < 3 && (
                <MissionForm
                  batchId={batch.id}
                  mission={null}
                  pending={pending}
                  onSave={handleSaveMission}
                  onDelete={handleDeleteMission}
                  defaultSort={batch.missions.length}
                />
              )}
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
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

  return (
    <form
      className="rounded-lg border border-slate-200 bg-slate-50/80 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(batchId, mission, new FormData(e.currentTarget));
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label>Title EN</Label>
          <Input name="titleEn" defaultValue={mission?.titleEn ?? ""} required />
        </div>
        <div>
          <Label>Title FA</Label>
          <Input name="titleFa" defaultValue={mission?.titleFa ?? ""} required />
        </div>
        <div>
          <Label>Objective</Label>
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
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="objectiveType" value={objective} />
        </div>
        <div>
          <Label>Target</Label>
          <Input
            name="targetValue"
            type="number"
            defaultValue={mission?.targetValue ?? 5}
            required
          />
        </div>
        <div>
          <Label>Reward coins</Label>
          <Input
            name="rewardCoins"
            type="number"
            defaultValue={mission?.rewardCoins ?? 0}
          />
        </div>
        <div>
          <Label>Reward XP</Label>
          <Input
            name="rewardXp"
            type="number"
            defaultValue={mission?.rewardXp ?? 0}
          />
        </div>
        <div>
          <Label>Sort</Label>
          <Input
            name="sortOrder"
            type="number"
            defaultValue={mission?.sortOrder ?? defaultSort}
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {mission ? "Update mission" : "Add mission"}
        </Button>
        {mission && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => onDelete(mission.id)}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
