"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Plus,
  Power,
  Search,
  UserRound,
} from "lucide-react";
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

const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;

const POS_TONE: Record<string, string> = {
  GK: "bg-amber-50 text-amber-800 ring-amber-200",
  DEF: "bg-sky-50 text-sky-800 ring-sky-200",
  MID: "bg-violet-50 text-violet-800 ring-violet-200",
  FWD: "bg-rose-50 text-rose-800 ring-rose-200",
};

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

function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

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

type StatusFilter = "all" | "active" | "off";
type PosFilter = "all" | (typeof POSITIONS)[number];

export function PlayersPanel({
  initialPlayers,
}: {
  initialPlayers: FootballPlayerAdminRow[];
}) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [posFilter, setPosFilter] = useState<PosFilter>("all");
  const [open, setOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState<PlayerWriteInput>(EMPTY);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qFa = query.trim();
    return players.filter((p) => {
      if (statusFilter === "active" && !p.isActive) return false;
      if (statusFilter === "off" && p.isActive) return false;
      if (posFilter !== "all" && p.position !== posFilter) return false;
      if (!q && !qFa) return true;
      return (
        p.slug.includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.nameFa.includes(qFa) ||
        p.club.toLowerCase().includes(q) ||
        p.league.toLowerCase().includes(q) ||
        p.nationalityCode.toLowerCase().includes(q) ||
        p.nationality.toLowerCase().includes(q)
      );
    });
  }, [players, query, statusFilter, posFilter]);

  function openCreate() {
    setEditingSlug(null);
    setSlugTouched(false);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(p: FootballPlayerAdminRow) {
    setEditingSlug(p.slug);
    setSlugTouched(true);
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, slug, club, nation…"
            className="h-9 ps-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-9 w-[7.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="off">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={posFilter}
          onValueChange={(v) => setPosFilter(v as PosFilter)}
        >
          <SelectTrigger className="h-9 w-[6.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pos</SelectItem>
            {POSITIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={openCreate} className="h-9 gap-1.5">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9">Player</TableHead>
              <TableHead className="h-9 w-14">Pos</TableHead>
              <TableHead className="h-9">Club</TableHead>
              <TableHead className="h-9 hidden w-24 sm:table-cell">
                Nation
              </TableHead>
              <TableHead className="h-9 w-20">Age / #</TableHead>
              <TableHead className="h-9 w-16">On</TableHead>
              <TableHead className="h-9 w-[5.5rem] text-end"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-36 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <UserRound className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-700">
                      No players match
                    </p>
                    <p className="text-xs">
                      Clear filters or add a new player.
                    </p>
                    {(query || statusFilter !== "all" || posFilter !== "all") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-1"
                        onClick={() => {
                          setQuery("");
                          setStatusFilter("all");
                          setPosFilter("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow
                  key={p.slug}
                  className={[
                    "group cursor-pointer",
                    p.isActive ? "" : "bg-slate-50/80 opacity-70",
                  ].join(" ")}
                  onClick={() => openEdit(p)}
                >
                  <TableCell className="py-2.5">
                    <p className="font-medium leading-tight text-slate-900">
                      {p.nameEn}
                    </p>
                    <p className="mt-0.5 text-xs leading-tight text-slate-500">
                      <span dir="rtl">{p.nameFa}</span>
                      <span className="mx-1 text-slate-300">·</span>
                      <code className="text-[11px] text-slate-400">
                        {p.slug}
                      </code>
                    </p>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span
                      className={[
                        "inline-flex rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ring-1 ring-inset",
                        POS_TONE[p.position] ?? "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {p.position}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <p className="text-sm leading-tight text-slate-800">
                      {p.club}
                    </p>
                    <p className="text-[11px] text-slate-500">{p.league}</p>
                  </TableCell>
                  <TableCell className="hidden py-2.5 sm:table-cell">
                    <span
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700"
                      title={p.nationality}
                    >
                      {p.nationalityCode}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm tabular-nums text-slate-700">
                    {p.age}
                    <span className="text-slate-300"> / </span>#{p.shirtNumber}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span
                      className={[
                        "inline-block h-2 w-2 rounded-full",
                        p.isActive ? "bg-emerald-500" : "bg-slate-300",
                      ].join(" ")}
                      title={p.isActive ? "Active" : "Disabled"}
                    />
                  </TableCell>
                  <TableCell
                    className="py-2.5 text-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={pending}
                        title="Edit"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={[
                          "h-8 w-8",
                          p.isActive
                            ? "text-slate-500 hover:text-rose-600"
                            : "text-emerald-600 hover:text-emerald-700",
                        ].join(" ")}
                        disabled={pending}
                        title={p.isActive ? "Disable" : "Enable"}
                        onClick={() => toggleActive(p)}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
            Showing {filtered.length} of {players.length}
            <span className="ms-2 text-slate-300">·</span>
            <span className="ms-2">Click a row to edit</span>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSlug ? "Edit player" : "Add player"}
            </DialogTitle>
            {editingSlug ? (
              <p className="text-xs text-slate-500">
                Slug <code className="font-mono">{editingSlug}</code> is
                permanent
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Auto-slug from English name — edit before save if needed
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Identity
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name (EN)">
                  <Input
                    value={form.nameEn}
                    autoFocus={!editingSlug}
                    onChange={(e) => {
                      const nameEn = e.target.value;
                      setForm((f) => ({
                        ...f,
                        nameEn,
                        slug:
                          !editingSlug && !slugTouched
                            ? slugify(nameEn)
                            : f.slug,
                      }));
                    }}
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
                <Field label="Slug">
                  <Input
                    value={form.slug}
                    disabled={!!editingSlug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((f) => ({ ...f, slug: e.target.value }));
                    }}
                    placeholder="messi"
                    className="font-mono text-sm"
                  />
                </Field>
                <Field label="Position">
                  <Select
                    value={form.position}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, position: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Club & nation
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Club">
                  <Input
                    value={form.club}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, club: e.target.value }))
                    }
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
                      setForm((f) => ({
                        ...f,
                        nationalityCode: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="AR"
                    maxLength={3}
                    className="font-mono uppercase"
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
            </section>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="h-4 w-4 accent-slate-900"
              />
              <span>
                <span className="font-medium text-slate-800">
                  Active in picker
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Off = hidden from Mystery guesses & auto-publish
                </span>
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
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
