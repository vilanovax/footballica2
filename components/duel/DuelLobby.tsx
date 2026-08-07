"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ChevronLeft, Zap } from "lucide-react";
import { startDuel } from "@/actions/duel/startDuel";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { AvatarImage } from "@/components/common/AvatarImage";
import { duelViewerOutcome } from "@/lib/duel/history";
import { viewerMatchScore } from "@/lib/duel/matchScore";
import { isDuelTerminal } from "@/lib/duel/types";
import {
  GameChip,
  GameCta,
  GameIconWell,
  GameOffer,
  GamePanel,
  GameTile,
  type GamePanelTone,
} from "@/components/ui/game";
import { cn } from "@/lib/utils";

type DuelLobbyProps = {
  initialDuels: DuelSnapshot[];
  initialYourTurn: DuelSnapshot[];
  /** Finished in last 24h, max 5. */
  initialHistory?: DuelSnapshot[];
  yourAvatar?: string | null;
};

type Translate = (k: string, vars?: Record<string, string | number>) => string;

function statusLabel(d: DuelSnapshot, t: Translate): string {
  if (
    d.status === "COMPLETED" ||
    d.status === "EXPIRED" ||
    d.status === "FORFEIT"
  ) {
    if (d.youTimedOut) return t("duel.expiredLose");
    const outcome = duelViewerOutcome(d);
    if (outcome === "WIN") return t("duel.outcomeWin");
    if (outcome === "LOSE") return t("duel.outcomeLose");
    if (outcome === "DRAW") return t("duel.outcomeDraw");
    return t("duel.finished");
  }
  if (d.status === "MATCHING") return t("duel.matchingBadge");

  const yourTurn =
    d.canAct ||
    (d.status === "WAITING_A" && d.youAre === "challenger") ||
    (d.status === "WAITING_B" && d.youAre === "opponent");

  if (yourTurn) {
    if (d.status === "A_ATTACKING" || d.status === "B_ATTACKING") {
      return t("duel.inboxActionAttack");
    }
    if (
      d.status === "A_DEFENDING" ||
      d.status === "B_DEFENDING" ||
      d.status === "WAITING_A" ||
      d.status === "WAITING_B"
    ) {
      return t("duel.inboxActionDefend");
    }
    return t("duel.yourTurn");
  }

  return t("duel.inboxWaitingRival");
}

function deadlineLabel(
  iso: string | null,
  locale: Locale,
  t: Translate,
  now: number,
): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return t("duel.deadlineSoon");
  const mins = Math.ceil(ms / 60_000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    return t("duel.deadlineHours", { n: toLocaleDigits(h, locale) });
  }
  return t("duel.deadlineMins", { n: toLocaleDigits(mins, locale) });
}

/**
 * Draft Duel lobby — Arena panels for fixtures (readable on light Play shell).
 * Priority: your turn → find rival → waiting → finished.
 */
export function DuelLobby({
  initialDuels,
  initialYourTurn,
  initialHistory = [],
  yourAvatar,
}: DuelLobbyProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [duels] = useState(initialDuels);
  const [yourTurn] = useState(initialYourTurn);
  const [history] = useState(initialHistory);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  function handleStart() {
    if (pending) return;
    haptic(HAPTIC.tap);
    playSound("click");
    startTransition(async () => {
      const res = await startDuel();
      if (!res.ok) {
        const key =
          res.error === "no_stamina"
            ? "duel.errStamina"
            : res.error === "not_enough_categories"
              ? "duel.errCategories"
              : "duel.errGeneric";
        toast.error(t(key));
        haptic(HAPTIC.miss);
        return;
      }
      haptic(HAPTIC.goal);
      playSound("whistle");
      router.push(`/play/duel/${res.duel.id}`);
    });
  }

  const yourTurnList = yourTurn.filter((d) => !isDuelTerminal(d.status));
  const waitingList = duels.filter(
    (d) =>
      !isDuelTerminal(d.status) &&
      !d.canAct &&
      !yourTurnList.some((y) => y.id === d.id),
  );
  const finishedList = history;
  const turnCount = yourTurnList.length;
  const activeCount = yourTurnList.length + waitingList.length;
  const hasAny =
    yourTurnList.length > 0 ||
    waitingList.length > 0 ||
    finishedList.length > 0;
  const compactKickoff = activeCount > 0;

  const fixtureProps = (d: DuelSnapshot) => ({
    duel: d,
    locale,
    badge: statusLabel(d, t),
    vsLabel: d.isBotOpponent ? t("duel.vsBot") : t("duel.vsRival"),
    youLabel: t("duel.you"),
    deadline: deadlineLabel(d.turnDeadlineAt, locale, t, now),
  });

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <GamePanel tone="amber" className="p-3.5">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-8 h-28 w-28 rounded-full bg-amber-300/20 blur-3xl"
        />
        <div className="relative flex items-start gap-3">
          <GameIconWell
            size="md"
            amber
            src="/icons/trophy.png"
            className="h-12 w-12"
            iconClassName="h-7 w-7"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[11px] font-bold uppercase tracking-widest text-amber-100/70">
              {t("duel.eyebrow")}
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              {t("duel.lobbyTitle")}
            </h1>
            <p className="mt-1 font-display text-xs font-bold leading-snug text-white/65">
              {t("duel.lobbySub")}
            </p>
          </div>
        </div>

        {activeCount > 0 ? (
          <div className="relative mt-3 flex flex-wrap gap-1.5">
            {turnCount > 0 ? (
              <GameChip tone="amber" className="uppercase tracking-wide">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ repeat: Infinity, duration: 1.1 }}
                />
                {t("duel.lobbyNeedsYou", {
                  n: toLocaleDigits(turnCount, locale),
                })}
              </GameChip>
            ) : (
              <GameChip tone="emerald">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/70 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                {t("duel.lobbyAllWaiting")}
              </GameChip>
            )}
            <GameChip className="tabular-nums">
              {toLocaleDigits(activeCount, locale)} {t("duel.lobbyActive")}
            </GameChip>
          </div>
        ) : null}
      </GamePanel>

      {/* 1) Act now */}
      {turnCount > 0 ? (
        <InboxSection
          title={t("duel.inboxYourTurn")}
          badge={toLocaleDigits(turnCount, locale)}
          hot
        >
          {yourTurnList.map((d, i) => (
            <FixtureCard
              key={d.id}
              {...fixtureProps(d)}
              index={i}
              urgent
              ctaLabel={t("duel.inboxPlayCta")}
            />
          ))}
        </InboxSection>
      ) : null}

      {/* 2) Primary CTA — before passive waiting list */}
      <KickoffBlock
        compact={compactKickoff}
        pending={pending}
        yourAvatar={yourAvatar}
        onStart={handleStart}
        title={t("duel.lobbyKickoff")}
        hint={t("duel.lobbyKickoffHint")}
        startLabel={t("duel.start")}
        startingLabel={t("duel.starting")}
        anotherLabel={t("duel.lobbyFindAnother")}
      />

      {!hasAny && (
        <GameTile className="bg-arena/90 px-4 py-8 text-center text-white shadow-arena-ring">
          <GameIconWell
            size="lg"
            src="/icons/target.png"
            className="mx-auto h-14 w-14"
            iconClassName="h-8 w-8"
          />
          <p className="mt-3 font-display text-sm font-bold text-white/70">
            {t("duel.empty")}
          </p>
        </GameTile>
      )}

      {/* 3) Passive inbox */}
      {waitingList.length > 0 ? (
        <InboxSection
          title={t("duel.inboxWaiting")}
          badge={toLocaleDigits(waitingList.length, locale)}
          hint={t("duel.waitingHint")}
        >
          {waitingList.map((d, i) => (
            <FixtureCard
              key={d.id}
              {...fixtureProps(d)}
              index={i}
              urgent={false}
              waiting
            />
          ))}
        </InboxSection>
      ) : null}

      {/* 4) Recents */}
      {finishedList.length > 0 ? (
        <InboxSection
          title={t("duel.inboxFinished")}
          hint={t("duel.lobbyHistoryHint")}
        >
          {finishedList.map((d, i) => (
            <FixtureCard
              key={d.id}
              {...fixtureProps(d)}
              index={i}
              urgent={false}
              finished
            />
          ))}
        </InboxSection>
      ) : null}
    </section>
  );
}

function KickoffBlock({
  compact,
  pending,
  yourAvatar,
  onStart,
  title,
  hint,
  startLabel,
  startingLabel,
  anotherLabel,
}: {
  compact: boolean;
  pending: boolean;
  yourAvatar?: string | null;
  onStart: () => void;
  title: string;
  hint: string;
  startLabel: string;
  startingLabel: string;
  anotherLabel: string;
}) {
  if (compact) {
    return (
      <GameOffer>
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 items-center -space-x-3 rtl:space-x-reverse">
            <AvatarRing size="sm" avatarKey={yourAvatar} />
            <AvatarRing size="sm" mystery />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-black text-white">
              {anotherLabel}
            </p>
            <p className="truncate font-display text-[11px] font-bold text-amber-100/70">
              {hint}
            </p>
          </div>
          <GameCta
            variant="accent"
            disabled={pending}
            onClick={onStart}
            className="shrink-0 px-3.5 text-sm"
          >
            {pending ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8,
                  ease: "linear",
                }}
                aria-hidden
              >
                ⚽️
              </motion.span>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-current" strokeWidth={2.5} />
                <span className="max-w-[7rem] truncate">{startLabel}</span>
              </>
            )}
          </GameCta>
        </div>
      </GameOffer>
    );
  }

  return (
    <GamePanel tone="amber" className="p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -end-8 top-0 h-24 w-24 rounded-full bg-amber-300/25 blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <AvatarRing pulse avatarKey={yourAvatar} />
          <motion.span
            className="rounded-full bg-accent px-3 py-1 font-display text-sm font-black text-accent-foreground shadow-[0_3px_0_0_hsl(var(--accent-deep))]"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          >
            VS
          </motion.span>
          <AvatarRing mystery />
        </div>

        <div className="text-center">
          <p className="font-display text-lg font-black text-white">{title}</p>
          <p className="mt-1 max-w-[16rem] font-display text-xs font-bold leading-snug text-white/65">
            {hint}
          </p>
        </div>

        <GameCta
          variant="accent"
          block
          disabled={pending}
          onClick={onStart}
          className="min-h-14 text-lg"
        >
          <AnimatePresence mode="wait">
            {pending ? (
              <motion.span
                key="load"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    ease: "linear",
                  }}
                  aria-hidden
                >
                  ⚽️
                </motion.span>
                {startingLabel}
              </motion.span>
            ) : (
              <motion.span
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Zap className="h-5 w-5 fill-current" strokeWidth={2.5} />
                {startLabel}
              </motion.span>
            )}
          </AnimatePresence>
        </GameCta>
      </div>
    </GamePanel>
  );
}

function InboxSection({
  title,
  badge,
  hot,
  hint,
  children,
}: {
  title: string;
  badge?: string;
  hot?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              className={cn(
                "font-display text-sm font-black",
                hot ? "text-secondary" : "text-foreground",
              )}
            >
              {title}
            </h2>
            {badge ? (
              <GameChip
                tone={hot ? "amber" : "emerald"}
                className="min-h-6 min-w-6 justify-center bg-arena/90 tabular-nums text-white"
              >
                {badge}
              </GameChip>
            ) : null}
          </div>
          {hint ? (
            <p className="mt-0.5 font-display text-[11px] font-bold text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function AvatarRing({
  pulse,
  mystery,
  avatarKey,
  size = "md",
}: {
  pulse?: boolean;
  mystery?: boolean;
  avatarKey?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const ring = size === "sm" ? "ring-[3px]" : "ring-4";

  return (
    <div className="relative">
      {pulse && (
        <motion.span
          className="absolute inset-0 rounded-full bg-amber-300/40"
          animate={{ scale: [1, 1.28], opacity: [0.55, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        />
      )}
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
          dim,
          ring,
          mystery
            ? "bg-white/10 ring-white/25"
            : "bg-white/10 ring-amber-300/55",
        )}
      >
        {mystery ? (
          <motion.span
            className={cn(
              "font-display font-black text-white/60",
              size === "sm" ? "text-lg" : "text-2xl",
            )}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            ?
          </motion.span>
        ) : (
          <AvatarImage avatarKey={avatarKey} className={`${dim} rounded-full`} />
        )}
      </div>
    </div>
  );
}

function FixtureCard({
  duel: d,
  index,
  locale,
  badge,
  urgent,
  waiting,
  finished,
  ctaLabel,
  vsLabel,
  youLabel,
  deadline,
}: {
  duel: DuelSnapshot;
  index: number;
  locale: Locale;
  badge: string;
  urgent: boolean;
  waiting?: boolean;
  finished?: boolean;
  ctaLabel?: string;
  vsLabel: string;
  youLabel: string;
  deadline?: string | null;
}) {
  const { you, them } = viewerMatchScore(d);
  const youParty =
    d.youAre === "challenger" ? d.challenger : d.opponent;
  const themParty =
    d.youAre === "challenger" ? d.opponent : d.challenger;
  const isFinished =
    finished ||
    d.status === "COMPLETED" ||
    d.status === "EXPIRED" ||
    d.status === "FORFEIT";
  const outcome = isFinished ? duelViewerOutcome(d) : null;
  const themLost = outcome === "WIN";

  const panelTone: GamePanelTone = urgent
    ? "amber"
    : waiting
      ? "sky"
      : outcome === "WIN"
        ? "emerald"
        : outcome === "LOSE"
          ? "rose"
          : "emerald";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.2, 0.04 + index * 0.04) }}
    >
      <Link
        href={`/play/duel/${d.id}`}
        className="group block"
        onClick={() => {
          playSound("click");
          haptic(HAPTIC.tap);
        }}
      >
        <GamePanel
          tone={panelTone}
          className={cn(
            "flex min-h-[4.5rem] items-center gap-3 p-3 transition-transform active:scale-[0.985]",
            urgent && "ring-2 ring-arena-amber",
            isFinished && "opacity-90",
          )}
        >
          {urgent && (
            <motion.span
              aria-hidden
              className="absolute inset-y-0 inset-s-0 w-1 bg-accent"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ repeat: Infinity, duration: 1.35 }}
            />
          )}

          {/* Avatars */}
          <div className="relative flex shrink-0 items-center -space-x-2.5 ps-0.5 rtl:space-x-reverse">
            <AvatarImage
              avatarKey={youParty?.avatar}
              className="h-11 w-11 rounded-full ring-2 ring-sky-300/70"
              muted={!youParty?.avatar}
            />
            <div className="relative z-[1]">
              <AvatarImage
                avatarKey={themParty?.avatar}
                className={cn(
                  "h-11 w-11 rounded-full ring-2",
                  urgent ? "ring-amber-300/70" : "ring-white/25",
                )}
                muted={!themParty?.avatar || themLost}
              />
              {d.isBotOpponent && !d.shadowBotActive && (
                <span className="absolute -bottom-0.5 -end-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] shadow-sm ring-2 ring-arena">
                  🤖
                </span>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="relative min-w-0 flex-1 text-start">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate font-display text-[15px] font-black text-white">
                {themParty?.name ?? vsLabel}
              </p>
              <GameChip className="tabular-nums">
                <span>{toLocaleDigits(you, locale)}</span>
                <span className="text-white/40">–</span>
                <span>{toLocaleDigits(them, locale)}</span>
              </GameChip>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusChip
                urgent={urgent}
                waiting={Boolean(waiting)}
                outcome={outcome}
                label={badge}
              />
              {deadline && !isFinished ? (
                <GameChip tone="amber" className="gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/timer.png"
                    alt=""
                    className="h-3.5 w-3.5 object-contain"
                    draggable={false}
                  />
                  {deadline}
                </GameChip>
              ) : isFinished ? (
                <span className="truncate font-display text-[11px] font-bold text-white/55">
                  {youLabel}
                  {youParty?.name ? ` · ${youParty.name}` : ""}
                </span>
              ) : null}
            </div>

            {urgent && ctaLabel ? (
              <span className="mt-2 inline-flex min-h-9 items-center justify-center rounded-full bg-accent px-3.5 font-display text-xs font-black text-accent-foreground shadow-[0_3px_0_0_hsl(var(--accent-deep))]">
                ▶ {ctaLabel}
              </span>
            ) : null}
          </div>

          <ChevronLeft
            className="relative h-5 w-5 shrink-0 text-white/50 transition-transform group-active:-translate-x-0.5 rtl:rotate-180"
            strokeWidth={2.5}
            aria-hidden
          />
        </GamePanel>
      </Link>
    </motion.div>
  );
}

/** High-contrast status — never wash text into the panel wash. */
function StatusChip({
  urgent,
  waiting,
  outcome,
  label,
}: {
  urgent: boolean;
  waiting: boolean;
  outcome: "WIN" | "LOSE" | "DRAW" | null;
  label: string;
}) {
  if (urgent) {
    return (
      <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-wide text-accent-foreground shadow-[0_2px_0_0_hsl(var(--accent-deep))]">
        {label}
      </span>
    );
  }
  if (waiting) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-black/45 px-2 py-0.5 font-display text-[10px] font-black text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.45)]">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden />
        {label}
      </span>
    );
  }
  if (outcome === "WIN") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-500/30 px-2 py-0.5 font-display text-[10px] font-black text-emerald-100 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.5)]">
        {label}
      </span>
    );
  }
  if (outcome === "LOSE") {
    return (
      <span className="inline-flex items-center rounded-md bg-rose-500/30 px-2 py-0.5 font-display text-[10px] font-black text-rose-100 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.5)]">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-black/40 px-2 py-0.5 font-display text-[10px] font-black text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]">
      {label}
    </span>
  );
}
