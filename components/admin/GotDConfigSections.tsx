"use client";

import type { ReactNode } from "react";
import type { GameConfig } from "@/lib/game/economy";
import { Input } from "@/components/ui/input";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

type GotDConfigSectionsProps = {
  draft: GameConfig;
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

function NumCell({
  path,
  draft,
  onFieldChange,
  min = 0,
  step = 1,
  ariaLabel,
}: {
  path: string;
  draft: GameConfig;
  onFieldChange: (path: string, raw: string) => void;
  min?: number;
  step?: number;
  ariaLabel: string;
}) {
  return (
    <Input
      type="number"
      min={min}
      step={step}
      aria-label={ariaLabel}
      value={getPath(draft, path)}
      onChange={(e) => onFieldChange(path, e.target.value)}
      className="h-9 w-full font-mono text-sm font-semibold tabular-nums"
    />
  );
}

function Section({
  title,
  titleFa,
  hint,
  children,
  accent = "violet",
  id,
}: {
  title: string;
  titleFa: string;
  hint: string;
  children: ReactNode;
  accent?: "violet" | "rose" | "sky" | "amber";
  id?: string;
}) {
  const ring =
    accent === "rose"
      ? "border-rose-200 bg-rose-50/40"
      : accent === "sky"
        ? "border-sky-200 bg-sky-50/40"
        : accent === "amber"
          ? "border-amber-200 bg-amber-50/40"
          : "border-violet-200 bg-violet-50/40";
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

type ModeRow = {
  key: string;
  name: string;
  nameFa: string;
  schedule: string;
  coinsKey: string;
  xpKey: string;
  liveKey: keyof GameConfig["liveModes"];
};

const DAILY_MODES: ModeRow[] = [
  {
    key: "mystery",
    name: "Mystery",
    nameFa: "بازیکن مرموز",
    schedule: "Odd Tehran days",
    coinsKey: "gotd.mysteryWinCoins",
    xpKey: "gotd.mysteryWinXp",
    liveKey: "mystery",
  },
  {
    key: "grid",
    name: "Grid",
    nameFa: "جدول فوتبال",
    schedule: "Even Tehran days",
    coinsKey: "gotd.gridWinCoins",
    xpKey: "gotd.gridWinXp",
    liveKey: "grid",
  },
  {
    key: "memory",
    name: "Memory",
    nameFa: "حافظه",
    schedule: "When Live Ops → Memory GotD is on",
    coinsKey: "gotd.memoryWinCoins",
    xpKey: "gotd.memoryWinXp",
    liveKey: "memory",
  },
];

/**
 * GotD payouts — mode rows + bonuses. Star Path uses min/max range.
 */
export function GotDConfigSections({
  draft,
  onFieldChange,
}: GotDConfigSectionsProps) {
  const g = draft.gotd;
  const streakPct = Math.round(g.streakMultiplierPerDay * 100);
  const exampleBase = g.mysteryWinCoins;
  const exampleDay3 = Math.round(exampleBase * (1 + g.streakMultiplierPerDay * 2));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-300 bg-linear-to-br from-violet-50 to-white px-4 py-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">
          GotD · بازی روز
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Daily mode payouts
        </h2>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          Base coins + XP per daily puzzle. Streak scales coins only; XP stays
          flat. Perfect clear is a flat coin top-up.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
          <a
            href="#gotd-modes"
            className="rounded-full bg-violet-600 px-3 py-1.5 text-white shadow-sm"
          >
            ↓ Modes
          </a>
          <a
            href="#gotd-star"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Star Path
          </a>
          <a
            href="#gotd-bonus"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Bonuses
          </a>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(
            [
              ["mystery", "Mystery"],
              ["grid", "Grid"],
              ["memory", "Memory"],
              ["starPath", "Star Path"],
            ] as const
          ).map(([key, label]) => {
            const on = draft.liveModes[key].gotd;
            return (
              <span
                key={key}
                className={[
                  "rounded-full px-2.5 py-1 text-[10px] font-bold",
                  on
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {label} {on ? "· rotator ON" : "· off"}
              </span>
            );
          })}
        </div>
      </div>

      <Section
        id="gotd-modes"
        title="Daily modes"
        titleFa="حالت‌های روزانه"
        hint="One row per puzzle — Coins (streak-scaled) and XP (flat)."
        accent="violet"
      >
        <div className="overflow-hidden rounded-xl border border-violet-200 bg-white">
          <div className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
            <span>Mode</span>
            <span className="text-center">Coins</span>
            <span className="text-center">XP</span>
          </div>
          {DAILY_MODES.map((mode) => {
            const onRotator = draft.liveModes[mode.liveKey].gotd;
            return (
              <div
                key={mode.key}
                className="grid grid-cols-[1fr_5.5rem_5.5rem] items-center gap-2 border-b border-slate-100 px-3 py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {mode.name}{" "}
                    <span className="font-normal text-slate-500">
                      · {mode.nameFa}
                    </span>
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {mode.schedule}
                    {!onRotator ? " · rotator off in Live Ops" : ""}
                  </p>
                </div>
                <NumCell
                  path={mode.coinsKey}
                  draft={draft}
                  onFieldChange={onFieldChange}
                  ariaLabel={`${mode.name} coins`}
                />
                <NumCell
                  path={mode.xpKey}
                  draft={draft}
                  onFieldChange={onFieldChange}
                  ariaLabel={`${mode.name} XP`}
                />
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        id="gotd-star"
        title="Star Path"
        titleFa="مسیر ستاره"
        hint="Payout scales with score — max at first clue (100), min at fourth (25)."
        accent="sky"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-sky-200 bg-white p-3">
            <p className="mb-2 text-[11px] font-bold text-sky-900">
              Max · score 100
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-500">
                  Coins
                </span>
                <NumCell
                  path="gotd.starPathWinCoinsMax"
                  draft={draft}
                  onFieldChange={onFieldChange}
                  ariaLabel="Star Path max coins"
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-500">
                  XP
                </span>
                <NumCell
                  path="gotd.starPathWinXpMax"
                  draft={draft}
                  onFieldChange={onFieldChange}
                  ariaLabel="Star Path max XP"
                />
              </label>
            </div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-white p-3">
            <p className="mb-2 text-[11px] font-bold text-sky-900">
              Min · score 25
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-500">
                  Coins
                </span>
                <NumCell
                  path="gotd.starPathWinCoinsMin"
                  draft={draft}
                  onFieldChange={onFieldChange}
                  ariaLabel="Star Path min coins"
                />
              </label>
              <label className="space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-500">
                  XP
                </span>
                <NumCell
                  path="gotd.starPathWinXpMin"
                  draft={draft}
                  onFieldChange={onFieldChange}
                  ariaLabel="Star Path min XP"
                />
              </label>
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="gotd-bonus"
        title="Bonuses"
        titleFa="بونوس‌ها"
        hint="Apply on top of the mode base. Streak = coins only."
        accent="amber"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-white px-3 py-2.5">
            <span className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span>Streak % / day</span>
              <AdminHelpTip text="Extra coin fraction of base per consecutive GotD day. 10 = +10%/day. FAILED resets streak. Clamped 0–100%." />
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={streakPct}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  if (!Number.isFinite(pct)) return;
                  onFieldChange(
                    "gotd.streakMultiplierPerDay",
                    String(Math.min(100, Math.max(0, pct)) / 100),
                  );
                }}
                className="h-9 font-mono text-sm font-semibold tabular-nums"
              />
              <span className="text-sm font-bold text-slate-500">%</span>
            </div>
            <p className="text-[11px] text-slate-500">
              e.g. Mystery day 3 → ~{exampleDay3} coins (base {exampleBase})
            </p>
          </label>

          <label className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-white px-3 py-2.5">
            <span className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span>Perfect clear coins</span>
              <AdminHelpTip text="Flat coin bonus — Mystery in 1 guess, Grid with 0 mistakes, or Star Path score 100. Added after streak scaling." />
            </span>
            <NumCell
              path="gotd.perfectClearBonusCoins"
              draft={draft}
              onFieldChange={onFieldChange}
              ariaLabel="Perfect clear bonus coins"
            />
            <p className="text-[11px] text-slate-500">
              Flat top-up · not streak-scaled
            </p>
          </label>
        </div>
      </Section>
    </div>
  );
}
