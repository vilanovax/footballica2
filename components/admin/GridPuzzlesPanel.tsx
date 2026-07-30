"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarPlus,
  Sparkles,
  Eye,
  Save,
  Pencil,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RuleOptions = {
  leagues: string[];
  positions: string[];
  nationalityCodes: string[];
  clubs: string[];
  trophies: string[];
};

const KINDS: { value: GridRuleKind; label: string; short: string }[] = [
  { value: "club", label: "Club", short: "Club" },
  { value: "trophy", label: "Trophy", short: "Cup" },
  { value: "league", label: "League", short: "Lge" },
  { value: "position", label: "Position", short: "Pos" },
  { value: "nationalityCode", label: "Nation", short: "Nat" },
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
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row">
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
          <SelectTrigger className="h-8 w-full shrink-0 text-xs sm:w-[5.5rem]">
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
          <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
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
  const [puzzles, setPuzzles] = useState(initialPuzzles);
  const [dateKey, setDateKey] = useState(todayKey);
  const [maxMistakes, setMaxMistakes] = useState(GRID_MAX_MISTAKES);
  const [rows, setRows] = useState<AdminGridAxisInput[]>(() =>
    ruleOptions.clubs.length >= 3
      ? emptyAxes("club", ruleOptions.clubs)
      : emptyAxes("league", ruleOptions.leagues),
  );
  const [cols, setCols] = useState<AdminGridAxisInput[]>(() =>
    ruleOptions.clubs.length >= 6
      ? emptyAxes("club", ruleOptions.clubs.slice(3))
      : emptyAxes("position", ["FWD", "MID", "DEF"]),
  );
  const [preview, setPreview] = useState<{
    solvable: boolean;
    emptyCells: number;
    counts: number[];
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const readyToSave = preview?.solvable === true;
  const isToday = dateKey === todayKey;

  const weekCoverage = useMemo(() => {
    const keys = new Set(puzzles.map((p) => p.dateKey));
    return { scheduled: keys.size, solvable: puzzles.filter((p) => p.solvable).length };
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
      toast.success(
        `Week filled · +${res.created} new, ${res.skipped} skipped`,
      );
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
      setRows(
        res.rows.map((a) => ({
          kind: a.rule.kind,
          value: a.rule.value,
          labelEn: a.labelEn,
          labelFa: a.labelFa,
        })),
      );
      setCols(
        res.cols.map((a) => ({
          kind: a.rule.kind,
          value: a.rule.value,
          labelEn: a.labelEn,
          labelFa: a.labelFa,
        })),
      );
      // Immediately preview so admin sees green/red without extra click.
      const prev = await previewGridSolvability({
        rows: res.rows.map((a) => ({
          kind: a.rule.kind,
          value: a.rule.value,
        })),
        cols: res.cols.map((a) => ({
          kind: a.rule.kind,
          value: a.rule.value,
        })),
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
    setDateKey(p.dateKey);
    setMaxMistakes(p.maxMistakes);
    setRows(
      p.rows.map((a) => ({
        kind: a.rule.kind,
        value: a.rule.value,
        labelEn: a.labelEn,
        labelFa: a.labelFa,
      })),
    );
    setCols(
      p.cols.map((a) => ({
        kind: a.rule.kind,
        value: a.rule.value,
        labelEn: a.labelEn,
        labelFa: a.labelFa,
      })),
    );
    setPreview({
      solvable: p.solvable,
      emptyCells: p.emptyCells,
      counts: p.cellCounts,
    });
    toast.message(`Editing ${p.dateKey}`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={fillWeek}
        >
          <CalendarPlus className="me-1.5 h-3.5 w-3.5" />
          Fill week
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={autoFill}
          className="border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
        >
          <Sparkles className="me-1.5 h-3.5 w-3.5" />
          Auto-fill
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={runPreview}
        >
          <Eye className="me-1.5 h-3.5 w-3.5" />
          Preview
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || !readyToSave}
          onClick={publish}
          className="ms-auto"
        >
          <Save className="me-1.5 h-3.5 w-3.5" />
          {pending ? "Saving…" : "Save"}
        </Button>
        <span className="w-full text-[11px] text-slate-500 sm:w-auto sm:ms-0">
          Schedule: {weekCoverage.scheduled} days · {weekCoverage.solvable}{" "}
          solvable
        </span>
      </div>

      {/* Editor card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Day</Label>
            <Input
              type="date"
              value={dateKey}
              onChange={(e) => {
                setDateKey(e.target.value);
                setPreview(null);
              }}
              className="h-9 w-[11rem]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Max mistakes</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxMistakes}
              onChange={(e) => setMaxMistakes(Number(e.target.value))}
              className="h-9 w-20"
            />
          </div>
          {isToday && (
            <span className="mb-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
              Today
            </span>
          )}
          {preview && (
            <span
              className={[
                "mb-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
                preview.solvable
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-rose-50 text-rose-700 ring-rose-200",
              ].join(" ")}
            >
              {preview.solvable
                ? "Ready to publish"
                : `${preview.emptyCells} empty`}
            </span>
          )}
        </div>

        {/* Visual 3×3 board editor */}
        <div className="overflow-x-auto">
          <div
            className="mx-auto grid min-w-[20rem] gap-2"
            style={{
              gridTemplateColumns: "minmax(9rem,1.1fr) repeat(3, minmax(5.5rem,1fr))",
            }}
          >
            {/* Corner */}
            <div className="flex items-end justify-center pb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                3×3
              </span>
            </div>
            {/* Column headers */}
            {cols.map((axis, i) => (
              <AxisChip
                key={`c-${i}`}
                label={`Col ${i + 1}`}
                axis={axis}
                ruleOptions={ruleOptions}
                onChange={(next) => updateCol(i, next)}
              />
            ))}

            {/* Rows + cells */}
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
                      ? "border-dashed border-slate-200 bg-slate-50 text-slate-300"
                      : n === 0
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : n < 3
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800";
                  return (
                    <div
                      key={`cell-${r}-${c}`}
                      className={[
                        "flex h-14 items-center justify-center rounded-xl border-2 text-sm font-bold tabular-nums",
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

        <p className="mt-3 text-center text-[11px] text-slate-500">
          Cell numbers = catalog matches. Green ≥ 3 · Amber 1–2 · Red 0.
        </p>
      </div>

      {/* Schedule */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-800">Schedule</h2>
          <span className="text-[11px] text-slate-500">
            Tap Edit to load into the board
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[7.5rem]">Day</TableHead>
              <TableHead>Board</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-20 text-end">Stats</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {puzzles.map((p) => (
              <TableRow key={p.id} className={p.isToday ? "bg-amber-50/40" : ""}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm font-semibold text-slate-800">
                      {p.dateKey}
                    </span>
                    {p.isToday && (
                      <span className="w-fit rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                        TODAY
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-[11px] text-slate-600">
                    <span className="truncate">
                      <span className="font-semibold text-slate-400">R</span>{" "}
                      {p.rows.map((a) => a.rule.value).join(" · ")}
                    </span>
                    <span className="truncate">
                      <span className="font-semibold text-slate-400">C</span>{" "}
                      {p.cols.map((a) => a.rule.value).join(" · ")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                      p.solvable
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700",
                    ].join(" ")}
                  >
                    {p.solvable ? "OK" : `${p.emptyCells} empty`}
                  </span>
                </TableCell>
                <TableCell className="text-end text-xs tabular-nums text-slate-500">
                  {p.attemptCount}/{p.solvedCount}
                </TableCell>
                <TableCell className="text-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => loadRow(p)}
                    className="h-8 gap-1 text-xs"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {puzzles.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-slate-500"
                >
                  Empty schedule — hit <strong>Fill week</strong> or{" "}
                  <strong>Auto-fill</strong> + Save.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
