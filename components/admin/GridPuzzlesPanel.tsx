"use client";

import {
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  Grid3x3,
  Pencil,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  ensureGridScheduleWeek,
  previewGridSolvability,
  suggestAutoGridAxes,
  upsertDailyGridPuzzle,
  type AdminGridAxisInput,
  type AdminGridPuzzleRow,
} from "@/actions/admin/grid";
import type { GridRuleKind } from "@/lib/grid/types";
import { GRID_MAX_MISTAKES, GRID_SIZE } from "@/lib/grid/types";
import { AdminHelpTip, FieldLabel } from "@/components/admin/AdminHelpTip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RuleOptions = {
  leagues: string[];
  positions: string[];
  nationalityCodes: string[];
  clubs: string[];
  trophies: string[];
};

const KINDS: { value: GridRuleKind; label: string }[] = [
  { value: "club", label: "Club" },
  { value: "trophy", label: "Trophy" },
  { value: "league", label: "League" },
  { value: "position", label: "Position" },
  { value: "nationalityCode", label: "Nation" },
];

function emptyAxes(kind: GridRuleKind, values: string[]): AdminGridAxisInput[] {
  return Array.from({ length: GRID_SIZE }, (_, i) => ({
    kind,
    value: values[i] ?? "",
  }));
}

function valuesForKind(kind: GridRuleKind, opts: RuleOptions): string[] {
  switch (kind) {
    case "league":
      return opts.leagues;
    case "position":
      return opts.positions;
    case "nationalityCode":
      return opts.nationalityCodes;
    case "club":
      return opts.clubs;
    case "trophy":
      return opts.trophies;
  }
}

function axesFromPuzzle(p: AdminGridPuzzleRow): {
  rows: AdminGridAxisInput[];
  cols: AdminGridAxisInput[];
} {
  return {
    rows: p.rows.map((a) => ({
      kind: a.rule.kind,
      value: a.rule.value,
      labelEn: a.labelEn,
      labelFa: a.labelFa,
    })),
    cols: p.cols.map((a) => ({
      kind: a.rule.kind,
      value: a.rule.value,
      labelEn: a.labelEn,
      labelFa: a.labelFa,
    })),
  };
}

function boardSummary(p: AdminGridPuzzleRow): string {
  const r = p.rows.map((a) => a.rule.value).join(" · ");
  const c = p.cols.map((a) => a.rule.value).join(" · ");
  return `${r}  ×  ${c}`;
}

function AxisChip({
  axis,
  onChange,
  ruleOptions,
  label,
}: {
  axis: AdminGridAxisInput;
  onChange: (next: AdminGridAxisInput) => void;
  ruleOptions: RuleOptions;
  label: string;
}) {
  const values = valuesForKind(axis.kind, ruleOptions);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
        {label}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <Select
          value={axis.kind}
          onValueChange={(kind) => {
            const k = kind as GridRuleKind;
            onChange({
              kind: k,
              value: valuesForKind(k, ruleOptions)[0] ?? "",
            });
          }}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={axis.value || undefined}
          onValueChange={(value) => onChange({ ...axis, value })}
        >
          <SelectTrigger className="h-8 min-w-0 w-full text-xs">
            <SelectValue placeholder="…" />
          </SelectTrigger>
          <SelectContent>
            {values.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "amber" | "emerald" | "rose" | "slate" | "sky";
  children: ReactNode;
}) {
  const cls = {
    amber: "bg-amber-50 text-amber-950 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-950 ring-emerald-200",
    rose: "bg-rose-50 text-rose-950 ring-rose-200",
    slate: "bg-white text-slate-800 ring-slate-200",
    sky: "bg-sky-50 text-sky-950 ring-sky-200",
  }[tone];
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}

export function GridPuzzlesPanel({
  todayKey,
  initialPuzzles,
  ruleOptions,
}: {
  todayKey: string;
  initialPuzzles: AdminGridPuzzleRow[];
  ruleOptions: RuleOptions;
}) {
  const router = useRouter();
  const seedToday = initialPuzzles.find((p) => p.dateKey === todayKey) ?? null;
  const seedAxes = seedToday
    ? axesFromPuzzle(seedToday)
    : {
        rows:
          ruleOptions.clubs.length >= 3
            ? emptyAxes("club", ruleOptions.clubs)
            : emptyAxes("league", ruleOptions.leagues),
        cols:
          ruleOptions.clubs.length >= 6
            ? emptyAxes("club", ruleOptions.clubs.slice(3))
            : emptyAxes("position", ["FWD", "MID", "DEF"]),
      };

  const [puzzles, setPuzzles] = useState(initialPuzzles);
  const [dateKey, setDateKey] = useState(todayKey);
  const [maxMistakes, setMaxMistakes] = useState(
    seedToday?.maxMistakes ?? GRID_MAX_MISTAKES,
  );
  const [rows, setRows] = useState<AdminGridAxisInput[]>(seedAxes.rows);
  const [cols, setCols] = useState<AdminGridAxisInput[]>(seedAxes.cols);
  const [preview, setPreview] = useState<{
    solvable: boolean;
    emptyCells: number;
    counts: number[];
  } | null>(
    seedToday
      ? {
          solvable: seedToday.solvable,
          emptyCells: seedToday.emptyCells,
          counts: seedToday.cellCounts,
        }
      : null,
  );
  const [pending, startTransition] = useTransition();

  const readyToSave = preview?.solvable === true;
  const isToday = dateKey === todayKey;

  const todayPuzzle = useMemo(
    () => puzzles.find((p) => p.dateKey === todayKey) ?? null,
    [puzzles, todayKey],
  );

  const schedule = useMemo(
    () => puzzles.filter((p) => p.dateKey !== todayKey),
    [puzzles, todayKey],
  );

  const weekCoverage = useMemo(() => {
    return {
      scheduled: puzzles.length,
      solvable: puzzles.filter((p) => p.solvable).length,
    };
  }, [puzzles]);

  function updateRow(i: number, next: AdminGridAxisInput) {
    setRows((prev) => {
      const copy = [...prev];
      copy[i] = next;
      return copy;
    });
    setPreview(null);
  }

  function updateCol(i: number, next: AdminGridAxisInput) {
    setCols((prev) => {
      const copy = [...prev];
      copy[i] = next;
      return copy;
    });
    setPreview(null);
  }

  function runPreview() {
    startTransition(async () => {
      const res = await previewGridSolvability({ rows, cols });
      if (!res.ok) {
        toast.error(
          res.error === "axes_invalid"
            ? "Fill all row & column axes."
            : "Preview failed.",
        );
        return;
      }
      setPreview({
        solvable: res.solvable,
        emptyCells: res.emptyCells,
        counts: res.cells.map((c) => c.count),
      });
      if (res.solvable) toast.success("All 9 cells OK — ready to save");
      else toast.error(`${res.emptyCells} empty cell(s)`);
    });
  }

  function fillWeek() {
    startTransition(async () => {
      const res = await ensureGridScheduleWeek(7);
      if (!res.ok) {
        toast.error("Could not fill Grid week.");
        return;
      }
      toast.success(`Week filled · +${res.created} new · ${res.skipped} kept`);
      router.refresh();
    });
  }

  function autoFill() {
    startTransition(async () => {
      const res = await suggestAutoGridAxes();
      if (!res.ok) {
        toast.error("No solvable auto board from catalog.");
        return;
      }
      const nextRows = res.rows.map((a) => ({
        kind: a.rule.kind,
        value: a.rule.value,
        labelEn: a.labelEn,
        labelFa: a.labelFa,
      }));
      const nextCols = res.cols.map((a) => ({
        kind: a.rule.kind,
        value: a.rule.value,
        labelEn: a.labelEn,
        labelFa: a.labelFa,
      }));
      setRows(nextRows);
      setCols(nextCols);
      const prev = await previewGridSolvability({
        rows: nextRows,
        cols: nextCols,
      });
      if (prev.ok) {
        setPreview({
          solvable: prev.solvable,
          emptyCells: prev.emptyCells,
          counts: prev.cells.map((c) => c.count),
        });
        toast.success(
          prev.solvable
            ? "Auto board ready — Save when happy"
            : "Auto board needs a tweak",
        );
      } else {
        setPreview(null);
        toast.success("Axes loaded — Preview before save");
      }
    });
  }

  function publish() {
    startTransition(async () => {
      const res = await upsertDailyGridPuzzle({
        dateKey,
        rows,
        cols,
        maxMistakes,
        requireSolvable: true,
      });
      if (!res.ok || !res.puzzle) {
        const msg =
          !res.ok && res.error === "not_solvable"
            ? "Not solvable — fix red cells."
            : !res.ok && res.error === "axes_invalid"
              ? "Fill all axes."
              : !res.ok && res.error === "date_invalid"
                ? "Date must be YYYY-MM-DD."
                : "Could not save.";
        toast.error(msg);
        return;
      }
      setPuzzles((prev) => {
        const rest = prev.filter((p) => p.dateKey !== res.puzzle!.dateKey);
        return [res.puzzle!, ...rest].sort((a, b) =>
          b.dateKey.localeCompare(a.dateKey),
        );
      });
      setPreview({
        solvable: res.puzzle.solvable,
        emptyCells: res.puzzle.emptyCells,
        counts: res.puzzle.cellCounts,
      });
      toast.success(
        res.puzzle.isToday
          ? "Today’s Grid published"
          : `Saved ${res.puzzle.dateKey}`,
      );
      router.refresh();
    });
  }

  function loadRow(p: AdminGridPuzzleRow) {
    const axes = axesFromPuzzle(p);
    setDateKey(p.dateKey);
    setMaxMistakes(p.maxMistakes);
    setRows(axes.rows);
    setCols(axes.cols);
    setPreview({
      solvable: p.solvable,
      emptyCells: p.emptyCells,
      counts: p.cellCounts,
    });
  }

  function loadToday() {
    if (todayPuzzle) {
      loadRow(todayPuzzle);
      return;
    }
    setDateKey(todayKey);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={loadToday}
        className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-white px-3.5 py-3 text-start shadow-sm transition hover:border-amber-300 hover:shadow"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-950 ring-1 ring-amber-200">
          <Grid3x3 className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-950">
              Live today
            </p>
            <code className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-800 ring-1 ring-slate-200">
              {todayKey}
            </code>
            {todayPuzzle ? (
              <StatusPill tone={todayPuzzle.solvable ? "emerald" : "rose"}>
                {todayPuzzle.solvable
                  ? "OK"
                  : `${todayPuzzle.emptyCells} empty`}
              </StatusPill>
            ) : null}
          </div>
          {todayPuzzle ? (
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
              {boardSummary(todayPuzzle)}
              <span className="ms-2 text-[11px] font-semibold text-slate-700">
                {todayPuzzle.maxMistakes}m · {todayPuzzle.attemptCount} plays ·{" "}
                {todayPuzzle.solvedCount} solved
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm font-medium text-slate-800">
              No board yet — Auto-fill + Save to publish.
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-950 ring-1 ring-amber-200">
          {todayPuzzle ? "Edit" : "Set"}
        </span>
      </button>

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold text-slate-900">Board</h2>
            {isToday ? <StatusPill tone="amber">TODAY</StatusPill> : null}
            {preview ? (
              <StatusPill tone={preview.solvable ? "emerald" : "rose"}>
                {preview.solvable ? "Ready" : `${preview.emptyCells} empty`}
              </StatusPill>
            ) : (
              <StatusPill tone="slate">Preview needed</StatusPill>
            )}
            <AdminHelpTip text="Green cells ≥ 3 catalog matches. Save requires all 9 green." />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={fillWeek}
              className="h-8 gap-1.5 border-slate-200 bg-white"
            >
              <Wand2 className="h-3.5 w-3.5 text-amber-800" />
              Fill week
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={autoFill}
              className="h-8 gap-1.5 border-violet-200 bg-violet-50 text-violet-950 hover:bg-violet-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Auto-fill
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={runPreview}
              className="h-8 gap-1.5 border-slate-200 bg-white"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !readyToSave}
              onClick={publish}
              className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Save className="h-3.5 w-3.5" />
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </header>

        <div className="space-y-3 p-3.5">
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <FieldLabel>Date</FieldLabel>
              <Input
                type="date"
                value={dateKey}
                onChange={(e) => {
                  setDateKey(e.target.value);
                  setPreview(null);
                }}
                className="h-10"
              />
            </div>
            <div className="sm:col-span-3">
              <FieldLabel>Max mistakes</FieldLabel>
              <Input
                type="number"
                min={1}
                max={20}
                value={maxMistakes}
                onChange={(e) => setMaxMistakes(Number(e.target.value))}
                className="h-10"
              />
            </div>
            <div className="flex items-end sm:col-span-5">
              <p className="pb-2 text-xs font-medium text-slate-800">
                Schedule{" "}
                <span className="font-bold text-slate-900">
                  {weekCoverage.scheduled}
                </span>{" "}
                · solvable{" "}
                <span className="font-bold text-slate-900">
                  {weekCoverage.solvable}
                </span>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <div
              className="mx-auto grid min-w-[22rem] gap-2"
              style={{
                gridTemplateColumns:
                  "minmax(8.5rem,1.15fr) repeat(3, minmax(5.5rem,1fr))",
              }}
            >
              <div className="flex items-end justify-center pb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
                  3×3
                </span>
              </div>
              {cols.map((axis, i) => (
                <AxisChip
                  key={`c-${i}`}
                  label={`Col ${i + 1}`}
                  axis={axis}
                  ruleOptions={ruleOptions}
                  onChange={(next) => updateCol(i, next)}
                />
              ))}

              {rows.map((rowAxis, r) => (
                <div key={`r-${r}`} className="contents">
                  <AxisChip
                    label={`Row ${r + 1}`}
                    axis={rowAxis}
                    ruleOptions={ruleOptions}
                    onChange={(next) => updateRow(r, next)}
                  />
                  {cols.map((_, c) => {
                    const idx = r * GRID_SIZE + c;
                    const n = preview?.counts[idx];
                    const tone =
                      n == null
                        ? "border-dashed border-slate-200 bg-white text-slate-500"
                        : n === 0
                          ? "border-rose-200 bg-rose-50 text-rose-950"
                          : n < 3
                            ? "border-amber-200 bg-amber-50 text-amber-950"
                            : "border-emerald-200 bg-emerald-50 text-emerald-950";
                    return (
                      <div
                        key={`cell-${r}-${c}`}
                        className={[
                          "flex h-12 items-center justify-center rounded-lg border-2 text-sm font-bold tabular-nums",
                          tone,
                        ].join(" ")}
                        title={
                          n == null
                            ? "Preview to check"
                            : `${n} matching player(s)`
                        }
                      >
                        {n == null ? "·" : n}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-slate-800">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />≥ 3
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              1–2
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />0
            </span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
          <h2 className="text-sm font-semibold text-slate-900">Schedule</h2>
          <span className="text-[11px] font-semibold text-slate-800">
            {schedule.length} day{schedule.length === 1 ? "" : "s"}
          </span>
        </header>

        {schedule.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 ring-1 ring-slate-200">
              <Grid3x3 className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-slate-900">
              No other days
            </p>
            <p className="text-xs font-medium text-slate-800">
              Fill week or Auto-fill + Save a future date.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {schedule.map((p) => {
              const isUpcoming = p.dateKey > todayKey;
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-2.5 px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <code className="font-mono text-xs font-bold text-slate-900">
                        {p.dateKey}
                      </code>
                      {isUpcoming ? (
                        <StatusPill tone="sky">UPCOMING</StatusPill>
                      ) : (
                        <StatusPill tone="slate">PAST</StatusPill>
                      )}
                      <StatusPill tone={p.solvable ? "emerald" : "rose"}>
                        {p.solvable ? "OK" : `${p.emptyCells} empty`}
                      </StatusPill>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                      {boardSummary(p)}
                      <span className="ms-2 text-[11px] font-semibold text-slate-700">
                        {p.maxMistakes}m · {p.attemptCount}p · {p.solvedCount}s
                      </span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => loadRow(p)}
                    className="h-8 w-8 shrink-0 text-slate-800 hover:bg-white hover:text-slate-900"
                    aria-label={`Edit ${p.dateKey}`}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
