"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  buildFacility,
  collectFacilities,
  upgradeFacility,
  upgradeVault,
  withdrawVault,
} from "@/actions/club/business";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import { FacilityBusinessCard } from "@/components/club-hub/FacilityBusinessCard";
import { BankBusinessSheet } from "@/components/club-hub/BankBusinessSheet";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type BusinessPanelProps = {
  club: ClubSnapshot;
  onClubUpdate: (club: ClubSnapshot) => void;
};

function formatDuration(ms: number, locale: "en" | "fa"): string {
  if (ms <= 0) return "—";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) {
    return locale === "fa"
      ? `${toLocaleDigits(m, locale)} د`
      : `${m}m`;
  }
  return locale === "fa"
    ? `${toLocaleDigits(h, locale)} س ${toLocaleDigits(m, locale)} د`
    : `${h}h ${m}m`;
}

/**
 * Club Funds panel — Collect All stays primary; facilities open detail sheets.
 */
export function BusinessPanel({ club, onClubUpdate }: BusinessPanelProps) {
  const { t, locale } = useTranslation();
  const biz = club.business;
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  function run(
    label: string,
    action: () => Promise<
      | { ok: true; club: ClubSnapshot; transferred?: number }
      | { ok: false; error: string }
    >,
    okMsg?: (transferred?: number) => string,
  ) {
    setBusy(label);
    startTransition(async () => {
      const res = await action();
      setBusy(null);
      if (!res.ok) {
        toast.error(res.error);
        haptic(HAPTIC.miss);
        return;
      }
      onClubUpdate(res.club);
      playSound("upgrade");
      haptic(HAPTIC.tap);
      if (okMsg) toast.success(okMsg(res.transferred));
    });
  }

  const primaryCollect = biz.collectableTotal > 0;
  const vaultHigh = biz.vaultFillRatio >= 0.8 && biz.vaultBalance > 0;
  const boost = biz.incomeBoost;
  const vaultMaxed = biz.vaultUpgradeCost === null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-foreground">
          {t("club.biz.title")}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-1.5 font-display text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              haptic(HAPTIC.light);
              playSound("click");
              setBankOpen(true);
            }}
            title={t("club.biz.funds")}
            className={[
              "rounded-full px-2.5 py-1 transition-transform active:scale-95",
              biz.bank.sponsoredActive
                ? "bg-sky-500/20 text-sky-900 ring-2 ring-sky-300/60"
                : "bg-emerald-500/15 text-emerald-800",
            ].join(" ")}
          >
            {t("club.biz.fundsChip", {
              n: toLocaleDigits(biz.clubFunds, locale),
            })}
            {biz.bank.sponsoredActive ? " ★" : ""}
          </button>
          <button
            type="button"
            onClick={() => {
              haptic(HAPTIC.light);
              playSound("click");
              setVaultOpen(true);
            }}
            title={t("club.biz.vault")}
            className={[
              "rounded-full px-2.5 py-1 transition-transform active:scale-95",
              vaultHigh
                ? "bg-amber-400 text-amber-950 ring-2 ring-amber-300"
                : "bg-amber-500/15 text-amber-900",
            ].join(" ")}
          >
            {t("club.biz.vaultChip", {
              cur: toLocaleDigits(biz.vaultBalance, locale),
              max: toLocaleDigits(biz.vaultCap, locale),
            })}
          </button>
        </div>
      </div>

      {boost.active && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-accent/40 bg-accent/10 px-3 py-2.5">
          <p className="font-display text-xs font-bold text-accent-deep">
            {t("club.biz.boostActive", {
              pct: toLocaleDigits(
                Math.round((boost.multiplier - 1) * 100),
                locale,
              ),
            })}
          </p>
          <span className="shrink-0 font-display text-[11px] font-bold text-accent-deep">
            {formatDuration(boost.msRemaining, locale)}
          </span>
        </div>
      )}

      {vaultHigh && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-center">
          <p className="font-display text-xs font-bold text-amber-950">
            {biz.vaultFillRatio >= 1
              ? t("club.biz.vaultFull")
              : t("club.biz.vaultAlmostFull", {
                  pct: toLocaleDigits(
                    Math.round(biz.vaultFillRatio * 100),
                    locale,
                  ),
                })}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t("club.biz.rateLine", {
          rate: toLocaleDigits(biz.totalRatePerHour, locale),
          eta: formatDuration(biz.msUntilVaultFull, locale),
        })}
      </p>

      <div className="flex flex-col gap-2">
        {primaryCollect && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                "collect",
                () => collectFacilities("ALL"),
                (n) =>
                  t("club.biz.collected", {
                    n: toLocaleDigits(n ?? 0, locale),
                  }),
              )
            }
            className="btn-fantasy btn-fantasy-primary w-full"
          >
            {busy === "collect"
              ? "…"
              : t("club.biz.collectAll", {
                  n: toLocaleDigits(biz.collectableTotal, locale),
                })}
          </button>
        )}
        {(vaultHigh || (!primaryCollect && biz.vaultBalance > 0)) && (
          <button
            type="button"
            disabled={pending || biz.vaultBalance <= 0}
            onClick={() =>
              run("withdraw", () => withdrawVault(), () =>
                t("club.biz.withdrawn"),
              )
            }
            className={[
              "flex min-h-touch w-full items-center justify-center rounded-bubble border-2 px-4 py-3 font-display text-sm font-bold transition-transform active:scale-[0.98]",
              vaultHigh
                ? "border-amber-400 bg-amber-50 text-amber-950 shadow-[0_4px_0_0_#d97706]"
                : "border-border bg-surface text-foreground",
            ].join(" ")}
          >
            {busy === "withdraw"
              ? "…"
              : t("club.biz.withdraw", {
                  n: toLocaleDigits(biz.vaultBalance, locale),
                })}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {biz.facilities.map((f) => (
          <FacilityBusinessCard
            key={f.key}
            facility={f}
            clubFunds={biz.clubFunds}
            pending={pending}
            onBuild={() =>
              run(`build-${f.key}`, () => buildFacility(f.key), () =>
                t("club.biz.built"),
              )
            }
            onUpgrade={() =>
              run(`up-${f.key}`, () => upgradeFacility(f.key), () =>
                t("club.biz.upgraded"),
              )
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          haptic(HAPTIC.light);
          playSound("click");
          setVaultOpen(true);
        }}
        className="flex min-h-touch w-full items-center justify-between rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 font-display text-sm font-bold text-foreground transition-transform active:scale-[0.99]"
      >
        <span>
          {t("club.biz.upgradeVault", {
            n: toLocaleDigits(biz.vaultLevel, locale),
          })}
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-800">
          {vaultMaxed ? (
            "MAX"
          ) : (
            t("club.biz.cardUpgrade", {
              n: toLocaleDigits(biz.vaultUpgradeCost!, locale),
            })
          )}
          <ChevronRight className="h-4 w-4 opacity-50 rtl:rotate-180" />
        </span>
      </button>

      <BankBusinessSheet
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        club={club}
        pending={pending || busy !== null}
        onClubUpdate={onClubUpdate}
        onBusy={setBusy}
        onError={(msg) => {
          toast.error(msg);
          haptic(HAPTIC.miss);
        }}
        onSuccess={(msg) => {
          toast.success(msg);
          playSound("upgrade");
          haptic(HAPTIC.tap);
        }}
      />

      <BottomSheet
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        title={t("club.biz.vaultTitle")}
        subtitle={t("club.biz.levelOf", {
          n: toLocaleDigits(biz.vaultLevel, locale),
          max: toLocaleDigits(biz.vaultMaxLevel, locale),
        })}
        closeLabel={t("common.close")}
        tone="dark"
      >
        <div className="relative mb-4 overflow-hidden rounded-bubble-xl border border-white/15 bg-gradient-to-br from-[#3d2a08] via-[#7a5410] to-[#b8860b] px-4 pb-5 pt-6 shadow-[0_8px_0_0_rgba(0,0,0,0.35)]">
          <div
            className="pointer-events-none absolute -start-6 top-0 h-28 w-28 rounded-full bg-amber-300/40 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-col items-center">
            <motion.span
              className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/25 bg-black/25 text-6xl shadow-[0_0_40px_rgba(251,191,36,0.35)]"
              animate={{ y: [0, -5, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.6,
                ease: "easeInOut",
              }}
              aria-hidden
            >
              🏦
            </motion.span>
            <span className="mt-3 rounded-full bg-accent px-3 py-1 font-display text-xs font-black text-accent-foreground shadow-[0_3px_0_0_hsl(var(--accent-deep))]">
              {t("club.biz.levelOf", {
                n: toLocaleDigits(biz.vaultLevel, locale),
                max: toLocaleDigits(biz.vaultMaxLevel, locale),
              })}
            </span>
          </div>
        </div>

        <p className="text-center font-body text-sm font-semibold leading-relaxed text-white/65">
          {t("club.biz.vaultDesc")}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-bubble-lg border-2 border-white/12 bg-white/8 px-3 py-2.5 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
            <p className="font-display text-[10px] font-bold uppercase tracking-wide text-white/50">
              💰 {t("club.biz.statReady")}
            </p>
            <p
              dir="ltr"
              className="mt-1 font-display text-xl font-black tabular-nums text-white"
            >
              {toLocaleDigits(biz.vaultBalance, locale)}
            </p>
          </div>
          <div className="rounded-bubble-lg border-2 border-white/12 bg-white/8 px-3 py-2.5 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
            <p className="font-display text-[10px] font-bold uppercase tracking-wide text-white/50">
              📦 {t("club.biz.statCap")}
            </p>
            <p
              dir="ltr"
              className="mt-1 font-display text-xl font-black tabular-nums text-white"
            >
              {toLocaleDigits(biz.vaultCap, locale)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between font-display text-[11px] font-bold text-white/55">
            <span>{t("club.biz.bufferMeter")}</span>
            <span dir="ltr" className="tabular-nums text-accent">
              {toLocaleDigits(Math.round(biz.vaultFillRatio * 100), locale)}%
            </span>
          </div>
          <div className="relative h-4 overflow-hidden rounded-full border-2 border-white/15 bg-black/40 shadow-inner">
            <motion.div
              className={[
                "absolute inset-y-0 start-0 rounded-full",
                biz.vaultFillRatio >= 0.8
                  ? "bg-gradient-to-r from-amber-400 to-orange-400"
                  : "bg-gradient-to-r from-emerald-400 to-lime-300",
              ].join(" ")}
              initial={false}
              animate={{
                width: `${Math.round(biz.vaultFillRatio * 100)}%`,
              }}
              transition={{ type: "spring", stiffness: 220, damping: 28 }}
            />
          </div>
          <p className="mt-2 font-display text-xs font-bold text-white/50">
            {t("club.biz.vaultEta", {
              eta: formatDuration(biz.msUntilVaultFull, locale),
            })}
          </p>
        </div>

        {!vaultMaxed && biz.nextVaultCap != null && (
          <div className="mt-4 overflow-hidden rounded-bubble-xl border-2 border-accent/60 bg-gradient-to-br from-accent/25 via-[#2a2410] to-[#1a1608] px-3.5 py-3.5 shadow-[0_5px_0_0_hsl(var(--accent-deep))]">
            <p className="font-display text-[10px] font-black uppercase tracking-widest text-accent">
              {t("club.biz.nextUpgrade")}
            </p>
            <p className="mt-1 font-display text-base font-black text-white">
              {t("club.biz.vaultNextCap", {
                from: toLocaleDigits(biz.vaultCap, locale),
                to: toLocaleDigits(biz.nextVaultCap, locale),
              })}
            </p>
            <div className="mt-3 flex items-center justify-between rounded-bubble bg-black/35 px-3 py-2 ring-1 ring-white/10">
              <span className="font-display text-xs font-bold text-white/55">
                {t("club.biz.upgradeCostLine", {
                  n: toLocaleDigits(biz.vaultUpgradeCost!, locale),
                })}
              </span>
              <span
                dir="ltr"
                className="inline-flex items-center gap-1 font-display text-sm font-black text-accent"
              >
                💎 {toLocaleDigits(biz.vaultUpgradeCost!, locale)}
              </span>
            </div>
          </div>
        )}

        {vaultMaxed && (
          <div className="mt-4 rounded-bubble-xl border-2 border-amber-400/50 bg-amber-500/20 px-3 py-3 text-center">
            <p className="font-display text-base font-black text-amber-300">
              👑 {t("club.biz.maxed")}
            </p>
          </div>
        )}

        {biz.vaultBalance > 0 && (
          <motion.button
            type="button"
            disabled={pending}
            onClick={() => {
              setVaultOpen(false);
              run("withdraw", () => withdrawVault(), () =>
                t("club.biz.withdrawn"),
              );
            }}
            whileTap={pending ? undefined : { y: 4 }}
            className="btn-fantasy btn-fantasy-secondary mt-5 min-h-14 w-full"
          >
            {t("club.biz.withdraw", {
              n: toLocaleDigits(biz.vaultBalance, locale),
            })}
          </motion.button>
        )}

        {!vaultMaxed && biz.vaultUpgradeCost !== null && (
          <motion.button
            type="button"
            disabled={pending || biz.clubFunds < biz.vaultUpgradeCost}
            onClick={() => {
              setVaultOpen(false);
              run("vault", () => upgradeVault(), () =>
                t("club.biz.vaultUpgraded"),
              );
            }}
            whileTap={
              pending || biz.clubFunds < biz.vaultUpgradeCost
                ? undefined
                : { y: 4 }
            }
            className={[
              "mt-3 flex min-h-14 w-full items-center justify-center rounded-bubble-xl px-4 font-display text-base font-black",
              biz.clubFunds >= biz.vaultUpgradeCost
                ? "bg-accent text-accent-foreground shadow-[0_6px_0_0_hsl(var(--accent-deep))]"
                : "cursor-not-allowed border-2 border-white/15 bg-white/10 text-white/55 shadow-[0_4px_0_0_rgba(0,0,0,0.4)]",
            ].join(" ")}
          >
            {biz.clubFunds >= biz.vaultUpgradeCost
              ? t("club.biz.upgrade", {
                  n: toLocaleDigits(biz.vaultUpgradeCost, locale),
                })
              : t("club.biz.needFunds", {
                  n: toLocaleDigits(biz.vaultUpgradeCost, locale),
                  have: toLocaleDigits(biz.clubFunds, locale),
                })}
          </motion.button>
        )}
      </BottomSheet>
    </section>
  );
}
