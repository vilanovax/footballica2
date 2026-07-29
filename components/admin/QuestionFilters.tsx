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

export function QuestionFilters({
  categories,
  tags,
  category,
  tag,
  status,
  type,
}: {
  categories: Option[];
  tags: Option[];
  category?: string;
  tag?: string;
  status?: string;
  type?: string;
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

  const hasFilters = Boolean(category || tag || status || type);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[9.5rem]">
        <FieldLabel
          tipTitle="Format"
          tip="TEXT is classic MCQ. IMAGE / REVEAL need media. CAREER_PATH and Higher/Lower use JSON payloads in content."
        >
          Format
        </FieldLabel>
        <Select value={type ?? ALL} onValueChange={(v) => setParam("type", v)}>
          <SelectTrigger className="h-9 w-full bg-white">
            <SelectValue placeholder="All formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All formats</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[9.5rem]">
        <FieldLabel
          tipTitle="Status"
          tip="Published questions can appear in matches. Draft / In review stay out of the live bank. Retired is soft-removed."
        >
          Status
        </FieldLabel>
        <Select
          value={status ?? ALL}
          onValueChange={(v) => setParam("status", v)}
        >
          <SelectTrigger className="h-9 w-full bg-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[11rem]">
        <FieldLabel
          tipTitle="Category"
          tip="Topic bucket used for Survival, Duel drafts, and Match Day draws."
        >
          Category
        </FieldLabel>
        <Select
          value={category ?? ALL}
          onValueChange={(v) => setParam("category", v)}
        >
          <SelectTrigger className="h-9 w-full bg-white">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[9rem]">
        <FieldLabel
          tipTitle="Tag"
          tip="Optional labels for Live-Ops filtering (e.g. World Cup, Classics)."
        >
          Tag
        </FieldLabel>
        <Select value={tag ?? ALL} onValueChange={(v) => setParam("tag", v)}>
          <SelectTrigger className="h-9 w-full bg-white">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All tags</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.delete("category");
            next.delete("tag");
            next.delete("status");
            next.delete("type");
            next.delete("page");
            const qs = next.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname);
          }}
          className="h-9 text-slate-500"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
