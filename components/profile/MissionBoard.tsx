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

export type MissionBoardData = EvaluateMissionsResult;

type MissionBoardProps = {
  initialBoard: MissionBoardData;
  /** Campaign ladder vs Tehran daily reset board. */
  variant?: "campaign" | "daily";
  /** Compact layout for bottom-sheet / dense surfaces. */
  density?: "comfortable" | "compact";
  /** Called after a successful chest claim (e.g. refresh parent badge). */
  onClaimed?: () => void;
  /**
   * After a drip claim, parent can tick Hub coins when flying coins land.
   * Called immediately with balances; delay display yourself (~800ms).
   */
  onDripClaimed?: (balances: { coins: number; xp: number }) => void;
};

function playHrefForObjective(type: MissionObjective): string {
  switch (type) {
    case "PLAY_DUEL":
    case "WIN_DUEL":
      return "/play/duel";
    default:
      return "/play";
  }
}

/**
 * LiveOps / daily mission board — 3 active objectives + batch chest.
 * Mission row states: Go → Claim → Claimed.
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

      // Optimistic: flip to claimed; Hub coins tick when particles land.
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
        "relative overflow-hidden border bg-surface shadow-fantasy",
        compact
          ? "rounded-bubble-lg border-foreground/10 p-3 shadow-fantasy-sm"
          : "rounded-bubble-xl border-2 p-4",
        isDaily ? "border-secondary/55" : "border-border",
        board.chestReady ? "ring-2 ring-accent/50" : "",
      ].join(" ")}
    >
      <FlyingCoins
        bursts={bursts}
        onBurstDone={(id) => setBursts((b) => b.filter((x) => x.id !== id))}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          background: isDaily
            ? "radial-gradient(ellipse at 15% 0%, hsl(var(--secondary) / 0.22), transparent 50%)"
            : "radial-gradient(ellipse at 85% 0%, hsl(var(--accent) / 0.2), transparent 50%)",
        }}
      />

      <header
        className={[
          "relative flex items-center gap-3",
          compact ? "mb-2.5" : "mb-3 items-start",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
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
          <h2
            className={[
              "mt-1 font-display font-black text-foreground",
              compact ? "text-base" : "text-lg",
            ].join(" ")}
          >
            {isDaily
              ? t("missions.dailyTitle")
              : t("missions.title", {
                  n: toLocaleDigits(board.batchIndex ?? 1, locale),
                })}
          </h2>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={[
                  "h-full rounded-full",
                  batchPct >= 100 ? "bg-accent" : "bg-primary",
                ].join(" ")}
                initial={{ width: 0 }}
                animate={{ width: `${batchPct}%` }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
              />
            </div>
            <span className="shrink-0 font-display text-[11px] font-bold tabular-nums text-muted-foreground">
              {toLocaleDigits(doneCount, locale)}/
              {toLocaleDigits(board.missions.length, locale)}
            </span>
          </div>
        </div>

        <ChestButton
          ready={board.chestReady}
          coins={board.chestCoins}
          xp={board.chestXp}
          pending={pending}
          celebrating={Boolean(celebrate)}
          compact={compact}
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
                "rounded-bubble-lg border",
                compact ? "px-2.5 py-2" : "px-3 py-2.5",
                claimable
                  ? "border-accent/55 bg-accent/12 ring-1 ring-accent/30"
                  : claimed
                    ? "border-primary/35 bg-primary/10"
                    : "border-foreground/8 bg-background/90 shadow-sm",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={[
                    "flex shrink-0 items-center justify-center rounded-full font-display text-xs font-black",
                    compact ? "h-7 w-7" : "h-8 w-8",
                    claimed
                      ? "bg-primary text-primary-foreground"
                      : claimable
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {claimed ? "✓" : claimable ? "🎁" : toLocaleDigits(i + 1, locale)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={[
                        "min-w-0 font-display font-bold leading-snug text-surface-foreground",
                        compact ? "text-[13px]" : "text-sm",
                        claimed ? "line-through opacity-70" : "",
                      ].join(" ")}
                    >
                      {title}
                    </p>
                    <span className="shrink-0 font-display text-[11px] font-bold tabular-nums text-muted-foreground">
                      {toLocaleDigits(m.progress, locale)}/
                      {toLocaleDigits(m.targetValue, locale)}
                    </span>
                  </div>

                  <div
                    className={[
                      "overflow-hidden rounded-full bg-muted",
                      compact ? "mt-1.5 h-1.5" : "mt-2 h-2",
                    ].join(" ")}
                  >
                    <motion.div
                      className={[
                        "h-full rounded-full",
                        claimed
                          ? "bg-primary"
                          : claimable
                            ? "bg-accent"
                            : "bg-secondary",
                      ].join(" ")}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        type: "spring",
                        stiffness: 220,
                        damping: 24,
                      }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    {(m.rewardCoins > 0 || m.rewardXp > 0) && (
                      <p
                        className={[
                          "font-body text-[10px] font-semibold text-muted-foreground",
                          claimed ? "line-through opacity-60" : "",
                        ].join(" ")}
                      >
                        {t("missions.missionReward", {
                          coins: toLocaleDigits(m.rewardCoins, locale),
                          xp: toLocaleDigits(m.rewardXp, locale),
                        })}
                      </p>
                    )}

                    {!m.isCompleted && (
                      <Link
                        href={href}
                        className="ms-auto inline-flex min-h-8 items-center rounded-full bg-primary/15 px-2.5 font-display text-[11px] font-bold text-primary transition-transform active:scale-95"
                      >
                        {t("missions.goPlay")}
                      </Link>
                    )}

                    {claimable && (
                      <motion.button
                        type="button"
                        disabled={busy || pending}
                        onClick={(e) => handleDripClaim(m.missionId, e)}
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.05,
                          ease: "easeInOut",
                        }}
                        whileTap={{ scale: 0.94 }}
                        className="ms-auto inline-flex min-h-9 items-center gap-1 rounded-full border-2 border-accent bg-accent px-3 font-display text-[12px] font-black text-accent-foreground shadow-[0_0_16px_hsl(var(--accent)/0.45)] disabled:opacity-60"
                      >
                        <span aria-hidden>🎁</span>
                        {busy ? t("missions.claiming") : t("missions.claimDrip")}
                      </motion.button>
                    )}

                    {claimed && (
                      <span className="ms-auto inline-flex min-h-8 items-center rounded-full bg-primary/15 px-2.5 font-display text-[11px] font-bold text-primary">
                        ✓ {t("missions.claimed")}
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
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/92 px-4 text-center backdrop-blur-sm"
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
              className="text-5xl"
              aria-hidden
            >
              🎁
            </motion.span>
            <p className="mt-2 font-display text-lg font-black text-foreground">
              {t("missions.chestClaimed", {
                coins: toLocaleDigits(celebrate.coins, locale),
                xp: toLocaleDigits(celebrate.xp, locale),
              })}
            </p>
            {celebrate.next != null && (
              <p className="mt-1 font-display text-sm font-bold text-secondary">
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

function ChestButton({
  ready,
  coins,
  xp,
  pending,
  celebrating,
  compact,
  onClaim,
}: {
  ready: boolean;
  coins: number;
  xp: number;
  pending: boolean;
  celebrating: boolean;
  compact: boolean;
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
            ? { y: [0, -4, 0], rotate: [0, -3, 3, 0], scale: [1, 1.04, 1] }
            : { y: 0, rotate: 0, scale: 1 }
        }
        transition={
          ready && !celebrating
            ? { repeat: Infinity, duration: 1.15 }
            : { duration: 0.2 }
        }
        className={[
          "relative flex items-center justify-center rounded-bubble-lg border-2 shadow-fantasy",
          compact ? "h-12 w-12 text-2xl" : "h-16 w-16 text-3xl",
          ready
            ? "border-accent bg-accent/25 shadow-[0_0_20px_hsl(var(--accent)/0.4)]"
            : "border-border bg-muted/50 opacity-75",
        ].join(" ")}
        aria-label={t("missions.claimChest")}
      >
        <span aria-hidden>{ready ? "🎁" : "📦"}</span>
      </motion.button>
      <p
        className={[
          "mt-1 text-center font-display font-bold leading-tight text-muted-foreground",
          compact ? "max-w-14 text-[9px]" : "max-w-20 text-[10px]",
        ].join(" ")}
      >
        {ready
          ? t("missions.tapClaim")
          : t("missions.chestHint", {
              coins: toLocaleDigits(coins, locale),
              xp: toLocaleDigits(xp, locale),
            })}
      </p>
    </div>
  );
}
