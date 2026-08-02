"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Pencil,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  ensureMysteryScheduleWeek,
  upsertDailyMysteryPuzzle,
  type AdminMysteryPuzzleRow,
} from "@/actions/admin/mystery";
import { AdminHelpTip, FieldLabel } from "@/components/admin/AdminHelpTip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PlayerOpt = {
  slug: string;
  nameEn: string;
  nameFa: string;
  isActive: boolean;
};

export function MysteryPuzzlesPanel({
  todayKey,
  initialPuzzles,
  players,
}: {
  todayKey: string;
  initialPuzzles: AdminMysteryPuzzleRow[];
  players: PlayerOpt[];
}) {
  const router = useRouter();
  const seedToday = initialPuzzles.find((p) => p.dateKey === todayKey) ?? null;
  const [puzzles, setPuzzles] = useState(initialPuzzles);
  const [dateKey, setDateKey] = useState(todayKey);
  const [playerId, setPlayerId] = useState(
    seedToday?.targetPlayerId ??
      players.find((p) => p.isActive)?.slug ??
      "",
  );
  const [maxGuesses, setMaxGuesses] = useState(seedToday?.maxGuesses ?? 6);
  const [pending, startTransition] = useTransition();

  const activePlayers = useMemo(
    () => players.filter((p) => p.isActive),
    [players],
  );

  const todayPuzzle = useMemo(
    () => puzzles.find((p) => p.dateKey === todayKey) ?? null,
    [puzzles, todayKey],
  );

  const upcoming = useMemo(
    () => puzzles.filter((p) => p.dateKey !== todayKey),
    [puzzles, todayKey],
  );

  const editingExisting = useMemo(
    () => puzzles.some((p) => p.dateKey === dateKey),
    [puzzles, dateKey],
  );

  const isEditingToday = dateKey === todayKey;

  function publish() {
    if (!playerId) {
      toast.error("Pick a target player.");
      return;
    }
    startTransition(async () => {
      const res = await upsertDailyMysteryPuzzle({
        dateKey,
        targetPlayerId: playerId,
        maxGuesses,
      });
      if (!res.ok || !res.puzzle) {
        const msg =
          res.ok
            ? "Could not save."
            : res.error === "player_inactive"
              ? "Player is inactive."
              : res.error === "date_invalid"
                ? "Date must be YYYY-MM-DD (Tehran)."
                : res.error === "player_not_found"
                  ? "Player not found."
                  : "Could not save puzzle.";
        toast.error(msg);
        return;
      }
      setPuzzles((prev) => {
        const rest = prev.filter((p) => p.dateKey !== res.puzzle!.dateKey);
        return [res.puzzle!, ...rest].sort((a, b) =>
          b.dateKey.localeCompare(a.dateKey),
        );
      });
      toast.success(
        res.puzzle.isToday
          ? "Today’s Mysterious Player published"
          : `Puzzle set for ${res.puzzle.dateKey}`,
      );
      router.refresh();
    });
  }

  function loadRow(p: AdminMysteryPuzzleRow) {
    setDateKey(p.dateKey);
    setPlayerId(p.targetPlayerId);
    setMaxGuesses(p.maxGuesses);
  }

  function loadToday() {
    if (todayPuzzle) {
      loadRow(todayPuzzle);
      return;
    }
    setDateKey(todayKey);
  }

  function fillWeek() {
    startTransition(async () => {
      const res = await ensureMysteryScheduleWeek(7);
      if (!res.ok) {
        toast.error("Could not fill Mystery week.");
        return;
      }
      toast.success(
        `Week filled · +${res.created} new · ${res.skipped} kept`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Today spotlight */}
      <button
        type="button"
        onClick={loadToday}
        className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3.5 text-start shadow-sm transition hover:border-amber-300 hover:shadow"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Sparkles className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
              Live today
            </p>
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 ring-1 ring-amber-100">
              {todayKey}
            </code>
          </div>
          {todayPuzzle ? (
            <>
              <p className="mt-0.5 truncate font-semibold text-slate-900">
                {todayPuzzle.playerNameEn}
              </p>
              <p className="truncate text-xs text-slate-500">
                {todayPuzzle.playerNameFa} · {todayPuzzle.maxGuesses} guesses ·{" "}
                {todayPuzzle.attemptCount} plays · {todayPuzzle.solvedCount}{" "}
                solved
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-slate-600">
              No puzzle yet — auto-pick runs until you publish.
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-semibold text-amber-800">
          {todayPuzzle ? "Edit" : "Set"}
        </span>
      </button>

      {/* Publish form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              {editingExisting ? "Edit day" : "Publish day"}
            </h2>
            {isEditingToday ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                TODAY
              </span>
            ) : null}
            <AdminHelpTip
              text="Active players only. Changing today’s target goes live on /play immediately."
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={fillWeek}
            className="gap-1.5"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Fill week
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <FieldLabel>Date</FieldLabel>
            <Input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="sm:col-span-6">
            <FieldLabel>Target player</FieldLabel>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {activePlayers.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    {p.nameEn}
                    {p.nameFa && p.nameFa !== p.nameEn ? ` · ${p.nameFa}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <FieldLabel>Max guesses</FieldLabel>
            <Input
              type="number"
              min={1}
              max={12}
              value={maxGuesses}
              onChange={(e) => setMaxGuesses(Number(e.target.value))}
              className="h-10"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            disabled={pending}
            onClick={publish}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? "Saving…" : editingExisting ? "Update puzzle" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Schedule</h2>
          <span className="text-xs font-medium text-slate-400">
            {upcoming.length} day{upcoming.length === 1 ? "" : "s"}
          </span>
        </div>

        {upcoming.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No other days yet — use Fill week or publish a future date.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-xs font-semibold text-slate-700">
                      {p.dateKey}
                    </code>
                    {p.dateKey > todayKey ? (
                      <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                        UPCOMING
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        PAST
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                    {p.playerNameEn}
                    {p.playerNameFa && p.playerNameFa !== p.playerNameEn
                      ? ` · ${p.playerNameFa}`
                      : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.maxGuesses} guesses · {p.attemptCount} plays ·{" "}
                    {p.solvedCount} solved
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => loadRow(p)}
                  className="h-9 gap-1.5 px-2.5 text-slate-600"
                  aria-label={`Edit ${p.dateKey}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
