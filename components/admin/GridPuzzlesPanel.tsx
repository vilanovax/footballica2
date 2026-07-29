"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Sparkles, Grid3x3 } from "lucide-react";
import {
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
};

const KINDS: { value: GridRuleKind; label: string }[] = [
  { value: "league", label: "League" },
  { value: "position", label: "Position" },
  { value: "nationalityCode", label: "Nation" },
  { value: "club", label: "Club" },
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
  }
}

function AxisEditor({
  title,
  axes,
  onChange,
  ruleOptions,
}: {
  title: string;
  axes: AdminGridAxisInput[];
  onChange: (next: AdminGridAxisInput[]) => void;
  ruleOptions: RuleOptions;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="grid gap-2">
        {axes.map((axis, i) => {
          const values = valuesForKind(axis.kind, ruleOptions);
          return (
            <div key={i} className="grid grid-cols-[7rem_1fr] gap-2">
              <Select
                value={axis.kind}
                onValueChange={(kind) => {
                  const k = kind as GridRuleKind;
                  const next = [...axes];
                  next[i] = {
                    kind: k,
                    value: valuesForKind(k, ruleOptions)[0] ?? "",
                  };
                  onChange(next);
                }}
              >
                <SelectTrigger className="h-9">
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
                onValueChange={(value) => {
                  const next = [...axes];
                  next[i] = { ...axis, value };
                  onChange(next);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Value" />
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
          );
        })}
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
    emptyAxes("league", ruleOptions.leagues),
  );
  const [cols, setCols] = useState<AdminGridAxisInput[]>(() =>
    emptyAxes("position", ["FWD", "MID", "DEF"]),
  );
  const [preview, setPreview] = useState<{
    solvable: boolean;
    emptyCells: number;
    counts: number[];
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function runPreview() {
    startTransition(async () => {
      const res = await previewGridSolvability({ rows, cols });
      if (!res.ok) {
        toast.error(
          res.error === "axes_invalid"
            ? "Fill all 3 row and 3 column axes."
            : "Preview failed.",
        );
        return;
      }
      setPreview({
        solvable: res.solvable,
        emptyCells: res.emptyCells,
        counts: res.cells.map((c) => c.count),
      });
      if (res.solvable) {
        toast.success("All 9 cells have matches");
      } else {
        toast.error(`${res.emptyCells} empty cell(s) — not publishable`);
      }
    });
  }

  function autoFill() {
    startTransition(async () => {
      const res = await suggestAutoGridAxes();
      if (!res.ok) {
        toast.error("Could not auto-build a solvable grid from catalog.");
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
      setPreview(null);
      toast.success("Auto axes loaded — preview before save");
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
            ? "Not solvable — one or more cells have zero players."
            : !res.ok && res.error === "axes_invalid"
              ? "Fill all axes with kind + value."
              : !res.ok && res.error === "date_invalid"
                ? "Date must be YYYY-MM-DD (Tehran)."
                : "Could not save grid.";
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
          ? "Today’s Football Grid published"
          : `Grid set for ${res.puzzle.dateKey}`,
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
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Publish / edit day
            </h2>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={autoFill}
          >
            <Sparkles className="me-1.5 h-3.5 w-3.5" />
            Auto-fill
          </Button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Tehran calendar day · today is <code>{todayKey}</code>. Cron
          pre-creates missing days; this form overrides Live-Ops.
        </p>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Date key</Label>
            <Input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max mistakes</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxMistakes}
              onChange={(e) => setMaxMistakes(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AxisEditor
            title="Rows"
            axes={rows}
            onChange={setRows}
            ruleOptions={ruleOptions}
          />
          <AxisEditor
            title="Columns"
            axes={cols}
            onChange={setCols}
            ruleOptions={ruleOptions}
          />
        </div>

        {preview && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Grid3x3 className="h-3.5 w-3.5" />
              Solvability
              <span
                className={
                  preview.solvable
                    ? "text-emerald-600"
                    : "text-rose-600"
                }
              >
                {preview.solvable
                  ? "· OK"
                  : `· ${preview.emptyCells} empty`}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-1.5 max-w-xs">
              {preview.counts.map((n, i) => (
                <div
                  key={i}
                  className={`flex h-10 items-center justify-center rounded-lg text-sm font-bold tabular-nums ${
                    n === 0
                      ? "bg-rose-100 text-rose-700"
                      : n < 3
                        ? "bg-amber-50 text-amber-800"
                        : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={runPreview}
          >
            Preview
          </Button>
          <Button type="button" disabled={pending} onClick={publish}>
            {pending ? "Saving…" : "Save grid"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Axes</TableHead>
              <TableHead>Solvable</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Solved</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {puzzles.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <span className="font-mono text-sm">{p.dateKey}</span>
                  {p.isToday && (
                    <span className="ms-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      TODAY
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-[14rem] text-xs text-slate-600">
                  <p className="truncate">
                    R: {p.rows.map((a) => a.rule.value).join(" · ")}
                  </p>
                  <p className="truncate">
                    C: {p.cols.map((a) => a.rule.value).join(" · ")}
                  </p>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      p.solvable
                        ? "text-xs font-semibold text-emerald-700"
                        : "text-xs font-semibold text-rose-600"
                    }
                  >
                    {p.solvable ? "Yes" : `${p.emptyCells} empty`}
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">{p.attemptCount}</TableCell>
                <TableCell className="tabular-nums">{p.solvedCount}</TableCell>
                <TableCell className="text-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => loadRow(p)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {puzzles.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-slate-500"
                >
                  No grids yet — Auto-fill + Save, or wait for cron.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
