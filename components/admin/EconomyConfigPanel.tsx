"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { LiveOpsThemesPanel } from "@/components/admin/LiveOpsThemesPanel";

type EconomyConfigPanelProps = {
  initialConfig: GameConfig;
};

type TabId = "live" | "match" | "survival" | "duel" | "advanced";

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
  /** Longer always-visible guide for admins. */
  guide: string[];
}[] = [
  {
    id: "live",
    label: "Live Ops",
    icon: Zap,
    blurb: "Theme weeks + day-to-day levers for events and inflation.",
    guide: [
      "Theme week biases IMAGE / CAREER_PATH draws in Survival, Match, and Duel — not a new Play mode.",
      "Use coin quick actions for weekend boosts or emergency nerfs.",
      "After any change (theme or rates), press Save once — one JSON payload for everything.",
    ],
  },
  {
    id: "match",
    label: "Match",
    icon: Target,
    blurb: "Penalty & Quick Match win/loss rewards.",
    guide: [
      "Paid when a solo Penalty or Quick Match settles (not Survival).",
      "Win = more than half of kicks correct. Perfect = every kick correct.",
      "Combo multiplier scales XP and coins up when the player chains goals.",
    ],
  },
  {
    id: "survival",
    label: "Survival",
    icon: Heart,
    blurb: "Endless 3-lives runs and premium challenge economy.",
    guide: [
      "Payout = (correct answers × rates) + clear-bank bonus if the question bank empties.",
      "Stamina is charged on settle (end of run), not at kickoff.",
      "Weekly XP for the leaderboard uses score ÷ divisor (minimum 1 XP).",
    ],
  },
  {
    id: "duel",
    label: "Duel",
    icon: Swords,
    blurb: "Async Draft Duel pacing and weekly league points.",
    guide: [
      "Win weekly XP goes to the leaderboard — keep it small vs Survival grind.",
      "Turn hours + timeout action: AUTO_FORFEIT or SHADOW_BOT when a human AFKs.",
      "Matchmaking ms is how long we wait for a human before assigning a bot.",
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Settings2,
    blurb: "Coin sinks, in-match helpers, and match length.",
    guide: [
      "Helpers remove coins during a quiz — higher prices slow inflation.",
      "Shop boosters / stamina refill are sinks when players buy with soft coins.",
      "Match size changes how long Penalty / Quick / Tutorial feel — change carefully.",
    ],
  },
];

const LIVE_FIELDS: FieldDef[] = [
  {
    key: "survival.coinsPerCorrect",
    label: "Survival coins / correct",
    description:
      "Soft coins granted for each correct answer in Survival. Main inflation lever — use 2× for weekend events.",
    tip: "Also used by Match Day preview chips.",
    featured: true,
  },
  {
    key: "survival.xpPerCorrect",
    label: "Survival XP / correct",
    description:
      "Lifetime XP per correct in Survival. Affects manager level speed, not the weekly league directly.",
    tip: "Weekly league XP uses the Survival weekly divisor instead.",
    featured: true,
  },
  {
    key: "rewards.coinsPerWin",
    label: "Match coins on win",
    description:
      "Base coins when the player wins a Penalty or Quick Match (goal majority).",
    tip: "Losses get 0 from this field; combo may still scale wins.",
    featured: true,
  },
  {
    key: "rewards.baseXp",
    label: "Match XP per goal",
    description:
      "XP for each correct kick in Penalty / Quick before win bonus and combo.",
    tip: "Shown on Match Day as approximate XP.",
    featured: true,
  },
  {
    key: "duel.winWeeklyXp",
    label: "Duel weekly XP",
    description:
      "Points added to the weekly leaderboard when a player wins a Draft Duel.",
    tip: "Does not grant soft coins by itself.",
  },
  {
    key: "survival.staminaCost",
    label: "Survival stamina",
    description:
      "Energy deducted when a Survival (or premium challenge) run finishes.",
    tip: "Entry is blocked if the club has less than this amount.",
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
  const fields = fieldsForTab(tab);

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
    <div className="space-y-5 pb-24">
      {/* Snapshot strip */}
      <div className="flex flex-wrap gap-2">
        <Snap
          label="Survival 🪙"
          value={draft.survival.coinsPerCorrect}
          hint="/correct"
        />
        <Snap
          label="Survival XP"
          value={draft.survival.xpPerCorrect}
          hint="/correct"
        />
        <Snap
          label="Match win"
          value={draft.rewards.coinsPerWin}
          hint="coins"
        />
        <Snap
          label="Duel week"
          value={draft.duel.winWeeklyXp}
          hint="XP"
        />
        {dirty ? (
          <Badge className="self-center bg-amber-100 text-amber-900 hover:bg-amber-100">
            Unsaved
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="self-center bg-emerald-50 text-emerald-800"
          >
            Live
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 [scrollbar-width:none]"
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
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          {activeTab.label}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{activeTab.blurb}</p>
        <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {activeTab.guide.map((line) => (
            <li
              key={line}
              className="flex gap-2 text-xs leading-relaxed text-slate-500"
            >
              <span
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400"
                aria-hidden
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Live Ops: theme week (primary) + coin quick actions */}
      {tab === "live" ? (
        <>
          <LiveOpsThemesPanel
            config={draft}
            onChange={(next) => setDraft(mergeGameConfig(next))}
          />
          <Card className="border-amber-200/80 bg-amber-50/40">
            <CardContent className="space-y-3 pt-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">
                  Quick Survival coins
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-950/70">
                  Instantly sets <strong>Survival coins / correct</strong> from
                  the system default (5). Use <strong>2× weekend</strong> for
                  events, <strong>½×</strong> if wallets are bloated. Still
                  press <strong>Save</strong> to go live.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-white"
                  onClick={() => quickSurvivalCoins(0.5)}
                >
                  ½×
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-white"
                  onClick={() => quickSurvivalCoins(1)}
                >
                  Default
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-300 bg-white font-semibold text-amber-950"
                  onClick={() => quickSurvivalCoins(2)}
                >
                  2× weekend
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === "duel" ? (
        <Card className="border-violet-200/80 bg-violet-50/40">
          <CardContent className="space-y-3 pt-4">
            <div>
              <p className="flex items-center gap-1 text-sm font-semibold text-slate-800">
                Turn timeout action
                <AdminHelpTip text="When a human misses their turnHours deadline. Shadow Bot fabricates their answers so the active player can finish; the AFK only sees a timeout loss." />
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600" dir="rtl">
                انتخاب رفتار سیستم هنگام پایان زمان حریف: فورفیت مستقیم یا
                جایگزینی پنهان با بات (Shadow Bot)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                AUTO_FORFEIT ends immediately. SHADOW_BOT keeps the illusion for
                the waiting player.
              </p>
            </div>
            <select
              className="flex h-10 w-full max-w-md rounded-md border border-slate-200 bg-white px-3 text-sm"
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
              <option value="SHADOW_BOT">
                SHADOW_BOT — جایگزینی پنهان با بات
              </option>
              <option value="AUTO_FORFEIT">
                AUTO_FORFEIT — فورفیت مستقیم
              </option>
            </select>
          </CardContent>
        </Card>
      ) : null}

      {/* Fields */}
      <div
        className={[
          "grid gap-3",
          tab === "live" || tab === "survival"
            ? "sm:grid-cols-2"
            : "sm:grid-cols-2 lg:grid-cols-3",
        ].join(" ")}
      >
        {fields.map((field) => (
          <label
            key={field.key}
            className={[
              "flex flex-col gap-2 rounded-xl border bg-white p-3.5 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-slate-300",
              field.featured
                ? "border-slate-300 sm:col-span-1"
                : "border-slate-200",
            ].join(" ")}
          >
            <span className="flex items-center gap-1 text-sm font-semibold text-slate-800">
              {field.label}
              <AdminHelpTip text={field.tip} />
            </span>
            <p className="text-[11px] leading-snug text-slate-500">
              {field.description}
            </p>
            <Input
              type="number"
              min={field.min ?? 0}
              step={field.step ?? 1}
              value={getPath(draft, field.key)}
              onChange={(e) => onFieldChange(field.key, e.target.value)}
              className={[
                "h-11 font-mono text-base tabular-nums",
                field.featured ? "font-semibold" : "",
              ].join(" ")}
            />
          </label>
        ))}
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:start-60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {dirty
              ? "You have unsaved changes. Save to push live."
              : "All changes are live. No redeploy needed."}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={resetDefaults}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Defaults
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !dirty}
              onClick={save}
              className="min-w-28"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Snap({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="font-mono text-sm font-bold tabular-nums text-slate-900">
        {value}
      </span>
      <span className="text-slate-400">{hint}</span>
    </div>
  );
}
