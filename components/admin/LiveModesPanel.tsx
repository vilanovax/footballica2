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

const MODE_ACCENT: Record<
  LiveModeId,
  { icon: string; ring: string }
> = {
  mystery: {
    icon: "bg-violet-50 text-violet-900",
    ring: "ring-violet-200",
  },
  grid: {
    icon: "bg-sky-50 text-sky-900",
    ring: "ring-sky-200",
  },
  starPath: {
    icon: "bg-amber-50 text-amber-950",
    ring: "ring-amber-200",
  },
  memory: {
    icon: "bg-rose-50 text-rose-900",
    ring: "ring-rose-200",
  },
  tikiTaka: {
    icon: "bg-emerald-50 text-emerald-900",
    ring: "ring-emerald-200",
  },
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
        "group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 transition",
        on
          ? "bg-emerald-50 ring-1 ring-emerald-200"
          : "bg-white ring-1 ring-slate-200 hover:ring-slate-300",
        "disabled:opacity-50",
      ].join(" ")}
    >
      <span
        className={[
          "text-[11px] font-bold uppercase tracking-wide",
          on ? "text-emerald-900" : "text-slate-700",
        ].join(" ")}
      >
        {label}
      </span>
      <span
        className={[
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          on ? "bg-emerald-600" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-4" : "translate-x-0.5",
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
    <div className="space-y-3">
      <section
        className={[
          "sticky top-2 z-10 overflow-hidden rounded-xl border bg-white shadow-sm",
          dirty ? "border-amber-300" : "border-slate-200/90",
        ].join(" ")}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
              Placement
            </p>
            <AdminHelpTip
              wide
              title="Placement"
              text="Engines always exist in code. These switches only control whether a mode appears as a Duel special and/or in the Game of the Day rotator."
            />
            <span className="hidden h-4 w-px bg-slate-200 sm:block" />
            <StatPill label="Duel" value={counts.duel} tone="sky" />
            <StatPill label="GotD" value={counts.gotd} tone="emerald" />
            {dirty ? (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-950 ring-1 ring-amber-200">
                Unsaved
              </span>
            ) : (
              <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                Saved
              </span>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            disabled={pending || !dirty}
            onClick={save}
            className={[
              "gap-1.5",
              dirty
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "",
            ].join(" ")}
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? "Saving…" : "Save"}
          </Button>
        </header>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {LIVE_MODE_IDS.map((id) => {
          const Icon = MODE_ICON[id];
          const labels = LIVE_MODE_LABELS[id];
          const placement = liveModes[id];
          const live = placement.duel || placement.gotd;
          const accent = MODE_ACCENT[id];

          return (
            <article
              key={id}
              className={[
                "flex flex-col rounded-xl border bg-white p-3.5 shadow-sm transition",
                live
                  ? "border-slate-200/90"
                  : "border-dashed border-slate-300 opacity-75",
              ].join(" ")}
            >
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
                      live
                        ? `${accent.icon} ${accent.ring}`
                        : "bg-white text-slate-700 ring-slate-200",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {labels.en}
                      <span className="ms-1.5 font-medium text-slate-600" dir="auto">
                        · {labels.fa}
                      </span>
                    </p>
                    <p className="truncate text-[11px] font-medium text-slate-600">
                      {MODE_BLURB[id]}
                    </p>
                  </div>
                </div>
                <Link
                  href={CONTENT_HREF[id]}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-white hover:text-emerald-800 ring-1 ring-transparent hover:ring-slate-200"
                  title="Open content panel"
                  aria-label={`Open ${labels.en} panel`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-1.5">
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
      ? "bg-sky-50 text-sky-950 ring-sky-200"
      : "bg-emerald-50 text-emerald-950 ring-emerald-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ${cls}`}
    >
      <span className="tabular-nums">{value}</span>
      <span className="font-semibold">{label}</span>
    </span>
  );
}
