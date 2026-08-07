"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { playSound } from "@/lib/audio/SoundManager";

type Props = {
  dateKey: string;
  shareCode: string;
  status: "SOLVED" | "FAILED";
  answerName: string;
  guessCount: number;
  maxGuesses: number;
  mysteryStreak: number;
};

function buildShareText(props: Props, title: string): string {
  const header =
    props.status === "SOLVED"
      ? `${title} ${props.guessCount}/${props.maxGuesses}`
      : `${title} X/${props.maxGuesses}`;
  return [
    `Footballica · ${header}`,
    props.dateKey,
    props.shareCode,
    props.status === "SOLVED" ? props.answerName : "",
    props.mysteryStreak > 0 ? `🔥 ${props.mysteryStreak}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Shareable result card — visual grid + copy / native share.
 */
export function MysteryShareCard(props: Props) {
  const { t, locale } = useTranslation();
  const [busy, setBusy] = useState(false);
  const text = buildShareText(props, t("mystery.title"));

  async function copy() {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(text);
      playSound("click");
      toast.success(t("mystery.shared"));
    } catch {
      toast.error(t("mystery.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copy();
      return;
    }
    setBusy(true);
    try {
      await navigator.share({ title: t("mystery.title"), text });
      playSound("click");
    } catch {
      /* user cancelled */
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="overflow-hidden rounded-3xl border border-amber-400/35 bg-linear-to-b from-amber-500/20 via-surface to-surface shadow-fantasy"
    >
      <div className="border-b border-amber-400/20 px-4 py-3 text-center">
        <p className="font-display text-[11px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-200">
          Footballica
        </p>
        <p className="font-display text-lg font-black text-foreground">
          {t("mystery.title")}
        </p>
        <p className="font-display text-xs font-bold text-muted-foreground">
          {props.dateKey}
        </p>
      </div>

      <div className="px-4 py-4 text-center">
        <pre className="font-mono text-xl leading-relaxed tracking-wide">
          {props.shareCode}
        </pre>
        <p className="mt-2 font-display text-sm font-bold text-foreground">
          {props.status === "SOLVED"
            ? t("mystery.answerWas", { name: props.answerName })
            : t("mystery.failed")}
        </p>
        <p className="mt-1 font-display text-xs font-bold text-muted-foreground">
          {t("mystery.guessesLeft", {
            cur: toLocaleDigits(props.guessCount, locale),
            max: toLocaleDigits(props.maxGuesses, locale),
          })}
          {props.mysteryStreak > 0
            ? ` · ${t("mystery.streak", {
                n: toLocaleDigits(props.mysteryStreak, locale),
              })}`
            : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border/60 p-3">
        <button
          type="button"
          disabled={busy}
          onClick={copy}
          className="flex min-h-touch items-center justify-center rounded-bubble border border-border bg-muted font-display text-sm font-bold"
        >
          {t("mystery.share")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={nativeShare}
          className="game-cta game-cta-primary min-h-touch"
        >
          {t("mystery.shareNative")}
        </button>
      </div>
    </motion.div>
  );
}
