"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Play, Trophy, Settings } from "lucide-react";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";

const tabs = [
  {
    href: "/club",
    labelKey: "nav.club",
    icon: Home,
  },
  {
    href: "/play",
    labelKey: "nav.play",
    icon: Play,
    featured: true,
  },
  {
    href: "/leaderboard",
    labelKey: "nav.ranks",
    icon: Trophy,
  },
  {
    href: "/settings",
    labelKey: "nav.settings",
    icon: Settings,
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  function handleTap() {
    playSound("click");
    haptic(HAPTIC.tap);
  }

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-mobile px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-end justify-between gap-1 rounded-bubble-xl border border-border bg-nav/95 px-2 py-2 shadow-nav-float backdrop-blur-md">
        {tabs.map(({ href, labelKey, icon: Icon, ...rest }) => {
          const label = t(labelKey);
          const featured = "featured" in rest && rest.featured;
          const active =
            pathname === href || pathname.startsWith(`${href}/`);

          if (featured) {
            return (
              <Link
                key={href}
                href={href}
                onClick={handleTap}
                aria-current={active ? "page" : undefined}
                className="relative -mt-8 flex min-h-touch min-w-18 flex-col items-center gap-1"
              >
                <span
                  className={[
                    "flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-transform",
                    "shadow-[0_6px_0_0_hsl(var(--secondary-deep)),0_12px_22px_hsl(var(--secondary)/0.6)]",
                    "active:translate-y-1 active:shadow-[0_2px_0_0_hsl(var(--secondary-deep)),0_6px_14px_hsl(var(--secondary)/0.5)]",
                    active ? "ring-4 ring-accent/70" : "",
                  ].join(" ")}
                >
                  <Icon className="h-8 w-8 fill-white/20" strokeWidth={2.5} />
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
              onClick={handleTap}
              aria-current={active ? "page" : undefined}
              className={[
                "relative flex min-h-touch min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-bubble px-2 py-2 transition-colors",
                active
                  ? "text-nav-active"
                  : "text-nav-foreground hover:text-foreground",
              ].join(" ")}
            >
              {/* Sliding glowing indicator behind the active tab. */}
              {active && (
                <motion.span
                  layoutId="nav-active-glow"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-bubble bg-nav-active/10 shadow-[0_0_16px_hsl(var(--accent)/0.55)] ring-1 ring-accent/40"
                />
              )}
              <Icon
                className="relative h-6 w-6"
                strokeWidth={active ? 2.75 : 2}
              />
              <span className="relative font-display text-xs font-semibold">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
