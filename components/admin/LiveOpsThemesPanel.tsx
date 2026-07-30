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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Global theme week
        </CardTitle>
        <CardDescription>
          Bias Engine for formats inside existing modes (not a new Play card).
          LOGO_WEEK / STADIUM_WEEK → IMAGE + REVEAL_IMAGE (heavy). CAREER_WEEK →
          CAREER_PATH. Challenge themes override this inside a premium Survival
          event. Press <strong>Save</strong> below to go live.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Theme preset</Label>
          <select
            className="flex h-10 w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 text-sm"
            value={lo.themeKey ?? ""}
            onChange={(e) =>
              applyPreset(e.target.value as LiveOpsThemeKey | "")
            }
          >
            <option value="">NONE (off)</option>
            {LIVEOPS_THEME_KEYS.map((k) => (
              <option key={k} value={k}>
                {THEME_PRESETS[k].id} — {THEME_PRESETS[k].labelEn}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title EN</Label>
            <Input
              value={lo.titleEn}
              onChange={(e) => patchLiveOps({ titleEn: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Title FA</Label>
            <Input
              value={lo.titleFa}
              onChange={(e) => patchLiveOps({ titleFa: e.target.value })}
              dir="rtl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Blurb EN</Label>
            <Input
              value={lo.blurbEn}
              onChange={(e) => patchLiveOps({ blurbEn: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Blurb FA</Label>
            <Input
              value={lo.blurbFa}
              onChange={(e) => patchLiveOps({ blurbFa: e.target.value })}
              dir="rtl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bias every N</Label>
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
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Preferred formats</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
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
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
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

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => applyPreset("")}
          >
            Clear theme
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
