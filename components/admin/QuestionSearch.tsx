"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Debounced full-text search over the question prompt (EN + FA). Writes to the
 * `q` URL param and resets `page`, so the server re-queries a single page.
 */
export function QuestionSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const initial = params.get("q") ?? "";
  const [value, setValue] = useState(initial);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in sync when the param changes from elsewhere (e.g. Clear).
  useEffect(() => {
    setValue(params.get("q") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get("q")]);

  function push(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next.trim()) sp.set("q", next.trim());
    else sp.delete("q");
    sp.delete("page");
    const qs = sp.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  function onChange(next: string) {
    setValue(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push(next), 350);
  }

  function clear() {
    if (debounce.current) clearTimeout(debounce.current);
    setValue("");
    push("");
  }

  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center ps-3 text-slate-400">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search EN or FA text…"
        className="h-9 border-slate-200 bg-white ps-9 pe-9"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="absolute inset-y-0 inset-e-0 flex items-center pe-3 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
