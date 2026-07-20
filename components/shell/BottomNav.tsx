"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Play, Settings } from "lucide-react";

const tabs = [
  {
    href: "/club",
    label: "Club",
    icon: Home,
  },
  {
    href: "/play",
    label: "Play",
    icon: Play,
    featured: true,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-mobile px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-end justify-between gap-1 rounded-bubble-xl border border-border bg-nav/95 px-2 py-2 shadow-nav-float backdrop-blur-md">
        {tabs.map(({ href, label, icon: Icon, ...rest }) => {
          const featured = "featured" in rest && rest.featured;
          const active =
            pathname === href || pathname.startsWith(`${href}/`);

          if (featured) {
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative -mt-5 flex min-h-touch min-w-[4.5rem] flex-col items-center gap-1"
              >
                <span
                  className={[
                    "flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-btn-secondary transition-transform",
                    "active:translate-y-1 active:shadow-fantasy-press",
                    active ? "ring-4 ring-accent/70" : "",
                  ].join(" ")}
                >
                  <Icon className="h-7 w-7 fill-white/20" strokeWidth={2.5} />
                </span>
                <span className="font-display text-xs font-semibold text-accent-deep">
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-h-touch min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-bubble px-2 py-2 transition-colors",
                active
                  ? "text-nav-active"
                  : "text-nav-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.75 : 2} />
              <span className="font-display text-xs font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
