"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { GameConfig } from "@/lib/game/economy";
import { mergeGameConfig } from "@/lib/game/economy";
import { Input } from "@/components/ui/input";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

type DuelConfigSectionsProps = {
  draft: GameConfig;
  setDraft: Dispatch<SetStateAction<GameConfig>>;
  onFieldChange: (path: string, raw: string) => void;
};

function getPath(obj: unknown, path: string): number {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return 0;
    cur = (cur as Record<string | number, unknown>)[
      /^\d+$/.test(p) ? Number(p) : p
    ];
  }
  return typeof cur === "number" && Number.isFinite(cur) ? cur : 0;
}

function NumField({
  label,
  tip,
  path,
  draft,
  onFieldChange,
  min = 0,
  step = 1,
  suffix,
}: {
  label: string;
  tip: string;
  path: string;
  draft: GameConfig;
  onFieldChange: (path: string, raw: string) => void;
  min?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <span className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-700">
        <span className="truncate">{label}</span>
        <AdminHelpTip text={tip} />
      </span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={min}
          step={step}
          value={getPath(draft, path)}
          onChange={(e) => onFieldChange(path, e.target.value)}
          className="h-8 font-mono text-sm font-semibold tabular-nums"
        />
        {suffix ? (
          <span className="shrink-0 text-xs font-bold text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

/** Edit a ms-backed field as seconds in the UI. */
function SecondsField({
  label,
  tip,
  path,
  draft,
  onFieldChange,
  minSec = 1,
  step = 1,
}: {
  label: string;
  tip: string;
  path: string;
  draft: GameConfig;
  onFieldChange: (path: string, raw: string) => void;
  minSec?: number;
  step?: number;
}) {
  const sec =
    Math.round((getPath(draft, path) / 1000) * 100) / 100;
  return (
    <label className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <span className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-700">
        <span className="truncate">{label}</span>
        <AdminHelpTip text={tip} />
      </span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={minSec}
          step={step}
          value={sec}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n) || n <= 0) return;
            onFieldChange(path, String(Math.round(n * 1000)));
          }}
          className="h-8 font-mono text-sm font-semibold tabular-nums"
        />
        <span className="shrink-0 text-xs font-bold text-slate-400">sec</span>
      </div>
    </label>
  );
}

/** Edit a ms-backed field as minutes. */
function MinutesField({
  label,
  tip,
  path,
  draft,
  onFieldChange,
  minMin = 0,
  step = 0.5,
}: {
  label: string;
  tip: string;
  path: string;
  draft: GameConfig;
  onFieldChange: (path: string, raw: string) => void;
  minMin?: number;
  step?: number;
}) {
  const mins =
    Math.round((getPath(draft, path) / 60_000) * 100) / 100;
  return (
    <label className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <span className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-700">
        <span className="truncate">{label}</span>
        <AdminHelpTip text={tip} />
      </span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={minMin}
          step={step}
          value={mins}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n) || n < 0) return;
            onFieldChange(path, String(Math.round(n * 60_000)));
          }}
          className="h-8 font-mono text-sm font-semibold tabular-nums"
        />
        <span className="shrink-0 text-xs font-bold text-slate-400">min</span>
      </div>
    </label>
  );
}

function Section({
  id,
  title,
  titleFa,
  hint,
  children,
  accent = "rose",
}: {
  id?: string;
  title: string;
  titleFa: string;
  hint: string;
  children: ReactNode;
  accent?: "rose" | "amber" | "sky" | "violet" | "emerald";
}) {
  const ring =
    accent === "amber"
      ? "border-amber-200 bg-amber-50/40"
      : accent === "sky"
        ? "border-sky-200 bg-sky-50/40"
        : accent === "violet"
          ? "border-violet-200 bg-violet-50/40"
          : accent === "emerald"
            ? "border-emerald-200 bg-emerald-50/40"
            : "border-rose-200 bg-rose-50/40";
  return (
    <section
      id={id}
      className={`scroll-mt-28 space-y-3 rounded-2xl border p-4 ${ring}`}
    >
      <header className="space-y-0.5">
        <h3 className="font-semibold text-slate-900">
          {title}{" "}
          <span className="font-normal text-slate-500">· {titleFa}</span>
        </h3>
        <p className="text-xs text-slate-600">{hint}</p>
      </header>
      {children}
    </section>
  );
}

/**
 * Draft Duel config — rewards, structure, AFK timing, Memory / Tiki clocks.
 */
export function DuelConfigSections({
  draft,
  setDraft,
  onFieldChange,
}: DuelConfigSectionsProps) {
  const d = draft.duel;
  const timeout = d.timeoutAction;
  const memoryOn = draft.liveModes.memory.duel;
  const tikiOn = draft.liveModes.tikiTaka.duel;
  const totalQs = d.questionsPerAttack * d.rounds;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-rose-300 bg-linear-to-br from-rose-50 to-white px-4 py-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">
          Draft Duel · دوئل
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Async head-to-head
        </h2>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          {d.rounds} rounds × {d.questionsPerAttack} Q ≈ {totalQs} quiz
          questions, then Memory / Tiki when enabled. Times shown in hours /
          seconds — not raw ms.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
          <a
            href="#duel-rewards"
            className="rounded-full bg-rose-600 px-3 py-1.5 text-white shadow-sm"
          >
            ↓ Rewards
          </a>
          <a
            href="#duel-structure"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Structure
          </a>
          <a
            href="#duel-timing"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            AFK / queue
          </a>
          <a
            href="#duel-memory"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Mini-games
          </a>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className={[
              "rounded-full px-2.5 py-1 text-[10px] font-bold",
              memoryOn
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-500",
            ].join(" ")}
          >
            Memory {memoryOn ? "· duel ON" : "· off"}
          </span>
          <span
            className={[
              "rounded-full px-2.5 py-1 text-[10px] font-bold",
              tikiOn
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-500",
            ].join(" ")}
          >
            Tiki-Taka {tikiOn ? "· duel ON" : "· off"}
          </span>
        </div>
      </div>

      <Section
        id="duel-rewards"
        title="Rewards & cost"
        titleFa="پاداش و هزینه"
        hint="Weekly XP only — duels do not mint soft coins."
        accent="emerald"
      >
        <div className="grid gap-1.5 sm:grid-cols-2">
          <NumField
            label="Win weekly XP"
            tip="Leaderboard points for the winner (bots / expire walkovers included). Keep modest vs Survival."
            path="duel.winWeeklyXp"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <NumField
            label="Stamina cost"
            tip="Stamina spent when opening / starting a Draft Duel."
            path="duel.staminaCost"
            draft={draft}
            onFieldChange={onFieldChange}
          />
        </div>
      </Section>

      <Section
        id="duel-structure"
        title="Match structure"
        titleFa="ساختار مسابقه"
        hint="v1 locks rounds at 2 (each player attacks once)."
        accent="rose"
      >
        <div className="grid gap-1.5 sm:grid-cols-3">
          <div className="flex flex-col justify-center gap-0.5 rounded-lg border border-dashed border-rose-300 bg-white/70 px-2.5 py-2">
            <span className="text-[11px] font-semibold text-slate-700">
              Rounds
            </span>
            <span className="font-mono text-sm font-bold text-slate-900">
              {d.rounds}{" "}
              <span className="text-[10px] font-bold uppercase text-slate-400">
                locked
              </span>
            </span>
          </div>
          <NumField
            label="Questions / attack"
            tip={`Attacker answers this many after picking a category. Total quiz ≈ ${totalQs}.`}
            path="duel.questionsPerAttack"
            draft={draft}
            onFieldChange={onFieldChange}
            min={1}
          />
          <NumField
            label="Draft choices"
            tip="Categories offered in the draft picker. Minimum 2."
            path="duel.draftChoices"
            draft={draft}
            onFieldChange={onFieldChange}
            min={2}
          />
        </div>
      </Section>

      <Section
        id="duel-timing"
        title="AFK & matchmaking"
        titleFa="تایم‌اوت و صف"
        hint="Lazy expire on inbox fetch + cron. Bot delay is how long Shadow Bot waits before answering."
        accent="amber"
      >
        <div className="space-y-2">
          <div className="rounded-xl border border-amber-200 bg-white p-3">
            <p className="mb-2 flex items-center gap-1 text-[11px] font-bold text-slate-700">
              When turn timer expires
              <AdminHelpTip text="Past turn hours: Shadow Bot fabricates AFK answers, or Auto forfeit ends the match." />
            </p>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-amber-50 p-1 ring-1 ring-amber-100">
              {(
                [
                  {
                    id: "SHADOW_BOT" as const,
                    label: "Bot fills turn",
                    sub: "Recommended",
                  },
                  {
                    id: "AUTO_FORFEIT" as const,
                    label: "Auto forfeit",
                    sub: "AFK loses",
                  },
                ] as const
              ).map((opt) => {
                const on = timeout === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) =>
                        mergeGameConfig({
                          ...prev,
                          duel: { ...prev.duel, timeoutAction: opt.id },
                        }),
                      )
                    }
                    className={[
                      "rounded-md px-2 py-2 text-left transition",
                      on
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-amber-950/70 hover:bg-amber-100",
                    ].join(" ")}
                  >
                    <span className="block text-xs font-bold">{opt.label}</span>
                    <span
                      className={[
                        "block text-[10px]",
                        on ? "text-amber-100" : "text-amber-900/50",
                      ].join(" ")}
                    >
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            <NumField
              label="Turn timer"
              tip="Hours before timeout handling. Lazy-evaluated on inbox fetch + cron."
              path="duel.turnHours"
              draft={draft}
              onFieldChange={onFieldChange}
              min={1}
              suffix="h"
            />
            <SecondsField
              label="Matchmaking wait"
              tip="Seconds to wait for a human before assigning a bot. Minimum 5s enforced on save."
              path="duel.matchmakingMs"
              draft={draft}
              onFieldChange={onFieldChange}
              minSec={5}
            />
            <MinutesField
              label="Bot delay min"
              tip="Shadow Bot waits at least this long before answering (simulates a human)."
              path="duel.botDelayMinMs"
              draft={draft}
              onFieldChange={onFieldChange}
            />
            <MinutesField
              label="Bot delay max"
              tip="Shadow Bot waits at most this long before answering."
              path="duel.botDelayMaxMs"
              draft={draft}
              onFieldChange={onFieldChange}
            />
          </div>
        </div>
      </Section>

      <Section
        id="duel-memory"
        title="Mini-games"
        titleFa="بازی‌های فرعی"
        hint="Memory board + Tiki-Taka clocks. Placement toggles live in Live Ops."
        accent="violet"
      >
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          <NumField
            label="Memory pairs"
            tip="Pairs on the shared board (2–8). Default 8 → 4×4."
            path="duel.memoryPairs"
            draft={draft}
            onFieldChange={onFieldChange}
            min={2}
          />
          <SecondsField
            label="Memory turn"
            tip="Server clock for each Memory half. Minimum 5s."
            path="duel.memoryTurnMs"
            draft={draft}
            onFieldChange={onFieldChange}
            minSec={5}
          />
          <SecondsField
            label="Memory reveal"
            tip="Client flip-reveal duration hint. UX only — server may ignore."
            path="duel.memoryRevealMs"
            draft={draft}
            onFieldChange={onFieldChange}
            minSec={0.5}
            step={0.5}
          />
          <SecondsField
            label="Tiki-Taka turn"
            tip="Server-authoritative mini-turn clock for Tiki-Taka."
            path="duel.tikiTakaTurnMs"
            draft={draft}
            onFieldChange={onFieldChange}
            minSec={5}
          />
        </div>
      </Section>
    </div>
  );
}
