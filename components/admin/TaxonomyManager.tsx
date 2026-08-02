"use client";

import {
  forwardRef,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Search,
  Tags,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import {
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  toggleCategoryChallengeOnly,
  deleteCategory,
  createTag,
  updateTag,
  deleteTag,
} from "@/actions/admin/taxonomy";
import { slugify } from "@/lib/admin/taxonomySchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export type CategoryRow = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
  icon: string | null;
  isActive: boolean;
  challengeOnly: boolean;
  locales: string[];
  count: number;
};

export type TagRow = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
  count: number;
};

type TabId = "categories" | "tags";
type ScopeFilter = "all" | "public" | "challenge";
type StatusFilter = "all" | "active" | "off";

// ─── Category create/edit dialog ─────────────────────────────────────────────

function CategoryFormDialog({
  category,
  trigger,
}: {
  category?: CategoryRow;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(category);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [nameEn, setNameEn] = useState(category?.nameEn ?? "");
  const [nameFa, setNameFa] = useState(category?.nameFa ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [challengeOnly, setChallengeOnly] = useState(
    category?.challengeOnly ?? false,
  );
  const [locales, setLocales] = useState<string[]>(
    category?.locales?.length ? [...category.locales] : ["en", "fa"],
  );
  const [slugTouched, setSlugTouched] = useState(isEdit);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setNameEn(category?.nameEn ?? "");
      setNameFa(category?.nameFa ?? "");
      setIcon(category?.icon ?? "");
      setSlug(category?.slug ?? "");
      setChallengeOnly(category?.challengeOnly ?? false);
      setLocales(
        category?.locales?.length ? [...category.locales] : ["en", "fa"],
      );
      setSlugTouched(isEdit);
    }
  }

  const effectiveSlug = slugTouched ? slug : slugify(nameEn);

  function toggleLocale(code: "en" | "fa") {
    setLocales((prev) => {
      if (prev.includes(code)) {
        const next = prev.filter((l) => l !== code);
        return next.length === 0 ? prev : next;
      }
      return [...prev, code];
    });
  }

  function submit() {
    start(async () => {
      const payload = {
        slug: slugify(effectiveSlug),
        nameEn: nameEn.trim(),
        nameFa: nameFa.trim(),
        icon: icon.trim() || null,
        isActive: category?.isActive ?? true,
        challengeOnly,
        locales: locales as ("en" | "fa")[],
      };
      const res = isEdit
        ? await updateCategory(category!.id, payload)
        : await createCategory(payload);
      if (res.ok) {
        toast.success(isEdit ? "Category updated." : "Category created.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent dir="ltr" className="admin">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Groups questions in the bank.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>English</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="World Cup"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Persian</Label>
              <Input
                dir="rtl"
                value={nameFa}
                onChange={(e) => setNameFa(e.target.value)}
                placeholder="جام جهانی"
              />
            </div>
          </div>

          <div className="grid grid-cols-[4rem_1fr] gap-3">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🏆"
                className="text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="world-cup"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lang
              </span>
              <AdminHelpTip text="Only checked languages see this bank in pickers." />
              {(
                [
                  { code: "en" as const, label: "EN" },
                  { code: "fa" as const, label: "FA" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.code}
                  className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={locales.includes(opt.code)}
                    onChange={() => toggleLocale(opt.code)}
                    className="size-3.5 rounded border-slate-300"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={challengeOnly}
                onChange={(e) => setChallengeOnly(e.target.checked)}
                className="size-3.5 rounded border-slate-300"
              />
              Challenge only
              <AdminHelpTip text="Hidden from free Survival & Duel — assign via Premium Challenge." />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={
              pending ||
              !nameEn.trim() ||
              !nameFa.trim() ||
              locales.length === 0
            }
          >
            {pending ? "Saving…" : isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tag create/edit dialog ──────────────────────────────────────────────────

function TagFormDialog({
  tag,
  trigger,
}: {
  tag?: TagRow;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(tag);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [nameEn, setNameEn] = useState(tag?.nameEn ?? "");
  const [nameFa, setNameFa] = useState(tag?.nameFa ?? "");
  const [slug, setSlug] = useState(tag?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setNameEn(tag?.nameEn ?? "");
      setNameFa(tag?.nameFa ?? "");
      setSlug(tag?.slug ?? "");
      setSlugTouched(isEdit);
    }
  }

  const effectiveSlug = slugTouched ? slug : slugify(nameEn);

  function submit() {
    start(async () => {
      const payload = {
        slug: slugify(effectiveSlug),
        nameEn: nameEn.trim(),
        nameFa: nameFa.trim(),
      };
      const res = isEdit
        ? await updateTag(tag!.id, payload)
        : await createTag(payload);
      if (res.ok) {
        toast.success(isEdit ? "Tag updated." : "Tag created.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent dir="ltr" className="admin">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit tag" : "New tag"}</DialogTitle>
          <DialogDescription>
            Label attached to many questions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>English</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Nostalgia"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Persian</Label>
              <Input
                dir="rtl"
                value={nameFa}
                onChange={(e) => setNameFa(e.target.value)}
                placeholder="نوستالژی"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="nostalgia"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={pending || !nameEn.trim() || !nameFa.trim()}
          >
            {pending ? "Saving…" : isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row controls ────────────────────────────────────────────────────────────

function CategoryStatusToggle({ category }: { category: CategoryRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const active = category.isActive;

  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          const res = await toggleCategoryStatus(category.id, !active);
          if (res.ok) {
            toast.success(active ? "Off" : "On");
            router.refresh();
          } else toast.error(res.error);
        })
      }
      disabled={pending}
      title={active ? "Deactivate" : "Activate"}
      aria-label={active ? "Deactivate" : "Activate"}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition",
        active
          ? "text-emerald-600 hover:bg-emerald-50"
          : "text-slate-300 hover:bg-slate-100 hover:text-slate-500",
      ].join(" ")}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : active ? (
        <ToggleRight className="h-5 w-5" />
      ) : (
        <ToggleLeft className="h-5 w-5" />
      )}
    </button>
  );
}

function ChallengeOnlyToggle({ category }: { category: CategoryRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const on = category.challengeOnly;

  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          const res = await toggleCategoryChallengeOnly(category.id, !on);
          if (res.ok) {
            toast.success(on ? "Public" : "Challenge only");
            router.refresh();
          } else toast.error(res.error);
        })
      }
      disabled={pending}
      className={[
        "inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-bold transition",
        on
          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      ].join(" ")}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : on ? (
        "Challenge"
      ) : (
        "Public"
      )}
    </button>
  );
}

const IconBtn = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    destructive?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    children: ReactNode;
  }
>(function IconBtn(
  { label, destructive, disabled, onClick, children },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-40",
        destructive
          ? "text-rose-500 hover:bg-rose-50"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
});

function CategoryActions({ category }: { category: CategoryRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center justify-end gap-0.5">
      <CategoryFormDialog
        category={category}
        trigger={
          <IconBtn label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </IconBtn>
        }
      />
      <IconBtn
        label="Delete"
        destructive
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete “${category.nameEn}”?`)) return;
          start(async () => {
            const res = await deleteCategory(category.id);
            if (res.ok) {
              toast.success("Deleted");
              router.refresh();
            } else toast.error(res.error);
          });
        }}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </IconBtn>
    </div>
  );
}

function TagActions({ tag }: { tag: TagRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center justify-end gap-0.5">
      <TagFormDialog
        tag={tag}
        trigger={
          <IconBtn label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </IconBtn>
        }
      />
      <IconBtn
        label="Delete"
        destructive
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete “${tag.nameEn}”?`)) return;
          start(async () => {
            const res = await deleteTag(tag.id);
            if (res.ok) {
              toast.success("Deleted");
              router.refresh();
            } else toast.error(res.error);
          });
        }}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </IconBtn>
    </div>
  );
}

function BilingualName({
  en,
  fa,
  icon,
}: {
  en: string;
  fa: string;
  icon?: string | null;
}) {
  const same = en.trim().toLowerCase() === fa.trim().toLowerCase();
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {icon ? (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg"
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex flex-col leading-tight">
        <span className="truncate font-semibold text-slate-900">{en}</span>
        {!same && fa ? (
          <span className="truncate text-xs text-slate-500" dir="auto">
            {fa}
          </span>
        ) : null}
      </span>
    </span>
  );
}

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
        "inline-flex h-8 items-center rounded-full px-3 text-xs font-bold transition",
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function matchesQuery(
  q: string,
  ...fields: (string | null | undefined)[]
): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => (f ?? "").toLowerCase().includes(needle));
}

// ─── Manager ─────────────────────────────────────────────────────────────────

export function TaxonomyManager({
  categories,
  tags,
}: {
  categories: CategoryRow[];
  tags: TagRow[];
}) {
  const [tab, setTab] = useState<TabId>("categories");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const catStats = useMemo(() => {
    const active = categories.filter((c) => c.isActive).length;
    const challenge = categories.filter((c) => c.challengeOnly).length;
    const qs = categories.reduce((n, c) => n + c.count, 0);
    return { active, challenge, qs, total: categories.length };
  }, [categories]);

  const tagStats = useMemo(() => {
    const qs = tags.reduce((n, t) => n + t.count, 0);
    return { total: tags.length, qs };
  }, [tags]);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (scope === "public" && c.challengeOnly) return false;
      if (scope === "challenge" && !c.challengeOnly) return false;
      if (status === "active" && !c.isActive) return false;
      if (status === "off" && c.isActive) return false;
      return matchesQuery(query, c.nameEn, c.nameFa, c.slug);
    });
  }, [categories, query, scope, status]);

  const filteredTags = useMemo(() => {
    return tags.filter((t) =>
      matchesQuery(query, t.nameEn, t.nameFa, t.slug),
    );
  }, [tags, query]);

  return (
    <div className="space-y-4">
      {/* Tabs + primary CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setTab("categories");
              setQuery("");
            }}
            className={[
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition",
              tab === "categories"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            <FolderOpen className="h-4 w-4" />
            Categories
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-600">
              {catStats.total}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("tags");
              setQuery("");
            }}
            className={[
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition",
              tab === "tags"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            <Tags className="h-4 w-4" />
            Tags
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-600">
              {tagStats.total}
            </span>
          </button>
        </div>

        {tab === "categories" ? (
          <CategoryFormDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New category
              </Button>
            }
          />
        ) : (
          <TagFormDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New tag
              </Button>
            }
          />
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "categories"
                ? "Search categories…"
                : "Search tags…"
            }
            className="h-9 ps-9"
          />
        </div>

        {tab === "categories" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              active={scope === "all"}
              onClick={() => setScope("all")}
            >
              All
            </FilterChip>
            <FilterChip
              active={scope === "public"}
              onClick={() => setScope("public")}
            >
              Public
            </FilterChip>
            <FilterChip
              active={scope === "challenge"}
              onClick={() => setScope("challenge")}
            >
              Challenge
            </FilterChip>
            <span className="mx-1 h-4 w-px bg-slate-200" />
            <FilterChip
              active={status === "all"}
              onClick={() => setStatus("all")}
            >
              Any
            </FilterChip>
            <FilterChip
              active={status === "active"}
              onClick={() => setStatus("active")}
            >
              On
            </FilterChip>
            <FilterChip
              active={status === "off"}
              onClick={() => setStatus("off")}
            >
              Off
            </FilterChip>
          </div>
        ) : (
          <p className="text-xs font-medium text-slate-500">
            {tagStats.qs.toLocaleString()} question links
          </p>
        )}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {tab === "categories" ? (
          filteredCategories.length === 0 ? (
            <EmptyState
              title={query || scope !== "all" || status !== "all"
                ? "No matches"
                : "No categories yet"}
              hint={
                query || scope !== "all" || status !== "all"
                  ? "Try clearing search or filters."
                  : "Create a bank to group questions."
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredCategories.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
                >
                  <div className="min-w-0 flex-1">
                    <BilingualName
                      en={c.nameEn}
                      fa={c.nameFa}
                      icon={c.icon}
                    />
                    <p className="mt-0.5 truncate ps-[2.875rem] font-mono text-[11px] text-slate-400">
                      {c.slug}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="min-w-[3.25rem] text-center text-sm font-bold tabular-nums text-slate-700">
                      {c.count}
                      <span className="ms-0.5 text-[10px] font-semibold uppercase text-slate-400">
                        q
                      </span>
                    </span>

                    <div className="flex gap-1">
                      {c.locales.includes("en") ? (
                        <Badge
                          variant="outline"
                          className="h-6 px-1.5 text-[10px] font-bold"
                        >
                          EN
                        </Badge>
                      ) : null}
                      {c.locales.includes("fa") ? (
                        <Badge
                          variant="outline"
                          className="h-6 px-1.5 text-[10px] font-bold"
                        >
                          FA
                        </Badge>
                      ) : null}
                    </div>

                    <ChallengeOnlyToggle category={c} />
                    <CategoryStatusToggle category={c} />
                    <CategoryActions category={c} />
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : filteredTags.length === 0 ? (
          <EmptyState
            title={query ? "No matches" : "No tags yet"}
            hint={
              query
                ? "Try another search."
                : "Create one, or they’ll appear from imports."
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredTags.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <BilingualName en={t.nameEn} fa={t.nameFa} />
                  <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                    {t.slug}
                  </p>
                </div>
                <span className="min-w-[3.25rem] text-center text-sm font-bold tabular-nums text-slate-700">
                  {t.count}
                  <span className="ms-0.5 text-[10px] font-semibold uppercase text-slate-400">
                    q
                  </span>
                </span>
                <TagActions tag={t} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {tab === "categories" && (
        <p className="px-1 text-xs text-slate-500">
          Showing {filteredCategories.length} of {catStats.total} ·{" "}
          {catStats.active} on · {catStats.challenge} challenge ·{" "}
          {catStats.qs.toLocaleString()} questions
        </p>
      )}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}
