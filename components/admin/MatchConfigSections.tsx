"use client";

import type { ReactNode } from "react";
import type { GameConfig } from "@/lib/game/economy";
import { Input } from "@/components/ui/input";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

type MatchConfigSectionsProps = {
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

function Section({
  id,
  title,
  titleFa,
  hint,
  children,
  accent = "emerald",
}: {
  id?: string;
  title: string;
  titleFa: string;
  hint: string;
  children: ReactNode;
  accent?: "emerald" | "sky" | "amber" | "violet" | "slate";
}) {
  const ring =
    accent === "sky"
      ? "border-sky-200 bg-sky-50/40"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50/40"
        : accent === "violet"
          ? "border-violet-200 bg-violet-50/40"
          : accent === "slate"
            ? "border-slate-200 bg-slate-50/60"
            : "border-emerald-200 bg-emerald-50/40";
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
 * Penalty / Quick rewards + match length.
 */
export function MatchConfigSections({
  draft,
  onFieldChange,
}: MatchConfigSectionsProps) {
  const r = draft.rewards;
  const m = draft.match;
  const perfectWinCoins = r.coinsPerWin + r.perfectBonus;
  const fullMatchXp = r.baseXp * m.questionCount + r.winBonus;
  const fullMatchFans = r.fansPerGoal * m.questionCount + r.fansWinBonus;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-300 bg-linear-to-br from-emerald-50 to-white px-4 py-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
          Match · پنالتی / سریع
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Penalty & Quick rewards
        </h2>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          Soft coins only on a win. XP and fans pay per goal; win / perfect /
          combo stack on top. Losses get 0 coins.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
          <a
            href="#match-coins"
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-white shadow-sm"
          >
            ↓ Coins
          </a>
          <a
            href="#match-xp"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            XP / combo
          </a>
          <a
            href="#match-fans"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Fans
          </a>
          <a
            href="#match-length"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Length
          </a>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Perfect win coins
            </p>
            <p className="font-mono text-lg font-bold text-slate-900">
              {perfectWinCoins}
            </p>
            <p className="text-[10px] text-slate-500">
              win {r.coinsPerWin} + perfect {r.perfectBonus}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Full Penalty XP
            </p>
            <p className="font-mono text-lg font-bold text-slate-900">
              ~{fullMatchXp}
            </p>
            <p className="text-[10px] text-slate-500">
              {m.questionCount}×{r.baseXp} + win {r.winBonus}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Full Penalty fans
            </p>
            <p className="font-mono text-lg font-bold text-slate-900">
              ~{fullMatchFans}
            </p>
            <p className="text-[10px] text-slate-500">
              before combo scaling
            </p>
          </div>
        </div>
      </div>

      <Section
        id="match-coins"
        title="Coins"
        titleFa="سکه"
        hint="Paid on win only. Combo can scale win coins up to max ×."
        accent="emerald"
      >
        <div className="grid gap-1.5 sm:grid-cols-3">
          <NumField
            label="Coins on win"
            tip="Base soft coins for winning Penalty / Quick. Scaled by combo."
            path="rewards.coinsPerWin"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <NumField
            label="Perfect bonus"
            tip="Extra coins when every kick is correct (full clean sheet)."
            path="rewards.perfectBonus"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <NumField
            label="Level-up coins"
            tip="Soft coins per manager level gained after settle. Also used when Survival XP levels up."
            path="rewards.levelUpCoins"
            draft={draft}
            onFieldChange={onFieldChange}
          />
        </div>
      </Section>

      <Section
        id="match-xp"
        title="XP & combo"
        titleFa="امتیاز و کمبو"
        hint="Per-goal XP + flat win bonus. Combo ceiling scales streak rewards."
        accent="sky"
      >
        <div className="grid gap-1.5 sm:grid-cols-3">
          <NumField
            label="XP per goal"
            tip="XP for each correct answer. Multiplied later by combo factor."
            path="rewards.baseXp"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <NumField
            label="Win XP bonus"
            tip="Flat XP only when the match is won (majority goals). Not paid on a loss."
            path="rewards.winBonus"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <NumField
            label="Max combo"
            tip="Ceiling multiplier for XP/coins on a full-match goal streak. 1 = no bonus."
            path="rewards.comboMultiplier"
            draft={draft}
            onFieldChange={onFieldChange}
            min={1}
            step={0.1}
            suffix="×"
          />
        </div>
      </Section>

      <Section
        id="match-fans"
        title="Fans"
        titleFa="هوادار"
        hint="Metagame growth — separate from soft coins."
        accent="violet"
      >
        <div className="grid gap-1.5 sm:grid-cols-2">
          <NumField
            label="Fans per goal"
            tip="Club fans grown for each correct answer."
            path="rewards.fansPerGoal"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <NumField
            label="Fans win bonus"
            tip="Extra fans on a winning match, stacked on per-goal fans."
            path="rewards.fansWinBonus"
            draft={draft}
            onFieldChange={onFieldChange}
          />
        </div>
      </Section>

      <Section
        id="match-length"
        title="Match length"
        titleFa="طول مسابقه"
        hint="How many questions per mode. Longer = more XP / fans surface."
        accent="amber"
      >
        <div className="grid gap-1.5 sm:grid-cols-3">
          <NumField
            label="Penalty kicks"
            tip="Kicks in a full Penalty shootout."
            path="match.questionCount"
            draft={draft}
            onFieldChange={onFieldChange}
            min={1}
          />
          <NumField
            label="Tutorial kicks"
            tip="Shorter FTUE / tutorial match. Keep small for onboarding."
            path="match.tutorialQuestionCount"
            draft={draft}
            onFieldChange={onFieldChange}
            min={1}
          />
          <NumField
            label="Quick questions"
            tip="Rapid-fire Quick Match length (PRD ~5–10)."
            path="match.quickQuestionCount"
            draft={draft}
            onFieldChange={onFieldChange}
            min={1}
          />
        </div>
      </Section>
    </div>
  );
}
