"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ChevronLeft, Swords, Zap } from "lucide-react";
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
import { GameChip, GameIconWell } from "@/components/ui/game";

type DuelLobbyProps = {
  initialDuels: DuelSnapshot[];
  initialYourTurn: DuelSnapshot[];
  /** Finished in last 24h, max 5. */
  initialHistory?: DuelSnapshot[];
  yourAvatar?: string | null;
};

function statusLabel(d: DuelSnapshot, t: (k: string) => string): string {
  if (
    d.status === "COMPLETED" ||
    d.status === "EXPIRED" ||
    d.status === "FORFEIT"
  ) {
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

  const kickoffCard = (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 }}
      className="relative z-10 overflow-hidden rounded-bubble-xl bg-surface p-5 shadow-[0_0_0_1px_hsl(var(--primary)/0.22),0_8px_0_0_rgba(0,0,0,0.12)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% -10%, hsl(var(--primary) / 0.28), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-16deg, transparent, transparent 11px, hsl(var(--foreground)) 11px, hsl(var(--foreground)) 12px)",
        }}
      />

      <div className="relative flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <AvatarRing pulse avatarKey={yourAvatar} />
          <div className="flex flex-col items-center gap-1">
            <motion.span
              className="rounded-full bg-accent px-3 py-1 font-display text-sm font-black text-accent-foreground shadow-[0_3px_0_0_hsl(var(--accent-deep))]"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            >
              VS
            </motion.span>
          </div>
          <AvatarRing mystery />
        </div>

        <div className="text-center">
          <p className="font-display text-lg font-black text-surface-foreground">
            {t("duel.lobbyKickoff")}
          </p>
          <p className="mt-1 max-w-[16rem] font-body text-xs font-semibold leading-snug text-muted-foreground">
            {t("duel.lobbyKickoffHint")}
          </p>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={handleStart}
          className="btn-fantasy btn-fantasy-primary relative w-full min-h-14 justify-center overflow-hidden text-lg"
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
                {t("duel.starting")}
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
                {t("duel.start")}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );

  return (
    <section className="relative flex flex-1 flex-col gap-4 overflow-hidden">
      {/* Pitch atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-4 h-64 overflow-hidden rounded-b-[2.5rem]"
      >
        <div className="absolute inset-0 bg-linear-to-b from-primary/28 via-primary/10 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, hsl(var(--primary)) 0 2px, transparent 2px 28px)",
          }}
        />
        <motion.div
          className="absolute -inset-s-10 top-6 h-36 w-36 rounded-full bg-accent/25 blur-3xl"
          animate={{ x: [0, 16, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        />
      </div>

      {/* Compact header */}
      <header className="relative z-10 flex items-start gap-3 pt-1">
        <GameIconWell
          size="md"
          src="/icons/hub-mission.png"
          className="mt-0.5 h-12 w-12 shrink-0 bg-secondary/20 shadow-[0_0_0_1px_hsl(var(--secondary)/0.35),0_3px_0_0_rgba(0,0,0,0.15)]"
          iconClassName="h-7 w-7"
        />
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">
            <Swords className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            {t("duel.eyebrow")}
          </p>
          <h1 className="mt-0.5 font-display text-3xl font-black tracking-tight text-foreground">
            {t("duel.lobbyTitle")}
          </h1>
          <p className="mt-1 font-body text-xs font-semibold leading-snug text-muted-foreground">
            {t("duel.lobbySub")}
          </p>
        </div>
      </header>

      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <StatChip
          label={t("duel.lobbyActive")}
          value={toLocaleDigits(activeCount, locale)}
        />
        <StatChip
          label={t("duel.yourTurn")}
          value={toLocaleDigits(turnCount, locale)}
          hot={turnCount > 0}
        />
        {turnCount === 0 && activeCount > 0 && (
          <GameChip className="border-0 bg-muted/80 text-[11px] text-muted-foreground">
            {t("duel.lobbyAllWaiting")}
          </GameChip>
        )}
      </div>

      {/* Action-first: urgent turns before kickoff */}
      {turnCount > 0 && (
        <InboxSection
          title={t("duel.inboxYourTurn")}
          badge={toLocaleDigits(turnCount, locale)}
          hot
        >
          {yourTurnList.map((d, i) => (
            <FixtureCard
              key={d.id}
              duel={d}
              index={i}
              locale={locale}
              badge={statusLabel(d, t)}
              urgent
              ctaLabel={t("duel.inboxPlayCta")}
              vsLabel={d.isBotOpponent ? t("duel.vsBot") : t("duel.vsRival")}
              youLabel={t("duel.you")}
            />
          ))}
        </InboxSection>
      )}

      {kickoffCard}

      <div className="relative z-10 flex flex-col gap-4 pb-4">
        {!hasAny && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-bubble-xl bg-surface/70 px-4 py-8 text-center shadow-[0_0_0_1px_hsl(var(--border))]"
          >
            <GameIconWell
              size="lg"
              src="/icons/stadium.png"
              className="mx-auto h-16 w-16 bg-primary/15"
              iconClassName="h-9 w-9"
            />
            <p className="mt-3 font-display text-sm font-bold text-muted-foreground">
              {t("duel.empty")}
            </p>
          </motion.div>
        )}

        {/* Waiting — only when there are fixtures */}
        {waitingList.length > 0 && (
          <InboxSection
            title={t("duel.inboxWaiting")}
            badge={toLocaleDigits(waitingList.length, locale)}
            muted
          >
            {waitingList.map((d, i) => (
              <FixtureCard
                key={d.id}
                duel={d}
                index={i}
                locale={locale}
                badge={statusLabel(d, t)}
                urgent={false}
                muted
                vsLabel={d.isBotOpponent ? t("duel.vsBot") : t("duel.vsRival")}
                youLabel={t("duel.you")}
              />
            ))}
          </InboxSection>
        )}

        {/* Finished — hide entirely when empty */}
        {finishedList.length > 0 && (
          <InboxSection title={t("duel.inboxFinished")}>
            {finishedList.map((d, i) => (
              <FixtureCard
                key={d.id}
                duel={d}
                index={i}
                locale={locale}
                badge={
                  d.youTimedOut
                    ? t("duel.expiredLose")
                    : statusLabel(d, t)
                }
                urgent={false}
                finished
                vsLabel={d.isBotOpponent ? t("duel.vsBot") : t("duel.vsRival")}
                youLabel={t("duel.you")}
              />
            ))}
          </InboxSection>
        )}
      </div>
    </section>
  );
}

function InboxSection({
  title,
  badge,
  hot,
  muted,
  children,
}: {
  title: string;
  badge?: string;
  hot?: boolean;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={["relative z-10", muted ? "opacity-90" : ""].join(" ")}>
      <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
        <h2
          className={[
            "font-display text-sm font-black tracking-wide",
            hot ? "text-secondary" : "text-muted-foreground",
          ].join(" ")}
        >
          {title}
        </h2>
        {badge ? (
          <span
            className={[
              "inline-flex min-h-7 min-w-7 items-center justify-center rounded-full px-2.5 font-display text-[11px] font-black tabular-nums shadow-[0_2px_0_0_rgba(0,0,0,0.2)]",
              hot
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function StatChip({
  label,
  value,
  hot,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-bold shadow-[0_2px_0_0_rgba(0,0,0,0.12)]",
        hot
          ? "bg-secondary/20 text-secondary ring-1 ring-secondary/40"
          : "bg-surface/95 text-muted-foreground ring-1 ring-border/80",
      ].join(" ")}
    >
      <span
        className={[
          "tabular-nums font-black",
          hot ? "text-secondary" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </span>
      {label}
    </span>
  );
}

function AvatarRing({
  pulse,
  mystery,
  avatarKey,
}: {
  pulse?: boolean;
  mystery?: boolean;
  avatarKey?: string | null;
}) {
  return (
    <div className="relative">
      {pulse && (
        <motion.span
          className="absolute inset-0 rounded-full bg-primary/35"
          animate={{ scale: [1, 1.28], opacity: [0.55, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        />
      )}
      <div
        className={[
          "relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-[0_3px_0_0_rgba(0,0,0,0.2)] ring-4",
          mystery
            ? "bg-muted ring-border"
            : "bg-primary/10 ring-primary/55",
        ].join(" ")}
      >
        {mystery ? (
          <motion.span
            className="font-display text-2xl font-black text-muted-foreground"
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            ?
          </motion.span>
        ) : (
          <AvatarImage
            avatarKey={avatarKey}
            className="h-14 w-14 rounded-full"
          />
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
  muted,
  finished,
  ctaLabel,
  vsLabel,
  youLabel,
}: {
  duel: DuelSnapshot;
  index: number;
  locale: Locale;
  badge: string;
  urgent: boolean;
  muted?: boolean;
  finished?: boolean;
  ctaLabel?: string;
  vsLabel: string;
  youLabel: string;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.2, 0.04 + index * 0.04) }}
    >
      <Link
        href={`/play/duel/${d.id}`}
        className={[
          "group relative flex min-h-18 items-center gap-3 overflow-hidden rounded-bubble-xl p-3.5 transition-transform active:scale-[0.985]",
          urgent
            ? "bg-linear-to-br from-secondary/30 via-surface to-amber-400/10 shadow-[0_0_0_1px_hsl(var(--secondary)/0.55),0_6px_0_0_hsl(var(--secondary-deep)/0.35)]"
            : muted
              ? "bg-muted/40 shadow-[0_0_0_1px_hsl(var(--border)/0.7),0_4px_0_0_rgba(0,0,0,0.08)]"
              : isFinished
                ? "bg-muted/35 shadow-[0_0_0_1px_hsl(var(--border)/0.6),0_3px_0_0_rgba(0,0,0,0.06)]"
                : "bg-surface shadow-[0_0_0_1px_hsl(var(--border)),0_4px_0_0_rgba(0,0,0,0.1)]",
        ].join(" ")}
      >
        {urgent && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 inset-s-0 w-1 bg-secondary"
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ repeat: Infinity, duration: 1.35 }}
          />
        )}

        <div className="relative shrink-0 ps-0.5">
          <AvatarImage
            avatarKey={themParty?.avatar}
            className={[
              "h-14 w-14 rounded-full ring-2",
              urgent ? "ring-secondary/50" : "ring-border",
            ].join(" ")}
            muted={!themParty?.avatar || themLost || muted}
          />
          {d.isBotOpponent && !d.shadowBotActive && (
            <span className="absolute -bottom-0.5 -inset-e-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] shadow-sm ring-2 ring-surface">
              🤖
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 text-start">
          <p className="truncate font-display text-[15px] font-black text-surface-foreground">
            {themParty?.name ?? vsLabel}
          </p>

          {/* Mini scoreboard */}
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-display text-sm font-black tabular-nums",
                urgent
                  ? "bg-secondary/20 text-foreground"
                  : "bg-foreground/6 text-foreground",
              ].join(" ")}
            >
              <span>{toLocaleDigits(you, locale)}</span>
              <span className="text-muted-foreground">–</span>
              <span>{toLocaleDigits(them, locale)}</span>
            </span>
            <span className="truncate font-body text-[11px] font-semibold text-muted-foreground">
              {youLabel}
              {youParty?.name ? ` · ${youParty.name}` : ""}
            </span>
          </div>

          {urgent && ctaLabel ? (
            <span className="mt-2 inline-flex min-h-9 items-center justify-center rounded-full bg-secondary px-3.5 font-display text-xs font-black text-secondary-foreground shadow-[0_3px_0_0_hsl(var(--secondary-deep))]">
              ▶ {ctaLabel}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={[
              "rounded-full px-2.5 py-1 font-display text-[10px] font-black uppercase tracking-wide",
              urgent
                ? "bg-secondary text-secondary-foreground shadow-[0_2px_0_0_hsl(var(--secondary-deep))]"
                : muted
                  ? "bg-slate-500/15 text-slate-600"
                  : isFinished
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/15 text-primary",
            ].join(" ")}
          >
            {badge}
          </span>
          <ChevronLeft
            className="h-4 w-4 text-muted-foreground transition-transform group-active:-translate-x-0.5 rtl:rotate-180"
            strokeWidth={2.5}
            aria-hidden
          />
        </div>
      </Link>
    </motion.div>
  );
}
