"use client";

import { useMemo, useState, useTransition } from "react";
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
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
    <div className="space-y-4">
      {/* Live today */}
      <button
        type="button"
        onClick={loadToday}
        className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3.5 text-start shadow-sm transition hover:border-amber-300 hover:shadow"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Grid3x3 className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
              Live today
            </p>
            <code className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 ring-1 ring-amber-100">
              {todayKey}
            </code>
            {todayPuzzle ? (
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  todayPuzzle.solvable
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800",
                ].join(" ")}
              >
                {todayPuzzle.solvable ? "OK" : `${todayPuzzle.emptyCells} empty`}
              </span>
            ) : null}
          </div>
          {todayPuzzle ? (
            <>
              <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                {boardSummary(todayPuzzle)}
              </p>
              <p className="text-xs text-slate-500">
                {todayPuzzle.maxMistakes} mistakes · {todayPuzzle.attemptCount}{" "}
                plays · {todayPuzzle.solvedCount} solved
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-slate-600">
              No board yet — Auto-fill + Save to publish.
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-semibold text-amber-800">
          {todayPuzzle ? "Edit" : "Set"}
        </span>
      </button>

      {/* Board editor */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Board</h2>
            {isToday ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                TODAY
              </span>
            ) : null}
            {preview ? (
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  preview.solvable
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800",
                ].join(" ")}
              >
                {preview.solvable
                  ? "Ready"
                  : `${preview.emptyCells} empty`}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                Preview needed
              </span>
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
              className="gap-1.5"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Fill week
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={autoFill}
              className="gap-1.5 border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
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
              className="gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !readyToSave}
              onClick={publish}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-12">
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
            <p className="pb-2 text-xs text-slate-500">
              Schedule{" "}
              <span className="font-semibold text-slate-700">
                {weekCoverage.scheduled}
              </span>{" "}
              · solvable{" "}
              <span className="font-semibold text-slate-700">
                {weekCoverage.solvable}
              </span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-100">
          <div
            className="mx-auto grid min-w-[22rem] gap-2"
            style={{
              gridTemplateColumns:
                "minmax(8.5rem,1.15fr) repeat(3, minmax(5.5rem,1fr))",
            }}
          >
            <div className="flex items-end justify-center pb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
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
                      ? "border-dashed border-slate-200 bg-white text-slate-300"
                      : n === 0
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : n < 3
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800";
                  return (
                    <div
                      key={`cell-${r}-${c}`}
                      className={[
                        "flex h-14 items-center justify-center rounded-xl border-2 text-sm font-bold tabular-nums shadow-sm",
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

        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />≥ 3
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            1–2
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />0
          </span>
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Schedule</h2>
          <span className="text-xs font-medium text-slate-400">
            {schedule.length} day{schedule.length === 1 ? "" : "s"}
          </span>
        </div>

        {schedule.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No other days — Fill week or Auto-fill + Save a future date.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {schedule.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-xs font-semibold text-slate-700">
                      {p.dateKey}
                    </code>
                    {p.dateKey > todayKey ? (
                      <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                        UPCOMING
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                        PAST
                      </span>
                    )}
                    <span
                      className={[
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                        p.solvable
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700",
                      ].join(" ")}
                    >
                      {p.solvable ? "OK" : `${p.emptyCells} empty`}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-800">
                    {boardSummary(p)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.maxMistakes} mistakes · {p.attemptCount} plays ·{" "}
                    {p.solvedCount} solved
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => loadRow(p)}
                  className="h-9 gap-1.5 px-2.5 text-slate-600"
                  aria-label={`Edit ${p.dateKey}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
