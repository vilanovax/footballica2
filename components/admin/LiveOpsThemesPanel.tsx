"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { mergeGameConfig, type GameConfig } from "@/lib/game/economy";
import { updateGameConfig } from "@/actions/admin/config";
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

export function LiveOpsThemesPanel({
  initialConfig,
}: {
  initialConfig: GameConfig;
}) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [pending, startTransition] = useTransition();
  const lo = config.liveOps;

  function applyPreset(key: LiveOpsThemeKey | "") {
    if (!key) {
      setConfig((c) =>
        mergeGameConfig({
          ...c,
          liveOps: {
            ...c.liveOps,
            themeKey: null,
            titleEn: "",
            titleFa: "",
            blurbEn: "",
            blurbFa: "",
            preferredTypes: [],
          },
        }),
      );
      return;
    }
    const preset = THEME_PRESETS[key];
    setConfig((c) =>
      mergeGameConfig({
        ...c,
        liveOps: {
          ...c.liveOps,
          themeKey: key,
          titleEn: preset.labelEn,
          titleFa: preset.labelFa,
          blurbEn: `More ${preset.preferredTypes.join(" / ")} questions this week.`,
          blurbFa: `این هفته سوال‌های ${preset.labelFa} بیشتر می‌بینی.`,
          preferredTypes: [...preset.preferredTypes],
          formatBiasEveryN: preset.formatBiasEveryN,
        },
      }),
    );
  }

  function save() {
    startTransition(async () => {
      const res = await updateGameConfig(config);
      if (!res.ok) {
        toast.error("Could not save theme.");
        return;
      }
      toast.success(
        config.liveOps.themeKey
          ? `Global theme: ${config.liveOps.themeKey}`
          : "Global theme cleared",
      );
      router.refresh();
    });
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Global theme week
        </CardTitle>
        <CardDescription>
          Biases Penalty / Quick / classic Survival toward visual formats.
          RecordChallenge themes override this inside a premium event.
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
            <option value="">Off</option>
            {LIVEOPS_THEME_KEYS.map((k) => (
              <option key={k} value={k}>
                {THEME_PRESETS[k].labelEn}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title EN</Label>
            <Input
              value={lo.titleEn}
              onChange={(e) =>
                setConfig((c) =>
                  mergeGameConfig({
                    ...c,
                    liveOps: { ...c.liveOps, titleEn: e.target.value },
                  }),
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Title FA</Label>
            <Input
              value={lo.titleFa}
              onChange={(e) =>
                setConfig((c) =>
                  mergeGameConfig({
                    ...c,
                    liveOps: { ...c.liveOps, titleFa: e.target.value },
                  }),
                )
              }
              dir="rtl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Blurb EN</Label>
            <Input
              value={lo.blurbEn}
              onChange={(e) =>
                setConfig((c) =>
                  mergeGameConfig({
                    ...c,
                    liveOps: { ...c.liveOps, blurbEn: e.target.value },
                  }),
                )
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Blurb FA</Label>
            <Input
              value={lo.blurbFa}
              onChange={(e) =>
                setConfig((c) =>
                  mergeGameConfig({
                    ...c,
                    liveOps: { ...c.liveOps, blurbFa: e.target.value },
                  }),
                )
              }
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
                setConfig((c) =>
                  mergeGameConfig({
                    ...c,
                    liveOps: {
                      ...c.liveOps,
                      formatBiasEveryN: Number(e.target.value) || 2,
                    },
                  }),
                )
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
                    setConfig((c) =>
                      mergeGameConfig({
                        ...c,
                        liveOps: {
                          ...c.liveOps,
                          preferredTypes: on
                            ? c.liveOps.preferredTypes.filter((x) => x !== t)
                            : [...c.liveOps.preferredTypes, t],
                        },
                      }),
                    )
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
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save global theme"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => applyPreset("")}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
