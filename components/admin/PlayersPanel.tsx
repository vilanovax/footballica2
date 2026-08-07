"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Plus,
  Power,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  listAdminPlayers,
  seedGridPlayersCatalog,
  setFootballPlayerActive,
  upsertFootballPlayer,
} from "@/actions/admin/players";
import type {
  FootballPlayerAdminRow,
  PlayerWriteInput,
} from "@/lib/mystery/players";
import { TagInput } from "@/components/admin/TagInput";
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
  GK: "bg-amber-50 text-amber-950 ring-amber-200",
  DEF: "bg-sky-50 text-sky-950 ring-sky-200",
  MID: "bg-violet-50 text-violet-950 ring-violet-200",
  FWD: "bg-rose-50 text-rose-950 ring-rose-200",
};

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-7 items-center rounded-md px-2.5 text-[11px] font-bold transition",
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

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
  pastClubs: [],
  trophies: [],
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
    case "past_clubs_limit":
      return "Too many past clubs (max 40).";
    case "trophies_limit":
      return "Too many trophies (max 40).";
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

  const posCounts = useMemo(() => {
    const counts: Record<string, number> = { all: players.length };
    for (const pos of POSITIONS) {
      counts[pos] = players.filter((p) => p.position === pos).length;
    }
    return counts;
  }, [players]);

  const activeCount = useMemo(
    () => players.filter((p) => p.isActive).length,
    [players],
  );

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
      pastClubs: p.pastClubs ?? [],
      trophies: p.trophies ?? [],
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

  function seedGridPack() {
    startTransition(async () => {
      const res = await seedGridPlayersCatalog();
      if (!res.ok) {
        toast.error(errorMessage(res.error));
        return;
      }
      const next = await listAdminPlayers();
      setPlayers(next);
      toast.success(`Seeded ${res.upserted} Grid players`);
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={seedGridPack}
          disabled={pending}
          className="h-9 gap-1.5 border-slate-200 bg-white"
          title="Upsert Özil, Ronaldo, Messi… with career + trophies"
        >
          <Sparkles className="h-4 w-4 text-amber-700" />
          Seed Grid pack
        </Button>
        <Button
          type="button"
          onClick={openCreate}
          className="h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Add player
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-3.5 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
            Search & filters
          </p>
          <p className="text-[11px] font-semibold text-slate-700">
            {filtered.length} shown · {activeCount} active
          </p>
        </header>
        <div className="flex flex-col gap-2.5 p-3">
          <div className="relative min-w-0 sm:max-w-md">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, slug, club, nation…"
              className="h-9 border-slate-200 bg-white ps-9 shadow-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              Any
            </FilterChip>
            <FilterChip
              active={statusFilter === "active"}
              onClick={() => setStatusFilter("active")}
            >
              On
            </FilterChip>
            <FilterChip
              active={statusFilter === "off"}
              onClick={() => setStatusFilter("off")}
            >
              Off
            </FilterChip>
            <span className="mx-0.5 h-4 w-px bg-slate-200" />
            <FilterChip
              active={posFilter === "all"}
              onClick={() => setPosFilter("all")}
            >
              All ({posCounts.all})
            </FilterChip>
            {POSITIONS.map((pos) => (
              <FilterChip
                key={pos}
                active={posFilter === pos}
                onClick={() => setPosFilter(pos)}
              >
                {pos}
                <span className="ms-1 tabular-nums text-inherit opacity-80">
                  {posCounts[pos]}
                </span>
              </FilterChip>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                Player
              </TableHead>
              <TableHead className="h-8 w-14 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                Pos
              </TableHead>
              <TableHead className="h-8 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                Club
              </TableHead>
              <TableHead className="hidden h-8 w-20 text-[11px] font-bold uppercase tracking-wide text-slate-700 sm:table-cell">
                Nation
              </TableHead>
              <TableHead className="h-8 w-[4.5rem] text-[11px] font-bold uppercase tracking-wide text-slate-700">
                Age / #
              </TableHead>
              <TableHead className="h-8 w-12 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                On
              </TableHead>
              <TableHead className="h-8 w-[5rem] text-end"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-1.5 py-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200">
                      <UserRound className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-semibold text-slate-800">
                      No players match
                    </p>
                    <p className="text-xs font-medium text-slate-700">
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
                    "group cursor-pointer border-slate-100 transition-colors hover:bg-white",
                    p.isActive ? "" : "opacity-55",
                  ].join(" ")}
                  onClick={() => openEdit(p)}
                >
                  <TableCell className="py-2">
                    <p className="text-sm font-semibold leading-tight text-slate-900">
                      {p.nameEn}
                      {p.nameFa ? (
                        <span
                          className="ms-1.5 font-medium text-slate-600"
                          dir="auto"
                        >
                          · {p.nameFa}
                        </span>
                      ) : null}
                    </p>
                    <code className="mt-0.5 block truncate font-mono text-[11px] text-slate-500">
                      {p.slug}
                    </code>
                  </TableCell>
                  <TableCell className="py-2">
                    <span
                      className={[
                        "inline-flex rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ring-1",
                        POS_TONE[p.position] ??
                          "bg-white text-slate-800 ring-slate-200",
                      ].join(" ")}
                    >
                      {p.position}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <p className="text-sm font-medium leading-tight text-slate-800">
                      {p.club}
                    </p>
                    <p className="text-[11px] text-slate-600">{p.league}</p>
                  </TableCell>
                  <TableCell className="hidden py-2 sm:table-cell">
                    <span
                      className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800 ring-1 ring-slate-200"
                      title={p.nationality}
                    >
                      {p.nationalityCode}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-xs font-semibold tabular-nums text-slate-800">
                    {p.age}
                    <span className="text-slate-500"> / </span>
                    <span className="text-slate-700">#{p.shirtNumber}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span
                      className={[
                        "inline-block h-2 w-2 rounded-full ring-2 ring-offset-1",
                        p.isActive
                          ? "bg-emerald-500 ring-emerald-200"
                          : "bg-slate-300 ring-slate-200",
                      ].join(" ")}
                      title={p.isActive ? "Active" : "Disabled"}
                    />
                  </TableCell>
                  <TableCell
                    className="py-2 text-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-700 hover:bg-white hover:text-slate-900"
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
                            ? "text-rose-800 hover:bg-white hover:text-rose-950"
                            : "text-emerald-800 hover:bg-white hover:text-emerald-950",
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
          <div className="border-t border-slate-100 bg-white px-3.5 py-2 text-[11px] font-medium text-slate-700">
            Showing {filtered.length} of {players.length}
            <span className="mx-1.5 text-slate-500">·</span>
            Click a row to edit
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSlug ? "Edit player" : "Add player"}
            </DialogTitle>
            {editingSlug ? (
              <p className="text-xs text-slate-700">
                Slug <code className="font-mono">{editingSlug}</code> is
                permanent
              </p>
            ) : (
              <p className="text-xs text-slate-700">
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

            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Career & trophies (Grid)
              </p>
              <Field label="Past clubs">
                <TagInput
                  value={form.pastClubs}
                  onChange={(pastClubs) =>
                    setForm((f) => ({ ...f, pastClubs }))
                  }
                  disabled={pending}
                  placeholder="e.g. Real Madrid → Enter"
                  hint="Clubs the player has played for (incl. current). Used for Immortal intersections."
                />
              </Field>
              <Field label="Trophies">
                <TagInput
                  value={form.trophies}
                  onChange={(trophies) =>
                    setForm((f) => ({ ...f, trophies }))
                  }
                  disabled={pending}
                  placeholder="e.g. UCL → Enter"
                  hint="Major achievements as short labels (World Cup, UCL, Ballon d'Or…)."
                />
              </Field>
            </section>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
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
                <span className="mt-0.5 block text-xs text-slate-700">
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
