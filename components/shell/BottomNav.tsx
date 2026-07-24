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
import { useSurvivalStore } from "@/stores/survivalStore";
import { getDuelInboxCount } from "@/actions/duel/getInboxCount";
import { toLocaleDigits } from "@/lib/i18n/format";
import { toast } from "sonner";

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
  const { t, locale } = useTranslation();

  // A match is "in flight" while a kick is live or its result is showing.
  const penaltyActive = usePenaltyStore(
    (s) => s.phase === "playing" || s.phase === "reveal",
  );
  const survivalActive = useSurvivalStore(
    (s) => s.phase === "playing" || s.phase === "reveal",
  );
  const matchActive = penaltyActive || survivalActive;
  const resetMatch = usePenaltyStore((s) => s.reset);
  const resetSurvival = useSurvivalStore((s) => s.reset);
  const setPaused = usePenaltyStore((s) => s.setPaused);
  const setSurvivalPaused = useSurvivalStore((s) => s.setPaused);

  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [duelInbox, setDuelInbox] = useState(0);

  // Refresh badge on route change + poll so bot/human turns surface quickly.
  useEffect(() => {
    let cancelled = false;
    let prev =
      typeof window !== "undefined"
        ? Number(sessionStorage.getItem("fb_duel_inbox") ?? "0")
        : 0;

    async function refresh() {
      const res = await getDuelInboxCount();
      if (cancelled || !res.ok) return;
      if (res.count > prev && prev >= 0) {
        toast.message(t("duel.inboxToast", { n: String(res.count) }), {
          action: {
            label: t("duel.inboxCta"),
            onClick: () => router.push("/play/duel"),
          },
        });
        haptic(HAPTIC.tap);
      }
      prev = res.count;
      sessionStorage.setItem("fb_duel_inbox", String(res.count));
      setDuelInbox(res.count);
    }

    void refresh();
    const id = window.setInterval(() => void refresh(), 25_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pathname, router, t]);

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
      setPaused(true);
      setSurvivalPaused(true);
      setPendingHref(href);
      return;
    }
    handleTap();
  }

  function confirmLeave() {
    const href = pendingHref;
    setPendingHref(null);
    resetMatch();
    resetSurvival();
    playSound("click");
    if (href) router.push(href);
  }

  function cancelLeave() {
    playSound("click");
    setPaused(false);
    setSurvivalPaused(false);
    setPendingHref(null);
  }

  const leaveOpen = pendingHref !== null;

  return (
    <>
      <nav
        aria-label="Main"
        aria-hidden={leaveOpen}
        className={[
          "fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-mobile px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-200",
          leaveOpen ? "pointer-events-none opacity-0" : "opacity-100",
        ].join(" ")}
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
                  aria-label={
                    duelInbox > 0
                      ? `${label} (${duelInbox})`
                      : label
                  }
                  tabIndex={leaveOpen ? -1 : undefined}
                  className="relative -mt-6 flex min-h-touch min-w-16 flex-col items-center gap-0.5"
                >
                  <span
                    className={[
                      "relative flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-transform",
                      "shadow-[0_4px_0_0_hsl(var(--secondary-deep)),0_8px_16px_hsl(var(--secondary)/0.45)]",
                      "active:translate-y-1 active:shadow-[0_2px_0_0_hsl(var(--secondary-deep)),0_4px_10px_hsl(var(--secondary)/0.4)]",
                      active ? "ring-2 ring-accent/70" : "",
                    ].join(" ")}
                  >
                    <Icon className="h-7 w-7 fill-white/20" strokeWidth={2.5} />
                    {duelInbox > 0 && (
                      <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-display text-[11px] font-bold text-accent-foreground ring-2 ring-nav">
                        {toLocaleDigits(Math.min(duelInbox, 9), locale)}
                        {duelInbox > 9 ? "+" : ""}
                      </span>
                    )}
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
                tabIndex={leaveOpen ? -1 : undefined}
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
        open={leaveOpen}
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
          className="fixed inset-0 z-[70] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            aria-label={t("quiz.leaveStay")}
            onClick={onStay}
            className="absolute inset-0 bg-black/75 backdrop-blur-[6px]"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="leave-match-title"
            aria-describedby="leave-match-desc"
            className="relative w-full max-w-[22rem] overflow-hidden rounded-bubble-xl border border-border bg-surface p-6 pt-7 text-center shadow-fantasy-lg"
            initial={{ scale: 0.92, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-accent/20 to-transparent"
            />

            <div className="relative mx-auto mb-5 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_5px_0_0_hsl(var(--accent-deep)),0_10px_24px_hsl(var(--accent)/0.35)] ring-4 ring-accent/25">
              <AlertTriangle className="h-8 w-8" strokeWidth={2.75} />
            </div>

            <h2
              id="leave-match-title"
              className="relative font-display text-xl font-bold tracking-tight text-foreground"
            >
              {t("quiz.leaveTitle")}
            </h2>
            <p
              id="leave-match-desc"
              className="relative mt-2.5 text-sm leading-relaxed text-muted-foreground"
            >
              {t("quiz.leaveBody")}
            </p>

            <div className="relative mt-7 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onStay}
                className="btn-fantasy btn-fantasy-primary w-full"
              >
                {t("quiz.leaveStay")}
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="flex min-h-touch w-full items-center justify-center rounded-bubble border-2 border-destructive/50 bg-destructive/10 px-5 py-3 font-display text-base font-bold text-destructive transition-transform active:scale-[0.98] active:bg-destructive/15"
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
