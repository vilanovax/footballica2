"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  activateSponsoredBank,
  deactivateSponsoredBank,
} from "@/actions/club/bank";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

function formatDuration(ms: number, locale: "en" | "fa"): string {
  if (ms <= 0) return locale === "fa" ? "الان" : "now";
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

type BankBusinessSheetProps = {
  open: boolean;
  onClose: () => void;
  club: ClubSnapshot;
  pending: boolean;
  onClubUpdate: (club: ClubSnapshot) => void;
  onBusy: (label: string | null) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
};

/**
 * Simplified Bank sheet — balance hero + one clear sponsored upgrade path.
 */
export function BankBusinessSheet({
  open,
  onClose,
  club,
  pending,
  onClubUpdate,
  onBusy,
  onError,
  onSuccess,
}: BankBusinessSheetProps) {
  const { t, locale } = useTranslation();
  const bank = club.business.bank;
  const sponsorName =
    locale === "fa" ? bank.sponsorNameFa : bank.sponsorNameEn;
  const title = bank.sponsoredActive
    ? sponsorName
    : t("club.biz.bankDefaultName");
  const subtitle = bank.sponsoredActive
    ? t("club.biz.bankSponsoredBadge")
    : t("club.biz.bankClubBadge");

  const nextProfitLabel =
    bank.nextInterestEstimate > 0
      ? `+${toLocaleDigits(bank.nextInterestEstimate, locale)}`
      : t("club.biz.bankProfitNeedMin", {
          n: toLocaleDigits(bank.minBalance, locale),
        });

  async function activate() {
    onBusy("bank-up");
    const res = await activateSponsoredBank();
    onBusy(null);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onClubUpdate(res.club);
    onSuccess(t("club.biz.bankActivated", { name: sponsorName }));
    onClose();
  }

  async function deactivate() {
    onBusy("bank-down");
    const res = await deactivateSponsoredBank();
    onBusy(null);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onClubUpdate(res.club);
    onSuccess(t("club.biz.bankDeactivated"));
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      closeLabel={t("common.close")}
      tone="dark"
    >
      {/* Balance hero — one composition */}
      <div
        className={[
          "relative -mx-1 overflow-hidden rounded-bubble-xl border border-white/15 bg-gradient-to-br shadow-[0_8px_0_0_rgba(0,0,0,0.35)]",
          bank.sponsoredActive
            ? "from-[#1e3a5f] via-[#1d4ed8] to-[#0ea5e9]"
            : "from-[#064e3b] via-[#047857] to-[#34d399]",
        ].join(" ")}
      >
        <div
          className="pointer-events-none absolute -end-10 -top-8 h-36 w-36 rounded-full bg-accent/35 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-14deg, transparent, transparent 14px, #fff 14px, #fff 15px)",
          }}
          aria-hidden
        />

        <div className="relative flex flex-col items-center px-4 pb-6 pt-5">
          <motion.span
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-black/30 text-4xl shadow-[0_0_36px_rgba(255,255,255,0.18)]"
            animate={{ y: [0, -4, 0] }}
            transition={{
              repeat: Infinity,
              duration: 2.4,
              ease: "easeInOut",
            }}
            aria-hidden
          >
            {bank.sponsoredActive ? "🏛️" : "🏦"}
          </motion.span>

          <p className="mt-3 font-display text-[11px] font-bold uppercase tracking-widest text-white/60">
            {t("club.biz.bankStatBalance")}
          </p>
          <motion.p
            key={bank.balance}
            initial={{ scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            dir="ltr"
            className="mt-0.5 font-display text-5xl font-black tabular-nums tracking-tight text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]"
          >
            {toLocaleDigits(bank.balance, locale)}
          </motion.p>
          <p className="mt-1.5 max-w-[16rem] text-center font-display text-xs font-bold text-white/75">
            {bank.sponsoredActive
              ? t("club.biz.bankSponsoredHint", {
                  pct: toLocaleDigits(bank.interestPercent, locale),
                  hours: toLocaleDigits(bank.intervalHours, locale),
                })
              : t("club.biz.bankSpendHint")}
          </p>
        </div>
      </div>

      {/* Sponsored active — countdown strip */}
      {bank.sponsoredActive && (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-bubble-xl border-2 border-lime-400/40 bg-lime-500/15 px-3 py-3 shadow-[0_4px_0_0_rgba(132,204,22,0.3)]">
            <p className="font-display text-[10px] font-black uppercase tracking-wide text-lime-300/90">
              📈 {t("club.biz.bankStatNextProfit")}
            </p>
            <p
              dir="ltr"
              className="mt-1 font-display text-2xl font-black tabular-nums text-lime-200"
            >
              {nextProfitLabel}
            </p>
          </div>
          <div className="rounded-bubble-xl border-2 border-accent/50 bg-accent/15 px-3 py-3 shadow-[0_4px_0_0_hsl(var(--accent-deep))]">
            <p className="font-display text-[10px] font-black uppercase tracking-wide text-accent">
              ⏱ {t("club.biz.bankStatNextIn")}
            </p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-white">
              {bank.msUntilNextInterest != null
                ? formatDuration(bank.msUntilNextInterest, locale)
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Upgrade offer — single job */}
      {bank.sponsoredAvailable && !bank.sponsoredActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-4 overflow-hidden rounded-bubble-xl border-2 border-accent bg-gradient-to-br from-accent/30 via-[#2a1f08] to-[#12100a] p-1 shadow-[0_6px_0_0_hsl(var(--accent-deep))]"
        >
          <div className="rounded-[1.1rem] bg-gradient-to-b from-black/20 to-black/50 px-3.5 pb-3.5 pt-3">
            <div className="flex items-start gap-3">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-3xl shadow-[0_4px_0_0_hsl(var(--accent-deep))]"
                aria-hidden
              >
                🏛️
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[10px] font-black uppercase tracking-widest text-accent">
                  {t("club.biz.bankUpgradeTitle")}
                </p>
                <p className="mt-0.5 font-display text-xl font-black leading-tight text-white">
                  {sponsorName}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <PerkChip>
                    {t("club.biz.bankOfferLine", {
                      pct: toLocaleDigits(bank.interestPercent, locale),
                      hours: toLocaleDigits(bank.intervalHours, locale),
                    })}
                  </PerkChip>
                  <PerkChip>
                    {t("club.biz.bankPerkAuto")}
                  </PerkChip>
                </div>
              </div>
            </div>

            <motion.button
              type="button"
              disabled={pending || !bank.canAffordUpgrade}
              onClick={() => void activate()}
              whileTap={
                pending || !bank.canAffordUpgrade ? undefined : { y: 3 }
              }
              className={[
                "mt-3.5 flex min-h-14 w-full items-center justify-center gap-2 rounded-bubble-xl px-4 font-display text-base font-black",
                bank.canAffordUpgrade
                  ? "bg-accent text-accent-foreground shadow-[0_5px_0_0_hsl(var(--accent-deep))] active:shadow-[0_2px_0_0_hsl(var(--accent-deep))]"
                  : "cursor-not-allowed border-2 border-white/15 bg-white/10 text-white/55",
              ].join(" ")}
            >
              {bank.canAffordUpgrade ? (
                <>
                  <span>{t("club.biz.bankActivateShort")}</span>
                  <span
                    dir="ltr"
                    className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-sm"
                  >
                    💎 {toLocaleDigits(bank.upgradeCost, locale)}
                  </span>
                </>
              ) : (
                t("club.biz.needFunds", {
                  n: toLocaleDigits(bank.upgradeCost, locale),
                  have: toLocaleDigits(bank.balance, locale),
                })
              )}
            </motion.button>
          </div>
        </motion.div>
      )}

      {bank.sponsoredActive && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void deactivate()}
          className="mt-4 w-full py-2 text-center font-display text-xs font-bold text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
        >
          {t("club.biz.bankDeactivateCta")}
        </button>
      )}

      {!bank.sponsoredAvailable && (
        <p className="mt-4 text-center font-display text-xs font-bold text-white/45">
          {t("club.biz.bankSponsorOffline")}
        </p>
      )}
    </BottomSheet>
  );
}

function PerkChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white/10 px-2.5 py-1 font-display text-[11px] font-bold text-white/85 ring-1 ring-white/15">
      {children}
    </span>
  );
}
