"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
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
import { Badge } from "@/components/ui/badge";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { LiveOpsThemesPanel } from "@/components/admin/LiveOpsThemesPanel";

type EconomyConfigPanelProps = {
  initialConfig: GameConfig;
};

type TabId = "live" | "match" | "survival" | "duel" | "gotd" | "advanced";

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
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "number" && Number.isFinite(cur) ? cur : 0;
}

function setPath(obj: GameConfig, path: string, value: number): GameConfig {
  const parts = path.split(".");
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    cur[p] = { ...(cur[p] as Record<string, unknown>) };
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
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
    blurb: "Penalty & Quick rewards",
  },
  {
    id: "survival",
    label: "Survival",
    icon: Heart,
    blurb: "Per-correct rates & lives",
  },
  {
    id: "duel",
    label: "Duel",
    icon: Swords,
    blurb: "Pacing, timeout, Memory",
  },
  {
    id: "gotd",
    label: "GotD",
    icon: CalendarDays,
    blurb: "Mystery / Grid payouts",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Settings2,
    blurb: "Helpers, shop sinks, match length",
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
];

const MATCH_FIELDS: FieldDef[] = [
  {
    key: "rewards.baseXp",
    label: "XP per goal",
    description: "XP for each correct answer in Penalty / Quick.",
    tip: "Multiplied later by combo factor.",
  },
  {
    key: "rewards.winBonus",
    label: "Win XP bonus",
    description: "Flat XP added only when the match is won (majority goals).",
    tip: "Not paid on a loss.",
  },
  {
    key: "rewards.coinsPerWin",
    label: "Coins on win",
    description: "Base soft coins for winning Penalty / Quick.",
    tip: "Scaled by combo multiplier.",
  },
  {
    key: "rewards.perfectBonus",
    label: "Perfect coins",
    description: "Extra coins when every kick in the match is correct.",
    tip: "Requires a full clean sheet of goals.",
  },
  {
    key: "rewards.comboMultiplier",
    label: "Max combo ×",
    description:
      "Ceiling multiplier for XP/coins on a full-match goal streak (scales with streak length).",
    tip: "Minimum 1 = no bonus.",
    min: 1,
    step: 0.1,
  },
  {
    key: "rewards.fansPerGoal",
    label: "Fans per goal",
    description: "Club fans grown for each correct answer.",
    tip: "Metagame growth, separate from coins.",
  },
  {
    key: "rewards.fansWinBonus",
    label: "Fans win bonus",
    description: "Extra fans granted on a winning match.",
    tip: "Stacked on top of fans per goal.",
  },
  {
    key: "rewards.levelUpCoins",
    label: "Level-up coins",
    description:
      "Soft coins paid for each manager level gained after a match settles.",
    tip: "Also used when Survival XP levels the player up.",
  },
];

const SURVIVAL_FIELDS: FieldDef[] = [
  {
    key: "survival.coinsPerCorrect",
    label: "Coins / correct",
    description: "Soft coins × number of verified correct answers in the run.",
    tip: "Primary Survival earn rate.",
  },
  {
    key: "survival.xpPerCorrect",
    label: "XP / correct",
    description: "Lifetime XP × correct answers (feeds manager level).",
    tip: "Separate from weekly league XP.",
  },
  {
    key: "survival.fansPerCorrect",
    label: "Fans / correct",
    description: "Club fans × correct answers in Survival.",
    tip: "Metagame growth.",
  },
  {
    key: "survival.clearedCoinBonus",
    label: "Clear-bank coins",
    description:
      "Flat coin bonus if the player exhausts the category question bank (cleared).",
    tip: "Rare — only when the bank runs out before lives.",
  },
  {
    key: "survival.clearedXpBonus",
    label: "Clear-bank XP",
    description: "Flat XP bonus when the category bank is cleared.",
    tip: "Paired with clear-bank coins.",
  },
  {
    key: "survival.weeklyXpDivisor",
    label: "Weekly XP ÷",
    description:
      "Leaderboard XP = max(1, floor(score ÷ this)). Higher = slower weekly climb.",
    tip: "Must be at least 1.",
    min: 1,
  },
  {
    key: "survival.staminaCost",
    label: "Stamina cost",
    description: "Stamina removed when the run settles successfully.",
    tip: "Same cost for classic Survival and premium challenges.",
  },
  {
    key: "survival.lives",
    label: "Lives",
    description: "Hearts at kickoff. Run ends when misses reach this count.",
    tip: "Server settle is authoritative; active clients may need a refresh.",
    min: 1,
  },
];

const DUEL_FIELDS: FieldDef[] = [
  {
    key: "duel.winWeeklyXp",
    label: "Win weekly XP",
    description:
      "Weekly leaderboard points for the duel winner (including bot / expire walkovers).",
    tip: "Keep modest vs Survival grind.",
  },
  {
    key: "duel.staminaCost",
    label: "Stamina cost",
    description: "Stamina spent when opening / starting a Draft Duel.",
    tip: "Charged at duel start.",
  },
  {
    key: "duel.questionsPerAttack",
    label: "Questions / attack",
    description: "How many questions the attacker answers after picking a category.",
    tip: "Two rounds × this ≈ total questions.",
    min: 1,
  },
  {
    key: "duel.draftChoices",
    label: "Draft choices",
    description: "Number of categories offered in the draft picker.",
    tip: "Minimum 2.",
    min: 2,
  },
  {
    key: "duel.turnHours",
    label: "Turn hours",
    description:
      "Hours before timeout handling (forfeit or Shadow Bot).",
    tip: "Lazy-evaluated on inbox fetch + cron.",
    min: 1,
  },
  {
    key: "duel.matchmakingMs",
    label: "Matchmaking (ms)",
    description:
      "Milliseconds to wait for a human opponent before assigning a bot.",
    tip: "Minimum 5000 ms.",
    min: 5000,
  },
  {
    key: "duel.memoryPairs",
    label: "Memory pairs",
    description: "Pairs on the shared Memory board (round 2).",
    tip: "v1 locked 2–8; default 8 → 4×4.",
    min: 2,
  },
  {
    key: "duel.memoryTurnMs",
    label: "Memory turn (ms)",
    description: "Server clock for each Memory half.",
    tip: "Default 20000.",
    min: 5000,
  },
  {
    key: "duel.memoryRevealMs",
    label: "Memory reveal (ms)",
    description: "Client flip-reveal duration hint.",
    tip: "UX only; server may ignore.",
    min: 500,
  },
];

const GOTD_FIELDS: FieldDef[] = [
  {
    key: "gotd.mysteryWinCoins",
    label: "Mystery win coins (سکه برد بازیکن مرموز)",
    description:
      "Base soft coins granted when the player solves Mysterious Player (odd Tehran days).",
    tip: "Streak multiplies this base; perfect clear is a separate flat bonus.",
    featured: true,
  },
  {
    key: "gotd.mysteryWinXp",
    label: "Mystery win XP (XP برد بازیکن مرموز)",
    description: "Lifetime XP granted on a Mystery Player solve.",
    tip: "Not scaled by streak — flat XP grant.",
  },
  {
    key: "gotd.gridWinCoins",
    label: "Grid win coins (سکه برد جدول فوتبال)",
    description:
      "Base soft coins granted when the player solves Football Grid (even Tehran days).",
    tip: "Streak multiplies this base; perfect clear is a separate flat bonus.",
    featured: true,
  },
  {
    key: "gotd.gridWinXp",
    label: "Grid win XP (XP برد جدول فوتبال)",
    description: "Lifetime XP granted on a Football Grid solve.",
    tip: "Not scaled by streak — flat XP grant.",
  },
  {
    key: "gotd.memoryWinCoins",
    label: "Memory GotD win coins",
    description: "Base soft coins when Memory is today's GotD and solved.",
    tip: "Only paid when liveModes.memory.gotd is on.",
    featured: true,
  },
  {
    key: "gotd.memoryWinXp",
    label: "Memory GotD win XP",
    description: "Lifetime XP on a Memory GotD solve.",
    tip: "Flat XP grant.",
  },
  {
    key: "gotd.streakMultiplierPerDay",
    label: "Streak multiplier / day (ضریب استریک روزانه)",
    description:
      "Extra coin fraction of the base win coins per consecutive GotD streak day (e.g. 0.1 → +10% per day).",
    tip: "Clamped 0–1 by mergeGameConfig. FAILED resets streak to 0.",
    min: 0,
    step: 0.1,
  },
  {
    key: "gotd.perfectClearBonusCoins",
    label: "Perfect clear coins (پاداش سکه بدون اشتباه)",
    description:
      "Flat coin bonus for a perfect clear — Mystery in 1 guess, or Grid with 0 mistakes.",
    tip: "Added on top of base + streak-scaled coins.",
  },
];

const ADVANCED_FIELDS: FieldDef[] = [
  {
    key: "helpers.hint",
    label: "Hint cost",
    description: "Coins to remove one wrong option during a quiz.",
    tip: "In-match sink.",
  },
  {
    key: "helpers.extraTime",
    label: "Injury Time cost",
    description: "Coins to add fuse time on the current question.",
    tip: "Paired with Injury Time (ms) below.",
  },
  {
    key: "helpers.fifty",
    label: "50/50 cost",
    description: "Coins to remove two wrong options.",
    tip: "Stronger helper than Hint.",
  },
  {
    key: "helpers.reroll",
    label: "Reroll cost",
    description: "Coins to swap the current question for a new one.",
    tip: "One of the pricier sinks.",
  },
  {
    key: "helpers.extraTimeMs",
    label: "Injury Time (ms)",
    description: "Milliseconds added to the fuse when Injury Time is bought.",
    tip: "Minimum 1000 ms.",
    min: 1000,
  },
  {
    key: "costs.staminaRefill",
    label: "Stamina refill",
    description: "Coins to refill club stamina to full from the shop / hub.",
    tip: "Major soft-coin sink.",
  },
  {
    key: "costs.boosterFiftyFifty",
    label: "Booster 50/50",
    description: "Shop price for a fifty-fifty inventory booster.",
    tip: "Inventory item, not the live helper.",
  },
  {
    key: "costs.boosterFreezeTimer",
    label: "Booster freeze",
    description: "Shop price for the freeze-timer booster.",
    tip: "Inventory item.",
  },
  {
    key: "match.questionCount",
    label: "Penalty kicks",
    description: "Number of kicks in a full Penalty shootout.",
    tip: "Changes match length and reward surface area.",
    min: 1,
  },
  {
    key: "match.tutorialQuestionCount",
    label: "Tutorial kicks",
    description: "Shorter FTUE / tutorial match length.",
    tip: "Keep small for onboarding.",
    min: 1,
  },
  {
    key: "match.quickQuestionCount",
    label: "Quick questions",
    description: "Question count in rapid-fire Quick Match.",
    tip: "Higher = longer sessions and more XP surface.",
    min: 1,
  },
];

function fieldsForTab(tab: TabId): FieldDef[] {
  switch (tab) {
    case "live":
      return LIVE_FIELDS;
    case "match":
      return MATCH_FIELDS;
    case "survival":
      return SURVIVAL_FIELDS;
    case "duel":
      return DUEL_FIELDS;
    case "gotd":
      return GOTD_FIELDS;
    case "advanced":
      return ADVANCED_FIELDS;
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
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Snap label="Surv" value={draft.survival.coinsPerCorrect} />
          <Snap label="Match" value={draft.rewards.coinsPerWin} />
          <Snap label="Mystery" value={draft.gotd.mysteryWinCoins} />
          <Snap label="Grid" value={draft.gotd.gridWinCoins} />
        </div>
        {dirty ? (
          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
            Unsaved
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
            Live
          </Badge>
        )}
      </div>

      <div
        className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 [scrollbar-width:none]"
        role="tablist"
        aria-label="Game Config sections"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={[
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">{activeTab.blurb}</p>

      {tab === "live" ? (
        <>
          <LiveOpsThemesPanel
            config={draft}
            onChange={(next) => setDraft(mergeGameConfig(next))}
          />

          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
                Survival coins event
              </p>
              <span className="font-mono text-xs font-bold text-amber-950">
                {draft.survival.coinsPerCorrect}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/80 p-1 ring-1 ring-amber-100">
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
        </>
      ) : null}

      {tab === "duel" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/40 px-3 py-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-800">
            AFK timeout
            <AdminHelpTip text="Past turnHours: Bot fill answers, or forfeit the match." />
          </span>
          <select
            className="flex h-10 min-w-[12rem] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            value={draft.duel.timeoutAction}
            onChange={(e) => {
              const v = e.target.value;
              if (v !== "AUTO_FORFEIT" && v !== "SHADOW_BOT") return;
              setDraft((prev) => ({
                ...prev,
                duel: { ...prev.duel, timeoutAction: v },
              }));
            }}
          >
            <option value="SHADOW_BOT">Bot fills turn</option>
            <option value="AUTO_FORFEIT">Auto forfeit</option>
          </select>
        </div>
      ) : null}

      <div
        className={[
          "grid gap-2.5",
          tab === "live" || tab === "survival" || tab === "gotd"
            ? "sm:grid-cols-2"
            : "sm:grid-cols-2 lg:grid-cols-3",
        ].join(" ")}
      >
        {fields.map((field) => (
          <label
            key={field.key}
            className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition focus-within:ring-2 focus-within:ring-emerald-300/50"
          >
            <span className="flex items-center justify-between gap-1 text-xs font-semibold text-slate-800">
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur sm:start-60">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {dirty ? "Unsaved — Save to go live" : "Live for all players"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={resetDefaults}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Defaults
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !dirty}
              onClick={save}
              className="min-w-24 gap-1.5"
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] shadow-sm">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="font-mono text-xs font-bold tabular-nums text-slate-900">
        {value}
      </span>
    </span>
  );
}
