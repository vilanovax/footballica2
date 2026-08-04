"use client";

import type { ReactNode } from "react";
import {
  DEFAULT_GAME_CONFIG,
  type GameConfig,
} from "@/lib/game/economy";
import { Input } from "@/components/ui/input";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

type SurvivalConfigSectionsProps = {
  draft: GameConfig;
  onFieldChange: (path: string, raw: string) => void;
  onQuickCoins: (multiplier: number) => void;
  survivalMult: 0.5 | 1 | 2 | null;
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
}: {
  label: string;
  tip: string;
  path: string;
  draft: GameConfig;
  onFieldChange: (path: string, raw: string) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <span className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-700">
        <span className="truncate">{label}</span>
        <AdminHelpTip text={tip} />
      </span>
      <Input
        type="number"
        min={min}
        step={step}
        value={getPath(draft, path)}
        onChange={(e) => onFieldChange(path, e.target.value)}
        className="h-8 font-mono text-sm font-semibold tabular-nums"
      />
    </label>
  );
}

function Section({
  id,
  title,
  titleFa,
  hint,
  children,
  accent = "amber",
}: {
  id?: string;
  title: string;
  titleFa: string;
  hint: string;
  children: ReactNode;
  accent?: "amber" | "rose" | "emerald" | "sky";
}) {
  const ring =
    accent === "rose"
      ? "border-rose-200 bg-rose-50/40"
      : accent === "emerald"
        ? "border-emerald-200 bg-emerald-50/40"
        : accent === "sky"
          ? "border-sky-200 bg-sky-50/40"
          : "border-amber-200 bg-amber-50/40";
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
 * Survival config — event lever, per-correct rates, clear-bank, run rules.
 */
export function SurvivalConfigSections({
  draft,
  onFieldChange,
  onQuickCoins,
  survivalMult,
}: SurvivalConfigSectionsProps) {
  const s = draft.survival;
  const exampleScore = 30;
  const exampleWeekly = Math.max(1, Math.floor(exampleScore / s.weeklyXpDivisor));
  const defaultCoins = DEFAULT_GAME_CONFIG.survival.coinsPerCorrect;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-300 bg-linear-to-br from-amber-50 to-white px-4 py-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
          Survival · بقا
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Endless quiz grind
        </h2>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          Main soft-coin inflation lever. Pay per correct; clear-bank is rare.
          Weekly XP = floor(score ÷ divisor).
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
          <a
            href="#surv-rates"
            className="rounded-full bg-amber-600 px-3 py-1.5 text-white shadow-sm"
          >
            ↓ Rates
          </a>
          <a
            href="#surv-clear"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Clear-bank
          </a>
          <a
            href="#surv-rules"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Lives / stamina
          </a>
        </div>
      </div>

      <Section
        title="Coins event"
        titleFa="ایونت سکه"
        hint={`Snap coins/correct to ${defaultCoins} × multiplier. Save to go live.`}
        accent="amber"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-sm font-bold text-amber-950">
            Now · {s.coinsPerCorrect} coins / correct
          </p>
          <div className="grid min-w-[16rem] flex-1 grid-cols-3 gap-1 rounded-xl bg-white p-1 ring-1 ring-amber-100 sm:max-w-sm">
            {(
              [
                { m: 0.5 as const, label: "½×" },
                { m: 1 as const, label: "Default" },
                { m: 2 as const, label: "2× weekend" },
              ] as const
            ).map(({ m, label }) => {
              const on = survivalMult === m;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onQuickCoins(m)}
                  className={[
                    "rounded-lg px-2 py-2 text-xs font-bold transition",
                    on
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-amber-950/70 hover:bg-amber-100",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section
        id="surv-rates"
        title="Per correct"
        titleFa="به ازای هر جواب درست"
        hint="Paid × verified correct answers when the run settles."
        accent="emerald"
      >
        <div className="grid gap-1.5 sm:grid-cols-3">
          <NumField
            label="Coins"
            tip="Primary Survival earn rate. Main inflation lever — use the event snaps above for weekends."
            path="survival.coinsPerCorrect"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <NumField
            label="XP"
            tip="Lifetime XP per correct (manager level). Separate from weekly league XP."
            path="survival.xpPerCorrect"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <NumField
            label="Fans"
            tip="Club fans per correct answer."
            path="survival.fansPerCorrect"
            draft={draft}
            onFieldChange={onFieldChange}
          />
        </div>
      </Section>

      <Section
        id="surv-clear"
        title="Clear the bank"
        titleFa="پاک‌کردن بانک سوال"
        hint="Flat bonus only if the category bank runs out before lives do — rare."
        accent="sky"
      >
        <div className="grid gap-1.5 sm:grid-cols-2">
          <NumField
            label="Bonus coins"
            tip="Flat coin bonus when the player exhausts the category question bank."
            path="survival.clearedCoinBonus"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <NumField
            label="Bonus XP"
            tip="Flat XP bonus paired with clear-bank coins."
            path="survival.clearedXpBonus"
            draft={draft}
            onFieldChange={onFieldChange}
          />
        </div>
      </Section>

      <Section
        id="surv-rules"
        title="Run rules"
        titleFa="قوانین ران"
        hint="Hearts, entry cost, and weekly leaderboard conversion."
        accent="rose"
      >
        <div className="grid gap-1.5 sm:grid-cols-3">
          <NumField
            label="Lives"
            tip="Hearts at kickoff. Run ends when misses reach this count. Server settle is authoritative."
            path="survival.lives"
            draft={draft}
            onFieldChange={onFieldChange}
            min={1}
          />
          <NumField
            label="Stamina cost"
            tip="Stamina removed when the run settles successfully."
            path="survival.staminaCost"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <label className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
            <span className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-700">
              <span className="truncate">Weekly XP ÷</span>
              <AdminHelpTip text="Leaderboard XP = max(1, floor(score ÷ this)). Higher = slower weekly climb. Must be ≥ 1." />
            </span>
            <Input
              type="number"
              min={1}
              value={s.weeklyXpDivisor}
              onChange={(e) =>
                onFieldChange("survival.weeklyXpDivisor", e.target.value)
              }
              className="h-8 font-mono text-sm font-semibold tabular-nums"
            />
            <p className="text-[10px] text-slate-500">
              score {exampleScore} → {exampleWeekly} weekly XP
            </p>
          </label>
        </div>
      </Section>
    </div>
  );
}
