"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Search } from "lucide-react";
import {
  setFootballPlayerActive,
  upsertFootballPlayer,
} from "@/actions/admin/players";
import type {
  FootballPlayerAdminRow,
  PlayerWriteInput,
} from "@/lib/mystery/players";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const EMPTY: PlayerWriteInput = {
  slug: "",
  nameEn: "",
  nameFa: "",
  nationality: "",
  nationalityCode: "",
  position: "FWD",
  league: "",
  club: "",
  age: 28,
  shirtNumber: 10,
  isActive: true,
};

function errorMessage(code: string): string {
  switch (code) {
    case "slug_invalid":
      return "Slug must be at least 2 chars (a-z, 0-9, _).";
    case "position_invalid":
      return "Position must be GK, DEF, MID, or FWD.";
    case "name_required":
      return "English and Persian names are required.";
    case "fields_required":
      return "Nationality, code, league, and club are required.";
    case "age_invalid":
      return "Age must be between 15 and 55.";
    case "shirt_invalid":
      return "Shirt number must be 0–99.";
    case "unauthorized":
      return "Admin session expired.";
    default:
      return "Could not save player.";
  }
}

export function PlayersPanel({
  initialPlayers,
}: {
  initialPlayers: FootballPlayerAdminRow[];
}) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<PlayerWriteInput>(EMPTY);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.slug.includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.nameFa.includes(query.trim()) ||
        p.club.toLowerCase().includes(q),
    );
  }, [players, query]);

  function openCreate() {
    setEditingSlug(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(p: FootballPlayerAdminRow) {
    setEditingSlug(p.slug);
    setForm({
      slug: p.slug,
      nameEn: p.nameEn,
      nameFa: p.nameFa,
      nationality: p.nationality,
      nationalityCode: p.nationalityCode,
      position: p.position,
      league: p.league,
      club: p.club,
      age: p.age,
      shirtNumber: p.shirtNumber,
      isActive: p.isActive,
    });
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const res = await upsertFootballPlayer(form);
      if (!res.ok || !res.player) {
        toast.error(errorMessage(res.ok ? "unknown" : res.error));
        return;
      }
      setPlayers((prev) => {
        const rest = prev.filter((p) => p.slug !== res.player!.slug);
        return [res.player!, ...rest].sort((a, b) =>
          a.nameEn.localeCompare(b.nameEn),
        );
      });
      toast.success(editingSlug ? "Player updated" : "Player created");
      setOpen(false);
      router.refresh();
    });
  }

  function toggleActive(p: FootballPlayerAdminRow) {
    startTransition(async () => {
      const res = await setFootballPlayerActive({
        slug: p.slug,
        isActive: !p.isActive,
      });
      if (!res.ok || !res.player) {
        toast.error(errorMessage(res.ok ? "unknown" : res.error));
        return;
      }
      setPlayers((prev) =>
        prev.map((row) => (row.slug === res.player!.slug ? res.player! : row)),
      );
      toast.success(res.player.isActive ? "Activated" : "Deactivated");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search slug, name, club…"
            className="ps-8"
          />
        </div>
        <Button type="button" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add player
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Pos</TableHead>
              <TableHead>Club / League</TableHead>
              <TableHead>Age / #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.slug}>
                <TableCell>
                  <p className="font-medium text-slate-900">{p.nameEn}</p>
                  <p className="text-xs text-slate-500">
                    {p.nameFa} · <code>{p.slug}</code>
                  </p>
                </TableCell>
                <TableCell className="font-mono text-xs">{p.position}</TableCell>
                <TableCell>
                  <p className="text-sm">{p.club}</p>
                  <p className="text-xs text-slate-500">{p.league}</p>
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {p.age} / #{p.shirtNumber}
                </TableCell>
                <TableCell>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      p.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {p.isActive ? "Active" : "Off"}
                  </span>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => toggleActive(p)}
                    >
                      {p.isActive ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSlug ? `Edit ${editingSlug}` : "Add football player"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Slug">
              <Input
                value={form.slug}
                disabled={!!editingSlug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="messi"
              />
            </Field>
            <Field label="Position">
              <Select
                value={form.position}
                onValueChange={(v) => setForm((f) => ({ ...f, position: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["GK", "DEF", "MID", "FWD"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Name (EN)">
              <Input
                value={form.nameEn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nameEn: e.target.value }))
                }
              />
            </Field>
            <Field label="Name (FA)">
              <Input
                value={form.nameFa}
                dir="rtl"
                onChange={(e) =>
                  setForm((f) => ({ ...f, nameFa: e.target.value }))
                }
              />
            </Field>
            <Field label="Nationality">
              <Input
                value={form.nationality}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nationality: e.target.value }))
                }
              />
            </Field>
            <Field label="Nation code">
              <Input
                value={form.nationalityCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nationalityCode: e.target.value }))
                }
                placeholder="AR"
              />
            </Field>
            <Field label="Club">
              <Input
                value={form.club}
                onChange={(e) => setForm((f) => ({ ...f, club: e.target.value }))}
              />
            </Field>
            <Field label="League">
              <Input
                value={form.league}
                onChange={(e) =>
                  setForm((f) => ({ ...f, league: e.target.value }))
                }
              />
            </Field>
            <Field label="Age">
              <Input
                type="number"
                value={form.age}
                onChange={(e) =>
                  setForm((f) => ({ ...f, age: Number(e.target.value) }))
                }
              />
            </Field>
            <Field label="Shirt #">
              <Input
                type="number"
                value={form.shirtNumber}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    shirtNumber: Number(e.target.value),
                  }))
                }
              />
            </Field>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
            Active in mystery picker
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-600">{label}</Label>
      {children}
    </div>
  );
}
