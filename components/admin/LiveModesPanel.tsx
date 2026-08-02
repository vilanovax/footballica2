"use client";

import { useMemo, useState, useTransition, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Brain,
  ExternalLink,
  Grid3x3,
  Route,
  Save,
  Search,
  Swords,
} from "lucide-react";
import {
  getGameConfig,
  updateGameConfig,
} from "@/actions/admin/config";
import {
  LIVE_MODE_IDS,
  LIVE_MODE_LABELS,
  type LiveModeId,
} from "@/lib/game/liveModes";
import {
  mergeGameConfig,
  type GameConfig,
  type LiveModePlacement,
} from "@/lib/game/economy";
import { Button } from "@/components/ui/button";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

const CONTENT_HREF: Record<LiveModeId, string> = {
  mystery: "/admin/mystery",
  grid: "/admin/grid",
  starPath: "/admin/star-path",
  memory: "/admin/memory",
  tikiTaka: "/admin/grid",
};

const MODE_ICON: Record<
  LiveModeId,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  mystery: Search,
  grid: Grid3x3,
  starPath: Route,
  memory: Brain,
  tikiTaka: Swords,
};

const MODE_BLURB: Record<LiveModeId, string> = {
  mystery: "Guess the mystery footballer from clues",
  grid: "Fill Immortal Grid cells · daily puzzle",
  starPath: "Follow the club trail to the player",
  memory: "Match footballer ↔ country pairs",
  tikiTaka: "PvP 3×3 claim board · duel special",
};

function Switch({
  on,
  disabled,
  onClick,
  label,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      aria-label={`${label}: ${on ? "On" : "Off"}`}
      className={[
        "group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition",
        on
          ? "bg-emerald-50 ring-1 ring-emerald-200"
          : "bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100",
        "disabled:opacity-50",
      ].join(" ")}
    >
      <span
        className={[
          "text-xs font-bold uppercase tracking-wide",
          on ? "text-emerald-800" : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </span>
      <span
        className={[
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          on ? "bg-emerald-500" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-5" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

function placementEqual(
  a: GameConfig["liveModes"],
  b: GameConfig["liveModes"],
): boolean {
  return LIVE_MODE_IDS.every(
    (id) => a[id].duel === b[id].duel && a[id].gotd === b[id].gotd,
  );
}

export function LiveModesPanel({
  initialConfig,
}: {
  initialConfig: GameConfig;
}) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [saved, setSaved] = useState(initialConfig.liveModes);
  const [pending, startTransition] = useTransition();

  const liveModes = config.liveModes;
  const dirty = !placementEqual(liveModes, saved);

  const counts = useMemo(() => {
    let duel = 0;
    let gotd = 0;
    for (const id of LIVE_MODE_IDS) {
      if (liveModes[id].duel) duel += 1;
      if (liveModes[id].gotd) gotd += 1;
    }
    return { duel, gotd };
  }, [liveModes]);

  function setPlacement(
    mode: LiveModeId,
    key: keyof LiveModePlacement,
    value: boolean,
  ) {
    setConfig((prev) =>
      mergeGameConfig({
        ...prev,
        liveModes: {
          ...prev.liveModes,
          [mode]: { ...prev.liveModes[mode], [key]: value },
        },
      }),
    );
  }

  function save() {
    startTransition(async () => {
      const current = await getGameConfig();
      const next = mergeGameConfig({
        ...current,
        liveModes: config.liveModes,
      });
      const res = await updateGameConfig(next);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setConfig(res.config);
      setSaved(res.config.liveModes);
      toast.success("Placement saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatPill label="Duel specials" value={counts.duel} tone="sky" />
          <StatPill label="GotD rotator" value={counts.gotd} tone="emerald" />
          {dirty ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
              Unsaved
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
              Saved
            </span>
          )}
          <AdminHelpTip
            wide
            title="Placement"
            text="Engines always exist in code. These switches only control whether a mode appears as a Duel special and/or in the Game of the Day rotator."
          />
        </div>

        <Button
          type="button"
          size="sm"
          disabled={pending || !dirty}
          onClick={save}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {LIVE_MODE_IDS.map((id) => {
          const Icon = MODE_ICON[id];
          const labels = LIVE_MODE_LABELS[id];
          const placement = liveModes[id];
          const live = placement.duel || placement.gotd;

          return (
            <article
              key={id}
              className={[
                "flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition",
                live
                  ? "border-slate-200"
                  : "border-dashed border-slate-200 opacity-80",
              ].join(" ")}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      live
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {labels.en}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {labels.fa}
                    </p>
                  </div>
                </div>
                <Link
                  href={CONTENT_HREF[id]}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-emerald-700"
                  title="Open content panel"
                  aria-label={`Open ${labels.en} panel`}
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              <p className="mb-3 text-xs leading-snug text-slate-500">
                {MODE_BLURB[id]}
              </p>

              <div className="mt-auto flex flex-col gap-2">
                <Switch
                  label="Duel"
                  on={placement.duel}
                  disabled={pending}
                  onClick={() => setPlacement(id, "duel", !placement.duel)}
                />
                <Switch
                  label="GotD"
                  on={placement.gotd}
                  disabled={pending}
                  onClick={() => setPlacement(id, "gotd", !placement.gotd)}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "sky" | "emerald";
}) {
  const cls =
    tone === "sky"
      ? "bg-sky-50 text-sky-800 ring-sky-200"
      : "bg-emerald-50 text-emerald-800 ring-emerald-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${cls}`}
    >
      <span className="tabular-nums">{value}</span>
      <span className="font-semibold opacity-80">{label}</span>
    </span>
  );
}
