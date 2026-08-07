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
    <div className="space-y-3">
      {/* Health strip */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div
          className={[
            "rounded-xl border bg-white px-3.5 py-3 shadow-sm",
            poolOk
              ? "border-emerald-200"
              : "border-rose-200 bg-rose-50",
          ].join(" ")}
        >
          <p
            className={[
              "text-[11px] font-bold uppercase tracking-wide",
              poolOk ? "text-slate-700" : "text-rose-900",
            ].join(" ")}
          >
            Nation pool
          </p>
          <p
            className={[
              "mt-0.5 text-2xl font-bold tabular-nums",
              poolOk ? "text-slate-900" : "text-rose-950",
            ].join(" ")}
          >
            {snapshot.distinctNationCount}
          </p>
          <p
            className={[
              "mt-1 text-[11px] font-medium",
              poolOk ? "text-slate-700" : "text-rose-900",
            ].join(" ")}
          >
            {snapshot.activePlayerPoolCount} active · need ≥ {pairs} ·{" "}
            <Link
              href="/admin/players"
              className={[
                "font-semibold underline-offset-2 hover:underline",
                poolOk ? "text-emerald-800" : "text-rose-950",
              ].join(" ")}
            >
              Players
            </Link>
          </p>
          {!poolOk ? (
            <p className="mt-1 text-[11px] font-bold text-rose-950">
              Pool too small for {pairs} pairs
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">
            <Swords className="h-3.5 w-3.5 text-slate-800" />
            Duel (7d)
          </div>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
            {snapshot.recentMemoryDuelRounds}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-700">
            Memory rounds this week
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700">
            <Brain className="h-3.5 w-3.5 text-slate-800" />
            Daily puzzles
          </div>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
            {snapshot.puzzles.length}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-700">
            {todayPuzzle
              ? `Today live · ${todayPuzzle.pairCount} pairs`
              : "None today — GotD on first play"}
          </p>
        </div>
      </div>

      {/* Settings */}
      <section
        className={[
          "sticky top-2 z-10 overflow-hidden rounded-xl border bg-white shadow-sm",
          dirty ? "border-amber-300" : "border-slate-200/90",
        ].join(" ")}
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Duel settings
            </h2>
            {dirty ? (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-950 ring-1 ring-amber-200">
                Unsaved
              </span>
            ) : (
              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-800 ring-1 ring-slate-200">
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
            className={[
              "h-8 gap-1.5",
              dirty
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "",
            ].join(" ")}
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? "Saving…" : "Save"}
          </Button>
        </header>

        <div className="grid gap-3 p-3.5 sm:grid-cols-3">
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
            <p className="mt-1 text-[11px] font-medium text-slate-700">
              2–8 per board
            </p>
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
            <p className="mt-1 text-[11px] font-medium text-slate-700">
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
            <p className="mt-1 text-[11px] font-medium text-slate-700">
              Mismatch flip-back delay
            </p>
          </div>
        </div>
      </section>

      {/* Live today */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white px-3.5 py-3 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-950 ring-1 ring-amber-200">
          <Brain className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-950">
              Live today
            </p>
            <span
              className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-950 ring-1 ring-amber-200"
              dir="rtl"
            >
              {formatJalaliLabel(snapshot.todayKey)}
            </span>
            <code className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 ring-1 ring-slate-200">
              {snapshot.todayKey}
            </code>
          </div>
          {todayPuzzle ? (
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {todayPuzzle.pairCount} pairs · {todayPuzzle.attemptCount} plays ·{" "}
              {todayPuzzle.solvedCount} solved
            </p>
          ) : (
            <p className="mt-1 text-sm font-medium text-slate-800">
              No daily row yet
              {snapshot.placement.gotd
                ? " — first GotD play will create one."
                : " · GotD is off under Modes."}
            </p>
          )}
        </div>
      </div>

      {/* Schedule */}
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
          <h2 className="text-sm font-semibold text-slate-900">Schedule</h2>
          <span className="text-[11px] font-semibold text-slate-800">
            {schedule.length} day{schedule.length === 1 ? "" : "s"}
          </span>
        </header>

        {schedule.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 ring-1 ring-slate-200">
              <Brain className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-slate-900">
              No other daily puzzles yet
            </p>
            <p className="max-w-xs text-xs font-medium text-slate-800">
              Enable GotD under Modes — rows appear on first play.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {schedule.map((p) => {
              const isUpcoming = p.dateKey > snapshot.todayKey;
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-2.5 px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="text-xs font-bold text-slate-900"
                        dir="rtl"
                      >
                        {formatJalaliLabel(p.dateKey)}
                      </span>
                      <code className="font-mono text-[10px] text-slate-700">
                        {p.dateKey}
                      </code>
                      {isUpcoming ? (
                        <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-950 ring-1 ring-sky-200">
                          UPCOMING
                        </span>
                      ) : (
                        <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-800 ring-1 ring-slate-200">
                          PAST
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-700">
                      {p.pairCount} pairs · {p.attemptCount} plays ·{" "}
                      {p.solvedCount} solved
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
