"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { NewsPayload, NewsState } from "@/actions/claimDailyNews";
import {
  BOOSTER_DURATION_HOURS,
  formatMultiplier,
} from "@/lib/boosters/boosters";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { cn } from "@/lib/utils";

type NewspaperModalProps = {
  news: NewsPayload | null;
  state: NewsState;
  onClaim: () => void;
};

function editionDate(locale: Locale): string {
  try {
    return new Date().toLocaleDateString(locale === "fa" ? "fa-IR" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

/** Diegetic paper sheet — cream press, not Arena chrome (DESIGN exception). */
function PaperSheet({
  children,
  ariaLabel,
  dismissLabel,
  onDismiss,
}: {
  children: ReactNode;
  ariaLabel: string;
  dismissLabel: string;
  onDismiss: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-[70] mx-auto flex max-w-mobile items-center justify-center px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={onDismiss}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
      />

      {/* Stacked sheets under the front page */}
      <div
        aria-hidden
        className="pointer-events-none absolute h-[min(28rem,78vh)] w-[min(100%,20rem)] translate-x-1 translate-y-2 rotate-[2.5deg] rounded-[1.35rem] bg-[#ebe4d4] shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute h-[min(28rem,78vh)] w-[min(100%,20rem)] -translate-x-0.5 translate-y-1 -rotate-[1deg] rounded-[1.35rem] bg-[#f0eadc] shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        initial={
          reduceMotion
            ? { opacity: 0, y: 12 }
            : { scale: 0.2, rotate: -540, opacity: 0 }
        }
        animate={{ scale: 1, rotate: -1.25, opacity: 1, y: 0 }}
        exit={
          reduceMotion
            ? { opacity: 0, y: 8 }
            : { scale: 0.85, rotate: 12, opacity: 0 }
        }
        transition={{ type: "spring", stiffness: 160, damping: 14, mass: 0.85 }}
        className="relative w-full max-w-xs overflow-hidden rounded-[1.35rem] bg-[#f7f1e4] text-center text-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_18px_40px_rgba(0,0,0,0.35)]"
      >
        {/* Paper grain + ink wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.05) 0.6px, transparent 0.6px), linear-gradient(180deg, rgba(255,255,255,0.35), transparent 40%, rgba(120,90,40,0.06))",
            backgroundSize: "3px 3px, 100% 100%",
          }}
        />
        {/* Left margin rule — broadsheet cue */}
        <div
          aria-hidden
          className="absolute inset-y-4 start-3 w-px bg-black/15"
        />
        <div className="relative px-5 pb-5 pt-4">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Masthead({
  kicker,
  dateLabel,
  title,
}: {
  kicker: string;
  dateLabel: string;
  title: string;
}) {
  return (
    <header className="text-center">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="font-display text-[9px] font-bold uppercase tracking-[0.18em] text-black/45">
          {kicker}
        </span>
        <span className="font-display text-[9px] font-bold tabular-nums text-black/45">
          {dateLabel}
        </span>
      </div>
      <h1 className="mt-1.5 border-y-2 border-black pb-1.5 pt-1 font-display text-[1.05rem] font-black tracking-wide text-black">
        {title}
      </h1>
      <div
        aria-hidden
        className="mx-auto mt-1 h-px w-16 bg-black/35"
      />
    </header>
  );
}

function PaperCta({
  children,
  onClick,
  variant = "ink",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "ink" | "accent";
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ y: 3, scale: 0.98 }}
      onClick={() => {
        playSound("click");
        haptic(HAPTIC.tap);
        onClick();
      }}
      className={cn(
        "mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl font-display text-base font-black",
        variant === "accent"
          ? "bg-accent text-accent-foreground shadow-[0_4px_0_0_hsl(var(--accent-deep))]"
          : "bg-[#1a1a1a] text-[#f7f1e4] shadow-[0_4px_0_0_rgba(0,0,0,0.45)]",
      )}
    >
      {children}
    </motion.button>
  );
}

export function NewspaperModal({ news, state, onClaim }: NewspaperModalProps) {
  const { t, locale } = useTranslation();
  const dateLabel = editionDate(locale);
  const dismiss = () => {
    playSound("click");
    haptic(HAPTIC.tap);
    onClaim();
  };

  // Cooldown: today's claim is spent and nothing is running.
  if (state === "cooldown" || !news) {
    return (
      <PaperSheet
        ariaLabel={t("news.masthead")}
        dismissLabel={t("common.ok")}
        onDismiss={dismiss}
      >
        <Masthead
          kicker={t("news.soldOut")}
          dateLabel={dateLabel}
          title={t("news.masthead")}
        />

        <div className="relative mx-auto mt-5 flex h-20 w-20 items-center justify-center">
          {/* Sold-out stamp */}
          <motion.span
            aria-hidden
            initial={{ scale: 1.4, opacity: 0, rotate: -18 }}
            animate={{ scale: 1, opacity: 1, rotate: -12 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
            className="absolute -end-3 -top-2 z-10 rounded-md border-2 border-rose-700/80 px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-wider text-rose-700/90"
          >
            {t("news.soldOut")}
          </motion.span>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/[0.04] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/hub-news.png"
              alt=""
              draggable={false}
              className="h-14 w-14 object-contain drop-shadow-sm grayscale-[0.15]"
            />
          </div>
        </div>

        <h2 className="mt-4 font-display text-2xl font-black leading-tight text-black">
          {t("news.thatsAll")}
        </h2>
        <p className="mx-auto mt-2 max-w-[16rem] font-body text-sm font-bold leading-snug text-black/65">
          {t("news.comeBack")}
        </p>

        {/* Fake classified footer — diegetic empty press */}
        <div className="mt-4 rounded-xl border border-dashed border-black/20 bg-black/[0.03] px-3 py-2">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">
            {t("news.finalEdition")}
          </p>
          <p className="mt-0.5 font-body text-[11px] font-semibold text-black/50">
            {t("news.nextDrop")}
          </p>
        </div>

        <PaperCta onClick={onClaim}>{t("common.ok")}</PaperCta>
      </PaperSheet>
    );
  }

  const alreadyActive = state === "active";
  const isCoin = news.type === "COIN_BOOST";
  const multLabel = formatMultiplier(news.multiplier);
  const multDisplay = toLocaleDigits(multLabel, locale);
  const hoursDisplay = toLocaleDigits(BOOSTER_DURATION_HOURS, locale);
  const headlineKey = `news.events.${news.headline}`;
  const translated = t(headlineKey);
  const headline = translated === headlineKey ? news.headline : translated;
  const resourceIcon = isCoin ? "/icons/coin.png" : "/icons/fans.png";
  const resourceLabel = isCoin ? t("result.coins") : t("stadium.fans");

  return (
    <PaperSheet
      ariaLabel={t("news.masthead")}
      dismissLabel={t("common.ok")}
      onDismiss={dismiss}
    >
      <Masthead
        kicker={alreadyActive ? t("news.todayEdition") : t("news.breaking")}
        dateLabel={dateLabel}
        title={t("news.masthead")}
      />

      {!alreadyActive ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 font-display text-[10px] font-black uppercase tracking-wide text-white shadow-[0_2px_0_0_rgba(127,29,29,0.85)]"
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-white"
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ repeat: Infinity, duration: 0.9 }}
          />
          {t("news.breaking")}
        </motion.p>
      ) : null}

      <div className="relative mx-auto mt-4 flex h-[4.5rem] w-[4.5rem] items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-amber-500/15"
        />
        {news.emoji ? (
          <span className="relative text-5xl leading-none drop-shadow-sm" aria-hidden>
            {news.emoji}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/icons/hub-news.png"
            alt=""
            draggable={false}
            className="relative h-14 w-14 object-contain"
          />
        )}
      </div>

      <h2 className="mt-3 px-1 font-display text-[1.35rem] font-black leading-snug text-black">
        {headline}
      </h2>

      {/* Effect callout — ink stamp + resource PNG */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, rotate: -3 }}
        animate={{ scale: 1, opacity: 1, rotate: -1.5 }}
        transition={{ type: "spring", stiffness: 280, damping: 16, delay: 0.12 }}
        className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-2xl bg-primary px-3.5 py-2.5 font-display font-extrabold text-primary-foreground shadow-[0_4px_0_0_hsl(var(--primary)/0.55)]"
        aria-label={`${multDisplay}× ${resourceLabel} ${t("news.effectForHours", { hours: hoursDisplay })}`}
      >
        <span className="text-xl tabular-nums leading-none">{multDisplay}×</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resourceIcon}
          alt=""
          draggable={false}
          className="h-7 w-7 object-contain drop-shadow-sm"
        />
        <span className="text-sm font-bold leading-none">
          {t("news.effectForHours", { hours: hoursDisplay })}
        </span>
      </motion.div>

      {alreadyActive ? (
        <p className="mt-3 font-body text-xs font-bold text-black/55">
          {t("news.stillRunning")}
        </p>
      ) : (
        <p className="mt-3 font-body text-xs font-bold text-black/55">
          {t("news.claimHint")}
        </p>
      )}

      <PaperCta
        variant={alreadyActive ? "ink" : "accent"}
        onClick={onClaim}
      >
        {alreadyActive ? t("common.nice") : t("news.claim")}
      </PaperCta>
    </PaperSheet>
  );
}
