"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  claimMyMissionChest,
  claimMyMissionReward,
  getMyMissions,
} from "@/actions/missions";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";
import type { MissionObjective } from "@/generated/prisma/client";
import {
  formatCountdownHms,
  msUntilTehranMidnight,
} from "@/lib/game/tehranClock";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import {
  FlyingCoins,
  FLYING_COINS_HIT_MS,
  spawnFlyingCoinsToHeader,
  type FlyingBurst,
} from "@/components/ui/FlyingCoins";
import { ResourceIcon } from "@/components/common/ResourceIcon";

function GiftIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/gift.png"
      alt=""
      aria-hidden
      draggable={false}
      className={[
        "object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)]",
        className ?? "h-7 w-7",
      ].join(" ")}
    />
  );
}

function ClaimIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/claim.png"
      alt=""
      aria-hidden
      draggable={false}
      className={[
        "object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)]",
        className ?? "h-7 w-7",
      ].join(" ")}
    />
  );
}

function RewardPills({
  coins,
  xp,
  dimmed,
  dark,
}: {
  coins: number;
  xp: number;
  dimmed?: boolean;
  dark?: boolean;
}) {
  const { locale } = useTranslation();
  if (coins <= 0 && xp <= 0) return null;
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-display text-[11px] font-black tabular-nums",
        dimmed
          ? dark
            ? "text-white/35 line-through"
            : "text-muted-foreground line-through opacity-50"
          : dark
            ? "text-white"
            : "text-foreground",
      ].join(" ")}
    >
      {coins > 0 && (
        <span
          className={[
            "inline-flex items-center gap-0.5",
            dark ? "text-amber-200" : "text-accent-deep",
          ].join(" ")}
        >
          +{toLocaleDigits(coins, locale)}
          <ResourceIcon kind="coin" size="sm" className="h-4 w-4" />
        </span>
      )}
      {xp > 0 && (
        <span
          className={[
            "inline-flex items-center gap-0.5",
            dark ? "text-sky-300" : "text-primary",
          ].join(" ")}
        >
          +{toLocaleDigits(xp, locale)}
          <ResourceIcon kind="xp" size="sm" className="h-4 w-4" />
        </span>
      )}
    </span>
  );
}

export type MissionBoardData = EvaluateMissionsResult;

type MissionBoardProps = {
  initialBoard: MissionBoardData;
  variant?: "campaign" | "daily";
  density?: "comfortable" | "compact";
  onClaimed?: () => void;
  onDripClaimed?: (balances: { coins: number; xp: number }) => void;
};

/** Deep-link for a mission objective — shared with MissionDrawer footer. */
export function playHrefForObjective(type: MissionObjective): string {
  switch (type) {
    case "PLAY_DUEL":
    case "WIN_DUEL":
      return "/play/duel";
    default:
      return "/play";
  }
}

/**
 * LiveOps / daily mission board — 3 objectives + batch chest.
 * Compact density is tuned for MissionDrawer dark game chrome.
 */
export function MissionBoard({
  initialBoard,
  variant = "campaign",
  density = "comfortable",
  onClaimed,
  onDripClaimed,
}: MissionBoardProps) {
  const { t, locale } = useTranslation();
  const [board, setBoard] = useState(initialBoard);
  const [pending, startTransition] = useTransition();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [bursts, setBursts] = useState<FlyingBurst[]>([]);
  const [celebrate, setCelebrate] = useState<{
    coins: number;
    xp: number;
    next: number | null;
  } | null>(null);

  useEffect(() => {
    setBoard(initialBoard);
  }, [initialBoard]);

  if (!board.batchId || board.missions.length === 0) {
    return null;
  }

  const doneCount = board.missions.filter((m) => m.isCompleted).length;
  const isDaily = variant === "daily";
  const compact = density === "compact";
  const dark = compact;
  const batchPct =
    board.missions.length > 0
      ? Math.round((doneCount / board.missions.length) * 100)
      : 0;

  function handleChestClaim() {
    if (!board.chestReady || pending || !board.batchId) return;
    startTransition(async () => {
      const res = await claimMyMissionChest(board.batchId ?? undefined);
      if (!res.ok) {
        toast.error(t("missions.errClaim"));
        return;
      }
      playSound("upgrade");
      haptic(HAPTIC.goal);
      setCelebrate({
        coins: res.coins,
        xp: res.xp,
        next: res.nextBatchIndex,
      });
      onDripClaimed?.(res.balances);
      const next = await getMyMissions();
      if (next.ok) setBoard(isDaily ? next.daily : next.board);
      onClaimed?.();
      window.setTimeout(() => setCelebrate(null), 2200);
    });
  }

  function handleDripClaim(
    missionId: string,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (pending || claimingId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const burst = spawnFlyingCoinsToHeader(rect);
    if (burst) setBursts((b) => [...b, burst]);

    playSound("click");
    haptic(HAPTIC.tap);
    setClaimingId(missionId);

    startTransition(async () => {
      const res = await claimMyMissionReward(missionId);
      if (!res.ok) {
        setClaimingId(null);
        toast.error(t("missions.errClaimDrip"));
        return;
      }
      playSound("upgrade");
      haptic(HAPTIC.goal);

      setBoard((prev) => ({
        ...prev,
        missions: prev.missions.map((m) =>
          m.missionId === missionId ? { ...m, isClaimed: true } : m,
        ),
      }));

      window.setTimeout(() => {
        onDripClaimed?.(res.balances);
        playSound("goal");
        setClaimingId(null);
      }, FLYING_COINS_HIT_MS);

      onClaimed?.();
    });
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        "relative overflow-hidden",
        compact
          ? [
              "rounded-2xl border p-3",
              board.chestReady
                ? "border-amber-300/45 bg-black/45 shadow-[0_0_28px_rgba(251,191,36,0.18)]"
                : "border-white/12 bg-black/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
            ].join(" ")
          : [
              "rounded-bubble-xl border-2 bg-surface p-4 shadow-fantasy",
              isDaily ? "border-secondary/40" : "border-border",
              board.chestReady ? "ring-2 ring-accent/55" : "",
            ].join(" "),
      ].join(" ")}
    >
      <FlyingCoins
        bursts={bursts}
        onBurstDone={(id) => setBursts((b) => b.filter((x) => x.id !== id))}
      />

      <div
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0",
          dark ? "opacity-40" : "opacity-30",
        ].join(" ")}
        style={{
          background: isDaily
            ? dark
              ? "radial-gradient(ellipse at 15% 0%, rgba(16,185,129,0.28), transparent 55%)"
              : "radial-gradient(ellipse at 15% 0%, hsl(var(--secondary) / 0.2), transparent 50%)"
            : dark
              ? "radial-gradient(ellipse at 85% 0%, rgba(251,191,36,0.18), transparent 55%)"
              : "radial-gradient(ellipse at 85% 0%, hsl(var(--accent) / 0.18), transparent 50%)",
        }}
      />

      {isDaily && compact && <DailyResetCountdown dark />}

      <header
        className={[
          "relative flex items-center gap-3",
          compact ? "mb-2.5" : "mb-3 items-start",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          {!compact && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider",
                    isDaily
                      ? "bg-secondary/15 text-secondary"
                      : "bg-primary/15 text-primary",
                  ].join(" ")}
                >
                  {isDaily ? t("missions.dailyEyebrow") : t("missions.eyebrow")}
                </span>
                {board.chestReady && (
                  <span className="inline-flex items-center rounded-full bg-accent/20 px-2 py-0.5 font-display text-[10px] font-bold text-accent-deep">
                    {t("missions.chestReadyBadge")}
                  </span>
                )}
              </div>
              <h2 className="mt-1 font-display text-lg font-black text-foreground">
                {isDaily
                  ? t("missions.dailyTitle")
                  : t("missions.title", {
                      n: toLocaleDigits(board.batchIndex ?? 1, locale),
                    })}
              </h2>
            </>
          )}

          {compact && !isDaily && (
            <h2 className="mb-1.5 font-display text-sm font-black text-white">
              {t("missions.title", {
                n: toLocaleDigits(board.batchIndex ?? 1, locale),
              })}
            </h2>
          )}

          {compact && isDaily && board.chestReady && (
            <p className="mb-1.5 font-display text-[11px] font-black text-amber-200">
              {t("missions.chestReadyBadge")}
            </p>
          )}

          <div className="flex items-center gap-2">
            <div
              className={[
                "h-2 min-w-0 flex-1 overflow-hidden rounded-full",
                dark ? "bg-white/12 ring-1 ring-white/10" : "h-1.5 bg-muted",
              ].join(" ")}
            >
              <motion.div
                className={[
                  "h-full rounded-full",
                  board.chestReady || batchPct >= 100
                    ? dark
                      ? "bg-linear-to-r from-amber-300 to-accent shadow-[0_0_10px_rgba(251,191,36,0.55)]"
                      : "bg-accent"
                    : dark
                      ? "bg-linear-to-r from-emerald-400 to-emerald-600"
                      : "bg-secondary",
                ].join(" ")}
                initial={{ width: 0 }}
                animate={{ width: `${batchPct}%` }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
              />
            </div>
            <span
              className={[
                "shrink-0 font-display text-[11px] font-black tabular-nums",
                dark ? "text-white/60" : "text-muted-foreground",
              ].join(" ")}
            >
              {toLocaleDigits(doneCount, locale)}/
              {toLocaleDigits(board.missions.length, locale)}
            </span>
          </div>
        </div>

        <ChestButton
          ready={board.chestReady}
          coins={board.chestCoins}
          xp={board.chestXp}
          done={doneCount}
          total={board.missions.length}
          pending={pending}
          celebrating={Boolean(celebrate)}
          compact={compact}
          dark={dark}
          onClaim={handleChestClaim}
        />
      </header>

      <ul
        className={[
          "relative flex flex-col",
          compact ? "gap-1.5" : "gap-2.5",
        ].join(" ")}
      >
        {board.missions.map((m, i) => {
          const pct =
            m.targetValue > 0
              ? Math.min(100, Math.round((m.progress / m.targetValue) * 100))
              : 0;
          const title = locale === "fa" ? m.titleFa : m.titleEn;
          const href = playHrefForObjective(m.objectiveType);
          const claimable = m.isCompleted && !m.isClaimed;
          const claimed = m.isCompleted && m.isClaimed;
          const busy = claimingId === m.missionId;

          return (
            <motion.li
              key={m.missionId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={[
                compact ? "rounded-2xl px-2.5 py-2.5" : "rounded-bubble-lg px-3 py-2.5",
                dark
                  ? claimable
                    ? "border border-amber-300/45 bg-amber-400/12 shadow-[0_0_18px_rgba(251,191,36,0.16)]"
                    : claimed
                      ? "border border-white/8 bg-black/25 opacity-75"
                      : "border border-white/12 bg-black/40"
                  : claimable
                    ? "border border-accent/55 bg-accent/12 ring-1 ring-accent/30"
                    : claimed
                      ? "border border-border/60 bg-muted/40 opacity-80"
                      : "border border-foreground/8 bg-background/90 shadow-sm",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={[
                    "flex shrink-0 items-center justify-center rounded-full font-display text-xs font-black",
                    compact ? "h-8 w-8" : "h-8 w-8",
                    claimed
                      ? "bg-transparent"
                      : claimable
                        ? dark
                          ? "bg-amber-400/25 ring-1 ring-amber-300/40"
                          : "bg-accent/20"
                        : dark
                          ? "border border-white/15 bg-black/40 text-emerald-300"
                          : "bg-secondary/15 text-secondary",
                  ].join(" ")}
                >
                  {claimed ? (
                    <ClaimIcon className="h-6 w-6" />
                  ) : claimable ? (
                    <GiftIcon className="h-6 w-6" />
                  ) : (
                    toLocaleDigits(i + 1, locale)
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={[
                        "min-w-0 font-display font-bold leading-snug",
                        compact ? "text-[13px]" : "text-sm",
                        dark ? "text-white" : "text-surface-foreground",
                        claimed ? "line-through opacity-55" : "",
                      ].join(" ")}
                    >
                      {title}
                    </p>
                    <span
                      className={[
                        "shrink-0 font-display text-[11px] font-black tabular-nums",
                        dark ? "text-white/50" : "text-muted-foreground",
                      ].join(" ")}
                      aria-hidden={claimable || claimed}
                    >
                      {claimed || claimable
                        ? null
                        : `${toLocaleDigits(m.progress, locale)}/${toLocaleDigits(m.targetValue, locale)}`}
                    </span>
                  </div>

                  <div
                    className={[
                      "overflow-hidden rounded-full",
                      compact ? "mt-1.5 h-1.5" : "mt-2 h-2",
                      dark
                        ? "bg-white/12 ring-1 ring-white/8"
                        : "bg-muted",
                    ].join(" ")}
                  >
                    <motion.div
                      className={[
                        "h-full rounded-full",
                        claimed
                          ? dark
                            ? "bg-white/25"
                            : "bg-muted-foreground/35"
                          : claimable
                            ? dark
                              ? "bg-linear-to-r from-amber-300 to-accent"
                              : "bg-accent"
                            : dark
                              ? "bg-linear-to-r from-emerald-400 to-emerald-600"
                              : "bg-secondary",
                      ].join(" ")}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${claimed || claimable ? 100 : pct}%`,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 220,
                        damping: 24,
                      }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <RewardPills
                      coins={m.rewardCoins}
                      xp={m.rewardXp}
                      dimmed={claimed}
                      dark={dark}
                    />

                    {!m.isCompleted && (
                      <Link
                        href={href}
                        className={[
                          "ms-auto inline-flex min-h-9 items-center rounded-full px-3 font-display text-[11px] font-black transition-transform active:scale-95",
                          dark
                            ? "border border-white/20 bg-white/10 text-white"
                            : "border border-border bg-surface text-muted-foreground active:bg-muted",
                        ].join(" ")}
                      >
                        {t("missions.goPlay")}
                      </Link>
                    )}

                    {claimable && (
                      <motion.button
                        type="button"
                        disabled={busy || pending}
                        onClick={(e) => handleDripClaim(m.missionId, e)}
                        aria-label={
                          busy
                            ? t("missions.claiming")
                            : t("missions.claimDrip")
                        }
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.2,
                          ease: "easeInOut",
                        }}
                        whileTap={{ scale: 0.94 }}
                        className={[
                          "ms-auto inline-flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-60",
                          dark
                            ? "border-2 border-amber-300/50 bg-accent/30 shadow-[0_0_18px_rgba(251,191,36,0.4)]"
                            : "bg-accent/25 shadow-[0_0_16px_hsl(var(--accent)/0.4)] ring-2 ring-accent/50",
                        ].join(" ")}
                      >
                        {busy ? (
                          <span
                            className={[
                              "font-display text-xs font-black",
                              dark ? "text-amber-100" : "text-accent-deep",
                            ].join(" ")}
                          >
                            …
                          </span>
                        ) : (
                          <ClaimIcon className="h-8 w-8" />
                        )}
                      </motion.button>
                    )}

                    {claimed && (
                      <span
                        className="ms-auto inline-flex h-9 w-9 items-center justify-center"
                        aria-label={t("missions.claimed")}
                      >
                        <ClaimIcon className="h-7 w-7 opacity-80" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>

      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={[
              "absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center backdrop-blur-sm",
              dark ? "bg-[#071510]/92" : "bg-surface/92",
            ].join(" ")}
          >
            {[...Array(8)].map((_, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="pointer-events-none absolute text-xl"
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.5 }}
                animate={{
                  opacity: 0,
                  x: Math.cos((i / 8) * Math.PI * 2) * 64,
                  y: Math.sin((i / 8) * Math.PI * 2) * 64,
                  scale: 1.15,
                }}
                transition={{ duration: 0.85 }}
              >
                {i % 2 === 0 ? "✨" : "⭐"}
              </motion.span>
            ))}
            <motion.span
              initial={{ scale: 0.45, rotate: -16 }}
              animate={{ scale: 1.1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 14 }}
              aria-hidden
            >
              <GiftIcon className="h-16 w-16" />
            </motion.span>
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <p
                className={[
                  "font-display text-lg font-black",
                  dark ? "text-white" : "text-foreground",
                ].join(" ")}
              >
                {t("missions.chestClaimed", {
                  coins: toLocaleDigits(celebrate.coins, locale),
                  xp: toLocaleDigits(celebrate.xp, locale),
                })}
              </p>
              <RewardPills
                coins={celebrate.coins}
                xp={celebrate.xp}
                dark={dark}
              />
            </div>
            {celebrate.next != null && (
              <p
                className={[
                  "mt-1 font-display text-sm font-bold",
                  dark ? "text-emerald-300" : "text-secondary",
                ].join(" ")}
              >
                {t("missions.nextBatch", {
                  n: toLocaleDigits(celebrate.next, locale),
                })}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function DailyResetCountdown({ dark }: { dark?: boolean }) {
  const { t, locale } = useTranslation();
  const [ms, setMs] = useState(() => msUntilTehranMidnight());

  useEffect(() => {
    const id = window.setInterval(() => {
      setMs(msUntilTehranMidnight());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const { h, m, s } = formatCountdownHms(ms);
  const pad = (n: number) =>
    toLocaleDigits(n.toString().padStart(2, "0"), locale);
  const time =
    h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <p
      className={[
        "relative mb-2.5 flex items-center justify-center gap-1.5 font-display text-[11px] font-black tabular-nums",
        dark ? "text-white/55" : "text-muted-foreground",
      ].join(" ")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/timer.png"
        alt=""
        aria-hidden
        draggable={false}
        className="h-3.5 w-3.5 object-contain opacity-80"
      />
      {t("missions.dailyResetIn", { time })}
    </p>
  );
}

function ChestButton({
  ready,
  coins,
  xp,
  done,
  total,
  pending,
  celebrating,
  compact,
  dark,
  onClaim,
}: {
  ready: boolean;
  coins: number;
  xp: number;
  done: number;
  total: number;
  pending: boolean;
  celebrating: boolean;
  compact: boolean;
  dark?: boolean;
  onClaim: () => void;
}) {
  const { t, locale } = useTranslation();

  return (
    <div className="relative flex shrink-0 flex-col items-center">
      <motion.button
        type="button"
        disabled={!ready || pending || celebrating}
        onClick={onClaim}
        whileTap={ready ? { scale: 0.92 } : undefined}
        animate={
          ready && !celebrating
            ? {
                y: [0, -4, 0],
                rotate: [0, -3, 3, 0],
                scale: [1, 1.05, 1],
              }
            : { y: 0, rotate: 0, scale: 1 }
        }
        transition={
          ready && !celebrating
            ? { repeat: Infinity, duration: 1.15 }
            : { duration: 0.2 }
        }
        className={[
          "relative flex items-center justify-center",
          compact ? "h-14 w-14 rounded-2xl" : "h-16 w-16 rounded-bubble-lg",
          dark
            ? ready
              ? "border-2 border-amber-300/55 bg-accent/25 shadow-[0_0_24px_rgba(251,191,36,0.45)]"
              : "border-2 border-white/15 bg-black/45 shadow-[0_3px_0_0_rgba(0,0,0,0.4)]"
            : ready
              ? "border-2 border-accent bg-accent/30 shadow-[0_0_28px_hsl(var(--accent)/0.55)] ring-2 ring-accent/40"
              : "border-2 border-border bg-muted/50 shadow-fantasy",
        ].join(" ")}
        aria-label={t("missions.claimChest")}
      >
        <GiftIcon
          className={[
            compact ? "h-10 w-10" : "h-12 w-12",
            ready ? "" : "opacity-45 grayscale",
          ].join(" ")}
        />
        {!ready && (
          <span
            aria-hidden
            className={[
              "absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-display text-[9px] font-black tabular-nums",
              dark
                ? "border border-white/20 bg-black/80 text-white/80"
                : "bg-foreground text-background",
            ].join(" ")}
          >
            {toLocaleDigits(done, locale)}/{toLocaleDigits(total, locale)}
          </span>
        )}
      </motion.button>
      <p
        className={[
          "mt-1 text-center font-display font-bold leading-tight",
          compact ? "max-w-16 text-[9px]" : "max-w-20 text-[10px]",
          ready
            ? dark
              ? "text-amber-200"
              : "text-accent-deep"
            : dark
              ? "text-white/45"
              : "text-muted-foreground",
        ].join(" ")}
      >
        {ready
          ? t("missions.tapClaim")
          : t("missions.chestLocked", {
              done: toLocaleDigits(done, locale),
              total: toLocaleDigits(total, locale),
            })}
      </p>
      {!ready && (
        <div className="mt-0.5">
          <RewardPills coins={coins} xp={xp} dimmed dark={dark} />
        </div>
      )}
    </div>
  );
}
