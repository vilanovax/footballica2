"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Windowed page list: 1 … 4 5 [6] 7 8 … 20 */
function pageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current]);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) items.push("ellipsis");
    items.push(p);
    prev = p;
  }
  return items;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefFor(p: number) {
    const sp = new URLSearchParams(params.toString());
    if (p <= 1) sp.delete("page");
    else sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const items = pageItems(page, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t bg-slate-50/60 px-4 py-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-slate-700">
          {start.toLocaleString("en-US")}–{end.toLocaleString("en-US")}
        </span>{" "}
        of{" "}
        <span className="font-medium text-slate-700">
          {total.toLocaleString("en-US")}
        </span>
      </p>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <PageLink
            href={hrefFor(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </PageLink>

          {items.map((it, i) =>
            it === "ellipsis" ? (
              <span
                key={`e${i}`}
                className="px-1.5 text-sm text-slate-400 select-none"
              >
                …
              </span>
            ) : (
              <PageLink key={it} href={hrefFor(it)} active={it === page}>
                {it}
              </PageLink>
            ),
          )}

          <PageLink
            href={hrefFor(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
} & React.ComponentProps<typeof Link>) {
  const cls = cn(
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm font-medium transition",
    active
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
    disabled && "pointer-events-none opacity-40",
  );

  if (disabled) {
    return (
      <span className={cls} aria-disabled {...(rest as object)}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
