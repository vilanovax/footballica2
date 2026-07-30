"use client";

import { Sparkles } from "lucide-react";
import { mergeGameConfig, type GameConfig } from "@/lib/game/economy";
import {
  LIVEOPS_THEME_KEYS,
  THEME_PRESETS,
  type LiveOpsThemeKey,
} from "@/lib/game/liveOpsTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FORMAT_TYPES = [
  "IMAGE",
  "CAREER_PATH",
  "HIGHER_LOWER",
  "REVEAL_IMAGE",
] as const;

type LiveOpsThemesPanelProps = {
  /** Controlled GameConfig draft (parent owns Save via updateGameConfig). */
  config: GameConfig;
  onChange: (next: GameConfig) => void;
};

/**
 * Global Live-Ops theme week editor — embedded in Game Config command center.
 * Persistence is owned by the parent (EconomyConfigPanel sticky Save).
 */
export function LiveOpsThemesPanel({
  config,
  onChange,
}: LiveOpsThemesPanelProps) {
  const lo = config.liveOps;

  function patchLiveOps(patch: Partial<GameConfig["liveOps"]>) {
    onChange(
      mergeGameConfig({
        ...config,
        liveOps: { ...config.liveOps, ...patch },
      }),
    );
  }

  function applyPreset(key: LiveOpsThemeKey | "") {
    if (!key) {
      patchLiveOps({
        themeKey: null,
        titleEn: "",
        titleFa: "",
        blurbEn: "",
        blurbFa: "",
        preferredTypes: [],
      });
      return;
    }
    const preset = THEME_PRESETS[key];
    patchLiveOps({
      themeKey: key,
      titleEn: preset.labelEn,
      titleFa: preset.labelFa,
      blurbEn: `More ${preset.preferredTypes.join(" / ")} questions this week.`,
      blurbFa: `این هفته سوال‌های ${preset.labelFa} بیشتر می‌بینی.`,
      preferredTypes: [...preset.preferredTypes],
      formatBiasEveryN: preset.formatBiasEveryN,
    });
  }

  return (
    <Card className="border-amber-200/80 bg-amber-50/30">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Theme week
        </CardTitle>
        <CardDescription className="text-xs">
          Biases formats inside existing modes (not a new Play card). Save below
          to go live.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1 space-y-1">
            <Label className="text-[11px] text-slate-500">Preset</Label>
            <select
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm"
              value={lo.themeKey ?? ""}
              onChange={(e) =>
                applyPreset(e.target.value as LiveOpsThemeKey | "")
              }
            >
              <option value="">NONE (off)</option>
              {LIVEOPS_THEME_KEYS.map((k) => (
                <option key={k} value={k}>
                  {THEME_PRESETS[k].labelEn}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-[11px] text-slate-500">Bias / N</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={lo.formatBiasEveryN}
              onChange={(e) =>
                patchLiveOps({
                  formatBiasEveryN: Number(e.target.value) || 2,
                })
              }
              className="h-9"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 bg-white"
            onClick={() => applyPreset("")}
          >
            Clear
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Title EN</Label>
            <Input
              value={lo.titleEn}
              onChange={(e) => patchLiveOps({ titleEn: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Title FA</Label>
            <Input
              value={lo.titleFa}
              onChange={(e) => patchLiveOps({ titleFa: e.target.value })}
              dir="rtl"
              className="h-9"
            />
          </div>
        </div>

        <div>
          <Label className="text-[11px] text-slate-500">Formats</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {FORMAT_TYPES.map((t) => {
              const on = lo.preferredTypes.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    patchLiveOps({
                      preferredTypes: on
                        ? lo.preferredTypes.filter((x) => x !== t)
                        : [...lo.preferredTypes, t],
                    })
                  }
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    on
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
