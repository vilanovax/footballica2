"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import {
  upsertDailyMysteryPuzzle,
  type AdminMysteryPuzzleRow,
} from "@/actions/admin/mystery";
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

type PlayerOpt = {
  slug: string;
  nameEn: string;
  nameFa: string;
  isActive: boolean;
};

export function MysteryPuzzlesPanel({
  todayKey,
  initialPuzzles,
  players,
}: {
  todayKey: string;
  initialPuzzles: AdminMysteryPuzzleRow[];
  players: PlayerOpt[];
}) {
  const router = useRouter();
  const [puzzles, setPuzzles] = useState(initialPuzzles);
  const [dateKey, setDateKey] = useState(todayKey);
  const [playerId, setPlayerId] = useState(players.find((p) => p.isActive)?.slug ?? "");
  const [maxGuesses, setMaxGuesses] = useState(6);
  const [pending, startTransition] = useTransition();

  const activePlayers = useMemo(
    () => players.filter((p) => p.isActive),
    [players],
  );

  function publish() {
    if (!playerId) {
      toast.error("Pick a target player.");
      return;
    }
    startTransition(async () => {
      const res = await upsertDailyMysteryPuzzle({
        dateKey,
        targetPlayerId: playerId,
        maxGuesses,
      });
      if (!res.ok || !res.puzzle) {
        const msg =
          res.ok
            ? "Could not save."
            : res.error === "player_inactive"
              ? "Player is inactive."
              : res.error === "date_invalid"
                ? "Date must be YYYY-MM-DD (Tehran)."
                : res.error === "player_not_found"
                  ? "Player not found."
                  : "Could not save puzzle.";
        toast.error(msg);
        return;
      }
      setPuzzles((prev) => {
        const rest = prev.filter((p) => p.dateKey !== res.puzzle!.dateKey);
        return [res.puzzle!, ...rest].sort((a, b) =>
          b.dateKey.localeCompare(a.dateKey),
        );
      });
      toast.success(
        res.puzzle.isToday
          ? "Today’s Mysterious Player published"
          : `Puzzle set for ${res.puzzle.dateKey}`,
      );
      router.refresh();
    });
  }

  function loadRow(p: AdminMysteryPuzzleRow) {
    setDateKey(p.dateKey);
    setPlayerId(p.targetPlayerId);
    setMaxGuesses(p.maxGuesses);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">
            Publish / edit day
          </h2>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Tehran calendar day · today is <code>{todayKey}</code>. Changing
          today’s target updates the live Game of the Day immediately.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Date key</Label>
            <Input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Target player</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {activePlayers.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    {p.nameEn} · {p.nameFa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max guesses</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={maxGuesses}
              onChange={(e) => setMaxGuesses(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="button" disabled={pending} onClick={publish}>
            {pending ? "Saving…" : "Save puzzle"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Guesses</TableHead>
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
                <TableCell>
                  <p className="text-sm font-medium">{p.playerNameEn}</p>
                  <p className="text-xs text-slate-500">
                    {p.playerNameFa} · <code>{p.targetPlayerId}</code>
                  </p>
                </TableCell>
                <TableCell className="tabular-nums">{p.maxGuesses}</TableCell>
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
                <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  No puzzles yet — publish today to start Live-Ops.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
