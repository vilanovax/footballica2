"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  getPushPublicKey,
  getPushStatus,
  removePushSubscription,
  savePushSubscription,
  updatePushPrefs,
} from "@/actions/push/subscribe";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Settings card — opt into Web Push for duel turns + vault-nearly-full.
 */
export function PushOptIn() {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const [configured, setConfigured] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [duelOn, setDuelOn] = useState(true);
  const [vaultOn, setVaultOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    startTransition(async () => {
      const status = await getPushStatus();
      setConfigured(status.configured);
      setSubscribed(status.subscribed);
      setDuelOn(status.duelYourTurn);
      setVaultOn(status.vaultNearlyFull);
    });
  }, []);

  async function enable() {
    setError(null);
    haptic(HAPTIC.tap);
    playSound("click");

    const keyRes = await getPushPublicKey();
    if (!keyRes.ok) {
      setError(t("settings.pushNotConfigured"));
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setError(t("settings.pushDenied"));
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        keyRes.publicKey,
      ) as BufferSource,
    });
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      setError(t("settings.pushFailed"));
      return;
    }

    const saved = await savePushSubscription({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
    if (!saved.ok) {
      setError(t("settings.pushFailed"));
      return;
    }
    setSubscribed(true);
    haptic(HAPTIC.goal);
    playSound("upgrade");
  }

  async function disable() {
    setError(null);
    haptic(HAPTIC.tap);
    playSound("click");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await removePushSubscription(sub?.endpoint);
    setSubscribed(false);
  }

  function togglePref(
    key: "duelYourTurn" | "vaultNearlyFull",
    value: boolean,
  ) {
    haptic(HAPTIC.light);
    if (key === "duelYourTurn") setDuelOn(value);
    else setVaultOn(value);
    startTransition(async () => {
      await updatePushPrefs({ [key]: value });
    });
  }

  if (!supported) {
    return (
      <p className="mt-2 font-display text-xs font-bold text-white/55">
        {t("settings.pushUnsupported")}
      </p>
    );
  }

  if (!configured) {
    return (
      <p className="mt-2 font-display text-xs font-bold text-white/55">
        {t("settings.pushNotConfigured")}
      </p>
    );
  }

  return (
    <div className="mt-3.5 flex flex-col gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => void (subscribed ? disable() : enable())}
        className={[
          "flex min-h-12 w-full items-center justify-center rounded-2xl border-2 font-display text-base font-black shadow-[0_3px_0_0_rgba(0,0,0,0.3)] transition-transform active:translate-y-px active:shadow-none disabled:opacity-60",
          subscribed
            ? "border-emerald-300/50 bg-emerald-500/25 text-emerald-100"
            : "border-sky-300/50 bg-sky-500/30 text-sky-50",
        ].join(" ")}
      >
        {subscribed ? t("settings.pushDisable") : t("settings.pushEnable")}
      </button>

      {subscribed && (
        <div className="flex flex-col gap-2">
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
        </div>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-xs font-bold text-rose-200"
        >
          {error}
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
      className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-black/25 px-3 ring-1 ring-white/10"
    >
      <span className="text-start font-display text-sm font-bold text-white/90">
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
    </button>
  );
}
