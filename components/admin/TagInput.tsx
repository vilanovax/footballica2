"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Optional hint under the field. */
  hint?: string;
  disabled?: boolean;
  id?: string;
};

/**
 * Chip/tag input — type a value and press Enter (or comma) to add.
 * Used for FootballPlayer pastClubs / trophies in Admin.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter…",
  hint,
  disabled,
  id,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    const exists = value.some(
      (v) => v.toLowerCase() === tag.toLowerCase(),
    );
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft.replace(/,/g, ""));
      return;
    }
    if (e.key === "Backspace" && !draft && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring/40">
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-slate-200"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeTag(i)}
              aria-label={`Remove ${tag}`}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <Input
          id={id}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addTag(draft);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </div>
      {hint ? (
        <p className="text-[11px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
