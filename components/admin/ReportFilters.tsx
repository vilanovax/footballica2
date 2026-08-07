"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

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
    if (key === "PENDING") next.delete("status");
    else next.set("status", key);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100/90 p-1 ring-1 ring-slate-200/80"
      role="tablist"
      aria-label="Report status"
    >
      {TABS.map((t) => {
        const isActive = active === t.key;
        const count = counts[t.key];
        const urgent = t.key === "PENDING" && count > 0 && !isActive;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => select(t.key)}
            className={[
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition",
              isActive
                ? "bg-white text-slate-900 shadow-sm"
                : urgent
                  ? "text-rose-800 hover:bg-rose-50"
                  : "text-slate-700 hover:bg-white/80 hover:text-slate-900",
            ].join(" ")}
          >
            {t.label}
            <span
              className={[
                "rounded-md px-1.5 text-[10px] font-bold tabular-nums",
                isActive
                  ? "bg-slate-900 text-white"
                  : urgent
                    ? "bg-rose-50 text-rose-950 ring-1 ring-rose-200"
                    : "bg-white text-slate-800 ring-1 ring-slate-200",
              ].join(" ")}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
