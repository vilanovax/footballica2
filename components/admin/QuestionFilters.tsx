"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/admin/AdminHelpTip";

type Option = { id: string; nameEn: string; nameFa: string };

const ALL = "all";

const STATUSES = [
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "RETIRED", label: "Retired" },
] as const;

const TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "IMAGE", label: "Image" },
  { value: "CAREER_PATH", label: "Career path" },
  { value: "HIGHER_LOWER", label: "Higher / Lower" },
  { value: "REVEAL_IMAGE", label: "Reveal image" },
] as const;

const DIFFICULTIES = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
] as const;

export function QuestionFilters({
  categories,
  tags,
  category,
  tag,
  status,
  type,
  difficulty,
}: {
  categories: Option[];
  tags: Option[];
  category?: string;
  tag?: string;
  status?: string;
  type?: string;
  difficulty?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    const next = new URLSearchParams(params.toString());
    for (const key of [
      "category",
      "tag",
      "status",
      "type",
      "difficulty",
      "q",
      "page",
    ]) {
      next.delete(key);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const categoryLabel = categories.find((c) => c.id === category)?.nameEn;
  const tagLabel = tags.find((t) => t.id === tag)?.nameEn;
  const statusLabel = STATUSES.find((s) => s.value === status)?.label;
  const typeLabel = TYPES.find((t) => t.value === type)?.label;
  const difficultyLabel = DIFFICULTIES.find(
    (d) => d.value === difficulty,
  )?.label;
  const q = params.get("q")?.trim() || "";

  const chips: { key: string; label: string }[] = [];
  if (q) chips.push({ key: "q", label: `Search: “${q}”` });
  if (type && typeLabel) chips.push({ key: "type", label: typeLabel });
  if (status && statusLabel) chips.push({ key: "status", label: statusLabel });
  if (difficulty && difficultyLabel)
    chips.push({ key: "difficulty", label: difficultyLabel });
  if (category && categoryLabel)
    chips.push({ key: "category", label: categoryLabel });
  if (tag && tagLabel) chips.push({ key: "tag", label: `#${tagLabel}` });

  const hasFilters = chips.length > 0;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <FilterSelect
          label="Format"
          tipTitle="Format"
          tip="TEXT is classic MCQ. IMAGE / REVEAL need media. CAREER_PATH and Higher/Lower use JSON payloads in content."
          value={type ?? ALL}
          onChange={(v) => setParam("type", v)}
          placeholder="All formats"
          items={[
            { value: ALL, label: "All formats" },
            ...TYPES.map((t) => ({ value: t.value, label: t.label })),
          ]}
        />
        <FilterSelect
          label="Status"
          tipTitle="Status"
          tip="Published questions can appear in matches. Draft / In review stay out of the live bank. Retired is soft-removed."
          value={status ?? ALL}
          onChange={(v) => setParam("status", v)}
          placeholder="All statuses"
          items={[
            { value: ALL, label: "All statuses" },
            ...STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />
        <FilterSelect
          label="Difficulty"
          tipTitle="Difficulty"
          tip="Authored bucket used in draws."
          value={difficulty ?? ALL}
          onChange={(v) => setParam("difficulty", v)}
          placeholder="All difficulties"
          items={[
            { value: ALL, label: "All difficulties" },
            ...DIFFICULTIES.map((d) => ({ value: d.value, label: d.label })),
          ]}
        />
        <FilterSelect
          label="Category"
          tipTitle="Category"
          tip="Topic bucket used for Survival, Duel drafts, and Match Day draws."
          value={category ?? ALL}
          onChange={(v) => setParam("category", v)}
          placeholder="All categories"
          items={[
            { value: ALL, label: "All categories" },
            ...categories.map((c) => ({ value: c.id, label: c.nameEn })),
          ]}
        />
        <FilterSelect
          label="Tag"
          tipTitle="Tag"
          tip="Optional labels for Live-Ops filtering (e.g. World Cup, Classics)."
          value={tag ?? ALL}
          onChange={(v) => setParam("tag", v)}
          placeholder="All tags"
          items={[
            { value: ALL, label: "All tags" },
            ...tags.map((t) => ({ value: t.id, label: t.nameEn })),
          ]}
        />
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setParam(chip.key, ALL)}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-slate-900 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700"
              title="Remove filter"
            >
              {chip.label}
              <X className="h-3 w-3 opacity-70" />
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 text-xs text-slate-500"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  tipTitle,
  tip,
  value,
  onChange,
  placeholder,
  items,
}: {
  label: string;
  tipTitle: string;
  tip: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  items: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-0">
      <FieldLabel tipTitle={tipTitle} tip={tip}>
        {label}
      </FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full border-slate-200 bg-slate-50/80 text-xs font-medium shadow-none">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
