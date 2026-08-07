"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  Heart,
  RotateCcw,
  Save,
  Swords,
  Target,
  Zap,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import {
  DEFAULT_GAME_CONFIG,
  mergeGameConfig,
  type GameConfig,
} from "@/lib/game/economy";
import { updateGameConfig } from "@/actions/admin/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { LiveOpsThemesPanel } from "@/components/admin/LiveOpsThemesPanel";
import { ClubBizConfigSections } from "@/components/admin/ClubBizConfigSections";
import { GotDConfigSections } from "@/components/admin/GotDConfigSections";
import { DuelConfigSections } from "@/components/admin/DuelConfigSections";
import { SurvivalConfigSections } from "@/components/admin/SurvivalConfigSections";
import { MatchConfigSections } from "@/components/admin/MatchConfigSections";
import { AdvancedConfigSections } from "@/components/admin/AdvancedConfigSections";

type EconomyConfigPanelProps = {
  initialConfig: GameConfig;
};

type TabId =
  | "live"
  | "match"
  | "survival"
  | "duel"
  | "gotd"
  | "club"
  | "advanced";

type FieldDef = {
  key: string;
  label: string;
  /** Short always-visible explanation under the label. */
  description: string;
  tip: string;
  min?: number;
  step?: number;
  /** Emphasize on Live Ops tab */
  featured?: boolean;
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

function setPath(obj: GameConfig, path: string, value: number): GameConfig {
  const parts = path.split(".");
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur: unknown = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    const parent = cur as Record<string, unknown>;
    const child = parent[p];
    if (Array.isArray(child)) {
      parent[p] = [...child];
    } else {
      parent[p] = { ...((child as Record<string, unknown>) ?? {}) };
    }
    cur = parent[p];
  }
  const last = parts[parts.length - 1]!;
  if (Array.isArray(cur) && /^\d+$/.test(last)) {
    cur[Number(last)] = value;
  } else {
    (cur as Record<string, unknown>)[last] = value;
  }
  return mergeGameConfig(clone);
}

const TABS: {
  id: TabId;
  label: string;
  icon: LucideIcon;
  blurb: string;
}[] = [
  {
    id: "live",
    label: "Live Ops",
    icon: Zap,
    blurb: "Theme week + event coin levers",
  },
  {
    id: "match",
    label: "Match",
    icon: Target,
    blurb: "Coins · XP · fans · match length",
  },
  {
    id: "survival",
    label: "Survival",
    icon: Heart,
    blurb: "Rates · clear-bank · lives / weekly XP",
  },
  {
    id: "duel",
    label: "Duel",
    icon: Swords,
    blurb: "Rewards · structure · AFK · Memory / Tiki",
  },
  {
    id: "gotd",
    label: "GotD",
    icon: CalendarDays,
    blurb: "Daily modes · Star Path · streak / perfect bonuses",
  },
  {
    id: "club",
    label: "Club Biz",
    icon: Building2,
    blurb: "Managers · Safe · Bank · facilities (Club Funds only)",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Settings2,
    blurb: "Helpers & shop sinks",
  },
];

const LIVE_FIELDS: FieldDef[] = [
  {
    key: "survival.coinsPerCorrect",
    label: "Survival coins",
    description: "Coins per correct in Survival. Main inflation lever.",
    tip: "Use the 2× weekend control above for events.",
    featured: true,
  },
  {
    key: "survival.xpPerCorrect",
    label: "Survival XP",
    description: "Lifetime XP per correct in Survival.",
    tip: "Affects manager level, not weekly league directly.",
    featured: true,
  },
  {
    key: "rewards.coinsPerWin",
    label: "Match win coins",
    description: "Base coins for winning Penalty / Quick.",
    tip: "Losses get 0; combo may scale wins.",
    featured: true,
  },
  {
    key: "rewards.baseXp",
    label: "Match XP / goal",
    description: "XP per correct kick before win bonus & combo.",
    tip: "Shown on Match Day as approximate XP.",
    featured: true,
  },
  {
    key: "duel.winWeeklyXp",
    label: "Duel weekly XP",
    description: "Weekly leaderboard XP for a Draft Duel win.",
    tip: "Does not grant soft coins.",
  },
  {
    key: "gotd.mysteryWinCoins",
    label: "Mystery coins",
    description: "Base coins on Mysterious Player solve.",
    tip: "Odd Tehran days · streak & perfect bonuses apply.",
    featured: true,
  },
  {
    key: "gotd.gridWinCoins",
    label: "Grid coins",
    description: "Base coins on Football Grid solve.",
    tip: "Even Tehran days · streak & perfect bonuses apply.",
    featured: true,
  },
  {
    key: "survival.staminaCost",
    label: "Survival stamina",
    description: "Energy deducted when a Survival run finishes.",
    tip: "Blocked if club has less than this.",
  },
  {
    key: "businessEconomy.seedFunds",
    label: "Club Funds seed",
    description: "One-time Funds when business layer unlocks.",
    tip: "Club Funds only — not match coins.",
    featured: true,
  },
  {
    key: "businessEconomy.firstWinBoostBonus",
    label: "First-win income +",
    description: "Bonus fraction on facility income after first win of day.",
    tip: "0.2 = +20% for firstWinBoostMs.",
    featured: true,
    min: 0,
    step: 0.05,
  },
];

function fieldsForTab(tab: TabId): FieldDef[] {
  switch (tab) {
    case "live":
      return LIVE_FIELDS;
    case "match":
    case "survival":
    case "duel":
    case "gotd":
    case "club":
    case "advanced":
      return []; // Dedicated *ConfigSections components
  }
}

export function EconomyConfigPanel({ initialConfig }: EconomyConfigPanelProps) {
  const [draft, setDraft] = useState<GameConfig>(() =>
    mergeGameConfig(initialConfig),
  );
  const [baseline, setBaseline] = useState<GameConfig>(() =>
    mergeGameConfig(initialConfig),
  );
  const [tab, setTab] = useState<TabId>("live");
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline),
    [draft, baseline],
  );

  const activeTab = TABS.find((t) => t.id === tab)!;
  /** Live Ops keeps only featured rate levers; full lists live on other tabs. */
  const fields =
    tab === "live"
      ? LIVE_FIELDS.filter((f) => f.featured)
      : fieldsForTab(tab);

  const survivalMult = useMemo(() => {
    const base = DEFAULT_GAME_CONFIG.survival.coinsPerCorrect;
    const cur = draft.survival.coinsPerCorrect;
    if (base > 0 && cur === Math.round(base * 0.5)) return 0.5;
    if (base > 0 && cur === Math.round(base * 2)) return 2;
    if (cur === base) return 1;
    return null;
  }, [draft.survival.coinsPerCorrect]);

  function onFieldChange(path: string, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setDraft((prev) => setPath(prev, path, n));
  }

  function resetDefaults() {
    setDraft(mergeGameConfig(DEFAULT_GAME_CONFIG));
    toast.message("Reset to defaults — hit Save to go live.");
  }

  function quickSurvivalCoins(multiplier: number) {
    const base = DEFAULT_GAME_CONFIG.survival.coinsPerCorrect;
    const next = Math.max(0, Math.round(base * multiplier));
    setDraft((prev) => setPath(prev, "survival.coinsPerCorrect", next));
    toast.message(
      multiplier === 1
        ? `Survival coins → default (${next})`
        : `Survival coins → ${multiplier}× default (${next})`,
    );
  }

  function save() {
    startTransition(async () => {
      const normalized = mergeGameConfig(draft);
      const res = await updateGameConfig(normalized);
      if (!res.ok) {
        toast.error(res.error || "Could not save.");
        return;
      }
      setDraft(res.config);
      setBaseline(res.config);
      toast.success("Saved — live for all players.");
    });
  }

  return (
    <div className="space-y-3 pb-24">
      <section
        className={[
          "sticky top-2 z-10 overflow-hidden rounded-xl border bg-white shadow-sm",
          dirty ? "border-amber-300" : "border-slate-200/90",
        ].join(" ")}
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Snap label="Surv" value={draft.survival.coinsPerCorrect} />
            <Snap label="Match" value={draft.rewards.coinsPerWin} />
            <Snap label="Mystery" value={draft.gotd.mysteryWinCoins} />
            <Snap label="Grid" value={draft.gotd.gridWinCoins} />
            <Snap label="Funds" value={draft.businessEconomy.seedFunds} />
          </div>
          {dirty ? (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-950 ring-1 ring-amber-200">
              Unsaved
            </span>
          ) : (
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-950 ring-1 ring-emerald-200">
              Live
            </span>
          )}
        </header>
        <div
          className="flex flex-wrap gap-1 p-2"
          role="tablist"
          aria-label="Game Config sections"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            const club = id === "club";
            const gotd = id === "gotd";
            const duel = id === "duel";
            const survival = id === "survival";
            const match = id === "match";
            const advanced = id === "advanced";
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={[
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors",
                  active && club
                    ? "bg-indigo-600 text-white shadow-sm"
                    : active && gotd
                      ? "bg-violet-600 text-white shadow-sm"
                      : active && duel
                        ? "bg-rose-600 text-white shadow-sm"
                        : active && survival
                          ? "bg-amber-600 text-white shadow-sm"
                          : active && match
                            ? "bg-emerald-600 text-white shadow-sm"
                            : active && advanced
                              ? "bg-slate-900 text-white shadow-sm"
                              : active
                                ? "bg-slate-900 text-white shadow-sm"
                                : club
                                  ? "bg-indigo-50 text-indigo-950 ring-1 ring-indigo-200 hover:bg-indigo-100"
                                  : gotd
                                    ? "bg-violet-50 text-violet-950 ring-1 ring-violet-200 hover:bg-violet-100"
                                    : duel
                                      ? "bg-rose-50 text-rose-950 ring-1 ring-rose-200 hover:bg-rose-100"
                                      : survival
                                        ? "bg-amber-50 text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100"
                                        : match
                                          ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                          : advanced
                                            ? "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                                            : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          {activeTab.label}
        </p>
        <p className="text-[11px] font-medium text-slate-700">
          {activeTab.blurb}
        </p>
      </div>

      {tab === "live" ? (
        <>
          <LiveOpsThemesPanel
            config={draft}
            onChange={(next) => setDraft(mergeGameConfig(next))}
          />

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-950">
                Survival coins event
              </p>
              <span className="font-mono text-xs font-bold text-amber-950">
                {draft.survival.coinsPerCorrect}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-white p-1 ring-1 ring-amber-200">
              {(
                [
                  { m: 0.5, label: "½×" },
                  { m: 1, label: "Default" },
                  { m: 2, label: "2× weekend" },
                ] as const
              ).map(({ m, label }) => {
                const on = survivalMult === m;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => quickSurvivalCoins(m)}
                    className={[
                      "rounded-md px-2 py-2 text-xs font-bold transition",
                      on
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-amber-950 hover:bg-amber-100",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {tab === "club" ? (
        <ClubBizConfigSections
          draft={draft}
          setDraft={setDraft}
          onFieldChange={onFieldChange}
        />
      ) : tab === "gotd" ? (
        <GotDConfigSections draft={draft} onFieldChange={onFieldChange} />
      ) : tab === "duel" ? (
        <DuelConfigSections
          draft={draft}
          setDraft={setDraft}
          onFieldChange={onFieldChange}
        />
      ) : tab === "survival" ? (
        <SurvivalConfigSections
          draft={draft}
          onFieldChange={onFieldChange}
          onQuickCoins={quickSurvivalCoins}
          survivalMult={survivalMult}
        />
      ) : tab === "match" ? (
        <MatchConfigSections draft={draft} onFieldChange={onFieldChange} />
      ) : tab === "advanced" ? (
        <AdvancedConfigSections draft={draft} onFieldChange={onFieldChange} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.key}
              className="flex flex-col gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm transition focus-within:ring-2 focus-within:ring-emerald-300/50"
            >
              <span className="flex items-center justify-between gap-1 text-xs font-semibold text-slate-900">
                <span className="min-w-0 truncate">{field.label}</span>
                <AdminHelpTip
                  text={`${field.description} ${field.tip}`.trim()}
                />
              </span>
              <Input
                type="number"
                min={field.min ?? 0}
                step={field.step ?? 1}
                value={getPath(draft, field.key)}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                className="h-10 font-mono text-sm font-semibold tabular-nums"
              />
            </label>
          ))}
        </div>
      )}

      <div
        className={[
          "fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-2.5 backdrop-blur sm:start-60",
          dirty ? "border-amber-300" : "border-slate-200",
        ].join(" ")}
      >
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-800">
            {dirty ? "Unsaved — Save to go live" : "Live for all players"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={resetDefaults}
              className="h-8 gap-1.5 border-slate-200 bg-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Defaults
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !dirty}
              onClick={save}
              className={[
                "h-8 min-w-24 gap-1.5",
                dirty
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "",
              ].join(" ")}
            >
              <Save className="h-3.5 w-3.5" />
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Snap({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-[11px] ring-1 ring-slate-200">
      <span className="font-semibold text-slate-700">{label}</span>
      <span className="font-mono text-xs font-bold tabular-nums text-slate-900">
        {value}
      </span>
    </span>
  );
}
