"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Swords, Zap, ChevronLeft } from "lucide-react";
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
  if (d.canAct) return t("duel.yourTurn");
  if (d.status === "WAITING_A" && d.youAre === "challenger") {
    return t("duel.yourTurn");
  }
  if (d.status === "WAITING_B" && d.youAre === "opponent") {
    return t("duel.yourTurn");
  }
  return t("duel.waiting");
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

  return (
    <section className="relative flex flex-1 flex-col gap-5 overflow-hidden">
      {/* Pitch atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-1rem] top-[-1rem] h-72 overflow-hidden rounded-b-[2.5rem]"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/25 via-primary/8 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, hsl(var(--primary)) 0 2px, transparent 2px 28px)",
          }}
        />
        <motion.div
          className="absolute -start-10 top-8 h-40 w-40 rounded-full bg-accent/30 blur-3xl"
          animate={{ x: [0, 18, 0], opacity: [0.35, 0.55, 0.35] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -end-8 top-16 h-36 w-36 rounded-full bg-secondary/25 blur-3xl"
          animate={{ x: [0, -14, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
        />
      </div>

      {/* Arena header */}
      <header className="relative z-10 pt-2 text-center">
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/15 px-3 py-1 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-secondary"
        >
          <Swords className="h-3.5 w-3.5" strokeWidth={2.5} />
          {t("duel.eyebrow")}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="mt-2 font-display text-4xl font-black tracking-tight text-foreground drop-shadow-sm"
        >
          {t("duel.lobbyTitle")}
        </motion.h1>
        <p className="mx-auto mt-2 max-w-[18rem] font-body text-sm font-semibold leading-snug text-muted-foreground">
          {t("duel.lobbySub")}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <StatChip
            label={t("duel.lobbyActive")}
            value={toLocaleDigits(activeCount, locale)}
          />
          <StatChip
            label={t("duel.yourTurn")}
            value={toLocaleDigits(turnCount, locale)}
            hot={turnCount > 0}
          />
        </div>
      </header>

      {/* Kick-off CTA — game stage */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="relative z-10 overflow-hidden rounded-bubble-xl border-2 border-primary/30 bg-surface p-5 shadow-fantasy-lg"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.22), transparent 65%)",
          }}
        />
        <div className="relative flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <AvatarRing pulse avatarKey={yourAvatar} />
            <motion.span
              className="font-display text-lg font-black text-secondary"
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            >
              VS
            </motion.span>
            <AvatarRing mystery />
          </div>

          <div className="text-center">
            <p className="font-display text-base font-bold text-surface-foreground">
              {t("duel.lobbyKickoff")}
            </p>
            <p className="mt-0.5 font-body text-xs font-semibold text-muted-foreground">
              {t("duel.lobbyKickoffHint")}
            </p>
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={handleStart}
            className="btn-fantasy btn-fantasy-primary relative w-full justify-center overflow-hidden text-lg"
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

      {/* Inbox dashboard — 3 buckets */}
      <div className="relative z-10 flex flex-col gap-5 pb-4">
        {yourTurnList.length === 0 &&
          waitingList.length === 0 &&
          finishedList.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-bubble-lg border-2 border-dashed border-border/80 bg-surface/60 px-4 py-10 text-center"
            >
              <span className="text-4xl" aria-hidden>
                🏟️
              </span>
              <p className="mt-3 font-display text-sm font-bold text-muted-foreground">
                {t("duel.empty")}
              </p>
            </motion.div>
          )}

        {/* 1. Your turn */}
        <InboxSection
          title={t("duel.inboxYourTurn")}
          badge={
            turnCount > 0
              ? toLocaleDigits(turnCount, locale)
              : undefined
          }
          hot
        >
          {yourTurnList.length === 0 ? (
            <p className="px-1 font-display text-xs font-bold text-muted-foreground">
              {t("duel.inboxYourTurnEmpty")}
            </p>
          ) : (
            yourTurnList.map((d, i) => (
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
            ))
          )}
        </InboxSection>

        {/* 2. Waiting */}
        {waitingList.length > 0 ? (
          <InboxSection title={t("duel.inboxWaiting")} muted>
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
        ) : null}

        {/* 3. Finished */}
        <InboxSection title={t("duel.inboxFinished")}>
          {finishedList.length === 0 ? (
            <p className="px-1 font-display text-xs font-bold text-muted-foreground">
              {t("duel.inboxFinishedEmpty")}
            </p>
          ) : (
            finishedList.map((d, i) => (
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
                vsLabel={d.isBotOpponent ? t("duel.vsBot") : t("duel.vsRival")}
                youLabel={t("duel.you")}
              />
            ))
          )}
        </InboxSection>
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
    <div className={muted ? "opacity-75" : undefined}>
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h2
          className={[
            "font-display text-sm font-bold uppercase tracking-widest",
            hot ? "text-secondary" : "text-muted-foreground",
          ].join(" ")}
        >
          {title}
        </h2>
        {badge ? (
          <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-secondary px-2 font-display text-[11px] font-black text-secondary-foreground shadow-[0_0_12px_hsl(var(--secondary)/0.65)]">
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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-xs font-bold shadow-sm",
        hot
          ? "border-secondary/50 bg-secondary/20 text-secondary"
          : "border-border bg-surface/90 text-muted-foreground",
      ].join(" ")}
    >
      <span className="tabular-nums text-foreground">{value}</span>
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
          className="absolute inset-0 rounded-full bg-primary/30"
          animate={{ scale: [1, 1.25], opacity: [0.5, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        />
      )}
      <div
        className={[
          "relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ring-4 shadow-fantasy",
          mystery ? "bg-muted ring-border" : "bg-primary/10 ring-primary/50",
        ].join(" ")}
      >
        {mystery ? (
          <motion.span
            className="font-display text-2xl font-black text-muted-foreground"
            animate={{ opacity: [0.4, 1, 0.4] }}
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
  ctaLabel?: string;
  vsLabel: string;
  youLabel: string;
}) {
  const { you, them } = viewerMatchScore(d);
  const youParty =
    d.youAre === "challenger" ? d.challenger : d.opponent;
  const themParty =
    d.youAre === "challenger" ? d.opponent : d.challenger;
  const finished =
    d.status === "COMPLETED" ||
    d.status === "EXPIRED" ||
    d.status === "FORFEIT";
  const outcome = finished ? duelViewerOutcome(d) : null;
  const themLost = outcome === "WIN";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.05 }}
    >
      <Link
        href={`/play/duel/${d.id}`}
        className={[
          "group relative flex items-center gap-3 overflow-hidden rounded-bubble-xl border-2 p-3.5 shadow-fantasy transition-transform active:scale-[0.98]",
          urgent
            ? "border-secondary bg-gradient-to-br from-secondary/25 via-surface to-amber-500/10 shadow-[0_0_24px_hsl(var(--secondary)/0.35)]"
            : muted
              ? "border-border/50 bg-muted/30"
              : finished
                ? "border-border/70 bg-muted/40"
                : "border-border bg-surface",
        ].join(" ")}
      >
        {urgent && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 start-0 w-1.5 bg-secondary"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          />
        )}

        <div className="relative shrink-0">
          <AvatarImage
            avatarKey={themParty?.avatar}
            className="h-14 w-14 rounded-full ring-2 ring-border"
            muted={!themParty?.avatar || themLost || muted}
          />
          {d.isBotOpponent && !d.shadowBotActive && (
            <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs shadow-sm ring-2 ring-surface">
              🤖
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 text-start">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-base font-bold text-surface-foreground">
              {themParty?.name ?? vsLabel}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-md bg-foreground/5 px-2 py-0.5 font-display text-sm font-black tabular-nums text-foreground">
              {toLocaleDigits(you, locale)}
              <span className="mx-1 text-muted-foreground">–</span>
              {toLocaleDigits(them, locale)}
            </span>
            <span className="truncate font-body text-[11px] font-semibold text-muted-foreground">
              {youLabel}
              {youParty?.name ? ` · ${youParty.name}` : ""}
            </span>
          </div>
          {urgent && ctaLabel ? (
            <span className="mt-2 inline-flex min-h-9 items-center justify-center rounded-full bg-secondary px-3 font-display text-xs font-black text-secondary-foreground shadow-[0_0_14px_hsl(var(--secondary)/0.7)]">
              ▶ {ctaLabel}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={[
              "rounded-full px-2.5 py-1 font-display text-[11px] font-bold",
              urgent
                ? "bg-secondary text-secondary-foreground shadow-[0_2px_0_0_hsl(var(--secondary-deep))]"
                : finished
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
