"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";
import {
  DEFAULT_GAME_CONFIG,
  mergeGameConfig,
  type GameConfig,
} from "@/lib/game/economy";
import { updateGameConfig } from "@/actions/admin/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminHelpTip, FieldLabel } from "@/components/admin/AdminHelpTip";

type EconomyConfigPanelProps = {
  initialConfig: GameConfig;
};

type FieldDef = {
  key: string;
  label: string;
  tip: string;
  min?: number;
  step?: number;
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

const SECTIONS: {
  title: string;
  tip: string;
  fields: FieldDef[];
}[] = [
  {
    title: "Match Rewards",
    tip: "Penalty / Quick Match payouts via computeMatchRewards.",
    fields: [
      {
        key: "rewards.baseXp",
        label: "XP per goal",
        tip: "XP granted for each correct answer.",
      },
      {
        key: "rewards.winBonus",
        label: "Win XP bonus",
        tip: "Flat XP when goals > half of kicks.",
      },
      {
        key: "rewards.coinsPerWin",
        label: "Coins on win",
        tip: "Base coins for a winning match.",
      },
      {
        key: "rewards.perfectBonus",
        label: "Perfect coins",
        tip: "Extra coins when every kick is a goal.",
      },
      {
        key: "rewards.comboMultiplier",
        label: "Max combo multiplier",
        tip: "Scales XP/coins up to this factor on a full-match streak. Min 1.",
        min: 1,
        step: 0.1,
      },
      {
        key: "rewards.fansPerGoal",
        label: "Fans per goal",
        tip: "Fans grown per correct answer.",
      },
      {
        key: "rewards.fansWinBonus",
        label: "Fans win bonus",
        tip: "Extra fans on a win.",
      },
      {
        key: "rewards.levelUpCoins",
        label: "Level-up coins",
        tip: "Coins per manager level gained after a match.",
      },
    ],
  },
  {
    title: "Survival Rewards",
    tip: "Live-Ops tunable — change without redeploy (e.g. weekend 2× coins).",
    fields: [
      {
        key: "survival.coinsPerCorrect",
        label: "Coins per correct",
        tip: "Soft coins × verified correct answers.",
      },
      {
        key: "survival.xpPerCorrect",
        label: "XP per correct",
        tip: "Lifetime XP × verified correct answers.",
      },
      {
        key: "survival.fansPerCorrect",
        label: "Fans per correct",
        tip: "Fans × verified correct answers.",
      },
      {
        key: "survival.clearedCoinBonus",
        label: "Clear-bank coin bonus",
        tip: "Flat coins when the category bank is exhausted (cleared).",
      },
      {
        key: "survival.clearedXpBonus",
        label: "Clear-bank XP bonus",
        tip: "Flat XP when the category bank is exhausted.",
      },
      {
        key: "survival.weeklyXpDivisor",
        label: "Weekly XP divisor",
        tip: "weeklyXp = max(1, floor(score / divisor)). Must be ≥ 1.",
        min: 1,
      },
      {
        key: "survival.staminaCost",
        label: "Stamina cost",
        tip: "Stamina spent on Survival settle.",
      },
      {
        key: "survival.lives",
        label: "Lives",
        tip: "Hearts at kickoff. Must be ≥ 1. Client defaults until next deploy if changed mid-session.",
        min: 1,
      },
    ],
  },
  {
    title: "Duel",
    tip: "Draft Duel pacing and weekly league XP.",
    fields: [
      {
        key: "duel.winWeeklyXp",
        label: "Win weekly XP",
        tip: "Leaderboard weekly XP granted to the duel winner.",
      },
      {
        key: "duel.staminaCost",
        label: "Stamina cost",
        tip: "Stamina to open a duel.",
      },
      {
        key: "duel.questionsPerAttack",
        label: "Questions per attack",
        tip: "Questions after picking a category.",
        min: 1,
      },
      {
        key: "duel.draftChoices",
        label: "Draft choices",
        tip: "Categories offered in the picker.",
        min: 2,
      },
      {
        key: "duel.turnHours",
        label: "Turn hours",
        tip: "Hours before the turn expires.",
        min: 1,
      },
      {
        key: "duel.matchmakingMs",
        label: "Matchmaking ms",
        tip: "Human wait before bot fallback (min 5000).",
        min: 5000,
      },
    ],
  },
  {
    title: "Helpers & sinks",
    tip: "In-match coin spends and shop-style sinks.",
    fields: [
      {
        key: "helpers.hint",
        label: "Hint cost",
        tip: "Coins for pundit hint (remove one wrong).",
      },
      {
        key: "helpers.extraTime",
        label: "Injury Time cost",
        tip: "Coins to add fuse time.",
      },
      {
        key: "helpers.fifty",
        label: "50/50 cost",
        tip: "Coins to remove two wrong options.",
      },
      {
        key: "helpers.reroll",
        label: "Reroll cost",
        tip: "Coins to swap the question.",
      },
      {
        key: "helpers.extraTimeMs",
        label: "Injury Time ms",
        tip: "Milliseconds added by Injury Time.",
        min: 1000,
      },
      {
        key: "costs.staminaRefill",
        label: "Stamina refill",
        tip: "Coins to refill stamina to full.",
      },
      {
        key: "costs.boosterFiftyFifty",
        label: "Booster 50/50",
        tip: "Shop / inventory fifty-fifty price.",
      },
      {
        key: "costs.boosterFreezeTimer",
        label: "Booster freeze",
        tip: "Shop / inventory freeze-timer price.",
      },
    ],
  },
  {
    title: "Match size",
    tip: "Question counts for solo modes.",
    fields: [
      {
        key: "match.questionCount",
        label: "Penalty kicks",
        tip: "Kicks in a full penalty shootout.",
        min: 1,
      },
      {
        key: "match.tutorialQuestionCount",
        label: "Tutorial kicks",
        tip: "Shorter FTUE match length.",
        min: 1,
      },
      {
        key: "match.quickQuestionCount",
        label: "Quick Match questions",
        tip: "Rapid-fire Quick Match length.",
        min: 1,
      },
    ],
  },
];

export function EconomyConfigPanel({ initialConfig }: EconomyConfigPanelProps) {
  const [draft, setDraft] = useState<GameConfig>(() =>
    mergeGameConfig(initialConfig),
  );
  const [baseline, setBaseline] = useState<GameConfig>(() =>
    mergeGameConfig(initialConfig),
  );
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseline),
    [draft, baseline],
  );

  function onFieldChange(path: string, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setDraft((prev) => setPath(prev, path, n));
  }

  function resetDefaults() {
    setDraft(mergeGameConfig(DEFAULT_GAME_CONFIG));
    toast.message("Form reset to system defaults — Save to persist.");
  }

  function save() {
    startTransition(async () => {
      const normalized = mergeGameConfig(draft);
      const res = await updateGameConfig(normalized);
      if (!res.ok) {
        toast.error(res.error || "Could not save config.");
        return;
      }
      setDraft(res.config);
      setBaseline(res.config);
      toast.success("Economy config saved — live now.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Changes apply immediately after save (no redeploy). Negatives are
          clamped on submit.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={resetDefaults}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to defaults
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || !dirty}
            onClick={save}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title} className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {section.title}
              <AdminHelpTip text={section.tip} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.fields.map((field) => (
                <label key={field.key} className="flex flex-col gap-1">
                  <FieldLabel tip={field.tip}>{field.label}</FieldLabel>
                  <Input
                    type="number"
                    min={field.min ?? 0}
                    step={field.step ?? 1}
                    value={getPath(draft, field.key)}
                    onChange={(e) => onFieldChange(field.key, e.target.value)}
                    className="font-mono text-sm"
                  />
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end gap-2 pb-6">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={resetDefaults}
        >
          Reset to defaults
        </Button>
        <Button type="button" disabled={pending || !dirty} onClick={save}>
          {pending ? "Saving…" : "Save economy"}
        </Button>
      </div>
    </div>
  );
}
