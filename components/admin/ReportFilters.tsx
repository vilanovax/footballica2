"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type ReportFilterKey = "PENDING" | "RESOLVED" | "REJECTED" | "ALL";

const TABS: { key: ReportFilterKey; label: string }[] = [
  { key: "PENDING", label: "New" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

export function ReportFilters({
  active,
  counts,
}: {
  active: ReportFilterKey;
  counts: Record<ReportFilterKey, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function select(key: ReportFilterKey) {
    const next = new URLSearchParams(params.toString());
    // PENDING is the default view, so it stays out of the URL.
    if (key === "PENDING") next.delete("status");
    else next.set("status", key);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-sm">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => select(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              isActive
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs tabular-nums",
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
              )}
            >
              {counts[t.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
