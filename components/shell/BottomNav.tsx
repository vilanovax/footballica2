"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Play, Trophy, Settings, AlertTriangle } from "lucide-react";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePenaltyStore } from "@/stores/penaltyStore";

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
  const router = useRouter();
  const { t } = useTranslation();

  // A match is "in flight" while a kick is live or its result is showing.
  const matchActive = usePenaltyStore(
    (s) => s.phase === "playing" || s.phase === "reveal",
  );
  const resetMatch = usePenaltyStore((s) => s.reset);
  const setPaused = usePenaltyStore((s) => s.setPaused);

  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Warn before a full reload / tab close while a match is running.
  useEffect(() => {
    if (!matchActive) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [matchActive]);

  function handleTap() {
    playSound("click");
    haptic(HAPTIC.tap);
  }

  function handleNav(e: React.MouseEvent, href: string) {
    if (matchActive) {
      // Intercept: don't lose match progress on a stray tap.
      e.preventDefault();
      haptic(HAPTIC.tap);
      setPaused(true); // freeze the fuse while the player decides
      setPendingHref(href);
      return;
    }
    handleTap();
  }

  function confirmLeave() {
    const href = pendingHref;
    setPendingHref(null);
    resetMatch();
    playSound("click");
    if (href) router.push(href);
  }

  function cancelLeave() {
    playSound("click");
    setPaused(false); // resume the match right where it was frozen
    setPendingHref(null);
  }

  return (
    <>
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
                  onClick={(e) => handleNav(e, href)}
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
                onClick={(e) => handleNav(e, href)}
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

      <LeaveMatchDialog
        open={pendingHref !== null}
        onStay={cancelLeave}
        onLeave={confirmLeave}
      />
    </>
  );
}

function LeaveMatchDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="leave-match-dialog"
          className="fixed inset-0 z-60 flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            aria-label={t("quiz.leaveStay")}
            onClick={onStay}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-mobile rounded-bubble-xl border border-border bg-card p-6 text-center shadow-fantasy"
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent-deep">
              <AlertTriangle className="h-8 w-8" strokeWidth={2.5} />
            </div>

            <h2 className="font-display text-xl font-bold text-foreground">
              {t("quiz.leaveTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("quiz.leaveBody")}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={onStay}
                className="flex min-h-touch items-center justify-center rounded-bubble bg-primary px-5 py-3 font-display text-base font-bold text-primary-foreground shadow-[0_4px_0_0_hsl(var(--primary-deep))] transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_0_hsl(var(--primary-deep))]"
              >
                {t("quiz.leaveStay")}
              </button>
              <button
                onClick={onLeave}
                className="flex min-h-touch items-center justify-center rounded-bubble border-2 border-destructive/40 px-5 py-3 font-display text-base font-semibold text-destructive transition-colors active:bg-destructive/10"
              >
                {t("quiz.leaveConfirm")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
