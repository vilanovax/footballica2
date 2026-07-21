"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

/**
 * Clickable table header that drives the `sort`/`dir` URL params. First click
 * sorts ascending; clicking the active column again toggles direction.
 */
export function SortableHeader({
  label,
  sortKey,
  className,
}: {
  label: string;
  sortKey: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const active = params.get("sort") === sortKey;
  const dir = (params.get("dir") as SortDir) || "asc";

  function toggle() {
    const sp = new URLSearchParams(params.toString());
    const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";
    sp.set("sort", sortKey);
    sp.set("dir", nextDir);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors",
        active ? "text-slate-900" : "text-slate-500 hover:text-slate-700",
        className,
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  );
}
