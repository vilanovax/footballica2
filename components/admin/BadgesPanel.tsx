"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  ImagePlus,
  Save,
  Search,
  Settings2,
} from "lucide-react";
import {
  updateBadgeDefinition,
  uploadBadgeImage,
  type AdminBadge,
} from "@/actions/admin/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AdminHelpTip, FieldLabel } from "@/components/admin/AdminHelpTip";

type BadgesPanelProps = {
  initialBadges: AdminBadge[];
};

type FormState = {
  nameEn: string;
  nameFa: string;
  descriptionEn: string;
  descriptionFa: string;
  emoji: string;
  imageUrl: string;
  rewardCoins: string;
  rewardXp: string;
  category: string;
  tier: string;
  isActive: boolean;
  sortOrder: string;
};

type StatusFilter = "all" | "active" | "off";

function toForm(b: AdminBadge): FormState {
  return {
    nameEn: b.nameEn,
    nameFa: b.nameFa,
    descriptionEn: b.descriptionEn,
    descriptionFa: b.descriptionFa,
    emoji: b.emoji,
    imageUrl: b.imageUrl ?? "",
    rewardCoins: String(b.rewardCoins),
    rewardXp: String(b.rewardXp),
    category: b.category,
    tier: b.tier,
    isActive: b.isActive,
    sortOrder: String(b.sortOrder),
  };
}

const CATEGORIES = ["skill", "purity", "dedication", "volume", "showcase"];
const TIERS = ["bronze", "silver", "gold"];

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

/**
 * Admin badge editor — primary path: Look → Copy → Rewards → Save.
 * Category / tier / sort live under “More options”.
 */
export function BadgesPanel({ initialBadges }: BadgesPanelProps) {
  const router = useRouter();
  const [badges, setBadges] = useState(initialBadges);
  const [openId, setOpenId] = useState<string | null>(null);
  const [advancedId, setAdvancedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [forms, setForms] = useState<Record<string, FormState>>(() =>
    Object.fromEntries(initialBadges.map((b) => [b.id, toForm(b)])),
  );
  const [pending, startTransition] = useTransition();

  const sorted = useMemo(
    () =>
      [...badges].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug),
      ),
    [badges],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qFa = query.trim();
    return sorted.filter((b) => {
      const form = forms[b.id] ?? toForm(b);
      if (statusFilter === "active" && !form.isActive) return false;
      if (statusFilter === "off" && form.isActive) return false;
      if (categoryFilter !== "all" && form.category !== categoryFilter) {
        return false;
      }
      if (!q && !qFa) return true;
      return (
        b.slug.includes(q) ||
        form.nameEn.toLowerCase().includes(q) ||
        form.nameFa.includes(qFa) ||
        form.descriptionEn.toLowerCase().includes(q) ||
        form.category.toLowerCase().includes(q)
      );
    });
  }, [sorted, forms, query, statusFilter, categoryFilter]);

  function patchForm(id: string, patch: Partial<FormState>) {
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function save(badge: AdminBadge) {
    const form = forms[badge.id];
    if (!form) return;
    startTransition(async () => {
      const res = await updateBadgeDefinition({
        id: badge.id,
        nameEn: form.nameEn,
        nameFa: form.nameFa,
        descriptionEn: form.descriptionEn,
        descriptionFa: form.descriptionFa,
        emoji: form.emoji,
        imageUrl: form.imageUrl.trim() || null,
        rewardCoins: Number(form.rewardCoins) || 0,
        rewardXp: Number(form.rewardXp) || 0,
        category: form.category,
        tier: form.tier,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      });
      if (!res.ok || !res.badge) {
        toast.error(res.ok ? "Save failed" : res.error);
        return;
      }
      setBadges((list) =>
        list.map((b) => (b.id === res.badge!.id ? res.badge! : b)),
      );
      setForms((prev) => ({ ...prev, [res.badge!.id]: toForm(res.badge!) }));
      toast.success("Badge saved");
      router.refresh();
    });
  }

  function onUpload(badge: AdminBadge, file: File | null) {
    if (!file) return;
    const fd = new FormData();
    fd.set("id", badge.id);
    fd.set("file", file);
    startTransition(async () => {
      const res = await uploadBadgeImage(fd);
      if (!res.ok || !res.badge) {
        toast.error(res.ok ? "Upload failed" : res.error);
        return;
      }
      setBadges((list) =>
        list.map((b) => (b.id === res.badge!.id ? res.badge! : b)),
      );
      setForms((prev) => ({ ...prev, [res.badge!.id]: toForm(res.badge!) }));
      toast.success("Image uploaded");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
            Search & filters
          </p>
          <p className="text-[11px] font-semibold text-slate-700">
            {filtered.length} shown · {badges.length} total
          </p>
        </header>
        <div className="flex flex-col gap-2.5 p-3">
          <div className="relative min-w-0 sm:max-w-md">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, slug, category…"
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
              active={categoryFilter === "all"}
              onClick={() => setCategoryFilter("all")}
            >
              All cats
            </FilterChip>
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                active={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </FilterChip>
            ))}
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
          <p className="text-sm font-semibold text-slate-900">No badges match</p>
          <p className="text-xs font-medium text-slate-700">
            Clear search or filters.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((badge) => {
            const open = openId === badge.id;
            const advanced = advancedId === badge.id;
            const form = forms[badge.id] ?? toForm(badge);

            return (
              <Card
                key={badge.id}
                className={[
                  "overflow-hidden rounded-xl border-slate-200/90 shadow-sm",
                  open ? "ring-1 ring-slate-200" : "",
                  !form.isActive ? "opacity-75" : "",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(open ? null : badge.id);
                    if (open) setAdvancedId(null);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start"
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-700" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-700" />
                  )}
                  <BadgeArt
                    emoji={form.emoji}
                    imageUrl={form.imageUrl || badge.imageUrl}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900">
                        {form.nameEn}
                        {form.nameFa ? (
                          <span
                            className="ms-1.5 font-medium text-slate-700"
                            dir="auto"
                          >
                            · {form.nameFa}
                          </span>
                        ) : null}
                      </span>
                      {!form.isActive ? (
                        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-950 ring-1 ring-rose-200">
                          Off
                        </span>
                      ) : null}
                      <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold capitalize text-slate-800 ring-1 ring-slate-200">
                        {form.category}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-slate-700">
                      {form.descriptionEn}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-[11px] font-bold tabular-nums text-slate-800 sm:inline">
                    {form.rewardCoins}c
                    {Number(form.rewardXp) > 0
                      ? ` · ${form.rewardXp}XP`
                      : ""}
                  </span>
                </button>

                {open ? (
                  <CardContent className="space-y-4 border-t border-slate-100 bg-white px-3.5 py-3.5">
                    <section className="space-y-2.5">
                      <SectionLabel
                        step="1"
                        title="Look"
                        tipTitle="Icon"
                        tip="Upload a PNG/WebP (best) or keep an emoji fallback. Image always wins when set."
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <BadgeArt
                          emoji={form.emoji}
                          imageUrl={form.imageUrl || null}
                          size={64}
                        />
                        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
                          <div className="w-20">
                            <FieldLabel
                              tipTitle="Emoji"
                              tip="Used when there is no image."
                            >
                              Emoji
                            </FieldLabel>
                            <Input
                              value={form.emoji}
                              onChange={(e) =>
                                patchForm(badge.id, { emoji: e.target.value })
                              }
                              className="bg-white text-center text-lg"
                            />
                          </div>
                          <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-white">
                            <ImagePlus className="h-4 w-4" />
                            Upload image
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(e) =>
                                onUpload(badge, e.target.files?.[0] ?? null)
                              }
                            />
                          </label>
                          {form.imageUrl ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 text-slate-800"
                              onClick={() =>
                                patchForm(badge.id, { imageUrl: "" })
                              }
                            >
                              Clear image
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2.5">
                      <SectionLabel
                        step="2"
                        title="Titles & text"
                        tipTitle="Player-facing copy"
                        tip="Shown on the unlock popup and profile trophy cabinet. Keep FA natural — not a literal EN translation."
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <FieldLabel
                            tipTitle="English title"
                            tip="Short name, e.g. Hat-trick."
                          >
                            Title EN
                          </FieldLabel>
                          <Input
                            value={form.nameEn}
                            onChange={(e) =>
                              patchForm(badge.id, { nameEn: e.target.value })
                            }
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <FieldLabel
                            tipTitle="Persian title"
                            tip="Shown when app language is FA."
                          >
                            Title FA
                          </FieldLabel>
                          <Input
                            dir="rtl"
                            value={form.nameFa}
                            onChange={(e) =>
                              patchForm(badge.id, { nameFa: e.target.value })
                            }
                            className="bg-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <FieldLabel
                            tipTitle="English description"
                            tip="One line explaining how to earn it."
                          >
                            Description EN
                          </FieldLabel>
                          <Input
                            value={form.descriptionEn}
                            onChange={(e) =>
                              patchForm(badge.id, {
                                descriptionEn: e.target.value,
                              })
                            }
                            className="bg-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <FieldLabel
                            tipTitle="Persian description"
                            tip="Same meaning as EN, natural Persian."
                          >
                            Description FA
                          </FieldLabel>
                          <Input
                            dir="rtl"
                            value={form.descriptionFa}
                            onChange={(e) =>
                              patchForm(badge.id, {
                                descriptionFa: e.target.value,
                              })
                            }
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2.5">
                      <SectionLabel
                        step="3"
                        title="Unlock reward"
                        tipTitle="One-time payout"
                        tip="Paid only the first time a player unlocks this badge. Changing it later does not re-pay existing owners."
                      />
                      <div className="grid max-w-xs grid-cols-2 gap-3">
                        <div>
                          <FieldLabel
                            tipTitle="Coins"
                            tip="Soft currency on unlock."
                          >
                            Coins
                          </FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            value={form.rewardCoins}
                            onChange={(e) =>
                              patchForm(badge.id, {
                                rewardCoins: e.target.value,
                              })
                            }
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <FieldLabel tipTitle="XP" tip="Manager XP on unlock.">
                            XP
                          </FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            value={form.rewardXp}
                            onChange={(e) =>
                              patchForm(badge.id, {
                                rewardXp: e.target.value,
                              })
                            }
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </section>

                    <div className="rounded-lg border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          setAdvancedId(advanced ? null : badge.id)
                        }
                        className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm font-semibold text-slate-800"
                      >
                        <Settings2 className="h-4 w-4 text-slate-700" />
                        More options
                        <AdminHelpTip
                          title="Usually leave alone"
                          text="Category & tier affect profile grouping/colors. Sort is list position. Active hides the badge from new unlocks when off."
                        />
                        <span className="ms-auto text-[11px] font-semibold text-slate-700">
                          {advanced ? "Hide" : "Show"}
                        </span>
                      </button>
                      {advanced ? (
                        <div className="grid gap-3 border-t border-slate-100 p-3 sm:grid-cols-3">
                          <div>
                            <FieldLabel
                              tipTitle="Category"
                              tip="Profile trophy group."
                            >
                              Category
                            </FieldLabel>
                            <select
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                              value={form.category}
                              onChange={(e) =>
                                patchForm(badge.id, {
                                  category: e.target.value,
                                })
                              }
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <FieldLabel
                              tipTitle="Tier"
                              tip="Visual ring: bronze / silver / gold."
                            >
                              Tier
                            </FieldLabel>
                            <select
                              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                              value={form.tier}
                              onChange={(e) =>
                                patchForm(badge.id, { tier: e.target.value })
                              }
                            >
                              {TIERS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <FieldLabel
                              tipTitle="Sort"
                              tip="Lower numbers appear first in lists."
                            >
                              Sort
                            </FieldLabel>
                            <Input
                              type="number"
                              value={form.sortOrder}
                              onChange={(e) =>
                                patchForm(badge.id, {
                                  sortOrder: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <FieldLabel
                              tipTitle="Image URL"
                              tip="Filled by Upload. You can paste an external URL if needed."
                            >
                              Image URL
                            </FieldLabel>
                            <Input
                              placeholder="/badges/hat_trick.png"
                              value={form.imageUrl}
                              onChange={(e) =>
                                patchForm(badge.id, {
                                  imageUrl: e.target.value,
                                })
                              }
                            />
                          </div>
                          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-800">
                            <input
                              type="checkbox"
                              checked={form.isActive}
                              onChange={(e) =>
                                patchForm(badge.id, {
                                  isActive: e.target.checked,
                                })
                              }
                            />
                            Active
                            <AdminHelpTip
                              title="Active"
                              text="Off = hidden from new unlocks (already earned badges stay on the profile)."
                            />
                          </label>
                          <p className="sm:col-span-3 text-[11px] font-medium text-slate-700">
                            Slug{" "}
                            <code className="rounded bg-white px-1 ring-1 ring-slate-200">
                              {badge.slug}
                            </code>
                            {badge.isSystem ? " · unlock rule is in code" : ""}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-3">
                      <Button
                        type="button"
                        disabled={pending}
                        onClick={() => save(badge)}
                        className="h-9 min-w-[8rem] gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        <Save className="h-4 w-4" />
                        {pending ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionLabel({
  step,
  title,
  tipTitle,
  tip,
}: {
  step: string;
  title: string;
  tipTitle: string;
  tip: string;
}) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-700">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-800 ring-1 ring-slate-200">
        {step}
      </span>
      {title}
      <AdminHelpTip title={tipTitle} text={tip} />
    </p>
  );
}

function BadgeArt({
  emoji,
  imageUrl,
  size,
}: {
  emoji: string;
  imageUrl: string | null | undefined;
  size: number;
}) {
  const src = imageUrl?.trim() ? imageUrl : null;
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-b from-amber-100 to-amber-300 shadow-sm ring-2 ring-white"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.45 }}>{emoji}</span>
      )}
    </span>
  );
}
