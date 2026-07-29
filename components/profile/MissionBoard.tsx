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
      className={["object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)]", className ?? "h-7 w-7"].join(" ")}
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
      className={["object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)]", className ?? "h-7 w-7"].join(" ")}
    />
  );
}

function RewardPills({
  coins,
  xp,
  dimmed,
}: {
  coins: number;
  xp: number;
  dimmed?: boolean;
}) {
  const { locale } = useTranslation();
  if (coins <= 0 && xp <= 0) return null;
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-display text-[11px] font-black tabular-nums",
        dimmed ? "text-muted-foreground line-through opacity-50" : "text-foreground",
      ].join(" ")}
    >
      {coins > 0 && (
        <span className="inline-flex items-center gap-0.5 text-accent-deep">
          +{toLocaleDigits(coins, locale)}
          <ResourceIcon kind="coin" size="sm" className="h-4 w-4" />
        </span>
      )}
      {xp > 0 && (
        <span className="inline-flex items-center gap-0.5 text-primary">
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
 * Compact density is tuned for MissionDrawer (claim-first UX).
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
        isDaily ? "border-secondary/40" : "border-border",
        board.chestReady ? "ring-2 ring-accent/55" : "",
      ].join(" ")}
    >
      <FlyingCoins
        bursts={bursts}
        onBurstDone={(id) => setBursts((b) => b.filter((x) => x.id !== id))}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: isDaily
            ? "radial-gradient(ellipse at 15% 0%, hsl(var(--secondary) / 0.2), transparent 50%)"
            : "radial-gradient(ellipse at 85% 0%, hsl(var(--accent) / 0.18), transparent 50%)",
        }}
      />

      {isDaily && compact && <DailyResetCountdown />}

      <header
        className={[
          "relative flex items-center gap-3",
          compact ? "mb-2.5" : "mb-3 items-start",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          {/* Comfortable (profile): full titles. Compact drawer: skip daily title. */}
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
            <h2 className="mb-1.5 font-display text-sm font-black text-foreground">
              {t("missions.title", {
                n: toLocaleDigits(board.batchIndex ?? 1, locale),
              })}
            </h2>
          )}

          {compact && isDaily && board.chestReady && (
            <p className="mb-1.5 font-display text-[11px] font-bold text-accent-deep">
              {t("missions.chestReadyBadge")}
            </p>
          )}

          <div className="flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={[
                  "h-full rounded-full",
                  board.chestReady || batchPct >= 100
                    ? "bg-accent"
                    : "bg-secondary",
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
          done={doneCount}
          total={board.missions.length}
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
                    ? "border-border/60 bg-muted/40 opacity-80"
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
                      ? "bg-transparent"
                      : claimable
                        ? "bg-accent/20"
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
                        "min-w-0 font-display font-bold leading-snug text-surface-foreground",
                        compact ? "text-[13px]" : "text-sm",
                        claimed ? "line-through opacity-60" : "",
                      ].join(" ")}
                    >
                      {title}
                    </p>
                    <span
                      className="shrink-0 font-display text-[11px] font-bold tabular-nums text-muted-foreground"
                      aria-hidden={claimable || claimed}
                    >
                      {claimed || claimable
                        ? null
                        : `${toLocaleDigits(m.progress, locale)}/${toLocaleDigits(m.targetValue, locale)}`}
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
                          ? "bg-muted-foreground/35"
                          : claimable
                            ? "bg-accent"
                            : "bg-secondary",
                      ].join(" ")}
                      initial={{ width: 0 }}
                      animate={{ width: `${claimed || claimable ? 100 : pct}%` }}
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
                    />

                    {!m.isCompleted && (
                      <Link
                        href={href}
                        className="ms-auto inline-flex min-h-8 items-center rounded-full border border-border bg-surface px-2.5 font-display text-[11px] font-bold text-muted-foreground transition-colors active:bg-muted"
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
                          busy ? t("missions.claiming") : t("missions.claimDrip")
                        }
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.05,
                          ease: "easeInOut",
                        }}
                        whileTap={{ scale: 0.94 }}
                        className="ms-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent/25 shadow-[0_0_16px_hsl(var(--accent)/0.4)] ring-2 ring-accent/50 disabled:opacity-60"
                      >
                        {busy ? (
                          <span className="font-display text-xs font-black text-accent-deep">
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
              aria-hidden
            >
              <GiftIcon className="h-16 w-16" />
            </motion.span>
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <p className="font-display text-lg font-black text-foreground">
                {t("missions.chestClaimed", {
                  coins: toLocaleDigits(celebrate.coins, locale),
                  xp: toLocaleDigits(celebrate.xp, locale),
                })}
              </p>
              <RewardPills coins={celebrate.coins} xp={celebrate.xp} />
            </div>
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

function DailyResetCountdown() {
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
    h > 0
      ? `${pad(h)}:${pad(m)}:${pad(s)}`
      : `${pad(m)}:${pad(s)}`;

  return (
    <p className="relative mb-2 text-center font-display text-[11px] font-bold text-muted-foreground">
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
                y: [0, -5, 0],
                rotate: [0, -4, 4, 0],
                scale: [1, 1.08, 1],
              }
            : { y: 0, rotate: 0, scale: 1 }
        }
        transition={
          ready && !celebrating
            ? { repeat: Infinity, duration: 0.95 }
            : { duration: 0.2 }
        }
        className={[
          "relative flex items-center justify-center rounded-bubble-lg border-2 shadow-fantasy",
          compact ? "h-14 w-14" : "h-16 w-16",
          ready
            ? "border-accent bg-accent/30 shadow-[0_0_28px_hsl(var(--accent)/0.55)] ring-2 ring-accent/40"
            : "border-border bg-muted/50",
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
            className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 font-display text-[9px] font-black text-background"
          >
            🔒
          </span>
        )}
      </motion.button>
      <p
        className={[
          "mt-1 text-center font-display font-bold leading-tight",
          compact ? "max-w-16 text-[9px]" : "max-w-20 text-[10px]",
          ready ? "text-accent-deep" : "text-muted-foreground",
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
          <RewardPills coins={coins} xp={xp} dimmed />
        </div>
      )}
    </div>
  );
}
