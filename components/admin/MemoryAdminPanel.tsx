"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Brain, Save, Swords } from "lucide-react";
import {
  getGameConfig,
  updateGameConfig,
} from "@/actions/admin/config";
import type { AdminMemorySnapshot } from "@/actions/admin/memory";
import { formatJalaliLabel } from "@/lib/admin/jalali";
import { mergeGameConfig } from "@/lib/game/economy";
import { AdminHelpTip, FieldLabel } from "@/components/admin/AdminHelpTip";
import { ModePlacementBadges } from "@/components/admin/ModePlacementBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function msToSec(ms: number): number {
  return Math.round(ms / 100) / 10;
}

function secToMs(sec: number): number {
  return Math.round(sec * 1000);
}

export function MemoryAdminPanel({
  snapshot,
}: {
  snapshot: AdminMemorySnapshot;
}) {
  const router = useRouter();
  const [pairs, setPairs] = useState(snapshot.duelKnobs.memoryPairs);
  const [turnSec, setTurnSec] = useState(
    msToSec(snapshot.duelKnobs.memoryTurnMs),
  );
  const [revealSec, setRevealSec] = useState(
    msToSec(snapshot.duelKnobs.memoryRevealMs),
  );
  const [saved, setSaved] = useState({
    pairs: snapshot.duelKnobs.memoryPairs,
    turnSec: msToSec(snapshot.duelKnobs.memoryTurnMs),
    revealSec: msToSec(snapshot.duelKnobs.memoryRevealMs),
  });
  const [pending, startTransition] = useTransition();

  const dirty =
    pairs !== saved.pairs ||
    turnSec !== saved.turnSec ||
    revealSec !== saved.revealSec;

  const poolOk = snapshot.distinctNationCount >= pairs;
  const todayPuzzle = useMemo(
    () => snapshot.puzzles.find((p) => p.dateKey === snapshot.todayKey) ?? null,
    [snapshot.puzzles, snapshot.todayKey],
  );
  const schedule = useMemo(
    () => snapshot.puzzles.filter((p) => p.dateKey !== snapshot.todayKey),
    [snapshot.puzzles, snapshot.todayKey],
  );

  function saveSettings() {
    startTransition(async () => {
      const current = await getGameConfig();
      const next = mergeGameConfig({
        ...current,
        duel: {
          ...current.duel,
          memoryPairs: pairs,
          memoryTurnMs: secToMs(turnSec),
          memoryRevealMs: secToMs(revealSec),
        },
      });
      const res = await updateGameConfig(next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const nextPairs = res.config.duel.memoryPairs;
      const nextTurn = msToSec(res.config.duel.memoryTurnMs);
      const nextReveal = msToSec(res.config.duel.memoryRevealMs);
      setPairs(nextPairs);
      setTurnSec(nextTurn);
      setRevealSec(nextReveal);
      setSaved({ pairs: nextPairs, turnSec: nextTurn, revealSec: nextReveal });
      toast.success("Memory settings saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModePlacementBadges placement={snapshot.placement} />
        <span className="text-xs text-slate-500">
          Today{" "}
          <span dir="rtl" className="font-semibold text-slate-700">
            {formatJalaliLabel(snapshot.todayKey)}
          </span>
          <code className="ms-1.5 font-mono text-[10px] text-slate-400">
            {snapshot.todayKey}
          </code>
        </span>
      </div>

      {/* Health strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className={[
            "rounded-2xl border bg-white p-4 shadow-sm",
            poolOk
              ? "border-emerald-200"
              : "border-rose-200 bg-rose-50/40",
          ].join(" ")}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Nation pool
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {snapshot.distinctNationCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {snapshot.activePlayerPoolCount} active players · need ≥ {pairs}{" "}
            nations ·{" "}
            <Link
              href="/admin/players"
              className="font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              Players
            </Link>
          </p>
          {!poolOk ? (
            <p className="mt-1.5 text-[11px] font-semibold text-rose-700">
              Pool too small for {pairs} pairs
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Swords className="h-3.5 w-3.5" />
            Duel (7d)
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {snapshot.recentMemoryDuelRounds}
          </p>
          <p className="mt-1 text-xs text-slate-500">Memory rounds this week</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Brain className="h-3.5 w-3.5" />
            Daily puzzles
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {snapshot.puzzles.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {todayPuzzle
              ? `Today live · ${todayPuzzle.pairCount} pairs`
              : "None today — GotD creates on first play"}
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Duel settings
            </h2>
            {dirty ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Unsaved
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                Saved
              </span>
            )}
            <AdminHelpTip text="Pairs = how many footballer↔nation matches per board. Turn & reveal are in seconds." />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pending || !dirty}
            onClick={saveSettings}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel>Pairs</FieldLabel>
            <Input
              type="number"
              min={2}
              max={8}
              value={pairs}
              onChange={(e) => setPairs(Number(e.target.value))}
              className="h-10"
            />
            <p className="mt-1 text-[11px] text-slate-500">2–8 per board</p>
          </div>
          <div>
            <FieldLabel>Turn (sec)</FieldLabel>
            <Input
              type="number"
              min={5}
              step={0.5}
              value={turnSec}
              onChange={(e) => setTurnSec(Number(e.target.value))}
              className="h-10"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Per-player flip window
            </p>
          </div>
          <div>
            <FieldLabel>Reveal (sec)</FieldLabel>
            <Input
              type="number"
              min={0.2}
              step={0.1}
              value={revealSec}
              onChange={(e) => setRevealSec(Number(e.target.value))}
              className="h-10"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Mismatch flip-back delay
            </p>
          </div>
        </div>
      </div>

      {/* Today + schedule */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3.5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Brain className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                Live today
              </p>
              <span
                className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-amber-100"
                dir="rtl"
              >
                {formatJalaliLabel(snapshot.todayKey)}
              </span>
            </div>
            {todayPuzzle ? (
              <p className="mt-0.5 text-sm text-slate-700">
                {todayPuzzle.pairCount} pairs · {todayPuzzle.attemptCount} plays
                · {todayPuzzle.solvedCount} solved
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-slate-600">
                No daily row yet
                {snapshot.placement.gotd
                  ? " — first GotD play will create one."
                  : " · GotD is off under Modes."}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Schedule</h2>
          <span className="text-xs font-medium text-slate-400">
            {schedule.length} day{schedule.length === 1 ? "" : "s"}
          </span>
        </div>

        {schedule.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No other daily puzzles yet. Enable GotD under Modes — rows appear
            on first play.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {schedule.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-xs font-semibold text-slate-800"
                      dir="rtl"
                    >
                      {formatJalaliLabel(p.dateKey)}
                    </span>
                    <code className="font-mono text-[10px] text-slate-400">
                      {p.dateKey}
                    </code>
                    {p.dateKey > snapshot.todayKey ? (
                      <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                        UPCOMING
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        PAST
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.pairCount} pairs · {p.attemptCount} plays ·{" "}
                    {p.solvedCount} solved
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
