"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  getTelegramStatus,
  unlinkTelegram,
  updateTelegramPrefs,
  type TelegramPrefsInput,
} from "@/actions/push/telegram";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { GameCta, GameChip, GameTile } from "@/components/ui/game";

type PrefKey = keyof Omit<TelegramPrefsInput, "enabled">;

/**
 * Settings card — link Telegram for the same re-engagement events as Web Push.
 */
export function TelegramOptIn() {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [configured, setConfigured] = useState(false);
  const [linked, setLinked] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [duelOn, setDuelOn] = useState(true);
  const [vaultOn, setVaultOn] = useState(true);
  const [newsOn, setNewsOn] = useState(true);
  const [staminaOn, setStaminaOn] = useState(true);

  function refresh() {
    startTransition(async () => {
      const status = await getTelegramStatus();
      setConfigured(status.configured);
      setLinked(status.linked);
      setDeepLink(status.deepLink);
      setEnabled(status.enabled);
      setDuelOn(status.duelYourTurn);
      setVaultOn(status.vaultNearlyFull);
      setNewsOn(status.newspaperReady);
      setStaminaOn(status.staminaFull);
    });
  }

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + focus only
  }, []);

  function connect() {
    if (!deepLink) return;
    haptic(HAPTIC.tap);
    playSound("click");
    window.open(deepLink, "_blank", "noopener,noreferrer");
  }

  function unlink() {
    haptic(HAPTIC.tap);
    playSound("click");
    startTransition(async () => {
      await unlinkTelegram();
      setLinked(false);
    });
  }

  function togglePref(key: PrefKey | "enabled", value: boolean) {
    haptic(HAPTIC.light);
    if (key === "enabled") setEnabled(value);
    else if (key === "duelYourTurn") setDuelOn(value);
    else if (key === "vaultNearlyFull") setVaultOn(value);
    else if (key === "newspaperReady") setNewsOn(value);
    else if (key === "staminaFull") setStaminaOn(value);
    startTransition(async () => {
      await updateTelegramPrefs({ [key]: value });
    });
  }

  if (!configured) {
    return (
      <p className="mt-2 font-display text-xs font-bold text-white/55">
        {t("settings.telegramNotConfigured")}
      </p>
    );
  }

  return (
    <div className="mt-3.5 flex flex-col gap-3">
      {linked ? (
        <GameChip tone="emerald" className="self-start uppercase tracking-wide">
          {t("settings.telegramLinked")}
        </GameChip>
      ) : null}

      <GameCta
        variant={linked ? "ghost" : "accent"}
        block
        disabled={pending || (!linked && !deepLink)}
        onClick={() => void (linked ? unlink() : connect())}
      >
        {linked ? t("settings.telegramUnlink") : t("settings.telegramConnect")}
      </GameCta>

      {!linked ? (
        <p className="font-display text-[11px] font-bold leading-snug text-white/55">
          {t("settings.telegramConnectHint")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <PrefSwitch
            label={t("settings.telegramMaster")}
            checked={enabled}
            onChange={(v) => togglePref("enabled", v)}
          />
          <PrefSwitch
            label={t("settings.pushDuel")}
            checked={duelOn}
            onChange={(v) => togglePref("duelYourTurn", v)}
          />
          <PrefSwitch
            label={t("settings.pushVault")}
            checked={vaultOn}
            onChange={(v) => togglePref("vaultNearlyFull", v)}
          />
          <PrefSwitch
            label={t("settings.pushNewspaper")}
            checked={newsOn}
            onChange={(v) => togglePref("newspaperReady", v)}
          />
          <PrefSwitch
            label={t("settings.pushStamina")}
            checked={staminaOn}
            onChange={(v) => togglePref("staminaFull", v)}
          />
        </div>
      )}

      {linked && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-[11px] font-bold text-white/45"
        >
          {t("settings.telegramRefreshHint")}
        </motion.p>
      )}
    </div>
  );
}

function PrefSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full text-start"
    >
      <GameTile
        tone={checked ? "amber" : "default"}
        className="flex min-h-11 items-center justify-between gap-3 px-3 py-2"
      >
        <span className="font-display text-sm font-bold text-white/90">
          {label}
        </span>
        <span
          className={[
            "relative flex h-7 w-12 items-center rounded-full px-0.5 transition-colors",
            checked ? "justify-end bg-accent" : "justify-start bg-white/20",
          ].join(" ")}
        >
          <span className="h-6 w-6 rounded-full bg-white shadow" />
        </span>
      </GameTile>
    </button>
  );
}
