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
import { FieldLabel } from "@/components/admin/AdminHelpTip";

const FORMAT_TYPES = [
  "IMAGE",
  "CAREER_PATH",
  "HIGHER_LOWER",
  "REVEAL_IMAGE",
] as const;

const FORMAT_LABEL: Record<(typeof FORMAT_TYPES)[number], string> = {
  IMAGE: "Image",
  CAREER_PATH: "Career",
  HIGHER_LOWER: "H/L",
  REVEAL_IMAGE: "Reveal",
};

type LiveOpsThemesPanelProps = {
  config: GameConfig;
  onChange: (next: GameConfig) => void;
};

/**
 * Global Live-Ops theme week editor — parent owns Save.
 */
export function LiveOpsThemesPanel({
  config,
  onChange,
}: LiveOpsThemesPanelProps) {
  const lo = config.liveOps;
  const active = Boolean(lo.themeKey);

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
    <div
      className={[
        "rounded-2xl border bg-white p-4 shadow-sm",
        active
          ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
          : "border-slate-200",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={[
              "flex h-9 w-9 items-center justify-center rounded-xl",
              active
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500",
            ].join(" ")}
          >
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Theme week</p>
            <p className="text-xs text-slate-500">
              Biases question formats · not a new Play mode
            </p>
          </div>
        </div>
        {active ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
            ON
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            OFF
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <FieldLabel>Preset</FieldLabel>
          <select
            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium"
            value={lo.themeKey ?? ""}
            onChange={(e) =>
              applyPreset(e.target.value as LiveOpsThemeKey | "")
            }
          >
            <option value="">Off</option>
            {LIVEOPS_THEME_KEYS.map((k) => (
              <option key={k} value={k}>
                {THEME_PRESETS[k].labelEn}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <FieldLabel>Bias / N</FieldLabel>
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
            className="h-10"
          />
        </div>
        {active ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10"
            onClick={() => applyPreset("")}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {active ? (
        <div className="mt-3 space-y-3 border-t border-amber-100 pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <FieldLabel>Title EN</FieldLabel>
              <Input
                value={lo.titleEn}
                onChange={(e) => patchLiveOps({ titleEn: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <FieldLabel>Title FA</FieldLabel>
              <Input
                value={lo.titleFa}
                onChange={(e) => patchLiveOps({ titleFa: e.target.value })}
                dir="rtl"
                className="h-10"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Formats</FieldLabel>
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
                    className={[
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                      on
                        ? "border-amber-500 bg-amber-100 text-amber-950"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    ].join(" ")}
                  >
                    {FORMAT_LABEL[t]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
